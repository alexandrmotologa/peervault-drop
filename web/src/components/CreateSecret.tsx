import React, { useState, useRef } from 'react';
import {
  Lock, Clock, Flame, KeyRound, Eye, EyeOff, ShieldCheck,
  AlertCircle, Loader2, Sparkles, FileUp, FileText, Trash2
} from 'lucide-react';
import { encryptSecret, encryptFileSecret } from '../crypto/e2ee';
import { CredentialGenerator } from './CredentialGenerator';
import { useTelegram } from '../hooks/useTelegram';
import { SentSecretItem } from './SentSecretsModal';

interface CreateSecretProps {
  onSuccess: (result: {
    id: string;
    keyFragment: string;
    hasPassphrase: boolean;
    expiresAt: number;
    burnAfterRead: boolean;
    isFile?: boolean;
    revocationToken?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [plaintext, setPlaintext] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState(86400);
  const [burnAfterRead, setBurnAfterRead] = useState(true);
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byteLength = new TextEncoder().encode(plaintext).length;
  const maxBytes = 64 * 1024; // 64 KB for text
  const maxFileBytes = 5 * 1024 * 1024; // 5 MB for files

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (file.size > maxFileBytes) {
      setError(`File size exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }
    setError(null);
    setSelectedFile(file);
    haptic.selection();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'text' && !plaintext.trim()) {
      setError('Please enter a secret message, key, or token.');
      return;
    }

    if (mode === 'file' && !selectedFile) {
      setError('Please select or drag-and-drop a file to encrypt.');
      return;
    }

    if (mode === 'text' && byteLength > maxBytes) {
      setError(`Text exceeds maximum allowed size of 64 KB (${byteLength} bytes).`);
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

      let encryptedPayload;
      let isFilePayload = false;

      // 1. Client-Side Encryption
      if (mode === 'file' && selectedFile) {
        isFilePayload = true;
        const arrayBuffer = await selectedFile.arrayBuffer();
        encryptedPayload = await encryptFileSecret(
          {
            name: selectedFile.name,
            type: selectedFile.type || 'application/octet-stream',
            size: selectedFile.size,
            data: new Uint8Array(arrayBuffer)
          },
          enablePassphrase ? passphrase : undefined
        );
      } else {
        encryptedPayload = await encryptSecret(plaintext, enablePassphrase ? passphrase : undefined);
      }

      // 2. Submit to backend
      const response = await fetch('/api/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: encryptedPayload.ciphertext,
          iv: encryptedPayload.iv,
          burn_after_read: burnAfterRead,
          ttl_seconds: ttlSeconds,
          has_passphrase: encryptedPayload.hasPassphrase,
          passphrase_salt: encryptedPayload.passphraseSalt,
          is_file: isFilePayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      haptic.notification('success');

      // 3. Save to local sent history
      try {
        const currentHistory = JSON.parse(localStorage.getItem('peervault_sent_history') || '[]');
        const newItem: SentSecretItem = {
          id: data.id,
          label: isFilePayload
            ? selectedFile!.name
            : (plaintext.slice(0, 20).trim() || 'Secret Text'),
          isFile: isFilePayload,
          createdAt: Date.now(),
          expiresAt: data.expires_at,
          revocationToken: data.revocation_token,
          keyFragment: encryptedPayload.keyFragment
        };
        localStorage.setItem('peervault_sent_history', JSON.stringify([newItem, ...currentHistory].slice(0, 20)));
      } catch {}

      // 4. Notify parent
      onSuccess({
        id: data.id,
        keyFragment: encryptedPayload.keyFragment,
        hasPassphrase: encryptedPayload.hasPassphrase,
        expiresAt: data.expires_at,
        burnAfterRead: burnAfterRead,
        isFile: isFilePayload,
        revocationToken: data.revocation_token
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
        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800/80 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('text');
              haptic.selection();
            }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'text'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text / Key Secret</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('file');
              haptic.selection();
            }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'file'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Secure File Drop (Max 5MB)</span>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Text Input Mode */}
          {mode === 'text' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Secret Content</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsGeneratorOpen(true)}
                    className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Password / Key</span>
                  </button>
                  <span className={`text-[11px] font-mono ${byteLength > maxBytes ? 'text-red-400' : 'text-slate-500'}`}>
                    {byteLength} / {maxBytes} bytes
                  </span>
                </div>
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
          ) : (
            /* File Upload Mode */
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <FileUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>File Attachment (Encrypted Client-Side)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Max 5 MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-100 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 rounded-xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/40 text-center cursor-pointer transition-colors"
                >
                  <FileUp className="w-8 h-8 text-cyan-400/80 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    Drag and drop file here, or click to browse
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports certificates (.pem), SSH keys, .env, documents, or images
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            disabled={isLoading || (mode === 'text' ? !plaintext.trim() : !selectedFile)}
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

      <CredentialGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelect={(generated) => setPlaintext(generated)}
      />
    </div>
  );
};
