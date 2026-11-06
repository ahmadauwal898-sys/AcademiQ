import React, { useState, useEffect } from 'react';
import { apiRequest, setStoredToken } from '../api';
import { School, User } from '../types';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Award,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  DollarSign,
  FileText,
  Lock,
  ChevronRight,
  School as SchoolIcon,
  HelpCircle,
  ArrowLeft,
  Home,
  Upload,
  Image,
  Trash2,
  Palette,
  Info,
  KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PWAInstallButton } from './PWAInstallButton';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const PRESET_BADGES = [
  {
    name: 'Royal Crest',
    color: '#1e3a8a',
    svg: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <path d="M50 5 L85 20 L85 55 C85 75 50 95 50 95 C50 95 15 75 15 55 L15 20 Z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="3"/>
  <polygon points="50,22 54,34 67,35 57,44 60,57 50,49 40,57 43,44 33,35 46,34" fill="#f59e0b"/>
  <path d="M35 64 Q50 58 65 64 L65 70 Q50 64 35 70 Z" fill="#ffffff"/>
  <text x="50" y="82" font-family="Arial" font-size="6.5" font-weight="bold" fill="#f59e0b" text-anchor="middle">VERITAS</text>
</svg>`)}`
  },
  {
    name: 'Emerald Laurels',
    color: '#065f46',
    svg: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#065f46" stroke="#34d399" stroke-width="3"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="2,2"/>
  <path d="M50 20 L58 38 L78 38 L62 50 L68 70 L50 58 L32 70 L38 50 L22 38 L42 38 Z" fill="#34d399"/>
  <path d="M36 72 Q50 66 64 72 L64 76 Q50 70 36 76 Z" fill="#ffffff"/>
  <text x="50" y="84" font-family="Arial" font-size="6" font-weight="bold" fill="#ffffff" text-anchor="middle">EXCELLENCE</text>
</svg>`)}`
  },
  {
    name: 'Crimson Heritage',
    color: '#831843',
    svg: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <path d="M50 8 L88 24 L88 54 C88 74 50 92 50 92 C50 92 12 74 12 54 L12 24 Z" fill="#831843" stroke="#fbbf24" stroke-width="3"/>
  <circle cx="50" cy="40" r="14" fill="#fbbf24"/>
  <path d="M46 34 L54 34 L54 44 L50 48 L46 44 Z" fill="#831843"/>
  <path d="M32 62 Q50 56 68 62 L68 67 Q50 61 32 67 Z" fill="#ffffff"/>
  <text x="50" y="78" font-family="Arial" font-size="6" font-weight="bold" fill="#fbbf24" text-anchor="middle">SAPIENTIA</text>
</svg>`)}`
  },
  {
    name: 'Golden Torch',
    color: '#78350f',
    svg: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <polygon points="50,6 90,26 90,74 50,94 10,74 10,26" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
  <path d="M47 30 Q50 18 53 30 Q57 40 50 46 Q43 40 47 30 Z" fill="#f59e0b"/>
  <path d="M45 46 L55 46 L53 72 L47 72 Z" fill="#94a3b8"/>
  <text x="50" y="83" font-family="Arial" font-size="6" font-weight="bold" fill="#f59e0b" text-anchor="middle">VIRTUS</text>
</svg>`)}`
  }
];

interface PublicLandingProps {
  onLoginSuccess: (user: User) => void;
  onOpenPublicChecker: () => void;
  initialShowRegister?: boolean;
  initialLoginType?: 'school' | 'super_admin';
  initialTab?: 'overview' | 'register' | 'login' | 'pricing';
  onOpenAbout?: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  onLoginSuccess,
  onOpenPublicChecker,
  initialShowRegister = false,
  initialLoginType = 'school',
  initialTab,
  onOpenAbout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'login' | 'pricing'>(
    initialTab || (initialShowRegister ? 'register' : 'login')
  );
  const [loginType, setLoginType] = useState<'school' | 'super_admin'>(initialLoginType);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialLoginType) {
      setLoginType(initialLoginType);
    }
  }, [initialLoginType]);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    school_name: '',
    school_email: '',
    school_phone: '',
    school_address: '',
    country: 'Nigeria',
    state: 'Lagos',
    school_level: 'Senior Secondary',
    logo_url: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    password: '',
    confirm_password: '',
    accept_terms: false,
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<any | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.accept_terms) {
      setRegError('You must confirm acceptance of terms and conditions.');
      return;
    }
    if (regForm.password !== regForm.confirm_password) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegLoading(true);
    setRegError(null);

    try {
      const res = await apiRequest('/api/auth/register-school', {
        method: 'POST',
        body: JSON.stringify(regForm),
      });

      // Mirror school document to Cloud Firestore
      if (res.school_id) {
        if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => null);
        }
        setDoc(doc(db, 'schools', res.school_id), {
          id: res.school_id,
          name: regForm.school_name,
          email: regForm.school_email,
          phone: regForm.school_phone,
          address: regForm.school_address,
          school_level: regForm.school_level,
          status: res.status || 'approved',
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(e => console.warn('Firestore school registration sync note:', e));
      }

      setRegSuccess(res);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setRegError(err.message || 'School registration failed. Please review fields.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (res.token && res.user) {
        setStoredToken(res.token);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await apiRequest('/api/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.token && res.user) {
        setStoredToken(res.token);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFirebaseGoogleLogin = async (portalType: 'school' | 'super_admin') => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        throw new Error('Google Sign-In completed but no email was returned.');
      }

      const res = await apiRequest('/api/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          email: fbUser.email,
          name: fbUser.displayName || 'Authorized User',
          firebase_uid: fbUser.uid,
          role_hint: portalType === 'super_admin' ? 'super_admin' : undefined
        }),
      });

      if (res.token && res.user) {
        setStoredToken(res.token);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('Google sign-in popup was cancelled.');
      } else {
        setLoginError(err.message || 'Firebase Authentication failed.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Sub-bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3 overflow-x-auto py-2">
            <button
              onClick={() => {
                setLoginType('school');
                setActiveTab('login');
              }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'login' && loginType === 'school'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Sign In to School
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              <SchoolIcon className="w-3.5 h-3.5" />
              Register New School
            </button>
            <button
              onClick={onOpenPublicChecker}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Verify Result PIN
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'overview' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Platform Overview
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoginType('school');
                setActiveTab('login');
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white p-8 sm:p-14 overflow-hidden shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                <div className="max-w-2xl space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Enterprise Multi-Tenant Architecture
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                    One Unified Platform for Hundreds of Independent Schools.
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    AcademiQ isolates every school's data on the server with independent grading scales, automated position ranking, A4 report cards, broadsheets, fee accounting, and cryptographic public result verification.
                  </p>
                </div>
                <div className="shrink-0 flex items-center justify-center">
                  <img
                    src="/academiq-icon.png"
                    alt="AcademiQ Platform Badge"
                    className="w-32 h-32 sm:w-44 sm:h-44 object-contain rounded-3xl bg-white/10 p-2 border-2 border-white/20 shadow-2xl backdrop-blur-xs transform hover:scale-105 transition"
                  />
                </div>
              </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setLoginType('school');
                      setActiveTab('login');
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" /> Sign In to Your School
                  </button>
                  <PWAInstallButton variant="hero" />
                  <button
                    onClick={() => setActiveTab('register')}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                  >
                    <SchoolIcon className="w-4 h-4" /> Register New School
                  </button>
                  <button
                    onClick={onOpenPublicChecker}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm transition backdrop-blur-xs flex items-center gap-2 cursor-pointer border border-white/20"
                  >
                    Check Result PIN <Sparkles className="w-4 h-4 text-emerald-400" />
                  </button>
                  {onOpenAbout && (
                    <button
                      onClick={onOpenAbout}
                      className="px-6 py-3 bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white font-semibold rounded-xl text-sm transition backdrop-blur-xs flex items-center gap-2 cursor-pointer border border-blue-400/30"
                    >
                      <Info className="w-4 h-4 text-blue-400" />
                      About AcademiQ
                    </button>
                  )}
                </div>
              </div>

            {/* Core Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Guaranteed Tenant Isolation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every query is server-authenticated. Teachers and administrators from School A cannot query, tamper with, or inspect School B records.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Server-Side Result Computation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Authoritative validation of continuous assessment (CA1, CA2, CA3) and examinations, automated grading, tied class positions, and frozen historical snapshots.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">A4 Reports & Class Broadsheets</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Download professional individual report cards and complete multi-subject class result broadsheets as PDFs or print directly on A4 paper.
                </p>
              </div>
            </div>

            {/* Verification & Approval Flow */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-10">
              <div className="max-w-2xl mb-8">
                <h2 className="text-2xl font-black tracking-tight">Structured School Onboarding Workflow</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  How AcademiQ prevents fraudulent schools while providing instant deployment
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-blue-400">STEP 01</span>
                  <h4 className="text-sm font-bold">Registration</h4>
                  <p className="text-xs text-slate-400">School profile and administrator account created in Pending status.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-amber-400">STEP 02</span>
                  <h4 className="text-sm font-bold">Admin Vetting</h4>
                  <p className="text-xs text-slate-400">Super Administrator verifies credentials and approves application.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">STEP 03</span>
                  <h4 className="text-sm font-bold">Plan Activation</h4>
                  <p className="text-xs text-slate-400">Subscription plan assigned with student and staff tier limits.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-purple-400">STEP 04</span>
                  <h4 className="text-sm font-bold">School Launch</h4>
                  <p className="text-xs text-slate-400">Register classes, teachers, student scores, and issue PINs.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SCHOOL REGISTRATION TAB */}
        {activeTab === 'register' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" />
              <span>Back to Home Overview</span>
            </button>

            {/* Portal Type Toggle Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-200/80 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setLoginType('school');
                  setActiveTab('login');
                  setLoginEmail('');
                  setLoginPassword('');
                  setLoginError(null);
                }}
                className="p-3 rounded-xl text-left transition cursor-pointer flex items-center gap-3 text-slate-600 hover:text-slate-900"
              >
                <div className="p-2 rounded-lg bg-slate-300 text-slate-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">School Sign In</div>
                  <div className="text-[10px] text-slate-500 font-normal">Admins, Teachers, Bursars</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError(null);
                }}
                className="p-3 rounded-xl text-left transition cursor-pointer flex items-center gap-3 bg-white text-slate-900 shadow-md font-bold"
              >
                <div className="p-2 rounded-lg bg-emerald-600 text-white">
                  <SchoolIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Register School</div>
                  <div className="text-[10px] text-slate-500 font-normal">New Institution</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginType('super_admin');
                  setActiveTab('login');
                  setLoginEmail('academia.multi.tenant@gmail.com');
                  setLoginPassword('@Candfe69a9');
                  setLoginError(null);
                }}
                className="p-3 rounded-xl text-left transition cursor-pointer flex items-center gap-3 text-slate-600 hover:text-slate-900"
              >
                <div className="p-2 rounded-lg bg-slate-300 text-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Super Admin</div>
                  <div className="text-[10px] text-slate-400 font-normal">Platform Oversight</div>
                </div>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 sm:p-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                    <SchoolIcon className="w-6 h-6 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Register Your Institution</h2>
                    <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                      Multi-Tenant School Account Application (Vetted by Platform Super Administrator)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-white/20"
                >
                  ✕ Close
                </button>
              </div>

            {regSuccess ? (
              <div className="p-8 sm:p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Application Submitted Successfully!</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                  Your school record for <span className="font-bold text-slate-900">{regSuccess.school_name}</span> has been created with status <span className="font-bold text-amber-600 uppercase">Pending Approval</span>.
                </p>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl max-w-lg mx-auto text-xs text-amber-950 text-left space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>Next Step: Platform Approval & Payment Verification Code</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Under AcademiQ security rules, Super Admin must approve your registration. Once your manual payment is verified with Super Admin Ahmad Auwal, a single-use payment verification code (<code className="font-mono font-bold">ACAD-PAY-XXXX-XXXX</code>) will be issued to unlock your first-time login without adding recurring subscriptions.
                  </p>
                  <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="font-bold block text-slate-900">Ahmad Auwal (CEO BG GROUP OF SOFTWARES)</span>
                      <span className="text-slate-600">WhatsApp: +2349155377861 • ahmadauwal898@gmail.com</span>
                    </div>
                    <a
                      href="https://wa.me/2349155377861?text=Hello%20Ahmad%20Auwal,%20I%20have%20registered%20my%20school%20on%20AcademiQ%20and%20need%20approval%20and%20payment%20verification%20code."
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs whitespace-nowrap"
                    >
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition cursor-pointer"
                  >
                    Proceed to Login
                  </button>
                  <button
                    onClick={() => setRegSuccess(null)}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition cursor-pointer"
                  >
                    Register Another School
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-6">
                {regError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    {regError}
                  </div>
                )}

                {/* Section A: School Profile */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> School Institution Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official School Name *</label>
                      <input
                        type="text"
                        required
                        value={regForm.school_name}
                        onChange={(e) => setRegForm({ ...regForm, school_name: e.target.value })}
                        placeholder="e.g. Crown Heights International Academy"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official School Email *</label>
                      <input
                        type="email"
                        required
                        value={regForm.school_email}
                        onChange={(e) => setRegForm({ ...regForm, school_email: e.target.value })}
                        placeholder="contact@crownheights.edu"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">School Phone Number</label>
                      <input
                        type="tel"
                        value={regForm.school_phone}
                        onChange={(e) => setRegForm({ ...regForm, school_phone: e.target.value })}
                        placeholder="+234 803 000 0000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">School Level *</label>
                      <select
                        value={regForm.school_level}
                        onChange={(e) => setRegForm({ ...regForm, school_level: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      >
                        <option value="Nursery">Nursery & Early Years</option>
                        <option value="Primary">Primary Elementary</option>
                        <option value="Junior Secondary">Junior Secondary School (JSS)</option>
                        <option value="Senior Secondary">Senior Secondary School (SSS)</option>
                        <option value="Combined K-12">Combined K-12 (All Levels)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                      <input
                        type="text"
                        value={regForm.state}
                        onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                        placeholder="Lagos, Abuja, Rivers..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Campus Address</label>
                      <input
                        type="text"
                        value={regForm.school_address}
                        onChange={(e) => setRegForm({ ...regForm, school_address: e.target.value })}
                        placeholder="Plot 12 Education Avenue"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    {/* School Logo / Official Badge Upload */}
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          School Badge / Official Logo <span className="text-slate-400 font-normal">(Printed on all Report Cards)</span>
                        </label>
                        {regForm.logo_url && (
                          <button
                            type="button"
                            onClick={() => setRegForm({ ...regForm, logo_url: '' })}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                          </button>
                        )}
                      </div>

                      {regForm.logo_url ? (
                        <div className="flex items-center gap-4 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-blue-200 p-2 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={regForm.logo_url}
                              alt="School Badge"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> School Badge Attached
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              This emblem will be prominently featured on the header of all printed terminal report cards.
                            </p>
                          </div>
                          <div>
                            <label className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition">
                              <Upload className="w-3.5 h-3.5 text-blue-600" />
                              <span>Replace</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      setRegForm({ ...regForm, logo_url: ev.target?.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50/70 hover:bg-blue-50/40 cursor-pointer transition group">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              Click to upload School Crest or Logo
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              PNG, JPG, SVG or WebP format (transparent background recommended)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setRegForm({ ...regForm, logo_url: ev.target?.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          {/* Quick Preset Badges */}
                          <div className="pt-1">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                              Or choose from high-resolution institutional badges:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {PRESET_BADGES.map((b) => (
                                <button
                                  type="button"
                                  key={b.name}
                                  onClick={() => setRegForm({ ...regForm, logo_url: b.svg })}
                                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-left flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 p-1 shrink-0 flex items-center justify-center">
                                    <img src={b.svg} alt={b.name} className="w-full h-full object-contain" />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-800 truncate">{b.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Administrator Account */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-600" /> Primary School Administrator Account
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Full Name *</label>
                      <input
                        type="text"
                        required
                        value={regForm.admin_name}
                        onChange={(e) => setRegForm({ ...regForm, admin_name: e.target.value })}
                        placeholder="e.g. Dr. Grace Alabi (Principal)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email (Login Username) *</label>
                      <input
                        type="email"
                        required
                        value={regForm.admin_email}
                        onChange={(e) => setRegForm({ ...regForm, admin_email: e.target.value })}
                        placeholder="principal@crownheights.edu"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Password *</label>
                      <input
                        type="password"
                        required
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        required
                        value={regForm.confirm_password}
                        onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms confirmation */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.accept_terms}
                      onChange={(e) => setRegForm({ ...regForm, accept_terms: e.target.checked })}
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600 leading-normal">
                      I certify that I am an authorized representative of this educational institution, and confirm agreement with AcademiQ terms, data protection compliance, and platform approval policies.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {regLoading ? 'Creating School & Administrator Account...' : 'Submit School Registration'}
                </button>

                <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
                  Already registered your school?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('school');
                      setActiveTab('login');
                    }}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Sign In to School Portal →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

        {/* 3. SIGN IN TAB */}
        {activeTab === 'login' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" />
              <span>Back to Home Overview</span>
            </button>

            {/* Portal Navigation Header */}
            {loginType === 'super_admin' ? (
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-2xl border border-amber-900/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">Platform Administration Mode</span>
                    <span className="text-[10px] text-slate-400">Restricted to Platform Super Administrator</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginType('school');
                    setLoginEmail('');
                    setLoginPassword('');
                    setLoginError(null);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to School Sign In</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType('school');
                    setActiveTab('login');
                    setLoginEmail('');
                    setLoginPassword('');
                    setLoginError(null);
                  }}
                  className="p-3 rounded-xl text-left transition cursor-pointer flex items-center gap-3 bg-white text-slate-900 shadow-md font-bold"
                >
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">School Sign In</div>
                    <div className="text-[10px] text-slate-500 font-normal">Admins, Teachers, Bursars</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError(null);
                  }}
                  className="p-3 rounded-xl text-left transition cursor-pointer flex items-center gap-3 text-slate-600 hover:text-slate-900"
                >
                  <div className="p-2 rounded-lg bg-slate-300 text-slate-700">
                    <SchoolIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Register School</div>
                    <div className="text-[10px] text-slate-500 font-normal">New Institution</div>
                  </div>
                </button>
              </div>
            )}

            {/* Main Auth Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {loginType === 'school' ? (
                <>
                  {/* School Portal Header */}
                  <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-7 relative">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-3.5">
                      <img
                        src="/academiq-icon.png"
                        alt="AcademiQ School Platform"
                        className="w-14 h-14 rounded-2xl object-contain bg-white p-1 border border-white/20 shadow-lg shadow-blue-900/50 shrink-0"
                      />
                      <div>
                        <h2 className="text-xl font-black tracking-tight">School Portal Login</h2>
                        <p className="text-blue-200 text-xs mt-0.5">
                          Authorized access for school administrators, teachers, and bursars
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Multi-Tenancy Boundary Notice */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Strict Institution Partitioning</span>
                        <span className="text-[11px] text-blue-800">
                          School logins are strictly restricted to your institution. When you sign in, you are routed directly to your own school dashboard and cannot access any other school's records.
                        </span>
                      </div>
                    </div>

                    {/* Quick Demo 1-Click Access for Evaluation */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick 1-Click Role Logins:
                        </span>
                        <span className="text-[10px] text-slate-500">Instant Demo Access</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('admin@apexacademy.edu')}
                          disabled={loginLoading}
                          className="px-2.5 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                        >
                          <div className="text-[11px] font-bold text-slate-900 group-hover:text-blue-700">🏫 School Admin</div>
                          <div className="text-[10px] text-slate-500 truncate">admin@apexacademy.edu</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('teacher@apexacademy.edu')}
                          disabled={loginLoading}
                          className="px-2.5 py-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                        >
                          <div className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-700">👨‍🏫 Class Teacher</div>
                          <div className="text-[10px] text-slate-500 truncate">teacher@apexacademy.edu</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('bursar@apexacademy.edu')}
                          disabled={loginLoading}
                          className="px-2.5 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                        >
                          <div className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-700">💼 School Bursar</div>
                          <div className="text-[10px] text-slate-500 truncate">bursar@apexacademy.edu</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleFirebaseGoogleLogin('school')}
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 text-slate-800 font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Sign In with Google (Firebase Authentication)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">or institutional email login</span>
                        <div className="h-px bg-slate-200 flex-1" />
                      </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                          {loginError}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email Address</label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="e.g. admin@apexacademy.edu"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 cursor-pointer"
                      >
                        {loginLoading ? 'Authenticating School Account...' : 'Sign In to School Portal'}
                      </button>
                    </form>

                    {/* Quick Link to Register & Discrete Super Admin Entry */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <div>
                        Don't have an account for your school yet?{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('register')}
                          className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          Register School →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginType('super_admin');
                          setLoginEmail('');
                          setLoginPassword('');
                          setLoginError(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
                        title="Restricted Platform Administrator Access"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Platform Super Admin Sign In →</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Super Admin Header */}
                  <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 text-white p-6 sm:p-7 relative border-b border-amber-900/40">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/30">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold mb-1">
                          Platform Operator Access Only
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-white">Platform Super Admin Portal</h2>
                        <p className="text-amber-200/80 text-xs mt-0.5">
                          Multi-school governance, application approvals, subscription tiers, and platform audit
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Super Admin Privilege Notice */}
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-600" /> Super Admin Dashboard Rights
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Only the Platform Super Administrator can access the Super Admin Dashboard and view all registered schools across the system. School administrators and teachers have access strictly to their individual school.
                      </p>
                    </div>

                    {/* Super Admin Quick Demo 1-Click Access */}
                    <div className="p-3 bg-slate-900 border border-amber-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                      <div>
                        <span className="font-bold text-amber-300 block">Instant Platform Oversight Demo</span>
                        <span className="text-[10px] text-slate-400">One-click sign in as Platform Super Admin</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('academia.multi.tenant@gmail.com')}
                        disabled={loginLoading}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sign In as Super Admin ⚡</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleFirebaseGoogleLogin('super_admin')}
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-white hover:bg-amber-50/50 border-2 border-amber-300 text-slate-900 font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Sign In with Super Admin Google Account</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">or platform password</span>
                        <div className="h-px bg-slate-200 flex-1" />
                      </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                          {loginError}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Super Admin Email</label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="academia.multi.tenant@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Super Admin Password</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-amber-400 font-bold rounded-xl text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        {loginLoading ? 'Authenticating Super Admin...' : 'Sign In as Platform Super Admin'}
                      </button>
                    </form>

                    <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginType('school');
                          setLoginEmail('');
                          setLoginPassword('');
                          setLoginError(null);
                        }}
                        className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        ← Back to School Portal Login
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        Register New School
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 text-center">
                      Restricted platform governance environment. Unauthorized access attempts are monitored and recorded in the immutable security audit log.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. SUBSCRIPTION PLANS TAB */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" />
              <span>Back to Home Overview</span>
            </button>

            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Simple, Transparent Pricing</h2>
              <p className="text-slate-600 text-sm">
                Scale from a single nursery branch to large multi-campus secondary colleges
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-sm hover:shadow-lg transition">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Starter School</h3>
                  <p className="text-xs text-slate-500 mt-1">For small nurseries and primary schools</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₦35,000 <span className="text-xs font-normal text-slate-500">/ year</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 200 Students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 20 Teachers & Staff</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automated Continuous Assessment</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Printable Report Cards</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Daily Attendance Register</li>
                </ul>
                <button
                  onClick={() => setActiveTab('register')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Choose Starter
                </button>
              </div>

              {/* Standard Pro */}
              <div className="bg-white rounded-3xl border-2 border-blue-600 p-8 space-y-6 shadow-xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white rounded-full text-[11px] font-black uppercase tracking-wider">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Standard Pro</h3>
                  <p className="text-xs text-slate-500 mt-1">For growing K-12 and secondary colleges</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₦85,000 <span className="text-xs font-normal text-slate-500">/ year</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 800 Students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 60 Teachers & Staff</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Complete Broadsheet Generation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Public Result Verification PINs</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> School Fee Tracking & Receipts</li>
                </ul>
                <button
                  onClick={() => setActiveTab('register')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Choose Standard Pro
                </button>
              </div>

              {/* Enterprise Apex */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-sm hover:shadow-lg transition">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Enterprise Apex</h3>
                  <p className="text-xs text-slate-500 mt-1">Unlimited multi-campus secondary groups</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₦180,000 <span className="text-xs font-normal text-slate-500">/ year</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 5,000 Students</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 250 Staff Accounts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Full Finance & Bursary Suite</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dedicated Technical SLA</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Custom School Watermarks</li>
                </ul>
                <button
                  onClick={() => setActiveTab('register')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Choose Enterprise
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
