import { db, logAuditEvent } from './db';
import crypto from 'node:crypto';

export interface GradingScale {
  grade: string;
  min_score: number;
  max_score: number;
  remark: string;
}

export interface AssessmentWeight {
  code: string;
  name: string;
  max_score: number;
}

// Default Nigerian / West African standard grading scale
export const DEFAULT_GRADING_SCALES: GradingScale[] = [
  { grade: 'A', min_score: 75, max_score: 100, remark: 'Excellent' },
  { grade: 'B', min_score: 65, max_score: 74.99, remark: 'Very Good' },
  { grade: 'C', min_score: 50, max_score: 64.99, remark: 'Good' },
  { grade: 'D', min_score: 45, max_score: 49.99, remark: 'Fair Pass' },
  { grade: 'E', min_score: 40, max_score: 44.99, remark: 'Weak Pass' },
  { grade: 'F', min_score: 0, max_score: 39.99, remark: 'Fail' }
];

export const DEFAULT_ASSESSMENT_WEIGHTS: AssessmentWeight[] = [
  { code: 'ca1', name: '1st Continuous Assessment', max_score: 10 },
  { code: 'ca2', name: '2nd Continuous Assessment', max_score: 10 },
  { code: 'ca3', name: 'Assignment / Project', max_score: 10 },
  { code: 'exam', name: 'Terminal Examination', max_score: 70 }
];

/**
 * Fetch grading configuration for a school or fallback to defaults
 */
export function getSchoolGradingConfig(schoolId: string): { scales: GradingScale[]; weights: AssessmentWeight[] } {
  const row = db.prepare('SELECT scales_json, assessment_weights_json FROM grading_systems WHERE school_id = ? AND is_active = 1').get(schoolId) as any;
  if (!row) {
    return { scales: DEFAULT_GRADING_SCALES, weights: DEFAULT_ASSESSMENT_WEIGHTS };
  }

  try {
    const scales = JSON.parse(row.scales_json);
    const weights = JSON.parse(row.assessment_weights_json);
    return { scales, weights };
  } catch {
    return { scales: DEFAULT_GRADING_SCALES, weights: DEFAULT_ASSESSMENT_WEIGHTS };
  }
}

/**
 * Validate and compute a single subject score
 */
export function calculateSubjectScore(
  ca1: number,
  ca2: number,
  ca3: number,
  exam: number,
  weights: AssessmentWeight[] = DEFAULT_ASSESSMENT_WEIGHTS,
  scales: GradingScale[] = DEFAULT_GRADING_SCALES
): { total: number; grade: string; remark: string; errors?: string[] } {
  const errors: string[] = [];

  const wCa1 = weights.find(w => w.code === 'ca1')?.max_score ?? 10;
  const wCa2 = weights.find(w => w.code === 'ca2')?.max_score ?? 10;
  const wCa3 = weights.find(w => w.code === 'ca3')?.max_score ?? 10;
  const wExam = weights.find(w => w.code === 'exam')?.max_score ?? 70;

  const safeCa1 = Math.max(0, Math.min(Number(ca1) || 0, wCa1));
  const safeCa2 = Math.max(0, Math.min(Number(ca2) || 0, wCa2));
  const safeCa3 = Math.max(0, Math.min(Number(ca3) || 0, wCa3));
  const safeExam = Math.max(0, Math.min(Number(exam) || 0, wExam));

  const rawTotal = safeCa1 + safeCa2 + safeCa3 + safeExam;
  const total = Math.round(rawTotal * 100) / 100;

  let grade = 'F';
  let remark = 'Fail';

  for (const s of scales) {
    if (total >= s.min_score && total <= s.max_score) {
      grade = s.grade;
      remark = s.remark;
      break;
    }
  }

  return { total, grade, remark };
}

/**
 * Calculate class positions with standard dense tie handling
 * Example: 92 => 1st, 88 => 2nd, 88 => 2nd, 81 => 4th (standard competition ranking)
 */
export function computeClassPositions(studentsData: { student_id: string; average_score: number; total_score: number }[]): Map<string, number> {
  const sorted = [...studentsData].sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return b.average_score - a.average_score;
  });

  const positionMap = new Map<string, number>();
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].total_score === sorted[i - 1].total_score) {
      positionMap.set(sorted[i].student_id, positionMap.get(sorted[i - 1].student_id)!);
    } else {
      currentRank = i + 1;
      positionMap.set(sorted[i].student_id, currentRank);
    }
  }

  return positionMap;
}

/**
 * Server-side Compile and Freeze Class Results for a Term
 */
export function compileAndPublishClassResults(
  schoolId: string,
  classId: string,
  armId: string | null,
  termId: string,
  sessionId: string,
  approvedByUserId: string
) {
  const { scales, weights } = getSchoolGradingConfig(schoolId);

  // Fetch all students enrolled in this class
  let studentsQuery = "SELECT id, admission_number, full_name, arm_id FROM students WHERE school_id = ? AND class_id = ? AND enrollment_status = 'active'";
  const queryParams: any[] = [schoolId, classId];
  if (armId) {
    studentsQuery += ' AND arm_id = ?';
    queryParams.push(armId);
  }
  const students = db.prepare(studentsQuery).all(...queryParams) as any[];

  if (students.length === 0) {
    throw new Error('No active students found in this class');
  }

  // Fetch all approved scores for these students in this term & session
  const scoresQuery = `
    SELECT sc.*, sub.name as subject_name, sub.code as subject_code
    FROM student_scores sc
    JOIN subjects sub ON sc.subject_id = sub.id
    WHERE sc.school_id = ? AND sc.class_id = ? AND sc.term_id = ? AND sc.session_id = ?
  `;
  const allScores = db.prepare(scoresQuery).all(schoolId, classId, termId, sessionId) as any[];

  // Group scores by student
  const studentScoresMap = new Map<string, any[]>();
  for (const score of allScores) {
    if (!studentScoresMap.has(score.student_id)) {
      studentScoresMap.set(score.student_id, []);
    }
    studentScoresMap.get(score.student_id)!.push(score);
  }

  // Compute student totals and averages
  const computedList: { student_id: string; total_score: number; average_score: number; subjects_count: number }[] = [];

  for (const student of students) {
    const scores = studentScoresMap.get(student.id) || [];
    const total = scores.reduce((sum, s) => sum + s.total, 0);
    const count = scores.length;
    const avg = count > 0 ? Math.round((total / count) * 100) / 100 : 0;

    computedList.push({
      student_id: student.id,
      total_score: total,
      average_score: avg,
      subjects_count: count
    });
  }

  // Compute positions
  const positionMap = computeClassPositions(computedList);
  const classSize = students.length;

  // Insert or update term_results in a transaction
  db.exec('BEGIN TRANSACTION');
  try {
    for (const comp of computedList) {
      const student = students.find(s => s.id === comp.student_id)!;
      const scores = studentScoresMap.get(comp.student_id) || [];
      const position = positionMap.get(comp.student_id) || 1;

      // Frozen snapshot data
      const snapshot = {
        student: { id: student.id, admission_number: student.admission_number, full_name: student.full_name },
        term_id: termId,
        session_id: sessionId,
        total_score: comp.total_score,
        average_score: comp.average_score,
        position,
        class_size: classSize,
        subjects_count: comp.subjects_count,
        grading_scale_used: scales,
        scores: scores.map(s => ({
          subject_id: s.subject_id,
          subject_name: s.subject_name,
          subject_code: s.subject_code,
          ca1: s.ca1,
          ca2: s.ca2,
          ca3: s.ca3,
          exam: s.exam,
          total: s.total,
          grade: s.grade,
          remark: s.remark
        })),
        published_at: new Date().toISOString()
      };

      const existing = db.prepare('SELECT id FROM term_results WHERE school_id = ? AND student_id = ? AND term_id = ? AND session_id = ?').get(schoolId, comp.student_id, termId, sessionId) as any;

      if (existing) {
        db.prepare(`
          UPDATE term_results
          SET total_score = ?, average_score = ?, position = ?, class_size = ?, status = 'published',
              approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP, published_at = CURRENT_TIMESTAMP,
              snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(comp.total_score, comp.average_score, position, classSize, approvedByUserId, JSON.stringify(snapshot), existing.id);
      } else {
        const resultId = 'tr_' + crypto.randomUUID().slice(0, 12);
        db.prepare(`
          INSERT INTO term_results (id, school_id, student_id, class_id, arm_id, term_id, session_id, total_score, average_score, position, class_size, status, approved_by_user_id, approved_at, published_at, snapshot_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        `).run(resultId, schoolId, comp.student_id, classId, student.arm_id || null, termId, sessionId, comp.total_score, comp.average_score, position, classSize, approvedByUserId, JSON.stringify(snapshot));
      }

      // Mark all subject scores as locked so teachers cannot alter approved results
      db.prepare(`
        UPDATE student_scores
        SET status = 'locked', updated_at = CURRENT_TIMESTAMP
        WHERE school_id = ? AND student_id = ? AND term_id = ? AND session_id = ?
      `).run(schoolId, comp.student_id, termId, sessionId);

      // Check if Result Verification Code exists; if not generate one
      const existingPin = db.prepare('SELECT id FROM result_verification_codes WHERE school_id = ? AND student_id = ? AND term_id = ? AND session_id = ?').get(schoolId, comp.student_id, termId, sessionId);
      if (!existingPin) {
        const pinId = 'pin_' + crypto.randomUUID().slice(0, 12);
        const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
        const plainCode = `PIN-${randomChars.slice(0, 3)}-${randomChars.slice(3, 6)}`;
        const codeHash = crypto.createHash('sha256').update(plainCode.trim().toUpperCase()).digest('hex');

        db.prepare(`
          INSERT INTO result_verification_codes (id, school_id, student_id, term_id, session_id, code_hash, code_display, max_usage)
          VALUES (?, ?, ?, ?, ?, ?, ?, 15)
        `).run(pinId, schoolId, comp.student_id, termId, sessionId, codeHash, plainCode);
      }
    }

    db.exec('COMMIT');
    logAuditEvent('results_compiled_and_published', `class_${classId}`, { class_id: classId, term_id: termId, students_count: classSize }, schoolId, approvedByUserId);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
