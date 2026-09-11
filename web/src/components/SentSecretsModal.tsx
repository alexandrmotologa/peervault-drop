import React, { useState, useEffect } from 'react';
import { X, History, Flame, Clock, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export interface SentSecretItem {
  id: string;
  label: string;
  isFile: boolean;
  createdAt: number;
  expiresAt: number;
  revocationToken: string;
  keyFragment?: string;
}

interface SentSecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SentSecretsModal: React.FC<SentSecretsModalProps> = ({ isOpen, onClose }) => {
  const { haptic } = useTelegram();
  const [items, setItems] = useState<SentSecretItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, { status: string; burned_at?: number }>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('peervault_sent_history');
      if (stored) {
        const parsed: SentSecretItem[] = JSON.parse(stored);
        setItems(parsed);
        refreshStatuses(parsed);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  };

  const refreshStatuses = async (list: SentSecretItem[]) => {
    setIsRefreshing(true);
    const newStatuses: Record<string, { status: string; burned_at?: number }> = {};

    await Promise.all(
      list.map(async (item) => {
        try {
          const res = await fetch(`/api/secret/${item.id}/status`);
          if (res.ok) {
            const data = await res.json();
            newStatuses[item.id] = {
              status: data.status,
              burned_at: data.burned_at
            };
          } else {
            newStatuses[item.id] = { status: 'not_found' };
          }
        } catch {
          newStatuses[item.id] = { status: 'unknown' };
        }
      })
    );

    setStatuses(newStatuses);
    setIsRefreshing(false);
  };

  const handleRevoke = async (item: SentSecretItem) => {
    if (!confirm('Are you sure you want to permanently destroy this secret right now?')) {
      return;
    }

    try {
      setLoadingIds((prev) => ({ ...prev, [item.id]: true }));
      haptic.impact('heavy');

      const res = await fetch(`/api/secret/${item.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revocation_token: item.revocationToken })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revoke secret');
      }

      setStatuses((prev) => ({
        ...prev,
        [item.id]: { status: 'burned', burned_at: Date.now() }
      }));
      haptic.notification('success');
    } catch (err: any) {
      haptic.notification('error');
      alert(err.message || 'Error destroying secret');
    } finally {
      setLoadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear local history list? (Secrets remain on server until burned or expired)')) {
      localStorage.removeItem('peervault_sent_history');
      setItems([]);
      setStatuses({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-4 pr-8">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sent Secrets Dashboard</h2>
              <p className="text-[11px] text-slate-400">Track delivery receipts & revoke before reading</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refreshStatuses(items)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No secrets sent from this device yet.
            </div>
          ) : (
            items.map((item) => {
              const currentStatus = statuses[item.id]?.status || 'checking';
              const burnedAt = statuses[item.id]?.burned_at;
              const isRevoking = loadingIds[item.id];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {item.label}
                      </span>
                      {item.isFile && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          File
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    {currentStatus === 'active' && (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Active</span>
                      </span>
                    )}
                    {currentStatus === 'burned' && (
                      <span className="text-[11px] font-semibold text-orange-400 flex items-center space-x-1">
                        <Flame className="w-3 h-3" />
                        <span>Burned</span>
                      </span>
                    )}
                    {currentStatus === 'expired' && (
                      <span className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Expired</span>
                      </span>
                    )}
                    {currentStatus === 'checking' && (
                      <span className="text-[11px] text-slate-500">Checking...</span>
                    )}
                    {currentStatus === 'not_found' && (
                      <span className="text-[11px] text-slate-500">Purged</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span>Sent: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                    {burnedAt ? (
                      <span className="text-orange-300">
                        Read at {new Date(burnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span>Expires: {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>

                  {currentStatus === 'active' && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleRevoke(item)}
                        disabled={isRevoking}
                        className="w-full py-1.5 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 font-semibold text-[11px] border border-red-500/30 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        {isRevoking ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Destroying...</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-3 h-3 text-red-400" />
                            <span>Destroy Now (Revoke Access)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleClearHistory}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History List</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
