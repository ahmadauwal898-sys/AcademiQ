import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt) {
      return (window as unknown as { __academiq_install_prompt: BeforeInstallPromptEvent }).__academiq_install_prompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed on phone or desktop)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // If pre-captured prompt exists, sync it
    const prePrompt = (window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt;
    if (prePrompt) {
      setDeferredPrompt(prePrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleCustomPromptReady = () => {
      const prompt = (window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt;
      if (prompt) {
        setDeferredPrompt(prompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as unknown as { __academiq_install_prompt?: null }).__academiq_install_prompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('academiq:install-prompt-ready', handleCustomPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('academiq:installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('academiq:install-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('academiq:installed', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt : null);
    if (!promptEvent) return false;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as unknown as { __academiq_install_prompt?: null }).__academiq_install_prompt = null;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Installation prompt trigger error:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!(window as unknown as { __academiq_install_prompt?: BeforeInstallPromptEvent }).__academiq_install_prompt),
    isInstalled,
    isIOS,
    install,
    deferredPrompt
  };
}
