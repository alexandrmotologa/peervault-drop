import React, { useState } from 'react';
import { Copy, Check, Send, RotateCcw, ShieldCheck, Flame, Clock, QrCode as QrIcon, History } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { QRCodeModal } from './QRCodeModal';

interface ShareModalProps {
  data: {
    id: string;
    keyFragment: string;
    hasPassphrase: boolean;
    expiresAt: number;
    burnAfterRead: boolean;
    isFile?: boolean;
    revocationToken?: string;
  };
  onReset: () => void;
  onOpenHistory?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ data, onReset, onOpenHistory }) => {
  const { haptic, shareViaTelegram } = useTelegram();
  const [copiedType, setCopiedType] = useState<'tg' | 'web' | null>(null);
  const [activeTab, setActiveTab] = useState<'tg' | 'web'>('tg');
  const [isQROpen, setIsQROpen] = useState(false);

  const botUsername = 'peervault_drop_bot';
  const miniAppShortName = 'app';

  // Telegram Mini App link format
  const telegramLink = `https://t.me/${botUsername}/${miniAppShortName}?startapp=${data.id}#key=${data.keyFragment}`;

  // Direct Web link format
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  const webLink = `${origin}/#id=${data.id}&key=${data.keyFragment}`;

  const currentLink = activeTab === 'tg' ? telegramLink : webLink;

  const copyToClipboard = (text: string, type: 'tg' | 'web') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    haptic.notification('success');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleShareTelegram = () => {
    haptic.impact('medium');
    const message = data.isFile
      ? '📁 I sent you an encrypted self-destructing file via PeerVault Drop.'
      : '🔒 I sent you an encrypted self-destructing secret via PeerVault Drop.';
    shareViaTelegram(message, telegramLink);
  };

  const expiresDate = new Date(data.expiresAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-emerald-500/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">
                {data.isFile ? 'File Encrypted & Stored' : 'Secret Encrypted & Stored'}
              </h2>
              {data.isFile && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  File Drop
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Only people with this secret link can decrypt the content.
            </p>
          </div>
        </div>

        {/* Metadata badges */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2 text-xs">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-slate-300">
              {data.burnAfterRead ? 'Burns on first read' : 'Multi-view enabled'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2 text-xs">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300">Expires at {expiresDate}</span>
          </div>
        </div>

        {/* Link Type Selector Tabs */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-3">
          <button
            onClick={() => {
              setActiveTab('tg');
              haptic.selection();
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'tg'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Telegram Mini App Link
          </button>
          <button
            onClick={() => {
              setActiveTab('web');
              haptic.selection();
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'web'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Web Link
          </button>
        </div>

        {/* Link Display Box */}
        <div className="relative mb-4">
          <input
            type="text"
            readOnly
            value={currentLink}
            className="w-full pl-3.5 pr-24 py-3 rounded-xl glass-input text-xs font-mono text-slate-300 select-all"
          />
          <button
            onClick={() => copyToClipboard(currentLink, activeTab)}
            className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copiedType === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Quick actions: QR Code + Telegram Share */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
          <button
            onClick={handleShareTelegram}
            className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send in Telegram</span>
          </button>

          <button
            onClick={() => setIsQROpen(true)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <QrIcon className="w-4 h-4 text-emerald-400" />
            <span>Show QR Code</span>
          </button>
        </div>

        {/* Revocation & Sent history link */}
        {data.revocationToken && onOpenHistory && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-5 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-300 font-semibold">Sent by mistake?</span> You can destroy this secret now.
            </div>
            <button
              onClick={onOpenHistory}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Sent History</span>
            </button>
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs flex items-center justify-center space-x-2 border border-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Create Another Secret</span>
        </button>

        <QRCodeModal
          isOpen={isQROpen}
          onClose={() => setIsQROpen(false)}
          url={currentLink}
        />
      </div>
    </div>
  );
};
