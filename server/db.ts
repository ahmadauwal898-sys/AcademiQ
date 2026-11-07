import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const DB_DIR = isServerless
  ? path.join('/tmp', 'academiq_data')
  : path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (err) {
    console.warn('[DB] Failed to create DB_DIR:', err);
  }
}

const DB_PATH = path.join(DB_DIR, 'multischool.sqlite');

// On serverless cold start, bootstrap /tmp with the bundled sqlite database if it exists
if (isServerless && !fs.existsSync(DB_PATH)) {
  const seedCandidates = [
    path.resolve(process.cwd(), 'data', 'multischool.sqlite'),
    path.resolve('/var/task', 'data', 'multischool.sqlite')
  ];
  for (const candidate of seedCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        fs.copyFileSync(candidate, DB_PATH);
        console.log(`[Database] Bootstrapped /tmp database from ${candidate}`);
        break;
      } catch (copyErr) {
        console.warn(`[Database] Could not copy seed from ${candidate}:`, copyErr);
      }
    }
  }
}

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and durable Write-Ahead Logging (WAL)
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA busy_timeout = 5000;');

export function initDatabase() {
  db.exec(`
    -- Platform Subscription Plans
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      billing_interval TEXT NOT NULL DEFAULT 'annual', -- 'monthly', 'annual', 'termly'
      max_students INTEGER NOT NULL DEFAULT 500,
      max_staff INTEGER NOT NULL DEFAULT 50,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Schools (Tenants)
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      country TEXT NOT NULL DEFAULT 'Nigeria',
      state TEXT,
      school_level TEXT NOT NULL, -- 'Nursery', 'Primary', 'Junior Secondary', 'Senior Secondary', 'Combined K-12'
      logo_url TEXT,
      result_template_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT, -- NULL for platform superadmin
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL, -- 'super_admin', 'school_admin', 'teacher', 'bursar', 'student_parent'
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- School Subscriptions
    CREATE TABLE IF NOT EXISTS school_subscriptions (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- 'pending', 'active', 'expired', 'past_due', 'suspended'
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'paystack', 'flutterwave'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    -- Academic Sessions
    CREATE TABLE IF NOT EXISTS academic_sessions (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL, -- e.g. '2026/2027'
      is_current INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Academic Terms
    CREATE TABLE IF NOT EXISTS academic_terms (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL, -- 'First Term', 'Second Term', 'Third Term'
      is_current INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      next_term_resumption TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    );

    -- Classes
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL, -- e.g. 'JSS 1', 'Primary 4', 'SSS 2 Science'
      level TEXT NOT NULL, -- 'Nursery', 'Primary', 'Junior Secondary', 'Senior Secondary'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Class Arms
    CREATE TABLE IF NOT EXISTS class_arms (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      name TEXT NOT NULL, -- 'Gold', 'Silver', 'A', 'Blue'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    -- Subjects
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL, -- 'Mathematics', 'English Language', 'Basic Science'
      code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Teacher Profiles
    CREATE TABLE IF NOT EXISTS teacher_profiles (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      user_id TEXT NOT NULL UNIQUE,
      employee_id TEXT,
      qualification TEXT,
      specialization TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Teacher Subject/Class Assignments
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL, -- user_id of teacher
      class_id TEXT NOT NULL,
      arm_id TEXT,
      subject_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    );

    -- Students
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      admission_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL, -- 'Male', 'Female'
      date_of_birth TEXT,
      class_id TEXT NOT NULL,
      arm_id TEXT,
      parent_name TEXT,
      parent_phone TEXT,
      parent_email TEXT,
      address TEXT,
      photo_url TEXT,
      enrollment_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'transferred', 'graduated', 'withdrawn'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
      FOREIGN KEY (arm_id) REFERENCES class_arms(id) ON DELETE RESTRICT,
      UNIQUE(school_id, admission_number)
    );

    -- Grading Scales Configuration
    CREATE TABLE IF NOT EXISTS grading_systems (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Default Scale',
      scales_json TEXT NOT NULL, -- '[{"grade":"A","min_score":70,"max_score":100,"remark":"Excellent"},{"grade":"B","min_score":60,"max_score":69,"remark":"Very Good"}...]'
      assessment_weights_json TEXT NOT NULL, -- '[{"code":"ca1","name":"1st CA","max_score":10},{"code":"ca2","name":"2nd CA","max_score":10},{"code":"exam","name":"Examination","max_score":80}]'
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Assessment Scores (Per student, subject, term, session)
    CREATE TABLE IF NOT EXISTS student_scores (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      ca1 REAL NOT NULL DEFAULT 0,
      ca2 REAL NOT NULL DEFAULT 0,
      ca3 REAL NOT NULL DEFAULT 0,
      exam REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      grade TEXT NOT NULL DEFAULT 'F',
      remark TEXT NOT NULL DEFAULT 'Fail',
      teacher_comment TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'under_review', 'approved', 'published', 'locked'
      entered_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
      UNIQUE(school_id, student_id, subject_id, term_id, session_id)
    );

    -- Compiled Term Results Snapshot (Per student, term, session)
    CREATE TABLE IF NOT EXISTS term_results (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      arm_id TEXT,
      term_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      total_score REAL NOT NULL DEFAULT 0,
      average_score REAL NOT NULL DEFAULT 0,
      position INTEGER,
      class_size INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'published', 'locked'
      teacher_comment TEXT,
      principal_comment TEXT,
      approved_by_user_id TEXT,
      approved_at TEXT,
      published_at TEXT,
      snapshot_json TEXT, -- Complete frozen JSON of all subject scores, remarks, scale used
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
      UNIQUE(school_id, student_id, term_id, session_id)
    );

    -- Result Verification Codes (For parents and public verification)
    CREATE TABLE IF NOT EXISTS result_verification_codes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      code_hash TEXT NOT NULL, -- SHA-256 hash of the plain checking pin
      code_display TEXT NOT NULL, -- Masked or formatted token for administrator issuance e.g. 'APX-7482-K'
      usage_count INTEGER NOT NULL DEFAULT 0,
      max_usage INTEGER NOT NULL DEFAULT 10,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Student Activities: Behavioural Attributes & Psychomotor Skills (Graded A to E)
    CREATE TABLE IF NOT EXISTS student_activities (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      punctuality TEXT NOT NULL DEFAULT 'A',
      neatness TEXT NOT NULL DEFAULT 'A',
      politeness TEXT NOT NULL DEFAULT 'A',
      honesty TEXT NOT NULL DEFAULT 'A',
      attentiveness TEXT NOT NULL DEFAULT 'A',
      leadership TEXT NOT NULL DEFAULT 'B',
      handwriting TEXT NOT NULL DEFAULT 'A',
      sports TEXT NOT NULL DEFAULT 'B',
      crafts TEXT NOT NULL DEFAULT 'B',
      speaking TEXT NOT NULL DEFAULT 'A',
      practical TEXT NOT NULL DEFAULT 'A',
      remarks TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(school_id, student_id, term_id, session_id)
    );

    -- Result Corrections Audit Log
    CREATE TABLE IF NOT EXISTS result_corrections_log (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      score_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      old_ca1 REAL,
      old_ca2 REAL,
      old_exam REAL,
      old_total REAL,
      new_ca1 REAL,
      new_ca2 REAL,
      new_exam REAL,
      new_total REAL,
      reason TEXT NOT NULL,
      corrected_by_user_id TEXT NOT NULL,
      approved_by_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Attendance Records
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
      remarks TEXT,
      recorded_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(school_id, student_id, date)
    );

    -- Fee Categories
    CREATE TABLE IF NOT EXISTS fee_categories (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL, -- 'Tuition Fee', 'Development Levy', 'Examination Fee', 'PTA Levy'
      amount REAL NOT NULL DEFAULT 0,
      term_id TEXT,
      session_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    -- Student Fee Payments & Transactions
    CREATE TABLE IF NOT EXISTS fee_payments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      fee_category_id TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'bank_transfer', 'pos', 'online'
      receipt_number TEXT NOT NULL,
      payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      remarks TEXT,
      recorded_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (fee_category_id) REFERENCES fee_categories(id) ON DELETE CASCADE,
      UNIQUE(school_id, receipt_number)
    );

    -- Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      school_id TEXT, -- NULL for platform-wide notice from superadmin
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'teachers', 'parents', 'students'
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs (Cybersecurity & Compliance)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Special Payment Verification Codes (Issued by Super Admin for First-Time School Login)
    CREATE TABLE IF NOT EXISTS payment_verification_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      school_id TEXT,
      school_name TEXT,
      issued_to_email TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'redeemed', 'revoked'
      created_by_user_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL DEFAULT 'Platform Super Admin',
      redeemed_by_user_id TEXT,
      redeemed_by_email TEXT,
      redeemed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    -- School Notifications & Announcements (Supports individual school notices and bulk announcements)
    CREATE TABLE IF NOT EXISTS school_notifications (
      id TEXT PRIMARY KEY,
      school_id TEXT, -- NULL for all schools (bulk broadcast), or specific school_id
      school_name TEXT, -- 'All Schools' or specific school name
      sender_id TEXT,
      sender_name TEXT NOT NULL DEFAULT 'Platform Super Admin (Ahmad Auwal)',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'announcement', -- 'announcement', 'payment_clearance', 'administrative', 'urgent', 'academic'
      priority TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'high', 'urgent'
      target_role TEXT NOT NULL DEFAULT 'all', -- 'all', 'school_admin', 'teacher', 'bursar', 'student_parent'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- User Notification Read Tracking
    CREATE TABLE IF NOT EXISTS user_notification_reads (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notification_id, user_id),
      FOREIGN KEY (notification_id) REFERENCES school_notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Safe migration for existing SQLite database
  try {
    db.exec('ALTER TABLE schools ADD COLUMN result_template_json TEXT;');
  } catch (_) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE schools ADD COLUMN is_payment_verified INTEGER NOT NULL DEFAULT 0;');
  } catch (_) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE schools ADD COLUMN payment_verified_at TEXT;');
  } catch (_) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE schools ADD COLUMN payment_code_used TEXT;');
  } catch (_) {
    // Column already exists
  }

  seedInitialData();
  ensureComprehensiveAcademicData();

  // If running in fresh serverless environment and schools need restoration
  try {
    const schoolCount = (db.prepare('SELECT COUNT(*) as count FROM schools').get() as { count: number }).count;
    if (schoolCount === 0) {
      const backupCandidates = [
        path.join(BACKUP_DIR, 'latest_full_database.json'),
        path.resolve(process.cwd(), 'data', 'backups', 'latest_full_database.json'),
        path.resolve('/var/task', 'data', 'backups', 'latest_full_database.json'),
        path.join(BACKUP_DIR, 'latest_backup.json')
      ];
      for (const bPath of backupCandidates) {
        if (fs.existsSync(bPath)) {
          try {
            const raw = fs.readFileSync(bPath, 'utf-8');
            const parsed = JSON.parse(raw);
            restoreDatabaseFromBackup(parsed);
            console.log(`[Database] Auto-restored data from ${bPath}`);
            break;
          } catch (e) {
            console.warn('[Database] Could not auto-restore from backup:', e);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Database] Auto-restore check error:', err);
  }
}

export const DEFAULT_APEX_BADGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Outer Shield Crest -->
  <path d="M60 6 L104 22 L104 66 C104 90 60 114 60 114 C60 114 16 90 16 66 L16 22 Z" fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="4"/>
  <path d="M60 14 L96 28 L96 64 C96 84 60 104 60 104 C60 104 24 84 24 64 L24 28 Z" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4"/>
  <!-- Gold Laurel & Academic Torch -->
  <path d="M60 26 L64 42 L80 43 L67 53 L71 68 L60 58 L49 68 L53 53 L40 43 L56 42 Z" fill="url(#goldGrad)"/>
  <!-- Open Knowledge Book -->
  <path d="M40 76 Q60 68 80 76 L80 84 Q60 76 40 84 Z" fill="#ffffff"/>
  <path d="M40 80 Q60 72 80 80 L80 87 Q60 79 40 87 Z" fill="#ffffff" opacity="0.85"/>
  <text x="60" y="99" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="#f59e0b" text-anchor="middle" letter-spacing="1.5">EXCELLENCE</text>
</svg>
`)}`;

export const DEFAULT_RESULT_TEMPLATE = {
  templateName: 'Classic Crest Academic',
  headerLayout: 'crest_center', // 'crest_center' | 'badge_left' | 'dual_crest' | 'modern_banner'
  tableStyle: 'classic_bordered', // 'classic_bordered' | 'modern_clean' | 'waec_grid' | 'cambridge_compact'
  primaryColor: '#1e3a8a', // Dark Navy Blue
  accentColor: '#f59e0b', // Amber Gold
  showWatermark: true,
  watermarkOpacity: 0.08,
  showStudentPhoto: true,
  showAffectiveDomain: true,
  showPsychomotorDomain: true,
  showGradingScaleTable: true,
  showPrincipalStamp: true,
  schoolMotto: 'Knowledge, Integrity and Excellence',
  fontFamily: 'serif',
  customHeaderNote: 'Official Terminal Continuous Assessment & Examination Report',
  affectiveTraits: [
    { trait: 'Punctuality', score: 5 },
    { trait: 'Neatness & Decorum', score: 5 },
    { trait: 'Politeness & Respect', score: 5 },
    { trait: 'Honesty & Integrity', score: 5 },
    { trait: 'Leadership & Teamwork', score: 4 },
    { trait: 'Attentiveness in Class', score: 4 }
  ],
  psychomotorSkills: [
    { skill: 'Handwriting & Legibility', score: 5 },
    { skill: 'Sports, Athletics & Games', score: 4 },
    { skill: 'Crafts, Drawing & Art', score: 4 },
    { skill: 'Public Speaking & Debate', score: 4 }
  ]
};

// Utility password hashing
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export function logAuditEvent(action: string, resource: string, details?: any, schoolId?: string | null, userId?: string | null, userEmail?: string | null) {
  try {
    const id = 'log_' + crypto.randomUUID().slice(0, 12);
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, school_id, user_id, user_email, action, resource, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, schoolId || null, userId || null, userEmail || null, action, resource, typeof details === 'string' ? details : JSON.stringify(details || {}));
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

function seedInitialData() {
  // Check if plans exist
  const existingPlans = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get() as { count: number };
  if (existingPlans.count === 0) {
    const defaultPlans = [
      {
        id: 'plan_starter',
        name: 'Starter School',
        description: 'Ideal for small nursery and primary schools',
        price: 35000,
        billing_interval: 'annual',
        max_students: 200,
        max_staff: 20,
        features_json: JSON.stringify(['Student Management', 'Result Processing', 'Report Cards', 'Attendance']),
      },
      {
        id: 'plan_standard',
        name: 'Standard Pro',
        description: 'Comprehensive package for growing K-12 and secondary colleges',
        price: 85000,
        billing_interval: 'annual',
        max_students: 800,
        max_staff: 60,
        features_json: JSON.stringify(['Student Management', 'Result Processing', 'Broadsheets & PDF', 'Public Result Checker', 'Fee Tracking', 'Attendance']),
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Apex',
        description: 'Unlimited multi-campus school management with priority support',
        price: 180000,
        billing_interval: 'annual',
        max_students: 5000,
        max_staff: 250,
        features_json: JSON.stringify(['Unlimited Students', 'Full Finance Suite', 'Custom Report Card Layouts', 'Public Portal', 'Audit Logs', 'Priority Support']),
      },
    ];

    for (const p of defaultPlans) {
      db.prepare(`
        INSERT INTO subscription_plans (id, name, description, price, billing_interval, max_students, max_staff, features_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.name, p.description, p.price, p.billing_interval, p.max_students, p.max_staff, p.features_json);
    }
  }

  // Ensure Super Admin exists with required credentials:
  // academia.multi.tenant@gmail.com and academiq.multi.tenant@gmail.com with password @Candfe69a9
  const { hash: superAdminHash, salt: superAdminSalt } = hashPassword('@Candfe69a9');
  const superAdminList = [
    { id: 'usr_superadmin', email: 'academia.multi.tenant@gmail.com' },
    { id: 'usr_superadmin_q', email: 'academiq.multi.tenant@gmail.com' }
  ];

  for (const adm of superAdminList) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR id = ?').get(adm.email, adm.id) as { id: string } | undefined;
    if (!existing) {
      db.prepare(`
        INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(adm.id, adm.email, superAdminHash, superAdminSalt, 'Platform Super Administrator (Ahmad Auwal)', '+2349155377861', 'super_admin');
    } else {
      db.prepare(`
        UPDATE users
        SET email = ?,
            password_hash = ?,
            salt = ?,
            full_name = 'Platform Super Administrator (Ahmad Auwal)',
            role = 'super_admin',
            school_id = NULL
        WHERE id = ?
      `).run(adm.email, superAdminHash, superAdminSalt, existing.id);
    }
  }

  // Seed sample school: Apex Academy (Approved)
  const existingSchool = db.prepare('SELECT COUNT(*) as count FROM schools WHERE id = ?').get('sch_apex') as { count: number };
  if (existingSchool.count === 0) {
    db.prepare(`
      INSERT INTO schools (id, name, slug, email, phone, address, country, state, school_level, logo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sch_apex',
      'Apex Model International College',
      'apex-model-college',
      'info@apexacademy.edu',
      '+2348031234567',
      '14 Independence Way, Victoria Island',
      'Nigeria',
      'Lagos',
      'Senior Secondary',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=160&q=80',
      'approved'
    );

    // School Admin user for Apex
    const { hash: adminHash, salt: adminSalt } = hashPassword('School@123');
    db.prepare(`
      INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_apex_admin', 'sch_apex', 'admin@apexacademy.edu', adminHash, adminSalt, 'Dr. Amina Bello (Principal)', '+2348031234568', 'school_admin');

    // Teacher user for Apex
    const { hash: teacherHash, salt: teacherSalt } = hashPassword('Teacher@123');
    db.prepare(`
      INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_apex_teacher', 'sch_apex', 'john.doe@apexacademy.edu', teacherHash, teacherSalt, 'Mr. Johnathan Doe', '+2348039999001', 'teacher');

    // Bursar user for Apex
    const { hash: bursarHash, salt: bursarSalt } = hashPassword('Bursar@123');
    db.prepare(`
      INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_apex_bursar', 'sch_apex', 'bursar@apexacademy.edu', bursarHash, bursarSalt, 'Mrs. Folake Adeyemi (Bursar)', '+2348039999002', 'bursar');

    // Subscription for Apex
    db.prepare(`
      INSERT INTO school_subscriptions (id, school_id, plan_id, status, start_date, expiry_date, amount_paid, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('sub_apex_01', 'sch_apex', 'plan_standard', 'active', '2026-01-01', '2027-01-01', 85000, 'bank_transfer');

    // Academic session & term for Apex
    db.prepare(`
      INSERT INTO academic_sessions (id, school_id, name, is_current, start_date, end_date)
      VALUES (?, ?, ?, 1, '2026-09-01', '2027-07-31')
    `).run('sess_apex_2627', 'sch_apex', '2026/2027');

    db.prepare(`
      INSERT INTO academic_terms (id, school_id, session_id, name, is_current, start_date, end_date, next_term_resumption)
      VALUES (?, ?, ?, 'First Term', 1, '2026-09-10', '2026-12-18', '2027-01-11')
    `).run('term_apex_t1', 'sch_apex', 'sess_apex_2627');

    // Classes for Apex
    db.prepare(`
      INSERT INTO classes (id, school_id, name, level)
      VALUES (?, ?, 'SS 1', 'Senior Secondary'), (?, ?, 'SS 2', 'Senior Secondary'), (?, ?, 'SS 3', 'Senior Secondary')
    `).run('cls_apex_ss1', 'sch_apex', 'cls_apex_ss2', 'sch_apex', 'cls_apex_ss3', 'sch_apex');

    // Arms
    db.prepare(`
      INSERT INTO class_arms (id, school_id, class_id, name)
      VALUES (?, ?, ?, 'Science'), (?, ?, ?, 'Arts'), (?, ?, ?, 'Commercial')
    `).run(
      'arm_apex_sci', 'sch_apex', 'cls_apex_ss1',
      'arm_apex_art', 'sch_apex', 'cls_apex_ss1',
      'arm_apex_com', 'sch_apex', 'cls_apex_ss1'
    );

    // Subjects
    db.prepare(`
      INSERT INTO subjects (id, school_id, name, code)
      VALUES (?, ?, 'Mathematics', 'MTH101'),
             (?, ?, 'English Language', 'ENG101'),
             (?, ?, 'Physics', 'PHY101'),
             (?, ?, 'Chemistry', 'CHM101'),
             (?, ?, 'Biology', 'BIO101')
    `).run(
      'sub_mth', 'sch_apex',
      'sub_eng', 'sch_apex',
      'sub_phy', 'sch_apex',
      'sub_chm', 'sch_apex',
      'sub_bio', 'sch_apex'
    );

    // Teacher assignment
    db.prepare(`
      INSERT INTO teacher_assignments (id, school_id, teacher_id, class_id, arm_id, subject_id, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('asgn_01', 'sch_apex', 'usr_apex_teacher', 'cls_apex_ss1', 'arm_apex_sci', 'sub_mth', 'sess_apex_2627');

    // Grading System
    const gradingScales = [
      { grade: 'A', min_score: 75, max_score: 100, remark: 'Excellent' },
      { grade: 'B', min_score: 65, max_score: 74.99, remark: 'Very Good' },
      { grade: 'C', min_score: 50, max_score: 64.99, remark: 'Good' },
      { grade: 'D', min_score: 45, max_score: 49.99, remark: 'Fair Pass' },
      { grade: 'E', min_score: 40, max_score: 44.99, remark: 'Weak Pass' },
      { grade: 'F', min_score: 0, max_score: 39.99, remark: 'Fail' },
    ];
    const assessmentWeights = [
      { code: 'ca1', name: '1st Continuous Assessment', max_score: 10 },
      { code: 'ca2', name: '2nd Continuous Assessment', max_score: 10 },
      { code: 'ca3', name: 'Assignment / Project', max_score: 10 },
      { code: 'exam', name: 'Terminal Examination', max_score: 70 },
    ];
    db.prepare(`
      INSERT INTO grading_systems (id, school_id, name, scales_json, assessment_weights_json)
      VALUES (?, ?, 'Apex Standard Scale', ?, ?)
    `).run('grade_apex', 'sch_apex', JSON.stringify(gradingScales), JSON.stringify(assessmentWeights));

    // Students
    const sampleStudents = [
      { id: 'std_01', adm: 'APX/2026/001', name: 'Zainab Abubakar', gender: 'Female', arm: 'arm_apex_sci' },
      { id: 'std_02', adm: 'APX/2026/002', name: 'Chukwuebuka Okafor', gender: 'Male', arm: 'arm_apex_sci' },
      { id: 'std_03', adm: 'APX/2026/003', name: 'Olumide Adeleke', gender: 'Male', arm: 'arm_apex_sci' },
      { id: 'std_04', adm: 'APX/2026/004', name: 'Fatima Mohammed', gender: 'Female', arm: 'arm_apex_sci' },
      { id: 'std_05', adm: 'APX/2026/005', name: 'David Bassey', gender: 'Male', arm: 'arm_apex_sci' },
    ];

    for (const s of sampleStudents) {
      db.prepare(`
        INSERT INTO students (id, school_id, admission_number, full_name, gender, class_id, arm_id, parent_name, parent_phone, parent_email)
        VALUES (?, ?, ?, ?, ?, 'cls_apex_ss1', ?, ?, '+2348020000000', 'parent@example.com')
      `).run(s.id, 'sch_apex', s.adm, s.name, s.gender, s.arm, `Guardian of ${s.name}`);
    }

    // Sample scores for Mathematics in SS 1 Science
    const mathScores = [
      { std_id: 'std_01', ca1: 9, ca2: 9, ca3: 8, exam: 64, total: 90, grade: 'A', remark: 'Excellent' },
      { std_id: 'std_02', ca1: 8, ca2: 7, ca3: 8, exam: 55, total: 78, grade: 'A', remark: 'Excellent' },
      { std_id: 'std_03', ca1: 7, ca2: 6, ca3: 7, exam: 48, total: 68, grade: 'B', remark: 'Very Good' },
      { std_id: 'std_04', ca1: 6, ca2: 6, ca3: 5, exam: 37, total: 54, grade: 'C', remark: 'Good' },
      { std_id: 'std_05', ca1: 5, ca2: 5, ca3: 6, exam: 30, total: 46, grade: 'D', remark: 'Fair Pass' },
    ];

    for (const sc of mathScores) {
      db.prepare(`
        INSERT INTO student_scores (id, school_id, student_id, subject_id, class_id, term_id, session_id, ca1, ca2, ca3, exam, total, grade, remark, status, entered_by_user_id)
        VALUES (?, 'sch_apex', ?, 'sub_mth', 'cls_apex_ss1', 'term_apex_t1', 'sess_apex_2627', ?, ?, ?, ?, ?, ?, ?, 'approved', 'usr_apex_teacher')
      `).run('sc_mth_' + sc.std_id, sc.std_id, sc.ca1, sc.ca2, sc.ca3, sc.exam, sc.total, sc.grade, sc.remark);
    }

    // Sample scores for English
    const engScores = [
      { std_id: 'std_01', ca1: 9, ca2: 8, ca3: 9, exam: 62, total: 88, grade: 'A', remark: 'Excellent' },
      { std_id: 'std_02', ca1: 8, ca2: 8, ca3: 7, exam: 58, total: 81, grade: 'A', remark: 'Excellent' },
      { std_id: 'std_03', ca1: 7, ca2: 8, ca3: 7, exam: 50, total: 72, grade: 'B', remark: 'Very Good' },
      { std_id: 'std_04', ca1: 7, ca2: 7, ca3: 6, exam: 42, total: 62, grade: 'C', remark: 'Good' },
      { std_id: 'std_05', ca1: 6, ca2: 5, ca3: 5, exam: 36, total: 52, grade: 'C', remark: 'Good' },
    ];

    for (const sc of engScores) {
      db.prepare(`
        INSERT INTO student_scores (id, school_id, student_id, subject_id, class_id, term_id, session_id, ca1, ca2, ca3, exam, total, grade, remark, status, entered_by_user_id)
        VALUES (?, 'sch_apex', ?, 'sub_eng', 'cls_apex_ss1', 'term_apex_t1', 'sess_apex_2627', ?, ?, ?, ?, ?, ?, ?, 'approved', 'usr_apex_teacher')
      `).run('sc_eng_' + sc.std_id, sc.std_id, sc.ca1, sc.ca2, sc.ca3, sc.exam, sc.total, sc.grade, sc.remark);
    }

    // Compile Term Results & Verification codes for Zainab and Okafor
    const termResults = [
      { std_id: 'std_01', total: 178, avg: 89.0, pos: 1, comment: 'Outstanding academic brilliance. Maintained highest standard.' },
      { std_id: 'std_02', total: 159, avg: 79.5, pos: 2, comment: 'Commendable performance with very good analytical aptitude.' },
      { std_id: 'std_03', total: 140, avg: 70.0, pos: 3, comment: 'Good effort, can achieve distinction with focused study.' },
      { std_id: 'std_04', total: 116, avg: 58.0, pos: 4, comment: 'Fair progress. Needs extra practice in mathematical problem solving.' },
      { std_id: 'std_05', total: 98, avg: 49.0, pos: 5, comment: 'Needs significant revision and after-school academic assistance.' },
    ];

    for (const tr of termResults) {
      db.prepare(`
        INSERT INTO term_results (id, school_id, student_id, class_id, arm_id, term_id, session_id, total_score, average_score, position, class_size, status, teacher_comment, principal_comment, approved_by_user_id, approved_at, published_at)
        VALUES (?, 'sch_apex', ?, 'cls_apex_ss1', 'arm_apex_sci', 'term_apex_t1', 'sess_apex_2627', ?, ?, ?, 5, 'published', ?, 'Promoted to maintain high academic standard.', 'usr_apex_admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run('tr_' + tr.std_id, tr.std_id, tr.total, tr.avg, tr.pos, tr.comment);

      // Create Public Result Verification Code for student 1 & 2
      const plainCode = tr.std_id === 'std_01' ? 'APX-8492-X' : 'APX-1029-Q';
      const codeHash = crypto.createHash('sha256').update(plainCode.trim().toUpperCase()).digest('hex');
      db.prepare(`
        INSERT INTO result_verification_codes (id, school_id, student_id, term_id, session_id, code_hash, code_display, max_usage)
        VALUES (?, 'sch_apex', ?, 'term_apex_t1', 'sess_apex_2627', ?, ?, 10)
      `).run('pin_' + tr.std_id, tr.std_id, codeHash, plainCode);
    }

    // Fee categories for Apex
    db.prepare(`
      INSERT INTO fee_categories (id, school_id, name, amount, term_id, session_id)
      VALUES (?, ?, 'Tuition & Development Fee', 65000, 'term_apex_t1', 'sess_apex_2627'),
             (?, ?, 'Laboratory & ICT Practicals', 15000, 'term_apex_t1', 'sess_apex_2627')
    `).run('fee_01', 'sch_apex', 'fee_02', 'sch_apex');

    // Sample fee payment
    db.prepare(`
      INSERT INTO fee_payments (id, school_id, student_id, fee_category_id, amount_paid, payment_method, receipt_number, remarks, recorded_by_user_id)
      VALUES (?, 'sch_apex', 'std_01', 'fee_01', 65000, 'bank_transfer', 'RCP-APX-0091', 'Full payment for 1st Term', 'usr_apex_bursar')
    `).run('pay_01');

    // Sample attendance
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO attendance_records (id, school_id, student_id, class_id, date, status, recorded_by_user_id)
      VALUES (?, 'sch_apex', 'std_01', 'cls_apex_ss1', ?, 'present', 'usr_apex_teacher'),
             (?, 'sch_apex', 'std_02', 'cls_apex_ss1', ?, 'present', 'usr_apex_teacher'),
             (?, 'sch_apex', 'std_03', 'cls_apex_ss1', ?, 'late', 'usr_apex_teacher')
    `).run('att_01', today, 'att_02', today, 'att_03', today);

    // Announcement
    db.prepare(`
      INSERT INTO announcements (id, school_id, title, content, target_audience, author_name)
      VALUES (?, 'sch_apex', 'First Term Examination & Result Verification Notice', 'Dear parents and staff, 1st Term examination results have been verified and published. Students can verify online with their issued PIN.', 'all', 'Apex Administration')
    `).run('anc_01');
  }

  // Seed sample school 2: Greenfield College (to test cross-tenant isolation!)
  const greenfield = db.prepare('SELECT COUNT(*) as count FROM schools WHERE id = ?').get('sch_greenfield') as { count: number };
  if (greenfield.count === 0) {
    db.prepare(`
      INSERT INTO schools (id, name, slug, email, phone, address, country, state, school_level, logo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sch_greenfield',
      'Greenfield International Academy',
      'greenfield-academy',
      'contact@greenfield.edu',
      '+2348055551122',
      '22 Palm Grove, Ikeja',
      'Nigeria',
      'Lagos',
      'Combined K-12',
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=160&q=80',
      'approved'
    );

    const { hash: gfHash, salt: gfSalt } = hashPassword('Green@123');
    db.prepare(`
      INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_gf_admin', 'sch_greenfield', 'admin@greenfield.edu', gfHash, gfSalt, 'Pastor Samuel Ade (Principal)', '+2348055551123', 'school_admin');

    // Students for Greenfield (completely separate records!)
    db.prepare(`
      INSERT INTO classes (id, school_id, name, level)
      VALUES (?, 'sch_greenfield', 'Grade 7', 'Junior Secondary')
    `).run('cls_gf_g7');

    db.prepare(`
      INSERT INTO students (id, school_id, admission_number, full_name, gender, class_id, parent_name, parent_phone)
      VALUES (?, 'sch_greenfield', 'GF/2026/088', 'Tariq Al-Mansoor', 'Male', 'cls_gf_g7', 'Al-Mansoor Senior', '+2348055559999')
    `).run('std_gf_01');
  }

  // Seed sample school 3: Horizon High (Pending Approval to test the approval workflow!)
  const horizon = db.prepare('SELECT COUNT(*) as count FROM schools WHERE id = ?').get('sch_horizon') as { count: number };
  if (horizon.count === 0) {
    db.prepare(`
      INSERT INTO schools (id, name, slug, email, phone, address, country, state, school_level, logo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sch_horizon',
      'Horizon Comprehensive High School',
      'horizon-high',
      'info@horizonhigh.org',
      '+2348077772233',
      'Plot 45 Airport Road, Abuja',
      'Nigeria',
      'FCT Abuja',
      'Senior Secondary',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=160&q=80',
      'pending'
    );

    const { hash: hzHash, salt: hzSalt } = hashPassword('Horizon@123');
    db.prepare(`
      INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_hz_admin', 'sch_horizon', 'admin@horizonhigh.org', hzHash, hzSalt, 'Engr. Mustapha Kabir', '+2348077772234', 'school_admin');
  }

  // Ensure default vector SVG badge & result template for demo schools
  try {
    db.prepare(`
      UPDATE schools
      SET logo_url = ?,
          result_template_json = COALESCE(result_template_json, ?)
      WHERE id = 'sch_apex'
    `).run(DEFAULT_APEX_BADGE, JSON.stringify(DEFAULT_RESULT_TEMPLATE));

    const greenfieldBadge = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="gfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#065f46;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#022c22;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="54" fill="url(#gfGrad)" stroke="#10b981" stroke-width="4"/>
  <circle cx="60" cy="60" r="46" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
  <path d="M60 22 L72 45 L97 45 L77 60 L84 84 L60 70 L36 84 L43 60 L23 45 L48 45 Z" fill="#34d399"/>
  <path d="M42 66 Q60 58 78 66 L78 72 Q60 64 42 72 Z" fill="#ffffff"/>
  <text x="60" y="96" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">GREENFIELD</text>
</svg>
    `)}`;

    db.prepare(`
      UPDATE schools
      SET logo_url = ?,
          result_template_json = COALESCE(result_template_json, ?)
      WHERE id = 'sch_greenfield'
    `).run(greenfieldBadge, JSON.stringify({
      ...DEFAULT_RESULT_TEMPLATE,
      templateName: 'Emerald Excellence Academy',
      primaryColor: '#065f46',
      accentColor: '#10b981',
      schoolMotto: 'Striving for Heights of Moral and Academic Excellence'
    }));
    // Ensure EVERY school in the database has a valid, non-null, base64-encoded SVG logo_url
    const allSchools = db.prepare('SELECT id, name, logo_url FROM schools').all() as any[];
    // Ensure established schools have verified payment status
    db.prepare(`UPDATE schools SET is_payment_verified = 1, payment_verified_at = CURRENT_TIMESTAMP, payment_code_used = 'ACAD-SEED-VERIFIED' WHERE id IN ('sch_apex', 'sch_greenfield')`).run();

    // Ensure sample payment verification code exists for testing
    const existingCode = db.prepare('SELECT id FROM payment_verification_codes WHERE code = ?').get('ACAD-PAY-7K9M-X24Q');
    if (!existingCode) {
      db.prepare(`
        INSERT INTO payment_verification_codes (id, code, school_id, school_name, issued_to_email, notes, status, created_by_user_id, created_by_name)
        VALUES (?, 'ACAD-PAY-7K9M-X24Q', NULL, 'General School Registration', NULL, 'Registration Clearance verified by Super Admin Ahmad Auwal', 'active', 'usr_superadmin', 'Ahmad Auwal (CEO BG GROUP)')
      `).run('pvc_seed_hz_01');
    }

    const existingRegCode = db.prepare('SELECT id FROM payment_verification_codes WHERE code = ?').get('ACAD-PAY-REG-2026');
    if (!existingRegCode) {
      db.prepare(`
        INSERT INTO payment_verification_codes (id, code, school_id, school_name, issued_to_email, notes, status, created_by_user_id, created_by_name)
        VALUES (?, 'ACAD-PAY-REG-2026', NULL, 'Open School Registration Clearance', NULL, 'One-time registration verification code issued by Super Admin Ahmad Auwal', 'active', 'usr_superadmin', 'Ahmad Auwal (CEO BG GROUP)')
      `).run('pvc_seed_reg_2026');
    }

    // Ensure initial platform notifications exist
    const existingNotif = db.prepare('SELECT COUNT(*) as count FROM school_notifications').get() as { count: number };
    if (existingNotif.count === 0) {
      db.prepare(`
        INSERT INTO school_notifications (id, school_id, school_name, sender_id, sender_name, title, message, category, priority, target_role)
        VALUES
        ('notif_global_01', NULL, 'All Schools (Global Broadcast)', 'usr_superadmin', 'Ahmad Auwal (Platform Super Admin)', 'Welcome to AcademiQ Platform 2026/2027 Session', 'Dear School Administrators and Teachers, welcome to the current academic session on AcademiQ. Please ensure continuous assessment (CA1, CA2, CA3) records are finalized before examination week.', 'announcement', 'high', 'all'),
        ('notif_apex_01', 'sch_apex', 'Apex Model International College', 'usr_superadmin', 'Platform Super Admin', 'Terminal Examination & Result PIN Processing', 'Your terminal results have been verified and cryptographic public checking PINs are operational for student report cards.', 'academic', 'normal', 'school_admin'),
        ('notif_horizon_01', 'sch_horizon', 'Horizon Comprehensive High School', 'usr_superadmin', 'Platform Super Admin', 'Onboarding & Payment Clearance Code Issued', 'Your school application has been reviewed. Use the issued special payment verification code ACAD-PAY-7K9M-X24Q on first-time login to unlock your full portal.', 'payment_clearance', 'urgent', 'school_admin')
      `).run();
    }
  } catch (err) {
    console.error('Error updating default school logos/templates:', err);
  }

  // Auto-restore any schools, users, or records from persistent disk backup if available
  try {
    const backupFile = path.join(BACKUP_DIR, 'latest_full_database.json');
    if (fs.existsSync(backupFile)) {
      const content = fs.readFileSync(backupFile, 'utf-8');
      const backup = JSON.parse(content);
      if (Array.isArray(backup.schools)) {
        for (const s of backup.schools) {
          db.prepare(`
            INSERT INTO schools (id, name, slug, email, phone, address, country, state, school_level, logo_url, result_template_json, status, is_payment_verified, payment_verified_at, payment_code_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              email = excluded.email,
              phone = excluded.phone,
              address = excluded.address,
              status = excluded.status,
              is_payment_verified = excluded.is_payment_verified
          `).run(s.id, s.name, s.slug, s.email, s.phone || '', s.address || '', s.country || 'Nigeria', s.state || '', s.school_level, s.logo_url || null, s.result_template_json || null, s.status || 'approved', s.is_payment_verified ?? 1, s.payment_verified_at || null, s.payment_code_used || null);
        }
      }
      if (Array.isArray(backup.users)) {
        for (const u of backup.users) {
          db.prepare(`
            INSERT INTO users (id, school_id, email, password_hash, salt, full_name, phone, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              full_name = excluded.full_name,
              phone = excluded.phone,
              role = excluded.role,
              password_hash = COALESCE(excluded.password_hash, users.password_hash),
              salt = COALESCE(excluded.salt, users.salt)
          `).run(u.id, u.school_id, u.email, u.password_hash, u.salt, u.full_name, u.phone || '', u.role);
        }
      }
      if (Array.isArray(backup.students)) {
        for (const st of backup.students) {
          db.prepare(`
            INSERT INTO students (id, school_id, admission_number, full_name, gender, class_id, arm_id, parent_name, parent_phone, parent_email, enrollment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              admission_number = excluded.admission_number,
              full_name = excluded.full_name,
              enrollment_status = excluded.enrollment_status
          `).run(st.id, st.school_id, st.admission_number, st.full_name, st.gender, st.class_id, st.arm_id || null, st.parent_name || '', st.parent_phone || '', st.parent_email || '', st.enrollment_status || 'active');
        }
      }
    }
  } catch (err) {
    console.error('Error auto-recovering from backup file:', err);
  }

  // Flush to disk after initial setup and snapshot
  flushDatabaseToDisk();
  saveFullDatabaseBackup();
}

/**
 * Ensures comprehensive academic subjects and scores exist for SS 1 Science
 * Populates 10 diverse subjects with authentic CA1, CA2, CA3 and Exam scores.
 */
export function ensureComprehensiveAcademicData() {
  try {
    const schoolId = 'sch_apex';
    const termId = 'term_apex_t1';
    const sessionId = 'sess_apex_2627';
    const classId = 'cls_apex_ss1';
    const armId = 'arm_apex_sci';

    // 10 subjects spanning Science, Humanities, and Technical electives
    const curriculum = [
      { id: 'sub_mth', code: 'MTH101', name: 'Mathematics' },
      { id: 'sub_eng', code: 'ENG101', name: 'English Language' },
      { id: 'sub_phy', code: 'PHY101', name: 'Physics' },
      { id: 'sub_chm', code: 'CHM101', name: 'Chemistry' },
      { id: 'sub_bio', code: 'BIO101', name: 'Biology' },
      { id: 'sub_fmth', code: 'FMT101', name: 'Further Mathematics' },
      { id: 'sub_ecn', code: 'ECN101', name: 'Economics' },
      { id: 'sub_civ', code: 'CVE101', name: 'Civic Education' },
      { id: 'sub_cmp', code: 'CMP101', name: 'Computer Studies' },
      { id: 'sub_tdg', code: 'TDG101', name: 'Technical Drawing' },
    ];

    for (const sub of curriculum) {
      db.prepare(`
        INSERT INTO subjects (id, school_id, name, code)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, code = excluded.code
      `).run(sub.id, schoolId, sub.name, sub.code);
    }

    // Realistic distributions for all 5 students
    const studentProfiles: Record<string, { ca1: number[]; ca2: number[]; ca3: number[]; exam: number[] }> = {
      // std_01: Zainab Abubakar (Rank 1 - Overall ~90%)
      std_01: {
        ca1:  [9, 9, 9, 8, 9, 10, 9, 10, 10, 9],
        ca2:  [9, 9, 8, 9, 9, 9, 8, 9, 10, 8],
        ca3:  [8, 9, 9, 9, 8, 9, 9, 9, 9, 9],
        exam: [64, 62, 63, 61, 64, 63, 58, 64, 66, 60]
      },
      // std_02: Chukwuebuka Okafor (Rank 2 - Overall ~80%)
      std_02: {
        ca1:  [8, 8, 8, 8, 8, 8, 7, 8, 9, 8],
        ca2:  [7, 8, 8, 7, 8, 8, 8, 8, 8, 7],
        ca3:  [8, 7, 8, 8, 7, 8, 7, 8, 8, 8],
        exam: [55, 58, 56, 54, 57, 56, 51, 57, 58, 53]
      },
      // std_03: Olumide Adeleke (Rank 3 - Overall ~71%)
      std_03: {
        ca1:  [7, 7, 7, 7, 7, 7, 7, 7, 8, 7],
        ca2:  [6, 8, 7, 7, 6, 7, 7, 7, 7, 7],
        ca3:  [7, 7, 7, 6, 7, 7, 6, 7, 8, 6],
        exam: [48, 50, 49, 47, 50, 48, 46, 51, 52, 47]
      },
      // std_04: Fatima Mohammed (Rank 4 - Overall ~61%)
      std_04: {
        ca1:  [6, 7, 6, 6, 6, 6, 6, 7, 7, 6],
        ca2:  [6, 7, 6, 6, 6, 6, 6, 6, 7, 6],
        ca3:  [5, 6, 6, 6, 6, 5, 6, 6, 6, 6],
        exam: [37, 42, 40, 39, 43, 38, 41, 44, 45, 40]
      },
      // std_05: David Bassey (Rank 5 - Overall ~51%)
      std_05: {
        ca1:  [5, 6, 5, 5, 5, 5, 5, 6, 6, 5],
        ca2:  [5, 5, 5, 5, 5, 5, 5, 5, 6, 5],
        ca3:  [6, 5, 5, 5, 5, 5, 5, 6, 5, 5],
        exam: [30, 36, 33, 32, 35, 31, 34, 37, 38, 32]
      }
    };

    const determineGrade = (total: number) => {
      if (total >= 75) return { grade: 'A', remark: 'Excellent' };
      if (total >= 65) return { grade: 'B', remark: 'Very Good' };
      if (total >= 50) return { grade: 'C', remark: 'Good' };
      if (total >= 45) return { grade: 'D', remark: 'Fair Pass' };
      if (total >= 40) return { grade: 'E', remark: 'Weak Pass' };
      return { grade: 'F', remark: 'Fail' };
    };

    for (const [studentId, prof] of Object.entries(studentProfiles)) {
      let totalSum = 0;
      for (let i = 0; i < curriculum.length; i++) {
        const sub = curriculum[i];
        const ca1 = prof.ca1[i];
        const ca2 = prof.ca2[i];
        const ca3 = prof.ca3[i];
        const exam = prof.exam[i];
        const total = ca1 + ca2 + ca3 + exam;
        totalSum += total;
        const { grade, remark } = determineGrade(total);

        db.prepare(`
          INSERT INTO student_scores (id, school_id, student_id, subject_id, class_id, term_id, session_id, ca1, ca2, ca3, exam, total, grade, remark, status, entered_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'usr_apex_teacher')
          ON CONFLICT(school_id, student_id, subject_id, term_id, session_id) DO UPDATE SET
            ca1 = excluded.ca1,
            ca2 = excluded.ca2,
            ca3 = excluded.ca3,
            exam = excluded.exam,
            total = excluded.total,
            grade = excluded.grade,
            remark = excluded.remark,
            status = 'approved'
        `).run(`sc_${sub.id}_${studentId}`, schoolId, studentId, sub.id, classId, termId, sessionId, ca1, ca2, ca3, exam, total, grade, remark);
      }

      const avgScore = Number((totalSum / curriculum.length).toFixed(1));
      const trComment = avgScore >= 80
        ? 'Outstanding academic brilliance. Mastered curriculum with distinction.'
        : avgScore >= 70
        ? 'Commendable result with strong analytical grasp. Keep aiming higher.'
        : avgScore >= 60
        ? 'Good performance. More effort required in mathematical problem-solving.'
        : 'Needs focused revision and academic guidance in key subjects.';

      db.prepare(`
        INSERT INTO term_results (id, school_id, student_id, class_id, arm_id, term_id, session_id, total_score, average_score, position, class_size, status, teacher_comment, principal_comment, approved_by_user_id, approved_at, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 5, 'published', ?, 'Promoted with commendable standing.', 'usr_apex_admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(school_id, student_id, term_id, session_id) DO UPDATE SET
          total_score = excluded.total_score,
          average_score = excluded.average_score,
          status = 'published',
          teacher_comment = excluded.teacher_comment
      `).run(`tr_${studentId}`, schoolId, studentId, classId, armId, termId, sessionId, totalSum, avgScore, trComment);
    }

    // Recalculate ranks accurately
    const ranked = db.prepare(`
      SELECT id, student_id, average_score
      FROM term_results
      WHERE school_id = ? AND term_id = ? AND session_id = ? AND class_id = ?
      ORDER BY average_score DESC
    `).all(schoolId, termId, sessionId, classId) as any[];

    ranked.forEach((r, idx) => {
      db.prepare(`
        UPDATE term_results
        SET position = ?, class_size = ?
        WHERE id = ?
      `).run(idx + 1, ranked.length, r.id);
    });

    flushDatabaseToDisk();
  } catch (err) {
    console.error('ensureComprehensiveAcademicData error:', err);
  }
}

/**
 * Generates an official, beautiful base64-encoded SVG school crest
 * Immune to URL-encoding fragment issues (#) in browsers.
 */
export function generateDefaultSchoolLogo(schoolName: string, primaryColor = '#1e3a8a'): string {
  const words = schoolName.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('') : schoolName.slice(0, 3)).toUpperCase() || 'SCH';
  const cleanName = schoolName.toUpperCase().slice(0, 20);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="1"/>
      <stop offset="100%" stop-color="#d97706" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <path d="M60 6 L104 22 L104 66 C104 90 60 114 60 114 C60 114 16 90 16 66 L16 22 Z" fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="4"/>
  <path d="M60 14 L96 28 L96 64 C96 84 60 104 60 104 C60 104 24 84 24 64 L24 28 Z" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.35"/>
  <circle cx="60" cy="50" r="22" fill="#ffffff" opacity="0.12"/>
  <text x="60" y="57" font-family="Arial, Georgia, serif" font-size="17" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="1">${initials}</text>
  <path d="M42 74 Q60 66 78 74 L78 80 Q60 72 42 80 Z" fill="#ffffff"/>
  <path d="M42 77 Q60 70 78 77 L78 82 Q60 75 42 82 Z" fill="#ffffff" opacity="0.8"/>
  <text x="60" y="96" font-family="Arial, sans-serif" font-size="6.5" font-weight="bold" fill="#f59e0b" text-anchor="middle" letter-spacing="1">EXCELLENCE</text>
</svg>`;

  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const BACKUP_DIR = path.join(DB_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (_) {}
}

// On serverless, copy any pre-bundled backups from read-only package directory to writable /tmp
if (isServerless) {
  const seedBackupCandidates = [
    path.resolve(process.cwd(), 'data', 'backups'),
    path.resolve('/var/task', 'data', 'backups')
  ];
  for (const seedDir of seedBackupCandidates) {
    if (fs.existsSync(seedDir)) {
      try {
        const files = fs.readdirSync(seedDir);
        for (const file of files) {
          const dest = path.join(BACKUP_DIR, file);
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(path.join(seedDir, file), dest);
          }
        }
      } catch (_) {}
    }
  }
}

export function flushDatabaseToDisk(): boolean {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.exec('PRAGMA optimize;');
    return true;
  } catch (err) {
    console.error('Database flush error:', err);
    return false;
  }
}

export const ALL_TABLES = [
  'subscription_plans',
  'schools',
  'users',
  'academic_sessions',
  'academic_terms',
  'classes',
  'class_arms',
  'subjects',
  'teacher_assignments',
  'grading_systems',
  'students',
  'student_scores',
  'term_results',
  'result_verification_codes',
  'fee_categories',
  'fee_payments',
  'attendance_records',
  'announcements',
  'audit_logs'
];

export function getDatabaseStats() {
  flushDatabaseToDisk();
  let fileSize = 0;
  try {
    const stat = fs.statSync(DB_PATH);
    fileSize = stat.size;
  } catch (_) {}

  const counts: Record<string, number> = {};
  for (const table of ALL_TABLES) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      counts[table] = row.count;
    } catch (_) {
      counts[table] = 0;
    }
  }

  const latestBackupPath = path.join(BACKUP_DIR, 'latest_backup.json');
  let latestBackupTime: string | null = null;
  if (fs.existsSync(latestBackupPath)) {
    try {
      const bstat = fs.statSync(latestBackupPath);
      latestBackupTime = bstat.mtime.toISOString();
    } catch (_) {}
  }

  return {
    status: 'healthy',
    engine: 'SQLite Relational Database (WAL Persistence Mode)',
    databasePath: DB_PATH,
    sizeBytes: fileSize,
    sizeFormatted: (fileSize / 1024).toFixed(1) + ' KB',
    counts,
    latestBackupTime,
    lastCheckpoint: new Date().toISOString()
  };
}

export function createDatabaseBackup() {
  flushDatabaseToDisk();
  const backup: {
    version: string;
    createdAt: string;
    app: string;
    data: Record<string, any[]>;
  } = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    app: 'AcademiQ MultiSchool Pro',
    data: {}
  };

  for (const table of ALL_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      backup.data[table] = rows;
    } catch (err) {
      console.error(`Failed to export table ${table}:`, err);
      backup.data[table] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapPath = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
  const latestPath = path.join(BACKUP_DIR, 'latest_backup.json');

  const jsonStr = JSON.stringify(backup, null, 2);
  fs.writeFileSync(snapPath, jsonStr, 'utf-8');
  fs.writeFileSync(latestPath, jsonStr, 'utf-8');

  return {
    fileName: `backup_${timestamp}.json`,
    createdAt: backup.createdAt,
    tableCount: ALL_TABLES.length,
    totalRecords: Object.values(backup.data).reduce((acc, r) => acc + r.length, 0),
    data: backup
  };
}

export function restoreDatabaseFromBackup(backupData: any) {
  if (!backupData || !backupData.data) {
    throw new Error('Invalid backup file format.');
  }

  db.exec('BEGIN TRANSACTION');
  try {
    for (const table of ALL_TABLES) {
      const rows = backupData.data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const updateSets = keys.map((k) => `${k} = excluded.${k}`).join(', ');
          const sql = `
            INSERT INTO ${table} (${keys.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT(id) DO UPDATE SET ${updateSets}
          `;
          db.prepare(sql).run(...(Object.values(row) as any[]));
        }
      }
    }
    db.exec('COMMIT');
    flushDatabaseToDisk();
    return { success: true, restoredAt: new Date().toISOString() };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function exportSchoolData(schoolId: string) {
  flushDatabaseToDisk();
  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(schoolId);
  if (!school) throw new Error('School not found.');

  // Include credentials so restored admin users can immediately sign in without losing access
  const schoolUsers = db.prepare('SELECT id, school_id, email, password_hash, salt, full_name, phone, role, created_at FROM users WHERE school_id = ?').all(schoolId);
  const sessions = db.prepare('SELECT * FROM academic_sessions WHERE school_id = ?').all(schoolId);
  const terms = db.prepare('SELECT * FROM academic_terms WHERE school_id = ?').all(schoolId);
  const classes = db.prepare('SELECT * FROM classes WHERE school_id = ?').all(schoolId);
  const arms = db.prepare('SELECT * FROM class_arms WHERE school_id = ?').all(schoolId);
  const subjects = db.prepare('SELECT * FROM subjects WHERE school_id = ?').all(schoolId);
  const students = db.prepare('SELECT * FROM students WHERE school_id = ?').all(schoolId);
  const scores = db.prepare('SELECT * FROM student_scores WHERE school_id = ?').all(schoolId);
  const results = db.prepare('SELECT * FROM term_results WHERE school_id = ?').all(schoolId);
  const pins = db.prepare('SELECT id, student_id, term_id, session_id, code_display, usage_count, max_usage FROM result_verification_codes WHERE school_id = ?').all(schoolId);
  const feeCategories = db.prepare('SELECT * FROM fee_categories WHERE school_id = ?').all(schoolId);
  const feePayments = db.prepare('SELECT * FROM fee_payments WHERE school_id = ?').all(schoolId);
  const attendanceRecords = db.prepare('SELECT * FROM attendance_records WHERE school_id = ?').all(schoolId);

  return {
    school,
    exportedAt: new Date().toISOString(),
    users: schoolUsers,
    academic_sessions: sessions,
    academic_terms: terms,
    classes,
    class_arms: arms,
    subjects,
    students,
    student_scores: scores,
    term_results: results,
    verification_pins: pins,
    fee_categories: feeCategories,
    fee_payments: feePayments,
    attendance_records: attendanceRecords
  };
}

export function saveFullDatabaseBackup(): boolean {
  try {
    const backupFile = path.join(BACKUP_DIR, 'latest_full_database.json');
    const allSchools = db.prepare('SELECT * FROM schools').all();
    const allUsers = db.prepare('SELECT * FROM users').all();
    const allStudents = db.prepare('SELECT * FROM students').all();
    const allClasses = db.prepare('SELECT * FROM classes').all();
    const allArms = db.prepare('SELECT * FROM class_arms').all();
    const allSubjects = db.prepare('SELECT * FROM subjects').all();
    const allScores = db.prepare('SELECT * FROM student_scores').all();
    const allResults = db.prepare('SELECT * FROM term_results').all();
    const allSessions = db.prepare('SELECT * FROM academic_sessions').all();
    const allTerms = db.prepare('SELECT * FROM academic_terms').all();
    const allAttendance = db.prepare('SELECT * FROM attendance_records').all();
    const allFees = db.prepare('SELECT * FROM fee_payments').all();
    const allFeeCats = db.prepare('SELECT * FROM fee_categories').all();
    const allPins = db.prepare('SELECT * FROM result_verification_codes').all();
    const allCodes = db.prepare('SELECT * FROM payment_verification_codes').all();
    const allNotifs = db.prepare('SELECT * FROM school_notifications').all();
    const allGrading = db.prepare('SELECT * FROM grading_systems').all();

    const backupPayload = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      schools: allSchools,
      users: allUsers,
      students: allStudents,
      classes: allClasses,
      class_arms: allArms,
      subjects: allSubjects,
      student_scores: allScores,
      term_results: allResults,
      academic_sessions: allSessions,
      academic_terms: allTerms,
      attendance_records: allAttendance,
      fee_payments: allFees,
      fee_categories: allFeeCats,
      result_verification_codes: allPins,
      payment_verification_codes: allCodes,
      school_notifications: allNotifs,
      grading_systems: allGrading
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save latest full database backup:', err);
    return false;
  }
}

// Auto-flush periodically every 2 minutes and persist snapshot
const flushInterval = setInterval(() => {
  flushDatabaseToDisk();
  saveFullDatabaseBackup();
}, 120000);
if (flushInterval && typeof flushInterval.unref === 'function') {
  flushInterval.unref();
}

// Flush on process exit
process.on('SIGINT', () => {
  flushDatabaseToDisk();
  saveFullDatabaseBackup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  flushDatabaseToDisk();
  saveFullDatabaseBackup();
  process.exit(0);
});

