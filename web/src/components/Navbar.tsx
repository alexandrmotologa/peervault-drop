import React from 'react';
import { ShieldCheck, Lock, History } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface NavbarProps {
  onOpenAudit: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAudit, onOpenHistory }) => {
  const { isTelegram, user } = useTelegram();

  return (
    <header className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center justify-between border-b border-slate-800/80 mb-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <img src="/logo.svg" alt="PeerVault Drop Logo" className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">PeerVault Drop</h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Zero-Knowledge
            </span>
          </div>
          <p className="text-xs text-slate-400">Client-Side E2EE Secret Sharing</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenHistory}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-cyan-400 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          title="Sent Secrets & Revocation"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Sent History</span>
        </button>

        <button
          onClick={onOpenAudit}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-emerald-400 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          title="Security Architecture & Audit"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Audit</span>
        </button>

        {isTelegram && user ? (
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium truncate max-w-[100px]">{user.first_name}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs text-slate-400 px-2 py-1 rounded bg-slate-800/40 border border-slate-800">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px]">Web Mode</span>
          </div>
        )}
      </div>
    </header>
  );
};
