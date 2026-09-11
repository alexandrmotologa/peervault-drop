import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Unlock, Copy, Check, AlertTriangle, KeyRound, Eye, EyeOff,
  Loader2, RotateCcw, ShieldCheck, Download, FileText,
  Clock
} from 'lucide-react';
import { decryptSecretUnified, DecryptedFile } from '../crypto/e2ee';
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
    is_file?: boolean;
  } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Decrypted output state
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFile | null>(null);

  // Anti-Shoulder Surfing State
  const [isMasked, setIsMasked] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);

  // Auto-Clear Clipboard State
  const [copied, setCopied] = useState(false);
  const [clipboardTimer, setClipboardTimer] = useState<number | null>(null);
  const [clipboardCleared, setClipboardCleared] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isBurned, setIsBurned] = useState(false);

  useEffect(() => {
    fetchSecretPayload();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
        throw new Error('Decryption key is missing from the URL hash. Please verify the link.');
      }

      const result = await decryptSecretUnified({
        ciphertext: data.ciphertext,
        iv: data.iv,
        keyFragment: keyFragment,
        hasPassphrase: data.has_passphrase,
        passphraseSalt: data.passphrase_salt,
        passphrase: pass
      });

      if (result.isFile && result.file) {
        setDecryptedFile(result.file);
        setDecryptedText(result.file.textPreview || null);
      } else {
        setDecryptedText(result.text);
      }

      haptic.notification('success');

      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {}
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

  // 1-Click Copy with 30-Second Auto-Clear
  const handleCopy = () => {
    if (!decryptedText) return;
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setClipboardCleared(false);
    haptic.notification('success');

    if (timerRef.current) clearInterval(timerRef.current);

    let timeLeft = 30;
    setClipboardTimer(timeLeft);

    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setClipboardTimer(timeLeft);

      if (timeLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        navigator.clipboard.writeText('').catch(() => {});
        setClipboardTimer(null);
        setClipboardCleared(true);
        setCopied(false);
      }
    }, 1000);
  };

  // Native File Download
  const handleDownloadFile = () => {
    if (!decryptedFile) return;
    haptic.impact('medium');

    const blob = new Blob([decryptedFile.data.buffer as ArrayBuffer], {
      type: decryptedFile.type || 'application/octet-stream'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decryptedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Syntax and Format Detection Renderer
  const renderFormattedSecret = (text: string) => {
    const isEnv = text.includes('=') && text.split('\n').some((l) => /^[A-Za-z0-9_]+=.*/.test(l.trim()));
    const isCert = text.includes('-----BEGIN');

    if (isEnv) {
      const lines = text.split('\n');
      return (
        <div className="font-mono text-xs leading-relaxed space-y-0.5">
          {lines.map((line, idx) => {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1 && !line.trim().startsWith('#')) {
              const key = line.slice(0, eqIdx);
              const val = line.slice(eqIdx + 1);
              return (
                <div key={idx} className="flex">
                  <span className="text-slate-600 select-none w-7 text-right pr-2">{idx + 1}</span>
                  <span className="text-emerald-400 font-semibold">{key}</span>
                  <span className="text-slate-500">=</span>
                  <span className="text-cyan-300">{val}</span>
                </div>
              );
            }
            return (
              <div key={idx} className="flex">
                <span className="text-slate-600 select-none w-7 text-right pr-2">{idx + 1}</span>
                <span className={line.trim().startsWith('#') ? 'text-slate-500 italic' : 'text-slate-300'}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (isCert) {
      return (
        <div className="font-mono text-xs leading-relaxed text-purple-300">
          {text}
        </div>
      );
    }

    return (
      <div className="font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
        {text}
      </div>
    );
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
        {/* Burn Notification */}
        {secretData?.burn_after_read && (
          <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-start space-x-3 mb-5">
            <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-orange-200">
              <strong className="font-semibold">Burn-After-Read Active:</strong> This secret has now been purged from the server database. If you refresh or close this tab, the secret cannot be retrieved again.
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-300 text-xs mb-5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Decrypted Content */}
        {decryptedText !== null || decryptedFile !== null ? (
          <div className="space-y-5">
            {/* Decrypted File Card */}
            {decryptedFile && (
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{decryptedFile.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {(decryptedFile.size / 1024).toFixed(1)} KB • {decryptedFile.type || 'binary document'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadFile}
                  className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            )}

            {/* Decrypted Plaintext Display */}
            {decryptedText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{decryptedFile ? 'File Text Preview' : 'Decrypted Secret'}</span>
                    </span>
                  </div>

                  {/* Anti-Shoulder Surfing Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onMouseDown={() => setIsPeeking(true)}
                      onMouseUp={() => setIsPeeking(false)}
                      onMouseLeave={() => setIsPeeking(false)}
                      onTouchStart={() => setIsPeeking(true)}
                      onTouchEnd={() => setIsPeeking(false)}
                      className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                        isPeeking
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Hold to Peek
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMasked(!isMasked)}
                      title={isMasked ? 'Reveal secret' : 'Mask secret (anti-shoulder surfing)'}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      {isMasked ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className={`w-full p-4 rounded-xl bg-slate-950 border border-emerald-500/30 max-h-96 overflow-auto transition-all ${
                      isMasked && !isPeeking ? 'blur-md select-none' : ''
                    }`}
                  >
                    {renderFormattedSecret(decryptedText)}
                  </div>

                  {isMasked && !isPeeking && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow">
                        Secret Masked (Anti-Shoulder Surfing)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clipboard Auto-Clear Indicator */}
            {clipboardTimer !== null && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Clipboard will automatically clear in <strong>{clipboardTimer}s</strong></span>
                </span>
                <button
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setClipboardTimer(null);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}

            {clipboardCleared && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clipboard was automatically cleared for security.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {decryptedText && (
                <button
                  onClick={handleCopy}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied (Auto-Clears 30s)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Secret</span>
                    </>
                  )}
                </button>
              )}

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
          /* Passphrase Form */
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
