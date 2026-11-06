import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { VerifiedResult, ResultTemplate } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Sparkles,
  KeyRound,
  User,
  Award,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Eye,
  FileCheck2,
  Stamp
} from 'lucide-react';
import { exportReportCardToPDF, printReportCard } from '../utils/pdfGenerator';

interface PublicResultCheckerProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const PublicResultChecker: React.FC<PublicResultCheckerProps> = ({ onClose, isModal = false }) => {
  const [admissionNumber, setAdmissionNumber] = useState('APX/2026/001');
  const [pinCode, setPinCode] = useState('APX-8492-X');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<VerifiedResult | null>(null);
  const [a4PreviewMode, setA4PreviewMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (isModal || verifiedResult) {
      document.body.classList.add('has-print-modal');
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [isModal, verifiedResult]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionNumber.trim() || !pinCode.trim()) {
      setError('Please provide both the student admission number and your secret result PIN.');
      return;
    }

    setLoading(true);
    setError(null);
    setVerifiedResult(null);

    try {
      const res = await apiRequest('/api/public/verify-result', {
        method: 'POST',
        body: JSON.stringify({
          admission_number: admissionNumber.trim(),
          pin_code: pinCode.trim(),
        }),
      });

      if (res.success && res.result) {
        setVerifiedResult(res.result);
      } else {
        setError('Verification failed. Result is not available.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const ok = await printReportCard('printable-report-card');
      if (!ok) {
        window.print();
      }
    } catch (err) {
      console.warn('Isolated print failed, downloading PDF directly:', err);
      handleDownloadPDF();
    }
  };

  const handleDownloadPDF = async () => {
    if (!verifiedResult) return;
    setDownloadingPDF(true);
    try {
      const stdName = verifiedResult.student_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const termName = verifiedResult.term_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${stdName}_${termName}_Verified_Report.pdf`;
      const badge = verifiedResult.school_logo;
      await exportReportCardToPDF('printable-report-card', fileName, badge, verifiedResult);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const t: ResultTemplate = verifiedResult?.template || {
    templateName: 'Standard Academic',
    headerLayout: 'crest_center',
    tableStyle: 'classic_bordered',
    primaryColor: '#1e3a8a',
    accentColor: '#d97706',
    schoolMotto: 'Knowledge is Light',
    showWatermark: true,
    showStudentPhoto: true,
    showStamp: true,
    showPrincipalStamp: true,
    showGradingScaleTable: true,
    showAffectiveDomain: true,
    showPsychomotor: true,
    showPositions: true,
    customHeaderNote: 'Terminal Continuous Assessment & Examination Report',
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
  const accentColor = t.accentColor || '#d97706';
  const fallbackBadge = getSvgBadgeFallback(verifiedResult?.school_name || 'School', primaryColor);
  const schoolLogo = verifiedResult?.school_logo || fallbackBadge;

  const assessmentWeights = verifiedResult?.assessment_weights || [
    { code: 'ca1', name: '1st CA', max_score: 10 },
    { code: 'ca2', name: '2nd CA', max_score: 10 },
    { code: 'ca3', name: '3rd CA', max_score: 10 },
    { code: 'exam', name: 'Exam', max_score: 70 },
  ];

  const wCa1 = assessmentWeights.find((w: any) => w.code === 'ca1')?.max_score ?? 10;
  const wCa2 = assessmentWeights.find((w: any) => w.code === 'ca2')?.max_score ?? 10;
  const wCa3 = assessmentWeights.find((w: any) => w.code === 'ca3')?.max_score ?? 10;
  const wExam = assessmentWeights.find((w: any) => w.code === 'exam')?.max_score ?? 70;
  const labelCa1 = assessmentWeights.find((w: any) => w.code === 'ca1')?.name || '1st CA';
  const labelCa2 = assessmentWeights.find((w: any) => w.code === 'ca2')?.name || '2nd CA';
  const labelCa3 = assessmentWeights.find((w: any) => w.code === 'ca3')?.name || '3rd CA';
  const labelExam = assessmentWeights.find((w: any) => w.code === 'exam')?.name || 'Exam';
  const totalMax = wCa1 + wCa2 + wCa3 + wExam;

  const attendance = verifiedResult?.attendance || {
    days_present: 88,
    days_absent: 2,
    days_late: 1,
    total_school_days: 90
  };
  const attendancePercent = attendance.total_school_days > 0
    ? Math.round((attendance.days_present / attendance.total_school_days) * 100)
    : 100;

  const scaleMap: Record<string, string> = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Fair',
    E: 'Poor'
  };

  const behaviouralActivities = verifiedResult?.activities?.behavioural || [
    { trait: 'Punctuality & Regularity', grade: 'A', remark: 'Excellent' },
    { trait: 'Neatness & Personal Hygiene', grade: 'A', remark: 'Excellent' },
    { trait: 'Politeness & Courtesy', grade: 'A', remark: 'Excellent' },
    { trait: 'Honesty & Moral Integrity', grade: 'A', remark: 'Excellent' },
    { trait: 'Attentiveness & Focus', grade: 'A', remark: 'Excellent' },
    { trait: 'Leadership & Teamwork', grade: 'B', remark: 'Very Good' },
  ];

  const psychomotorActivities = verifiedResult?.activities?.psychomotor || [
    { skill: 'Handwriting & Legibility', grade: 'A', remark: 'Excellent' },
    { skill: 'Sports, Games & Athletics', grade: 'B', remark: 'Very Good' },
    { skill: 'Crafts, Drawing & Arts', grade: 'B', remark: 'Very Good' },
    { skill: 'Public Speaking & Verbal Fluency', grade: 'A', remark: 'Excellent' },
    { skill: 'Practical & Lab Competencies', grade: 'A', remark: 'Excellent' },
  ];

  return (
    <div className={`w-full ${isModal ? 'max-w-4xl mx-auto p-4 sm:p-6' : 'max-w-5xl mx-auto px-4 py-8'}`}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Header (Hidden in Print) */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 sm:p-8 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Public Result Verification Portal</h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                  AcademiQ cryptographic PIN verification for students, parents, and examination boards
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-300" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Form (Hidden in Print) */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-200 print:hidden">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Student Admission Number
                </label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="e.g. APX/2026/001"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Secure Result PIN Code
                </label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. APX-8492-X"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold uppercase tracking-wider"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Pre-fill Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
              <span className="font-medium">Test PINs:</span>
              <button
                type="button"
                onClick={() => {
                  setAdmissionNumber('APX/2026/001');
                  setPinCode('APX-8492-X');
                }}
                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-mono font-medium transition cursor-pointer"
              >
                Zainab (Rank 1): APX-8492-X
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdmissionNumber('APX/2026/002');
                  setPinCode('APX-1029-Q');
                }}
                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-mono font-medium transition cursor-pointer"
              >
                Okafor (Rank 2): APX-1029-Q
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Validating Secure PIN...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Verify & Retrieve Report Card
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verified Result Card View */}
        {verifiedResult && (
          <div className="p-4 sm:p-8 space-y-6 print:p-0">
            {/* Action Bar (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cryptographically Verified Result • Remaining PIN Checks: {verifiedResult.pin_usage_remaining}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setA4PreviewMode(!a4PreviewMode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer border ${
                    a4PreviewMode
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" /> {a4PreviewMode ? 'Normal View' : 'A4 Paper Preview'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-200" /> Print Report Card
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
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

            {/* Official Report Card Printable Document */}
            <div className={a4PreviewMode ? 'flex justify-center bg-slate-200 p-6 rounded-2xl overflow-x-auto' : ''}>
              <div
                id="printable-report-card"
                className={`bg-white rounded-2xl p-4 sm:p-6 space-y-4 print:space-y-1 shadow-sm border border-slate-200 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 mx-auto ${
                  a4PreviewMode ? 'w-[210mm] min-h-[297mm] shadow-2xl border-2 border-slate-400 shrink-0 font-serif' : ''
                }`}
                style={{
                  width: '100%',
                  maxWidth: '210mm',
                  minHeight: a4PreviewMode ? '297mm' : 'auto',
                  padding: a4PreviewMode ? '10mm' : '10mm',
                  boxSizing: 'border-box'
                }}
              >
                {/* School Watermark */}
                {t.showWatermark && schoolLogo && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] z-0">
                    <img
                      src={schoolLogo}
                      alt=""
                      className="w-96 h-96 object-contain print-badge school-badge-img"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}

                {/* ----------------- SECTION 1: HEADER & SCHOOL BADGE ----------------- */}
                <div className="relative z-10">
                  {t.headerLayout === 'crest_center' && (
                    <div className="text-center space-y-1.5 border-b-2 pb-4" style={{ borderColor: primaryColor }}>
                      {schoolLogo && (
                        <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center p-1 bg-white rounded-2xl shadow-xs">
                          <img
                            src={schoolLogo}
                            alt="School Badge"
                            className="w-full h-full object-contain print-badge school-badge-img"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                        {verifiedResult.school_name}
                      </h1>
                      {t.schoolMotto && (
                        <p className="text-xs font-semibold italic" style={{ color: accentColor }}>
                          "{t.schoolMotto}"
                        </p>
                      )}
                      <p className="text-xs text-slate-600 font-medium">{verifiedResult.school_address}</p>
                      <p className="text-[11px] text-slate-500">
                        Email: {verifiedResult.school_email || 'info@school.edu'} • Phone: {verifiedResult.school_phone || 'N/A'}
                      </p>
                      <div className="pt-2">
                        <span
                          className="inline-block px-4 py-1 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {t.customHeaderNote || 'Terminal Continuous Assessment & Examination Report'}
                        </span>
                      </div>
                    </div>
                  )}

                  {t.headerLayout === 'badge_left' && (
                    <div className="flex items-center justify-between gap-4 border-b-2 pb-4" style={{ borderColor: primaryColor }}>
                      <div className="flex items-center gap-4">
                        {schoolLogo && (
                          <div className="w-20 h-20 shrink-0 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-center">
                            <img
                              src={schoolLogo}
                              alt="School Badge"
                              className="w-full h-full object-contain print-badge school-badge-img"
                              crossOrigin="anonymous"
                            />
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                            {verifiedResult.school_name}
                          </h1>
                          {t.schoolMotto && (
                            <p className="text-xs font-semibold italic" style={{ color: accentColor }}>
                              "{t.schoolMotto}"
                            </p>
                          )}
                          <p className="text-xs text-slate-600 mt-0.5">{verifiedResult.school_address}</p>
                          <p className="text-[11px] text-slate-500">
                            {verifiedResult.school_email || 'info@school.edu'} • {verifiedResult.school_phone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {t.showStudentPhoto && (
                        <div className="w-20 h-24 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center p-1 shrink-0 overflow-hidden">
                          <User className="w-6 h-6 text-slate-400" />
                          <span className="text-[9px] text-slate-500 font-sans uppercase mt-1 leading-tight font-bold">
                            Affix Passport
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {t.headerLayout === 'dual_crest' && (
                    <div className="border-b-2 pb-4" style={{ borderColor: primaryColor }}>
                      <div className="flex items-center justify-between gap-3 text-center">
                        {schoolLogo ? (
                          <div className="w-16 h-16 shrink-0 p-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                            <img
                              src={schoolLogo}
                              alt="School Badge"
                              className="w-full h-full object-contain print-badge school-badge-img"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ) : <div className="w-16"></div>}

                        <div className="flex-1 space-y-1">
                          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: primaryColor }}>
                            {verifiedResult.school_name}
                          </h1>
                          {t.schoolMotto && (
                            <p className="text-xs font-semibold italic" style={{ color: accentColor }}>
                              "{t.schoolMotto}"
                            </p>
                          )}
                          <p className="text-xs text-slate-600 font-medium">{verifiedResult.school_address}</p>
                          <p className="text-[11px] text-slate-500">
                            {verifiedResult.school_email || 'info@school.edu'} • {verifiedResult.school_phone || 'N/A'}
                          </p>
                        </div>

                        {schoolLogo ? (
                          <div className="w-16 h-16 shrink-0 p-1 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                            <img
                              src={schoolLogo}
                              alt="School Badge"
                              className="w-full h-full object-contain print-badge school-badge-img"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ) : <div className="w-16"></div>}
                      </div>
                      <div className="pt-2 text-center">
                        <span
                          className="inline-block px-4 py-1 text-white rounded-full text-xs font-bold uppercase tracking-wider"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {t.customHeaderNote || 'Official Terminal Report'}
                        </span>
                      </div>
                    </div>
                  )}

                  {t.headerLayout === 'modern_banner' && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 mb-2">
                      <div className="p-4 text-white flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                        <div className="flex items-center gap-3">
                          {schoolLogo && (
                            <div className="w-14 h-14 bg-white/20 rounded-xl p-1 backdrop-blur-xs flex items-center justify-center">
                              <img
                                src={schoolLogo}
                                alt="School Badge"
                                className="w-full h-full object-contain print-badge school-badge-img"
                                crossOrigin="anonymous"
                              />
                            </div>
                          )}
                          <div>
                            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight">{verifiedResult.school_name}</h1>
                            {t.schoolMotto && <p className="text-xs italic text-amber-200">"{t.schoolMotto}"</p>}
                          </div>
                        </div>
                        <div className="text-right text-xs text-white/80 hidden sm:block">
                          <p>{verifiedResult.school_address}</p>
                          <p>{verifiedResult.school_email || 'info@school.edu'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-100 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                        {t.customHeaderNote || 'Continuous Assessment & Examination Report'}
                      </div>
                    </div>
                  )}
                </div>

                {/* ----------------- SECTION 2: STUDENT BIODATA ----------------- */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Student Name</span>
                    <span className="font-bold text-slate-900 text-sm">{verifiedResult.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Admission Number</span>
                    <span className="font-mono font-bold text-slate-900">{verifiedResult.admission_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Class & Arm</span>
                    <span className="font-semibold text-slate-900">{verifiedResult.class_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase font-bold tracking-wider">Term & Session</span>
                    <span className="font-semibold text-slate-900">{verifiedResult.term_name} ({verifiedResult.session_name})</span>
                  </div>
                </div>

                {/* ----------------- SECTION 3: SUBJECT SCORES TABLE ----------------- */}
                <div className="relative z-10 overflow-x-auto print-page-break-avoid">
                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead className="text-white font-bold uppercase tracking-wider text-[11px]" style={{ backgroundColor: primaryColor }}>
                      <tr>
                        <th className="py-2.5 px-3 border border-slate-400">Subject</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400">{labelCa1} ({wCa1})</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400">{labelCa2} ({wCa2})</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400">{labelCa3} ({wCa3})</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400">{labelExam} ({wExam})</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400 bg-black/20">Total ({totalMax})</th>
                        <th className="py-2.5 px-2 text-center border border-slate-400">Grade</th>
                        <th className="py-2.5 px-3 border border-slate-400">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {verifiedResult.scores.map((sc, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">{sc.subject_name}</td>
                          <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{sc.ca1}</td>
                          <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{sc.ca2}</td>
                          <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{sc.ca3}</td>
                          <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{sc.exam}</td>
                          <td className="py-2 px-2 text-center font-bold font-mono text-slate-900 border-r border-slate-200 bg-blue-50/60">
                            {sc.total}
                          </td>
                          <td className="py-2 px-2 text-center font-bold border-r border-slate-200">
                            <span className={`inline-block w-6 py-0.5 rounded text-[11px] ${
                              sc.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                              sc.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              sc.grade === 'C' ? 'bg-cyan-100 text-cyan-800' :
                              sc.grade === 'D' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {sc.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">{sc.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ----------------- SECTION 4: PERFORMANCE SUMMARY ----------------- */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 print-page-break-avoid">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-center">
                    <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">Total Marks</span>
                    <span className="text-xl font-black text-blue-950 mt-0.5 block">{verifiedResult.total_score}</span>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">Terminal Average</span>
                    <span className="text-xl font-black text-emerald-950 mt-0.5 block">{verifiedResult.average_score}%</span>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">Class Position</span>
                    <span className="text-xl font-black text-amber-950 mt-0.5 block">
                      {verifiedResult.position} <span className="text-xs font-normal text-slate-600">/ {verifiedResult.class_size}</span>
                    </span>
                  </div>
                </div>

                {/* ----------------- SECTION 5: BEHAVIOURAL ATTRIBUTES & PSYCHOMOTOR SKILLS (A TO E) ----------------- */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs print:grid-cols-2 print:gap-2 print-page-break-avoid">
                  {/* Affective Domain (Behavioral Attributes) */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="px-2.5 py-1 text-white font-bold text-[10px] print:text-[8.5px] uppercase tracking-wider flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                      <span>Affective Domain (Behavioural Attributes)</span>
                      <span className="text-[8.5px] font-normal opacity-90">Scale (A – E)</span>
                    </div>
                    <table className="w-full text-[10px] print:text-[8px]">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-1 print:py-0.5 px-2 text-left">Character Trait</th>
                          <th className="py-1 print:py-0.5 px-1.5 text-center w-12">Grade</th>
                          <th className="py-1 print:py-0.5 px-2 text-center">Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {behaviouralActivities.map((item: any, i: number) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-1 print:py-0.5 px-2 text-slate-800 font-medium">{item.trait}</td>
                            <td className="py-1 print:py-0.5 px-1.5 text-center font-bold font-mono">
                              <span className={`inline-block px-2 py-0.2 rounded font-black text-[10px] print:text-[8.5px] ${
                                item.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                item.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                item.grade === 'C' ? 'bg-cyan-100 text-cyan-800' :
                                item.grade === 'D' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {item.grade}
                              </span>
                            </td>
                            <td className="py-1 print:py-0.5 px-2 text-center text-slate-600 text-[9px] print:text-[8px]">
                              {item.remark || scaleMap[item.grade] || 'Good'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-slate-50 px-2 py-0.5 border-t border-slate-200 text-[8px] text-slate-600">
                      <strong>Rating Scale:</strong> A - Excellent | B - Very Good | C - Good | D - Fair | E - Poor
                    </div>
                  </div>

                  {/* Psychomotor Skills & Co-Curricular */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="px-2.5 py-1 text-white font-bold text-[10px] print:text-[8.5px] uppercase tracking-wider flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                      <span>Psychomotor Skills & Practical Competencies</span>
                      <span className="text-[8.5px] font-normal opacity-90">Scale (A – E)</span>
                    </div>
                    <table className="w-full text-[10px] print:text-[8px]">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-1 print:py-0.5 px-2 text-left">Practical / Physical Skill</th>
                          <th className="py-1 print:py-0.5 px-1.5 text-center w-12">Grade</th>
                          <th className="py-1 print:py-0.5 px-2 text-center">Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {psychomotorActivities.map((item: any, i: number) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-1 print:py-0.5 px-2 text-slate-800 font-medium">{item.skill}</td>
                            <td className="py-1 print:py-0.5 px-1.5 text-center font-bold font-mono">
                              <span className={`inline-block px-2 py-0.2 rounded font-black text-[10px] print:text-[8.5px] ${
                                item.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                item.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                item.grade === 'C' ? 'bg-cyan-100 text-cyan-800' :
                                item.grade === 'D' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {item.grade}
                              </span>
                            </td>
                            <td className="py-1 print:py-0.5 px-2 text-center text-slate-600 text-[9px] print:text-[8px]">
                              {item.remark || scaleMap[item.grade] || 'Good'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-slate-50 px-2 py-0.5 border-t border-slate-200 text-[8px] text-slate-600">
                      <strong>Rating Scale:</strong> A - Excellent | B - Very Good | C - Good | D - Fair | E - Poor
                    </div>
                  </div>
                </div>

                {/* ----------------- SECTION 6: OFFICIAL GRADING SCALE ----------------- */}
                <div className="relative z-10 border border-slate-300 rounded-xl p-1.5 print:p-1 bg-slate-50/70 text-[9.5px] print:text-[8px] text-slate-700 print-page-break-avoid">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] print:text-[8px]">
                      Official Academic Grading Scale
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">Score Benchmark Key</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 print:grid-cols-6 gap-1.5">
                    {(verifiedResult.grading_scale || [
                      { grade: 'A', min_score: 75, max_score: 100, remark: 'Excellent' },
                      { grade: 'B', min_score: 65, max_score: 74.99, remark: 'Very Good' },
                      { grade: 'C', min_score: 50, max_score: 64.99, remark: 'Good' },
                      { grade: 'D', min_score: 45, max_score: 49.99, remark: 'Fair Pass' },
                      { grade: 'E', min_score: 40, max_score: 44.99, remark: 'Weak Pass' },
                      { grade: 'F', min_score: 0, max_score: 39.99, remark: 'Fail' }
                    ]).map((scale: any) => (
                      <div key={scale.grade} className="bg-white border border-slate-200 p-1 print:p-0.5 rounded text-center font-mono">
                        <span className="font-bold text-[10px] print:text-[8.5px] text-slate-900 block">{scale.grade}</span>
                        <span className="text-[8.5px] print:text-[7.5px] text-slate-500 block">{scale.min_score}% - {scale.max_score}%</span>
                        <span className="text-[8px] print:text-[7px] font-sans font-semibold text-slate-700 block">{scale.remark}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ----------------- SECTION 7: REMARKS, ATTENDANCE & RESUMPTION ----------------- */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 text-xs print:text-[8.5px] print-page-break-avoid">
                  <div className="p-2 print:p-1.5 bg-slate-50 border border-slate-300 rounded-xl space-y-0.5">
                    <span className="font-bold text-slate-900 block text-[10px] print:text-[8.5px] uppercase tracking-wider">
                      Class Teacher's Remark:
                    </span>
                    <p className="text-slate-800 italic font-serif text-[11px] print:text-[8.5px] leading-tight">
                      "{verifiedResult.teacher_comment || 'Impressive performance and exemplary moral character demonstrated throughout the term.'}"
                    </p>
                  </div>

                  <div className="p-2 print:p-1.5 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block text-[10px] print:text-[8.5px] uppercase tracking-wider">
                      Principal / Headmaster's Appraisal:
                    </span>
                    <p className="text-slate-800 italic font-serif text-[11px] print:text-[8.5px] leading-tight">
                      "{verifiedResult.principal_comment || 'Promoted to maintain high academic standard. Continue upholding excellent diligence and good conduct.'}"
                    </p>
                    <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] print:text-[8px] text-slate-700">
                      <span><strong>Attendance:</strong> {attendance.days_present}/{attendance.total_school_days} Days ({attendancePercent}%)</span>
                      <span><strong>Next Term Resumption:</strong> <strong style={{ color: primaryColor }}>{verifiedResult.next_term_resumption || '15th September, 2026'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* ----------------- SECTION 8: OFFICIAL STAMP & MANUAL SIGNATURES ----------------- */}
                <div className="relative z-10 pt-2 print:pt-1 border-t border-slate-300 print-page-break-avoid">
                  <div className="grid grid-cols-3 gap-4 text-center items-end">
                    {/* Class Teacher Signature (EMPTY FOR MANUAL SIGNATURE) */}
                    <div className="flex flex-col items-center">
                      <div className="w-full h-9 print:h-8 border-b-2 border-slate-700 mb-1">
                        {/* Blank designated space for physical manual pen signature */}
                      </div>
                      <span className="font-bold text-slate-900 block text-[10px] print:text-[8.5px] uppercase tracking-wider">
                        Class Teacher's Signature
                      </span>
                      <span className="text-[9px] print:text-[7.5px] text-slate-500 font-mono mt-0.5">
                        Date: ____________________
                      </span>
                    </div>

                    {/* Official Circular Stamp & Seal */}
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="w-13 h-13 print:w-11 print:h-11 rounded-full border-2 border-dashed flex flex-col items-center justify-center p-0.5 transform rotate-[-4deg] shadow-xs"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        <Stamp className="w-3.5 h-3.5 print:w-3 print:h-3 mb-0.5 opacity-80" />
                        <span className="text-[7px] print:text-[6px] font-black uppercase tracking-tight text-center leading-tight">
                          OFFICIAL SEAL
                        </span>
                        <span className="font-mono text-[6.5px] print:text-[5.5px]">{new Date().getFullYear()}</span>
                      </div>
                      <span className="text-[8.5px] print:text-[7px] text-slate-500 font-sans mt-0.5">Official Stamp & Seal</span>
                    </div>

                    {/* Principal / Headmaster Signature (EMPTY FOR MANUAL SIGNATURE) */}
                    <div className="flex flex-col items-center">
                      <div className="w-full h-9 print:h-8 border-b-2 border-slate-700 mb-1">
                        {/* Blank designated space for physical manual pen signature */}
                      </div>
                      <span className="font-bold text-slate-900 block text-[10px] print:text-[8.5px] uppercase tracking-wider">
                        Principal's Signature
                      </span>
                      <span className="text-[9px] print:text-[7.5px] text-slate-500 font-mono mt-0.5">
                        Date: ____________________
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-200 text-center text-[8px] print:text-[7px] text-slate-500 italic">
                    * Note: Signature spaces above are designated for physical ink endorsement and physical school stamping upon issuance.
                  </div>
                </div>

                {/* Document Security Footer */}
                <div className="relative z-10 pt-2 print:pt-0.5 border-t border-slate-200 flex flex-wrap justify-between items-center text-[10px] print:text-[6.5px] text-slate-400">
                  <span>AcademiQ Automated Cryptographic Result Security Validated</span>
                  <span>Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Bottom Navigation & Actions (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setVerifiedResult(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Check Another Result PIN
              </button>

              <div className="flex items-center gap-2">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Close / Back to Dashboard
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report Card
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
