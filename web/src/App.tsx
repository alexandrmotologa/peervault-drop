import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreateSecret } from './components/CreateSecret';
import { ShareModal } from './components/ShareModal';
import { RevealSecret } from './components/RevealSecret';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { useTelegram } from './hooks/useTelegram';
import { ShieldCheck } from 'lucide-react';

interface CreatedSecretData {
  id: string;
  keyFragment: string;
  hasPassphrase: boolean;
  expiresAt: number;
  burnAfterRead: boolean;
}

export const App: React.FC = () => {
  const { startParam } = useTelegram();
  const [createdData, setCreatedData] = useState<CreatedSecretData | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimKey, setClaimKey] = useState<string | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  useEffect(() => {
    // 1. Check URL parameters and hash fragment for secret ID and key
    const parseUrlParameters = () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash);

      let foundId: string | null = null;
      let foundKey: string | null = null;

      // Extract ID from Telegram start_param, search query, or hash
      if (startParam) {
        foundId = startParam;
      } else if (searchParams.get('id')) {
        foundId = searchParams.get('id');
      } else if (searchParams.get('startapp')) {
        foundId = searchParams.get('startapp');
      } else if (hashParams.get('id')) {
        foundId = hashParams.get('id');
      } else if (hashParams.get('startapp')) {
        foundId = hashParams.get('startapp');
      }

      // Extract Key strictly from hash fragment (RFC 3986 client-side isolation)
      if (hashParams.get('key')) {
        foundKey = hashParams.get('key');
      } else if (hash.startsWith('key=')) {
        foundKey = hash.split('key=')[1];
      }

      if (foundId && foundKey) {
        setClaimId(foundId);
        setClaimKey(foundKey);
      }
    };

    parseUrlParameters();
  }, [startParam]);

  const handleReset = () => {
    setCreatedData(null);
    setClaimId(null);
    setClaimKey(null);
    // Clean URL
    window.history.replaceState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-vault-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-vault-900 pb-8">
      <Navbar onOpenAudit={() => setIsAuditOpen(true)} />

      <main className="flex-1 flex flex-col justify-center py-4">
        {claimId && claimKey ? (
          <RevealSecret
            secretId={claimId}
            keyFragment={claimKey}
            onReset={handleReset}
          />
        ) : createdData ? (
          <ShareModal
            data={createdData}
            onReset={handleReset}
          />
        ) : (
          <CreateSecret
            onSuccess={(data) => setCreatedData(data)}
          />
        )}
      </main>

      <footer className="w-full max-w-2xl mx-auto px-4 mt-8 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PeerVault Drop</span>
          <span>•</span>
          <span>Open Source E2EE</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>Encrypted with WebCrypto AES-GCM-256</span>
        </div>
      </footer>

      <SecurityAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />
    </div>
  );
};
