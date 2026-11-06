import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { DollarSign, CheckCircle2, Receipt, Search, Plus, CreditCard, User } from 'lucide-react';
import confetti from 'canvas-confetti';

export const BursarDashboard: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    fee_category_id: '',
    amount_paid: '',
    payment_method: 'bank_transfer',
    remarks: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    amount: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [financeData, stdData] = await Promise.all([
        apiRequest('/api/finance/overview'),
        apiRequest('/api/school/students'),
      ]);
      setOverview(financeData);
      setStudents(stdData.students || []);

      if (stdData.students?.length > 0) {
        setPaymentForm((p) => ({ ...p, student_id: stdData.students[0].id }));
      }
      if (financeData.categories?.length > 0) {
        setPaymentForm((p) => ({ ...p, fee_category_id: financeData.categories[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setShowCategoryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentForm),
      });
      alert(`Payment recorded successfully! Official Receipt: ${res.receipt_number}`);
      setShowPaymentModal(false);
      confetti({ particleCount: 50 });
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/finance/categories', {
        method: 'POST',
        body: JSON.stringify(categoryForm),
      });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', amount: '' });
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-2">
            School Bursary & Financial Administration
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Tuition & Fee Collection Manager</h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Record student fee transactions, generate numbered receipts, and maintain tenant-isolated ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Add Fee Category
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black transition shadow-md shadow-teal-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4" /> Record New Payment
          </button>
        </div>
      </div>

      {/* Metrics */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Collections Recorded</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ₦{Number(overview.totalCollections).toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Verified school revenue</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Fee Categories</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.categories?.length || 0}</span>
            <span className="text-[11px] text-blue-600 font-medium mt-1 block">Tuition, ICT & Levies</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Receipts Issued</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.recentPayments?.length || 0}</span>
            <span className="text-[11px] text-teal-600 font-medium mt-1 block">Numbered payment records</span>
          </div>
        </div>
      )}

      {/* Recent Payments Table */}
      {overview && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Recent Student Fee Receipts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Admission No</th>
                  <th className="py-2.5 px-3">Fee Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.recentPayments?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{p.receipt_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{p.student_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.admission_number}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.category_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                      ₦{Number(p.amount_paid).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-slate-600">{p.payment_method?.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(p.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {showPaymentModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaymentModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Fee Payment</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={paymentForm.student_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number}) — {s.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Category *</label>
                <select
                  value={paymentForm.fee_category_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, fee_category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                >
                  {overview?.categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₦{Number(c.amount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₦) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="65000"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="pos">POS Terminal</option>
                    <option value="online">Online Card Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. 1st term balance cleared"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs">
                  Issue Official Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showCategoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCategoryModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Fee Category</h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PTA Levy or Examination Fee"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Amount (₦)</label>
                <input
                  type="number"
                  required
                  placeholder="15000"
                  value={categoryForm.amount}
                  onChange={(e) => setCategoryForm({ ...categoryForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
