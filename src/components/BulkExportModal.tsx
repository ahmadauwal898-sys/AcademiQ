import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  Award,
  Calendar,
  Database,
  X,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type ExportTabType = 'students' | 'scores' | 'broadsheet' | 'attendance' | 'backup';

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: any[];
  arms?: any[];
  subjects?: any[];
  terms?: any[];
  sessions?: any[];
  students?: any[];
  schoolName?: string;
  schoolId?: string;
  defaultTab?: ExportTabType;
  selectedClassId?: string;
  selectedArmId?: string;
  selectedSubjectId?: string;
  selectedTermId?: string;
  selectedSessionId?: string;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  arms = [],
  subjects = [],
  terms = [],
  sessions = [],
  students = [],
  schoolName = 'School',
  schoolId = '',
  defaultTab = 'students',
  selectedClassId = '',
  selectedArmId = '',
  selectedSubjectId = '',
  selectedTermId = '',
  selectedSessionId = ''
}) => {
  const [activeTab, setActiveTab] = useState<ExportTabType>(defaultTab);

  // Student filter states
  const [studentClassId, setStudentClassId] = useState<string>(selectedClassId || 'all');
  const [studentArmId, setStudentArmId] = useState<string>(selectedArmId || 'all');
  const [studentStatus, setStudentStatus] = useState<string>('all');

  // Scores filter states
  const [scoreClassId, setScoreClassId] = useState<string>(selectedClassId || classes[0]?.id || '');
  const [scoreArmId, setScoreArmId] = useState<string>(selectedArmId || 'all');
  const [scoreSubjectId, setScoreSubjectId] = useState<string>(selectedSubjectId || 'all');
  const [scoreTermId, setScoreTermId] = useState<string>(selectedTermId || terms[0]?.id || '');
  const [scoreSessionId, setScoreSessionId] = useState<string>(selectedSessionId || sessions[0]?.id || '');

  // Attendance filter states
  const [attClassId, setAttClassId] = useState<string>(selectedClassId || classes[0]?.id || 'all');
  const [attStartDate, setAttStartDate] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [attEndDate, setAttEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute live student matching count
  const matchingStudents = students.filter(s => {
    if (studentClassId !== 'all' && s.class_id !== studentClassId) return false;
    if (studentArmId !== 'all' && s.arm_id !== studentArmId) return false;
    if (studentStatus !== 'all' && s.enrollment_status !== studentStatus) return false;
    return true;
  });

  const getFilteredArms = (cId: string) => {
    if (!cId || cId === 'all') return arms;
    return arms.filter(a => a.class_id === cId);
  };

  const handleDownload = async (url: string, defaultFilename: string) => {
    setDownloading(true);
    setDownloadSuccess(null);
    try {
      const token = localStorage.getItem('multischool_auth_token') || '';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      // Extract filename from header or fallback
      const disposition = res.headers.get('content-disposition');
      let filename = defaultFilename;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      confetti({ particleCount: 50, spread: 55, origin: { y: 0.7 } });
      setDownloadSuccess(`Successfully downloaded "${filename}"!`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 1. Export Students CSV
  const exportStudentsCSV = () => {
    const params = new URLSearchParams();
    if (schoolId) params.append('school_id', schoolId);
    if (studentClassId) params.append('class_id', studentClassId);
    if (studentArmId) params.append('arm_id', studentArmId);
    if (studentStatus) params.append('status', studentStatus);

    const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Students_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    handleDownload(`/api/school/export-students-csv?${params.toString()}`, filename);
  };

  // 2. Export Scores CSV
  const exportScoresCSV = () => {
    const params = new URLSearchParams();
    if (schoolId) params.append('school_id', schoolId);
    if (scoreClassId) params.append('class_id', scoreClassId);
    if (scoreArmId) params.append('arm_id', scoreArmId);
    if (scoreSubjectId) params.append('subject_id', scoreSubjectId);
    if (scoreTermId) params.append('term_id', scoreTermId);
    if (scoreSessionId) params.append('session_id', scoreSessionId);

    const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Assessment_Scores_${new Date().toISOString().slice(0, 10)}.csv`;
    handleDownload(`/api/school/export-scores-csv?${params.toString()}`, filename);
  };

  // 3. Export Attendance CSV
  const exportAttendanceCSV = () => {
    const params = new URLSearchParams();
    if (schoolId) params.append('school_id', schoolId);
    if (attClassId) params.append('class_id', attClassId);
    if (attStartDate) params.append('start_date', attStartDate);
    if (attEndDate) params.append('end_date', attEndDate);

    const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Attendance_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    handleDownload(`/api/school/export-attendance-csv?${params.toString()}`, filename);
  };

  // 4. Export Full School Backup JSON
  const exportFullSchoolBackup = () => {
    const params = new URLSearchParams();
    if (schoolId) params.append('school_id', schoolId);
    const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Full_Academic_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    handleDownload(`/api/school/download-backup?${params.toString()}`, filename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Bulk Data Export Centre</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Universal CSV & JSON
                </span>
              </h2>
              <p className="text-xs text-slate-300">{schoolName} — High-speed spreadsheet & master archive downloads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'students'
                ? 'bg-white border-blue-600 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students Roster</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-semibold">
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scores')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'scores'
                ? 'bg-white border-blue-600 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Scores & Marks Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'attendance'
                ? 'bg-white border-blue-600 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Attendance Register</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'backup'
                ? 'bg-white border-blue-600 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Full Master Backup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {downloadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* TAB 1: STUDENTS DIRECTORY EXPORT */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Student Enrollment Roster Export</span>
                </div>
                <p className="text-slate-600">
                  Exports complete student demographic details including Admission Number, Full Name, Gender, Class, Arm, Date of Birth, Parent Contact, and Status directly to an Excel-ready CSV format.
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Class</label>
                  <select
                    value={studentClassId}
                    onChange={(e) => {
                      setStudentClassId(e.target.value);
                      setStudentArmId('all');
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Classes ({classes.length})</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Stream / Arm</label>
                  <select
                    value={studentArmId}
                    onChange={(e) => setStudentArmId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Arms / Streams</option>
                    {getFilteredArms(studentClassId).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enrollment Status</label>
                  <select
                    value={studentStatus}
                    onChange={(e) => setStudentStatus(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive / Suspended</option>
                    <option value="graduated">Graduated / Transferred</option>
                  </select>
                </div>
              </div>

              {/* Summary Stats Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Matching records for export:</span>
                  <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>{matchingStudents.length} Students</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({matchingStudents.filter(s => s.gender === 'Female').length} Female, {matchingStudents.filter(s => s.gender !== 'Female').length} Male)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Standard Columns</span>
                  <p className="text-xs text-slate-600 font-medium">10 attributes included</p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={exportStudentsCSV}
                  disabled={downloading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Preparing Download...' : `Download ${matchingStudents.length} Students (CSV)`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONTINUOUS ASSESSMENT & EXAM SCORES */}
          {activeTab === 'scores' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Continuous Assessment & Examination Mark Sheet Export</span>
                </div>
                <p className="text-slate-600">
                  Exports student grades across Continuous Assessments (CA1, CA2, CA3) and terminal exams. Includes calculated totals, authoritative letter grades, remarks, and approval statuses.
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    value={scoreClassId}
                    onChange={(e) => {
                      setScoreClassId(e.target.value);
                      setScoreArmId('all');
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <select
                    value={scoreSubjectId}
                    onChange={(e) => setScoreSubjectId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="all">All Subjects in Curriculum ({subjects.length})</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Arm</label>
                  <select
                    value={scoreArmId}
                    onChange={(e) => setScoreArmId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="all">All Arms / Streams</option>
                    {getFilteredArms(scoreClassId).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Term *</label>
                  <select
                    value={scoreTermId}
                    onChange={(e) => setScoreTermId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session *</label>
                  <select
                    value={scoreSessionId}
                    onChange={(e) => setScoreSessionId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Export format: </span>
                  <span>Formatted RFC 4180 CSV with standard decimal alignments and total formulations.</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Instant Spreadsheet Download
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={exportScoresCSV}
                  disabled={downloading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Extracting Records...' : 'Download Academic Scores & Marks (CSV)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE REGISTER */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Daily Student Attendance Register Export</span>
                </div>
                <p className="text-slate-600">
                  Exports chronological attendance records with daily present, absent, late, or excused statuses across selected classes and dates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={attClassId}
                    onChange={(e) => setAttClassId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={attStartDate}
                    onChange={(e) => setAttStartDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={attEndDate}
                    onChange={(e) => setAttEndDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={exportAttendanceCSV}
                  disabled={downloading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Compiling Attendance...' : 'Download Attendance Ledger (CSV)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MASTER BACKUP JSON */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Zero-Data-Loss Master Academic Backup Archive</span>
                </div>
                <p className="text-slate-600">
                  Generates an exhaustive, cryptographically structured JSON archive containing your entire school data: curriculum, academic sessions, terms, classes, class arms, subjects, students, teachers, continuous assessment scores, published report card results, fee ledgers, and attendance records.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900">What is included in this backup?</div>
                <ul className="grid grid-cols-2 gap-2 text-slate-600 list-disc list-inside">
                  <li>Complete School Profile & Logo</li>
                  <li>All Student Rosters & PII</li>
                  <li>Academic Sessions & Terms</li>
                  <li>Curriculum Classes & Arms</li>
                  <li>All Continuous Assessment Marks</li>
                  <li>Teacher & Staff Accounts</li>
                  <li>Terminal Examination Broadsheets</li>
                  <li>Attendance & Fees Ledgers</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  onClick={exportFullSchoolBackup}
                  disabled={downloading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>{downloading ? 'Generating Master Archive...' : 'Download Complete School Master Backup (JSON)'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready for Microsoft Excel, Google Sheets, Apple Numbers & offline archival</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
