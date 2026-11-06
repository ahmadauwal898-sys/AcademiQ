import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X, ExternalLink, Info, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'hero' | 'floating' | 'banner' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [dismissFloating, setDismissFloating] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios' | 'pc'>('android');

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const liveUrl = typeof window !== 'undefined' 
    ? (window.location.protocol.startsWith('http') ? window.location.href : 'https://ais-pre-3u56ilzcjscyzvrmcrpvxw-793402933659.europe-west2.run.app')
    : 'https://ais-pre-3u56ilzcjscyzvrmcrpvxw-793402933659.europe-west2.run.app';

  useEffect(() => {
    if (isIOS) {
      setActivePlatformTab('ios');
    } else {
      setActivePlatformTab('android');
    }
  }, [isIOS]);

  // If already running in standalone mode (already installed), hide ambient buttons
  if (isInstalled && variant !== 'banner') {
    return null;
  }

  const handleInstallClick = async () => {
    setIsPrompting(true);

    try {
      // 1. Direct prompt via hook if available
      if (isInstallable) {
        const outcome = await install();
        setIsPrompting(false);
        if (outcome) {
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 5000);
          return;
        }
      }

      // 2. Direct prompt via global cached event if hook hasn't caught it yet
      const globalPrompt = typeof window !== 'undefined' ? (window as unknown as { __academiq_install_prompt?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } }).__academiq_install_prompt : null;
      if (globalPrompt) {
        await globalPrompt.prompt();
        const choice = await globalPrompt.userChoice;
        setIsPrompting(false);
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 5000);
          return;
        }
      }

      // 3. If inside an iframe or browser doesn't expose beforeinstallprompt (e.g. iOS Safari)
      setIsPrompting(false);
      setShowGuideModal(true);
    } catch (err) {
      console.warn('Install trigger note:', err);
      setIsPrompting(false);
      setShowGuideModal(true);
    }
  };

  const openInDirectTab = () => {
    window.open(liveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Toast Notification on Successful Native Install */}
      {installSuccess && (
        <div className="fixed top-5 right-5 z-[100] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>AcademiQ installed successfully on your device!</span>
        </div>
      )}

      {/* Variant 1: Navbar Button (Desktop & Mobile Header) */}
      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer disabled:opacity-75 ${className}`}
          title="Install AcademiQ directly on your Phone or PC"
        >
          {isPrompting ? (
            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          )}
          <span>Install App</span>
        </button>
      )}

      {/* Variant 2: Drawer Button (Mobile Menu) */}
      {variant === 'drawer' && (
        <button
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`w-full p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-between transition shadow-sm cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-white font-bold">Install AcademiQ on Phone</span>
              <span className="block text-[10px] text-blue-100 font-normal">Add to Home Screen as independent app</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-200" />
        </button>
      )}

      {/* Variant 3: Hero Call-to-Action */}
      {variant === 'hero' && (
        <button
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm transition shadow-xl shadow-emerald-950/40 flex items-center gap-2.5 cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-80 ${className}`}
        >
          {isPrompting ? (
            <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4 text-slate-950" />
          )}
          <span>Install App on Phone</span>
        </button>
      )}

      {/* Variant 4: Dashboard Banner */}
      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-blue-400/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/academiq-icon.png"
              alt="AcademiQ App"
              className="w-10 h-10 rounded-xl bg-white p-0.5 object-contain shadow-md shrink-0"
            />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Install AcademiQ Standalone App</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">Offline Ready</span>
              </h4>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Install directly on your Android phone, iPhone, or PC. Runs full-screen without browser address bars.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isPrompting}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0 shadow-md active:scale-95"
          >
            {isPrompting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Install Now</span>
          </button>
        </div>
      )}

      {/* Variant 5: Floating Mobile Prompt Bar (bottom sheet on phones) */}
      {variant === 'floating' && !dismissFloating && !isInstalled && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-blue-500/30 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/academiq-icon.png"
                alt="AcademiQ"
                className="w-9 h-9 rounded-xl bg-white p-0.5 object-contain shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>Install AcademiQ</span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">Free</span>
                </div>
                <div className="text-[10px] text-slate-300 truncate">Tap to install on your phone</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                disabled={isPrompting}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                {isPrompting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>Install</span>
              </button>
              <button
                onClick={() => setDismissFloating(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Installation Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="/academiq-icon.png"
                  alt="AcademiQ"
                  className="w-11 h-11 rounded-2xl bg-white p-0.5 object-contain shadow-md"
                />
                <div>
                  <h3 className="text-base font-black text-white">Install AcademiQ on Your Phone</h3>
                  <p className="text-xs text-blue-200">Full-Screen Standalone App with Offline Capability</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* If previewing inside an iframe */}
              {isInIframe && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-blue-900">Install to Phone from Browser:</strong>
                      <span className="text-[11px] text-slate-700 leading-relaxed block mt-0.5">
                        Browsers (Google Chrome & Apple Safari) require opening in a real browser tab to add the app icon to your phone's home screen.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={openInDirectTab}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                  >
                    <span>Open in Real Browser Tab to Install</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Platform Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setActivePlatformTab('android')}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'android' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatformTab('ios')}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'ios' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatformTab('pc')}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePlatformTab === 'pc' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PC / Laptop</span>
                </button>
              </div>

              {/* Tab 1: Android Instructions */}
              {activePlatformTab === 'android' && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>How to install on Android (Chrome):</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed font-medium">
                    <li>
                      Open this app in <strong>Google Chrome</strong> on your phone.
                    </li>
                    <li>
                      Tap the <strong>3 dots (⋮)</strong> in the top-right corner of Chrome.
                    </li>
                    <li>
                      Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).
                    </li>
                    <li>
                      Confirm by tapping <strong>"Install"</strong>.
                    </li>
                  </ol>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Android will place the AcademiQ icon on your phone's home screen and app launcher.</span>
                  </div>
                </div>
              )}

              {/* Tab 2: iPhone / iPad Instructions */}
              {activePlatformTab === 'ios' && (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950">
                  <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>How to install on iPhone & iPad (Safari):</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed font-medium">
                    <li>
                      Open this app in <strong>Apple Safari</strong>.
                    </li>
                    <li>
                      Tap the <strong>Share</strong> button (the square icon with arrow pointing up).
                    </li>
                    <li>
                      Scroll down and tap <strong>"Add to Home Screen"</strong>.
                    </li>
                    <li>
                      Tap <strong>"Add"</strong> in the top-right corner.
                    </li>
                  </ol>
                  <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-[11px] text-blue-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>The AcademiQ icon will appear on your iPhone screen and launch full-screen!</span>
                  </div>
                </div>
              )}

              {/* Tab 3: PC / Mac Instructions */}
              {activePlatformTab === 'pc' && (
                <div className="space-y-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950">
                  <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <span>How to install on Windows or Mac:</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed font-medium">
                    <li>
                      Open the app in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
                    </li>
                    <li>
                      Click the <strong>Install icon (⊕)</strong> on the right side of the URL address bar.
                    </li>
                    <li>
                      Click <strong>"Install"</strong>.
                    </li>
                  </ol>
                  <div className="p-2.5 bg-white border border-indigo-200 rounded-xl text-[11px] text-indigo-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>AcademiQ opens in its own window and creates a desktop shortcut.</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={openInDirectTab}
                  className="w-full sm:flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Live App in Browser</span>
                </button>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
