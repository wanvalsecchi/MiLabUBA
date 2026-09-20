import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'es' | 'en';
  url?: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  language,
  url
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const targetUrl = url || (typeof window !== 'undefined' ? window.location.origin + '/' : '');

  // Handle escape key and lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Give time for modal DOM to render canvas if needed
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      
      QRCode.toCanvas(
        canvas,
        targetUrl,
        {
          width: 520,
          margin: 2,
          color: {
            dark: '#8B0E12', // Custom red matching new QR
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        },
        (error) => {
          if (error) {
            console.error('Error generating QR code:', error);
            return;
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw the central MiLab UBA logo
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          logo.src = '/logo_pwa.jpg';

          logo.onload = () => {
            const size = canvas.width;
            const logoSize = Math.round(size * 0.28);
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            const radius = 16;

            ctx.save();
            // Drop shadow behind center card
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            // Draw rounded white/cream background box
            ctx.fillStyle = '#FDF6ED';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x, y, logoSize, logoSize, radius);
            } else {
              ctx.rect(x, y, logoSize, logoSize);
            }
            ctx.fill();

            // Card border
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#F4E4D3';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Clip to rounded rectangle and draw the logo image
            ctx.beginPath();
            const innerPad = 8;
            if (ctx.roundRect) {
              ctx.roundRect(x + innerPad, y + innerPad, logoSize - innerPad * 2, logoSize - innerPad * 2, radius - 4);
            } else {
              ctx.rect(x + innerPad, y + innerPad, logoSize - innerPad * 2, logoSize - innerPad * 2);
            }
            ctx.clip();
            ctx.drawImage(logo, x + innerPad, y + innerPad, logoSize - innerPad * 2, logoSize - innerPad * 2);

            ctx.restore();

            try {
              setDownloadUrl(canvas.toDataURL('image/png'));
            } catch {
              setDownloadUrl('/QR-MiLabUBA.png');
            }
          };

          logo.onerror = () => {
            setDownloadUrl('/QR-MiLabUBA.png');
          };
        }
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'QR-MiLabUBA.png';
    link.href = downloadUrl || '/QR-MiLabUBA.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center min-h-screen"
      onClick={onClose}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-center transform transition-all animate-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#582C83]/10 text-[#582C83] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
              {language === 'es' ? 'Código QR - MiLab UBA' : 'QR Code - MiLab UBA'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-bold active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Presentation */}
        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border-2 border-[#8B0E12]/20 shadow-inner">
          <img
            src="/QR-MiLabUBA.png"
            alt="Código QR MiLab UBA"
            className="w-48 h-48 sm:w-56 sm:h-56 max-w-full rounded-xl object-contain shadow-xs"
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          <p className="text-[11px] font-bold text-[#8B0E12] mt-2.5 flex items-center gap-1">
            <span>📱</span> {language === 'es' ? 'Escaneá con la cámara de tu celular' : 'Scan with your mobile camera'}
          </p>
        </div>

        {/* URL box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 overflow-hidden text-left">
          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate flex-1 select-all pl-1">
            {targetUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer transition-colors"
            title={language === 'es' ? 'Copiar enlace' : 'Copy link'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-3 bg-[#8B0E12] hover:bg-[#720a0d] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'es' ? 'Descargar PNG' : 'Download PNG'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
