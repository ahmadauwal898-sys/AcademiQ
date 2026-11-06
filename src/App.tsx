import React, { useState, useEffect } from 'react';
import { apiRequest, clearStoredToken, setStoredToken, getStoredToken } from './api';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { PublicLanding } from './components/PublicLanding';
import { PublicResultChecker } from './components/PublicResultChecker';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SchoolAdminDashboard } from './components/SchoolAdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { BursarDashboard } from './components/BursarDashboard';
import { ReportCardModal } from './components/ReportCardModal';
import { BroadsheetModal } from './components/BroadsheetModal';
import { WhatsAppSupportButton } from './components/WhatsAppSupportButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AboutPage } from './components/AboutPage';
import {
  Clock,
  ShieldAlert,
  ArrowRight,
  Building2,
  CheckCircle2,
  ArrowLeft,
  LogOut,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Navigation
  const [showAboutPage, setShowAboutPage] = useState(false);
  const [showPublicChecker, setShowPublicChecker] = useState(false);
  const [showRegisterLanding, setShowRegisterLanding] = useState(false);
  const [showLoginLanding, setShowLoginLanding] = useState(true);
  const [loginPortalType, setLoginPortalType] = useState<'school' | 'super_admin'>('school');
  const [showPublicSitePreview, setShowPublicSitePreview] = useState(false);

  // Report & Broadsheet Modals
  const [activeReportStudentId, setActiveReportStudentId] = useState<string | null>(null);
  const [activeBroadsheetParams, setActiveBroadsheetParams] = useState<{
    classId: string;
    termId: string;
    sessionId: string;
  } | null>(null);

  const handleGoHome = () => {
    setShowAboutPage(false);
    setShowPublicChecker(false);
    setActiveReportStudentId(null);
    setActiveBroadsheetParams(null);
    setShowPublicSitePreview(false);
    if (!currentUser) {
      setShowLoginLanding(true);
      setShowRegisterLanding(false);
    } else {
      setShowRegisterLanding(false);
      setShowLoginLanding(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAboutPage) setShowAboutPage(false);
        else if (showPublicChecker) setShowPublicChecker(false);
        else if (activeReportStudentId) setActiveReportStudentId(null);
        else if (activeBroadsheetParams) setActiveBroadsheetParams(null);
        else if (showPublicSitePreview) setShowPublicSitePreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAboutPage, showPublicChecker, activeReportStudentId, activeBroadsheetParams, showPublicSitePreview]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredToken();
      setCurrentUser(null);
      setShowLoginLanding(true);
    };
    window.addEventListener('multischool_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('multischool_auth_unauthorized', handleUnauthorized);
  }, []);

  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest('/api/auth/me');
      setCurrentUser(res.user);
    } catch {
      clearStoredToken();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setCurrentUser(null);
    setShowLoginLanding(true);
    setShowRegisterLanding(false);
    setShowPublicSitePreview(false);
  };

  const handleEnterSchoolPortal = (token: string, user: User) => {
    const currentToken = getStoredToken();
    if (currentToken) {
      sessionStorage.setItem('super_admin_return_token', currentToken);
    }
    setStoredToken(token);
    setCurrentUser(user);
    setShowLoginLanding(false);
    setShowRegisterLanding(false);
  };

  const handleExitSchoolPortal = async () => {
    const returnToken = sessionStorage.getItem('super_admin_return_token');
    if (returnToken) {
      sessionStorage.removeItem('super_admin_return_token');
      setStoredToken(returnToken);
      checkAuth();
    } else {
      handleLogout();
    }
  };

  const handleSwitchPersona = async (role: string, email?: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ role, email }),
      });
      if (res.token && res.user) {
        setStoredToken(res.token);
        setCurrentUser(res.user);
        setShowPublicChecker(false);
      }
    } catch (err: any) {
      alert('Access restricted: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 animate-pulse flex items-center justify-center font-black text-xl shadow-xl shadow-blue-500/30">
          A
        </div>
        <p className="text-sm font-semibold text-slate-300">Initializing AcademiQ Multi-Tenant Environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenPublicChecker={() => setShowPublicChecker(true)}
        onOpenRegister={() => {
          handleLogout();
          setShowRegisterLanding(true);
          setShowLoginLanding(false);
        }}
        onOpenLogin={(portalType = 'school') => {
          handleLogout();
          setLoginPortalType(portalType);
          setShowLoginLanding(true);
          setShowRegisterLanding(false);
        }}
        onSwitchPersona={handleSwitchPersona}
        onGoHome={handleGoHome}
        onViewPublicLanding={() => setShowPublicSitePreview(true)}
        onExitImpersonation={handleExitSchoolPortal}
        onOpenAbout={() => setShowAboutPage(true)}
      />

      {/* Prominent Super Admin Impersonation Exit Bar */}
      {currentUser?.is_impersonating && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-3 sm:px-4 py-2.5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs border-b border-amber-600/40">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">👑</span>
            <span className="leading-snug">
              <strong>Super Admin Impersonation:</strong> Managing <strong>{currentUser.school_name}</strong> with Administrator authority.
            </span>
          </div>
          <button
            onClick={handleExitSchoolPortal}
            className="w-full sm:w-auto px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Exit to Super Admin Dashboard →</span>
          </button>
        </div>
      )}

      {/* Main Body */}
      <main className={`flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 w-full min-w-0 overflow-x-hidden ${
        activeReportStudentId || activeBroadsheetParams || showPublicChecker ? 'print:hidden' : ''
      }`}>
        {showAboutPage ? (
          <AboutPage
            onBack={handleGoHome}
            onOpenPublicChecker={() => {
              setShowAboutPage(false);
              setShowPublicChecker(true);
            }}
            onOpenLogin={(portalType = 'school') => {
              setShowAboutPage(false);
              setLoginPortalType(portalType);
              setShowLoginLanding(true);
              setShowRegisterLanding(false);
            }}
            onOpenRegister={() => {
              setShowAboutPage(false);
              setShowRegisterLanding(true);
              setShowLoginLanding(false);
            }}
          />
        ) : showPublicSitePreview ? (
          /* Logged-in user viewing public site preview */
          <div className="space-y-4">
            <div className="bg-indigo-950 text-white p-3.5 rounded-2xl border border-indigo-800 shadow-md flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-200">
                You are previewing the public website & school onboarding portal.
              </span>
              <button
                onClick={() => setShowPublicSitePreview(false)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to My School Portal
              </button>
            </div>
            <PublicLanding
              onLoginSuccess={(user) => {
                setCurrentUser(user);
                setShowPublicSitePreview(false);
                setShowLoginLanding(false);
                setShowRegisterLanding(false);
              }}
              onOpenPublicChecker={() => setShowPublicChecker(true)}
              initialShowRegister={showRegisterLanding}
              initialLoginType={loginPortalType}
              initialTab={showLoginLanding ? 'login' : showRegisterLanding ? 'register' : 'overview'}
              onOpenAbout={() => setShowAboutPage(true)}
            />
          </div>
        ) : !currentUser ? (
          <PublicLanding
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setShowLoginLanding(false);
              setShowRegisterLanding(false);
            }}
            onOpenPublicChecker={() => setShowPublicChecker(true)}
            initialShowRegister={showRegisterLanding}
            initialLoginType={loginPortalType}
            initialTab={showLoginLanding ? 'login' : showRegisterLanding ? 'register' : 'overview'}
            onOpenAbout={() => setShowAboutPage(true)}
          />
        ) : currentUser.school_status === 'pending' ? (
          /* Gated Pending School View */
          <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-md shadow-amber-500/20">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                Application Status: Pending Approval
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser.school_name || 'Your School'} is Awaiting Platform Approval
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
                Under the AcademiQ multi-tenancy governance policy, newly registered institutions cannot access operational features (student enrollment, grading, or broadsheet compilation) until verified and approved by the Platform Super Administrator.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left space-y-2">
              <div className="font-bold text-slate-900">Governance & Approval Flow:</div>
              <p>
                Only the <strong>Platform Super Administrator</strong> can view all schools, review applications, and grant approval. School accounts are strictly locked to their institution and have access to their school login only.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleLogout();
                  setLoginPortalType('super_admin');
                  setShowLoginLanding(true);
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer"
              >
                Sign Out & Access Super Admin Portal <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition inline-flex items-center gap-2 cursor-pointer border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" /> Sign Out to Home
              </button>
            </div>
          </div>
        ) : currentUser.school_status === 'suspended' ? (
          <div className="max-w-md mx-auto my-16 bg-white rounded-3xl p-8 border border-rose-300 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Institution Suspended</h2>
            <p className="text-xs text-slate-600">
              This school account has been temporarily suspended by the platform administrator.
            </p>
            <button
              onClick={handleLogout}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition inline-flex items-center gap-2 cursor-pointer border border-slate-200 mt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home / Sign Out
            </button>
          </div>
        ) : currentUser.role === 'super_admin' ? (
          <SuperAdminDashboard onEnterSchoolPortal={handleEnterSchoolPortal} />
        ) : currentUser.role === 'school_admin' ? (
          <SchoolAdminDashboard
            onOpenReportCard={(stdId) => setActiveReportStudentId(stdId)}
            onOpenBroadsheet={(cId, tId, sId) =>
              setActiveBroadsheetParams({ classId: cId, termId: tId, sessionId: sId })
            }
          />
        ) : currentUser.role === 'teacher' ? (
          <TeacherDashboard onOpenReportCard={(stdId) => setActiveReportStudentId(stdId)} />
        ) : currentUser.role === 'bursar' ? (
          <BursarDashboard />
        ) : null}
      </main>

      {/* Public Result Checker Modal */}
      {showPublicChecker && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublicChecker(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl my-8 cursor-default">
            <PublicResultChecker isModal onClose={() => setShowPublicChecker(false)} />
          </div>
        </div>
      )}

      {/* Individual Report Card Modal */}
      {activeReportStudentId && (
        <ReportCardModal
          studentId={activeReportStudentId}
          onClose={() => setActiveReportStudentId(null)}
        />
      )}

      {/* Class Broadsheet Result Sheet Modal */}
      {activeBroadsheetParams && (
        <BroadsheetModal
          classId={activeBroadsheetParams.classId}
          termId={activeBroadsheetParams.termId}
          sessionId={activeBroadsheetParams.sessionId}
          onClose={() => setActiveBroadsheetParams(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-slate-900">AcademiQ</span>
            <span>• Enterprise Multi-Tenant School Management Platform</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <button
              onClick={() => setShowAboutPage(true)}
              className="hover:text-blue-600 transition cursor-pointer text-slate-600 font-semibold text-xs"
            >
              About AcademiQ
            </button>
            <span>•</span>
            <span>Server Calculations</span>
            <span>•</span>
            <span>A4 PDF Printing</span>
            <span>•</span>
            <button
              onClick={() => {
                handleLogout();
                setLoginPortalType('super_admin');
                setShowLoginLanding(true);
              }}
              className="hover:text-slate-700 transition cursor-pointer text-slate-400 text-xs underline sm:no-underline"
              title="Restricted Platform Administrator Login"
            >
              Platform Administration
            </button>
          </div>
        </div>
      </footer>

      {/* PWA Network Connectivity Status */}
      <OfflineIndicator />

      {/* Floating PWA In-App Mobile Install Banner */}
      <PWAInstallButton variant="floating" />

      {/* Floating WhatsApp Support Action for All School Administrators */}
      <WhatsAppSupportButton
        phoneNumber="+2349155377861"
        defaultMessage="Hi!&#10;I'm one among the school Admin of AcademiQ."
      />
    </div>
  );
}

export default App;
