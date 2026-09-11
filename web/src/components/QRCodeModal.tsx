import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Download, Loader2 } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !url) return;

    setLoading(true);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#F8FAFC'
      },
      errorCorrectionLevel: 'M'
    })
      .then((res) => {
        setDataUrl(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
        setLoading(false);
      });
  }, [isOpen, url]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center space-x-2 mb-3">
          <QrIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Scan Secret Link</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Scan with a mobile camera to open and decrypt directly on phone.
        </p>

        <div className="flex justify-center p-4 rounded-xl bg-white shadow-inner mb-5 max-w-[280px] mx-auto">
          {loading ? (
            <div className="w-60 h-60 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt="PeerVault Drop QR Code" className="w-60 h-60 block" />
          ) : (
            <div className="w-60 h-60 flex items-center justify-center text-xs text-red-500">
              Failed to generate QR
            </div>
          )}
        </div>

        {dataUrl && (
          <a
            href={dataUrl}
            download="peervault-secret-qr.png"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save QR Image</span>
          </a>
        )}
      </div>
    </div>
  );
};
