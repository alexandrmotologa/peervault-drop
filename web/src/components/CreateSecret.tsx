import React, { useState } from 'react';
import { Lock, Clock, Flame, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { encryptSecret } from '../crypto/e2ee';
import { useTelegram } from '../hooks/useTelegram';

interface CreateSecretProps {
  onSuccess: (result: {
    id: string;
    keyFragment: string;
    hasPassphrase: boolean;
    expiresAt: number;
    burnAfterRead: boolean;
  }) => void;
}

const TTL_OPTIONS = [
  { label: '5 Minutes', seconds: 300 },
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '7 Days', seconds: 604800 },
];

export const CreateSecret: React.FC<CreateSecretProps> = ({ onSuccess }) => {
  const { haptic } = useTelegram();
  const [plaintext, setPlaintext] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState(86400);
  const [burnAfterRead, setBurnAfterRead] = useState(true);
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byteLength = new TextEncoder().encode(plaintext).length;
  const maxBytes = 64 * 1024; // 64 KB limit

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plaintext.trim()) {
      setError('Please enter a secret message, key, or file content.');
      return;
    }

    if (byteLength > maxBytes) {
      setError(`Secret exceeds maximum allowed size of 64 KB (${byteLength} bytes).`);
      return;
    }

    if (enablePassphrase && !passphrase.trim()) {
      setError('You enabled passphrase protection. Please enter a passphrase.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      haptic.impact('medium');

      // 1. Client-side WebCrypto encryption
      const encrypted = await encryptSecret(plaintext, enablePassphrase ? passphrase : undefined);

      // 2. Submit ciphertext and metadata to backend
      const response = await fetch('/api/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          burn_after_read: burnAfterRead,
          ttl_seconds: ttlSeconds,
          has_passphrase: encrypted.hasPassphrase,
          passphrase_salt: encrypted.passphraseSalt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      haptic.notification('success');

      // 3. Notify parent with secret id, key fragment, and expiry
      onSuccess({
        id: data.id,
        keyFragment: encrypted.keyFragment,
        hasPassphrase: encrypted.hasPassphrase,
        expiresAt: data.expires_at,
        burnAfterRead: burnAfterRead
      });
    } catch (err: any) {
      haptic.notification('error');
      setError(err.message || 'Failed to encrypt and store secret.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800">
        <form onSubmit={handleCreate} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secret Content</span>
              </label>
              <span className={`text-[11px] font-mono ${byteLength > maxBytes ? 'text-red-400' : 'text-slate-500'}`}>
                {byteLength} / {maxBytes} bytes
              </span>
            </div>
            <textarea
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="Paste passwords, API tokens, .env contents, or private keys here..."
              rows={6}
              disabled={isLoading}
              className="w-full p-3.5 rounded-xl glass-input text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-500 transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expiration Selector */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Expires In</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => {
                      setTtlSeconds(opt.seconds);
                      haptic.selection();
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      ttlSeconds === opt.seconds
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Burn-After-Read Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Burn After Reading</span>
                  </span>
                  <input
                    type="checkbox"
                    id="burnAfterRead"
                    checked={burnAfterRead}
                    onChange={(e) => {
                      setBurnAfterRead(e.target.checked);
                      haptic.selection();
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Destroys ciphertext from database immediately after first recipient decodes it.
                </p>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono mt-2">
                {burnAfterRead ? '🔥 1-Time Self-Destruct Active' : '⏳ Multi-view until expiry'}
              </span>
            </div>
          </div>

          {/* Optional Passphrase Protection */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>Require Passphrase (PBKDF2)</span>
              </span>
              <input
                type="checkbox"
                id="enablePassphrase"
                checked={enablePassphrase}
                onChange={(e) => {
                  setEnablePassphrase(e.target.checked);
                  haptic.selection();
                }}
                className="w-4 h-4 rounded text-purple-500 bg-slate-800 border-slate-700 focus:ring-purple-500"
              />
            </div>

            {enablePassphrase && (
              <div className="relative pt-1 animate-in fade-in duration-150">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Set an extra decryption password..."
                  className="w-full pr-10 pl-3.5 py-2 rounded-lg glass-input text-slate-100 text-xs focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || plaintext.trim().length === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Encrypting Locally...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypt & Generate Secret Link</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
