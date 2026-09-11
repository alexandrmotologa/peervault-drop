import React, { useState, useEffect } from 'react';
import { Flame, Unlock, Copy, Check, AlertTriangle, KeyRound, Eye, EyeOff, Loader2, RotateCcw } from 'lucide-react';
import { decryptSecret } from '../crypto/e2ee';
import { useTelegram } from '../hooks/useTelegram';
import confetti from 'canvas-confetti';

interface RevealSecretProps {
  secretId: string;
  keyFragment: string;
  onReset: () => void;
}

export const RevealSecret: React.FC<RevealSecretProps> = ({ secretId, keyFragment, onReset }) => {
  const { haptic } = useTelegram();
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretData, setSecretData] = useState<{
    ciphertext: string;
    iv: string;
    burn_after_read: boolean;
    has_passphrase: boolean;
    passphrase_salt?: string;
  } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isBurned, setIsBurned] = useState(false);

  useEffect(() => {
    fetchSecretPayload();
  }, [secretId]);

  const fetchSecretPayload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/secret/${secretId}`);
      if (res.status === 404) {
        setIsBurned(true);
        setError('This secret does not exist, has expired, or has already been burned.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSecretData(data);

      // If the secret does not require a passphrase and key is present, decrypt automatically
      if (!data.has_passphrase && keyFragment) {
        performDecryption(data, '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve encrypted secret.');
    } finally {
      setIsLoading(false);
    }
  };

  const performDecryption = async (data: any, pass: string) => {
    try {
      setIsDecrypting(true);
      setError(null);

      if (!keyFragment) {
        throw new Error('Decryption key is missing from the URL. Please verify the link.');
      }

      const plaintext = await decryptSecret({
        ciphertext: data.ciphertext,
        iv: data.iv,
        keyFragment: keyFragment,
        hasPassphrase: data.has_passphrase,
        passphraseSalt: data.passphrase_salt,
        passphrase: pass
      });

      setDecryptedText(plaintext);
      haptic.notification('success');

      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // Confetti fallback
      }
    } catch (err: any) {
      haptic.notification('error');
      setError(err.message || 'Decryption failed. Please check the passphrase or link.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleManualDecrypt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretData) return;
    haptic.impact('medium');
    performDecryption(secretData, passphrase);
  };

  const handleCopy = () => {
    if (!decryptedText) return;
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    haptic.notification('success');
    setTimeout(() => setCopied(false), 2500);
  };

  // State: Destroyed or Expired
  if (isBurned) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="glass-panel rounded-2xl p-8 text-center border border-red-500/30">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/50 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Secret Unavailable</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            This secret was either destroyed immediately after being read, or its expiration time has passed. In accordance with zero-knowledge principles, it cannot be recovered.
          </p>
          <button
            onClick={onReset}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 mx-auto border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Create a New Secret</span>
          </button>
        </div>
      </div>
    );
  }

  // State: Loading
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
          <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Retrieving encrypted payload...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800">
        {/* Header Notification */}
        {secretData?.burn_after_read && (
          <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-start space-x-3 mb-5">
            <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-orange-200">
              <strong className="font-semibold">Burn-After-Read Active:</strong> This secret has now been purged from the server. If you refresh or close this tab, the secret will be permanently inaccessible.
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-300 text-xs mb-5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Decrypted Plaintext View */}
        {decryptedText !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Unlock className="w-4 h-4" />
                <span>Decrypted Secret Plaintext</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {new TextEncoder().encode(decryptedText).length} bytes
              </span>
            </div>

            <div className="relative">
              <pre className="w-full p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-96 selection:bg-emerald-500 selection:text-black">
                {decryptedText}
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Secret</span>
                  </>
                )}
              </button>

              <button
                onClick={onReset}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Create New Secret</span>
              </button>
            </div>
          </div>
        ) : (
          /* Decrypt Form (For Passphrase-Protected Secrets) */
          <form onSubmit={handleManualDecrypt} className="space-y-5">
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3 shadow-lg shadow-purple-500/10">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-white">Passphrase Protected Secret</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                The sender protected this secret with an additional passphrase. Enter it below to decrypt.
              </p>
            </div>

            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter secret passphrase..."
                className="w-full pr-10 pl-4 py-3 rounded-xl glass-input text-xs text-slate-100 placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isDecrypting || !passphrase.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isDecrypting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Decrypting...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Decrypt Secret</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
