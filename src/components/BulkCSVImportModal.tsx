import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Sparkles, 
  FileText,
  Users,
  ChevronRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../api';
import confetti from 'canvas-confetti';

export type CSVImportType = 'students' | 'grades';

interface BulkCSVImportModalProps {
  type: CSVImportType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // School context props
  classes: any[];
  arms?: any[];
  subjects?: any[];
  terms?: any[];
  sessions?: any[];
  students?: any[];
  gradingWeights?: {
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
  };
  // Pre-selected context for grades
  selectedClassId?: string;
  selectedSubjectId?: string;
  selectedTermId?: string;
  selectedSessionId?: string;
  selectedArmId?: string;
}

// Simple robust CSV parser handling quoted fields, commas and newlines
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentToken.trim());
      currentToken = '';
      if (row.some(col => col.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some(col => col.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export const BulkCSVImportModal: React.FC<BulkCSVImportModalProps> = ({
  type,
  isOpen,
  onClose,
  onSuccess,
  classes,
  arms = [],
  subjects = [],
  terms = [],
  sessions = [],
  students = [],
  gradingWeights = { ca1: 20, ca2: 20, ca3: 0, exam: 60 },
  selectedClassId,
  selectedSubjectId,
  selectedTermId,
  selectedSessionId,
  selectedArmId
}) => {
  // Context states for Grades import
  const [classId, setClassId] = useState<string>(selectedClassId || classes[0]?.id || '');
  const [subjectId, setSubjectId] = useState<string>(selectedSubjectId || subjects[0]?.id || '');
  const [termId, setTermId] = useState<string>(selectedTermId || terms[0]?.id || '');
  const [sessionId, setSessionId] = useState<string>(selectedSessionId || sessions[0]?.id || '');
  const [armId, setArmId] = useState<string>(selectedArmId || '');

  // Upload & Parsing states
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1. Template Download Handler
  const handleDownloadTemplate = () => {
    if (type === 'students') {
      const defaultClassName = classes.find(c => c.id === classId)?.name || classes[0]?.name || 'JSS 1';
      const defaultArmName = arms.find(a => a.class_id === classId)?.name || 'Gold';
      const headers = ['admission_number', 'full_name', 'gender', 'class_name', 'arm_name', 'parent_name', 'parent_phone', 'parent_email', 'address'];
      const sampleRows = [
        ['STD-2026-001', 'Ibrahim Musa', 'Male', defaultClassName, defaultArmName, 'Alhaji Musa', '+2348012345678', 'musa@example.com', 'Kano State'],
        ['STD-2026-002', 'Amina Abdullahi', 'Female', defaultClassName, defaultArmName, 'Hajiya Fatima', '+2348098765432', 'fatima@example.com', 'Abuja'],
        ['', 'Chinedu Okeke', 'Male', defaultClassName, defaultArmName, 'Chief Okeke', '+2348055554444', 'okeke@example.com', 'Lagos']
      ];

      const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AcademiQ_Students_Enrollment_Template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Grade Template: Pre-fill with enrolled students from selected class!
      const currentClassStudents = students.filter(s => s.class_id === classId && (!armId || s.arm_id === armId));
      const headers = ['admission_number', 'student_name', 'ca1', 'ca2', 'ca3', 'exam', 'teacher_comment'];
      
      let rows: string[][] = [];
      if (currentClassStudents.length > 0) {
        rows = currentClassStudents.map(s => [
          s.admission_number,
          s.full_name,
          '',
          '',
          '',
          '',
          ''
        ]);
      } else {
        rows = [
          ['STD-2026-001', 'Sample Student One', '15', '18', '0', '52', 'Very good progress'],
          ['STD-2026-002', 'Sample Student Two', '12', '14', '0', '48', 'Fair performance']
        ];
      }

      const className = classes.find(c => c.id === classId)?.name || 'Class';
      const subjectName = subjects.find(s => s.id === subjectId)?.name || 'Subject';
      const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AcademiQ_Grades_${className}_${subjectName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 2. File Selection & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const rawRows = parseCSV(text);
      if (rawRows.length < 2) {
        setValidationErrors(['The CSV file must contain a header row and at least one data row.']);
        setParsedRows([]);
        return;
      }

      const headers = rawRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
      const dataRows = rawRows.slice(1);
      const errors: string[] = [];
      const parsed: any[] = [];

      if (type === 'students') {
        const nameIdx = headers.findIndex(h => h.includes('name') || h === 'fullname' || h === 'studentname');
        const admIdx = headers.findIndex(h => h.includes('adm') || h.includes('admission') || h.includes('number'));
        const genderIdx = headers.findIndex(h => h === 'gender' || h === 'sex');
        const classIdx = headers.findIndex(h => h.includes('class'));
        const armIdx = headers.findIndex(h => h.includes('arm') || h.includes('stream'));
        const parentIdx = headers.findIndex(h => h.includes('parent') && !h.includes('phone') && !h.includes('email'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const addrIdx = headers.findIndex(h => h.includes('address'));

        if (nameIdx === -1) {
          errors.push('Missing required column: "full_name" or "name".');
        }

        dataRows.forEach((cols, idx) => {
          const fullName = nameIdx !== -1 ? cols[nameIdx] || '' : '';
          const adm = admIdx !== -1 ? cols[admIdx] || '' : '';
          const gender = genderIdx !== -1 ? cols[genderIdx] || 'Male' : 'Male';
          const className = classIdx !== -1 ? cols[classIdx] || '' : '';
          const armName = armIdx !== -1 ? cols[armIdx] || '' : '';

          if (!fullName) {
            errors.push(`Row ${idx + 2}: Full Name is empty.`);
          }

          parsed.push({
            rowNumber: idx + 2,
            full_name: fullName,
            admission_number: adm,
            gender: gender,
            class_name: className || classes.find(c => c.id === classId)?.name || '',
            arm_name: armName,
            parent_name: parentIdx !== -1 ? cols[parentIdx] || '' : '',
            parent_phone: phoneIdx !== -1 ? cols[phoneIdx] || '' : '',
            parent_email: emailIdx !== -1 ? cols[emailIdx] || '' : '',
            address: addrIdx !== -1 ? cols[addrIdx] || '' : '',
            isValid: Boolean(fullName)
          });
        });
      } else {
        // Grades Parser
        const admIdx = headers.findIndex(h => h.includes('adm') || h.includes('admission') || h.includes('number'));
        const nameIdx = headers.findIndex(h => h.includes('name') || h === 'studentname');
        const ca1Idx = headers.findIndex(h => h === 'ca1' || h.includes('firstca') || h === 'test1');
        const ca2Idx = headers.findIndex(h => h === 'ca2' || h.includes('secondca') || h === 'test2');
        const ca3Idx = headers.findIndex(h => h === 'ca3' || h.includes('thirdca') || h === 'project');
        const examIdx = headers.findIndex(h => h.includes('exam'));
        const commentIdx = headers.findIndex(h => h.includes('comment') || h.includes('remark'));

        if (admIdx === -1 && nameIdx === -1) {
          errors.push('The CSV must include an "admission_number" or "student_name" column to identify students.');
        }

        dataRows.forEach((cols, idx) => {
          const adm = admIdx !== -1 ? cols[admIdx] || '' : '';
          const name = nameIdx !== -1 ? cols[nameIdx] || '' : '';
          const ca1 = ca1Idx !== -1 ? Number(cols[ca1Idx]) || 0 : 0;
          const ca2 = ca2Idx !== -1 ? Number(cols[ca2Idx]) || 0 : 0;
          const ca3 = ca3Idx !== -1 ? Number(cols[ca3Idx]) || 0 : 0;
          const exam = examIdx !== -1 ? Number(cols[examIdx]) || 0 : 0;
          const comment = commentIdx !== -1 ? cols[commentIdx] || '' : '';
          const total = ca1 + ca2 + ca3 + exam;

          const hasIdentifier = Boolean(adm || name);
          if (!hasIdentifier) {
            errors.push(`Row ${idx + 2}: Missing both student admission number and name.`);
          }

          parsed.push({
            rowNumber: idx + 2,
            admission_number: adm,
            student_name: name,
            ca1,
            ca2,
            ca3,
            exam,
            total,
            teacher_comment: comment,
            isValid: hasIdentifier
          });
        });
      }

      setValidationErrors(errors);
      setParsedRows(parsed);
    };

    reader.readAsText(file);
  };

  // 3. Submit Import to Backend
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setImportResult(null);

    try {
      if (type === 'students') {
        const payload = parsedRows.filter(r => r.isValid).map(r => ({
          admission_number: r.admission_number,
          full_name: r.full_name,
          gender: r.gender,
          class_name: r.class_name,
          arm_name: r.arm_name,
          parent_name: r.parent_name,
          parent_phone: r.parent_phone,
          parent_email: r.parent_email,
          address: r.address
        }));

        const res = await apiRequest('/api/school/students/bulk-import', {
          method: 'POST',
          body: JSON.stringify({ students: payload })
        });

        setImportResult(res);
        confetti({ particleCount: 70, spread: 60 });
        onSuccess();
      } else {
        // Grades Submission
        const payload = parsedRows.filter(r => r.isValid).map(r => ({
          admission_number: r.admission_number,
          student_name: r.student_name,
          ca1: r.ca1,
          ca2: r.ca2,
          ca3: r.ca3,
          exam: r.exam,
          teacher_comment: r.teacher_comment
        }));

        const res = await apiRequest('/api/school/scores/bulk-import', {
          method: 'POST',
          body: JSON.stringify({
            class_id: classId,
            subject_id: subjectId,
            term_id: termId,
            session_id: sessionId,
            scores: payload,
            status: 'draft'
          })
        });

        setImportResult(res);
        confetti({ particleCount: 70, spread: 60 });
        onSuccess();
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        imported: 0,
        skipped: parsedRows.length,
        errors: [err.message || 'Import failed'],
        message: err.message || 'Import transaction failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{type === 'students' ? 'Bulk Student Enrollment (CSV)' : 'Bulk Grade & Score Entry (CSV)'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Fast Import
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                {type === 'students' 
                  ? 'Enroll multiple students at once from Excel or Google Sheets' 
                  : 'Upload terminal assessment and examination marks for a class'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Context Selector for Grades */}
          {type === 'grades' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Select Assessment Context
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Max Weights: CA1 ({gradingWeights.ca1}%), CA2 ({gradingWeights.ca2}%), Exam ({gradingWeights.exam}%)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class *</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Term *</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Session *</label>
                  <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Two-step Action Bar: Step 1 Template & Step 2 Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Download Template */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Step 1
                </span>
                <h4 className="text-sm font-bold text-slate-900">Download Formatted CSV Template</h4>
                <p className="text-xs text-slate-600 mt-1">
                  {type === 'students' 
                    ? 'Get the official CSV template with student headers and sample rows.' 
                    : 'Download a ready-to-fill CSV pre-populated with enrolled students in this class.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2.5 px-4 bg-white hover:bg-blue-100/80 text-blue-700 font-bold rounded-xl text-xs border border-blue-300 transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>{type === 'students' ? 'Download Students Template (.csv)' : 'Download Class Roster (.csv)'}</span>
              </button>
            </div>

            {/* Step 2: Upload CSV */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Step 2
                </span>
                <h4 className="text-sm font-bold text-slate-900">Upload Completed CSV</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Select your updated CSV file from Excel, Numbers, or Google Sheets.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{fileName ? `Change: ${fileName}` : 'Choose CSV File to Upload'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice on uploaded file:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-900">
                {validationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>...and {validationErrors.length - 5} more notice(s).</li>
                )}
              </ul>
            </div>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              importResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className="font-bold flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{importResult.message}</span>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-[11px] text-slate-600 pl-6 space-y-0.5">
                  {importResult.errors.slice(0, 4).map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                  {importResult.errors.length > 4 && (
                    <div>• ...and {importResult.errors.length - 4} more skipped items.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Data Preview ({validCount} valid / {parsedRows.length} total rows)</span>
                <span className="text-[11px] text-slate-500 font-normal">Review rows before executing import</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    {type === 'students' ? (
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Admission No</th>
                        <th className="p-2.5">Full Name</th>
                        <th className="p-2.5">Gender</th>
                        <th className="p-2.5">Class / Stream</th>
                        <th className="p-2.5">Parent Contact</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Admission No</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5 text-center">CA 1</th>
                        <th className="p-2.5 text-center">CA 2</th>
                        <th className="p-2.5 text-center">Exam</th>
                        <th className="p-2.5 text-center">Total</th>
                        <th className="p-2.5">Teacher Remark</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        {type === 'students' ? (
                          <>
                            <td className="p-2.5 text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                            <td className="p-2.5 font-mono text-slate-700">{row.admission_number || <span className="text-slate-400 italic">auto-generated</span>}</td>
                            <td className="p-2.5 font-bold text-slate-900">{row.full_name}</td>
                            <td className="p-2.5 text-slate-600">{row.gender}</td>
                            <td className="p-2.5 text-slate-600">{row.class_name} {row.arm_name && `(${row.arm_name})`}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">{row.parent_phone || row.parent_name || '—'}</td>
                            <td className="p-2.5 text-center">
                              {row.isValid ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Ready</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Invalid</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2.5 text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                            <td className="p-2.5 font-mono text-slate-700">{row.admission_number || '—'}</td>
                            <td className="p-2.5 font-bold text-slate-900">{row.student_name || '—'}</td>
                            <td className="p-2.5 text-center font-mono font-semibold text-slate-700">{row.ca1}</td>
                            <td className="p-2.5 text-center font-mono font-semibold text-slate-700">{row.ca2}</td>
                            <td className="p-2.5 text-center font-mono font-semibold text-slate-700">{row.exam}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-700">{row.total}</td>
                            <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[150px]">{row.teacher_comment || '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="text-[11px] text-slate-400 text-center">
                  Showing first 50 rows of {parsedRows.length} total rows.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>Ready to import <strong className="text-slate-900">{validCount}</strong> valid record(s).</span>
            ) : (
              <span>Download the template or upload your prepared CSV above.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isSubmitting}
              onClick={handleImportSubmit}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Import...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Execute Bulk Import ({validCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
