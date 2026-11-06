import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { ScoreRow, AssessmentWeight } from '../types';
import {
  BookOpen,
  Calendar,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Sparkles,
  ArrowLeft,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeacherDashboardProps {
  onOpenReportCard?: (studentId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onOpenReportCard }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [weights, setWeights] = useState<AssessmentWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Navigation Tabs: Scores, Activities (A-E), Attendance
  const [tab, setTab] = useState<'scores' | 'activities' | 'attendance'>('scores');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceEntries, setAttendanceEntries] = useState<any[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Activities tab state
  const [activityRows, setActivityRows] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [savingActivities, setSavingActivities] = useState(false);
  const [automarking, setAutomarking] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [asgnData, sessData] = await Promise.all([
        apiRequest('/api/teacher/assignments'),
        apiRequest('/api/school/sessions'),
      ]);

      const asgns = asgnData.assignments || [];
      setAssignments(asgns);
      setTerms(sessData.terms || []);

      if (asgns.length > 0) {
        setSelectedAssignment(asgns[0]);
      }
      if (sessData.terms?.length > 0) {
        setSelectedTermId(sessData.terms[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssignment && selectedTermId) {
      if (tab === 'scores') {
        loadScores();
      } else if (tab === 'activities') {
        loadActivities();
      } else if (tab === 'attendance') {
        loadAttendance();
      }
    }
  }, [selectedAssignment, selectedTermId, attendanceDate, tab]);

  const loadActivities = async () => {
    if (!selectedAssignment || !selectedTermId) return;
    setLoadingActivities(true);
    try {
      const data = await apiRequest(
        `/api/teacher/activities?class_id=${selectedAssignment.class_id}&arm_id=${selectedAssignment.arm_id || ''}&term_id=${selectedTermId}&session_id=${selectedAssignment.session_id}`
      );
      setActivityRows(data.activities || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleActivityChange = (index: number, field: string, val: string) => {
    setActivityRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSaveActivities = async () => {
    if (!selectedAssignment || !selectedTermId) return;
    setSavingActivities(true);
    setMessage(null);
    setError(null);
    try {
      await apiRequest('/api/teacher/activities', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedAssignment.class_id,
          term_id: selectedTermId,
          session_id: selectedAssignment.session_id,
          activities: activityRows
        })
      });
      setMessage(`Successfully saved behavioural attributes and psychomotor grades (A–E) for ${activityRows.length} students.`);
      confetti({ particleCount: 50 });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingActivities(false);
    }
  };

  const handleAutomarkActivities = async () => {
    if (!selectedAssignment || !selectedTermId) return;
    setAutomarking(true);
    setMessage(null);
    setError(null);
    try {
      await apiRequest('/api/teacher/activities/automark', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedAssignment.class_id,
          term_id: selectedTermId,
          session_id: selectedAssignment.session_id
        })
      });
      setMessage('Activities successfully auto-marked from students’ academic performance!');
      confetti({ particleCount: 70 });
      await loadActivities();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAutomarking(false);
    }
  };

  const loadScores = async () => {
    if (!selectedAssignment || !selectedTermId) return;
    try {
      const data = await apiRequest(
        `/api/teacher/scores?class_id=${selectedAssignment.class_id}&arm_id=${selectedAssignment.arm_id || ''}&subject_id=${selectedAssignment.subject_id}&term_id=${selectedTermId}&session_id=${selectedAssignment.session_id}`
      );
      setScoreRows(data.rows || []);
      setWeights(data.weights || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadAttendance = async () => {
    if (!selectedAssignment) return;
    try {
      const data = await apiRequest(
        `/api/attendance?class_id=${selectedAssignment.class_id}&date=${attendanceDate}`
      );
      setAttendanceEntries(data.records || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMarkAllAttendancePresent = () => {
    setAttendanceEntries(prev => prev.map(e => ({ ...e, status: 'present' })));
  };

  const handleSaveAttendance = async () => {
    if (!selectedAssignment) return;
    setSavingAttendance(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedAssignment.class_id,
          date: attendanceDate,
          entries: attendanceEntries.map(e => ({
            student_id: e.student_id,
            status: e.status || 'present',
            remarks: e.remarks || ''
          }))
        })
      });
      setMessage(res.message || 'Daily attendance recorded successfully!');
      confetti({ particleCount: 35, spread: 50 });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleScoreChange = (index: number, field: keyof ScoreRow, value: number) => {
    const updated = [...scoreRows];
    const num = isNaN(value) ? 0 : Number(value);
    (updated[index] as any)[field] = num;

    // Fast preview total
    const ca1 = Number(updated[index].ca1) || 0;
    const ca2 = Number(updated[index].ca2) || 0;
    const ca3 = Number(updated[index].ca3) || 0;
    const exam = Number(updated[index].exam) || 0;
    const total = Math.round((ca1 + ca2 + ca3 + exam) * 100) / 100;
    updated[index].total = total;

    // Fast grade preview
    if (total >= 75) {
      updated[index].grade = 'A';
      updated[index].remark = 'Excellent';
    } else if (total >= 65) {
      updated[index].grade = 'B';
      updated[index].remark = 'Very Good';
    } else if (total >= 50) {
      updated[index].grade = 'C';
      updated[index].remark = 'Good';
    } else if (total >= 45) {
      updated[index].grade = 'D';
      updated[index].remark = 'Fair Pass';
    } else if (total >= 40) {
      updated[index].grade = 'E';
      updated[index].remark = 'Pass';
    } else {
      updated[index].grade = 'F';
      updated[index].remark = 'Fail';
    }

    setScoreRows(updated);
  };

  const handleSaveScores = async (status: 'draft' | 'submitted') => {
    if (!selectedAssignment || !selectedTermId) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiRequest('/api/teacher/scores', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedAssignment.class_id,
          subject_id: selectedAssignment.subject_id,
          term_id: selectedTermId,
          session_id: selectedAssignment.session_id,
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

      setMessage(res.message);
      if (status === 'submitted') {
        confetti({ particleCount: 50, spread: 60 });
      }
      loadScores();
    } catch (err: any) {
      setError(err.message || 'Error saving scores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Banner */}
      <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 mb-2">
            Educator Score Management Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Grade Entry & Attendance Register</h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            Enter Continuous Assessments (CA) and Examination marks with authoritative server validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('scores')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'scores' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Subject Score Matrix
          </button>
          <button
            onClick={() => setTab('activities')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'activities' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Activities (A–E)
          </button>
          <button
            onClick={() => setTab('attendance')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'attendance' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Daily Attendance
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              My Assigned Subject & Class
            </label>
            <select
              value={selectedAssignment?.id || ''}
              onChange={(e) => {
                const found = assignments.find((a) => a.id === e.target.value);
                if (found) setSelectedAssignment(found);
              }}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.subject_name} — {a.class_name} {a.arm_name && `(${a.arm_name})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Academic Term
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {tab === 'attendance' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {tab === 'scores' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveScores('draft')}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button
              onClick={() => handleSaveScores('submitted')}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Submit for Approval
            </button>
          </div>
        )}

        {tab === 'attendance' && (
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Daily Register
          </button>
        )}
      </div>

      {/* TAB 1: SCORES ENTRY TABLE */}
      {tab === 'scores' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              Assessment Limits: CA1 (10 Max) • CA2 (10 Max) • Project (10 Max) • Exam (70 Max)
            </span>
            <span className="text-slate-500 italic">Autocalculates total, grade, and remarks in real time</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-2">Admission No</th>
                  <th className="py-3 px-2 text-center w-24">1st CA (10)</th>
                  <th className="py-3 px-2 text-center w-24">2nd CA (10)</th>
                  <th className="py-3 px-2 text-center w-24">Project (10)</th>
                  <th className="py-3 px-2 text-center w-28">Exam (70)</th>
                  <th className="py-3 px-2 text-center w-24">Total (100)</th>
                  <th className="py-3 px-2 text-center w-20">Grade</th>
                  <th className="py-3 px-3">Remark</th>
                  {onOpenReportCard && <th className="py-3 px-2 text-center w-24">Report</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scoreRows.map((row, idx) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.full_name}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-600">{row.admission_number}</td>

                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={row.ca1}
                        onChange={(e) => handleScoreChange(idx, 'ca1', parseFloat(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </td>

                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={row.ca2}
                        onChange={(e) => handleScoreChange(idx, 'ca2', parseFloat(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </td>

                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={row.ca3}
                        onChange={(e) => handleScoreChange(idx, 'ca3', parseFloat(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </td>

                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="70"
                        step="0.5"
                        value={row.exam}
                        onChange={(e) => handleScoreChange(idx, 'exam', parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </td>

                    <td className="py-2 px-2 text-center font-mono font-black text-blue-950 bg-blue-50/50">
                      {row.total}
                    </td>

                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                        row.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        row.grade === 'C' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {row.grade}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-slate-600 font-medium">{row.remark}</td>

                    {onOpenReportCard && (
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenReportCard(row.student_id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Preview & Print Official Result Sheet"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Result</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ACTIVITIES (BEHAVIOURAL & PSYCHOMOTOR A TO E) */}
      {tab === 'activities' && (
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
                  Rating scale: <strong>A - Excellent</strong> | <strong>B - Very Good</strong> | <strong>C - Good</strong> | <strong>D - Fair</strong> | <strong>E - Poor</strong>. You can manually grade any student or use one-click Auto-Mark.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAutomarkActivities}
                  disabled={automarking}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                  title="Automatically mark all students according to their current academic average"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{automarking ? 'Automarking...' : '⚡ Auto-Mark from Academic Performance'}</span>
                </button>

                <button
                  onClick={handleSaveActivities}
                  disabled={savingActivities}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingActivities ? 'Saving...' : 'Save Activities (A–E)'}</span>
                </button>
              </div>
            </div>

            {loadingActivities ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading student activities register...
              </div>
            ) : activityRows.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No active students enrolled in this class.
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
                      {onOpenReportCard && <th className="py-2.5 px-2 text-center">Report</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityRows.map((row, idx) => (
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
                              onChange={(e) => handleActivityChange(idx, trait, e.target.value)}
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
                              onChange={(e) => handleActivityChange(idx, skill, e.target.value)}
                              className="px-1.5 py-1 text-center font-bold text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              {['A', 'B', 'C', 'D', 'E'].map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                        ))}

                        {onOpenReportCard && (
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => onOpenReportCard(row.student_id)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              title="Preview & Print Official Result Sheet"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Result</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DAILY ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <button
            onClick={() => setTab('scores')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Back to Subject Score Matrix</span>
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Daily Class Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class: <strong>{selectedAssignment?.class_name} {selectedAssignment?.arm_name ? `(${selectedAssignment.arm_name})` : ''}</strong> • {attendanceEntries.length} enrolled students
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="text-xs font-semibold bg-transparent border-none focus:outline-hidden text-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllAttendancePresent}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark All Present</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingAttendance ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>
            </div>

            {/* Attendance Status Summary Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                Present: <strong>{attendanceEntries.filter(e => e.status === 'present').length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                Absent: <strong>{attendanceEntries.filter(e => e.status === 'absent').length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                Late: <strong>{attendanceEntries.filter(e => e.status === 'late').length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                Excused: <strong>{attendanceEntries.filter(e => e.status === 'excused').length}</strong>
              </span>
              <span className="ml-auto text-xs text-slate-500 font-mono">
                Presence Rate: <strong>{attendanceEntries.length > 0 ? Math.round((attendanceEntries.filter(e => e.status === 'present').length / attendanceEntries.length) * 100) : 0}%</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-2">Admission No</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceEntries.map((e, idx) => (
                    <tr key={e.student_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{e.full_name}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">{e.admission_number}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                          {['present', 'absent', 'late', 'excused'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                const updated = [...attendanceEntries];
                                updated[idx].status = st;
                                setAttendanceEntries(updated);
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${
                                e.status === st
                                  ? st === 'present'
                                    ? 'bg-emerald-600 text-white'
                                    : st === 'late'
                                    ? 'bg-amber-500 text-white'
                                    : st === 'absent'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-blue-600 text-white'
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
                          placeholder="Optional remarks"
                          onChange={(ev) => {
                            const updated = [...attendanceEntries];
                            updated[idx].remarks = ev.target.value;
                            setAttendanceEntries(updated);
                          }}
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                All records are securely stored and factored into terminal report card attendance totals.
              </span>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingAttendance ? 'Saving Attendance...' : 'Save Daily Attendance Register'}</span>
              </button>
            </div>
          </div>
      </div>
    )}
    </div>
  );
};
