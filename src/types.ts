export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'bursar' | 'student_parent';
export type SchoolStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id: string | null;
  school_name?: string | null;
  school_status?: SchoolStatus | null;
  school_logo?: string | null;
  phone?: string;
  is_payment_verified?: number | boolean;
  payment_verified_at?: string | null;
  payment_code_used?: string | null;
  is_impersonating?: boolean;
  impersonated_by_id?: string;
  impersonated_by_email?: string;
}

export interface PaymentVerificationCode {
  id: string;
  code: string;
  school_id?: string | null;
  school_name?: string | null;
  issued_to_email?: string | null;
  notes?: string | null;
  status: 'active' | 'redeemed' | 'revoked';
  created_by_user_id: string;
  created_by_name: string;
  redeemed_by_user_id?: string | null;
  redeemed_by_email?: string | null;
  redeemed_at?: string | null;
  created_at: string;
}

export interface SchoolNotification {
  id: string;
  school_id?: string | null;
  school_name?: string | null;
  sender_id?: string | null;
  sender_name: string;
  title: string;
  message: string;
  category: 'announcement' | 'payment_clearance' | 'administrative' | 'urgent' | 'academic';
  priority: 'normal' | 'high' | 'urgent';
  target_role: string;
  created_at: string;
  is_read?: boolean;
  read_at?: string | null;
}

export interface ResultTemplate {
  templateName: string;
  headerLayout: 'crest_center' | 'badge_left' | 'dual_crest' | 'modern_banner';
  tableStyle: 'classic_bordered' | 'modern_clean' | 'waec_grid' | 'cambridge_compact';
  primaryColor: string;
  accentColor: string;
  showWatermark: boolean;
  watermarkOpacity?: number;
  showStudentPhoto: boolean;
  showAffectiveDomain: boolean;
  showPsychomotorDomain?: boolean;
  showPsychomotor?: boolean;
  showGradingScaleTable: boolean;
  showPrincipalStamp: boolean;
  showStamp?: boolean;
  showPositions?: boolean;
  schoolMotto?: string;
  customHeaderNote?: string;
  fontFamily?: 'serif' | 'sans';
  detectedFeatures?: string[];
  affectiveTraits?: Array<{ trait: string; score: number }>;
  psychomotorSkills?: Array<{ skill: string; score: number }>;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  country: string;
  state?: string;
  school_level: string;
  logo_url?: string;
  result_template_json?: string;
  template?: ResultTemplate;
  status: SchoolStatus;
  is_payment_verified?: number;
  payment_verified_at?: string | null;
  payment_code_used?: string | null;
  active_payment_code?: string | null;
  rejection_reason?: string;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
  subscription_status?: string;
  subscription_expiry?: string;
  plan_name?: string;
  student_count?: number;
  teacher_count?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_interval: string;
  max_students: number;
  max_staff: number;
  features_json: string;
  is_active: number;
}

export interface AcademicSession {
  id: string;
  school_id: string;
  name: string;
  is_current: number;
  start_date?: string;
  end_date?: string;
}

export interface AcademicTerm {
  id: string;
  school_id: string;
  session_id: string;
  name: string;
  is_current: number;
  start_date?: string;
  end_date?: string;
  next_term_resumption?: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  level: string;
}

export interface ClassArm {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code?: string;
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  full_name: string;
  gender: 'Male' | 'Female';
  date_of_birth?: string;
  class_id: string;
  class_name?: string;
  arm_id?: string;
  arm_name?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  address?: string;
  photo_url?: string;
  enrollment_status: string;
  created_at: string;
}

export interface ScoreRow {
  id?: string | null;
  student_id: string;
  admission_number: string;
  full_name: string;
  ca1: number;
  ca2: number;
  ca3: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  status: string;
  teacher_comment?: string;
}

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

export interface VerifiedResult {
  school_name: string;
  school_logo?: string;
  school_address?: string;
  school_email?: string;
  school_phone?: string;
  template?: ResultTemplate;
  student_name: string;
  admission_number: string;
  gender: string;
  class_name: string;
  term_name: string;
  session_name: string;
  next_term_resumption?: string;
  total_score: number;
  average_score: number;
  position: number;
  class_size: number;
  teacher_comment?: string;
  principal_comment?: string;
  published_at?: string;
  scores: Array<{
    subject_id: string;
    subject_name: string;
    subject_code?: string;
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
    total: number;
    grade: string;
    remark: string;
  }>;
  grading_scale: GradingScale[];
  assessment_weights?: AssessmentWeight[];
  attendance?: {
    days_present: number;
    days_absent: number;
    days_late?: number;
    total_school_days: number;
  };
  affective_traits?: Array<{ trait: string; score: number }>;
  psychomotor_skills?: Array<{ skill: string; score: number }>;
  activities?: {
    behavioural: Array<{ trait: string; grade: string; remark: string }>;
    psychomotor: Array<{ skill: string; grade: string; remark: string }>;
  };
  pin_usage_remaining?: number;
}
