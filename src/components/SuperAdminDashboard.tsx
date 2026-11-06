import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { School, SubscriptionPlan, PaymentVerificationCode, SchoolNotification, User } from '../types';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  ShieldAlert,
  CreditCard,
  Users,
  Search,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowLeft,
  Home,
  Database,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  Save,
  FileSpreadsheet,
  LogIn,
  KeyRound,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Bell,
  Megaphone,
  Send,
  Copy,
  Check,
  Share2,
  Tag,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { syncSchoolToFirestore, fetchAllFirestoreSchools, restoreSchoolFromFirestore } from '../utils/firebaseSync';
import firebaseConfig from '../../firebase-applet-config.json';

interface SuperAdminDashboardProps {
  onEnterSchoolPortal?: (token: string, user: User) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onEnterSchoolPortal }) => {
  const [overview, setOverview] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'schools' | 'codes' | 'notifications' | 'audit' | 'database'>('schools');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Database Persistence & Backup State
  const [dbStats, setDbStats] = useState<any | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [cloudSyncingAll, setCloudSyncingAll] = useState(false);
  const [cloudSyncResultMsg, setCloudSyncResultMsg] = useState<string | null>(null);

  // School Portal & Logins Management State
  const [selectedSchoolForLogins, setSelectedSchoolForLogins] = useState<any | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [schoolUsersLoading, setSchoolUsersLoading] = useState(false);
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<any | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [impersonatingSchoolId, setImpersonatingSchoolId] = useState<string | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);

  // Special Payment Verification Codes State
  const [paymentCodes, setPaymentCodes] = useState<PaymentVerificationCode[]>([]);
  const [paymentCodeStats, setPaymentCodeStats] = useState<{ totalCodes: number; activeCodes: number; redeemedCodes: number } | null>(null);
  const [paymentCodesLoading, setPaymentCodesLoading] = useState(false);
  const [codeFilter, setCodeFilter] = useState('all');
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [codeTargetSchool, setCodeTargetSchool] = useState<any | null>(null);
  const [codeForm, setCodeForm] = useState({
    school_id: '',
    issued_to_email: '',
    notes: '',
    custom_code: ''
  });
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCodeSuccess, setGeneratedCodeSuccess] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Notifications & Announcements State
  const [notificationsList, setNotificationsList] = useState<SchoolNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTargetSchool, setNotificationTargetSchool] = useState<any | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    target_type: 'single' as 'single' | 'bulk' | 'all',
    school_id: '',
    school_ids: [] as string[],
    title: '',
    message: '',
    category: 'announcement',
    priority: 'normal',
    target_role: 'all'
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, schoolsData, logsData] = await Promise.all([
        apiRequest('/api/admin/overview'),
        apiRequest('/api/admin/schools'),
        apiRequest('/api/admin/audit-logs'),
      ]);

      setOverview(overviewData);
      const localSchools = schoolsData.schools || [];
      setSchools(localSchools);
      setAuditLogs(logsData.logs || []);

      // Auto-Discovery: Check if any schools are saved in Firestore that are missing locally
      fetchAllFirestoreSchools().then(async (firestoreSchools) => {
        if (Array.isArray(firestoreSchools) && firestoreSchools.length > 0) {
          const localIds = new Set(localSchools.map((s: any) => s.id));
          const missingSchools = firestoreSchools.filter((fs: any) => fs.id && !localIds.has(fs.id));
          if (missingSchools.length > 0) {
            console.log(`[Auto-Recovery] Found ${missingSchools.length} schools in Cloud Firestore missing from local SQLite. Auto-recovering...`);
            const token = localStorage.getItem('multischool_auth_token') || '';
            for (const ms of missingSchools) {
              await restoreSchoolFromFirestore(ms.id, token).catch(() => null);
            }
            const updated = await apiRequest('/api/admin/schools');
            if (updated?.schools) setSchools(updated.schools);
          }
        }
      }).catch(err => console.warn('Cloud school auto-discovery note:', err));
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSchoolsCSV = async () => {
    try {
      const token = localStorage.getItem('multischool_auth_token') || '';
      const res = await fetch('/api/admin/export-schools-csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export schools.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AcademiQ_Registered_Schools_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      confetti({ particleCount: 50, spread: 60 });
      setActionMessage('Bulk schools export CSV downloaded successfully!');
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const loadDbStats = async () => {
    setDbLoading(true);
    try {
      const res = await apiRequest('/api/database/status');
      setDbStats(res);
    } catch (err: any) {
      console.error('Failed to load database stats:', err);
    } finally {
      setDbLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await apiRequest('/api/database/backup', { method: 'POST' });
      setActionMessage(res.message);
      loadDbStats();
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem('multischool_auth_token');
      const res = await fetch('/api/database/download-backup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AcademiQ_Full_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setActionMessage('Full database backup successfully downloaded to your device.');
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;
    if (!confirm('Are you sure you want to restore the database from this backup? Existing records will be synced without data loss.')) return;

    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);
      const res = await apiRequest('/api/database/restore', {
        method: 'POST',
        body: JSON.stringify({ backupData: parsed })
      });
      setActionMessage(res.message);
      loadDbStats();
      loadData();
      setRestoreFile(null);
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleSyncAllSchoolsToFirebase = async () => {
    setCloudSyncingAll(true);
    setCloudSyncResultMsg(null);
    try {
      const token = localStorage.getItem('multischool_auth_token') || '';
      let count = 0;
      for (const s of schools) {
        if (s.id) {
          await syncSchoolToFirestore(s.id, token);
          count++;
        }
      }
      setCloudSyncResultMsg(`Successfully synchronized all ${count} schools, students, scores, and report templates to Firebase Cloud!`);
      confetti({ particleCount: 70 });
    } catch (err: any) {
      setCloudSyncResultMsg('Firebase Cloud Sync Error: ' + (err.message || 'Sync failed.'));
    } finally {
      setCloudSyncingAll(false);
    }
  };

  const loadPaymentCodes = async () => {
    setPaymentCodesLoading(true);
    try {
      const res = await apiRequest('/api/admin/payment-codes');
      setPaymentCodes(res.codes || []);
      setPaymentCodeStats(res.metrics || null);
    } catch (err: any) {
      console.error('Failed to load payment codes:', err);
    } finally {
      setPaymentCodesLoading(false);
    }
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await apiRequest('/api/notifications');
      setNotificationsList(res.notifications || []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadPaymentCodes();
    loadNotifications();
  }, []);

  const handleApprove = async (schoolId: string, schoolName: string) => {
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ generate_code: true })
      });
      setActionMessage(res.message);
      confetti({ particleCount: 70, spread: 60 });
      if (res.code) {
        setGeneratedCodeSuccess({
          code: res.code,
          school_name: schoolName,
          status: 'active'
        });
        setShowGenerateCodeModal(true);
      }
      loadData();
      loadPaymentCodes();
    } catch (err: any) {
      alert('Error approving school: ' + err.message);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingCode(true);
    try {
      const res = await apiRequest('/api/admin/payment-codes/generate', {
        method: 'POST',
        body: JSON.stringify(codeForm)
      });
      setGeneratedCodeSuccess(res.code);
      setActionMessage(res.message);
      confetti({ particleCount: 50, spread: 45 });
      loadPaymentCodes();
      loadData();
    } catch (err: any) {
      alert('Failed to generate code: ' + err.message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRevokeCode = async (codeId: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke code ${code}? It can no longer be used for first-time login.`)) return;
    try {
      const res = await apiRequest(`/api/admin/payment-codes/${codeId}/revoke`, { method: 'POST' });
      setActionMessage(res.message);
      loadPaymentCodes();
    } catch (err: any) {
      alert('Failed to revoke code: ' + err.message);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      alert('Please enter notification title and message.');
      return;
    }
    setSendingNotification(true);
    try {
      const res = await apiRequest('/api/admin/notifications/send', {
        method: 'POST',
        body: JSON.stringify(notificationForm)
      });
      setActionMessage(res.message);
      setShowNotificationModal(false);
      setNotificationForm({
        target_type: 'single',
        school_id: '',
        school_ids: [],
        title: '',
        message: '',
        category: 'announcement',
        priority: 'normal',
        target_role: 'all'
      });
      confetti({ particleCount: 60 });
      loadNotifications();
    } catch (err: any) {
      alert('Failed to send notification: ' + err.message);
    } finally {
      setSendingNotification(false);
    }
  };

  const handleUpdateStatus = async (schoolId: string, status: 'rejected' | 'suspended' | 'approved') => {
    const reason = prompt(`Enter reason for marking this school as '${status}':`) || 'Administrative decision';
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleEnterPortal = async (schoolId: string) => {
    setImpersonatingSchoolId(schoolId);
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/impersonate`, { method: 'POST' });
      if (res.token && res.user && onEnterSchoolPortal) {
        onEnterSchoolPortal(res.token, res.user);
      }
    } catch (err: any) {
      alert('Failed to enter school portal: ' + err.message);
    } finally {
      setImpersonatingSchoolId(null);
    }
  };

  const handleSuspendSchool = async (schoolId: string, schoolName: string) => {
    const reason = prompt(`Reason for suspending '${schoolName}':`) || 'Administrative compliance review';
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert('Failed to suspend school: ' + err.message);
    }
  };

  const handleReactivateSchool = async (schoolId: string) => {
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/reactivate`, { method: 'POST' });
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert('Failed to reactivate school: ' + err.message);
    }
  };

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    const confirmation = prompt(`CRITICAL: You are about to permanently delete '${schoolName}' and ALL associated classes, students, marks, reports, and logins.\n\nType DELETE to confirm:`);
    if (confirmation !== 'DELETE') return;

    setDeletingSchoolId(schoolId);
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}`, { method: 'DELETE' });
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert('Failed to delete school: ' + err.message);
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const handleViewSchoolLogins = async (school: any) => {
    setSelectedSchoolForLogins(school);
    setSchoolUsersLoading(true);
    setResetPasswordResult(null);
    try {
      const res = await apiRequest(`/api/admin/schools/${school.id}/users`);
      setSchoolUsers(res.users || []);
    } catch (err: any) {
      alert('Failed to load school users: ' + err.message);
    } finally {
      setSchoolUsersLoading(false);
    }
  };

  const handleResetAdminPassword = async (schoolId: string) => {
    setResetPasswordLoading(true);
    try {
      const res = await apiRequest(`/api/admin/schools/${schoolId}/reset-admin-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newAdminPasswordInput.trim() || undefined })
      });
      setResetPasswordResult(res);
      setNewAdminPasswordInput('');
      const usersRes = await apiRequest(`/api/admin/schools/${schoolId}/users`);
      setSchoolUsers(usersRes.users || []);
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const pendingSchools = schools.filter((s) => s.status === 'pending');
  const filteredSchools = schools.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.state && s.state.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5" /> Platform Super Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Platform Governance & School Approval</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Review onboarding applications, manage subscription tiers, and audit multi-tenant security
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition backdrop-blur-xs flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Schools</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.metrics.totalSchools}</span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              {overview.metrics.activeSchools} active & approved
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Pending Applications</span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">{overview.metrics.pendingSchools}</span>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">Requires manual vetting</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Subscriptions</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.metrics.activeSubscriptions}</span>
            <span className="text-[11px] text-blue-600 font-medium mt-1 block">Annual & monthly plans</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Verified Platform Revenue</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              ₦{Number(overview.metrics.subscriptionRevenue).toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Total recorded payments</span>
          </div>
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer whitespace-nowrap ${
            activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Applications ({pendingSchools.length})
        </button>
        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer whitespace-nowrap ${
            activeTab === 'schools' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Registered Schools ({schools.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('codes');
            loadPaymentCodes();
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'codes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>Payment Codes ({paymentCodes.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('notifications');
            loadNotifications();
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-indigo-600" />
          <span>Announcements & Notices ({notificationsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer whitespace-nowrap ${
            activeTab === 'audit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('database');
            loadDbStats();
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'database' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Database & Persistence</span>
        </button>
      </div>

      {activeTab !== 'pending' && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <button
            onClick={() => setActiveTab('pending')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Pending Approvals ({pendingSchools.length})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNotificationTargetSchool(null);
                setNotificationForm({
                  target_type: 'bulk',
                  school_id: '',
                  school_ids: [],
                  title: '',
                  message: '',
                  category: 'announcement',
                  priority: 'normal',
                  target_role: 'all'
                });
                setShowNotificationModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Broadcast notification to multiple or all schools"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Bulk Announcement</span>
            </button>
            <button
              onClick={() => {
                setCodeTargetSchool(null);
                setCodeForm({ school_id: '', issued_to_email: '', notes: '', custom_code: '' });
                setGeneratedCodeSuccess(null);
                setShowGenerateCodeModal(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Generate special payment verification code"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Issue Payment Code</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: PENDING SCHOOL APPLICATIONS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingSchools.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">All Applications Processed</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are currently no new school onboarding requests waiting for approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSchools.map((school) => (
                <div key={school.id} className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase">
                        Pending Verification
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{school.name}</h3>
                      <p className="text-xs text-slate-500">{school.school_level} • {school.state}, {school.country}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 text-slate-700">
                    <div><strong>Admin:</strong> {school.admin_name || 'N/A'}</div>
                    <div><strong>Email:</strong> {school.email}</div>
                    <div><strong>Phone:</strong> {school.phone || 'N/A'}</div>
                    <div><strong>Address:</strong> {school.address || 'N/A'}</div>
                    <div><strong>Registered On:</strong> {new Date(school.created_at).toLocaleDateString()}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleApprove(school.id, school.name)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve School
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(school.id, 'rejected')}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200 cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL REGISTERED SCHOOLS */}
      {activeTab === 'schools' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search schools by name, email, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={handleExportSchoolsCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Download complete registry of all schools to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bulk Export Schools (CSV)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">School Name</th>
                  <th className="py-3 px-3">Administrator Login</th>
                  <th className="py-3 px-3">Level / Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment Verification</th>
                  <th className="py-3 px-3">Subscription</th>
                  <th className="py-3 px-3">Students</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-[11px] text-slate-500">{s.email}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{s.admin_name || 'School Admin'}</span>
                      <span className="text-[11px] text-blue-700 font-mono block select-all">{s.admin_email || s.email}</span>
                      {s.admin_phone && <span className="text-[10px] text-slate-500 block">{s.admin_phone}</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <span className="font-medium block">{s.school_level}</span>
                      <span className="text-[11px] text-slate-500">{s.state || 'N/A'}, {s.country}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        s.status === 'suspended' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {s.is_payment_verified ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                          {s.payment_code_used && (
                            <span className="block font-mono text-[9px] text-slate-500 font-semibold">{s.payment_code_used}</span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Unverified
                          </span>
                          <button
                            onClick={() => {
                              setCodeTargetSchool(s);
                              setCodeForm({
                                school_id: s.id,
                                issued_to_email: s.admin_email || s.email || '',
                                notes: `Issued code for ${s.name}`,
                                custom_code: ''
                              });
                              setGeneratedCodeSuccess(null);
                              setShowGenerateCodeModal(true);
                            }}
                            className="block text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                          >
                            Issue Code
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{s.plan_name || 'Standard'}</span>
                      <span className="text-[10px] text-slate-500">
                        {s.subscription_status === 'active' ? 'Active' : s.subscription_status || 'Trial'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{s.student_count || 0}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* 1. Enter School Portal */}
                        <button
                          onClick={() => handleEnterPortal(s.id)}
                          disabled={impersonatingSchoolId === s.id}
                          className="px-2 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          title="Enter school portal and manage as administrator"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{impersonatingSchoolId === s.id ? '...' : 'Portal'}</span>
                        </button>

                        {/* 2. Send Notification Button */}
                        <button
                          onClick={() => {
                            setNotificationTargetSchool(s);
                            setNotificationForm({
                              target_type: 'single',
                              school_id: s.id,
                              school_ids: [],
                              title: '',
                              message: '',
                              category: 'announcement',
                              priority: 'normal',
                              target_role: 'all'
                            });
                            setShowNotificationModal(true);
                          }}
                          className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition border border-indigo-200 cursor-pointer"
                          title={`Send Announcement or Notification to ${s.name}`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. Issue/Generate Payment Code Button */}
                        <button
                          onClick={() => {
                            setCodeTargetSchool(s);
                            setCodeForm({
                              school_id: s.id,
                              issued_to_email: s.admin_email || s.email || '',
                              notes: `Issued to ${s.name}`,
                              custom_code: ''
                            });
                            setGeneratedCodeSuccess(null);
                            setShowGenerateCodeModal(true);
                          }}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition border border-amber-200 cursor-pointer"
                          title={`Issue Payment Verification Code for ${s.name}`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. View School Logins & Reset Password */}
                        <button
                          onClick={() => handleViewSchoolLogins(s)}
                          className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition border border-purple-200 inline-flex items-center gap-1 cursor-pointer"
                          title="View all school user accounts and reset administrator credentials"
                        >
                          <span>Logins</span>
                        </button>

                        {/* 5. Suspend / Reactivate */}
                        {s.status === 'suspended' ? (
                          <button
                            onClick={() => handleReactivateSchool(s.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer"
                            title="Reactivate this school"
                          >
                            Reactivate
                          </button>
                        ) : s.status === 'approved' ? (
                          <button
                            onClick={() => handleSuspendSchool(s.id, s.name)}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition border border-amber-200 cursor-pointer"
                            title="Suspend school account and block user logins"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApprove(s.id, s.name)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        {/* 6. Delete School */}
                        <button
                          onClick={() => handleDeleteSchool(s.id, s.name)}
                          disabled={deletingSchoolId === s.id}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200 disabled:opacity-50"
                          title="Permanently delete school and all tenant records"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT VERIFICATION CODES */}
      {activeTab === 'codes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Special Payment Verification Codes
              </h3>
              <p className="text-xs text-slate-500">
                Single-use security codes issued to new schools after verifying manual offline payment with Super Admin Ahmad Auwal
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPaymentCodes}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${paymentCodesLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  setCodeTargetSchool(null);
                  setCodeForm({ school_id: '', issued_to_email: '', notes: '', custom_code: '' });
                  setGeneratedCodeSuccess(null);
                  setShowGenerateCodeModal(true);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Generate New Code</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          {paymentCodeStats && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Total Codes Generated</span>
                <span className="text-lg font-black text-slate-900">{paymentCodeStats.totalCodes}</span>
              </div>
              <div>
                <span className="text-amber-700 text-[11px] block font-medium">Active (Awaiting Redemption)</span>
                <span className="text-lg font-black text-amber-900">{paymentCodeStats.activeCodes}</span>
              </div>
              <div>
                <span className="text-emerald-700 text-[11px] block font-medium">Redeemed (First-Time Logins)</span>
                <span className="text-lg font-black text-emerald-900">{paymentCodeStats.redeemedCodes}</span>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code, school name, or email..."
                value={codeSearchQuery}
                onChange={(e) => setCodeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="redeemed">Redeemed Only</option>
                <option value="revoked">Revoked Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Verification Code</th>
                  <th className="py-2.5 px-3">Target School</th>
                  <th className="py-2.5 px-3">Issued To</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Redeemed Info</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentCodes
                  .filter((c) => {
                    const matchesStatus = codeFilter === 'all' || c.status === codeFilter;
                    const matchesSearch =
                      c.code.toLowerCase().includes(codeSearchQuery.toLowerCase()) ||
                      (c.school_name && c.school_name.toLowerCase().includes(codeSearchQuery.toLowerCase())) ||
                      (c.issued_to_email && c.issued_to_email.toLowerCase().includes(codeSearchQuery.toLowerCase()));
                    return matchesStatus && matchesSearch;
                  })
                  .map((codeItem) => {
                    const isCopied = copiedCode === codeItem.code;
                    const shareText = `Hello! Here is your AcademiQ First-Time Login Payment Verification Code: ${codeItem.code}\nSchool: ${codeItem.school_name || 'Your School'}\nPlease enter this code on first login to unlock your portal: https://ais-dev-3u56ilzcjscyzvrmcrpvxw-793402933659.europe-west2.run.app\nSupport: Ahmad Auwal (+2349155377861)`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

                    return (
                      <tr key={codeItem.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 select-all">
                            <span>{codeItem.code}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(codeItem.code);
                                setCopiedCode(codeItem.code);
                                setTimeout(() => setCopiedCode(null), 2000);
                              }}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Copy code to clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {codeItem.school_name || codeItem.school_id || 'Any School'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {codeItem.issued_to_email || '—'}
                          {codeItem.notes && <span className="block text-[10px] text-slate-400 truncate max-w-[150px]">{codeItem.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            codeItem.status === 'active' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            codeItem.status === 'redeemed' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {codeItem.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(codeItem.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {codeItem.status === 'redeemed' ? (
                            <div>
                              <span className="font-semibold text-emerald-800 block">Redeemed</span>
                              <span className="text-[10px] text-slate-400 block">{codeItem.redeemed_at ? new Date(codeItem.redeemed_at).toLocaleDateString() : ''}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Share code via WhatsApp"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                            {codeItem.status === 'active' && (
                              <button
                                onClick={() => handleRevokeCode(codeItem.id, codeItem.code)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                title="Revoke this code"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SCHOOL NOTIFICATIONS & BROADCASTS */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                School Notifications & Broadcast Announcements
              </h3>
              <p className="text-xs text-slate-500">
                Send targeted notifications to specific schools or broadcast announcements platform-wide
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadNotifications}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${notificationsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  setNotificationTargetSchool(null);
                  setNotificationForm({
                    target_type: 'bulk',
                    school_id: '',
                    school_ids: [],
                    title: '',
                    message: '',
                    category: 'announcement',
                    priority: 'normal',
                    target_role: 'all'
                  });
                  setShowNotificationModal(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Compose Notification</span>
              </button>
            </div>
          </div>

          {/* List of Sent Notifications */}
          {notificationsList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No announcements or notifications sent yet. Click "Compose Notification" to send your first message.
            </div>
          ) : (
            <div className="space-y-3">
              {notificationsList.map((notif) => (
                <div key={notif.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        notif.priority === 'urgent' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                        notif.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {notif.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                        {notif.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {notif.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div>
                      <strong>Target:</strong>{' '}
                      {notif.school_name ? (
                        <span className="text-indigo-700 font-semibold">{notif.school_name}</span>
                      ) : notif.school_id ? (
                        <span className="text-indigo-700 font-semibold">{notif.school_id}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">All Registered Schools (Broadcast)</span>
                      )}
                      {' • '}
                      <strong>Role:</strong> {notif.target_role.replace('_', ' ')}
                    </div>

                    <div>
                      <strong>Sender:</strong> {notif.sender_name || 'Super Admin'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Security & Tenant Isolation Audit Log</h3>
              <p className="text-xs text-slate-500">Every sensitive action, authentication event, and cross-tenant block is captured</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Action</th>
                  <th className="py-2.5 px-3">User Email</th>
                  <th className="py-2.5 px-3">Tenant School</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.user_email || 'System'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.school_id || 'Platform'}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.resource}</td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE & PERSISTENCE MANAGEMENT */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Main Persistence Banner */}
          <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-emerald-500/30 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5" /> Persistent Relational Database Engine
                </div>
                <h3 className="text-xl font-black">Zero Data Loss Guaranteed</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  AcademiQ runs on an isolated relational backend with WAL (Write-Ahead Logging) storage.
                  All school configurations, registered students, submitted marks, generated results, and verification PINs
                  are permanently committed to disk storage and retained across server restarts and updates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSyncAllSchoolsToFirebase}
                  disabled={cloudSyncingAll}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  title="Synchronize all schools and scores to Google Firebase Firestore"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-950 ${cloudSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{cloudSyncingAll ? 'Syncing to Firebase Cloud...' : 'Sync All Schools to Firebase Cloud'}</span>
                </button>
                <button
                  onClick={handleCreateBackup}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-white/20"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Checkpoint & Snapshot Now</span>
                </button>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Backup (.json)</span>
                </button>
              </div>
            </div>

            {/* Cloud connection tag */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Firebase Firestore Cloud: <strong className="text-emerald-300">{firebaseConfig.projectId}</strong></span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">DB: {firebaseConfig.firestoreDatabaseId}</span>
            </div>

            {cloudSyncResultMsg && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 mt-2 border ${
                cloudSyncResultMsg.toLowerCase().includes('error')
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : 'bg-emerald-900/60 border-emerald-400/50 text-emerald-200'
              }`}>
                {cloudSyncResultMsg.toLowerCase().includes('error') ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{cloudSyncResultMsg}</span>
              </div>
            )}
          </div>

          {/* Live Metrics Grid */}
          {dbLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Inspecting database engine status...
            </div>
          ) : dbStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engine & Storage</span>
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm font-black text-slate-900">{dbStats.engine}</div>
                <div className="text-[11px] font-mono text-slate-500 truncate" title={dbStats.databasePath}>
                  Path: {dbStats.databasePath}
                </div>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                  File Size: {dbStats.sizeFormatted}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Checkpoint</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm font-black text-slate-900">
                  {new Date(dbStats.lastCheckpoint).toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-500">
                  Latest Backup Snapshot:{' '}
                  <span className="font-semibold text-slate-800">
                    {dbStats.latestBackupTime ? new Date(dbStats.latestBackupTime).toLocaleString() : 'Ready to create'}
                  </span>
                </div>
                <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg inline-block">
                  Auto-Flush: Every 120s & Process Lifecycle
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Records</span>
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {String(Object.values(dbStats.counts || {}).reduce((a: any, b: any) => a + Number(b), 0))} Records
                </div>
                <div className="text-[11px] text-slate-500">
                  Schools: <strong>{dbStats.counts?.schools || 0}</strong> • Students: <strong>{dbStats.counts?.students || 0}</strong> • Scores: <strong>{dbStats.counts?.student_scores || 0}</strong>
                </div>
                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                  Relational Tables: {Object.keys(dbStats.counts || {}).length}
                </div>
              </div>
            </div>
          ) : null}

          {/* Database Table Breakdown & Disaster Recovery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table Inventory */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Database Table Record Inventory</h4>
                  <p className="text-xs text-slate-500">Real-time counts of persistent entities stored in the SQLite engine</p>
                </div>
                <button
                  onClick={loadDbStats}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {dbStats?.counts && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(dbStats.counts).map(([tbl, cnt]) => (
                    <div key={tbl} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium font-mono truncate" title={tbl}>
                        {tbl.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-900">
                        {String(cnt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disaster Recovery / Restore Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Restore from Backup Archive</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Upload a previously exported AcademiQ database JSON backup to restore all tables, schools, students, and marks.
                </p>

                <form onSubmit={handleRestoreBackup} className="mt-4 space-y-3">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={!restoreFile || restoring}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {restoring ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Restoring Records...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Restore & Synchronize</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                ✓ Full ACID Transactions active: Restores execute atomically in a single transaction with automatic rollback if an error occurs.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHOOL LOGIN ACCOUNTS & CREDENTIALS RESET */}
      {selectedSchoolForLogins && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSchoolForLogins(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedSchoolForLogins(null)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold mb-1 border border-purple-400/30">
                    School Identity & Staff Login Details
                  </div>
                  <h3 className="text-xl font-black">{selectedSchoolForLogins.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {selectedSchoolForLogins.school_level} • {selectedSchoolForLogins.state}, {selectedSchoolForLogins.country}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Primary School Contact:</span>
                  <span className="font-semibold text-slate-800">{selectedSchoolForLogins.email}</span>
                  {selectedSchoolForLogins.phone && (
                    <span className="text-slate-500 ml-2">({selectedSchoolForLogins.phone})</span>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleEnterPortal(selectedSchoolForLogins.id);
                    setSelectedSchoolForLogins(null);
                  }}
                  disabled={impersonatingSchoolId === selectedSchoolForLogins.id}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Enter This School's Portal</span>
                </button>
              </div>

              {/* Section 1: User Accounts Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Authorized Staff & Administrator Login Accounts ({schoolUsers.length})
                  </h4>
                  <button
                    onClick={() => handleViewSchoolLogins(selectedSchoolForLogins)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${schoolUsersLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {schoolUsersLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading school accounts...
                  </div>
                ) : schoolUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No individual user accounts recorded for this school yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Login Username / Email</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schoolUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{u.full_name}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-blue-700 select-all font-medium">
                              {u.email}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.role === 'school_admin' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                                u.role === 'bursar' ? 'bg-teal-100 text-teal-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{u.phone || '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {u.status || 'active'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2: Reset School Administrator Password */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                    Reset School Administrator Password
                  </h4>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  As Platform Super Admin, you can set a custom password or auto-generate a secure random password for the school principal or administrator account.
                </p>

                {resetPasswordResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-2 text-emerald-950 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{resetPasswordResult.message}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 font-mono text-xs space-y-1">
                      <div><strong>Admin Login:</strong> <span className="text-blue-700 font-bold select-all">{resetPasswordResult.admin_email}</span></div>
                      <div><strong>New Password:</strong> <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 select-all">{resetPasswordResult.new_password}</span></div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`School: ${selectedSchoolForLogins.name}\nEmail: ${resetPasswordResult.admin_email}\nPassword: ${resetPasswordResult.new_password}`);
                        alert('Credentials copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Copy Credentials to Clipboard
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <input
                      type="text"
                      placeholder="Enter new password (or leave empty to auto-generate)"
                      value={newAdminPasswordInput}
                      onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <button
                    onClick={() => handleResetAdminPassword(selectedSchoolForLogins.id)}
                    disabled={resetPasswordLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {resetPasswordLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedSchoolForLogins(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE / GENERATE PAYMENT VERIFICATION CODE */}
      {showGenerateCodeModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGenerateCodeModal(false);
              setGeneratedCodeSuccess(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8">
            <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 text-white p-6 relative">
              <button
                onClick={() => {
                  setShowGenerateCodeModal(false);
                  setGeneratedCodeSuccess(null);
                }}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold mb-1 border border-amber-400/30">
                    Platform First-Time Login Key
                  </div>
                  <h3 className="text-xl font-black">Issue Payment Verification Code</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Unlocks initial login after offline payment confirmation with Super Admin
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {generatedCodeSuccess ? (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Code Successfully Generated!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Issue this code to the school administrator for their first-time portal unlock.
                    </p>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                      Single-Use Verification Code
                    </span>
                    <div className="font-mono text-2xl font-black text-amber-950 tracking-wider select-all py-1">
                      {generatedCodeSuccess.code}
                    </div>
                    {generatedCodeSuccess.school_name && (
                      <span className="text-xs text-slate-600 block">
                        Assigned to: <strong>{generatedCodeSuccess.school_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCodeSuccess.code);
                        setCopiedCode(generatedCodeSuccess.code);
                        setTimeout(() => setCopiedCode(null), 2500);
                      }}
                      className="w-full sm:flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {copiedCode === generatedCodeSuccess.code ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copied Code!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hello! Here is your AcademiQ Verification Code to unlock your school portal: ${generatedCodeSuccess.code}\nSchool: ${generatedCodeSuccess.school_name || 'Your School'}\nLogin here: https://ais-dev-3u56ilzcjscyzvrmcrpvxw-793402933659.europe-west2.run.app\nSupport: Ahmad Auwal (+2349155377861)`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between">
                    <button
                      onClick={() => {
                        setGeneratedCodeSuccess(null);
                        setCodeForm({ school_id: '', issued_to_email: '', notes: '', custom_code: '' });
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      + Generate Another Code
                    </button>
                    <button
                      onClick={() => {
                        setShowGenerateCodeModal(false);
                        setGeneratedCodeSuccess(null);
                      }}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerateCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target School</label>
                    <select
                      value={codeForm.school_id}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const target = schools.find((s) => s.id === sId);
                        setCodeForm({
                          ...codeForm,
                          school_id: sId,
                          issued_to_email: target ? target.admin_email || target.email : codeForm.issued_to_email
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    >
                      <option value="">Any School (Universal Code)</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status} • {s.is_payment_verified ? 'Verified' : 'Payment Pending'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Issue to Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. principal@school.com"
                      value={codeForm.issued_to_email}
                      onChange={(e) => setCodeForm({ ...codeForm, issued_to_email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Internal Note / Proof of Payment</label>
                    <input
                      type="text"
                      placeholder="e.g. Paid via direct transfer to Ahmad Auwal (Ref: #8921)"
                      value={codeForm.notes}
                      onChange={(e) => setCodeForm({ ...codeForm, notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Custom Code Format (Optional, leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      placeholder="ACAD-PAY-XXXX-XXXX"
                      value={codeForm.custom_code}
                      onChange={(e) => setCodeForm({ ...codeForm, custom_code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    Note: Payment verification allows first-time login for approved schools. As requested, no paid subscription is created at this step.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGenerateCodeModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generatingCode}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      {generatingCode ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Generate Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEND NOTIFICATION OR BULK ANNOUNCEMENT */}
      {showNotificationModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNotificationModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 relative">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/30">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold mb-1 border border-indigo-400/30">
                    Admin Announcement Hub
                  </div>
                  <h3 className="text-xl font-black">
                    {notificationTargetSchool ? `Notify ${notificationTargetSchool.name}` : 'Send Announcement / Notification'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Broadcast critical alerts, onboarding guidance, or system updates to schools
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
              {/* Target Scope */}
              {!notificationTargetSchool && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Recipient Scope</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNotificationForm({ ...notificationForm, target_type: 'all' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        notificationForm.target_type === 'all'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All Schools
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationForm({ ...notificationForm, target_type: 'single' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        notificationForm.target_type === 'single'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Single School
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationForm({ ...notificationForm, target_type: 'bulk' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        notificationForm.target_type === 'bulk'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Bulk Multi-Select
                    </button>
                  </div>
                </div>
              )}

              {/* Single School Selection */}
              {notificationForm.target_type === 'single' && !notificationTargetSchool && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select School</label>
                  <select
                    value={notificationForm.school_id}
                    onChange={(e) => setNotificationForm({ ...notificationForm, school_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Choose School --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bulk Multi-select Selection */}
              {notificationForm.target_type === 'bulk' && !notificationTargetSchool && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Target Schools ({notificationForm.school_ids.length} selected)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50 text-xs">
                    {schools.map((s) => {
                      const isSelected = notificationForm.school_ids.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNotificationForm({
                                  ...notificationForm,
                                  school_ids: [...notificationForm.school_ids, s.id]
                                });
                              } else {
                                setNotificationForm({
                                  ...notificationForm,
                                  school_ids: notificationForm.school_ids.filter((id) => id !== s.id)
                                });
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className="text-[10px] text-slate-400">({s.school_level})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={notificationForm.category}
                    onChange={(e) => setNotificationForm({ ...notificationForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="payment">Payment Verification</option>
                    <option value="system">System Maintenance</option>
                    <option value="academic">Academic Notice</option>
                    <option value="security">Security Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={notificationForm.priority}
                    onChange={(e) => setNotificationForm({ ...notificationForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Roles</label>
                  <select
                    value={notificationForm.target_role}
                    onChange={(e) => setNotificationForm({ ...notificationForm, target_role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">All Roles</option>
                    <option value="school_admin">School Admins Only</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="bursar">Bursars Only</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome to AcademiQ / New Term Verification Notice"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the announcement or notice message here..."
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {sendingNotification ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Notification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
