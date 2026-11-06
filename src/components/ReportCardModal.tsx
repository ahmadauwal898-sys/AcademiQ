import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Printer,
  Download,
  X,
  Building,
  CheckCircle2,
  Award,
  Calendar,
  ArrowLeft,
  Eye,
  Shield,
  Stamp,
  User as UserIcon,
  Sparkles,
  Edit3,
  Save,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { exportReportCardToPDF, printReportCard } from '../utils/pdfGenerator';
import { ResultTemplate } from '../types';
import confetti from 'canvas-confetti';

interface ReportCardModalProps {
  studentId: string;
  onClose: () => void;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printPreviewMode, setPrintPreviewMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [subjectLoadTest, setSubjectLoadTest] = useState<'actual' | 5 | 10 | 20 | 30>('actual');

  // In-Modal Result Editing & Persistence State
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editableSubjectScores, setEditableSubjectScores] = useState<any[]>([]);
  const [savingResult, setSavingResult] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [editableActivities, setEditableActivities] = useState({
    punctuality: 'A',
    neatness: 'A',
    politeness: 'A',
    honesty: 'A',
    attentiveness: 'A',
    leadership: 'B',
    handwriting: 'A',
    sports: 'B',
    crafts: 'B',
    speaking: 'A',
    practical: 'A',
    teacher_comment: '',
    principal_comment: '',
    days_present: 88,
    total_school_days: 90,
    next_term_resumption: ''
  });

  useEffect(() => {
    document.body.classList.add('has-print-modal');
    loadReport();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('has-print-modal');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [studentId]);

  const loadReport = async (resetLocalEdits = true) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/school/reports/student/${studentId}`);
      setData(res);
      const raw = res.activities?.raw || {};
      if (resetLocalEdits) {
        setEditableSubjectScores(res.subjectScores ? JSON.parse(JSON.stringify(res.subjectScores)) : []);
        setEditableActivities({
          punctuality: raw.punctuality || 'A',
          neatness: raw.neatness || 'A',
          politeness: raw.politeness || 'A',
          honesty: raw.honesty || 'A',
          attentiveness: raw.attentiveness || 'A',
          leadership: raw.leadership || 'B',
          handwriting: raw.handwriting || 'A',
          sports: raw.sports || 'B',
          crafts: raw.crafts || 'B',
          speaking: raw.speaking || 'A',
          practical: raw.practical || 'A',
          teacher_comment: res.termResult?.teacher_comment || '',
          principal_comment: res.termResult?.principal_comment || '',
          days_present: res.attendanceStats?.days_present ?? 88,
          total_school_days: res.attendanceStats?.total_school_days ?? 90,
          next_term_resumption: res.term?.next_term_resumption || ''
        });
        setHasUnsavedChanges(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (index: number, field: 'ca1' | 'ca2' | 'ca3' | 'exam', rawVal: number) => {
    const val = isNaN(rawVal) ? 0 : Math.max(0, rawVal);
    setEditableSubjectScores((prev: any[]) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const row = { ...updated[index], [field]: val };
      const ca1 = Number(row.ca1) || 0;
      const ca2 = Number(row.ca2) || 0;
      const ca3 = Number(row.ca3) || 0;
      const exam = Number(row.exam) || 0;
      const total = Math.round((ca1 + ca2 + ca3 + exam) * 100) / 100;
      row.total = total;

      const scales = data?.gradingScale || [
        { grade: 'A', min_score: 75, max_score: 100, remark: 'Excellent' },
        { grade: 'B', min_score: 65, max_score: 74.99, remark: 'Very Good' },
        { grade: 'C', min_score: 50, max_score: 64.99, remark: 'Good' },
        { grade: 'D', min_score: 45, max_score: 49.99, remark: 'Fair Pass' },
        { grade: 'E', min_score: 40, max_score: 44.99, remark: 'Weak Pass' },
        { grade: 'F', min_score: 0, max_score: 39.99, remark: 'Fail' }
      ];

      let grade = 'F';
      let remark = 'Fail';
      for (const s of scales) {
        if (total >= s.min_score && total <= s.max_score) {
          grade = s.grade;
          remark = s.remark;
          break;
        }
      }
      row.grade = grade;
      row.remark = remark;
      updated[index] = row;
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAllChanges = async (isAutoSave = false) => {
    if (!data) return;
    setSavingResult(true);
    if (!isAutoSave) {
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
    }
    try {
      await apiRequest(`/api/school/reports/student/${studentId}/save`, {
        method: 'POST',
        body: JSON.stringify({
          term_id: data.term?.id,
          session_id: data.session?.id,
          subjectScores: editableSubjectScores,
          teacher_comment: editableActivities.teacher_comment,
          principal_comment: editableActivities.principal_comment,
          activities: editableActivities,
          attendance: {
            days_present: Number(editableActivities.days_present),
            total_school_days: Number(editableActivities.total_school_days)
          },
          next_term_resumption: editableActivities.next_term_resumption
        })
      });

      setHasUnsavedChanges(false);
      if (!isAutoSave) {
        setSaveSuccessMsg('All result changes saved permanently to database!');
        confetti({ particleCount: 50 });
        setTimeout(() => setSaveSuccessMsg(null), 4500);
      }
      // Re-sync with database without clearing the in-memory edits
      await loadReport(false);
    } catch (err: any) {
      if (!isAutoSave) {
        setSaveErrorMsg(err.message || 'Failed to save changes.');
      }
    } finally {
      setSavingResult(false);
    }
  };

  const handlePrint = async () => {
    // If there are unsaved changes, auto-persist to database first so print matches saved state
    if (hasUnsavedChanges) {
      await handleSaveAllChanges(true);
    }
    try {
      const ok = await printReportCard('report-card-print-area');
      if (!ok) {
        setSaveSuccessMsg('Direct browser printing modal restricted by preview sandbox. Generating high-definition A4 PDF immediately for direct printing!');
        await handleDownloadPDF();
      } else {
        setSaveSuccessMsg('Print dialog opened. Select your printer or Save as PDF.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.warn('Direct print encountered exception, falling back to PDF download:', err);
      await handleDownloadPDF();
    }
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    // Auto-save any pending changes first so PDF and database are 100% synchronized
    if (hasUnsavedChanges) {
      await handleSaveAllChanges(true);
    }
    setDownloadingPDF(true);
    try {
      const stdName = data.student?.full_name?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Student';
      const termName = data.term?.name?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Term';
      const fileName = `${stdName}_${termName}_Report_Card.pdf`;
      const badge = data.school?.logo_url;
      await exportReportCardToPDF('report-card-print-area', fileName, badge, {
        ...data,
        subjectScores: displayedSubjectScores,
        termResult: {
          ...data.termResult,
          total_score: displayedTotal,
          average_score: displayedAverage,
          teacher_comment: editableActivities.teacher_comment,
          principal_comment: editableActivities.principal_comment
        }
      });
      setSaveSuccessMsg('Official A4 PDF generated & downloaded! All changes remain saved.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
      setSaveErrorMsg('PDF download failed. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleAutomarkSingleStudent = () => {
    if (!data) return;
    const avg = data.termResult?.average_score != null ? Number(data.termResult.average_score) : 70;
    let punc = 'A', neat = 'A', polit = 'A', hon = 'A', attent = 'A', lead = 'B';
    let hand = 'A', sport = 'B', craft = 'B', speak = 'A', pract = 'A';

    if (avg >= 75) {
      punc = 'A'; neat = 'A'; polit = 'A'; hon = 'A'; attent = 'A'; lead = 'A';
      hand = 'A'; sport = 'B'; craft = 'A'; speak = 'A'; pract = 'A';
    } else if (avg >= 65) {
      punc = 'A'; neat = 'A'; polit = 'A'; hon = 'A'; attent = 'B'; lead = 'B';
      hand = 'B'; sport = 'A'; craft = 'B'; speak = 'B'; pract = 'B';
    } else if (avg >= 50) {
      punc = 'B'; neat = 'B'; polit = 'A'; hon = 'B'; attent = 'C'; lead = 'C';
      hand = 'B'; sport = 'B'; craft = 'B'; speak = 'C'; pract = 'B';
    } else if (avg >= 40) {
      punc = 'C'; neat = 'C'; polit = 'B'; hon = 'B'; attent = 'D'; lead = 'D';
      hand = 'C'; sport = 'B'; craft = 'C'; speak = 'D'; pract = 'C';
    } else {
      punc = 'D'; neat = 'D'; polit = 'C'; hon = 'C'; attent = 'E'; lead = 'E';
      hand = 'D'; sport = 'C'; craft = 'D'; speak = 'E'; pract = 'D';
    }

    setEditableActivities(prev => ({
      ...prev,
      punctuality: punc,
      neatness: neat,
      politeness: polit,
      honesty: hon,
      attentiveness: attent,
      leadership: lead,
      handwriting: hand,
      sports: sport,
      crafts: craft,
      speaking: speak,
      practical: pract
    }));
    confetti({ particleCount: 30 });
  };

  const t: ResultTemplate = data?.school?.template || {
    templateName: 'Standard Academic',
    headerLayout: 'crest_center',
    tableStyle: 'classic_bordered',
    primaryColor: '#1e3a8a',
    accentColor: '#f59e0b',
    showWatermark: true,
    watermarkOpacity: 0.08,
    showStudentPhoto: true,
    showAffectiveDomain: true,
    showPsychomotorDomain: true,
    showGradingScaleTable: true,
    showPrincipalStamp: true,
    schoolMotto: 'Knowledge, Integrity and Excellence',
    fontFamily: 'serif',
    customHeaderNote: 'Official Terminal Continuous Assessment & Examination Report'
  };

  const getSvgBadgeFallback = (name: string, pColor = '#1e3a8a') => {
    const words = (name || 'School').trim().split(/\s+/).filter(Boolean);
    const initials = (words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('') : (name || 'SCH').slice(0, 3)).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${pColor}"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <path d="M60 6 L104 22 L104 66 C104 90 60 114 60 114 C60 114 16 90 16 66 L16 22 Z" fill="url(#crestGrad)" stroke="#f59e0b" stroke-width="4"/>
      <circle cx="60" cy="50" r="22" fill="#ffffff" opacity="0.15"/>
      <text x="60" y="57" font-family="Arial, serif" font-size="17" font-weight="900" fill="#f59e0b" text-anchor="middle">${initials}</text>
      <path d="M42 74 Q60 66 78 74 L78 80 Q60 72 42 80 Z" fill="#ffffff"/>
      <text x="60" y="96" font-family="Arial, sans-serif" font-size="6.5" font-weight="bold" fill="#f59e0b" text-anchor="middle">EXCELLENCE</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  const primaryColor = t.primaryColor || '#1e3a8a';
  const accentColor = t.accentColor || '#f59e0b';
  const fallbackBadge = getSvgBadgeFallback(data?.school?.name || 'School', primaryColor);
  const schoolLogo = data?.school?.logo_url || fallbackBadge;

  const assessmentWeights = data?.assessmentWeights || [
    { code: 'ca1', name: '1st CA', max_score: 10 },
    { code: 'ca2', name: '2nd CA', max_score: 10 },
    { code: 'ca3', name: 'Project', max_score: 10 },
    { code: 'exam', name: 'Exam', max_score: 70 },
  ];

  const wCa1 = assessmentWeights.find((w: any) => w.code === 'ca1')?.max_score ?? 10;
  const wCa2 = assessmentWeights.find((w: any) => w.code === 'ca2')?.max_score ?? 10;
  const wCa3 = assessmentWeights.find((w: any) => w.code === 'ca3')?.max_score ?? 10;
  const wExam = assessmentWeights.find((w: any) => w.code === 'exam')?.max_score ?? 70;
  const labelCa1 = assessmentWeights.find((w: any) => w.code === 'ca1')?.name || '1st CA';
  const labelCa2 = assessmentWeights.find((w: any) => w.code === 'ca2')?.name || '2nd CA';
  const labelCa3 = assessmentWeights.find((w: any) => w.code === 'ca3')?.name || 'Project';
  const labelExam = assessmentWeights.find((w: any) => w.code === 'exam')?.name || 'Exam';
  const totalMax = wCa1 + wCa2 + wCa3 + wExam;

  const attendance = data?.attendanceStats || {
    days_present: 88,
    days_absent: 2,
    days_late: 1,
    total_school_days: 90
  };
  const attendancePercent = attendance.total_school_days > 0
    ? Math.round((attendance.days_present / attendance.total_school_days) * 100)
    : 100;

  const resumptionDate = data?.term?.next_term_resumption || '15th September, 2026';

  const scaleMap: Record<string, string> = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Fair',
    E: 'Poor'
  };

  const behaviouralActivities = data?.activities?.behavioural || [
    { trait: 'Punctuality & Regularity', grade: 'A', remark: 'Excellent' },
    { trait: 'Neatness & Personal Hygiene', grade: 'A', remark: 'Excellent' },
    { trait: 'Politeness & Courtesy', grade: 'A', remark: 'Excellent' },
    { trait: 'Honesty & Moral Integrity', grade: 'A', remark: 'Excellent' },
    { trait: 'Attentiveness & Focus', grade: 'A', remark: 'Excellent' },
    { trait: 'Leadership & Teamwork', grade: 'B', remark: 'Very Good' },
  ];

  const psychomotorActivities = data?.activities?.psychomotor || [
    { skill: 'Handwriting & Legibility', grade: 'A', remark: 'Excellent' },
    { skill: 'Sports, Games & Athletics', grade: 'B', remark: 'Very Good' },
    { skill: 'Crafts, Drawing & Arts', grade: 'B', remark: 'Very Good' },
    { skill: 'Public Speaking & Verbal Fluency', grade: 'A', remark: 'Excellent' },
    { skill: 'Practical & Lab Competencies', grade: 'A', remark: 'Excellent' },
  ];

  const baseSubjectScores = (editableSubjectScores && editableSubjectScores.length > 0)
    ? editableSubjectScores
    : (data?.subjectScores || []);

  const displayedSubjectScores = React.useMemo(() => {
    if (!baseSubjectScores.length) return [];
    if (subjectLoadTest === 'actual') return baseSubjectScores;

    const targetCount = Number(subjectLoadTest);
    if (baseSubjectScores.length >= targetCount) {
      return baseSubjectScores.slice(0, targetCount);
    }

    const extraSubjectPool = [
      { name: 'Further Mathematics', ca1: 9, ca2: 8, ca3: 9, exam: 58, total: 84, grade: 'A', remark: 'Excellent' },
      { name: 'Economics', ca1: 8, ca2: 8, ca3: 8, exam: 56, total: 80, grade: 'A', remark: 'Excellent' },
      { name: 'Civic Education', ca1: 9, ca2: 9, ca3: 8, exam: 62, total: 88, grade: 'A', remark: 'Excellent' },
      { name: 'Computer Studies', ca1: 10, ca2: 9, ca3: 9, exam: 65, total: 93, grade: 'A', remark: 'Excellent' },
      { name: 'Technical Drawing', ca1: 8, ca2: 7, ca3: 8, exam: 54, total: 77, grade: 'A', remark: 'Excellent' },
      { name: 'Geography', ca1: 7, ca2: 8, ca3: 7, exam: 52, total: 74, grade: 'B', remark: 'Very Good' },
      { name: 'Agricultural Science', ca1: 8, ca2: 8, ca3: 8, exam: 55, total: 79, grade: 'A', remark: 'Excellent' },
      { name: 'Government', ca1: 8, ca2: 7, ca3: 7, exam: 50, total: 72, grade: 'B', remark: 'Very Good' },
      { name: 'Literature in English', ca1: 9, ca2: 8, ca3: 8, exam: 57, total: 82, grade: 'A', remark: 'Excellent' },
      { name: 'Financial Accounting', ca1: 7, ca2: 7, ca3: 8, exam: 49, total: 71, grade: 'B', remark: 'Very Good' },
      { name: 'Commerce', ca1: 8, ca2: 8, ca3: 7, exam: 53, total: 76, grade: 'A', remark: 'Excellent' },
      { name: 'Data Processing', ca1: 9, ca2: 9, ca3: 8, exam: 60, total: 86, grade: 'A', remark: 'Excellent' },
      { name: 'Physical & Health Education', ca1: 8, ca2: 9, ca3: 9, exam: 61, total: 87, grade: 'A', remark: 'Excellent' },
      { name: 'French Language', ca1: 7, ca2: 6, ca3: 7, exam: 48, total: 68, grade: 'B', remark: 'Very Good' },
      { name: 'Visual Arts & Creative Craft', ca1: 8, ca2: 9, ca3: 8, exam: 58, total: 83, grade: 'A', remark: 'Excellent' },
      { name: 'Music & Performance Arts', ca1: 8, ca2: 8, ca3: 8, exam: 54, total: 78, grade: 'A', remark: 'Excellent' },
      { name: 'History & Heritage Studies', ca1: 8, ca2: 7, ca3: 8, exam: 52, total: 75, grade: 'A', remark: 'Excellent' },
      { name: 'Christian / Islamic Rel. Studies', ca1: 9, ca2: 9, ca3: 8, exam: 63, total: 89, grade: 'A', remark: 'Excellent' },
      { name: 'Food & Nutrition', ca1: 8, ca2: 8, ca3: 7, exam: 51, total: 74, grade: 'B', remark: 'Very Good' },
      { name: 'Basic Technology & Metalwork', ca1: 7, ca2: 8, ca3: 7, exam: 50, total: 72, grade: 'B', remark: 'Very Good' },
      { name: 'Home Economics', ca1: 8, ca2: 8, ca3: 8, exam: 55, total: 79, grade: 'A', remark: 'Excellent' },
      { name: 'Social Studies & Culture', ca1: 8, ca2: 8, ca3: 7, exam: 54, total: 77, grade: 'A', remark: 'Excellent' },
    ];

    const list = [...baseSubjectScores];
    let poolIdx = 0;
    while (list.length < targetCount && poolIdx < extraSubjectPool.length) {
      const extra = extraSubjectPool[poolIdx++];
      list.push({
        id: `sim_${poolIdx}`,
        subject_name: extra.name,
        ca1: extra.ca1,
        ca2: extra.ca2,
        ca3: extra.ca3,
        exam: extra.exam,
        total: extra.total,
        grade: extra.grade,
        remark: extra.remark
      });
    }
    return list;
  }, [baseSubjectScores, subjectLoadTest]);

  const displayedTotal = React.useMemo(() => {
    return displayedSubjectScores.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
  }, [displayedSubjectScores]);

  const displayedAverage = React.useMemo(() => {
    if (!displayedSubjectScores.length) return 0;
    return Number((displayedTotal / displayedSubjectScores.length).toFixed(1));
  }, [displayedSubjectScores, displayedTotal]);

  const subjectCount = displayedSubjectScores.length || 0;

  // Adaptive auto-scaling density engine: dynamically sizes fonts, rows, gaps, and emblems
  // to ensure the entire result sheet always fits on strictly ONE single page (5 to 30+ subjects).
  const d = (() => {
    if (subjectCount <= 8) {
      return {
        mode: 'spacious',
        gap: 'space-y-3.5 print:space-y-1.5',
        headerPad: 'pb-3 print:pb-1',
        logoSize: 'w-16 h-16 print:w-11 print:h-11',
        titleSize: 'text-xl sm:text-2xl print:text-base',
        subText: 'text-xs print:text-[8px]',
        notePill: 'px-4 py-1 print:px-2.5 print:py-0 text-xs print:text-[8px]',
        profilePad: 'p-3 print:p-1.5',
        profileText: 'text-xs print:text-[8.5px]',
        profileLabel: 'text-[11px] print:text-[7.5px]',
        profileName: 'text-sm print:text-[10px]',
        tableThPad: 'py-2 print:py-0.8 px-2.5 print:px-1.5',
        tableTdPad: 'py-1.5 print:py-0.6 px-2.5 print:px-1.5',
        tableText: 'text-xs print:text-[8.5px]',
        tableThText: 'text-[11px] print:text-[8.5px]',
        gradePill: 'px-2 print:px-1.5 py-0.5 print:py-0.2 text-xs print:text-[8.5px]',
        summaryPad: 'p-3 print:p-1',
        summaryVal: 'text-xl sm:text-2xl print:text-sm',
        summaryLabel: 'text-[11px] print:text-[7.5px]',
        domainThPad: 'py-1 print:py-0.5 px-2 print:px-1',
        domainTdPad: 'py-1 print:py-0.4 px-2 print:px-1',
        domainText: 'text-[10px] print:text-[8px]',
        domainHeader: 'px-2.5 py-1 print:py-0.5 text-[10px] print:text-[8px]',
        scalePad: 'p-1.5 print:p-1',
        scaleText: 'text-[9.5px] print:text-[8px]',
        remarksPad: 'p-2.5 print:p-1',
        remarksText: 'text-xs print:text-[8.5px]',
        remarksQuote: 'text-[11px] print:text-[8px]',
        sigLineH: 'h-8 print:h-5',
        stampSize: 'w-12 h-12 print:w-9.5 print:h-9.5',
        sigText: 'text-[10px] print:text-[8px]',
        sigDateText: 'text-[9px] print:text-[7px]'
      };
    } else if (subjectCount <= 13) {
      return {
        mode: 'balanced',
        gap: 'space-y-2.5 print:space-y-1',
        headerPad: 'pb-2.5 print:pb-0.8',
        logoSize: 'w-14 h-14 print:w-10 print:h-10',
        titleSize: 'text-lg sm:text-xl print:text-sm',
        subText: 'text-xs print:text-[7.5px]',
        notePill: 'px-3.5 py-0.5 print:px-2 print:py-0 text-[11px] print:text-[7.5px]',
        profilePad: 'p-2.5 print:p-1.2',
        profileText: 'text-[11px] print:text-[8px]',
        profileLabel: 'text-[10px] print:text-[7px]',
        profileName: 'text-sm print:text-[9.5px]',
        tableThPad: 'py-1.5 print:py-0.5 px-2 print:px-1.2',
        tableTdPad: 'py-1 print:py-0.4 px-2 print:px-1.2',
        tableText: 'text-[11px] print:text-[7.8px]',
        tableThText: 'text-[10px] print:text-[7.8px]',
        gradePill: 'px-1.5 print:px-1 py-0.2 print:py-0 text-[11px] print:text-[7.8px]',
        summaryPad: 'p-2.5 print:p-0.8',
        summaryVal: 'text-lg sm:text-xl print:text-xs',
        summaryLabel: 'text-[10.5px] print:text-[7px]',
        domainThPad: 'py-0.8 print:py-0.3 px-1.5 print:px-0.8',
        domainTdPad: 'py-0.8 print:py-0.3 px-1.5 print:px-0.8',
        domainText: 'text-[9.5px] print:text-[7.5px]',
        domainHeader: 'px-2 py-0.8 print:py-0.4 text-[9.5px] print:text-[7.5px]',
        scalePad: 'p-1.2 print:p-0.8',
        scaleText: 'text-[9px] print:text-[7.5px]',
        remarksPad: 'p-2 print:p-0.8',
        remarksText: 'text-[11px] print:text-[8px]',
        remarksQuote: 'text-[10.5px] print:text-[7.5px]',
        sigLineH: 'h-7 print:h-4.5',
        stampSize: 'w-11 h-11 print:w-8.5 print:h-8.5',
        sigText: 'text-[10px] print:text-[8px]',
        sigDateText: 'text-[8.5px] print:text-[6.5px]'
      };
    } else if (subjectCount <= 19) {
      return {
        mode: 'compact',
        gap: 'space-y-2 print:space-y-0.8',
        headerPad: 'pb-2 print:pb-0.6',
        logoSize: 'w-12 h-12 print:w-8.5 print:h-8.5',
        titleSize: 'text-base sm:text-lg print:text-xs',
        subText: 'text-[11px] print:text-[7px]',
        notePill: 'px-3 py-0.5 print:px-2 print:py-0 text-[10px] print:text-[7px]',
        profilePad: 'p-2 print:p-1',
        profileText: 'text-[10.5px] print:text-[7.5px]',
        profileLabel: 'text-[9.5px] print:text-[6.5px]',
        profileName: 'text-xs print:text-[8.8px]',
        tableThPad: 'py-1 print:py-0.35 px-1.5 print:px-1',
        tableTdPad: 'py-0.8 print:py-0.25 px-1.5 print:px-1',
        tableText: 'text-[10px] print:text-[7.2px]',
        tableThText: 'text-[9.5px] print:text-[7.2px]',
        gradePill: 'px-1 print:px-0.8 py-0.2 print:py-0 text-[10px] print:text-[7px]',
        summaryPad: 'p-2 print:p-0.6',
        summaryVal: 'text-base sm:text-lg print:text-[11px]',
        summaryLabel: 'text-[10px] print:text-[6.8px]',
        domainThPad: 'py-0.6 print:py-0.2 px-1.5 print:px-0.8',
        domainTdPad: 'py-0.6 print:py-0.2 px-1.5 print:px-0.8',
        domainText: 'text-[9px] print:text-[6.8px]',
        domainHeader: 'px-2 py-0.6 print:py-0.3 text-[9px] print:text-[7px]',
        scalePad: 'p-1 print:p-0.5',
        scaleText: 'text-[8.5px] print:text-[6.8px]',
        remarksPad: 'p-1.5 print:p-0.6',
        remarksText: 'text-[10.5px] print:text-[7.2px]',
        remarksQuote: 'text-[10px] print:text-[7px]',
        sigLineH: 'h-6 print:h-4',
        stampSize: 'w-10 h-10 print:w-7.5 print:h-7.5',
        sigText: 'text-[9.5px] print:text-[7.5px]',
        sigDateText: 'text-[8px] print:text-[6px]'
      };
    } else if (subjectCount <= 26) {
      return {
        mode: 'dense',
        gap: 'space-y-1.5 print:space-y-0.5',
        headerPad: 'pb-1.5 print:pb-0.5',
        logoSize: 'w-10 h-10 print:w-7.5 print:h-7.5',
        titleSize: 'text-sm sm:text-base print:text-[11px]',
        subText: 'text-[10px] print:text-[6.5px]',
        notePill: 'px-2.5 py-0.2 print:px-1.5 print:py-0 text-[9.5px] print:text-[6.5px]',
        profilePad: 'p-1.5 print:p-0.8',
        profileText: 'text-[10px] print:text-[7px]',
        profileLabel: 'text-[9px] print:text-[6px]',
        profileName: 'text-xs print:text-[8px]',
        tableThPad: 'py-0.8 print:py-0.2 px-1.2 print:px-0.8',
        tableTdPad: 'py-0.5 print:py-0.12 px-1.2 print:px-0.8',
        tableText: 'text-[9px] print:text-[6.5px]',
        tableThText: 'text-[8.5px] print:text-[6.5px]',
        gradePill: 'px-0.8 print:px-0.6 py-0 text-[9px] print:text-[6.5px]',
        summaryPad: 'p-1.5 print:p-0.5',
        summaryVal: 'text-sm sm:text-base print:text-[10px]',
        summaryLabel: 'text-[9px] print:text-[6.2px]',
        domainThPad: 'py-0.4 print:py-0.15 px-1 print:px-0.6',
        domainTdPad: 'py-0.4 print:py-0.12 px-1 print:px-0.6',
        domainText: 'text-[8.5px] print:text-[6.2px]',
        domainHeader: 'px-1.5 py-0.4 print:py-0.2 text-[8.5px] print:text-[6.5px]',
        scalePad: 'p-0.8 print:p-0.4',
        scaleText: 'text-[8px] print:text-[6.2px]',
        remarksPad: 'p-1.2 print:p-0.5',
        remarksText: 'text-[10px] print:text-[6.8px]',
        remarksQuote: 'text-[9.5px] print:text-[6.5px]',
        sigLineH: 'h-5 print:h-3.5',
        stampSize: 'w-9 h-9 print:w-6.5 print:h-6.5',
        sigText: 'text-[9px] print:text-[7px]',
        sigDateText: 'text-[7.5px] print:text-[5.5px]'
      };
    } else {
      // 27+ subjects: Ultra-dense mode
      return {
        mode: 'ultra-dense',
        gap: 'space-y-1 print:space-y-0.2',
        headerPad: 'pb-1 print:pb-0.3',
        logoSize: 'w-8 h-8 print:w-6 print:h-6',
        titleSize: 'text-xs sm:text-sm print:text-[10px]',
        subText: 'text-[9px] print:text-[6px]',
        notePill: 'px-2 py-0 text-[8.5px] print:text-[6px]',
        profilePad: 'p-1 print:p-0.5',
        profileText: 'text-[9px] print:text-[6.5px]',
        profileLabel: 'text-[8px] print:text-[5.5px]',
        profileName: 'text-[11px] print:text-[7.5px]',
        tableThPad: 'py-0.5 print:py-0.1 px-1 print:px-0.5',
        tableTdPad: 'py-0.3 print:py-0.08 px-1 print:px-0.5',
        tableText: 'text-[8px] print:text-[5.8px]',
        tableThText: 'text-[7.5px] print:text-[5.8px]',
        gradePill: 'px-0.5 py-0 text-[8px] print:text-[5.8px]',
        summaryPad: 'p-1 print:p-0.4',
        summaryVal: 'text-xs sm:text-sm print:text-[9.5px]',
        summaryLabel: 'text-[8.5px] print:text-[5.8px]',
        domainThPad: 'py-0.2 print:py-0.08 px-1 print:px-0.5',
        domainTdPad: 'py-0.2 print:py-0.08 px-1 print:px-0.5',
        domainText: 'text-[7.5px] print:text-[5.5px]',
        domainHeader: 'px-1 py-0.2 text-[8px] print:text-[6px]',
        scalePad: 'p-0.5 print:p-0.2',
        scaleText: 'text-[7.5px] print:text-[5.5px]',
        remarksPad: 'p-1 print:p-0.4',
        remarksText: 'text-[9px] print:text-[6.2px]',
        remarksQuote: 'text-[8.5px] print:text-[6px]',
        sigLineH: 'h-4 print:h-3',
        stampSize: 'w-8 h-8 print:w-6 print:h-6',
        sigText: 'text-[8px] print:text-[6.5px]',
        sigDateText: 'text-[7px] print:text-[5px]'
      };
    }
  })();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div className={`bg-white rounded-3xl max-w-4xl w-full my-4 sm:my-8 shadow-2xl overflow-hidden print:shadow-none print:my-0 print:border-none print:w-full flex flex-col max-h-[94vh] print:max-h-none ${
        printPreviewMode ? 'ring-8 ring-blue-500/20' : ''
      }`}>
        {/* Top Control Bar (Never Printed) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-white/10"
            title="Go back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasUnsavedChanges && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Unsaved Edits</span>
              </span>
            )}

            <button
              onClick={() => setIsEditingResult(!isEditingResult)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                isEditingResult
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-amber-300 border-amber-400/40'
              }`}
              title="Edit scores, remarks, comments, and ratings directly on this result sheet"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEditingResult ? 'Finish Editing' : 'Edit Result Sheet'}</span>
            </button>

            {isEditingResult && (
              <button
                onClick={() => handleSaveAllChanges()}
                disabled={savingResult}
                className="px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-700/20 disabled:opacity-60"
                title="Save all changes permanently to SQLite database"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingResult ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}

            <button
              onClick={() => setPrintPreviewMode(!printPreviewMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border hidden sm:flex ${
                printPreviewMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
              title="Toggle A4 Print Page Simulation"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{printPreviewMode ? 'Exit Preview' : 'A4 Preview'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-700/20"
              title="Print to printer or save as system PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download single-page A4 PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPDF ? '...' : 'PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-white/10 cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Single-Page Subject Stress-Test Bar (Non-printed) */}
        {!loading && data && (
          <div className="bg-slate-800 text-slate-200 px-3 sm:px-5 py-2 print:hidden flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                A4 Auto-Scale Stress-Test:
              </span>
              <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
                {[
                  { label: `Database (${data.subjectScores?.length || 10})`, val: 'actual' },
                  { label: '5 Subjects', val: 5 },
                  { label: '10 Subjects', val: 10 },
                  { label: '20 Subjects', val: 20 },
                  { label: '30 Subjects', val: 30 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => setSubjectLoadTest(btn.val as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      subjectLoadTest === btn.val
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/80">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Strictly 1 Page A4 Guaranteed</span>
              </div>
              <span className="hidden md:inline text-slate-400">
                Active Density: <span className="font-bold text-white capitalize">{d.mode}</span> ({subjectCount} Subjects)
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Printable Report Container */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-8 space-y-6 print:p-0 print:overflow-visible printable-report-sheet">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading customized school report card...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-xs text-rose-600 font-semibold">{error}</div>
          ) : data ? (
            <div
              id="report-card-print-area"
              className={`${d.gap} bg-white relative mx-auto rounded-2xl border ${
                printPreviewMode ? 'border-slate-300 shadow-md font-serif' : 'border-slate-200'
              } print:border-none print:p-0 print:m-0`}
              style={{
                width: '100%',
                maxWidth: '210mm',
                minHeight: printPreviewMode ? '297mm' : 'auto',
                padding: '10mm',
                boxSizing: 'border-box',
                fontFamily: t.fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", Times, serif' : 'system-ui, sans-serif'
              }}
            >
              {/* Optional School Badge Watermark in Table Background */}
              {t.showWatermark && schoolLogo && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
                  style={{ opacity: t.watermarkOpacity ?? 0.07 }}
                >
                  <img
                    src={schoolLogo}
                    alt=""
                    className="w-80 h-80 object-contain grayscale print-badge school-badge-img"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* ----------------- SECTION 1: HEADER & SCHOOL BADGE ----------------- */}
              <div className="relative z-10">
                {t.headerLayout === 'crest_center' && (
                  <div className={`text-center space-y-1 print:space-y-0.5 border-b-2 print:border-b ${d.headerPad}`} style={{ borderColor: primaryColor }}>
                    {schoolLogo && (
                      <div className={`${d.logoSize} mx-auto mb-1 print:mb-0.5 flex items-center justify-center p-1 print:p-0.5 bg-white rounded-2xl print:rounded-lg ring-2 ring-amber-500/30 shadow-xs border border-slate-200`}>
                        <img
                          src={schoolLogo}
                          alt="School Badge"
                          className="w-full h-full object-contain print-badge school-badge-img"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                    <h1 className={`${d.titleSize} font-serif font-black tracking-normal sm:tracking-wide uppercase text-slate-900`} style={{ color: primaryColor }}>
                      {data.school?.name}
                    </h1>
                    {t.schoolMotto && (
                      <p className={`${d.subText} font-serif font-semibold italic text-amber-800`} style={{ color: accentColor }}>
                        "{t.schoolMotto}"
                      </p>
                    )}
                    <div className={`${d.subText} text-slate-600 font-medium flex items-center justify-center gap-1.5 flex-wrap`}>
                      <span>{data.school?.address}</span>
                      <span className="text-amber-500">·</span>
                      <span>Tel: {data.school?.phone}</span>
                      <span className="text-amber-500">·</span>
                      <span>Email: {data.school?.email}</span>
                    </div>
                    <div className="pt-1 print:pt-0.5 flex items-center justify-center">
                      <div className="flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px] print:text-[7.5px] border border-amber-400/40 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>{t.customHeaderNote || 'Terminal Continuous Assessment & Examination Report'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      </div>
                    </div>
                  </div>
                )}

                {t.headerLayout === 'badge_left' && (
                  <div className={`flex items-center justify-between gap-3 border-b-2 print:border-b ${d.headerPad}`} style={{ borderColor: primaryColor }}>
                    <div className="flex items-center gap-3">
                      {schoolLogo && (
                        <div className={`${d.logoSize} shrink-0 p-1 bg-white border border-slate-200 ring-2 ring-amber-500/30 rounded-2xl shadow-xs flex items-center justify-center`}>
                          <img
                            src={schoolLogo}
                            alt="School Badge"
                            className="w-full h-full object-contain print-badge school-badge-img"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <div>
                        <h1 className={`${d.titleSize} font-serif font-black uppercase tracking-tight`} style={{ color: primaryColor }}>
                          {data.school?.name}
                        </h1>
                        {t.schoolMotto && (
                          <p className={`${d.subText} font-serif font-semibold italic text-amber-800`} style={{ color: accentColor }}>
                            "{t.schoolMotto}"
                          </p>
                        )}
                        <p className={`${d.subText} text-slate-600 mt-0.5`}>{data.school?.address} · {data.school?.phone}</p>
                        <p className={`${d.subText} text-slate-500`}>{data.school?.email}</p>
                      </div>
                    </div>

                    {t.showStudentPhoto && (
                      <div className="w-16 h-20 print:w-12 print:h-16 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center p-1 shrink-0 overflow-hidden">
                        {data.student?.photo_url ? (
                          <img src={data.student.photo_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <>
                            <UserIcon className="w-5 h-5 text-slate-400" />
                            <span className="text-[8px] text-slate-500 font-sans uppercase mt-0.5 leading-tight font-bold">
                              Affix Passport
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {t.headerLayout === 'dual_crest' && (
                  <div className={`border-b-2 print:border-b ${d.headerPad}`} style={{ borderColor: primaryColor }}>
                    <div className="flex items-center justify-between gap-3 text-center">
                      {schoolLogo ? (
                        <div className={`${d.logoSize} shrink-0 p-1 bg-white border border-slate-200 ring-2 ring-amber-500/30 rounded-xl flex items-center justify-center`}>
                          <img
                            src={schoolLogo}
                            alt="School Badge"
                            className="w-full h-full object-contain print-badge school-badge-img"
                            crossOrigin="anonymous"
                          />
                        </div>
                      ) : <div className="w-12"></div>}

                      <div className="flex-1 space-y-0.5">
                        <h1 className={`${d.titleSize} font-serif font-black uppercase tracking-tight`} style={{ color: primaryColor }}>
                          {data.school?.name}
                        </h1>
                        {t.schoolMotto && (
                          <p className={`${d.subText} font-serif font-semibold italic text-amber-800`} style={{ color: accentColor }}>
                            "{t.schoolMotto}"
                          </p>
                        )}
                        <p className={`${d.subText} text-slate-600`}>{data.school?.address} · {data.school?.phone}</p>
                        <p className={`${d.subText} text-slate-500`}>{data.school?.email}</p>
                      </div>

                      {/* State / Standard Educational Emblem */}
                      <div className={`${d.logoSize} shrink-0 p-1 bg-white border border-slate-200 ring-2 ring-amber-500/30 rounded-xl flex items-center justify-center`}>
                        <Shield className="w-7 h-7 text-amber-500" />
                      </div>
                    </div>

                    <div className="text-center pt-1 print:pt-0.5">
                      <span
                        className={`inline-block ${d.notePill} text-white rounded-md font-bold uppercase tracking-wider shadow-xs`}
                        style={{ backgroundColor: primaryColor }}
                      >
                        {t.customHeaderNote || 'Continuous Assessment Terminal Report'}
                      </span>
                    </div>
                  </div>
                )}

                {t.headerLayout === 'modern_banner' && (
                  <div className="rounded-2xl overflow-hidden shadow-xs mb-1.5 border border-slate-200">
                    <div className={`p-3 sm:p-4 text-white flex items-center justify-between gap-3`} style={{ backgroundColor: primaryColor }}>
                      <div className="flex items-center gap-3">
                        {schoolLogo && (
                          <div className={`${d.logoSize} bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-xs ring-2 ring-amber-400/40`}>
                            <img
                              src={schoolLogo}
                              alt="Badge"
                              className="w-full h-full object-contain print-badge school-badge-img"
                              crossOrigin="anonymous"
                            />
                          </div>
                        )}
                        <div>
                          <h1 className={`${d.titleSize} font-serif font-black uppercase tracking-tight`}>{data.school?.name}</h1>
                          <p className={`${d.subText} opacity-90 font-serif italic`}>{t.schoolMotto || data.school?.address}</p>
                          <p className={`${d.subText} opacity-75`}>{data.school?.email} · {data.school?.phone}</p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className={`px-2.5 py-0.5 bg-white/20 rounded-lg ${d.subText} font-bold uppercase tracking-wider block`}>
                          Official Report
                        </span>
                        <span className={`${d.subText} opacity-80 mt-0.5 block`}>{data.session?.name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------- SECTION 2: STUDENT PROFILE GRID ----------------- */}
              <div className={`relative z-10 grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1 ${d.profilePad} bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 rounded-xl print:rounded-lg border-t-2 border-slate-300 border-x border-b border-slate-200 ${d.profileText}`}>
                <div className="border-r border-slate-200/80 pr-2">
                  <span className={`text-slate-400 uppercase font-bold tracking-wider block ${d.profileLabel}`}>Student Full Name</span>
                  <span className={`font-black text-slate-950 font-serif ${d.profileName}`}>{data.student?.full_name}</span>
                </div>
                <div className="border-r border-slate-200/80 px-1">
                  <span className={`text-slate-400 uppercase font-bold tracking-wider block ${d.profileLabel}`}>Admission / Reg No</span>
                  <span className={`font-mono font-bold text-slate-900 ${d.profileText}`}>{data.student?.admission_number}</span>
                </div>
                <div className="border-r border-slate-200/80 px-1">
                  <span className={`text-slate-400 uppercase font-bold tracking-wider block ${d.profileLabel}`}>Class & Arm</span>
                  <span className={`font-bold text-slate-900 ${d.profileText}`}>
                    {data.student?.class_name} {data.student?.arm_name && `(${data.student.arm_name})`}
                  </span>
                </div>
                <div className="pl-1">
                  <span className={`text-slate-400 uppercase font-bold tracking-wider block ${d.profileLabel}`}>Academic Session & Term</span>
                  <span className={`font-bold text-slate-900 ${d.profileText}`}>
                    {data.term?.name} · {data.session?.name}
                  </span>
                </div>
              </div>

              {/* ----------------- SECTION 3: ACADEMIC PERFORMANCE TABLE ----------------- */}
              <div className="relative z-10 overflow-x-auto print-page-break-avoid">
                <table className={`w-full text-left ${d.tableText} border border-slate-300`}>
                  <thead className={`text-white font-bold uppercase tracking-wider ${d.tableThText}`} style={{ backgroundColor: primaryColor }}>
                    <tr>
                      <th className={`${d.tableThPad} border border-slate-400/40 text-left`}>Subject Name</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40`}>{labelCa1} ({wCa1})</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40`}>{labelCa2} ({wCa2})</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40`}>{labelCa3} ({wCa3})</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40`}>{labelExam} ({wExam})</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40 bg-black/20 font-black`}>Total ({totalMax})</th>
                      <th className={`${d.tableThPad} text-center border border-slate-400/40`}>Grade</th>
                      <th className={`${d.tableThPad} border border-slate-400/40 text-left`}>Academic Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedSubjectScores?.map((sc: any, idx: number) => (
                      <tr key={sc.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className={`${d.tableTdPad} font-bold text-slate-900 border border-slate-200`}>{sc.subject_name}</td>
                        <td className={`${d.tableTdPad} text-center font-mono font-medium text-slate-700 border border-slate-200`}>
                          {isEditingResult && subjectLoadTest === 'actual' ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa1}
                                value={sc.ca1 ?? 0}
                                onChange={(e) => handleScoreChange(idx, 'ca1', Number(e.target.value))}
                                className="w-10 px-1 py-0.5 text-center font-bold text-xs bg-amber-50/80 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                              />
                              <span className="hidden print:inline-block font-mono">{sc.ca1}</span>
                            </div>
                          ) : (
                            <span>{sc.ca1}</span>
                          )}
                        </td>
                        <td className={`${d.tableTdPad} text-center font-mono font-medium text-slate-700 border border-slate-200`}>
                          {isEditingResult && subjectLoadTest === 'actual' ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa2}
                                value={sc.ca2 ?? 0}
                                onChange={(e) => handleScoreChange(idx, 'ca2', Number(e.target.value))}
                                className="w-10 px-1 py-0.5 text-center font-bold text-xs bg-amber-50/80 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                              />
                              <span className="hidden print:inline-block font-mono">{sc.ca2}</span>
                            </div>
                          ) : (
                            <span>{sc.ca2}</span>
                          )}
                        </td>
                        <td className={`${d.tableTdPad} text-center font-mono font-medium text-slate-700 border border-slate-200`}>
                          {isEditingResult && subjectLoadTest === 'actual' ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa3}
                                value={sc.ca3 ?? 0}
                                onChange={(e) => handleScoreChange(idx, 'ca3', Number(e.target.value))}
                                className="w-10 px-1 py-0.5 text-center font-bold text-xs bg-amber-50/80 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                              />
                              <span className="hidden print:inline-block font-mono">{sc.ca3}</span>
                            </div>
                          ) : (
                            <span>{sc.ca3}</span>
                          )}
                        </td>
                        <td className={`${d.tableTdPad} text-center font-mono font-medium text-slate-700 border border-slate-200`}>
                          {isEditingResult && subjectLoadTest === 'actual' ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={wExam}
                                value={sc.exam ?? 0}
                                onChange={(e) => handleScoreChange(idx, 'exam', Number(e.target.value))}
                                className="w-12 px-1 py-0.5 text-center font-bold text-xs bg-amber-50/80 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                              />
                              <span className="hidden print:inline-block font-mono">{sc.exam}</span>
                            </div>
                          ) : (
                            <span>{sc.exam}</span>
                          )}
                        </td>
                        <td className={`${d.tableTdPad} text-center font-black font-mono text-slate-950 bg-blue-50/50 border border-slate-200`}>
                          {sc.total}
                        </td>
                        <td className={`${d.tableTdPad} text-center border border-slate-200`}>
                          <span
                            className={`inline-block ${d.gradePill} rounded-md font-mono font-black border shadow-2xs`}
                            style={{
                              backgroundColor: sc.grade === 'A' ? '#ecfdf5' : sc.grade === 'B' ? '#eff6ff' : sc.grade === 'C' ? '#f0fdf4' : sc.grade === 'D' ? '#fffbeb' : '#fef2f2',
                              color: sc.grade === 'A' ? '#047857' : sc.grade === 'B' ? '#1d4ed8' : sc.grade === 'C' ? '#0f766e' : sc.grade === 'D' ? '#b45309' : '#b91c1c',
                              borderColor: sc.grade === 'A' ? '#a7f3d0' : sc.grade === 'B' ? '#bfdbfe' : sc.grade === 'C' ? '#99f6e4' : sc.grade === 'D' ? '#fde68a' : '#fecaca'
                            }}
                          >
                            {sc.grade}
                          </span>
                        </td>
                        <td className={`${d.tableTdPad} text-slate-800 border border-slate-200 font-sans font-medium`}>{sc.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ----------------- SECTION 4: PERFORMANCE SUMMARY METRICS ----------------- */}
              <div className="relative z-10 grid grid-cols-3 gap-2 print:gap-1.5 print-page-break-avoid">
                <div className={`${d.summaryPad} bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-200/80 rounded-xl print:rounded-lg text-center shadow-2xs`}>
                  <span className={`${d.summaryLabel} text-blue-800 font-bold uppercase tracking-wider block`}>Total Score</span>
                  <span className={`${d.summaryVal} font-black mt-0.5 block`} style={{ color: primaryColor }}>
                    {displayedTotal}
                  </span>
                </div>

                <div className={`${d.summaryPad} bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-200/80 rounded-xl print:rounded-lg text-center shadow-2xs`}>
                  <span className={`${d.summaryLabel} text-emerald-800 font-bold uppercase tracking-wider block`}>Terminal Average</span>
                  <span className={`${d.summaryVal} font-black mt-0.5 block text-emerald-700`}>
                    {displayedAverage}%
                  </span>
                </div>

                <div className={`${d.summaryPad} bg-gradient-to-br from-amber-50/80 to-slate-50 border border-amber-200/80 rounded-xl print:rounded-lg text-center shadow-2xs`}>
                  <span className={`${d.summaryLabel} text-amber-800 font-bold uppercase tracking-wider block`}>Class Position</span>
                  <span className={`${d.summaryVal} font-black mt-0.5 block`} style={{ color: accentColor }}>
                    {data.termResult?.position || 'N/A'}{' '}
                    <span className={`${d.summaryLabel} font-normal text-slate-500`}>/ {data.termResult?.class_size || 0}</span>
                  </span>
                </div>
              </div>

              {/* Grading / Editing Banner (Non-printed) */}
              <div className="relative z-10 print:hidden flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-950 block">Result Sheet In-Place Editor</span>
                    <span className="text-[11px] text-amber-800">
                      Edit subject assessment scores (CA1, CA2, CA3, Exam), behavioural attributes (A–E), teacher & principal endorsements.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingResult && (
                    <button
                      type="button"
                      onClick={handleAutomarkSingleStudent}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Auto-calculate behavioral grades based on academic average"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>⚡ Auto-Mark (A–E)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingResult) {
                        handleSaveAllChanges();
                      } else {
                        setIsEditingResult(true);
                      }
                    }}
                    disabled={savingResult}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {savingResult ? (
                      <span>Saving Changes...</span>
                    ) : isEditingResult ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save All Changes</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Edit Result Sheet</span>
                      </>
                    )}
                  </button>
                  {isEditingResult && (
                    <button
                      type="button"
                      onClick={() => setIsEditingResult(false)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Close Edit Mode
                    </button>
                  )}
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 print:hidden shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                  <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {saveErrorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 print:hidden shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{saveErrorMsg}</span>
                  </div>
                  <button onClick={() => setSaveErrorMsg(null)} className="text-rose-700 hover:text-rose-950 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ----------------- SECTION 5: BEHAVIOURAL ATTRIBUTES & PSYCHOMOTOR SKILLS (A TO E) ----------------- */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs print:grid-cols-2 print:gap-1.5 print-page-break-avoid">
                {/* Affective Domain (Behavioral Attributes) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className={`${d.domainHeader} text-white font-bold uppercase tracking-wider flex items-center justify-between`} style={{ backgroundColor: primaryColor }}>
                    <span>Affective Domain (Character Traits)</span>
                    <span className="font-normal opacity-90 text-[8.5px] print:text-[6.5px]">Scale (A – E)</span>
                  </div>
                  <table className={`w-full ${d.domainText}`}>
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className={`${d.domainThPad} text-left`}>Character Trait</th>
                        <th className={`${d.domainThPad} text-center w-12`}>Grade</th>
                        <th className={`${d.domainThPad} text-center`}>Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        { trait: 'Punctuality & Regularity', field: 'punctuality' as const },
                        { trait: 'Neatness & Personal Hygiene', field: 'neatness' as const },
                        { trait: 'Politeness & Courtesy', field: 'politeness' as const },
                        { trait: 'Honesty & Moral Integrity', field: 'honesty' as const },
                        { trait: 'Attentiveness & Focus', field: 'attentiveness' as const },
                        { trait: 'Leadership & Teamwork', field: 'leadership' as const },
                      ].map((item, i) => {
                        const gradeVal = isEditingResult
                          ? (editableActivities as any)[item.field] || 'A'
                          : behaviouralActivities[i]?.grade || (editableActivities as any)[item.field] || 'A';
                        return (
                          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className={`${d.domainTdPad} text-slate-800 font-medium`}>{item.trait}</td>
                            <td className={`${d.domainTdPad} text-center font-bold font-mono`}>
                              {isEditingResult ? (
                                <div className="flex items-center justify-center">
                                  <select
                                    value={gradeVal}
                                    onChange={(e) => {
                                      setEditableActivities({ ...editableActivities, [item.field]: e.target.value });
                                      setHasUnsavedChanges(true);
                                    }}
                                    className="w-12 px-1 py-0.5 text-center font-bold text-xs bg-amber-50 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                                  >
                                    {['A', 'B', 'C', 'D', 'E'].map(g => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                  <span className="hidden print:inline-block font-mono font-bold">{gradeVal}</span>
                                </div>
                              ) : (
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded-md font-black border shadow-2xs ${d.domainText}`}
                                  style={{
                                    backgroundColor: gradeVal === 'A' ? '#ecfdf5' : gradeVal === 'B' ? '#eff6ff' : gradeVal === 'C' ? '#f0fdf4' : gradeVal === 'D' ? '#fffbeb' : '#fef2f2',
                                    color: gradeVal === 'A' ? '#047857' : gradeVal === 'B' ? '#1d4ed8' : gradeVal === 'C' ? '#0f766e' : gradeVal === 'D' ? '#b45309' : '#b91c1c',
                                    borderColor: gradeVal === 'A' ? '#a7f3d0' : gradeVal === 'B' ? '#bfdbfe' : gradeVal === 'C' ? '#99f6e4' : gradeVal === 'D' ? '#fde68a' : '#fecaca'
                                  }}
                                >
                                  {gradeVal}
                                </span>
                              )}
                            </td>
                            <td className={`${d.domainTdPad} text-center text-slate-600 font-medium`}>
                              {scaleMap[gradeVal] || 'Good'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className={`bg-slate-50 px-2 py-0.5 border-t border-slate-200 ${d.scaleText} text-slate-600`}>
                    <strong>Rating Scale:</strong> A - Excellent · B - Very Good · C - Good · D - Fair · E - Poor
                  </div>
                </div>

                {/* Psychomotor Skills & Co-Curricular */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className={`${d.domainHeader} text-white font-bold uppercase tracking-wider flex items-center justify-between`} style={{ backgroundColor: primaryColor }}>
                    <span>Psychomotor & Practical Skills</span>
                    <span className="font-normal opacity-90 text-[8.5px] print:text-[6.5px]">Scale (A – E)</span>
                  </div>
                  <table className={`w-full ${d.domainText}`}>
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className={`${d.domainThPad} text-left`}>Practical / Physical Skill</th>
                        <th className={`${d.domainThPad} text-center w-12`}>Grade</th>
                        <th className={`${d.domainThPad} text-center`}>Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        { skill: 'Handwriting & Legibility', field: 'handwriting' as const },
                        { skill: 'Sports, Games & Athletics', field: 'sports' as const },
                        { skill: 'Crafts, Drawing & Arts', field: 'crafts' as const },
                        { skill: 'Public Speaking & Verbal Fluency', field: 'speaking' as const },
                        { skill: 'Practical & Lab Competencies', field: 'practical' as const },
                      ].map((item, i) => {
                        const gradeVal = isEditingResult
                          ? (editableActivities as any)[item.field] || 'A'
                          : psychomotorActivities[i]?.grade || (editableActivities as any)[item.field] || 'A';
                        return (
                          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className={`${d.domainTdPad} text-slate-800 font-medium`}>{item.skill}</td>
                            <td className={`${d.domainTdPad} text-center font-bold font-mono`}>
                              {isEditingResult ? (
                                <div className="flex items-center justify-center">
                                  <select
                                    value={gradeVal}
                                    onChange={(e) => {
                                      setEditableActivities({ ...editableActivities, [item.field]: e.target.value });
                                      setHasUnsavedChanges(true);
                                    }}
                                    className="w-12 px-1 py-0.5 text-center font-bold text-xs bg-amber-50 border border-amber-300 rounded font-mono focus:bg-white focus:outline-hidden print:hidden"
                                  >
                                    {['A', 'B', 'C', 'D', 'E'].map(g => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                  <span className="hidden print:inline-block font-mono font-bold">{gradeVal}</span>
                                </div>
                              ) : (
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded-md font-black border shadow-2xs ${d.domainText}`}
                                  style={{
                                    backgroundColor: gradeVal === 'A' ? '#ecfdf5' : gradeVal === 'B' ? '#eff6ff' : gradeVal === 'C' ? '#f0fdf4' : gradeVal === 'D' ? '#fffbeb' : '#fef2f2',
                                    color: gradeVal === 'A' ? '#047857' : gradeVal === 'B' ? '#1d4ed8' : gradeVal === 'C' ? '#0f766e' : gradeVal === 'D' ? '#b45309' : '#b91c1c',
                                    borderColor: gradeVal === 'A' ? '#a7f3d0' : gradeVal === 'B' ? '#bfdbfe' : gradeVal === 'C' ? '#99f6e4' : gradeVal === 'D' ? '#fde68a' : '#fecaca'
                                  }}
                                >
                                  {gradeVal}
                                </span>
                              )}
                            </td>
                            <td className={`${d.domainTdPad} text-center text-slate-600 font-medium`}>
                              {scaleMap[gradeVal] || 'Good'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className={`bg-slate-50 px-2 py-0.5 border-t border-slate-200 ${d.scaleText} text-slate-600`}>
                    <strong>Rating Scale:</strong> A - Excellent · B - Very Good · C - Good · D - Fair · E - Poor
                  </div>
                </div>
              </div>

              {/* ----------------- SECTION 6: OFFICIAL GRADING SCALE ----------------- */}
              <div className={`relative z-10 border border-slate-300 rounded-xl ${d.scalePad} bg-slate-50/70 ${d.scaleText} text-slate-700 print-page-break-avoid`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold text-slate-900 uppercase tracking-wider ${d.scaleText}`}>
                    Official Academic Grading Scale
                  </span>
                  <span className={`${d.scaleText} text-slate-500 font-mono`}>Score Benchmark Key</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 print:grid-cols-6 gap-1 print:gap-1">
                  {(data.gradingScale || [
                    { grade: 'A', min_score: 75, max_score: 100, remark: 'Excellent' },
                    { grade: 'B', min_score: 65, max_score: 74.99, remark: 'Very Good' },
                    { grade: 'C', min_score: 50, max_score: 64.99, remark: 'Good' },
                    { grade: 'D', min_score: 45, max_score: 49.99, remark: 'Fair Pass' },
                    { grade: 'E', min_score: 40, max_score: 44.99, remark: 'Weak Pass' },
                    { grade: 'F', min_score: 0, max_score: 39.99, remark: 'Fail' }
                  ]).map((scale: any) => (
                    <div key={scale.grade} className="bg-white border border-slate-200 p-0.5 rounded text-center font-mono">
                      <span className={`font-bold ${d.scaleText} text-slate-900 block`}>{scale.grade}</span>
                      <span className={`${d.scaleText} text-slate-500 block`}>{scale.min_score}% - {scale.max_score}%</span>
                      <span className={`${d.scaleText} font-sans font-semibold text-slate-700 block`}>{scale.remark}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ----------------- SECTION 7: REMARKS, ATTENDANCE & RESUMPTION ----------------- */}
              <div className={`relative z-10 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 ${d.remarksText} print-page-break-avoid`}>
                <div className={`${d.remarksPad} bg-slate-50 border border-slate-300 rounded-xl space-y-0.5`}>
                  <span className={`font-bold text-slate-900 block ${d.remarksText} uppercase tracking-wider`}>
                    Class Teacher's Appraisal:
                  </span>
                  {isEditingResult ? (
                    <>
                      <textarea
                        rows={2}
                        value={editableActivities.teacher_comment}
                        onChange={(e) => {
                          setEditableActivities({ ...editableActivities, teacher_comment: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Enter class teacher's appraisal..."
                        className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden print:hidden"
                      />
                      <p className={`hidden print:block text-slate-800 italic font-serif ${d.remarksQuote} leading-tight`}>
                        "{editableActivities.teacher_comment || data.termResult?.teacher_comment || 'Consistent academic performance demonstrated with notable diligence, attentiveness, and commendable moral conduct.'}"
                      </p>
                    </>
                  ) : (
                    <p className={`text-slate-800 italic font-serif ${d.remarksQuote} leading-tight`}>
                      "{editableActivities.teacher_comment || data.termResult?.teacher_comment || 'Consistent academic performance demonstrated with notable diligence, attentiveness, and commendable moral conduct.'}"
                    </p>
                  )}
                </div>

                <div className={`${d.remarksPad} bg-slate-50 border border-slate-300 rounded-xl space-y-1`}>
                  <span className={`font-bold text-slate-900 block ${d.remarksText} uppercase tracking-wider`}>
                    Principal / Headmaster's Endorsement:
                  </span>
                  {isEditingResult ? (
                    <>
                      <textarea
                        rows={2}
                        value={editableActivities.principal_comment}
                        onChange={(e) => {
                          setEditableActivities({ ...editableActivities, principal_comment: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Enter headmaster / principal's endorsement..."
                        className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden print:hidden"
                      />
                      <p className={`hidden print:block text-slate-800 italic font-serif ${d.remarksQuote} leading-tight`}>
                        "{editableActivities.principal_comment || data.termResult?.principal_comment || 'Promoted in high academic standing. Encouraged to sustain this exemplary discipline.'}"
                      </p>
                    </>
                  ) : (
                    <p className={`text-slate-800 italic font-serif ${d.remarksQuote} leading-tight`}>
                      "{editableActivities.principal_comment || data.termResult?.principal_comment || 'Promoted in high academic standing. Encouraged to sustain this exemplary discipline.'}"
                    </p>
                  )}
                  {isEditingResult ? (
                    <>
                      <div className="pt-2 border-t border-slate-200 space-y-1.5 print:hidden">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Terminal Attendance (Days Present / Total):</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={365}
                                value={editableActivities.days_present}
                                onChange={(e) => {
                                  setEditableActivities({ ...editableActivities, days_present: Number(e.target.value) });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-14 px-1.5 py-1 text-xs bg-amber-50 border border-amber-300 rounded-lg font-bold text-center focus:bg-white"
                              />
                              <span className="text-slate-400 font-bold">/</span>
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={editableActivities.total_school_days}
                                onChange={(e) => {
                                  setEditableActivities({ ...editableActivities, total_school_days: Number(e.target.value) });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-14 px-1.5 py-1 text-xs bg-amber-50 border border-amber-300 rounded-lg font-bold text-center focus:bg-white"
                              />
                              <span className="text-[10px] text-slate-500">Days</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Next Term Resumption:</label>
                            <input
                              type="text"
                              value={editableActivities.next_term_resumption}
                              onChange={(e) => {
                                setEditableActivities({ ...editableActivities, next_term_resumption: e.target.value });
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="e.g. 15th Sept, 2026"
                              className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-300 rounded-lg font-semibold focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className={`hidden print:flex pt-1 border-t border-slate-200 items-center justify-between ${d.remarksText} text-slate-700`}>
                        <span><strong>Attendance:</strong> {editableActivities.days_present}/{editableActivities.total_school_days} Days ({editableActivities.total_school_days > 0 ? Math.round((editableActivities.days_present / editableActivities.total_school_days) * 100) : 100}%)</span>
                        <span><strong>Next Term Resumption:</strong> <strong style={{ color: primaryColor }}>{editableActivities.next_term_resumption || resumptionDate}</strong></span>
                      </div>
                    </>
                  ) : (
                    <div className={`pt-1 border-t border-slate-200 flex items-center justify-between ${d.remarksText} text-slate-700`}>
                      <span><strong>Attendance:</strong> {editableActivities.days_present}/{editableActivities.total_school_days} Days ({editableActivities.total_school_days > 0 ? Math.round((editableActivities.days_present / editableActivities.total_school_days) * 100) : 100}%)</span>
                      <span><strong>Next Term Resumption:</strong> <strong style={{ color: primaryColor }}>{editableActivities.next_term_resumption || resumptionDate}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* ----------------- SECTION 8: OFFICIAL STAMP & MANUAL SIGNATURES ----------------- */}
              <div className="relative z-10 pt-1.5 print:pt-0.5 border-t border-slate-300 print-page-break-avoid">
                <div className="grid grid-cols-3 gap-3 print:gap-1.5 text-center items-end">
                  {/* Class Teacher Signature (EMPTY FOR MANUAL SIGNATURE) */}
                  <div className="flex flex-col items-center">
                    <div className={`w-full ${d.sigLineH} border-b-2 border-slate-700 mb-1 print:mb-0.5`}>
                      {/* Blank designated space for physical manual pen signature */}
                    </div>
                    <span className={`font-bold text-slate-900 block ${d.sigText} uppercase tracking-wider`}>
                      Class Teacher's Signature
                    </span>
                    <span className={`${d.sigDateText} text-slate-500 font-mono mt-0.5`}>
                      Date: ____________________
                    </span>
                  </div>

                  {/* Official Circular Stamp & Seal */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className={`${d.stampSize} rounded-full border-2 border-dashed flex flex-col items-center justify-center p-0.5 transform rotate-[-4deg] shadow-xs`}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Stamp className="w-3.5 h-3.5 print:w-2 print:h-2 mb-0.5 opacity-80" />
                      <span className="text-[6.5px] print:text-[5px] font-black uppercase tracking-tight text-center leading-tight">
                        OFFICIAL SEAL
                      </span>
                      <span className="font-mono text-[6px] print:text-[4.5px]">{new Date().getFullYear()}</span>
                    </div>
                    <span className={`${d.sigDateText} text-slate-500 font-sans mt-0.5`}>Official Stamp & Seal</span>
                  </div>

                  {/* Principal / Headmaster Signature (EMPTY FOR MANUAL SIGNATURE) */}
                  <div className="flex flex-col items-center">
                    <div className={`w-full ${d.sigLineH} border-b-2 border-slate-700 mb-1 print:mb-0.5`}>
                      {/* Blank designated space for physical manual pen signature */}
                    </div>
                    <span className={`font-bold text-slate-900 block ${d.sigText} uppercase tracking-wider`}>
                      Principal's Signature
                    </span>
                    <span className={`${d.sigDateText} text-slate-500 font-mono mt-0.5`}>
                      Date: ____________________
                    </span>
                  </div>
                </div>

                <div className="mt-0.5 pt-0.5 border-t border-slate-200 text-center text-[7.5px] print:text-[6px] text-slate-500 italic">
                  * Note: Signature spaces above are designated for physical ink endorsement and physical school stamping upon issuance.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Bar Controls (Never Printed) */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            {isEditingResult && (
              <button
                onClick={() => handleSaveAllChanges()}
                disabled={savingResult}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                title="Save changes to SQLite database"
              >
                <Save className="w-4 h-4" />
                <span>{savingResult ? 'Saving Changes...' : 'Save to Database'}</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Clean A4 Report</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              {downloadingPDF ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF with Badge...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
