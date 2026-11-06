import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Award,
  Layers,
  Plus,
  CheckCircle2,
  Printer,
  Download,
  KeyRound,
  FileText,
  DollarSign,
  Search,
  Filter,
  Eye,
  Settings,
  ArrowLeft,
  Home,
  Database,
  Upload,
  Image,
  Palette,
  Sparkles,
  Check,
  Trash2,
  Stamp,
  Shield,
  ShieldCheck,
  RefreshCw,
  Calculator,
  Edit3,
  Sliders,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  FileCheck,
  UserPlus,
  Save,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRESET_BADGES } from './PublicLanding';
import { ResultTemplate, ScoreRow } from '../types';
import { syncSchoolToFirestore, getFirebaseSyncStatus, restoreSchoolFromFirestore, CloudSyncStatus } from '../utils/firebaseSync';
import { PWAInstallButton } from './PWAInstallButton';
import { BulkCSVImportModal } from './BulkCSVImportModal';
import { BulkExportModal, ExportTabType } from './BulkExportModal';

interface SchoolAdminDashboardProps {
  onOpenReportCard: (studentId: string) => void;
  onOpenBroadsheet: (classId: string, termId: string, sessionId: string) => void;
}

export const SchoolAdminDashboard: React.FC<SchoolAdminDashboardProps> = ({
  onOpenReportCard,
  onOpenBroadsheet,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'template' | 'sessions' | 'classes' | 'subjects' | 'students' | 'grading' | 'results' | 'pins' | 'finance' | 'profile' | 'attendance'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [arms, setArms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [grading, setGrading] = useState<any>(null);

  // Result Template & Badge State
  const [template, setTemplate] = useState<ResultTemplate>({
    templateName: 'Standard Academic Layout',
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
  });
  const [schoolBadge, setSchoolBadge] = useState<string>('');
  const [sampleImage, setSampleImage] = useState<string | null>(null);
  const [sampleAnalyzing, setSampleAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ detectedFeatures: string[]; message: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);

  // Firebase Cloud Persistence & Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncingToCloud, setSyncingToCloud] = useState(false);
  const [restoringFromCloud, setRestoringFromCloud] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

  // Filters & Form modals
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [showAddArmModal, setShowAddArmModal] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [showBulkCSVModal, setShowBulkCSVModal] = useState(false);
  const [bulkCSVType, setBulkCSVType] = useState<'students' | 'grades'>('students');
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [bulkExportTab, setBulkExportTab] = useState<ExportTabType>('students');

  // Edit Modals State
  const [editingClass, setEditingClass] = useState<{ id: string; name: string; level: string } | null>(null);
  const [showEditClassModal, setShowEditClassModal] = useState(false);

  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string; code: string } | null>(null);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);

  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    admission_number: string;
    full_name: string;
    gender: string;
    date_of_birth?: string;
    enrollment_status?: string;
    class_id: string;
    arm_id: string;
    parent_name?: string;
    parent_phone?: string;
    parent_email?: string;
    address?: string;
  } | null>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);

  // Assessment weights editing state
  const [customWeights, setCustomWeights] = useState<any[]>([]);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsSuccessMsg, setWeightsSuccessMsg] = useState<string | null>(null);

  // Forms
  const [newStudent, setNewStudent] = useState({
    admission_number: '',
    full_name: '',
    gender: 'Male',
    class_id: '',
    arm_id: '',
    parent_name: '',
    parent_phone: '',
  });

  const [newClass, setNewClass] = useState({ name: '', level: 'Senior Secondary' });
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });
  const [newSession, setNewSession] = useState({ name: '2026/2027', is_current: true });
  const [newTerm, setNewTerm] = useState({ session_id: '', name: 'First Term', is_current: true, next_term_resumption: '' });
  const [newArm, setNewArm] = useState({ class_id: '', name: '' });

  // RESULT MANAGEMENT CENTRE - STATE
  const [resultSubTab, setResultSubTab] = useState<'marks' | 'activities' | 'compile' | 'sample' | 'cards'>('marks');
  const [scoreClassId, setScoreClassId] = useState('');
  const [scoreArmId, setScoreArmId] = useState('');
  const [scoreSubjectId, setScoreSubjectId] = useState('');
  const [scoreTermId, setScoreTermId] = useState('');
  const [scoreSessionId, setScoreSessionId] = useState('');
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [broadsheetData, setBroadsheetData] = useState<any | null>(null);
  const [broadsheetLoading, setBroadsheetLoading] = useState(false);

  // Admin activities state
  const [adminActivities, setAdminActivities] = useState<any[]>([]);
  const [adminActivitiesLoading, setAdminActivitiesLoading] = useState(false);
  const [adminActivitiesSaving, setAdminActivitiesSaving] = useState(false);
  const [adminActivitiesAutomarking, setAdminActivitiesAutomarking] = useState(false);

  const loadAdminActivities = async (classId?: string, armId?: string, termId?: string, sessionId?: string) => {
    const cId = classId || scoreClassId || classes[0]?.id;
    const tId = termId || scoreTermId || terms[0]?.id;
    const sessId = sessionId || scoreSessionId || sessions[0]?.id;
    if (!cId || !tId || !sessId) return;

    setAdminActivitiesLoading(true);
    try {
      const data = await apiRequest(`/api/teacher/activities?class_id=${cId}&arm_id=${armId || scoreArmId || ''}&term_id=${tId}&session_id=${sessId}`);
      setAdminActivities(data.activities || []);
    } catch (err: any) {
      console.error(err);
      setScoreError(err.message || 'Failed to load activities');
    } finally {
      setAdminActivitiesLoading(false);
    }
  };

  const handleAdminActivityChange = (index: number, field: string, val: string) => {
    setAdminActivities(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAdminSaveActivities = async () => {
    const cId = scoreClassId || classes[0]?.id;
    const tId = scoreTermId || terms[0]?.id;
    const sessId = scoreSessionId || sessions[0]?.id;
    if (!cId || !tId || !sessId) {
      setScoreError('Please select a Class, Term, and Academic Session before saving.');
      return;
    }
    setAdminActivitiesSaving(true);
    setScoreMessage(null);
    setScoreError(null);
    try {
      await apiRequest('/api/teacher/activities', {
        method: 'POST',
        body: JSON.stringify({
          class_id: cId,
          term_id: tId,
          session_id: sessId,
          activities: adminActivities
        })
      });
      setScoreMessage(`Activities (A–E) saved successfully for ${adminActivities.length} students.`);
      confetti({ particleCount: 50 });
      setTimeout(() => setScoreMessage(null), 4000);
    } catch (err: any) {
      setScoreError(err.message);
    } finally {
      setAdminActivitiesSaving(false);
    }
  };

  const handleAdminAutomarkActivities = async () => {
    const cId = scoreClassId || classes[0]?.id;
    const tId = scoreTermId || terms[0]?.id;
    const sessId = scoreSessionId || sessions[0]?.id;
    if (!cId || !tId || !sessId) {
      setScoreError('Please select a Class, Term, and Academic Session before auto-marking.');
      return;
    }
    setAdminActivitiesAutomarking(true);
    setScoreMessage(null);
    setScoreError(null);
    try {
      await apiRequest('/api/teacher/activities/automark', {
        method: 'POST',
        body: JSON.stringify({
          class_id: cId,
          term_id: tId,
          session_id: sessId
        })
      });
      setScoreMessage('Activities successfully auto-marked based on students’ academic performance!');
      confetti({ particleCount: 70 });
      await loadAdminActivities(cId, scoreArmId, tId, sessId);
      setTimeout(() => setScoreMessage(null), 4000);
    } catch (err: any) {
      setScoreError(err.message);
    } finally {
      setAdminActivitiesAutomarking(false);
    }
  };

  useEffect(() => {
    if (resultSubTab === 'activities' && (scoreClassId || classes[0]?.id) && (scoreTermId || terms[0]?.id) && (scoreSessionId || sessions[0]?.id)) {
      loadAdminActivities();
    }
  }, [resultSubTab, scoreClassId, scoreArmId, scoreTermId, scoreSessionId, classes, terms, sessions]);

  // ATTENDANCE REGISTER - STATE & HANDLERS
  const [attClassId, setAttClassId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attEntries, setAttEntries] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [attMessage, setAttMessage] = useState<string | null>(null);
  const [attError, setAttError] = useState<string | null>(null);

  const loadAdminAttendance = async (cId?: string, d?: string) => {
    const classId = cId || attClassId || classes[0]?.id;
    const targetDate = d || attDate;
    if (!classId) return;
    setAttLoading(true);
    setAttError(null);
    try {
      const res = await apiRequest(`/api/attendance?class_id=${classId}&date=${targetDate}`);
      setAttEntries(res.records || []);
    } catch (err: any) {
      setAttError(err.message || 'Failed to load class attendance');
    } finally {
      setAttLoading(false);
    }
  };

  const handleAdminMarkAllPresent = () => {
    setAttEntries(prev => prev.map(e => ({ ...e, status: 'present' })));
  };

  const handleAdminAttendanceStatusChange = (index: number, status: string) => {
    setAttEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  };

  const handleAdminAttendanceRemarksChange = (index: number, remarks: string) => {
    setAttEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], remarks };
      return updated;
    });
  };

  const handleAdminSaveAttendance = async () => {
    const classId = attClassId || classes[0]?.id;
    if (!classId) {
      setAttError('Please select a class first.');
      return;
    }
    setAttSaving(true);
    setAttMessage(null);
    setAttError(null);
    try {
      const res = await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          class_id: classId,
          date: attDate,
          entries: attEntries.map(e => ({
            student_id: e.student_id,
            status: e.status || 'present',
            remarks: e.remarks || ''
          }))
        })
      });
      setAttMessage(res.message || 'Daily attendance recorded successfully!');
      confetti({ particleCount: 40, spread: 60 });
      triggerAutoCloudSync();
      setTimeout(() => setAttMessage(null), 4000);
    } catch (err: any) {
      setAttError(err.message || 'Failed to save attendance');
    } finally {
      setAttSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      const cId = attClassId || classes[0]?.id;
      if (cId) {
        if (!attClassId) setAttClassId(cId);
        loadAdminAttendance(cId, attDate);
      }
    }
  }, [activeTab, attClassId, attDate, classes]);

  // Result publishing state
  const [publishClassId, setPublishClassId] = useState('');
  const [publishTermId, setPublishTermId] = useState('');
  const [publishSessionId, setPublishSessionId] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [schData, sessData, clsData, subData, teaData, stdData, grdData, tmplData] = await Promise.all([
        apiRequest('/api/school/profile'),
        apiRequest('/api/school/sessions'),
        apiRequest('/api/school/classes'),
        apiRequest('/api/school/subjects'),
        apiRequest('/api/school/teachers'),
        apiRequest('/api/school/students'),
        apiRequest('/api/school/grading'),
        apiRequest('/api/school/result-template').catch(() => null),
      ]);

      setSchool(schData.school);
      setSessions(sessData.sessions || []);
      setTerms(sessData.terms || []);
      setClasses(clsData.classes || []);
      setArms(clsData.arms || []);
      setSubjects(subData.subjects || []);
      setTeachers(teaData.teachers || []);
      setStudents(stdData.students || []);
      setGrading(grdData);
      if (grdData?.weights) {
        setCustomWeights(grdData.weights);
      }

      if (tmplData?.template) {
        setTemplate(tmplData.template);
      }
      if (tmplData?.logo_url) {
        setSchoolBadge(tmplData.logo_url);
      } else if (schData.school?.logo_url) {
        setSchoolBadge(schData.school.logo_url);
      }

      // Default selection for result publishing & result management centre
      const firstClass = clsData.classes?.[0]?.id || '';
      const firstTerm = sessData.terms?.[0]?.id || '';
      const firstSession = sessData.sessions?.[0]?.id || '';
      const firstSubject = subData.subjects?.[0]?.id || '';

      setPublishClassId(firstClass);
      setPublishTermId(firstTerm);
      setPublishSessionId(firstSession);

      setScoreClassId(firstClass);
      setScoreTermId(firstTerm);
      setScoreSessionId(firstSession);
      setScoreSubjectId(firstSubject);

      if (clsData.classes?.length > 0) setNewStudent((prev) => ({ ...prev, class_id: firstClass }));
      if (schData.school?.id) {
        loadCloudStatus(schData.school.id, (stdData.students || []).length);
      }
    } catch (err: any) {
      console.error('Failed to load school admin data:', err);
      setLoadError(err.message || 'Failed to load school records.');
    } finally {
      setLoading(false);
    }
  };

  const loadCloudStatus = async (schId?: string, localStudentCount?: number) => {
    const targetId = schId || school?.id;
    if (!targetId) return;
    try {
      const status = await getFirebaseSyncStatus(targetId);
      setCloudSyncStatus(status);

      // Auto-Recovery Check: If local database was reset after a server/cloud update,
      // and Cloud Firestore has backed up records, auto-restore seamlessly!
      if (status.isSynced && status.totalRecords > 0 && typeof localStudentCount === 'number' && localStudentCount === 0) {
        console.log('[Auto-Recovery] Local students are empty but Cloud Firestore backup exists. Auto-recovering from Firestore...');
        const token = localStorage.getItem('multischool_auth_token') || '';
        if (token) {
          const res = await restoreSchoolFromFirestore(targetId, token);
          if (res.success) {
            setCloudSyncMessage(`Auto-Recovered: Restored school records from Cloud Firestore (${status.totalRecords} records preserved across updates).`);
            setTimeout(() => setCloudSyncMessage(null), 8000);
            loadAllData();
          }
        }
      }
    } catch (err) {
      console.warn('Could not retrieve Firebase cloud status:', err);
    }
  };

  // Background auto-sync that keeps Cloud Firestore updated on every change
  const triggerAutoCloudSync = (schId?: string) => {
    const targetId = schId || school?.id;
    if (!targetId) return;
    const token = localStorage.getItem('multischool_auth_token') || '';
    if (!token) return;
    syncSchoolToFirestore(targetId, token)
      .then(() => {
        loadCloudStatus(targetId);
      })
      .catch((err) => {
        console.warn('Background Firestore auto-sync note:', err);
      });
  };

  const handleManualCloudSync = async () => {
    const targetId = school?.id;
    if (!targetId) return;
    setSyncingToCloud(true);
    setCloudSyncMessage(null);
    try {
      const token = localStorage.getItem('multischool_auth_token') || '';
      const res = await syncSchoolToFirestore(targetId, token);
      setCloudSyncMessage(`Success: Synced ${res.totalSynced.students} students, ${res.totalSynced.teachers || 0} teachers, ${res.totalSynced.parents || 0} parents, ${res.totalSynced.attendance || 0} attendance records, ${res.totalSynced.fees || 0} fees, and ${res.totalSynced.scores} examination scores to Cloud Firestore!`);
      confetti({ particleCount: 60 });
      await loadCloudStatus(targetId);
      setTimeout(() => setCloudSyncMessage(null), 7000);
    } catch (err: any) {
      setCloudSyncMessage('Firebase Cloud Sync Error: ' + (err.message || 'Sync failed.'));
      setTimeout(() => setCloudSyncMessage(null), 8000);
    } finally {
      setSyncingToCloud(false);
    }
  };

  const handleManualCloudRestore = async () => {
    const targetId = school?.id;
    if (!targetId) return;
    setRestoringFromCloud(true);
    setCloudSyncMessage(null);
    try {
      const token = localStorage.getItem('multischool_auth_token') || '';
      const res = await restoreSchoolFromFirestore(targetId, token);
      setCloudSyncMessage(res.message);
      confetti({ particleCount: 60 });
      loadAllData();
      setTimeout(() => setCloudSyncMessage(null), 8000);
    } catch (err: any) {
      setCloudSyncMessage('Cloud Restore Error: ' + (err.message || 'Restore failed.'));
      setTimeout(() => setCloudSyncMessage(null), 8000);
    } finally {
      setRestoringFromCloud(false);
    }
  };

  const handleUploadSample = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSampleImage(ev.target?.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSample = async () => {
    if (!sampleImage) return;
    setSampleAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await apiRequest('/api/school/result-template/analyze', {
        method: 'POST',
        body: JSON.stringify({ sample_image: sampleImage, school_name: school?.name })
      });
      if (res.template) {
        setTemplate(res.template);
        setAnalysisResult({
          detectedFeatures: res.detectedFeatures || [],
          message: res.message || 'Template successfully generated from sample.'
        });
        confetti({ particleCount: 60 });
      }
    } catch (err: any) {
      alert('Analysis error: ' + err.message);
    } finally {
      setSampleAnalyzing(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    setTemplateSaveSuccess(null);
    try {
      await apiRequest('/api/school/result-template', {
        method: 'PUT',
        body: JSON.stringify({ template, logo_url: schoolBadge })
      });
      setTemplateSaveSuccess('Result sheet template and school badge saved successfully!');
      confetti({ particleCount: 70 });
      loadAllData();
      setTimeout(() => setTemplateSaveSuccess(null), 4000);
    } catch (err: any) {
      alert('Save error: ' + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleBadgeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSchoolBadge(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    loadAllData();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddStudentModal) setShowAddStudentModal(false);
        else if (showAddClassModal) setShowAddClassModal(false);
        else if (showAddSubjectModal) setShowAddSubjectModal(false);
        else if (activeTab !== 'overview') setActiveTab('overview');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddStudentModal, showAddClassModal, showAddSubjectModal, activeTab]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/school/students', {
        method: 'POST',
        body: JSON.stringify(newStudent),
      });
      setShowAddStudentModal(false);
      setNewStudent({
        admission_number: '',
        full_name: '',
        gender: 'Male',
        class_id: classes[0]?.id || '',
        arm_id: '',
        parent_name: '',
        parent_phone: '',
      });
      loadAllData();
      triggerAutoCloudSync();
      confetti({ particleCount: 40 });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/school/classes', {
        method: 'POST',
        body: JSON.stringify(newClass),
      });
      setShowAddClassModal(false);
      setNewClass({ name: '', level: 'Senior Secondary' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/school/subjects', {
        method: 'POST',
        body: JSON.stringify(newSubject),
      });
      setShowAddSubjectModal(false);
      setNewSubject({ name: '', code: '' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/school/sessions', {
        method: 'POST',
        body: JSON.stringify(newSession),
      });
      setShowAddSessionModal(false);
      setNewSession({ name: '', is_current: true });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSess = newTerm.session_id || sessions[0]?.id;
    if (!targetSess) {
      alert('Please select or create an academic session first.');
      return;
    }
    try {
      await apiRequest('/api/school/terms', {
        method: 'POST',
        body: JSON.stringify({ ...newTerm, session_id: targetSess }),
      });
      setShowAddTermModal(false);
      setNewTerm({ session_id: '', name: 'Second Term', is_current: false, next_term_resumption: '' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateArm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass = newArm.class_id || classes[0]?.id;
    if (!targetClass) {
      alert('Please select or create a class first.');
      return;
    }
    try {
      await apiRequest('/api/school/arms', {
        method: 'POST',
        body: JSON.stringify({ ...newArm, class_id: targetClass }),
      });
      setShowAddArmModal(false);
      setNewArm({ class_id: '', name: '' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleBootstrapStarterData = async () => {
    setBootstrapLoading(true);
    try {
      await apiRequest('/api/school/bootstrap-starter-data', { method: 'POST' });
      await loadAllData();
      triggerAutoCloudSync();
      alert('Standard curriculum, classes, terms, and students initialized successfully!');
    } catch (err: any) {
      alert('Initialization error: ' + err.message);
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await apiRequest(`/api/school/classes/${editingClass.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingClass),
      });
      setShowEditClassModal(false);
      setEditingClass(null);
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error updating class: ' + err.message);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${className}"? This will also remove associated class arms and enrolled students for this class.`)) {
      return;
    }
    try {
      await apiRequest(`/api/school/classes/${classId}`, { method: 'DELETE' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error deleting class: ' + err.message);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      await apiRequest(`/api/school/subjects/${editingSubject.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingSubject),
      });
      setShowEditSubjectModal(false);
      setEditingSubject(null);
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error updating subject: ' + err.message);
    }
  };

  const handleDeleteSubject = async (subId: string, subName: string) => {
    if (!confirm(`Are you sure you want to delete "${subName}"? All recorded marks for this subject will be removed.`)) {
      return;
    }
    try {
      await apiRequest(`/api/school/subjects/${subId}`, { method: 'DELETE' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error deleting subject: ' + err.message);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await apiRequest(`/api/school/students/${editingStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingStudent),
      });
      setShowEditStudentModal(false);
      setEditingStudent(null);
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error updating student: ' + err.message);
    }
  };

  const handleDeleteStudent = async (stdId: string, stdName: string) => {
    if (!confirm(`Are you sure you want to delete student "${stdName}"? All score records and report cards will be removed.`)) {
      return;
    }
    try {
      await apiRequest(`/api/school/students/${stdId}`, { method: 'DELETE' });
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error deleting student: ' + err.message);
    }
  };

  const handleSaveAssessmentWeights = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingWeights(true);
    setWeightsSuccessMsg(null);
    try {
      await apiRequest('/api/school/grading', {
        method: 'PUT',
        body: JSON.stringify({ weights: customWeights }),
      });
      setGrading((prev: any) => ({
        ...(prev || {}),
        weights: customWeights,
      }));
      setWeightsSuccessMsg('Assessment weight structure updated! All continuous assessment and exam sheets will now compute and validate against these weights.');
      triggerAutoCloudSync();
      setTimeout(() => setWeightsSuccessMsg(null), 6000);
    } catch (err: any) {
      alert('Failed to save assessment weights: ' + err.message);
    } finally {
      setSavingWeights(false);
    }
  };

  const handleDeleteStudentMark = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete marks for ${studentName} in this subject?`)) return;
    try {
      await apiRequest(
        `/api/teacher/scores?class_id=${scoreClassId}&subject_id=${scoreSubjectId}&term_id=${scoreTermId}&session_id=${scoreSessionId}&student_id=${studentId}`,
        { method: 'DELETE' }
      );
      loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error deleting score: ' + err.message);
    }
  };

  const handleDeleteAllSubjectMarks = async () => {
    if (!confirm(`Are you sure you want to delete ALL student scores for this subject in the selected class and term?`)) return;
    try {
      await apiRequest(
        `/api/teacher/scores?class_id=${scoreClassId}&subject_id=${scoreSubjectId}&term_id=${scoreTermId}&session_id=${scoreSessionId}`,
        { method: 'DELETE' }
      );
      loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
    } catch (err: any) {
      alert('Error deleting scores: ' + err.message);
    }
  };

  const loadScoreSheet = async (cId?: string, aId?: string, sId?: string, tId?: string, sessId?: string) => {
    const targetClass = cId || scoreClassId;
    const targetArm = aId !== undefined ? aId : scoreArmId;
    const targetSub = sId || scoreSubjectId;
    const targetTerm = tId || scoreTermId;
    const targetSess = sessId || scoreSessionId;

    if (!targetClass || !targetSub || !targetTerm || !targetSess) return;
    setScoreLoading(true);
    setScoreError(null);
    try {
      const res = await apiRequest(
        `/api/teacher/scores?class_id=${targetClass}&arm_id=${targetArm || ''}&subject_id=${targetSub}&term_id=${targetTerm}&session_id=${targetSess}`
      );
      setScoreRows(res.rows || []);
    } catch (err: any) {
      setScoreError(err.message || 'Failed to load score sheet');
    } finally {
      setScoreLoading(false);
    }
  };

  const loadBroadsheetData = async (cId?: string, aId?: string, tId?: string, sessId?: string) => {
    const targetClass = cId || scoreClassId;
    const targetArm = aId !== undefined ? aId : scoreArmId;
    const targetTerm = tId || scoreTermId;
    const targetSess = sessId || scoreSessionId;

    if (!targetClass || !targetTerm || !targetSess) return;
    setBroadsheetLoading(true);
    try {
      const data = await apiRequest(
        `/api/school/reports/broadsheet?class_id=${targetClass}&arm_id=${targetArm || ''}&term_id=${targetTerm}&session_id=${targetSess}`
      );
      setBroadsheetData(data);
    } catch (err: any) {
      console.error('Failed to load broadsheet:', err);
    } finally {
      setBroadsheetLoading(false);
    }
  };

  const handleScoreChange = (index: number, field: keyof ScoreRow, value: number) => {
    const updated = [...scoreRows];
    const num = isNaN(value) ? 0 : Number(value);
    (updated[index] as any)[field] = num;

    const ca1 = Number(updated[index].ca1) || 0;
    const ca2 = Number(updated[index].ca2) || 0;
    const ca3 = Number(updated[index].ca3) || 0;
    const exam = Number(updated[index].exam) || 0;
    const total = Math.round((ca1 + ca2 + ca3 + exam) * 100) / 100;
    updated[index].total = total;

    // Real-time authoritative grading according to academic grading scale
    if (total >= 75) {
      updated[index].grade = 'A1';
      updated[index].remark = 'Excellent';
    } else if (total >= 70) {
      updated[index].grade = 'B2';
      updated[index].remark = 'Very Good';
    } else if (total >= 65) {
      updated[index].grade = 'B3';
      updated[index].remark = 'Good';
    } else if (total >= 60) {
      updated[index].grade = 'C4';
      updated[index].remark = 'Credit';
    } else if (total >= 55) {
      updated[index].grade = 'C5';
      updated[index].remark = 'Credit';
    } else if (total >= 50) {
      updated[index].grade = 'C6';
      updated[index].remark = 'Credit';
    } else if (total >= 45) {
      updated[index].grade = 'D7';
      updated[index].remark = 'Fair Pass';
    } else if (total >= 40) {
      updated[index].grade = 'E8';
      updated[index].remark = 'Pass';
    } else {
      updated[index].grade = 'F9';
      updated[index].remark = 'Fail';
    }

    setScoreRows(updated);
  };

  const handleQuickFillBenchmark = () => {
    const wCa1 = grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10;
    const wCa2 = grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10;
    const wCa3 = grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10;
    const wExam = grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70;

    const benchmarkPercentages = [0.92, 0.84, 0.77, 0.68, 0.62, 0.54, 0.48, 0.42, 0.35];

    const updated = scoreRows.map((r, i) => {
      const pct = benchmarkPercentages[i % benchmarkPercentages.length];
      const ca1 = Math.min(wCa1, Math.round(wCa1 * pct));
      const ca2 = Math.min(wCa2, Math.round(wCa2 * Math.min(1, pct * 0.98)));
      const ca3 = Math.min(wCa3, Math.round(wCa3 * Math.min(1, pct * 0.95)));
      const exam = Math.min(wExam, Math.round(wExam * pct));
      const total = ca1 + ca2 + ca3 + exam;

      let grade = 'F9';
      let remark = 'Fail';
      if (total >= 75) { grade = 'A1'; remark = 'Excellent'; }
      else if (total >= 70) { grade = 'B2'; remark = 'Very Good'; }
      else if (total >= 65) { grade = 'B3'; remark = 'Good'; }
      else if (total >= 60) { grade = 'C4'; remark = 'Credit'; }
      else if (total >= 55) { grade = 'C5'; remark = 'Credit'; }
      else if (total >= 50) { grade = 'C6'; remark = 'Credit'; }
      else if (total >= 45) { grade = 'D7'; remark = 'Fair Pass'; }
      else if (total >= 40) { grade = 'E8'; remark = 'Pass'; }

      return {
        ...r,
        ca1,
        ca2,
        ca3,
        exam,
        total,
        grade,
        remark,
        teacher_comment: total >= 75 ? 'Exceptional mastery of subject matter' : total >= 50 ? 'Demonstrates solid understanding; consistent effort' : 'Requires academic intervention and remedial support'
      };
    });
    setScoreRows(updated);
    setScoreMessage('Populated realistic benchmark marks across enrolled students based on your school assessment weights.');
    setTimeout(() => setScoreMessage(null), 5000);
  };

  const handleClearScores = () => {
    const updated = scoreRows.map((r) => ({
      ...r,
      ca1: 0,
      ca2: 0,
      ca3: 0,
      exam: 0,
      total: 0,
      grade: 'F9',
      remark: 'Fail',
      teacher_comment: ''
    }));
    setScoreRows(updated);
    setScoreMessage('Reset all student score entries for this subject.');
    setTimeout(() => setScoreMessage(null), 4000);
  };

  const handleSaveScoreSheet = async (status: 'draft' | 'approved') => {
    if (!scoreClassId || !scoreSubjectId || !scoreTermId || !scoreSessionId) {
      alert('Please select Class, Subject, Term, and Session');
      return;
    }
    setScoreSaving(true);
    setScoreMessage(null);
    setScoreError(null);
    try {
      const res = await apiRequest('/api/teacher/scores', {
        method: 'POST',
        body: JSON.stringify({
          class_id: scoreClassId,
          subject_id: scoreSubjectId,
          term_id: scoreTermId,
          session_id: scoreSessionId,
          status,
          scores: scoreRows.map((r) => ({
            student_id: r.student_id,
            ca1: r.ca1,
            ca2: r.ca2,
            ca3: r.ca3,
            exam: r.exam,
            teacher_comment: r.teacher_comment,
          })),
        }),
      });
      setScoreMessage(res.message || 'Scores saved and calculated successfully.');
      confetti({ particleCount: 50, spread: 60 });
      loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
      triggerAutoCloudSync();
      setTimeout(() => setScoreMessage(null), 5000);
    } catch (err: any) {
      setScoreError(err.message || 'Failed to save scores');
    } finally {
      setScoreSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'results') {
      if (resultSubTab === 'marks') {
        loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
      } else if (resultSubTab === 'compile' || resultSubTab === 'cards') {
        loadBroadsheetData(scoreClassId, scoreArmId, scoreTermId, scoreSessionId);
      }
    }
  }, [activeTab, resultSubTab, scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId]);

  const handleCompileAndPublish = async () => {
    const targetClass = scoreClassId || publishClassId;
    const targetTerm = scoreTermId || publishTermId;
    const targetSession = scoreSessionId || publishSessionId;

    if (!targetClass || !targetTerm || !targetSession) {
      alert('Please select Class, Term, and Session');
      return;
    }
    setPublishLoading(true);
    setPublishMessage(null);
    try {
      const res = await apiRequest('/api/school/results/publish', {
        method: 'POST',
        body: JSON.stringify({
          class_id: targetClass,
          arm_id: scoreArmId || null,
          term_id: targetTerm,
          session_id: targetSession,
        }),
      });
      setPublishMessage(res.message);
      confetti({ particleCount: 80, spread: 80 });
      setResultSubTab('compile');
      loadBroadsheetData(targetClass, scoreArmId, targetTerm, targetSession);
      loadAllData();
      triggerAutoCloudSync();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDownloadSchoolBackup = async () => {
    try {
      const token = localStorage.getItem('multischool_auth_token');
      const res = await fetch('/api/school/download-backup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate backup.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(school?.name || 'School').replace(/[^a-zA-Z0-9_-]/g, '_')}_Academic_Data_Backup.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Backup download failed: ' + err.message);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass = !selectedClassFilter || s.class_id === selectedClassFilter;
    const matchesSearch =
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(studentSearch.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Error Recovery Banner */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadAllData}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs shrink-0"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* School Header Banner */}
      {school && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover bg-white p-1 border-2 border-white/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border-2 border-white/20 shrink-0">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {school.status}
                </span>
                <span className="text-xs text-blue-200">{school.school_level}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight mt-1 truncate">{school.name}</h1>
              <p className="text-xs text-slate-300 truncate">{school.address || `${school.state}, Nigeria`}</p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2.5 text-left sm:text-right w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-white/10 sm:border-none">
            <div className="flex flex-wrap items-center sm:justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Firebase Cloud Connected
              </span>
              <span className="text-xs text-amber-300 font-bold">{school.plan_name || 'Standard Pro'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleManualCloudSync}
                disabled={syncingToCloud}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Sync all school records, students, and marks to Google Firebase Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingToCloud ? 'animate-spin' : ''}`} />
                <span>{syncingToCloud ? 'Syncing to Cloud...' : 'Sync to Firebase Cloud'}</span>
              </button>

              <button
                onClick={handleDownloadSchoolBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition backdrop-blur-xs cursor-pointer shadow-xs border border-white/15"
                title="Download offline JSON backup"
              >
                <Download className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>Export JSON</span>
              </button>

              <PWAInstallButton variant="navbar" />

              <a
                href={`https://wa.me/2349155377861?text=${encodeURIComponent("Hi!\nI'm one among the school Admin of AcademiQ.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Chat with AcademiQ Support on WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.004 2C6.48 2 2.004 6.476 2.004 12c0 1.996.589 3.86 1.608 5.432L2.062 22l4.743-1.516c1.514.928 3.3 1.516 5.199 1.516 5.523 0 10-4.476 10-10s-4.477-10-10-10zm0 18.275c-1.637 0-3.187-.497-4.498-1.354l-.323-.209-3.328 1.064 1.089-3.238-.231-.344a8.214 8.214 0 01-1.354-4.194c0-4.57 3.717-8.287 8.645-8.287s8.645 3.717 8.645 8.287c0 4.57-3.871 8.275-8.645 8.275zm4.737-6.19c-.259-.13-1.533-.756-1.771-.843-.238-.086-.411-.13-.584.13-.173.259-.67 0.843-.822 1.016-.151.173-.303.195-.562.065-.259-.13-1.096-.404-2.088-1.288-.772-.689-1.294-1.541-1.445-1.8-.151-.259-.016-.399.113-.528.116-.117.259-.303.389-.454.13-.151.173-.259.259-.432.086-.173.043-.324-.022-.454-.065-.13-.584-1.406-.8-1.925-.211-.506-.425-.437-.584-.445l-.497-.008c-.173 0-.454.065-.692.324-.238.259-.908.887-.908 2.163 0 1.276.929 2.509 1.059 2.682.13.173 1.828 2.791 4.428 3.914.619.268 1.102.428 1.479.548.622.198 1.189.17 1.637.103.499-.075 1.533-.627 1.749-1.233.216-.605.216-1.125.151-1.233-.065-.108-.238-.173-.497-.303z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs - Horizontal Scroll on Mobile with Touch Scrolling */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-1.5 sm:space-x-3 pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none touch-pan-x">
        {[
          { id: 'overview', label: 'Dashboard', icon: Layers },
          { id: 'results', label: 'Result Management Centre', icon: Award, featured: true },
          { id: 'template', label: 'Sample Result & Badge', icon: Palette },
          { id: 'students', label: `Students (${students.length})`, icon: GraduationCap },
          { id: 'classes', label: `Classes (${classes.length})`, icon: Building2 },
          { id: 'subjects', label: `Subjects (${subjects.length})`, icon: BookOpen },
          { id: 'sessions', label: 'Sessions & Terms', icon: Calendar },
          { id: 'attendance', label: 'Attendance Register', icon: Clock },
          { id: 'grading', label: 'Grading Scales', icon: Settings },
          { id: 'finance', label: 'Fee Accounting', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isFeatured = (tab as any).featured;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isFeatured
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : isFeatured ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {isFeatured && activeTab !== tab.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse ml-0.5"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Back Navigation Breadcrumb */}
      {activeTab !== 'overview' && (
        <div className="flex items-center justify-between pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Back to Dashboard Overview</span>
          </button>
          <span className="text-xs text-slate-400 capitalize hidden sm:inline">
            School Dashboard / <span className="font-semibold text-slate-700">{activeTab === 'results' ? 'Result Management Centre' : activeTab}</span>
          </span>
        </div>
      )}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{students.length}</span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Active enrolled</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Classes & Arms</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{classes.length}</span>
              <span className="text-[11px] text-blue-600 font-medium mt-1 block">{arms.length} assigned arms</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Academic Subjects</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{subjects.length}</span>
              <span className="text-[11px] text-purple-600 font-medium mt-1 block">Configured curriculum</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Teachers & Staff</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{teachers.length}</span>
              <span className="text-[11px] text-teal-600 font-medium mt-1 block">Authorized educators</span>
            </div>
          </div>

          {/* FIREBASE CLOUD PERSISTENCE & ZERO DATA LOSS GUARANTEE */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Firebase Firestore Connected
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Project: <span className="text-emerald-400 font-bold">collective-shade-gbvhw</span>
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Cloud Persistence & Zero Data Loss Guarantee</span>
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Your school records, student profiles, continuous assessment marks, exam scores, and custom result card branding are backed up to Google Firebase Cloud. Even if your browser cache is cleared or devices change, all data remains permanently preserved and synchronized.
                </p>
                {cloudSyncStatus?.lastSyncTimestamp && (
                  <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Last cloud sync: <strong>{new Date(cloudSyncStatus.lastSyncTimestamp).toLocaleString()}</strong> ({cloudSyncStatus.totalRecords} records stored)
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={handleManualCloudSync}
                  disabled={syncingToCloud}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-700/30 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingToCloud ? 'animate-spin' : ''}`} />
                  <span>{syncingToCloud ? 'Syncing Records...' : 'Sync to Firebase Cloud Now'}</span>
                </button>

                <button
                  onClick={handleManualCloudRestore}
                  disabled={restoringFromCloud}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-white/20 cursor-pointer disabled:opacity-50"
                  title="Recover all school data from Firestore cloud backup"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>{restoringFromCloud ? 'Restoring...' : 'Restore from Cloud'}</span>
                </button>

                <button
                  onClick={() => {
                    setBulkExportTab('backup');
                    setShowBulkExportModal(true);
                  }}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-indigo-400/40 cursor-pointer shadow-xs"
                  title="Bulk export student records, marks, attendance, or master archive"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Bulk Export</span>
                </button>
              </div>
            </div>

            {cloudSyncMessage && (
              <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 border ${
                cloudSyncMessage.toLowerCase().includes('error')
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : 'bg-emerald-900/60 border-emerald-500/50 text-emerald-200'
              }`}>
                {cloudSyncMessage.toLowerCase().includes('error') ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{cloudSyncMessage}</span>
              </div>
            )}
          </div>

          {/* RESULT MANAGEMENT CENTRE - FLAGSHIP SUITE HERO BANNER */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5" /> High-Precision Academic Computation Engine
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Recalculation & Cryptographic PINs</span>
                </div>
              </div>

              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Result Management Centre
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Enter student marks across Continuous Assessment (CA1, CA2, CA3) and Exams. AcademiQ automatically calculates subject totals, grades, remarks, class averages, and dense tie positions—then generates flawless report cards matching your uploaded sample sheet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab('results');
                    setResultSubTab('marks');
                  }}
                  className="p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-left transition cursor-pointer backdrop-blur-xs group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/30 text-blue-200 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white block">1. Mark Entry Matrix</span>
                  <span className="text-[11px] text-blue-200">Input CA & Exam with live math</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('results');
                    setResultSubTab('compile');
                  }}
                  className="p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-left transition cursor-pointer backdrop-blur-xs group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/30 text-amber-200 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white block">2. Automated Position Engine</span>
                  <span className="text-[11px] text-amber-200">Auto-rank, tie-break & issue PINs</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('results');
                    setResultSubTab('sample');
                  }}
                  className="p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-left transition cursor-pointer backdrop-blur-xs group"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/30 text-purple-200 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white block">3. Sample Sheet Matcher</span>
                  <span className="text-[11px] text-purple-200">AI-model result card on your scan</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('results');
                    setResultSubTab('cards');
                  }}
                  className="p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-left transition cursor-pointer backdrop-blur-xs group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/30 text-emerald-200 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white block">4. Generate Report Cards</span>
                  <span className="text-[11px] text-emerald-200">Print A4 cards & master broadsheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Administrator Operations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  setActiveTab('results');
                  setResultSubTab('marks');
                }}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 text-left transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-200/80 text-blue-900 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-blue-950 block">Result Management Centre</span>
                <span className="text-[11px] text-blue-800">Add marks, auto-compute & generate</span>
              </button>

              <button
                onClick={() => setActiveTab('template')}
                className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-left transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-amber-950 block">Sample Result Sheet & Badge</span>
                <span className="text-[11px] text-amber-800">Upload sample to auto-generate layout</span>
              </button>

              <button
                onClick={() => {
                  if (classes.length > 0 && terms.length > 0 && sessions.length > 0) {
                    onOpenBroadsheet(classes[0].id, terms[0].id, sessions[0].id);
                  }
                }}
                className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-left transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-200/80 text-emerald-900 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-emerald-950 block">Class Result Broadsheet</span>
                <span className="text-[11px] text-emerald-800">Multi-subject tabular master score sheet</span>
              </button>

              <button
                onClick={() => {
                  if (students.length > 0) {
                    onOpenReportCard(students[0].id);
                  }
                }}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 text-left transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-200/80 text-purple-900 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Printer className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-purple-950 block">Print Individual Reports</span>
                <span className="text-[11px] text-purple-800">A4 printable layout with school seal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. RESULT SHEET TEMPLATE & BADGE STUDIO */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5" /> AI Result Sheet Designer & Badge Studio
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Design Your School's Exact Result Sheet
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Upload a sample photo or scan of how your school's report card currently looks. AcademiQ's vision engine will inspect its headers, tables, grading, and badge placement to generate the exact layout—ready to print cleanly on A4 paper.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{savingTemplate ? 'Saving Changes...' : 'Save & Apply Template'}</span>
              </button>
            </div>
          </div>

          {templateSaveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{templateSaveSuccess}</span>
            </div>
          )}

          {/* Two-Column Studio Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Official School Badge / Logo */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    School Crest & Official Badge
                  </h3>
                  {schoolBadge && (
                    <button
                      type="button"
                      onClick={() => setSchoolBadge('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {schoolBadge ? (
                      <img src={schoolBadge} alt="School Crest" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {school?.name || 'School Emblem'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Renders in high definition on report card headers and faint watermarks.
                    </span>
                    <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition">
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>Upload Custom Badge</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBadgeUpload} />
                    </label>
                  </div>
                </div>

                {/* Preset Vector Badges */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Or select a pre-designed academic crest:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_BADGES.map((b) => (
                      <button
                        type="button"
                        key={b.name}
                        onClick={() => setSchoolBadge(b.svg)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                          schoolBadge === b.svg
                            ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 p-1 shrink-0 flex items-center justify-center">
                          <img src={b.svg} alt={b.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 truncate">{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Upload Sample Result Sheet (AI Analysis) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Upload Sample of School Result Sheet
                  </h3>
                  {sampleImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setSampleImage(null);
                        setAnalysisResult(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Have an existing paper report card or graphic design? Upload a photo or PDF export. AcademiQ will analyze the layout and generate the exact matching structure.
                </p>

                {sampleImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border border-slate-300 bg-slate-100 p-2 overflow-hidden flex items-center justify-center max-h-48">
                      <img src={sampleImage} alt="Sample Result Sheet" className="max-h-44 object-contain rounded-lg" />
                    </div>

                    <button
                      type="button"
                      onClick={handleAnalyzeSample}
                      disabled={sampleAnalyzing}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition"
                    >
                      {sampleAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Analyzing Visual Structure with Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Analyze Sample & Match Layout</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50/70 hover:bg-blue-50/40 cursor-pointer transition group">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Upload Result Sheet Sample (Image/Scan)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      JPG, PNG, WebP — Photo of your existing school report sheet
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadSample} />
                  </label>
                )}

                {/* Analysis Result Banner */}
                {analysisResult && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{analysisResult.message}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 space-y-1 pl-6">
                      <span className="font-semibold block text-slate-800">Identified Design Features:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        {analysisResult.detectedFeatures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Layout Customizer Controls */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Layout & Style Fine-Tuning
                </h3>

                {/* Header Layout Options */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    School Crest & Header Alignment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'crest_center', label: 'Crest Center', desc: 'Badge centered on top' },
                      { id: 'badge_left', label: 'Badge Left', desc: 'Badge left, photo right' },
                      { id: 'dual_crest', label: 'Dual Crests', desc: 'Badge & State Shield' },
                      { id: 'modern_banner', label: 'Modern Banner', desc: 'Solid brand banner' }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setTemplate({ ...template, headerLayout: opt.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          template.headerLayout === opt.id
                            ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 font-bold'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Swatches */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: 'Navy Blue', hex: '#1e3a8a' },
                      { name: 'Forest Green', hex: '#065f46' },
                      { name: 'Crimson Red', hex: '#831843' },
                      { name: 'Royal Purple', hex: '#581c87' },
                      { name: 'Slate Dark', hex: '#0f172a' },
                      { name: 'Amber Gold', hex: '#78350f' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setTemplate({ ...template, primaryColor: c.hex })}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full transition transform cursor-pointer border-2 ${
                          template.primaryColor === c.hex ? 'scale-110 border-white ring-2 ring-blue-600' : 'border-transparent'
                        }`}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="text"
                      value={template.primaryColor}
                      onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                      className="px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg w-24 text-center"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">Display Sections</label>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Subtle School Badge Watermark</span>
                      <input
                        type="checkbox"
                        checked={template.showWatermark}
                        onChange={(e) => setTemplate({ ...template, showWatermark: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Student Passport Photograph Box</span>
                      <input
                        type="checkbox"
                        checked={template.showStudentPhoto}
                        onChange={(e) => setTemplate({ ...template, showStudentPhoto: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Affective Domain (Behavioral Traits)</span>
                      <input
                        type="checkbox"
                        checked={template.showAffectiveDomain}
                        onChange={(e) => setTemplate({ ...template, showAffectiveDomain: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Psychomotor Skills Matrix</span>
                      <input
                        type="checkbox"
                        checked={template.showPsychomotorDomain ?? true}
                        onChange={(e) => setTemplate({ ...template, showPsychomotorDomain: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Official Principal Seal Stamp</span>
                      <input
                        type="checkbox"
                        checked={template.showPrincipalStamp}
                        onChange={(e) => setTemplate({ ...template, showPrincipalStamp: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer">
                      <span className="text-slate-800 font-medium">Grading Scale Legend</span>
                      <input
                        type="checkbox"
                        checked={template.showGradingScaleTable}
                        onChange={(e) => setTemplate({ ...template, showGradingScaleTable: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Motto & Custom Heading */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">School Motto</label>
                    <input
                      type="text"
                      value={template.schoolMotto || ''}
                      onChange={(e) => setTemplate({ ...template, schoolMotto: e.target.value })}
                      placeholder="e.g. Knowledge, Integrity and Excellence"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Document Header Title</label>
                    <input
                      type="text"
                      value={template.customHeaderNote || ''}
                      onChange={(e) => setTemplate({ ...template, customHeaderNote: e.target.value })}
                      placeholder="e.g. Terminal Continuous Assessment & Examination Report"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving Changes...' : 'Save & Activate Layout for All Students'}
                </button>
              </div>
            </div>

            {/* Right Preview Column (7 cols) - Live Simulation */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Live Report Card Simulation (A4 Preview)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Renders with actual student data and chosen layout styling.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (students.length > 0) {
                        onOpenReportCard(students[0].id);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-700" />
                    <span>Print Student Report</span>
                  </button>
                </div>
              </div>

              {/* Simulation Sheet Container */}
              <div
                className="bg-white p-5 rounded-3xl border-2 border-slate-300 shadow-xl relative overflow-hidden space-y-4"
                style={{
                  fontFamily: template.fontFamily === 'serif' ? 'Georgia, Cambria, serif' : 'system-ui, sans-serif'
                }}
              >
                {/* Background Watermark Simulation */}
                {template.showWatermark && (schoolBadge || school?.logo_url) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
                    style={{ opacity: template.watermarkOpacity ?? 0.08 }}
                  >
                    <img
                      src={schoolBadge || school?.logo_url}
                      alt=""
                      className="w-72 h-72 object-contain grayscale"
                    />
                  </div>
                )}

                {/* Header Simulation */}
                <div className="relative z-10 border-b-2 pb-3" style={{ borderColor: template.primaryColor }}>
                  {template.headerLayout === 'crest_center' && (
                    <div className="text-center space-y-1">
                      {(schoolBadge || school?.logo_url) && (
                        <div className="w-16 h-16 mx-auto mb-1 flex items-center justify-center p-1 bg-white rounded-xl shadow-xs">
                          <img
                            src={schoolBadge || school?.logo_url}
                            alt="School Crest"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: template.primaryColor }}>
                        {school?.name || 'School Name'}
                      </h3>
                      {template.schoolMotto && (
                        <p className="text-[11px] font-semibold italic" style={{ color: template.accentColor }}>
                          "{template.schoolMotto}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-600">{school?.address || 'School Campus Address'}</p>
                      <div className="pt-1">
                        <span
                          className="inline-block px-3 py-0.5 text-white rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: template.primaryColor }}
                        >
                          {template.customHeaderNote || 'Continuous Assessment & Examination Report'}
                        </span>
                      </div>
                    </div>
                  )}

                  {template.headerLayout === 'badge_left' && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {(schoolBadge || school?.logo_url) && (
                          <div className="w-16 h-16 shrink-0 p-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                            <img src={schoolBadge || school?.logo_url} alt="Badge" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: template.primaryColor }}>
                            {school?.name}
                          </h3>
                          {template.schoolMotto && (
                            <p className="text-[11px] font-semibold italic" style={{ color: template.accentColor }}>
                              "{template.schoolMotto}"
                            </p>
                          )}
                          <p className="text-[10px] text-slate-600">{school?.address}</p>
                        </div>
                      </div>

                      {template.showStudentPhoto && (
                        <div className="w-16 h-20 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center p-1 shrink-0">
                          <GraduationCap className="w-5 h-5 text-slate-400" />
                          <span className="text-[8px] text-slate-500 font-sans uppercase mt-0.5 font-bold">Passport</span>
                        </div>
                      )}
                    </div>
                  )}

                  {template.headerLayout === 'dual_crest' && (
                    <div>
                      <div className="flex items-center justify-between gap-2 text-center">
                        <div className="w-14 h-14 shrink-0 p-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                          <img src={schoolBadge || school?.logo_url} alt="Badge" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: template.primaryColor }}>
                            {school?.name}
                          </h3>
                          <p className="text-[11px] font-semibold italic" style={{ color: template.accentColor }}>
                            "{template.schoolMotto}"
                          </p>
                          <p className="text-[10px] text-slate-600">{school?.address}</p>
                        </div>
                        <div className="w-14 h-14 shrink-0 p-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                          <Shield className="w-8 h-8 text-amber-500" />
                        </div>
                      </div>
                      <div className="text-center pt-1.5">
                        <span
                          className="inline-block px-3 py-0.5 text-white rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: template.primaryColor }}
                        >
                          {template.customHeaderNote || 'Continuous Assessment Terminal Report'}
                        </span>
                      </div>
                    </div>
                  )}

                  {template.headerLayout === 'modern_banner' && (
                    <div className="rounded-xl overflow-hidden shadow-xs mb-1">
                      <div className="p-3 text-white flex items-center justify-between gap-3" style={{ backgroundColor: template.primaryColor }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center">
                            <img src={schoolBadge || school?.logo_url} alt="Badge" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <h3 className="text-base font-black uppercase">{school?.name}</h3>
                            <p className="text-[10px] opacity-80">{template.schoolMotto || school?.address}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase">
                          Official Report
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Info Box */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Student Name</span>
                    <span className="font-bold text-slate-900">Zainab Alabi</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Admission No</span>
                    <span className="font-mono font-bold text-slate-900">APX/2026/001</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Class & Arm</span>
                    <span className="font-semibold text-slate-900">SS 1 (Science Gold)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Session & Term</span>
                    <span className="font-semibold text-slate-900">2026/2027 • First Term</span>
                  </div>
                </div>

                {/* Scores Table Simulation */}
                <div className="relative z-10 overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-300">
                    <thead className="text-white font-bold uppercase text-[10px]" style={{ backgroundColor: template.primaryColor }}>
                      <tr>
                        <th className="py-1.5 px-2 border border-slate-300">Subject</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300">CA1 (10)</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300">CA2 (10)</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300">Project (10)</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300">Exam (70)</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300 bg-black/10">Total (100)</th>
                        <th className="py-1.5 px-1.5 text-center border border-slate-300">Grade</th>
                        <th className="py-1.5 px-2 border border-slate-300">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        { name: 'Mathematics', ca1: 9, ca2: 10, ca3: 9, exam: 62, total: 90, grade: 'A', remark: 'Distinction' },
                        { name: 'English Language', ca1: 8, ca2: 9, ca3: 9, exam: 62, total: 88, grade: 'A', remark: 'Excellent' },
                        { name: 'Biology', ca1: 9, ca2: 8, ca3: 9, exam: 60, total: 86, grade: 'A', remark: 'Distinction' },
                        { name: 'Chemistry', ca1: 8, ca2: 9, ca3: 8, exam: 58, total: 83, grade: 'A', remark: 'Very Good' }
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-1.5 px-2 font-semibold text-slate-900 border border-slate-200">{row.name}</td>
                          <td className="py-1.5 px-1.5 text-center font-mono border border-slate-200">{row.ca1}</td>
                          <td className="py-1.5 px-1.5 text-center font-mono border border-slate-200">{row.ca2}</td>
                          <td className="py-1.5 px-1.5 text-center font-mono border border-slate-200">{row.ca3}</td>
                          <td className="py-1.5 px-1.5 text-center font-mono border border-slate-200">{row.exam}</td>
                          <td className="py-1.5 px-1.5 text-center font-bold font-mono text-slate-950 bg-slate-100 border border-slate-200">
                            {row.total}
                          </td>
                          <td className="py-1.5 px-1.5 text-center font-bold font-mono text-emerald-700 border border-slate-200">
                            {row.grade}
                          </td>
                          <td className="py-1.5 px-2 text-slate-700 border border-slate-200 font-sans text-[10px]">{row.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Metrics Summary */}
                <div className="relative z-10 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Score</span>
                    <span className="text-lg font-black block" style={{ color: template.primaryColor }}>347</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Average</span>
                    <span className="text-lg font-black block text-emerald-700">86.8%</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Position</span>
                    <span className="text-lg font-black block" style={{ color: template.accentColor }}>1st <span className="text-xs font-normal text-slate-500">/ 35</span></span>
                  </div>
                </div>

                {/* Affective Domain Simulation */}
                {template.showAffectiveDomain && (
                  <div className="relative z-10 border border-slate-300 rounded-xl overflow-hidden text-[10px]">
                    <div className="px-2.5 py-1 text-white font-bold uppercase" style={{ backgroundColor: template.primaryColor }}>
                      Affective Domain & Behavioral Evaluation (1-5)
                    </div>
                    <div className="grid grid-cols-2 p-2 bg-slate-50/60 gap-x-4 gap-y-1 font-sans">
                      <div className="flex justify-between"><span>Punctuality:</span><span className="font-bold text-blue-900">★★★★★ (5/5)</span></div>
                      <div className="flex justify-between"><span>Neatness:</span><span className="font-bold text-blue-900">★★★★★ (5/5)</span></div>
                      <div className="flex justify-between"><span>Politeness:</span><span className="font-bold text-blue-900">★★★★★ (5/5)</span></div>
                      <div className="flex justify-between"><span>Honesty:</span><span className="font-bold text-blue-900">★★★★☆ (4/5)</span></div>
                    </div>
                  </div>
                )}

                {/* Principal Stamp and Signatures */}
                <div className="relative z-10 grid grid-cols-3 gap-4 pt-3 border-t-2 border-slate-300 text-center text-[10px]">
                  <div>
                    <div className="italic font-serif text-slate-800 border-b border-slate-400 pb-1">J. Doe (M.Ed)</div>
                    <span className="font-bold text-slate-700 block mt-1">Form Teacher</span>
                  </div>

                  {template.showPrincipalStamp ? (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center p-0.5 transform rotate-[-6deg]"
                        style={{ borderColor: template.primaryColor, color: template.primaryColor }}
                      >
                        <div className="text-[7px] font-bold uppercase text-center leading-tight">
                          <Stamp className="w-2.5 h-2.5 mx-auto" />
                          <span>OFFICIAL SEAL</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5">Principal Seal</span>
                    </div>
                  ) : <div />}

                  <div>
                    <div className="italic font-serif text-slate-800 border-b border-slate-400 pb-1">Dr. A. Bello</div>
                    <span className="font-bold text-slate-700 block mt-1">Principal Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Directory & Class Registers</h3>
                <p className="text-xs text-slate-500">School student records organized by class, stream, and admission number</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBulkCSVType('students');
                    setShowBulkCSVModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Upload student rosters in bulk using CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Bulk Import CSV
                </button>
                <button
                  onClick={() => {
                    setBulkExportTab('students');
                    setShowBulkExportModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Export student rosters to CSV spreadsheet"
                >
                  <Download className="w-4 h-4" /> Bulk Export CSV
                </button>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Register New Student
                </button>
              </div>
            </div>

            {/* Class-Based Records Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Class Filter:</span>
              <button
                onClick={() => setSelectedClassFilter('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedClassFilter === ''
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Classes ({students.length})
              </button>
              {classes.map((c) => {
                const count = students.filter(s => s.class_id === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassFilter(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedClassFilter === c.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedClassFilter === c.id ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name or admission number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {selectedClassFilter && (
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredStudents.length} of {students.filter(s => s.class_id === selectedClassFilter).length} students in {classes.find(c => c.id === selectedClassFilter)?.name}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Admission No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Gender</th>
                  <th className="py-3 px-3">Class & Arm</th>
                  <th className="py-3 px-3">Parent / Contact</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No students found {selectedClassFilter ? `for class "${classes.find(c => c.id === selectedClassFilter)?.name}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">{std.admission_number}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{std.full_name}</td>
                      <td className="py-3 px-3 text-slate-600">{std.gender}</td>
                      <td className="py-3 px-3 text-slate-800">{std.class_name} {std.arm_name && `(${std.arm_name})`}</td>
                      <td className="py-3 px-3 text-slate-600">{std.parent_name || 'N/A'}</td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onOpenReportCard(std.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Report Card
                        </button>
                        <button
                          onClick={() => {
                            setEditingStudent({
                              id: std.id,
                              admission_number: std.admission_number,
                              full_name: std.full_name,
                              gender: std.gender,
                              date_of_birth: (std as any).date_of_birth || '',
                              enrollment_status: (std as any).enrollment_status || 'active',
                              class_id: std.class_id,
                              arm_id: std.arm_id || '',
                              parent_name: std.parent_name || '',
                              parent_phone: std.parent_phone || '',
                              parent_email: std.parent_email || '',
                              address: std.address || ''
                            });
                            setShowEditStudentModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Student Information"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(std.id, std.full_name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Student Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CLASSES & SUBJECTS */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configured Classes & Arms</h3>
              <p className="text-xs text-slate-500">Manage academic levels, streams, and class arms for your school</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddClassModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Class
              </button>
              <button
                onClick={() => {
                  if (classes.length === 0) {
                    alert('Please add a class first before creating arms.');
                    return;
                  }
                  setNewArm(prev => ({ ...prev, class_id: classes[0].id, name: '' }));
                  setShowAddArmModal(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Arm / Stream
              </button>
              <button
                onClick={handleBootstrapStarterData}
                disabled={bootstrapLoading}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Populate standard curriculum, classes, arms and sample students automatically"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{bootstrapLoading ? 'Initializing...' : '⚡ Initialize Standard Curriculum'}</span>
              </button>
            </div>
          </div>

          {classes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">No Classes Configured Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You can create your classes manually or use the 1-click starter curriculum initializer to populate standard classes, subjects, and arms for your school level.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowAddClassModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add First Class
                </button>
                <button
                  onClick={handleBootstrapStarterData}
                  disabled={bootstrapLoading}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{bootstrapLoading ? 'Initializing...' : 'Initialize Standard Classes & Arms'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((c) => {
                const classArms = arms.filter((a) => a.class_id === c.id);
                return (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{c.level}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-medium text-slate-400">
                            {students.filter(s => s.class_id === c.id).length} Students
                          </span>
                          <button
                            onClick={() => {
                              setEditingClass({ id: c.id, name: c.name, level: c.level });
                              setShowEditClassModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit Class"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c.id, c.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{c.name}</h4>
                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Arms / Streams:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {classArms.length > 0 ? (
                            classArms.map((a) => (
                              <span key={a.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                                {a.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No arms (Default Single Stream)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setNewArm({ class_id: c.id, name: '' });
                          setShowAddArmModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Arm
                      </button>
                      <button
                        onClick={() => {
                          setNewStudent(prev => ({ ...prev, class_id: c.id, arm_id: classArms[0]?.id || '' }));
                          setShowAddStudentModal(true);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Enroll Student
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Academic Subjects</h3>
              <p className="text-xs text-slate-500">Curriculum subjects taught across classes</p>
            </div>
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map((sub) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start space-y-1">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">{sub.code || 'SUB-01'}</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">{sub.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingSubject({ id: sub.id, name: sub.name, code: sub.code || '' });
                      setShowEditSubjectModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Edit Subject"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub.id, sub.name)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SESSIONS & TERMS */}
      {activeTab === 'sessions' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-8">
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Academic Sessions</h3>
                <p className="text-xs text-slate-500">Configure academic school years (e.g. 2024/2025, 2025/2026)</p>
              </div>
              <button
                onClick={() => setShowAddSessionModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Academic Session
              </button>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-6 mt-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-2">No academic sessions added yet.</p>
                <button
                  onClick={() => setShowAddSessionModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add First Session
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-sm font-bold text-slate-900">{sess.name}</span>
                    {sess.is_current ? (
                      <span className="inline-block text-[10px] text-emerald-700 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Current Active Session
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Academic Terms</h3>
                <p className="text-xs text-slate-500">First, Second, and Third terms linked to school sessions</p>
              </div>
              <button
                onClick={() => {
                  if (sessions.length === 0) {
                    alert('Please create an academic session first.');
                    return;
                  }
                  setNewTerm(prev => ({ ...prev, session_id: sessions[0].id }));
                  setShowAddTermModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Academic Term
              </button>
            </div>

            {terms.length === 0 ? (
              <div className="p-6 mt-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-2">No academic terms configured yet.</p>
                <button
                  onClick={() => {
                    if (sessions.length === 0) {
                      alert('Please create an academic session first.');
                      return;
                    }
                    setShowAddTermModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add First Term
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {terms.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-sm font-bold text-slate-900">{t.name}</span>
                    <span className="block text-xs text-slate-500">Resumption: {t.next_term_resumption || 'TBD'}</span>
                    {t.is_current ? (
                      <span className="inline-block text-[10px] text-emerald-700 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Current Active Term
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. GRADING SCALE CONFIGURATION */}
      {activeTab === 'grading' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Grading System & Continuous Assessment Weights</h3>
            <p className="text-xs text-slate-500">
              Customize your school's assessment policy (e.g. 1st C.A 10 or 15 marks, 2nd C.A, Terminal Exam). Rules are applied automatically across all student score calculations and report cards.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Grading Boundaries */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Academic Grading Boundaries (WAEC / Standard)</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Grade</th>
                      <th className="py-2.5 px-3 text-left">Min Score</th>
                      <th className="py-2.5 px-3 text-left">Max Score</th>
                      <th className="py-2.5 px-3 text-left">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grading?.scales?.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-blue-900">{s.grade}</td>
                        <td className="py-2 px-3 font-mono">{s.min_score}</td>
                        <td className="py-2 px-3 font-mono">{s.max_score}</td>
                        <td className="py-2 px-3 text-slate-600">{s.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Editable Continuous Assessment Weights */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Continuous Assessment Weights</h4>
                  <p className="text-[11px] text-slate-500">Configure your school's 1st C.A, 2nd C.A, 3rd C.A/Project, and Exam marks</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    (customWeights.reduce((acc, w) => acc + (Number(w.max_score) || 0), 0) === 100)
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    Total: {customWeights.reduce((acc, w) => acc + (Number(w.max_score) || 0), 0)} / 100 Marks
                  </span>
                </div>
              </div>

              {weightsSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{weightsSuccessMsg}</span>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '10 / 10 / 10 / 70 (Standard)', weights: [{ code: 'ca1', name: '1st Continuous Assessment', max_score: 10 }, { code: 'ca2', name: '2nd Continuous Assessment', max_score: 10 }, { code: 'ca3', name: 'Assignment / Project', max_score: 10 }, { code: 'exam', name: 'Terminal Examination', max_score: 70 }] },
                    { label: '15 / 15 / 10 / 60 (Dual CA + Project)', weights: [{ code: 'ca1', name: '1st Continuous Assessment', max_score: 15 }, { code: 'ca2', name: '2nd Continuous Assessment', max_score: 15 }, { code: 'ca3', name: 'Assignment / Project', max_score: 10 }, { code: 'exam', name: 'Terminal Examination', max_score: 60 }] },
                    { label: '20 / 20 / 60 (Two 20 C.A)', weights: [{ code: 'ca1', name: '1st Continuous Assessment', max_score: 20 }, { code: 'ca2', name: '2nd Continuous Assessment', max_score: 20 }, { code: 'ca3', name: 'Project Work', max_score: 0 }, { code: 'exam', name: 'Terminal Examination', max_score: 60 }] },
                    { label: '30 / 70 (Single CA)', weights: [{ code: 'ca1', name: 'Continuous Assessment', max_score: 30 }, { code: 'ca2', name: 'Mid-Term Test', max_score: 0 }, { code: 'ca3', name: 'Practical', max_score: 0 }, { code: 'exam', name: 'Terminal Examination', max_score: 70 }] },
                    { label: '40 / 60 (Primary School)', weights: [{ code: 'ca1', name: '1st Test', max_score: 20 }, { code: 'ca2', name: '2nd Test / Homework', max_score: 20 }, { code: 'ca3', name: 'Project', max_score: 0 }, { code: 'exam', name: 'Terminal Examination', max_score: 60 }] }
                  ].map((p, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setCustomWeights(p.weights)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Weights Form */}
              <form onSubmit={handleSaveAssessmentWeights} className="space-y-3 pt-2">
                <div className="space-y-2">
                  {customWeights.map((w: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-0.5">
                          {w.code.toUpperCase()} Component Name
                        </label>
                        <input
                          type="text"
                          value={w.name}
                          onChange={(e) => {
                            const updated = [...customWeights];
                            updated[idx].name = e.target.value;
                            setCustomWeights(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                        />
                      </div>
                      <div className="w-28 text-right">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                          Max Marks
                        </label>
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={w.max_score}
                            onChange={(e) => {
                              const updated = [...customWeights];
                              updated[idx].max_score = parseInt(e.target.value) || 0;
                              setCustomWeights(updated);
                            }}
                            className="w-16 px-2 py-1.5 text-center font-mono font-bold text-blue-900 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                          />
                          <span className="text-slate-400 font-bold">/ 100</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingWeights}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingWeights ? 'Saving Weights...' : 'Save Assessment Structure'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 6. RESULT MANAGEMENT CENTRE */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Result Management Centre Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5" /> High-Accuracy Result Engine & Layout Matcher
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automatic Total, Average & Position Calculations</span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Result Management Centre
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Manage your created classes and students in one unified workspace. Enter marks with real-time recalculation, run the authoritative class ranking engine to compute terminal averages and positions, and generate bespoke report cards matching your school's exact sample sheet.
              </p>
            </div>

            {/* Empty State Banner if no classes or terms configured */}
            {(classes.length === 0 || terms.length === 0) && (
              <div className="bg-amber-500/20 border border-amber-400/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-amber-200">Getting Started with Result Management</h4>
                  <p className="text-amber-100/80 text-[11px] mt-0.5">
                    Your school needs classes, academic terms, and subjects to begin entering continuous assessments and exam marks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddClassModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    + Add Class
                  </button>
                  <button
                    onClick={handleBootstrapStarterData}
                    disabled={bootstrapLoading}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{bootstrapLoading ? 'Initializing...' : '⚡ Initialize Standard Curriculum'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Context Selectors Bar */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Class *</label>
                <select
                  value={scoreClassId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setScoreClassId(cId);
                    setPublishClassId(cId);
                    loadScoreSheet(cId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                >
                  {classes.length === 0 ? (
                    <option value="">No Classes Configured</option>
                  ) : (
                    classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Arm / Stream</label>
                <select
                  value={scoreArmId}
                  onChange={(e) => {
                    const aId = e.target.value;
                    setScoreArmId(aId);
                    loadScoreSheet(scoreClassId, aId, scoreSubjectId, scoreTermId, scoreSessionId);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                >
                  <option value="">All Arms</option>
                  {arms.filter(a => !scoreClassId || a.class_id === scoreClassId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Term *</label>
                <select
                  value={scoreTermId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setScoreTermId(tId);
                    setPublishTermId(tId);
                    loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, tId, scoreSessionId);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                >
                  {terms.length === 0 ? (
                    <option value="">No Terms Configured</option>
                  ) : (
                    terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Session *</label>
                <select
                  value={scoreSessionId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setScoreSessionId(sId);
                    setPublishSessionId(sId);
                    loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, sId);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                >
                  {sessions.length === 0 ? (
                    <option value="">No Sessions Configured</option>
                  ) : (
                    sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Subject (For Mark Entry)</label>
                <select
                  value={scoreSubjectId}
                  onChange={(e) => {
                    const subId = e.target.value;
                    setScoreSubjectId(subId);
                    loadScoreSheet(scoreClassId, scoreArmId, subId, scoreTermId, scoreSessionId);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                >
                  {subjects.length === 0 ? (
                    <option value="">No Subjects Configured</option>
                  ) : (
                    subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Sub-Workflow Navigation Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto space-x-2 pt-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none touch-pan-x">
              {[
                { id: 'marks', label: '1. Mark Entry & Live Calculation', icon: Edit3 },
                { id: 'activities', label: '2. Student Activities (A–E)', icon: Award },
                { id: 'compile', label: '3. Automated Position & Average Engine', icon: Calculator },
                { id: 'sample', label: '4. Sample Sheet Matcher & Layout', icon: Sparkles },
                { id: 'cards', label: '5. Generated Cards & Broadsheet', icon: FileText },
              ].map((sub) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setResultSubTab(sub.id as any);
                      if (sub.id === 'marks') {
                        loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
                      } else if (sub.id === 'activities') {
                        loadAdminActivities(scoreClassId, scoreArmId, scoreTermId, scoreSessionId);
                      } else if (sub.id === 'compile' || sub.id === 'cards') {
                        loadBroadsheetData(scoreClassId, scoreArmId, scoreTermId, scoreSessionId);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 ${
                      resultSubTab === sub.id
                        ? 'border-amber-400 text-white bg-white/10'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          {scoreMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scoreMessage}</span>
            </div>
          )}
          {scoreError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{scoreError}</span>
            </div>
          )}
          {publishMessage && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
              <Award className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{publishMessage}</span>
            </div>
          )}

          {/* SUB-TAB 1: MARK ENTRY & REAL-TIME CALCULATION */}
          {resultSubTab === 'marks' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {classes.find(c => c.id === scoreClassId)?.name || 'Class'} • {subjects.find(s => s.id === scoreSubjectId)?.name || 'Subject'}
                    </span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {scoreRows.length} Enrolled Students
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Continuous Assessment & Examination Mark Sheet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Math is computed instantaneously on keystroke based on your configured weights: CA1 ({grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10}) + CA2 ({grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10}) + CA3 ({grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10}) + Exam ({grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70}) = Total ({(grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70)}).
                  </p>
                </div>

                {/* Mark Sheet Quick Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setBulkCSVType('grades');
                      setShowBulkCSVModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Import continuous assessment marks and exam scores in bulk via CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Grades (CSV)</span>
                  </button>

                  <button
                    onClick={() => {
                      setBulkExportTab('scores');
                      setShowBulkExportModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Export continuous assessment marks and exam scores to CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Scores (CSV)</span>
                  </button>

                  <button
                    onClick={handleQuickFillBenchmark}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition cursor-pointer"
                    title="Populate diverse benchmark scores across students for instant testing"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto-Fill Benchmark Marks</span>
                  </button>

                  <button
                    onClick={handleClearScores}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Reset values on screen"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Sheet</span>
                  </button>

                  <button
                    onClick={handleDeleteAllSubjectMarks}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Permanently delete all recorded marks for this subject in the database"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Marks</span>
                  </button>

                  <button
                    onClick={() => loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId)}
                    disabled={scoreLoading}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                    title="Refresh score matrix"
                  >
                    <RefreshCw className={`w-4 h-4 ${scoreLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleSaveScoreSheet('draft')}
                    disabled={scoreSaving}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Save as Draft
                  </button>

                  <button
                    onClick={() => handleSaveScoreSheet('approved')}
                    disabled={scoreSaving}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{scoreSaving ? 'Saving...' : 'Save & Approve Marks'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setResultSubTab('compile');
                      loadBroadsheetData(scoreClassId, scoreArmId, scoreTermId, scoreSessionId);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Compilation →</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Student Name & Admission No.</th>
                      <th className="py-2.5 px-2 w-24 text-center">
                        CA 1 ({grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10})
                      </th>
                      <th className="py-2.5 px-2 w-24 text-center">
                        CA 2 ({grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10})
                      </th>
                      <th className="py-2.5 px-2 w-24 text-center">
                        CA 3 ({grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10})
                      </th>
                      <th className="py-2.5 px-2 w-28 text-center">
                        Exam ({grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70})
                      </th>
                      <th className="py-2.5 px-2 w-24 text-center bg-blue-50/50 text-blue-900">
                        Total ({(grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10) + (grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70)})
                      </th>
                      <th className="py-2.5 px-2 w-20 text-center">Grade</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Remark</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Teacher / Examiner Comment</th>
                      <th className="py-2.5 px-2 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scoreLoading ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Loading class student score sheet...
                        </td>
                      </tr>
                    ) : scoreRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500">
                          <div className="max-w-md mx-auto space-y-2.5">
                            <p className="font-bold text-slate-800 text-sm">
                              No enrolled students found in {classes.find(c => c.id === scoreClassId)?.name || 'this class'}.
                            </p>
                            <p className="text-xs text-slate-500">
                              Enroll students into this class to enter marks, or auto-generate starter students and benchmark scores.
                            </p>
                            <div className="flex flex-wrap justify-center items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setNewStudent((prev) => ({
                                    ...prev,
                                    class_id: scoreClassId || (classes[0]?.id || ''),
                                    arm_id: scoreArmId || ''
                                  }));
                                  setShowAddStudentModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>+ Enroll Student in Class</span>
                              </button>
                              <button
                                onClick={handleBootstrapStarterData}
                                disabled={bootstrapLoading}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{bootstrapLoading ? 'Generating...' : 'Auto-Generate Sample Students'}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      scoreRows.map((row, idx) => {
                        const total = Number(row.total) || 0;
                        const isHigh = total >= 75;
                        const isPass = total >= 50;
                        const isFail = total < 40;

                        const wCa1 = grading?.weights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10;
                        const wCa2 = grading?.weights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10;
                        const wCa3 = grading?.weights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10;
                        const wExam = grading?.weights?.find((w: any) => w.code === 'exam')?.max_score ?? 70;

                        return (
                          <tr key={row.student_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{row.full_name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{row.admission_number}</span>
                            </td>

                            {/* CA 1 */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa1}
                                step={1}
                                value={row.ca1 === 0 ? '' : row.ca1}
                                onChange={(e) => handleScoreChange(idx, 'ca1', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-16 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>

                            {/* CA 2 */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa2}
                                step={1}
                                value={row.ca2 === 0 ? '' : row.ca2}
                                onChange={(e) => handleScoreChange(idx, 'ca2', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-16 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>

                            {/* CA 3 */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={wCa3}
                                step={1}
                                value={row.ca3 === 0 ? '' : row.ca3}
                                onChange={(e) => handleScoreChange(idx, 'ca3', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-16 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>

                            {/* EXAM */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={wExam}
                                step={1}
                                value={row.exam === 0 ? '' : row.exam}
                                onChange={(e) => handleScoreChange(idx, 'exam', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                              />
                            </td>

                            {/* CALCULATED TOTAL */}
                            <td className="py-2.5 px-2 text-center bg-blue-50/30">
                              <span className={`font-mono font-black text-xs ${
                                isHigh ? 'text-emerald-700' : isPass ? 'text-blue-700' : isFail ? 'text-rose-600' : 'text-slate-700'
                              }`}>
                                {total}
                              </span>
                            </td>

                            {/* GRADE BADGE */}
                            <td className="py-2.5 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded font-black text-[11px] font-mono ${
                                isHigh ? 'bg-emerald-100 text-emerald-800' : isPass ? 'bg-blue-100 text-blue-800' : isFail ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {row.grade || 'F9'}
                              </span>
                            </td>

                            {/* REMARK */}
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-semibold text-slate-700">
                                {row.remark || 'Fail'}
                              </span>
                            </td>

                            {/* COMMENT */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.teacher_comment || ''}
                                onChange={(e) => {
                                  const updated = [...scoreRows];
                                  updated[idx].teacher_comment = e.target.value;
                                  setScoreRows(updated);
                                }}
                                placeholder="Optional remarks..."
                                className="w-full px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                              />
                            </td>

                            {/* ACTION: DELETE/RESET SCORE */}
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleDeleteStudentMark(row.student_id, row.full_name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`Delete/Reset score for ${row.full_name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Real-time Math Summary Footer */}
              {scoreRows.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Enrolled in Class:</span>
                      <span className="font-bold text-slate-800">{scoreRows.length} Students</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Subject Average:</span>
                      <span className="font-bold text-blue-800 font-mono">
                        {Math.round((scoreRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0) / scoreRows.length) * 10) / 10}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Highest Score:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {Math.max(...scoreRows.map(r => Number(r.total) || 0))} Marks
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Lowest Score:</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {Math.min(...scoreRows.map(r => Number(r.total) || 0))} Marks
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveScoreSheet('approved')}
                      disabled={scoreSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                    >
                      Save Marks
                    </button>
                    <button
                      onClick={() => {
                        setResultSubTab('compile');
                        loadBroadsheetData(scoreClassId, scoreArmId, scoreTermId, scoreSessionId);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                    >
                      Compile Class Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB: STUDENT ACTIVITIES (BEHAVIOURAL & PSYCHOMOTOR A TO E) */}
          {resultSubTab === 'activities' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                      Affective & Psychomotor Grading Scale (A to E)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      Class Student Behavioural Attributes & Psychomotor Skills
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official Scale: <span className="font-semibold text-emerald-700">A - Excellent</span> | <span className="font-semibold text-blue-700">B - Very Good</span> | <span className="font-semibold text-cyan-700">C - Good</span> | <span className="font-semibold text-amber-700">D - Fair</span> | <span className="font-semibold text-rose-700">E - Poor</span>. Teachers and Admins can mark students individually or click Auto-Mark.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleAdminAutomarkActivities}
                      disabled={adminActivitiesAutomarking}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                      title="Automatically mark all students according to their current academic average"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{adminActivitiesAutomarking ? 'Automarking...' : '⚡ Auto-Mark from Academic Performance'}</span>
                    </button>

                    <button
                      onClick={handleAdminSaveActivities}
                      disabled={adminActivitiesSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{adminActivitiesSaving ? 'Saving...' : 'Save Activities (A–E)'}</span>
                    </button>
                  </div>
                </div>

                {adminActivitiesLoading ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading student activities register...
                  </div>
                ) : adminActivities.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    No active students enrolled in this class or term.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-2">Avg</th>
                          <th className="py-2.5 px-1.5 text-center">Punctuality</th>
                          <th className="py-2.5 px-1.5 text-center">Neatness</th>
                          <th className="py-2.5 px-1.5 text-center">Politeness</th>
                          <th className="py-2.5 px-1.5 text-center">Honesty</th>
                          <th className="py-2.5 px-1.5 text-center">Attentiveness</th>
                          <th className="py-2.5 px-1.5 text-center">Leadership</th>
                          <th className="py-2.5 px-1.5 text-center border-l border-slate-200">Handwriting</th>
                          <th className="py-2.5 px-1.5 text-center">Sports</th>
                          <th className="py-2.5 px-1.5 text-center">Crafts</th>
                          <th className="py-2.5 px-1.5 text-center">Speaking</th>
                          <th className="py-2.5 px-1.5 text-center">Practical</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminActivities.map((row, idx) => (
                          <tr key={row.student_id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              <div>{row.full_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{row.admission_number}</div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {row.average_score}%
                              </span>
                            </td>

                            {/* Behavioural Attributes (A to E) */}
                            {['punctuality', 'neatness', 'politeness', 'honesty', 'attentiveness', 'leadership'].map((trait) => (
                              <td key={trait} className="py-2 px-1 text-center">
                                <select
                                  value={row[trait] || 'A'}
                                  onChange={(e) => handleAdminActivityChange(idx, trait, e.target.value)}
                                  className="px-1.5 py-1 text-center font-bold text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  {['A', 'B', 'C', 'D', 'E'].map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </td>
                            ))}

                            {/* Psychomotor Skills (A to E) */}
                            {['handwriting', 'sports', 'crafts', 'speaking', 'practical'].map((skill, sIdx) => (
                              <td key={skill} className={`py-2 px-1 text-center ${sIdx === 0 ? 'border-l border-slate-200' : ''}`}>
                                <select
                                  value={row[skill] || 'A'}
                                  onChange={(e) => handleAdminActivityChange(idx, skill, e.target.value)}
                                  className="px-1.5 py-1 text-center font-bold text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  {['A', 'B', 'C', 'D', 'E'].map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: AUTOMATED POSITION & AVERAGE ENGINE */}
          {resultSubTab === 'compile' && (
            <div className="space-y-6">
              {/* Engine Explainer Card */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-2xl space-y-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                      Authoritative Terminal Computation
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Class Position & Cumulative Terminal Average Engine
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This calculation engine aggregates every student's approved subject marks, computes cumulative totals, calculates terminal averages, applies dense tie ranking (1st, 2nd, 3rd...), and automatically generates cryptographic Result Verification PINs.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCompileAndPublish}
                      disabled={publishLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-300" />
                      <span>{publishLoading ? 'Executing Calculation Engine...' : 'Compile, Rank & Publish Results'}</span>
                    </button>

                    <button
                      onClick={() => onOpenBroadsheet(scoreClassId || publishClassId, scoreTermId || publishTermId, scoreSessionId || publishSessionId)}
                      className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>Open Master Broadsheet</span>
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                {broadsheetData?.termResults && broadsheetData.termResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Total Enrolled</span>
                      <span className="text-xl font-black text-slate-900 mt-0.5 block">{broadsheetData.termResults.length} Students</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Class Terminal Average</span>
                      <span className="text-xl font-black text-blue-700 font-mono mt-0.5 block">
                        {Math.round(
                          (broadsheetData.termResults.reduce((acc: number, r: any) => acc + (r.average_score || 0), 0) /
                            broadsheetData.termResults.length) * 10
                        ) / 10}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Top Total Score</span>
                      <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                        {Math.max(...broadsheetData.termResults.map((r: any) => r.total_score || 0))} Marks
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Lowest Total Score</span>
                      <span className="text-xl font-black text-rose-600 font-mono mt-0.5 block">
                        {Math.min(...broadsheetData.termResults.map((r: any) => r.total_score || 0))} Marks
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ranked Class Standings Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Ranked Class Standings ({classes.find(c => c.id === scoreClassId)?.name || 'Class'})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ranked with dense tie handling. Click on any student to view their bespoke Report Card matching your sample layout.
                    </p>
                  </div>

                  <button
                    onClick={() => loadBroadsheetData(scoreClassId, scoreArmId, scoreTermId, scoreSessionId)}
                    disabled={broadsheetLoading}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                    title="Refresh standings"
                  >
                    <RefreshCw className={`w-4 h-4 ${broadsheetLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-16 text-center">Rank</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Student Full Name</th>
                        <th className="py-2.5 px-3 text-center">Admission No.</th>
                        <th className="py-2.5 px-3 text-center">Total Marks</th>
                        <th className="py-2.5 px-3 text-center">Terminal Avg %</th>
                        <th className="py-2.5 px-3 text-center">Academic Standing</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {broadsheetLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                            Loading compiled class standings...
                          </td>
                        </tr>
                      ) : !broadsheetData?.termResults || broadsheetData.termResults.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            Results for this class have not yet been compiled. Enter student marks in Tab 1, then click "Compile, Rank & Publish Results" above.
                          </td>
                        </tr>
                      ) : (
                        broadsheetData.termResults.map((tr: any) => {
                          const isTop3 = tr.position <= 3;
                          const avg = Number(tr.average_score) || 0;
                          const isDistinction = avg >= 75;
                          const isPass = avg >= 50;

                          return (
                            <tr key={tr.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                                  tr.position === 1
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                                    : tr.position === 2
                                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                    : tr.position === 3
                                    ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                    : 'text-slate-500 font-mono'
                                }`}>
                                  {tr.position}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 block">{tr.full_name}</span>
                                <span className="text-[11px] text-slate-400 capitalize">{tr.gender || 'Student'}</span>
                              </td>

                              <td className="py-3 px-3 text-center font-mono text-slate-600">
                                {tr.admission_number}
                              </td>

                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                                {tr.total_score}
                              </td>

                              <td className="py-3 px-3 text-center font-mono font-black text-blue-700">
                                {tr.average_score}%
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isDistinction
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPass
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isDistinction ? 'Distinction' : isPass ? 'Pass' : 'Remedial'}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => onOpenReportCard(tr.student_id)}
                                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    <span>View Report Card</span>
                                  </button>

                                  <button
                                    onClick={() => onOpenReportCard(tr.student_id)}
                                    className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                    title="Print student report"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: SAMPLE SHEET MATCHER & AI LAYOUT */}
          {resultSubTab === 'sample' && (
            <div className="space-y-6">
              {/* Header Description */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-2xl space-y-1">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                      Sample Result Sheet Replication
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Match Your School's Exact Physical Result Sheet
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Upload an image or scan of your school's existing paper result sheet. AcademiQ's vision engine will analyze its crest position, headers, color theme, borders, affective/psychomotor domains, and principal seal—guaranteeing 100% accurate printable report cards.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingTemplate ? 'Saving Layout...' : 'Save Result Layout & Badge'}</span>
                    </button>
                  </div>
                </div>

                {templateSaveSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{templateSaveSuccess}</span>
                  </div>
                )}
              </div>

              {/* Upload & AI Analysis Box */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Upload Sample Result */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>1. Upload Sample Result Sheet (Photo or Scan)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Snap a photo of your paper report card or upload a sample PDF/PNG so AcademiQ can mirror the design.
                  </p>

                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/50">
                    {sampleImage ? (
                      <div className="space-y-3">
                        <img
                          src={sampleImage}
                          alt="Uploaded Sample"
                          className="max-h-60 mx-auto rounded-xl border border-slate-200 object-contain shadow-xs bg-white"
                        />
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <label className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                            Change Photo
                            <input type="file" accept="image/*" onChange={handleUploadSample} className="hidden" />
                          </label>
                          <button
                            onClick={handleAnalyzeSample}
                            disabled={sampleAnalyzing}
                            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{sampleAnalyzing ? 'Analyzing with AI...' : 'Analyze Sample with AI'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 block">Click to upload sample result sheet</span>
                        <span className="text-[11px] text-slate-500 block">JPG, PNG, WebP up to 10MB</span>
                        <input type="file" accept="image/*" onChange={handleUploadSample} className="hidden" />
                      </label>
                    )}
                  </div>

                  {analysisResult && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2 text-emerald-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>AI Template Layout Generated!</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">{analysisResult.message}</p>
                      {analysisResult.detectedFeatures?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Detected Elements:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.detectedFeatures.map((feat, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                ✓ {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. School Badge / Crest Studio */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>2. School Crest & Official Badge</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Uploaded badge appears on the official report card header and as a subtle anti-counterfeit watermark behind the score table.
                  </p>

                  <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 p-2 shadow-xs flex items-center justify-center shrink-0">
                      {schoolBadge ? (
                        <img src={schoolBadge} alt="School Crest" className="w-full h-full object-contain" />
                      ) : (
                        <Shield className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="inline-block px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                        Upload School Crest
                        <input type="file" accept="image/*" onChange={handleBadgeUpload} className="hidden" />
                      </label>
                      <p className="text-[11px] text-slate-500">Transparent PNG or SVG recommended</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">Or Select Academy Crest Preset:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_BADGES.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => setSchoolBadge(b.svg)}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                            schoolBadge === b.svg ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <img src={b.svg} alt={b.name} className="w-8 h-8 object-contain" />
                          <span className="text-[10px] font-semibold text-slate-700 truncate w-full">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Fine-Tuning Controls */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-600" />
                  <span>3. Layout Fine-Tuning & Styling Parameters</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Crest / Header Layout</label>
                    <select
                      value={template.headerLayout}
                      onChange={(e) => setTemplate({ ...template, headerLayout: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-hidden"
                    >
                      <option value="crest_center">Crest Top Center</option>
                      <option value="badge_left">Crest Left / School Info Right</option>
                      <option value="dual_crest">Dual Crests (School + State Seal)</option>
                      <option value="modern_banner">Modern Color Banner Header</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Score Table Border Style</label>
                    <select
                      value={template.tableStyle}
                      onChange={(e) => setTemplate({ ...template, tableStyle: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-hidden"
                    >
                      <option value="classic_bordered">Classic Full Grid (WAEC Standard)</option>
                      <option value="modern_clean">Modern Minimal Clean Lines</option>
                      <option value="waec_grid">WAEC High-Density Evaluation Matrix</option>
                      <option value="cambridge_compact">Cambridge Compact Layout</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary School Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={template.primaryColor || '#1e3a8a'}
                        onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={template.primaryColor || '#1e3a8a'}
                        onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={template.accentColor || '#f59e0b'}
                        onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={template.accentColor || '#f59e0b'}
                        onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official School Motto</label>
                    <input
                      type="text"
                      value={template.schoolMotto || ''}
                      onChange={(e) => setTemplate({ ...template, schoolMotto: e.target.value })}
                      placeholder="e.g. Knowledge, Integrity and Excellence"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Report Card Subtitle Note</label>
                    <input
                      type="text"
                      value={template.customHeaderNote || ''}
                      onChange={(e) => setTemplate({ ...template, customHeaderNote: e.target.value })}
                      placeholder="e.g. Official Terminal Continuous Assessment & Examination Report"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={template.showWatermark ?? true}
                      onChange={(e) => setTemplate({ ...template, showWatermark: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Watermark Crest in Score Background</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={template.showAffectiveDomain ?? true}
                      onChange={(e) => setTemplate({ ...template, showAffectiveDomain: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Affective Domain (Punctuality, Honesty, Leadership)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={template.showPsychomotorDomain ?? true}
                      onChange={(e) => setTemplate({ ...template, showPsychomotorDomain: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Psychomotor Domain (Handwriting, Sports, Crafts)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={template.showPrincipalStamp ?? true}
                      onChange={(e) => setTemplate({ ...template, showPrincipalStamp: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Principal Signature & Official School Stamp</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: GENERATED CARDS & BROADSHEET */}
          {resultSubTab === 'cards' && (
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Generated Student Report Cards ({classes.find(c => c.id === scoreClassId)?.name || 'Class'})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instantly preview, download PDF, or send to physical A4 printers with the school's badge and verified layout.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenBroadsheet(scoreClassId, scoreTermId, scoreSessionId)}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Open Master Broadsheet</span>
                  </button>
                </div>
              </div>

              {/* Student Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students
                  .filter(s => !scoreClassId || s.class_id === scoreClassId)
                  .map((std, idx) => (
                    <div
                      key={std.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {std.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">{std.full_name}</h4>
                            <span className="text-[11px] text-slate-500 font-mono">{std.admission_number}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {std.gender || 'Student'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Class Enrolled:</span>
                        <span className="font-semibold text-slate-800">
                          {classes.find(c => c.id === std.class_id)?.name || 'Class'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => onOpenReportCard(std.id)}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report Card</span>
                        </button>

                        <button
                          onClick={() => onOpenReportCard(std.id)}
                          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                          title="Print report card"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. FINANCE & FEES */}
      {activeTab === 'finance' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">School Fees & Receipt History</h3>
              <p className="text-xs text-slate-500">Track student tuition levies, payments, and generated receipts</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500">Active Fee Categories:</span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                Tuition & Development (₦65,000) • ICT & Science Lab (₦15,000)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. ATTENDANCE REGISTER */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Class Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record daily presence, absences, and lateness. Records are securely stored in the multi-school database and reflected on report cards.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAdminMarkAllPresent}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark All Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkExportTab('attendance');
                    setShowBulkExportModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Export attendance records to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Attendance (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdminSaveAttendance}
                  disabled={attSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{attSaving ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>
            </div>

            {/* Filter Bar: Class & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Class *</label>
                <select
                  value={attClassId || (classes[0]?.id || '')}
                  onChange={(e) => {
                    setAttClassId(e.target.value);
                    loadAdminAttendance(e.target.value, attDate);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date *</label>
                <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => {
                      setAttDate(e.target.value);
                      loadAdminAttendance(attClassId, e.target.value);
                    }}
                    className="w-full text-xs font-semibold bg-transparent border-none focus:outline-hidden text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-[11px] font-semibold text-slate-500 mb-1">Total Enrolled in Class:</span>
                <span className="font-bold text-sm text-slate-900">{attEntries.length} Students</span>
              </div>
            </div>

            {/* Attendance Status Summary Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                Present: <strong>{attEntries.filter(e => e.status === 'present').length}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                Absent: <strong>{attEntries.filter(e => e.status === 'absent').length}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                Late: <strong>{attEntries.filter(e => e.status === 'late').length}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                Excused: <strong>{attEntries.filter(e => e.status === 'excused').length}</strong>
              </span>
              <span className="ml-auto text-xs text-slate-500 font-mono">
                Presence Rate: <strong>{attEntries.length > 0 ? Math.round((attEntries.filter(e => e.status === 'present').length / attEntries.length) * 100) : 0}%</strong>
              </span>
            </div>

            {attMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{attMessage}</span>
              </div>
            )}
            {attError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{attError}</span>
              </div>
            )}

            {/* Attendance Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-2">Admission No</th>
                    <th className="py-2.5 px-3 text-center">Attendance Status</th>
                    <th className="py-2.5 px-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading class attendance register...
                      </td>
                    </tr>
                  ) : attEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <p className="font-bold text-slate-800 text-sm">No students found in this class.</p>
                        <p className="text-xs text-slate-500 mt-1">Enroll students into this class to record daily attendance.</p>
                      </td>
                    </tr>
                  ) : (
                    attEntries.map((e, idx) => (
                      <tr key={e.student_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{e.full_name}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-500">{e.admission_number}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                            {['present', 'absent', 'late', 'excused'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleAdminAttendanceStatusChange(idx, st)}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${
                                  e.status === st
                                    ? st === 'present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : st === 'late'
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : st === 'absent'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={e.remarks || ''}
                            placeholder="Optional reason e.g. Medical leave, Traffic"
                            onChange={(ev) => handleAdminAttendanceRemarksChange(idx, ev.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Attendance records are permanently stored in SQLite WAL and update terminal presence percentages.
              </span>
              <button
                type="button"
                onClick={handleAdminSaveAttendance}
                disabled={attSaving || attEntries.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{attSaving ? 'Saving Attendance...' : 'Save Daily Attendance Register'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT */}
      {showAddStudentModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddStudentModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register New Student</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  placeholder="e.g. Ibrahim Danjuma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={newStudent.admission_number}
                    onChange={(e) => setNewStudent({ ...newStudent, admission_number: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    value={newStudent.class_id}
                    onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arm (Optional)</label>
                  <select
                    value={newStudent.arm_id}
                    onChange={(e) => setNewStudent({ ...newStudent, arm_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    <option value="">No Arm / Default</option>
                    {arms.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent or Guardian Name</label>
                <input
                  type="text"
                  value={newStudent.parent_name}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                  placeholder="Alhaji Danjuma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-xs"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CLASS */}
      {showAddClassModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddClassModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Add New Class</h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JSS 2 or Primary 5"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
                <select
                  value={newClass.level}
                  onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                >
                  <option value="Nursery">Nursery</option>
                  <option value="Primary">Primary</option>
                  <option value="Junior Secondary">Junior Secondary</option>
                  <option value="Senior Secondary">Senior Secondary</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBJECT */}
      {showAddSubjectModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddSubjectModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Add Academic Subject</h3>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Further Mathematics"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. MTH202"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: ADD ACADEMIC SESSION */}
      {showAddSessionModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddSessionModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Add Academic Session</h3>
              <button
                type="button"
                onClick={() => setShowAddSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Session Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2024/2025 or 2025/2026"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="session_is_current"
                  checked={newSession.is_current}
                  onChange={(e) => setNewSession({ ...newSession, is_current: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="session_is_current" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as Current Active Session
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACADEMIC TERM */}
      {showAddTermModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddTermModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Add Academic Term</h3>
              <button
                type="button"
                onClick={() => setShowAddTermModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateTerm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session *</label>
                <select
                  required
                  value={newTerm.session_id || (sessions[0]?.id || '')}
                  onChange={(e) => setNewTerm({ ...newTerm, session_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden font-medium"
                >
                  {sessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>{sess.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Term Name *</label>
                <select
                  value={newTerm.name}
                  onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden font-medium"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                  <option value="Summer Term">Summer Term</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Term Resumption Date (Optional)</label>
                <input
                  type="date"
                  value={newTerm.next_term_resumption}
                  onChange={(e) => setNewTerm({ ...newTerm, next_term_resumption: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="term_is_current"
                  checked={newTerm.is_current}
                  onChange={(e) => setNewTerm({ ...newTerm, is_current: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="term_is_current" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as Current Active Term
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTermModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Save Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CLASS ARM / STREAM */}
      {showAddArmModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddArmModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Add Arm / Stream</h3>
              <button
                type="button"
                onClick={() => setShowAddArmModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateArm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class *</label>
                <select
                  required
                  value={newArm.class_id || (classes[0]?.id || '')}
                  onChange={(e) => setNewArm({ ...newArm, class_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Arm / Stream Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science, Art, Gold, A, or Blue"
                  value={newArm.name}
                  onChange={(e) => setNewArm({ ...newArm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddArmModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Save Arm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLASS */}
      {showEditClassModal && editingClass && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditClassModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Edit Class</h3>
              <button
                type="button"
                onClick={() => setShowEditClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JSS 2 or Primary 5"
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Level *</label>
                <select
                  value={editingClass.level}
                  onChange={(e) => setEditingClass({ ...editingClass, level: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                >
                  <option value="Nursery">Nursery</option>
                  <option value="Primary">Primary</option>
                  <option value="Junior Secondary">Junior Secondary</option>
                  <option value="Senior Secondary">Senior Secondary</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditClassModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUBJECT */}
      {showEditSubjectModal && editingSubject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditSubjectModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Edit Subject</h3>
              <button
                type="button"
                onClick={() => setShowEditSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. MTH101"
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Update Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {showEditStudentModal && editingStudent && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditStudentModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ibrahim Musa"
                  value={editingStudent.full_name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.admission_number}
                    onChange={(e) => setEditingStudent({ ...editingStudent, admission_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class *</label>
                  <select
                    value={editingStudent.class_id}
                    onChange={(e) => setEditingStudent({ ...editingStudent, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arm / Stream</label>
                  <select
                    value={editingStudent.arm_id}
                    onChange={(e) => setEditingStudent({ ...editingStudent, arm_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    <option value="">No Arm / Default</option>
                    {arms.filter(a => !editingStudent.class_id || a.class_id === editingStudent.class_id).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent or Guardian Name</label>
                <input
                  type="text"
                  value={editingStudent.parent_name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parent_name: e.target.value })}
                  placeholder="e.g. Alhaji Danjuma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={editingStudent.parent_phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })}
                    placeholder="08012345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Email</label>
                  <input
                    type="email"
                    value={editingStudent.parent_email || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_email: e.target.value })}
                    placeholder="parent@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal (Students & Grades) */}
      {showBulkCSVModal && (
        <BulkCSVImportModal
          type={bulkCSVType}
          isOpen={showBulkCSVModal}
          onClose={() => setShowBulkCSVModal(false)}
          onSuccess={() => {
            loadAllData();
            if (bulkCSVType === 'grades') {
              loadScoreSheet(scoreClassId, scoreArmId, scoreSubjectId, scoreTermId, scoreSessionId);
            }
            triggerAutoCloudSync();
          }}
          classes={classes}
          arms={arms}
          subjects={subjects}
          terms={terms}
          sessions={sessions}
          students={students}
          gradingWeights={{
            ca1: customWeights?.find((w: any) => w.code === 'ca1')?.max_score ?? 10,
            ca2: customWeights?.find((w: any) => w.code === 'ca2')?.max_score ?? 10,
            ca3: customWeights?.find((w: any) => w.code === 'ca3')?.max_score ?? 10,
            exam: customWeights?.find((w: any) => w.code === 'exam')?.max_score ?? 70,
          }}
          selectedClassId={scoreClassId}
          selectedSubjectId={scoreSubjectId}
          selectedTermId={scoreTermId}
          selectedSessionId={scoreSessionId}
          selectedArmId={scoreArmId}
        />
      )}

      {/* Bulk Export Modal (Students, Scores, Attendance, Full Backup) */}
      {showBulkExportModal && (
        <BulkExportModal
          isOpen={showBulkExportModal}
          onClose={() => setShowBulkExportModal(false)}
          defaultTab={bulkExportTab}
          classes={classes}
          arms={arms}
          subjects={subjects}
          terms={terms}
          sessions={sessions}
          students={students}
          schoolName={school?.name || 'School'}
          schoolId={school?.id}
          selectedClassId={scoreClassId}
          selectedArmId={scoreArmId}
          selectedSubjectId={scoreSubjectId}
          selectedTermId={scoreTermId}
          selectedSessionId={scoreSessionId}
        />
      )}
    </div>
  );
};
