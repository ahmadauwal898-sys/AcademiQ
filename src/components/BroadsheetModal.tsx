import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Printer, Download, X, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface BroadsheetModalProps {
  classId: string;
  termId: string;
  sessionId: string;
  onClose: () => void;
}

export const BroadsheetModal: React.FC<BroadsheetModalProps> = ({
  classId,
  termId,
  sessionId,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBroadsheet();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [classId, termId, sessionId]);

  const loadBroadsheet = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(
        `/api/school/reports/broadsheet?class_id=${classId}&term_id=${termId}&session_id=${sessionId}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${(data.school?.name || 'SCHOOL').toUpperCase()} — CLASS RESULT SHEET`, 148, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Class: ${data.classInfo?.name || 'Class'} | Term: ${data.termInfo?.name || 'Term'} | Session: ${data.sessionInfo?.name || 'Session'}`,
      148,
      22,
      { align: 'center' }
    );

    // Table
    let y = 30;
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 277, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('POS', 12, y + 5.5);
    doc.text('ADMISSION NO', 22, y + 5.5);
    doc.text('STUDENT NAME', 50, y + 5.5);

    let x = 110;
    (data.subjects || []).forEach((sub: any) => {
      doc.text(sub.code || sub.name.slice(0, 4).toUpperCase(), x, y + 5.5);
      x += 20;
    });

    doc.text('TOTAL', 230, y + 5.5);
    doc.text('AVG (%)', 255, y + 5.5);

    y += 10;
    doc.setFont('helvetica', 'normal');
    (data.termResults || []).forEach((tr: any) => {
      doc.text(String(tr.position || '-'), 12, y);
      doc.text(tr.admission_number, 22, y);
      doc.text(tr.full_name, 50, y);

      let subX = 110;
      (data.subjects || []).forEach((sub: any) => {
        const sc = data.studentScoresMap?.[tr.student_id]?.[sub.id];
        doc.text(sc ? `${sc.total} (${sc.grade})` : '-', subX, y);
        subX += 20;
      });

      doc.setFont('helvetica', 'bold');
      doc.text(String(tr.total_score || 0), 230, y);
      doc.text(`${tr.average_score || 0}%`, 255, y);
      doc.setFont('helvetica', 'normal');

      y += 7;
    });

    doc.save(`${data.classInfo?.name || 'Class'}_Result_Broadsheet.pdf`);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white"
    >
      <div className="bg-white rounded-3xl max-w-6xl w-full my-4 sm:my-8 shadow-2xl overflow-hidden print:shadow-none print:my-0 print:w-full print:border-none flex flex-col max-h-[92vh]">
        {/* Top Controls Header */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-white/10"
            title="Go back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hidden sm:flex"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Landscape PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-white/10"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 space-y-6 print:p-0 print:overflow-visible">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500">Compiling class broadsheet...</div>
          ) : error ? (
            <div className="p-12 text-center text-xs text-rose-600 font-semibold">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-300 pb-4">
                <h1 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight">
                  {data.school?.name} — CLASS EXAMINATION RESULT BROADSHEET
                </h1>
                <p className="text-xs text-slate-600 font-semibold">
                  Class: {data.classInfo?.name} • Term: {data.termInfo?.name} • Academic Session: {data.sessionInfo?.name}
                </p>
              </div>

              {/* Broadsheet Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-2 border-r border-slate-300 text-center w-12">Pos</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">Admission No</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">Student Name</th>
                      {data.subjects?.map((sub: any) => (
                        <th key={sub.id} className="py-2.5 px-2 border-r border-slate-300 text-center font-bold">
                          {sub.code || sub.name.slice(0, 4).toUpperCase()}
                        </th>
                      ))}
                      <th className="py-2.5 px-2 border-r border-slate-300 text-center font-bold bg-blue-50/50">Total</th>
                      <th className="py-2.5 px-2 border-r border-slate-300 text-center font-bold bg-emerald-50/50">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.termResults?.map((tr: any) => (
                      <tr key={tr.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center font-bold font-mono border-r border-slate-200 text-slate-900">
                          {tr.position || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium border-r border-slate-200 text-slate-700">
                          {tr.admission_number}
                        </td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-200 text-slate-900">
                          {tr.full_name}
                        </td>

                        {data.subjects?.map((sub: any) => {
                          const sc = data.studentScoresMap?.[tr.student_id]?.[sub.id];
                          return (
                            <td key={sub.id} className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[11px]">
                              {sc ? (
                                <span>
                                  <strong className="text-slate-900">{sc.total}</strong>{' '}
                                  <span className="text-[10px] text-slate-500 font-bold">({sc.grade})</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-2 text-center font-mono font-black border-r border-slate-200 text-blue-950 bg-blue-50/30">
                          {tr.total_score}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-black border-r border-slate-200 text-emerald-950 bg-emerald-50/30">
                          {tr.average_score}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="pt-4 text-xs text-slate-500 flex justify-between items-center border-t border-slate-200">
                <span>Total Students Compiled: {data.termResults?.length || 0}</span>
                <span className="italic">AcademiQ Automated Calculation & Position Engine</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Landscape PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
