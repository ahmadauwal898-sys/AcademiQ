import React from 'react';
import { 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  Target, 
  Compass, 
  Phone, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  FileText, 
  Users, 
  Globe, 
  ArrowLeft, 
  ExternalLink,
  Award,
  Zap,
  Clock,
  Database,
  Lock,
  Download
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AboutPageProps {
  onBack: () => void;
  onOpenPublicChecker?: () => void;
  onOpenLogin?: (type: 'school' | 'super_admin') => void;
  onOpenRegister?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBack,
  onOpenPublicChecker,
  onOpenLogin,
  onOpenRegister
}) => {
  const currentVersion = "v1.2.0";
  const releaseDate = "November 2026";
  const whatsappNumber = "+2349155377861";
  const officialEmail = "ahmadauwal898@gmail.com";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition px-3 py-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal</span>
          </button>

          <div className="flex items-center gap-2.5">
            <img 
              src="/academiq-icon.png" 
              alt="AcademiQ Logo" 
              className="w-8 h-8 rounded-lg object-contain shadow-xs bg-blue-900 p-0.5" 
            />
            <div className="text-left hidden sm:block">
              <span className="font-black text-sm tracking-tight text-slate-900 block leading-none">AcademiQ</span>
              <span className="text-[10px] text-blue-600 font-semibold">About Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton variant="navbar" className="text-xs" />
            {onOpenLogin && (
              <button
                onClick={() => onOpenLogin('school')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 lg:p-16 shadow-2xl border border-blue-900/50">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Next-Gen School Operating System</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
              About <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">AcademiQ</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              AcademiQ is a multi-tenant, cloud-replicated school management and automated result processing platform engineered by <strong className="text-white font-semibold">BG GROUP OF SOFTWARES</strong>. We empower schools of all sizes to streamline student administration, eliminate manual grading errors, and provide transparent academic reporting.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href={`https://wa.me/2349155377861?text=${encodeURIComponent("Hello BG GROUP OF SOFTWARES! I want to inquire about AcademiQ School Management Platform.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with Founder & Support</span>
              </a>

              {onOpenRegister && (
                <button
                  onClick={onOpenRegister}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold rounded-xl transition border border-white/20 flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-blue-300" />
                  <span>Register Your School</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Message from Founder Section */}
        <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Founder Avatar & Badge Card */}
            <div className="lg:col-span-4 flex flex-col items-center text-center p-6 bg-gradient-to-b from-slate-50 to-blue-50/50 rounded-2xl border border-blue-100">
              <div className="relative mb-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-900 p-1 shadow-xl">
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden relative">
                    <img
                      src="/academiq-icon.png"
                      alt="Ahmad Auwal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-md">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900">Ahmad Auwal</h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-0.5">CEO & Lead Architect</p>
              <p className="text-xs text-slate-500 font-semibold">BG GROUP OF SOFTWARES</p>

              <div className="mt-4 pt-4 border-t border-slate-200/80 w-full flex items-center justify-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Verified Executive Leadership</span>
              </div>
            </div>

            {/* Founder Message Content */}
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Executive Statement</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Message from the Founder
              </h2>

              <blockquote className="space-y-3 text-slate-600 text-sm sm:text-base leading-relaxed italic border-l-4 border-blue-600 pl-4 py-1">
                <p>
                  "Welcome to AcademiQ. When we established <strong className="text-slate-900 font-bold not-italic">BG GROUP OF SOFTWARES</strong>, our primary ambition was to bridge the technological chasm that holds back developing institutions."
                </p>
                <p>
                  "For decades, school administrators, headmasters, and teachers have burned countless nights manually tabulating scores, hand-writing report cards, and struggling with paper registers that can be lost in a single rainstorm. AcademiQ was born to solve this permanently."
                </p>
                <p>
                  "We built AcademiQ with relentless attention to speed, zero-loss cloud replication, and absolute ease of use. Whether your institution runs in a busy urban metropolis or a rural community with intermittent internet, AcademiQ guarantees your school records remain secure, transparent, and instantly verifiable. Thank you for trusting us with your school's future."
                </p>
              </blockquote>

              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <span>— Ahmad Auwal, CEO</span>
                <span>•</span>
                <span>BG GROUP OF SOFTWARES</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-8 shadow-lg border border-blue-800 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Target className="w-32 h-32 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              <span>Our Purpose</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Our Mission</h2>
            <p className="text-sm text-blue-100 leading-relaxed font-normal">
              To democratize modern educational technology by providing elementary, secondary, and tertiary schools with an affordable, ultra-reliable, and intuitive management platform. We exist to eliminate administrative friction, eradicate human calculation errors in examinations, and foster transparent communication between educators, students, and parents.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-blue-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-friction onboarding for schools of all sizes.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated continuous assessment and position ranking.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Permanent, tamper-proof student academic history.</span>
              </li>
            </ul>
          </div>

          {/* Vision Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-8 shadow-lg border border-slate-800 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Compass className="w-32 h-32 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Future Horizon</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Our Vision</h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              To become the standard digital operating system for over 100,000 educational institutions across Africa and worldwide. We envision a future where every school operates 100% paperless exam processing, parents verify authentic report cards with cryptographic PINs in real time, and data-driven insights empower teachers to elevate student outcomes.
            </p>
            <ul className="space-y-2 pt-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Universal accessibility on mobile phones, tablets, and PCs.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Offline-first resilience ensuring work never halts.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Instant parent portal with transparent PIN result verification.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* What AcademiQ Does - Capabilities Grid */}
        <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Comprehensive Feature Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              What AcademiQ Delivers to Your School
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              An all-in-one institutional engine replacing bulky paper registers and disconnected spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-150 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Automated Report Cards</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates A4 print-ready PDF terminal report cards complete with school badges, dynamic grading scale, teacher remarks, and digital stamps.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Automated Broadsheets</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically computes student totals, term averages, subject ranking, and overall class positions across multiple continuous assessment components.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Secure PIN Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Allows parents and students to securely check official results from home using unique scratch card PIN tokens with strictly enforced usage limits.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Role-Based Access Control</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated dashboards for School Super Admins, School Principals, Teachers, Bursars, and Parents with strictly isolated data access.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Database className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Dual Storage & Cloud Sync</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operates with an ultra-fast relational SQLite database engine on the backend and synchronizes snapshots to Firebase Firestore for zero data loss.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Download className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Native Phone App (PWA)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Installs directly on Android, iOS, Windows, and Mac as a standalone application that works smoothly even during network drops.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-blue-800 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Phone className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Official Contact & Support Details
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              Need technical support, custom school onboarding, or institutional inquiries? Reach out to our executive support desk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Contact Card 1 */}
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">WhatsApp & Direct Phone</h4>
              <p className="text-sm font-bold text-white font-mono">{whatsappNumber}</p>
              <a
                href={`https://wa.me/2349155377861?text=${encodeURIComponent("Hi! I would like to get technical assistance or register a school on AcademiQ.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold underline pt-1"
              >
                <span>Open WhatsApp Chat</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Contact Card 2 */}
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">Official Support Email</h4>
              <p className="text-sm font-bold text-white break-all">{officialEmail}</p>
              <a
                href={`mailto:${officialEmail}?subject=AcademiQ Support Inquiry`}
                className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 font-bold underline pt-1"
              >
                <span>Send Support Email</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Contact Card 3 */}
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">Parent Organization</h4>
              <p className="text-sm font-bold text-white">BG GROUP OF SOFTWARES</p>
              <p className="text-xs text-slate-300">
                Ahmad Auwal, Chief Executive Officer
              </p>
              <div className="text-[11px] text-amber-300 font-semibold pt-1">
                24/7 Dedicated Administrator Support
              </div>
            </div>
          </div>
        </section>

        {/* Version & Technical Architecture Information */}
        <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Production Release Active</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Platform Version Information
              </h2>
              <p className="text-xs text-slate-500">
                Technical build specifications and runtime configuration details.
              </p>
            </div>

            <div className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-center sm:text-right shadow-sm">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Version</span>
              <span className="text-2xl font-black tracking-tight text-emerald-400 font-mono">{currentVersion}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Release Milestone</span>
              <div className="font-bold text-slate-900">Stable Enterprise Edition</div>
              <div className="text-slate-500 text-[11px]">{releaseDate}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Frontend Architecture</span>
              <div className="font-bold text-slate-900">Vite 6 + React 19 SPA</div>
              <div className="text-slate-500 text-[11px]">Tailwind CSS & TypeScript</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Backend Services</span>
              <div className="font-bold text-slate-900">Dual-Runtime System</div>
              <div className="text-slate-500 text-[11px]">Express.js API + Django Core</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Persistence & Replication</span>
              <div className="font-bold text-slate-900">SQLite + Cloud Firestore</div>
              <div className="text-slate-500 text-[11px]">Multi-tenant zero-loss backup</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-xs border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img src="/academiq-icon.png" alt="AcademiQ" className="w-6 h-6 rounded-md object-contain bg-white p-0.5" />
            <span className="font-bold text-white">AcademiQ</span>
            <span>• Developed by BG GROUP OF SOFTWARES (Ahmad Auwal, CEO)</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="hover:text-white transition cursor-pointer font-medium"
            >
              Back to Home
            </button>
            <span>•</span>
            <span className="font-mono text-slate-400">{currentVersion}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
