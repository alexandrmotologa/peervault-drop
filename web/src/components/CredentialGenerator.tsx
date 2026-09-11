import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Key, Copy, Check, ArrowDownToLine } from 'lucide-react';
import { generateSecureCredential, GeneratorOptions } from '../crypto/generator';
import { useTelegram } from '../hooks/useTelegram';

interface CredentialGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (generated: string) => void;
}

export const CredentialGenerator: React.FC<CredentialGeneratorProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const { haptic } = useTelegram();
  const [type, setType] = useState<GeneratorOptions['type']>('password');
  const [length, setLength] = useState(24);
  const [wordCount, setWordCount] = useState(4);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, type, length, wordCount, includeSymbols, includeNumbers, includeUpper]);

  const regenerate = () => {
    const cred = generateSecureCredential({
      type,
      length,
      wordCount,
      includeSymbols,
      includeNumbers,
      includeUpper
    });
    setGenerated(cred);
    haptic.selection();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    haptic.notification('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    haptic.impact('medium');
    onSelect(generated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Password & Token Generator</h2>
            <p className="text-[11px] text-slate-400">Cryptographically secure random values</p>
          </div>
        </div>

        {/* Type selector tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4 text-[11px] font-medium">
          {[
            { id: 'password', label: 'Password' },
            { id: 'passphrase', label: 'Passphrase' },
            { id: 'token', label: 'Token' },
            { id: 'pin', label: 'PIN' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setType(tab.id as any)}
              className={`py-1.5 rounded-lg transition-all ${
                type === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generated output box */}
        <div className="relative mb-5">
          <div className="w-full p-3.5 pr-20 rounded-xl bg-slate-950 border border-emerald-500/30 font-mono text-xs text-emerald-300 break-all select-all min-h-[48px] flex items-center">
            {generated}
          </div>
          <div className="absolute right-2 top-2 flex items-center space-x-1">
            <button
              type="button"
              onClick={regenerate}
              title="Regenerate"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy"
              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3.5 text-xs text-slate-300 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          {type === 'passphrase' ? (
            <div>
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span>Word Count:</span>
                <span className="font-mono text-emerald-400">{wordCount} words</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span>Length:</span>
                <span className="font-mono text-emerald-400">{length} characters</span>
              </div>
              <input
                type="range"
                min={type === 'pin' ? 4 : 8}
                max={type === 'pin' ? 12 : 64}
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500"
              />
            </div>
          )}

          {type === 'password' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUpper}
                  onChange={(e) => setIncludeUpper(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px]">Uppercase (A-Z)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px]">Numbers (0-9)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px]">Symbols (!@#$)</span>
              </label>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleUse}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Use in Secret</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
