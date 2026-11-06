import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface WhatsAppSupportButtonProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  phoneNumber = '2349155377861',
  defaultMessage = "Hi!\nI'm one among the school Admin of AcademiQ."
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden flex flex-col items-end gap-2 group">
      {/* Tooltip / Speech bubble */}
      {showTooltip && (
        <div className="bg-slate-900 text-white text-xs py-2 px-3.5 rounded-2xl shadow-xl border border-slate-700/80 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-start gap-2.5">
          <div className="flex-1">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Need Help? Chat Support
            </p>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">
              Chat directly with our support team on WhatsApp for any inquiries, setup assistance, or technical issues.
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-white transition cursor-pointer p-0.5"
            aria-label="Close tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-emerald-600/30 transition-all transform hover:scale-105 cursor-pointer ring-4 ring-[#25D366]/20"
        title="Chat with AcademiQ Support on WhatsApp (+2349155377861)"
        aria-label="Chat with Support on WhatsApp"
      >
        {/* Official WhatsApp SVG Logo */}
        <svg
          className="w-6 h-6 fill-current shrink-0"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.004 2C6.48 2 2.004 6.476 2.004 12c0 1.996.589 3.86 1.608 5.432L2.062 22l4.743-1.516c1.514.928 3.3 1.516 5.199 1.516 5.523 0 10-4.476 10-10s-4.477-10-10-10zm0 18.275c-1.637 0-3.187-.497-4.498-1.354l-.323-.209-3.328 1.064 1.089-3.238-.231-.344a8.214 8.214 0 01-1.354-4.194c0-4.57 3.717-8.287 8.645-8.287s8.645 3.717 8.645 8.287c0 4.57-3.871 8.275-8.645 8.275zm4.737-6.19c-.259-.13-1.533-.756-1.771-.843-.238-.086-.411-.13-.584.13-.173.259-.67 0.843-.822 1.016-.151.173-.303.195-.562.065-.259-.13-1.096-.404-2.088-1.288-.772-.689-1.294-1.541-1.445-1.8-.151-.259-.016-.399.113-.528.116-.117.259-.303.389-.454.13-.151.173-.259.259-.432.086-.173.043-.324-.022-.454-.065-.13-.584-1.406-.8-1.925-.211-.506-.425-.437-.584-.445l-.497-.008c-.173 0-.454.065-.692.324-.238.259-.908.887-.908 2.163 0 1.276.929 2.509 1.059 2.682.13.173 1.828 2.791 4.428 3.914.619.268 1.102.428 1.479.548.622.198 1.189.17 1.637.103.499-.075 1.533-.627 1.749-1.233.216-.605.216-1.125.151-1.233-.065-.108-.238-.173-.497-.303z"/>
        </svg>

        <span className="font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5">
          <span>Admin Support</span>
        </span>
      </a>
    </div>
  );
};
