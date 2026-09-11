import React from 'react';
import { X, ShieldAlert, KeyRound, ServerOff, Flame, CheckCircle2 } from 'lucide-react';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cryptographic Architecture</h2>
            <p className="text-xs text-slate-400">Zero-Knowledge Proof & Threat Model</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start space-x-3">
            <KeyRound className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-xs uppercase tracking-wide">1. WebCrypto AES-GCM-256</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your plaintext is encrypted directly in your browser using the native WebCrypto API with a randomly generated 256-bit symmetric key and 96-bit initialization vector.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start space-x-3">
            <ServerOff className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-xs uppercase tracking-wide">2. URL Hash Isolation (RFC 3986)</h3>
              <p className="text-xs text-slate-400 mt-1">
                The decryption key is appended strictly after the <code className="text-cyan-300 font-mono">#</code> hash symbol. Web browsers never transmit the fragment portion to HTTP servers or proxy logs.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start space-x-3">
            <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-xs uppercase tracking-wide">3. Atomic Burn-After-Reading</h3>
              <p className="text-xs text-slate-400 mt-1">
                When requested, the server fetches the ciphertext and deletes the record within a single atomic SQLite transaction. Subsequent requests yield an HTTP 404 response.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-xs uppercase tracking-wide">4. Ephemeral Auto-Pruning</h3>
              <p className="text-xs text-slate-400 mt-1">
                Expired secrets are purged by a background sweeper every 60 seconds. Plaintext is never stored in memory or disk.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
