import React, { useState, useEffect, useRef } from 'react';
import { Category, Ficha, Language, DoiZone } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';
import { safeStorage } from '../storage';

const calculateGeometricArea = (z: Partial<DoiZone>): number => {
  const shape = z.shape || 'ellipse';
  const width = z.width !== undefined ? z.width : (z.radiusX !== undefined ? z.radiusX * 2 : (z.radius ? z.radius * 2 : 50));
  const height = z.height !== undefined ? z.height : (z.radiusY !== undefined ? z.radiusY * 2 : (z.radius ? z.radius * 2 : 50));
  const baseTop = z.baseTop || 30;
  const baseBottom = z.baseBottom || 50;
  const base = z.base || 50;
  const diagMajor = z.diagMajor || 60;
  const diagMinor = z.diagMinor || 40;

  switch (shape) {
    case 'ellipse':
      return Math.PI * (width / 2) * (height / 2);
    case 'rectangle':
      return width * height;
    case 'trapezoid':
      return ((baseTop + baseBottom) / 2) * height;
    case 'triangle':
      return (base * height) / 2;
    case 'rhombus':
      return (diagMajor * diagMinor) / 2;
    default:
      return Math.PI * (width / 2) * (height / 2);
  }
};

const formatDoiEquation = (eq: string | undefined, catType: string, lang: Language) => {
  if (!eq) return '';
  let formatted = eq;
  if (catType === 'densitometria') {
    if (lang === 'es') {
      formatted = formatted
        .replace(/Net IOD/g, 'DOI Neto')
        .replace(/IOD/g, 'DOI')
        .replace(/\*\s*C\b/g, '* M')
        .replace(/\(C\)/g, '(M)');
    } else {
      formatted = formatted
        .replace(/DOI Neto/g, 'Net IOD')
        .replace(/DOI/g, 'IOD')
        .replace(/\*\s*C\b/g, '* M')
        .replace(/\(C\)/g, '(M)');
    }
  } else {
    if (lang === 'es') {
      formatted = formatted
        .replace(/Net IOD/g, 'DOI Neto')
        .replace(/IOD/g, 'DOI');
    } else {
      formatted = formatted
        .replace(/DOI Neto/g, 'Net IOD')
        .replace(/DOI/g, 'IOD');
    }
  }
  return formatted;
};

function drawChannelCanvas(imgSrc: string, channel: 'red' | 'green' | 'blue', canvasElement: HTMLCanvasElement | null) {
  if (!canvasElement) return;
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
    const w = img.width;
    const h = img.height;
    const maxDim = 300;
    let dw = w;
    let dh = h;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        dw = maxDim;
        dh = (h / w) * maxDim;
      } else {
        dh = maxDim;
        dw = (w / h) * maxDim;
      }
    }
    canvasElement.width = dw;
    canvasElement.height = dh;
    ctx.drawImage(img, 0, 0, dw, dh);
    const imgData = ctx.getImageData(0, 0, dw, dh);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = imgData.data[i];
      const g = imgData.data[i+1];
      const b = imgData.data[i+2];
      if (channel === 'red') {
        imgData.data[i] = r;
        imgData.data[i+1] = 0;
        imgData.data[i+2] = 0;
      } else if (channel === 'green') {
        imgData.data[i] = 0;
        imgData.data[i+1] = g;
        imgData.data[i+2] = 0;
      } else if (channel === 'blue') {
        imgData.data[i] = 0;
        imgData.data[i+1] = 0;
        imgData.data[i+2] = b;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };
  img.src = imgSrc;
}

interface FichaDetailProps {
  language: Language;
  category: Category;
  ficha: Ficha;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (ficha: Ficha, useCurrentDate: boolean) => void;
  onAnalyzeGel: () => void;
  onCountCells: () => void;
  onAnalyzeDoi: () => void;
  onCombineChannels?: () => void;
}

export default function FichaDetail({
  language,
  category,
  ficha,
  onBack,
  onEdit,
  onDelete,
  onDuplicate,
  onAnalyzeGel,
  onCountCells,
  onAnalyzeDoi,
  onCombineChannels
}: FichaDetailProps) {
  const t = translations[language];

  const [microZoom, setMicroZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const microContainerRef = useRef<HTMLDivElement | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; index: number } | null>(null);
  const [isSavedLightbox, setIsSavedLightbox] = useState<boolean>(false);

  const handleMicroPanStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (microZoom <= 1 || !microContainerRef.current) return;
    setIsPanning(true);
    const container = microContainerRef.current;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setPanStart({
      x: clientX,
      y: clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    });
  };

  const handleMicroPanMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isPanning || microZoom <= 1 || !microContainerRef.current) return;
    const container = microContainerRef.current;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - panStart.x;
    const dy = clientY - panStart.y;
    
    container.scrollLeft = panStart.scrollLeft - dx;
    container.scrollTop = panStart.scrollTop - dy;
  };

  const handleMicroPanEnd = () => {
    setIsPanning(false);
  };

  const doiReportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doiReportPrintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gelReportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gelReportPrintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [annotatedBwDataUrl, setAnnotatedBwDataUrl] = useState<string | null>(null);
  const [showAnnotatedView, setShowAnnotatedView] = useState<boolean>(true);

  // Generate annotated Black & White image for Zymography, Densitometry, and DOI reports
  useEffect(() => {
    if (!ficha.image || !ficha.doiAnalysis || !ficha.doiAnalysis.zones || ficha.doiAnalysis.zones.length === 0) {
      setAnnotatedBwDataUrl(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image onto canvas
      ctx.drawImage(img, 0, 0, w, h);

      // Convert image to true Black & White / Grayscale
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      // Draw annotated zones & number badges
      // Determine standard scaling factor based on resolution
      const baseScale = Math.max(1, Math.min(w, h) / 600);

      ficha.doiAnalysis!.zones.forEach((zone, idx) => {
        const cx = zone.x * w;
        const cy = zone.y * h;
        const shape = zone.shape || 'ellipse';
        const zw = (zone.width !== undefined ? zone.width : (zone.radius ? zone.radius * 2 : 50)) * baseScale;
        const zh = (zone.height !== undefined ? zone.height : (zone.radius ? zone.radius * 2 : 50)) * baseScale;
        const rotRad = ((zone.rotation || 0) * Math.PI) / 180;

        ctx.save();
        ctx.translate(cx, cy);
        if (rotRad !== 0) ctx.rotate(rotRad);

        ctx.lineWidth = Math.max(2, 2.5 * baseScale);
        if (category.type === 'zimografia') {
          ctx.strokeStyle = '#22C55E'; // High-contrast Emerald Green for Zymography bands
          ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        } else if (zone.type === 'standard') {
          ctx.strokeStyle = '#8B5CF6';
          ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        } else if (zone.type === 'background') {
          ctx.strokeStyle = '#94A3B8';
          ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.setLineDash([4 * baseScale, 4 * baseScale]);
        } else {
          ctx.strokeStyle = '#EF4444';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        }

        ctx.beginPath();
        if (shape === 'ellipse') {
          ctx.ellipse(0, 0, zw / 2, zh / 2, 0, 0, 2 * Math.PI);
        } else if (shape === 'rectangle') {
          ctx.rect(-zw / 2, -zh / 2, zw, zh);
        } else if (shape === 'trapezoid') {
          const topW = (zone.baseTop || 30) * baseScale;
          const btmW = (zone.baseBottom || 50) * baseScale;
          ctx.moveTo(-topW / 2, -zh / 2);
          ctx.lineTo(topW / 2, -zh / 2);
          ctx.lineTo(btmW / 2, zh / 2);
          ctx.lineTo(-btmW / 2, zh / 2);
          ctx.closePath();
        } else if (shape === 'triangle') {
          const b = (zone.base || 50) * baseScale;
          ctx.moveTo(0, -zh / 2);
          ctx.lineTo(b / 2, zh / 2);
          ctx.lineTo(-b / 2, zh / 2);
          ctx.closePath();
        } else if (shape === 'rhombus') {
          const dMaj = (zone.diagMajor || 60) * baseScale;
          const dMin = (zone.diagMinor || 40) * baseScale;
          ctx.moveTo(0, -dMaj / 2);
          ctx.lineTo(dMin / 2, 0);
          ctx.lineTo(0, dMaj / 2);
          ctx.lineTo(-dMin / 2, 0);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw sample number badge/label
        ctx.save();
        const labelText = zone.label || `${idx + 1}`;
        const fontSize = Math.max(12, Math.round(13 * baseScale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const padX = 6 * baseScale;
        const padY = 3 * baseScale;
        const bgW = Math.max(20 * baseScale, textMetrics.width + padX * 2);
        const bgH = fontSize + padY * 2;

        const badgeX = cx - bgW / 2;
        const badgeY = cy - (zh / 2) - bgH - (3 * baseScale);

        // Badge background
        ctx.fillStyle = category.type === 'zimografia' ? '#15803D' : (zone.type === 'standard' ? '#6D28D9' : (zone.type === 'background' ? '#475569' : '#DC2626'));
        ctx.beginPath();
        const rad = 4 * baseScale;
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, bgW, bgH, rad);
        } else {
          ctx.rect(badgeX, badgeY, bgW, bgH);
        }
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 * baseScale;
        ctx.stroke();

        // Badge text
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, badgeY + bgH / 2);

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * baseScale, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });

      setAnnotatedBwDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = ficha.image;
  }, [ficha.image, ficha.doiAnalysis, category.type]);

  useEffect(() => {
    if (doiReportCanvasRef.current && ficha.doiAnalysis) {
      drawFichaDoiTrendline(doiReportCanvasRef.current, ficha.doiAnalysis);
    }
    if (doiReportPrintCanvasRef.current && ficha.doiAnalysis) {
      drawFichaDoiTrendline(doiReportPrintCanvasRef.current, ficha.doiAnalysis);
    }
  }, [ficha.doiAnalysis, language]);

  useEffect(() => {
    if (gelReportCanvasRef.current && ficha.gelAnalysis) {
      drawFichaGelTrendline(gelReportCanvasRef.current, ficha.gelAnalysis);
    }
    if (gelReportPrintCanvasRef.current && ficha.gelAnalysis) {
      drawFichaGelTrendline(gelReportPrintCanvasRef.current, ficha.gelAnalysis);
    }
  }, [ficha.gelAnalysis, language]);

  useEffect(() => {
    if (ficha.image && (category.type === 'rgv-analyzer' || category.type === 'sds-page' || category.type === 'adn' || category.type === 'doi-analyzer')) {
      // Draw subchannel previews when image exists
      setTimeout(() => {
        drawChannelCanvas(ficha.image!, 'red', rCanvasRef.current);
        drawChannelCanvas(ficha.image!, 'green', gCanvasRef.current);
        drawChannelCanvas(ficha.image!, 'blue', vCanvasRef.current);
      }, 100);
    }
  }, [ficha.image, category.type]);

  const drawFichaDoiTrendline = (canvas: HTMLCanvasElement, doi: any) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = Math.max(44, Math.round(w * 0.11));
    const padRight = Math.max(24, Math.round(w * 0.06));
    const padTop = Math.max(20, Math.round(h * 0.08));
    const padBottom = Math.max(34, Math.round(h * 0.12));

    const titleFont = `bold ${Math.max(10, Math.round(Math.min(w, h) * 0.044))}px sans-serif`;
    const tickFont = `${Math.max(8, Math.round(Math.min(w, h) * 0.034))}px monospace`;
    const labelFont = `bold ${Math.max(8, Math.round(Math.min(w, h) * 0.035))}px sans-serif`;
    const ptRadius = Math.max(3.5, Math.round(Math.min(w, h) * 0.016));

    // Background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#3E2A1F';
    ctx.lineWidth = Math.max(1.8, w * 0.005);
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, h - padBottom);
    ctx.lineTo(w - padRight, h - padBottom);
    ctx.stroke();

    // Axis titles
    ctx.fillStyle = '#3E2A1F';
    ctx.font = titleFont;
    ctx.textAlign = 'center';
    
    // X axis (Concentration or Mass)
    ctx.fillText(category.type === 'densitometria' 
      ? (language === 'es' ? 'Masa (M)' : 'Mass (M)') 
      : (language === 'es' ? 'Conc. (C)' : 'Conc. (C)'), 
      padLeft + (w - padLeft - padRight) / 2, h - 8
    );

    // Get standards & samples and background
    const standards = doi.zones.filter((z: any) => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
    const samples = doi.zones.filter((z: any) => z.type === 'sample');
    const backgrounds = doi.zones.filter((z: any) => z.type === 'background');
    const bgVal = backgrounds.length > 0 
      ? (backgrounds.reduce((acc: number, z: any) => acc + z.intensity, 0) / backgrounds.length) 
      : 0;

    // Y axis (DOI / IOD)
    ctx.save();
    ctx.translate(Math.max(14, padLeft * 0.35), padTop + (h - padTop - padBottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(bgVal > 0 
      ? (language === 'es' ? 'DOI Neto' : 'Net IOD') 
      : (language === 'es' ? 'DOI' : 'IOD'), 
      0, 0
    );
    ctx.restore();

    if (standards.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = `italic ${Math.max(10, Math.round(w * 0.03))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Faltan datos de calibración' : 'No calibration data', w / 2, h / 2);
      return;
    }

    // Find min and max values for mapping using net DOI (subtracted)
    const allX = [...standards.map((s: any) => s.concentration!), ...samples.map((s: any) => s.estimatedConcentration || 0)];
    const allY = [
      ...standards.map((s: any) => Math.max(0, s.intensity - bgVal)), 
      ...samples.map((s: any) => Math.max(0, s.intensity - bgVal))
    ];

    const maxX = Math.max(...allX, 10) * 1.15;
    const minX = 0;
    const maxY = Math.max(...allY, 10) * 1.15;
    const minY = 0;

    const mapX = (xVal: number) => padLeft + ((xVal - minX) / (maxX - minX)) * (w - padLeft - padRight);
    const mapY = (yVal: number) => (h - padBottom) - ((yVal - minY) / (maxY - minY)) * (h - padTop - padBottom);

    // 1. Draw gridlines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 3]);
    for (let i = 1; i <= 4; i++) {
      const gridX = minX + (maxX - minX) * (i / 4);
      const gridY = minY + (maxY - minY) * (i / 4);
      
      // Vertical gridline
      ctx.beginPath();
      ctx.moveTo(mapX(gridX), padTop);
      ctx.lineTo(mapX(gridX), h - padBottom);
      ctx.stroke();

      // Horizontal gridline
      ctx.beginPath();
      ctx.moveTo(padLeft, mapY(gridY));
      ctx.lineTo(w - padRight, mapY(gridY));
      ctx.stroke();

      // Axis ticks / values
      ctx.fillStyle = '#64748B';
      ctx.font = tickFont;
      ctx.textAlign = 'center';
      ctx.fillText(gridX.toFixed(0), mapX(gridX), h - padBottom + Math.max(12, padBottom * 0.45));

      ctx.textAlign = 'right';
      ctx.fillText(gridY.toFixed(0), padLeft - 4, mapY(gridY) + 3);
    }
    ctx.setLineDash([]);

    // 2. Draw Regression Line or Rule-of-three Line
    if (doi.method === 'regression') {
      const n = standards.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      standards.forEach((s: any) => {
        sumX += s.concentration!;
        sumY += Math.max(0, s.intensity - bgVal);
        sumXY += (s.concentration! * Math.max(0, s.intensity - bgVal));
        sumXX += (s.concentration! * s.concentration!);
      });
      const meanX = sumX / n;
      const meanY = sumY / n;
      let num = 0;
      let den = 0;
      standards.forEach((s: any) => {
        num += (s.concentration! - meanX) * (Math.max(0, s.intensity - bgVal) - meanY);
        den += (s.concentration! - meanX) * (s.concentration! - meanX);
      });
      const slope = den !== 0 ? num / den : 0;
      const intercept = meanY - slope * meanX;

      ctx.strokeStyle = '#4F46E5'; 
      ctx.lineWidth = Math.max(2, w * 0.005);
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(intercept));
      ctx.lineTo(mapX(maxX), mapY(slope * maxX + intercept));
      ctx.stroke();
    } else if (doi.method === 'ratio') {
      const ratios = standards.map((s: any) => s.concentration! / Math.max(1, s.intensity - bgVal));
      const avgRatio = ratios.reduce((a: any, b: any) => a + b, 0) / ratios.length;
      if (avgRatio > 0) {
        const slope = 1 / avgRatio;
        ctx.strokeStyle = '#059669'; 
        ctx.lineWidth = Math.max(2, w * 0.005);
        ctx.beginPath();
        ctx.moveTo(mapX(0), mapY(0));
        ctx.lineTo(mapX(maxX), mapY(slope * maxX));
        ctx.stroke();
      }
    }

    // 3. Plot standards (purple points)
    standards.forEach((s: any) => {
      const sx = mapX(s.concentration!);
      const sy = mapY(Math.max(0, s.intensity - bgVal));

      ctx.fillStyle = '#8B5CF6'; 
      ctx.strokeStyle = '#4C1D95'; 
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, ptRadius + 1, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // standard label
      ctx.fillStyle = '#4C1D95';
      ctx.font = labelFont;
      ctx.textAlign = 'left';
      ctx.fillText(` ${s.label}`, sx + ptRadius + 2, sy + 3);
    });

    // 4. Plot samples (red points)
    samples.forEach((s: any) => {
      if (s.estimatedConcentration !== undefined) {
        const sx = mapX(s.estimatedConcentration);
        const sy = mapY(Math.max(0, s.intensity - bgVal));

        ctx.fillStyle = '#EF4444'; 
        ctx.strokeStyle = '#7F1D1D'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, ptRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#7F1D1D';
        ctx.font = labelFont;
        ctx.textAlign = 'right';
        ctx.fillText(`${s.label} `, sx - ptRadius - 2, sy + 3);
      }
    });
  };

  const drawFichaGelTrendline = (canvas: HTMLCanvasElement, gel: any) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = Math.max(48, Math.round(w * 0.12));
    const padRight = Math.max(24, Math.round(w * 0.06));
    const padTop = Math.max(20, Math.round(h * 0.08));
    const padBottom = Math.max(34, Math.round(h * 0.12));

    const titleFont = `bold ${Math.max(10, Math.round(Math.min(w, h) * 0.044))}px sans-serif`;
    const tickFont = `${Math.max(8, Math.round(Math.min(w, h) * 0.034))}px monospace`;
    const labelFont = `bold ${Math.max(8, Math.round(Math.min(w, h) * 0.035))}px sans-serif`;
    const ptRadius = Math.max(3.5, Math.round(Math.min(w, h) * 0.016));

    // Background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#3E2A1F';
    ctx.lineWidth = Math.max(1.8, w * 0.005);
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, h - padBottom);
    ctx.lineTo(w - padRight, h - padBottom);
    ctx.stroke();

    // Axis titles
    ctx.fillStyle = '#3E2A1F';
    ctx.font = titleFont;
    ctx.textAlign = 'center';
    
    // X axis (Rf)
    ctx.fillText(
      language === 'es' ? 'Rf (Migración Relativa)' : 'Rf (Rel. Migration)', 
      padLeft + (w - padLeft - padRight) / 2, h - 8
    );

    // Y axis (log10(MW))
    ctx.save();
    ctx.translate(Math.max(14, padLeft * 0.35), padTop + (h - padTop - padBottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(
      category.type === 'adn'
        ? (language === 'es' ? 'log10(pb)' : 'log10(bp)')
        : (language === 'es' ? 'log10(PM)' : 'log10(MW)'), 
      0, 0
    );
    ctx.restore();

    const markerBands = (gel.markers || []).filter((b: any) => b.type === 'marker' && b.mw !== undefined && b.mw > 0);
    const sampleBands = (gel.markers || []).filter((b: any) => b.type === 'sample' && b.predictedMw !== undefined && b.predictedMw > 0);

    if (markerBands.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = `italic ${Math.max(10, Math.round(w * 0.03))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Faltan datos de calibración' : 'No calibration data', w / 2, h / 2);
      return;
    }

    const allPts = [
      ...markerBands.map((b: any) => ({ x: b.rf, y: Math.log10(b.mw as number) })),
      ...sampleBands.map((b: any) => ({ x: b.rf, y: Math.log10(b.predictedMw as number) }))
    ];

    const minX = 0;
    const maxX = 1.05;

    let minY = Math.min(...allPts.map((p: any) => p.y));
    let maxY = Math.max(...allPts.map((p: any) => p.y));
    minY = Math.max(0, minY - 0.2);
    maxY = maxY + 0.2;

    const mapX = (rx: number) => padLeft + ((rx - minX) / (maxX - minX)) * (w - padLeft - padRight);
    const mapY = (ry: number) => (h - padBottom) - ((ry - minY) / (maxY - minY)) * (h - padTop - padBottom);

    // Grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 3]);
    for (let i = 1; i <= 4; i++) {
      const gx = minX + (maxX - minX) * (i / 4);
      const gy = minY + (maxY - minY) * (i / 4);

      // Vertical
      ctx.beginPath();
      ctx.moveTo(mapX(gx), padTop);
      ctx.lineTo(mapX(gx), h - padBottom);
      ctx.stroke();

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(padLeft, mapY(gy));
      ctx.lineTo(w - padRight, mapY(gy));
      ctx.stroke();

      // Axis ticks / values
      ctx.fillStyle = '#64748B';
      ctx.font = tickFont;
      ctx.textAlign = 'center';
      ctx.fillText(gx.toFixed(2), mapX(gx), h - padBottom + Math.max(12, padBottom * 0.45));

      ctx.textAlign = 'right';
      ctx.fillText(gy.toFixed(2), padLeft - 4, mapY(gy) + 3);
    }
    ctx.setLineDash([]);

    // Calculate regression line
    const points = markerBands.map((b: any) => ({ x: b.rf, y: Math.log10(b.mw as number) }));
    const n = points.length;
    let slope = 0;
    let intercept = 0;
    if (n >= 2) {
      const sumX = points.reduce((s: number, p: any) => s + p.x, 0);
      const sumY = points.reduce((s: number, p: any) => s + p.y, 0);
      const sumXY = points.reduce((s: number, p: any) => s + p.x * p.y, 0);
      const sumXX = points.reduce((s: number, p: any) => s + p.x * p.x, 0);
      const meanX = sumX / n;
      const meanY = sumY / n;
      const num = sumXY - n * meanX * meanY;
      const den = sumXX - n * meanX * meanX;
      if (den !== 0) {
        slope = num / den;
        intercept = meanY - slope * meanX;
      }
    }

    if (n >= 2) {
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = Math.max(2, w * 0.005);
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(intercept));
      ctx.lineTo(mapX(1), mapY(slope * 1 + intercept));
      ctx.stroke();
    }

    // Plot markers (red dots)
    markerBands.forEach((b: any, i: number) => {
      const mx = mapX(b.rf);
      const my = mapY(Math.log10(b.mw as number));

      ctx.fillStyle = '#E11D48';
      ctx.strokeStyle = '#9F1239';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, ptRadius + 1, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#9F1239';
      ctx.font = labelFont;
      ctx.textAlign = 'left';
      ctx.fillText(` M${i + 1}:${b.mw}`, mx + ptRadius + 2, my + 3);
    });

    // Plot samples (amber/orange hollow circles)
    const allSampleBands = (gel.markers || []).filter((b: any) => b.type === 'sample');
    sampleBands.forEach((b: any) => {
      const sx = mapX(b.rf);
      const sy = mapY(Math.log10(b.predictedMw as number));
      const sIdx = allSampleBands.findIndex((x: any) => x.id === b.id) + 1;

      ctx.strokeStyle = '#D97706';
      ctx.fillStyle = '#FFFDF9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, ptRadius + 1.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#D97706';
      ctx.font = labelFont;
      ctx.textAlign = 'right';
      ctx.fillText(`P${sIdx}:${b.predictedMw.toFixed(0)} `, sx - ptRadius - 2, sy + 3);
    });
  };

  // Custom iframe-safe Modal logic states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  // Load custom logos from localStorage so they appear beautifully on screen, mobile and prints!
  const [savedLogos, setSavedLogos] = useState<{
    uba?: string;
    conicet?: string;
    ffyb?: string;
    fouba?: string;
  }>(() => {
    try {
      const stored = safeStorage.getItem('milabuba_logos');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleDuplicateClick = () => {
    setShowDuplicateConfirm(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handlePrintClick = () => {
    window.print();
  };

  const getCategoryDisplayName = () => {
    if (category.type === 'count') return t.count || (language === 'es' ? 'Contar' : 'Count');
    if (category.type === 'densitometria') return language === 'es' ? 'Densitometría' : 'Densitometry';
    if (category.type === 'sds-page') return t.sdsPage || 'PAGE';
    if (category.type === 'zimografia') return language === 'es' ? 'Zimografía' : 'Zymography';
    if (category.type === 'adn') return t.adn || (language === 'es' ? 'ADN' : 'DNA');
    if (category.type === 'doi-analyzer') return language === 'es' ? 'Colorimetría RGV' : 'RGV Colorimetry';
    if (category.type === 'microscopy') return t.microscopy;
    if (category.type === 'histology') return t.histology || (language === 'es' ? 'Histología' : 'Histology');
    if (category.type === 'rgv-analyzer') return language === 'es' ? 'MERGE Multicanal' : 'MERGE Multi-Channel';
    return category.name;
  };

  const getStainAffinityDisplay = (val?: string) => {
    if (!val) return 'N/A';
    return t.stainOptions[val as keyof typeof t.stainOptions] || val;
  };

  const getMorphologyDisplay = (val?: string, morphologies?: string[], other?: string) => {
    const list = morphologies && morphologies.length > 0
      ? morphologies
      : (val ? val.split(',').map(s => s.trim()).filter(Boolean) : []);

    if (list.length === 0) return 'N/A';

    return list.map(item => {
      if (item === 'otra') {
        return other ? `${t.morphologyOptions?.['otra'] || 'Otra'} (${other})` : (t.morphologyOptions?.['otra'] || 'Otra');
      }
      return t.morphologyOptions[item as keyof typeof t.morphologyOptions] || item;
    }).join(', ');
  };

  const getGroupingDisplay = (val?: string, other?: string) => {
    if (!val) return 'N/A';
    const label = t.groupingOptions[val as keyof typeof t.groupingOptions] || val;
    if (val === 'otra') {
      return other ? `${label}: ${other}` : label;
    }
    return label;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-800 dark:text-slate-100 transition-colors duration-200 print:p-0 print:m-0 print:bg-white">
      
      {/* EXCLUSIVELY VISIBLE ON PHYSICAL PRINT - DESIGNED FOR window.print() */}
      <div className="hidden print:block bg-white p-6 max-w-[800px] mx-auto text-[#111111] font-sans antialiased">
        <div className="border-b-4 border-slate-850 pb-4 mb-6 flex justify-between items-start">
          <div className="space-y-2">
            {/* Printable Custom Logos bar */}
            {(savedLogos.uba || savedLogos.conicet || savedLogos.ffyb || savedLogos.fouba) && (
              <div className="flex gap-3 items-center mb-1 flex-wrap">
                {savedLogos.uba && <img src={savedLogos.uba} alt="UBA Logo" className="h-9 w-auto max-w-[54px] object-contain" referrerPolicy="no-referrer" />}
                {savedLogos.conicet && <img src={savedLogos.conicet} alt="CONICET Logo" className="h-9 w-auto max-w-[80px] object-contain" referrerPolicy="no-referrer" />}
                {savedLogos.ffyb && <img src={savedLogos.ffyb} alt="FFyB Logo" className="h-9 w-auto max-w-[54px] object-contain" referrerPolicy="no-referrer" />}
                {savedLogos.fouba && <img src={savedLogos.fouba} alt="FOUBA Logo" className="h-9 w-auto max-w-[54px] object-contain" referrerPolicy="no-referrer" />}
              </div>
            )}
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none mb-1">
              {ficha.title}
            </h1>
            <p className="text-xs font-bold text-gray-400 font-mono tracking-wider uppercase">
              {translations[language].institution1} • {getCategoryDisplayName()}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 font-mono space-y-0.5 pt-1 shrink-0 pl-3">
            <p className="font-bold text-slate-800">Corrida: {ficha.runDate}</p>
            <p>Creado: {new Date(ficha.dateCreated).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Big Print picture centered (450px width and 280px height limit to prevent multi-page push) */}
        {ficha.image && (
          <div className="flex flex-col items-center justify-center mb-6 break-inside-avoid">
            <img
              src={annotatedBwDataUrl || ficha.image}
              alt={ficha.title}
              className="max-w-[450px] max-h-[280px] w-auto h-auto object-contain rounded border border-gray-400 shadow-sm"
              referrerPolicy="no-referrer"
            />
            {annotatedBwDataUrl && ficha.doiAnalysis && ficha.doiAnalysis.zones && ficha.doiAnalysis.zones.length > 0 && (
              <span className="text-[10px] text-gray-700 font-mono font-bold mt-1 text-center">
                {category.type === 'zimografia'
                  ? (language === 'es' ? '📸 Imagen en Blanco y Negro con Muestras Numeradas (Zimografía)' : '📸 Black & White Image with Numbered Samples (Zymography)')
                  : (language === 'es' ? '📸 Imagen en Blanco y Negro con Zonas Numeradas' : '📸 Black & White Image with Numbered Zones')
                }
              </span>
            )}
          </div>
        )}

        {/* Extra Print Pictures Grid (3.2) */}
        {ficha.extraImages && ficha.extraImages.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-2">
              🖼️ {language === 'es' ? 'Imágenes Adicionales del Reporte' : 'Additional Report Images'} ({ficha.extraImages.length})
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {ficha.extraImages.map((extraImg, idx) => (
                <div key={idx} className="border border-gray-300 rounded p-1 bg-white flex flex-col items-center">
                  <img
                    src={extraImg}
                    alt={`Print Extra ${idx}`}
                    className="max-h-[220px] w-auto max-w-full object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] text-gray-500 font-mono mt-1 font-bold">
                    {language === 'es' ? 'Imagen Adicional' : 'Additional Image'} #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worksheet fields table key attributes */}
        <div className="mb-6 break-inside-avoid">
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 border-b border-gray-300 pb-1 mb-3">
            📋 {translations[language].detailsTitle}
          </h3>
          <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs text-gray-800 bg-gray-50 p-4 rounded border border-gray-200">
            {category.type === 'microscopy' && (
              <div className="col-span-2 space-y-4">
                {/* 1. Observación Microscópica */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🔬 {language === 'es' ? 'Observación Microscópica' : 'Microscopical Observation'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{t.microorganismType || 'Tipo de Microorganismo'}:</strong> {ficha.fields.microorganismType || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Aumento' : 'Magnification'}:</strong> {ficha.fields.magnification || 'N/A'}</p>
                    <p><strong>{t.morphology || 'Morfologías presentes'}:</strong> {getMorphologyDisplay(ficha.fields.morphology, ficha.fields.morphologies, ficha.fields.morphologyOther)}</p>
                    <p><strong>{t.grouping || 'Agrupación'}:</strong> {getGroupingDisplay(ficha.fields.grouping, ficha.fields.groupingOther)}</p>
                    <p><strong>{language === 'es' ? 'Coloración' : 'Staining'}:</strong> {ficha.fields.coloration === 'other' ? `${language === 'es' ? 'Otra' : 'Other'} (${ficha.fields.colorationOther || ''})` : (ficha.fields.coloration || 'N/A')}</p>
                    <p><strong>{t.stainAffinity || 'Afinidad Tintorial'}:</strong> {ficha.fields.stainAffinity === 'other' ? `${language === 'es' ? 'Otra' : 'Other'} (${ficha.fields.stainAffinityOther || ''})` : (ficha.fields.stainAffinity === 'AAR' ? 'AAR (Ácido alcohol resistente)' : getStainAffinityDisplay(ficha.fields.stainAffinity))}</p>
                  </div>
                </div>

                {/* 2. Información de Cultivo */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🧫 {language === 'es' ? 'Información de Cultivo' : 'Cultivation Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Soporte' : 'Support'}:</strong> {ficha.fields.cultureSupport || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}:</strong> {ficha.fields.cultureMedium || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Agente selector' : 'Selective Agent'}:</strong> {ficha.fields.selectiveAgent || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Temperatura' : 'Temperature'}:</strong> {ficha.fields.temperature || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Tiempo de incubación' : 'Incubation Time'}:</strong> {ficha.fields.incubationTime || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Condiciones atmosféricas' : 'Atmospheric Conditions'}:</strong> {ficha.fields.atmosphericConditions || 'N/A'}</p>
                  </div>
                </div>

                {/* 3. Morfología Macroscópica */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🔍 {language === 'es' ? 'Morfología Macroscópica de Colonia' : 'Colony Macroscopical Morphology'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Tamaño' : 'Size'}:</strong> {ficha.fields.colonySize || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Forma' : 'Shape'}:</strong> {ficha.fields.colonyShape || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Transparencia' : 'Transparency'}:</strong> {ficha.fields.colonyTransparency || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Brillo' : 'Brightness'}:</strong> {ficha.fields.colonyBrightness || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Color' : 'Color'}:</strong> {ficha.fields.colonyColor || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Textura' : 'Texture'}:</strong> {ficha.fields.colonyTexture || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Consistencia' : 'Consistency'}:</strong> {ficha.fields.colonyConsistency || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Crecimiento' : 'Growth'}:</strong> {ficha.fields.colonyGrowth === 'other' ? `${language === 'es' ? 'Otro' : 'Other'} (${ficha.fields.colonyGrowthOther || ''})` : (ficha.fields.colonyGrowth || 'N/A')}</p>
                  </div>
                </div>
              </div>
            )}

            {category.type === 'histology' && (
              <div className="col-span-2 space-y-4">
                {/* 1. Datos del Espécimen */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🩺 {language === 'es' ? 'Datos del Espécimen' : 'Specimen Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Tipo de espécimen' : 'Specimen Type'}:</strong> {ficha.fields.specimenType === 'Otro' ? `${ficha.fields.specimenType} (${ficha.fields.specimenTypeOther || ''})` : (ficha.fields.specimenType || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Órgano / Tejido' : 'Organ / Tissue'}:</strong> {ficha.fields.organTissue === 'Otro' ? `${ficha.fields.organTissue} (${ficha.fields.organTissueOther || ''})` : (ficha.fields.organTissue || 'N/A')}</p>
                    <p className="col-span-2"><strong>{language === 'es' ? 'Textura' : 'Texture'}:</strong> {ficha.fields.texture === 'Otro' ? `${ficha.fields.texture} (${ficha.fields.textureOther || ''})` : (ficha.fields.texture || 'N/A')}</p>
                  </div>
                </div>

                {/* 2. Procesamiento Histológico */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🧪 {language === 'es' ? 'Procesamiento Histológico' : 'Histological Processing'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Fijación' : 'Fixation'}:</strong> {ficha.fields.fixation === 'Otro' ? `${ficha.fields.fixation} (${ficha.fields.fixationOther || ''})` : (ficha.fields.fixation || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Tiempo de fijación' : 'Fixation Time'}:</strong> {ficha.fields.fixationTime || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Inclusión' : 'Inclusion'}:</strong> {ficha.fields.inclusion === 'Otro' ? `${ficha.fields.inclusion} (${ficha.fields.inclusionOther || ''})` : (ficha.fields.inclusion || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Corte' : 'Sectioning'}:</strong> {ficha.fields.sectioning === 'Otro' ? `${ficha.fields.sectioning} (${ficha.fields.sectioningOther || ''})` : (ficha.fields.sectioning || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Grosor de corte' : 'Section Thickness'}:</strong> {ficha.fields.sectionThickness || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Tinción principal' : 'Main Stain'}:</strong> {ficha.fields.mainStain === 'Tinción especial' ? `${ficha.fields.mainStain} (${ficha.fields.mainStainOther || ''})` : (ficha.fields.mainStain || 'N/A')}</p>
                  </div>
                </div>

                {/* 3. Condiciones de Cultivo */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🧫 {language === 'es' ? 'Condiciones de Cultivo (si aplica)' : 'Cultivation Conditions (if applicable)'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Tipo de cultivo' : 'Culture Type'}:</strong> {ficha.fields.histoCultureType === 'Línea celular' || ficha.fields.histoCultureType === 'Otro' ? `${ficha.fields.histoCultureType} (${ficha.fields.histoCultureTypeOther || ''})` : (ficha.fields.histoCultureType || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Línea celular' : 'Cell Line'}:</strong> {ficha.fields.histoCellLine || 'N/A'}</p>
                    <p><strong>{language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}:</strong> {ficha.fields.histoCultureMedium === 'Otro' ? `${ficha.fields.histoCultureMedium} (${ficha.fields.histoCultureMediumOther || ''})` : (ficha.fields.histoCultureMedium || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Tratamiento / Estímulo' : 'Treatment / Stimulus'}:</strong> {ficha.fields.histoTreatment || 'N/A'}</p>
                  </div>
                </div>

                {/* 4. Hallazgos Microscópicos */}
                <div className="border border-gray-300 rounded p-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">
                    🔬 {language === 'es' ? 'Hallazgos Microscópicos (Descriptivos)' : 'Microscopic Findings (Descriptive)'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                    <p><strong>{language === 'es' ? 'Morfología celular' : 'Cell Morphology'}:</strong> {ficha.fields.histoCellMorphology === 'Atípica' ? `${ficha.fields.histoCellMorphology} (${ficha.fields.histoCellMorphologyOther || ''})` : (ficha.fields.histoCellMorphology || 'N/A')}</p>
                    <p><strong>{language === 'es' ? 'Patrón de tinción' : 'Staining Pattern'}:</strong> {ficha.fields.histoStainingPattern || 'N/A'}</p>
                    <p className="col-span-2"><strong>{language === 'es' ? 'Núcleo' : 'Nucleus'}:</strong> {ficha.fields.histoNucleus || 'N/A'}</p>
                    <p className="col-span-2"><strong>{language === 'es' ? 'Citoplasma' : 'Cytoplasm'}:</strong> {ficha.fields.histoCytoplasm || 'N/A'}</p>
                    <p className="col-span-2"><strong>{language === 'es' ? 'Membrana' : 'Membrane'}:</strong> {ficha.fields.histoMembrane || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {category.type === 'sds-page' && (
              <>
                <p><strong>{t.sampleType}:</strong> {ficha.fields.sampleType || 'N/A'}</p>
                <p><strong>{t.approxMw}:</strong> {ficha.fields.approxMw || 'N/A'}</p>
                <p><strong>{t.gelPercentage}:</strong> {ficha.fields.gelPercentage || 'N/A'}</p>
                <p><strong>{t.glassThickness}:</strong> {ficha.fields.glassThickness || 'N/A'}</p>
                <p><strong>{t.voltage}:</strong> {ficha.fields.voltage || 'N/A'}</p>
                <p><strong>{t.amperage}:</strong> {ficha.fields.amperage || 'N/A'}</p>
                <p className="col-span-2"><strong>{t.runTime}:</strong> {ficha.fields.runTime || 'N/A'}</p>
              </>
            )}

            {category.type === 'adn' && (
              <>
                <p><strong>{t.sampleType}:</strong> {ficha.fields.sampleType || 'N/A'}</p>
                <p><strong>{t.fragmentSize}:</strong> {ficha.fields.fragmentSize || 'N/A'}</p>
                <p><strong>{t.agarosePercentage}:</strong> {ficha.fields.agarosePercentage || 'N/A'}</p>
                <p><strong>{t.voltage}:</strong> {ficha.fields.voltage || 'N/A'}</p>
                <p><strong>{t.amperage}:</strong> {ficha.fields.amperage || 'N/A'}</p>
                <p className="col-span-2"><strong>{t.runTime}:</strong> {ficha.fields.runTime || 'N/A'}</p>
              </>
            )}

            {category.type === 'custom' && (
              <p className="col-span-2"><strong>{t.description}:</strong> {ficha.fields.description || 'N/A'}</p>
            )}

            {ficha.fields.observations && (
              <p className="col-span-2 border-t border-gray-200 pt-2.5 mt-1.5 text-gray-700 italic">
                <strong>{t.observations}:</strong> {ficha.fields.observations}
              </p>
            )}
          </div>
        </div>

        {/* PRINT GEL ANALYSIS */}
        {ficha.gelAnalysis && (
          <div className="mb-6 break-inside-avoid">
            <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 border-b border-gray-300 pb-1 mb-3">
              📊 {translations[language].gelAnalysisResults}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              <div className="md:col-span-5 bg-gray-50 border border-gray-200 p-4 rounded text-xs font-mono flex flex-col justify-center gap-2">
                {ficha.gelAnalysis.equation && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">
                      {language === 'es' ? 'Ecuación de Regresión (MW):' : 'Regression Equation (MW):'}
                    </span>
                    <p className="font-bold text-blue-900 text-sm">{ficha.gelAnalysis.equation}</p>
                  </div>
                )}
                {ficha.gelAnalysis.r2 > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">
                      {language === 'es' ? 'Coeficiente Determinación (R²):' : 'Determination Coeff. (R²):'}
                    </span>
                    <p className="font-bold text-emerald-800 text-sm font-mono">{ficha.gelAnalysis.r2.toFixed(4)}</p>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">
                    {language === 'es' ? 'Fecha del Análisis:' : 'Analysis Date:'}
                  </span>
                  <span className="text-gray-700">{new Date(ficha.gelAnalysis.analysisDate).toLocaleString()}</span>
                </div>
              </div>

              <div className="md:col-span-7 bg-[#FFFDF9] border border-gray-200 p-3 rounded flex flex-col items-center justify-center min-h-[220px]">
                <span className="text-[10px] uppercase font-extrabold text-gray-600 mb-2 tracking-wide">
                  {category.type === 'adn' 
                    ? (language === 'es' ? '📈 CURVA DE CALIBRACIÓN ADN (Rf vs log10 pb)' : '📈 DNA CALIBRATION CURVE (Rf vs log10 bp)')
                    : (language === 'es' ? '📈 CURVA DE CALIBRACIÓN ELECTROFORESIS (Rf vs log10 PM)' : '📈 ELECTROPHORESIS CALIBRATION CURVE (Rf vs log10 MW)')
                  }
                </span>
                <canvas
                  ref={gelReportPrintCanvasRef}
                  width={560}
                  height={320}
                  className="w-full h-auto max-w-[480px] bg-transparent"
                />
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200 text-gray-800 border-b border-gray-300 uppercase font-bold text-[10px]">
                  <th className="p-2">{language === 'es' ? 'Tipo de Banda' : 'Band Type'}</th>
                  <th className="p-2">Rf</th>
                  <th className="p-2 text-right">{category.type === 'adn' ? (language === 'es' ? 'Tamaño (pb)' : 'Size (bp)') : (language === 'es' ? 'Peso (kDa)' : 'Weight (kDa)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ficha.gelAnalysis.markers.map((b) => {
                  const sampleBands = ficha.gelAnalysis.markers.filter((m) => m.type === 'sample');
                  const sIdx = sampleBands.findIndex((m) => m.id === b.id) + 1;
                  return (
                    <tr key={b.id} className="text-gray-700">
                      <td className="p-2">
                        {b.type === 'marker'
                          ? (language === 'es' ? 'Marcador Patrón' : 'Standard Marker')
                          : `${language === 'es' ? 'Muestra Problema' : 'Problem Sample'} #${sIdx}`
                        }
                      </td>
                      <td className="p-2 font-mono">{b.rf.toFixed(3)}</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {b.type === 'marker'
                          ? (b.mw ? `${b.mw} ${category.type === 'adn' ? 'pb' : 'kDa'} (${language === 'es' ? 'Conocido' : 'Known'})` : '-')
                          : (b.predictedMw ? `${b.predictedMw.toFixed(1)} ${category.type === 'adn' ? 'pb' : 'kDa'} (${language === 'es' ? 'Calculado' : 'Est.'})` : '-')
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PRINT DOI ANALYSIS */}
        {ficha.doiAnalysis && (
          <div className="mb-6 break-inside-avoid">
            <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 border-b border-gray-300 pb-1 mb-3">
              📊 {category.type === 'zimografia'
                ? (language === 'es' ? 'Resultados del Análisis de Zimografía' : 'Zymography Analysis Results')
                : category.type === 'densitometria'
                ? (language === 'es' ? 'Resultados del Análisis de Densitometría' : 'Densitometry Analysis Results')
                : (language === 'es' ? 'Resultados del Análisis de Colorimetría RGV' : 'RGV Colorimetry Analysis Results')
              }
            </h3>
            
            {category.type !== 'zimografia' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="md:col-span-5 bg-gray-50 border border-gray-200 p-4 rounded text-xs font-mono flex flex-col justify-center gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">
                      {language === 'es' ? 'Método de Cálculo:' : 'Calculation Method:'}
                    </span>
                    <p className="font-semibold text-gray-800">
                      {ficha.doiAnalysis.method === 'regression' ? (language === 'es' ? 'Regresión Lineal' : 'Linear Regression') : (language === 'es' ? 'Regla de tres (Estándar promedio)' : 'Rule of three (Average standard)')}
                    </p>
                  </div>
                  {ficha.doiAnalysis.method === 'regression' && (
                    <>
                      {ficha.doiAnalysis.equation && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">
                            {language === 'es' ? 'Ecuación Predictiva:' : 'Predictive Equation:'}
                          </span>
                          <p className="font-bold text-blue-900 text-sm">
                            {formatDoiEquation(ficha.doiAnalysis.equation, category.type, language)}
                          </p>
                        </div>
                      )}
                      {ficha.doiAnalysis.r2 !== undefined && ficha.doiAnalysis.r2 > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0.5">R²:</span>
                          <p className="font-bold text-emerald-800 text-sm font-mono">{ficha.doiAnalysis.r2.toFixed(4)}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      {language === 'es' ? 'Fecha del Análisis:' : 'Analysis Date:'}
                    </span>
                    <span className="text-gray-700">{new Date(ficha.doiAnalysis.analysisDate).toLocaleString()}</span>
                  </div>
                </div>

                <div className="md:col-span-7 bg-[#FFFDF9] border border-gray-200 p-3 rounded flex flex-col items-center justify-center min-h-[220px]">
                  <span className="text-[10px] uppercase font-extrabold text-gray-600 mb-2 tracking-wide">
                    {category.type === 'densitometria' 
                      ? (language === 'es' ? '📈 CURVA DE CALIBRACIÓN DOI (Masa)' : '📈 IOD CALIBRATION CURVE (Mass)')
                      : (language === 'es' ? '📈 CURVA DE CALIBRACIÓN DOI' : '📈 IOD CALIBRATION CURVE')
                    }
                  </span>
                  <canvas
                    ref={doiReportPrintCanvasRef}
                    width={560}
                    height={320}
                    className="w-full h-auto max-w-[480px] bg-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs font-mono mb-4">
                <p><strong>{language === 'es' ? 'Fecha del Análisis:' : 'Analysis Date:'}</strong> {new Date(ficha.doiAnalysis.analysisDate).toLocaleString()}</p>
              </div>
            )}

            {category.type === 'densitometria' ? (
              <table className="w-full text-left text-xs border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-200 text-gray-800 border-b border-gray-300 uppercase font-bold text-[10px]">
                    <th className="p-2">{language === 'es' ? 'Zona/Etiqueta' : 'Zone/Label'}</th>
                    <th className="p-2">{language === 'es' ? 'Tipo de Punto' : 'Point Type'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'DOI Bruto' : 'Raw IOD'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'DOI Neto' : 'Net IOD'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'Masa (M)' : 'Mass (M)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const bgZones = ficha.doiAnalysis.zones.filter(z => z.type === 'background');
                    const bgVal = bgZones.length > 0 ? bgZones.reduce((a, b) => a + b.intensity, 0) / bgZones.length : 0;
                    return ficha.doiAnalysis.zones.map((zone, idx) => {
                      const computedArea = zone.area ?? calculateGeometricArea(zone);
                      const computedMean = zone.meanIntensity ?? 0;
                      const rawDoi = zone.intensity;
                      const netDoi = Math.max(0, zone.intensity - bgVal);
                      const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                      const sIdx = samples.findIndex(z => z.id === zone.id) + 1;

                      return (
                        <tr key={zone.id} className="text-gray-700">
                          <td className="p-2 font-semibold">{zone.label || `Zone ${idx + 1}`}</td>
                          <td className="p-2">
                            {zone.type === 'standard' 
                              ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard') 
                              : zone.type === 'background'
                              ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                              : `${language === 'es' ? 'Muestra Problema' : 'Problem Sample'} #${sIdx}`
                            }
                          </td>
                          <td className="p-2 text-right font-mono">{computedArea.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono">{computedMean.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono">{rawDoi.toFixed(0)}</td>
                          <td className="p-2 text-right font-mono">{zone.type === 'background' ? '-' : netDoi.toFixed(0)}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900">
                            {zone.type === 'standard'
                              ? (zone.concentration !== undefined ? `${zone.concentration} (${language === 'es' ? 'Patrón' : 'Std'})` : '-')
                              : zone.type === 'background'
                              ? '-'
                              : (zone.estimatedConcentration !== undefined ? `${zone.estimatedConcentration.toFixed(2)}` : '-')
                            }
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            ) : category.type === 'zimografia' ? (
              <div>
                <table className="w-full text-left text-xs border-collapse mb-4">
                  <thead>
                    <tr className="bg-gray-200 text-gray-800 border-b border-gray-300 uppercase font-bold text-[10px]">
                      <th className="p-2">{language === 'es' ? 'Zona' : 'Zone'}</th>
                      <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                      <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                      <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                      <th className="p-2 text-right">{language === 'es' ? 'Int. Total' : 'Total Int.'}</th>
                      <th className="p-2 text-right">{language === 'es' ? 'Act. Relativa (%)' : 'Rel. Activity (%)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ficha.doiAnalysis.zones.map((zone, idx) => {
                      const computedArea = zone.area ?? calculateGeometricArea(zone);
                      const computedMean = zone.meanIntensity ?? 0;
                      const computedTotal = zone.totalActivity ?? zone.intensity;
                      
                      const controlZone = ficha.doiAnalysis?.controlZoneId 
                        ? ficha.doiAnalysis.zones.find(z => z.id === ficha.doiAnalysis.controlZoneId)
                        : undefined;
                        
                      let relActivityStr = '-';
                      if (controlZone && controlZone.totalActivity) {
                        relActivityStr = ((computedTotal / controlZone.totalActivity) * 100).toFixed(1) + '%';
                      } else if (zone.type === 'background') {
                        relActivityStr = 'Blanco';
                      }

                      const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                      const sIdx = samples.findIndex(z => z.id === zone.id) + 1;

                      return (
                        <tr key={zone.id} className="text-gray-700">
                          <td className="p-2 font-semibold">{zone.label || `Zone ${idx + 1}`}</td>
                          <td className="p-2">
                            {zone.type === 'standard' 
                              ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard') 
                              : zone.type === 'background'
                              ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                              : `${language === 'es' ? 'Muestra Problema' : 'Problem Sample'} #${sIdx}`
                            }
                          </td>
                          <td className="p-2 text-right font-mono">{computedArea.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono">{computedMean.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono">{computedTotal.toFixed(0)}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900">{relActivityStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Custom ratios / Cocientes Personalizados */}
                {ficha.doiAnalysis.customRatios && ficha.doiAnalysis.customRatios.length > 0 && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-4 break-inside-avoid">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-1 mb-2">
                      ⚖️ {language === 'es' ? 'Cocientes Personalizados Seleccionados' : 'Selected Custom Ratios'}
                    </h4>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 border-b border-gray-250 uppercase font-semibold text-[9px]">
                          <th className="p-1.5">{language === 'es' ? 'Comparación' : 'Comparison'}</th>
                          <th className="p-1.5 text-right">{language === 'es' ? 'Valor Relativo / Cociente' : 'Relative Value / Ratio'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ficha.doiAnalysis.customRatios.map((r) => {
                          const numZ = ficha.doiAnalysis?.zones.find(z => z.id === r.numId);
                          const denZ = ficha.doiAnalysis?.zones.find(z => z.id === r.denId);
                          if (!numZ || !denZ) return null;
                          const numVal = numZ.totalActivity ?? numZ.intensity;
                          const denVal = denZ.totalActivity ?? denZ.intensity;
                          const ratioVal = numVal / denVal;
                          return (
                            <tr key={r.id} className="text-gray-700 font-mono text-[11px]">
                              <td className="p-1.5 font-sans font-bold text-gray-800">{numZ.label} / {denZ.label}</td>
                              <td className="p-1.5 text-right font-black text-blue-900">{ratioVal.toFixed(4)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 text-gray-800 border-b border-gray-300 uppercase font-bold text-[10px]">
                    <th className="p-2">{language === 'es' ? 'Zona' : 'Zone'}</th>
                    <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'Densidad Óptica (DOI)' : 'Optical Density (IOD)'}</th>
                    <th className="p-2 text-right">{language === 'es' ? 'Concentración' : 'Concentration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ficha.doiAnalysis.zones.map((zone, idx) => {
                    const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                    const sIdx = samples.findIndex(z => z.id === zone.id) + 1;
                    return (
                      <tr key={zone.id} className="text-gray-700">
                        <td className="p-2 font-semibold">{zone.label || `Zone ${idx + 1}`}</td>
                        <td className="p-2">
                          {zone.type === 'standard' 
                            ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard') 
                            : zone.type === 'background'
                            ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                            : `${language === 'es' ? 'Muestra Problema' : 'Problem Sample'} #${sIdx}`
                          }
                        </td>
                        <td className="p-2 text-right font-mono">{zone.intensity.toFixed(1)}</td>
                        <td className="p-2 text-right font-mono font-bold text-blue-900">
                          {zone.type === 'standard'
                            ? (zone.concentration !== undefined ? `${zone.concentration} (Known)` : '-')
                            : (zone.estimatedConcentration !== undefined ? `${zone.estimatedConcentration.toFixed(2)} (Est.)` : '-')
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PRINT CELL COUNT ANALYSIS */}
        {ficha.countAnalysis && (
          <div className="mb-6 break-inside-avoid">
            <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 border-b border-gray-300 pb-1 mb-3">
              {ficha.countAnalysis.isUfcApp ? '🧫' : '🦟'} {translations[language].countAnalysisResults}
            </h3>

            {ficha.countAnalysis.isUfcApp ? (
              <div className="grid grid-cols-2 gap-6 text-xs mb-4">
                <div className="space-y-1.5 font-semibold text-gray-700 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex justify-between">
                    <span>{language === 'es' ? 'Recuento Total de Colonias / Placas:' : 'Total Colonies / Plaques Count:'}</span>
                    <span className="font-mono font-bold text-gray-900">{ficha.countAnalysis.markers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'es' ? 'Volumen Sembrado:' : 'Seeded Volume:'}</span>
                    <span className="font-mono font-bold text-gray-900">{ficha.countAnalysis.seededVolume} µL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'es' ? 'Exponente Dilución (x):' : 'Dilution Exponent (x):'}</span>
                    <span className="font-mono font-bold text-gray-900">x = {ficha.countAnalysis.dilutionExponent} (10^-{ficha.countAnalysis.dilutionExponent})</span>
                  </div>
                </div>
                <div className="bg-blue-50/50 p-4 rounded border border-blue-200 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider mb-1">
                    {language === 'es' ? 'Concentración Estimada' : 'Estimated Concentration'}
                  </span>
                  <p className="font-mono text-base font-black text-blue-900">
                    {ficha.countAnalysis.calculatedConcentration !== undefined
                      ? ficha.countAnalysis.calculatedConcentration.toExponential(4)
                      : '0'
                    } UFC/ml u UFP/ml
                  </p>
                  <span className="text-[9px] text-gray-500 font-bold mt-1 font-mono">
                    [(Recuento × 1000) × 10^x] / Volumen
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 text-xs mb-4">
                <div>
                  <p className="mb-1.5 font-bold text-gray-500 uppercase text-[10px]">Población counts:</p>
                  <div className="space-y-1.5 font-semibold text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                    {Object.entries(ficha.countAnalysis.counts).map(([name, val]) => (
                      <div key={name} className="flex justify-between">
                        <span>{name}:</span>
                        <span className="font-mono font-bold">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 font-bold text-gray-500 uppercase text-[10px]">Relaciones calculadas:</p>
                  <div className="space-y-1.5 font-semibold text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                    {((ficha.countAnalysis.predefinedRatios || []).length > 0 || (ficha.countAnalysis.customRatios || []).length > 0) ? (
                      [...(ficha.countAnalysis.predefinedRatios || []), ...(ficha.countAnalysis.customRatios || []).map(r => ({ label: `${r.typeA} / ${r.typeB}`, value: r.value }))].map((item) => (
                        <div key={item.label} className="flex justify-between bg-white p-1 rounded border border-gray-100">
                          <span>{item.label}:</span>
                          <span className="font-bold text-blue-800">{item.value.toFixed(2)}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 font-mono text-right">
              Fecha del Análisis: {new Date(ficha.countAnalysis.analysisDate).toLocaleString()}
            </p>
          </div>
        )}

        <div className="border-t border-gray-400 pt-4 mt-8 text-[11px] text-gray-400 text-center font-mono font-semibold">
          Desarrollado por Universidad de Buenos Aires (UBA) – FFyB – FOUBA – CONICET – Dra. Wanda M. Valsecchi
        </div>
      </div>


      {/* STANDARD SITE INTERFACE - EXCLUDED ON PRINT OPERATION */}
      <div className="max-w-3xl mx-auto print:hidden">
        
        {/* Navigation control header row */}
        <div className="flex items-center justify-between gap-4 mb-6 bg-[#FFFDF9] border border-[#E69A5E]/10 p-4 rounded-2xl shadow-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs md:text-sm font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-3.5 py-2 rounded-xl transition-all min-h-[44px] cursor-pointer"
          >
            ⬅️ {t.back}
          </button>

          <h2 className="text-sm md:text-base font-black text-[#3E2A1F] truncate max-w-[200px] md:max-w-[400px]">
            📁 {getCategoryDisplayName()} / {ficha.title}
          </h2>

          <div className="flex gap-1.5 items-center">
            <ThemeToggle />
            <button
              onClick={onEdit}
              className="text-xs bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] p-2.5 rounded-xl font-bold transition-all min-h-[44px] cursor-pointer"
            >
              ✏️ {t.edit}
            </button>
            <button
              onClick={handleDeleteClick}
              className="text-xs bg-red-50 hover:bg-red-100 text-[#B95C2E] p-2.5 rounded-xl font-bold transition-all min-h-[44px] cursor-pointer"
            >
              🗑️ {t.delete}
            </button>
          </div>
        </div>

        {/* Main Ficha profile details */}
        <div className="bg-[#FFFDF9] border border-[#E69A5E]/15 rounded-3xl shadow-lg p-5 md:p-8 space-y-6">
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Left side, Image showcase */}
            {ficha.image ? (
              <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
                {annotatedBwDataUrl && (
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAnnotatedView(true)}
                      className={`flex-1 py-1 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        showAnnotatedView ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      📸 {category.type === 'zimografia' ? (language === 'es' ? 'B&N + Muestras' : 'B&W + Samples') : (language === 'es' ? 'B&N + Zonas' : 'B&W + Zones')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnnotatedView(false)}
                      className={`flex-1 py-1 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        !showAnnotatedView ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      🖼️ {language === 'es' ? 'Original' : 'Original'}
                    </button>
                  </div>
                )}

                <div 
                  ref={microContainerRef}
                  onMouseDown={handleMicroPanStart}
                  onMouseMove={handleMicroPanMove}
                  onMouseUp={handleMicroPanEnd}
                  onMouseLeave={handleMicroPanEnd}
                  onTouchStart={handleMicroPanStart}
                  onTouchMove={handleMicroPanMove}
                  onTouchEnd={handleMicroPanEnd}
                  className={`w-full h-auto max-h-[320px] md:max-h-[400px] rounded-2xl border border-[#E69A5E]/10 shadow-md relative overflow-auto bg-[#1a1412] shrink-0 select-none ${
                    microZoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  <img
                    src={(showAnnotatedView && annotatedBwDataUrl) ? annotatedBwDataUrl : ficha.image}
                    alt={ficha.title}
                    style={{
                      width: microZoom === 1 ? '100%' : `${100 * microZoom}%`,
                      minWidth: '100%',
                      maxWidth: microZoom === 1 ? '100%' : 'none',
                      maxHeight: microZoom === 1 ? '380px' : 'none',
                      transition: isPanning ? 'none' : 'width 0.15s ease-out'
                    }}
                    className={`h-auto object-contain ${microZoom === 1 ? 'mx-auto' : 'ml-0 mr-auto'}`}
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                </div>
                
                {/* Zoom control slider (only shown for microscopy & histology category) */}
                {(category.type === 'microscopy' || category.type === 'histology') && (
                  <div className="bg-amber-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-[#E69A5E]/15 flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      <span className="flex items-center gap-1">🔍 {language === 'es' ? 'Zoom de Imagen' : 'Image Zoom'}:</span>
                      <span className="font-mono">{Math.round(microZoom * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.1"
                        value={microZoom}
                        onChange={(e) => setMicroZoom(Number(e.target.value))}
                        className="flex-1 cursor-pointer accent-amber-600 h-1 bg-amber-200/50 rounded-lg appearance-none"
                      />
                      {microZoom > 1 && (
                        <button
                          onClick={() => setMicroZoom(1)}
                          className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-950/60 rounded text-amber-800 dark:text-amber-300 border border-amber-200 cursor-pointer"
                        >
                          ✕ Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Extra/Additional Images thumbnail panel (3.2) */}
                {ficha.extraImages && ficha.extraImages.length > 0 && (
                  <div className="bg-[#FFFDF9]/80 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-800/80 w-full space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">
                      🖼️ {language === 'es' ? 'Fotos adicionales' : 'Additional photos'} ({ficha.extraImages.length})
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {ficha.extraImages.map((extraImg, extraIdx) => (
                        <div 
                          key={extraIdx} 
                          onClick={() => setLightboxImage({ src: extraImg, index: extraIdx })}
                          className="aspect-square rounded-lg overflow-hidden border border-gray-150 bg-white relative shadow-2xs group/extra cursor-pointer block hover:ring-2 hover:ring-[#E69A5E]/50 transition-all"
                          title={language === 'es' ? 'Hacer clic para ver a tamaño completo' : 'Click to view full size'}
                        >
                          <img 
                            src={extraImg} 
                            alt={`Extra ${extraIdx + 1}`} 
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-200" 
                            referrerPolicy="no-referrer" 
                          />
                          <span className="absolute bottom-0.5 right-1 text-[8px] bg-black/60 text-white font-mono px-1 rounded">
                            #{extraIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
                <div className="w-full h-52 md:h-64 rounded-2xl bg-[#FFF3E0]/30 border border-dashed border-[#E69A5E]/20 flex flex-col items-center justify-center text-[#3E2A1F]/50 shadow-inner">
                  <span className="text-5xl block mb-2">📸</span>
                  <p className="text-xs font-bold">{language === 'es' ? 'Ficha sin imagen principal' : 'Sheet has no main photograph'}</p>
                </div>
                {/* Extra/Additional Images thumbnail panel if exists */}
                {ficha.extraImages && ficha.extraImages.length > 0 && (
                  <div className="bg-[#FFFDF9]/80 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-800/80 w-full space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">
                      🖼️ {language === 'es' ? 'Fotos adicionales' : 'Additional photos'} ({ficha.extraImages.length})
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {ficha.extraImages.map((extraImg, extraIdx) => (
                        <div 
                          key={extraIdx} 
                          onClick={() => setLightboxImage({ src: extraImg, index: extraIdx })}
                          className="aspect-square rounded-lg overflow-hidden border border-gray-150 bg-white relative shadow-2xs group/extra cursor-pointer block hover:ring-2 hover:ring-[#E69A5E]/50 transition-all"
                          title={language === 'es' ? 'Hacer clic para ver a tamaño completo' : 'Click to view full size'}
                        >
                          <img 
                            src={extraImg} 
                            alt={`Extra ${extraIdx + 1}`} 
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-200" 
                            referrerPolicy="no-referrer" 
                          />
                          <span className="absolute bottom-0.5 right-1 text-[8px] bg-black/60 text-white font-mono px-1 rounded">
                            #{extraIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right side, metadata sheet profiles */}
            <div className="flex-1 w-full space-y-4">
              <div className="border-b border-[#E69A5E]/10 pb-3">
                {/* Custom branded logo bar */}
                {(savedLogos.uba || savedLogos.conicet || savedLogos.ffyb || savedLogos.fouba) && (
                  <div className="flex gap-2.5 items-center mb-3 flex-wrap">
                    {savedLogos.uba && <img src={savedLogos.uba} alt="UBA Logo" className="h-8 w-auto max-w-[48px] object-contain rounded" referrerPolicy="no-referrer" />}
                    {savedLogos.conicet && <img src={savedLogos.conicet} alt="CONICET Logo" className="h-8 w-auto max-w-[70px] object-contain rounded" referrerPolicy="no-referrer" />}
                    {savedLogos.ffyb && <img src={savedLogos.ffyb} alt="FFyB Logo" className="h-8 w-auto max-w-[48px] object-contain rounded" referrerPolicy="no-referrer" />}
                    {savedLogos.fouba && <img src={savedLogos.fouba} alt="FOUBA Logo" className="h-8 w-auto max-w-[48px] object-contain rounded" referrerPolicy="no-referrer" />}
                  </div>
                )}
                <h3 className="text-xl md:text-2xl font-black text-[#3E2A1F] leading-tight mb-1">
                  {ficha.title}
                </h3>
                <span className="text-xs font-semibold text-gray-500 font-mono flex items-center gap-1.5 mt-1">
                  <span>📅 Creado:</span> 
                  <span className="font-bold font-mono text-[11px] bg-gray-100 px-1.5 rounded py-0.5">{new Date(ficha.dateCreated).toLocaleDateString()}</span>
                  <span>🧬 Corrida:</span> 
                  <span className="font-bold font-mono text-[11px] bg-[#E69A5E]/10 text-[#B95C2E] px-1.5 rounded py-0.5">{ficha.runDate}</span>
                </span>
              </div>

              {/* Dynamic properties listings depending on mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs text-[#3E2A1F]">
                {category.type === 'microscopy' && (
                  <div className="col-span-1 sm:col-span-2 space-y-4 w-full">
                    {/* 1. Observación Microscópica */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🔬 {language === 'es' ? 'Observación Microscópica' : 'Microscopical Observation'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{t.microorganismType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.microorganismType || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Aumento' : 'Magnification'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.magnification || 'N/A'}</span></p>
                        <p><strong>{t.morphology}:</strong> <span className="font-semibold text-gray-700">{getMorphologyDisplay(ficha.fields.morphology, ficha.fields.morphologies, ficha.fields.morphologyOther)}</span></p>
                        <p><strong>{t.grouping}:</strong> <span className="font-semibold text-gray-700">{getGroupingDisplay(ficha.fields.grouping, ficha.fields.groupingOther)}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Coloración' : 'Staining'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.coloration === 'other' ? `${language === 'es' ? 'Otra' : 'Other'} (${ficha.fields.colorationOther || ''})` : (ficha.fields.coloration || 'N/A')}</span></p>
                        <p className="sm:col-span-2"><strong>{t.stainAffinity}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.stainAffinity === 'other' ? `${language === 'es' ? 'Otra' : 'Other'} (${ficha.fields.stainAffinityOther || ''})` : (ficha.fields.stainAffinity === 'AAR' ? 'AAR (Ácido alcohol resistente)' : getStainAffinityDisplay(ficha.fields.stainAffinity))}</span></p>
                      </div>
                    </div>

                    {/* 2. Información de Cultivo */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🧫 {language === 'es' ? 'Información de Cultivo' : 'Cultivation Information'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Soporte' : 'Support'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.cultureSupport || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.cultureMedium || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Agente selector' : 'Selective Agent'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.selectiveAgent || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Temperatura' : 'Temperature'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.temperature || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Tiempo de incubación' : 'Incubation Time'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.incubationTime || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Condiciones atmosféricas' : 'Atmospheric Conditions'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.atmosphericConditions || 'N/A'}</span></p>
                      </div>
                    </div>

                    {/* 3. Morfología Macroscópica */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🔍 {language === 'es' ? 'Morfología Macroscópica de Colonia' : 'Colony Macroscopical Morphology'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Tamaño' : 'Size'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonySize || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Forma' : 'Shape'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyShape || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Transparencia' : 'Transparency'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyTransparency || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Brillo' : 'Brightness'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyBrightness || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Color' : 'Color'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyColor || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Textura' : 'Texture'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyTexture || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Consistencia' : 'Consistency'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyConsistency || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Crecimiento' : 'Growth'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.colonyGrowth === 'other' ? `${language === 'es' ? 'Otro' : 'Other'} (${ficha.fields.colonyGrowthOther || ''})` : (ficha.fields.colonyGrowth || 'N/A')}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {category.type === 'histology' && (
                  <div className="col-span-1 sm:col-span-2 space-y-4 w-full">
                    {/* 1. Datos del Espécimen */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🩺 {language === 'es' ? 'Datos del Espécimen' : 'Specimen Information'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Tipo de espécimen' : 'Specimen Type'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.specimenType === 'Otro' ? `${ficha.fields.specimenType} (${ficha.fields.specimenTypeOther || ''})` : (ficha.fields.specimenType || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Órgano / Tejido' : 'Organ / Tissue'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.organTissue === 'Otro' ? `${ficha.fields.organTissue} (${ficha.fields.organTissueOther || ''})` : (ficha.fields.organTissue || 'N/A')}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Textura' : 'Texture'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.texture === 'Otro' ? `${ficha.fields.texture} (${ficha.fields.textureOther || ''})` : (ficha.fields.texture || 'N/A')}</span></p>
                      </div>
                    </div>

                    {/* 2. Procesamiento Histológico */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🧪 {language === 'es' ? 'Procesamiento Histológico' : 'Histological Processing'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Fijación' : 'Fixation'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.fixation === 'Otro' ? `${ficha.fields.fixation} (${ficha.fields.fixationOther || ''})` : (ficha.fields.fixation || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Tiempo de fijación' : 'Fixation Time'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.fixationTime || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Inclusión' : 'Inclusion'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.inclusion === 'Otro' ? `${ficha.fields.inclusion} (${ficha.fields.inclusionOther || ''})` : (ficha.fields.inclusion || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Corte' : 'Sectioning'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sectioning === 'Otro' ? `${ficha.fields.sectioning} (${ficha.fields.sectioningOther || ''})` : (ficha.fields.sectioning || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Grosor de corte' : 'Section Thickness'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sectionThickness || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Tinción principal' : 'Main Stain'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.mainStain === 'Tinción especial' ? `${ficha.fields.mainStain} (${ficha.fields.mainStainOther || ''})` : (ficha.fields.mainStain || 'N/A')}</span></p>
                      </div>
                    </div>

                    {/* 3. Condiciones de Cultivo */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🧫 {language === 'es' ? 'Condiciones de Cultivo (si aplica)' : 'Cultivation Conditions (if applicable)'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Tipo de cultivo' : 'Culture Type'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoCultureType === 'Línea celular' || ficha.fields.histoCultureType === 'Otro' ? `${ficha.fields.histoCultureType} (${ficha.fields.histoCultureTypeOther || ''})` : (ficha.fields.histoCultureType || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Línea celular' : 'Cell Line'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoCellLine || 'N/A'}</span></p>
                        <p><strong>{language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoCultureMedium === 'Otro' ? `${ficha.fields.histoCultureMedium} (${ficha.fields.histoCultureMediumOther || ''})` : (ficha.fields.histoCultureMedium || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Tratamiento / Estímulo' : 'Treatment / Stimulus'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoTreatment || 'N/A'}</span></p>
                      </div>
                    </div>

                    {/* 4. Hallazgos Microscópicos */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-2">
                      <h4 className="font-bold text-[#B95C2E] text-xs uppercase tracking-wider pb-1 border-b border-[#E69A5E]/10">
                        🔬 {language === 'es' ? 'Hallazgos Microscópicos (Descriptivos)' : 'Microscopic Findings (Descriptive)'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><strong>{language === 'es' ? 'Morfología celular' : 'Cell Morphology'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoCellMorphology === 'Atípica' ? `${ficha.fields.histoCellMorphology} (${ficha.fields.histoCellMorphologyOther || ''})` : (ficha.fields.histoCellMorphology || 'N/A')}</span></p>
                        <p><strong>{language === 'es' ? 'Patrón de tinción' : 'Staining Pattern'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoStainingPattern || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Núcleo' : 'Nucleus'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoNucleus || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Citoplasma' : 'Cytoplasm'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoCytoplasm || 'N/A'}</span></p>
                        <p className="sm:col-span-2"><strong>{language === 'es' ? 'Membrana' : 'Membrane'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.histoMembrane || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {category.type === 'count' && (
                  <>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.microorganismType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.microorganismType || 'N/A'}</span></p>
                    <p className="col-span-1 sm:col-span-2 bg-amber-50/50 p-2 rounded-lg"><strong>{t.magnification}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.magnification || 'N/A'}</span></p>
                  </>
                )}

                {category.type === 'sds-page' && (
                  <>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.sampleType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sampleType || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.approxMw}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.approxMw || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.gelPercentage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.gelPercentage || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.glassThickness}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.glassThickness || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.voltage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.voltage || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.amperage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.amperage || 'N/A'}</span></p>
                    <p className="col-span-1 sm:col-span-2 bg-amber-50/50 p-2 rounded-lg"><strong>{t.runTime}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.runTime || 'N/A'}</span></p>
                  </>
                )}

                {category.type === 'adn' && (
                  <>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.sampleType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sampleType || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.fragmentSize}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.fragmentSize || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.agarosePercentage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.agarosePercentage || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.voltage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.voltage || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.amperage}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.amperage || 'N/A'}</span></p>
                    <p className="col-span-1 sm:col-span-2 bg-amber-50/50 p-2 rounded-lg"><strong>{t.runTime}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.runTime || 'N/A'}</span></p>
                  </>
                )}

                {category.type === 'custom' && (
                  <p className="col-span-1 sm:col-span-2 bg-amber-50/50 p-2 rounded-lg"><strong>{t.description}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.description || 'N/A'}</span></p>
                )}

                {(category.type === 'doi-analyzer' || category.type === 'densitometria' || category.type === 'zimografia') && (
                  <>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.sampleType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sampleType || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{language === 'es' ? 'Descripción' : 'Description'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.description || 'N/A'}</span></p>
                  </>
                )}

                {category.type === 'rgv-analyzer' && (
                  <>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{t.sampleType}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.sampleType || 'N/A'}</span></p>
                    <p className="bg-amber-50/50 p-2 rounded-lg"><strong>{language === 'es' ? 'Descripción RGV' : 'RGV Description'}:</strong> <span className="font-semibold text-gray-700">{ficha.fields.description || 'N/A'}</span></p>
                  </>
                )}
              </div>

              {/* General observations block */}
              {ficha.fields.observations && (
                <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-2xl text-xs">
                  <p className="font-bold text-[#E69A5E] mb-1">✍️ {t.observations}</p>
                  <p className="text-gray-700 italic leading-relaxed">{ficha.fields.observations}</p>
                </div>
              )}
            </div>

          </div>

          {/* ACTIVE ANALYSES SECTION (SHOWN ONLY IF LOGGED) */}
          
          {/* GEL ANALYSIS */}
          {ficha.gelAnalysis && (
            <div className="border-t border-[#E69A5E]/15 pt-5 space-y-4">
              <h4 className="font-black text-sm text-[#3E2A1F] flex items-center gap-1.5">
                <span>📊</span> {t.gelAnalysisResults}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {/* Equation Card */}
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col justify-center text-center min-h-[160px]">
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    {language === 'es' ? 'Modelo Calibrado (MW)' : 'Calibrated Model (MW)'}
                  </span>
                  {ficha.gelAnalysis.equation ? (
                    <>
                      <p className="font-mono text-xs font-extrabold text-blue-900 mt-1">{ficha.gelAnalysis.equation}</p>
                      <span className="text-[10px] text-gray-500 font-bold mt-1">R² = {ficha.gelAnalysis.r2.toFixed(4)}</span>
                    </>
                  ) : (
                    <p className="font-extrabold text-gray-400 mt-1">Estimación de Peso Molecular</p>
                  )}
                </div>

                {/* Calibration graph plot */}
                <div className="bg-[#FFFDF9] border border-gray-200 p-2 rounded-2xl flex flex-col items-center justify-center min-h-[160px] md:col-span-1 shadow-sm">
                  <span className="text-[9px] uppercase font-bold text-gray-400 mb-1">
                    {language === 'es' ? 'Gráfico Calibración (Rf vs log PM)' : 'Calibration Plot (Rf vs log MW)'}
                  </span>
                  <canvas
                    ref={gelReportCanvasRef}
                    width={480}
                    height={280}
                    className="w-full h-auto bg-transparent"
                  />
                </div>

                {/* Table bands lists */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-2 text-xs overflow-x-auto max-h-[260px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[9px] font-bold text-gray-400">
                        <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                        <th className="p-2">Rf</th>
                        <th className="p-2 text-right">{category.type === 'adn' ? (language === 'es' ? 'MW (pb)' : 'MW (bp)') : 'MW (kDa)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ficha.gelAnalysis.markers.map((b) => {
                        const sampleBands = ficha.gelAnalysis.markers.filter((m) => m.type === 'sample');
                        const sIdx = sampleBands.findIndex((m) => m.id === b.id) + 1;
                        return (
                          <tr key={b.id} className="hover:bg-gray-50/50">
                            <td className="p-2 flex items-center gap-1.5 font-bold text-gray-600">
                              <span className={`w-2 h-2 rounded-full ${b.type === 'marker' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              {b.type === 'marker'
                                ? (language === 'es' ? 'Marcador' : 'Marker')
                                : `${language === 'es' ? 'Banda problema' : 'Sample'} #${sIdx}`
                              }
                            </td>
                            <td className="p-2 font-mono text-[11px]">{b.rf.toFixed(3)}</td>
                            <td className="p-2 text-right font-mono font-bold text-gray-900">
                              {b.type === 'marker'
                                ? (b.mw ? `${b.mw} (${language === 'es' ? 'Conocido' : 'Known'})` : '-')
                                : (b.predictedMw ? `${b.predictedMw.toFixed(1)} (${language === 'es' ? 'Calculado' : 'Est.'})` : '-')
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DOI ANALYSIS DETAIL */}
          {ficha.doiAnalysis && (
            <div className="border-t border-[#E69A5E]/15 pt-5 space-y-4">
              <h4 className="font-black text-sm text-[#3E2A1F] flex items-center gap-1.5">
                <span>📊</span> {category.type === 'zimografia'
                  ? (language === 'es' ? 'Resultados de Zimografía' : 'Zymography Results')
                  : category.type === 'densitometria'
                  ? (language === 'es' ? 'Resultados de Densitometría' : 'Densitometry Results')
                  : (language === 'es' ? 'Resultados de Colorimetría RGV' : 'RGV Colorimetry Results')
                }
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {/* Calibration card */}
                {category.type !== 'zimografia' && (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col justify-center text-center min-h-[160px]">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      {language === 'es' ? 'Modelo de Cuantificación' : 'Quantification Model'}
                    </span>
                    <p className="font-mono text-xs font-extrabold text-indigo-900 mt-1">
                      {ficha.doiAnalysis.method === 'regression' 
                        ? (language === 'es' ? 'Regresión Lineal' : 'Linear Regression') 
                        : (language === 'es' ? 'Regla de tres (Área std)' : 'Rule of three (Std Area)')
                      }
                    </p>
                    {ficha.doiAnalysis.method === 'regression' && ficha.doiAnalysis.equation && (
                      <>
                        <p className="font-mono text-xs font-black text-blue-900 mt-1">
                          {formatDoiEquation(ficha.doiAnalysis.equation, category.type, language)}
                        </p>
                        {ficha.doiAnalysis.r2 !== undefined && ficha.doiAnalysis.r2 > 0 && (
                          <span className="text-[10px] text-gray-500 font-bold mt-1">R² = {ficha.doiAnalysis.r2.toFixed(4)}</span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Calibration graph plot */}
                {category.type !== 'zimografia' && (
                  <div className="bg-[#FFFDF9] border border-gray-200 p-2 rounded-2xl flex flex-col items-center justify-center min-h-[160px] md:col-span-1 shadow-sm">
                    <span className="text-[9px] uppercase font-bold text-gray-400 mb-1">
                      {language === 'es' ? 'Gráfico Calibración' : 'Calibration Plot'}
                    </span>
                    <canvas
                      ref={doiReportCanvasRef}
                      width={480}
                      height={280}
                      className="w-full h-auto bg-transparent"
                    />
                  </div>
                )}

                {/* Table zones list */}
                <div className={`${category.type === 'zimografia' ? 'md:col-span-4' : 'md:col-span-2'} bg-white rounded-2xl border border-gray-200 p-2 text-xs overflow-x-auto h-[260px] overflow-y-auto`}>
                  {category.type === 'densitometria' ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[9px] font-bold text-gray-400">
                          <th className="p-2">{language === 'es' ? 'Zona/Punto' : 'Zone/Point'}</th>
                          <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'DOI Bruto' : 'Raw IOD'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'DOI Neto' : 'Net IOD'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Masa (M)' : 'Mass (M)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(() => {
                          const bgZones = ficha.doiAnalysis.zones.filter(z => z.type === 'background');
                          const bgVal = bgZones.length > 0 ? bgZones.reduce((a, b) => a + b.intensity, 0) / bgZones.length : 0;
                          return ficha.doiAnalysis.zones.map((zone, idx) => {
                            const computedArea = zone.area ?? calculateGeometricArea(zone);
                            const computedMean = zone.meanIntensity ?? 0;
                            const rawDoi = zone.intensity;
                            const netDoi = Math.max(0, zone.intensity - bgVal);
                            const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                            const sIdx = samples.findIndex(z => z.id === zone.id) + 1;

                            return (
                              <tr key={zone.id} className="hover:bg-gray-50/50">
                                <td className="p-2 font-bold text-gray-700">{zone.label || `Zone ${idx + 1}`}</td>
                                <td className="p-2 flex items-center gap-1.5 font-bold text-gray-600">
                                  <span className={`w-2 h-2 rounded-full ${
                                    zone.type === 'standard' ? 'bg-[#8B5CF6]' : (zone.type === 'background' ? 'bg-slate-400' : 'bg-[#EF4444]')
                                  }`} />
                                  {zone.type === 'standard'
                                    ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
                                    : zone.type === 'background'
                                    ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                                    : `${language === 'es' ? 'Muestra Problema' : 'Sample'} #${sIdx}`
                                  }
                                </td>
                                <td className="p-2 text-right font-mono text-gray-600">{computedArea.toFixed(1)}</td>
                                <td className="p-2 text-right font-mono text-gray-600">{computedMean.toFixed(1)}</td>
                                <td className="p-2 text-right font-mono text-gray-600">{rawDoi.toFixed(0)}</td>
                                <td className="p-2 text-right font-mono text-gray-600">{zone.type === 'background' ? '-' : netDoi.toFixed(0)}</td>
                                <td className="p-2 text-right font-mono font-bold text-blue-900">
                                  {zone.type === 'standard'
                                    ? (zone.concentration !== undefined ? `${zone.concentration} (${language === 'es' ? 'Patrón' : 'Std'})` : '-')
                                    : zone.type === 'background'
                                    ? '-'
                                    : (zone.estimatedConcentration !== undefined ? `${zone.estimatedConcentration.toFixed(2)}` : '-')
                                  }
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  ) : category.type === 'zimografia' ? (
                    <div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[9px] font-bold text-gray-400">
                            <th className="p-2">{language === 'es' ? 'Zona/Punto' : 'Zone/Point'}</th>
                            <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                            <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                            <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                            <th className="p-2 text-right">{language === 'es' ? 'Int. Total' : 'Total Int.'}</th>
                            <th className="p-2 text-right">{language === 'es' ? 'Act. Relativa (%)' : 'Rel. Activity (%)'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ficha.doiAnalysis.zones.map((zone, idx) => {
                            const computedArea = zone.area ?? calculateGeometricArea(zone);
                            const computedMean = zone.meanIntensity ?? 0;
                            const computedTotal = zone.totalActivity ?? zone.intensity;
                            
                            const controlZone = ficha.doiAnalysis?.controlZoneId 
                              ? ficha.doiAnalysis.zones.find(z => z.id === ficha.doiAnalysis.controlZoneId)
                              : undefined;
                              
                            let relActivityStr = '-';
                            if (controlZone && controlZone.totalActivity) {
                              relActivityStr = ((computedTotal / controlZone.totalActivity) * 100).toFixed(1) + '%';
                            } else if (zone.type === 'background') {
                              relActivityStr = 'Blanco';
                            }

                            const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                            const sIdx = samples.findIndex(z => z.id === zone.id) + 1;

                            return (
                              <tr key={zone.id} className="hover:bg-gray-50/50">
                                <td className="p-2 font-bold text-gray-700">{zone.label || `Zone ${idx + 1}`}</td>
                                <td className="p-2 flex items-center gap-1.5 font-bold text-gray-600">
                                  <span className={`w-2 h-2 rounded-full ${
                                    zone.type === 'standard' ? 'bg-[#8B5CF6]' : (zone.type === 'background' ? 'bg-slate-400' : 'bg-[#EF4444]')
                                  }`} />
                                  {zone.type === 'standard'
                                    ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
                                    : zone.type === 'background'
                                    ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                                    : `${language === 'es' ? 'Muestra Problema' : 'Sample'} #${sIdx}`
                                  }
                                </td>
                                <td className="p-2 text-right font-mono text-gray-600">{computedArea.toFixed(1)}</td>
                                <td className="p-2 text-right font-mono text-gray-600">{computedMean.toFixed(1)}</td>
                                <td className="p-2 text-right font-mono text-gray-600">{computedTotal.toFixed(0)}</td>
                                <td className="p-2 text-right font-mono font-bold text-blue-900">{relActivityStr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Custom ratios / Cocientes Personalizados */}
                      {ficha.doiAnalysis.customRatios && ficha.doiAnalysis.customRatios.length > 0 && (
                        <div className="mt-4 bg-gray-50 border border-gray-150 rounded-xl p-3">
                          <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                            ⚖️ {language === 'es' ? 'Cocientes Personalizados Seleccionados' : 'Selected Custom Ratios'}
                          </h5>
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-gray-100/50 border-b border-gray-200 uppercase text-[8px] font-bold text-gray-400">
                                <th className="p-1.5">{language === 'es' ? 'Comparación' : 'Comparison'}</th>
                                <th className="p-1.5 text-right">{language === 'es' ? 'Valor Relativo / Cociente' : 'Relative Value / Ratio'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {ficha.doiAnalysis.customRatios.map((r) => {
                                const numZ = ficha.doiAnalysis?.zones.find(z => z.id === r.numId);
                                const denZ = ficha.doiAnalysis?.zones.find(z => z.id === r.denId);
                                if (!numZ || !denZ) return null;
                                const numVal = numZ.totalActivity ?? numZ.intensity;
                                const denVal = denZ.totalActivity ?? denZ.intensity;
                                const ratioVal = numVal / denVal;
                                return (
                                  <tr key={r.id} className="hover:bg-gray-100/30">
                                    <td className="p-1.5 font-bold text-gray-700">{numZ.label} / {denZ.label}</td>
                                    <td className="p-1.5 text-right font-mono font-black text-blue-900">{ratioVal.toFixed(4)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[9px] font-bold text-gray-400">
                          <th className="p-2">{language === 'es' ? 'Zona/Punto' : 'Zone/Point'}</th>
                          <th className="p-2">{language === 'es' ? 'Tipo' : 'Type'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Intensidad O.D.' : 'O.D. Intensity'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Conc. calculada' : 'Calcd Conc.'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {ficha.doiAnalysis.zones.map((zone, idx) => {
                          const samples = ficha.doiAnalysis?.zones.filter(z => z.type === 'sample') || [];
                          const sIdx = samples.findIndex(z => z.id === zone.id) + 1;
                          return (
                            <tr key={zone.id} className="hover:bg-gray-50/50">
                              <td className="p-2 font-bold text-gray-700">{zone.label || `Zone ${idx + 1}`}</td>
                              <td className="p-2 flex items-center gap-1.5 font-bold text-gray-600">
                                <span className={`w-2 h-2 rounded-full ${
                                  zone.type === 'standard' ? 'bg-[#8B5CF6]' : (zone.type === 'background' ? 'bg-slate-400' : 'bg-[#EF4444]')
                                }`} />
                                {zone.type === 'standard'
                                  ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
                                  : zone.type === 'background'
                                  ? (language === 'es' ? 'Blanco / Fondo' : 'Blank / Bg')
                                  : `${language === 'es' ? 'Muestra Problema' : 'Sample'} #${sIdx}`
                                }
                              </td>
                              <td className="p-2 text-right font-mono text-gray-600">{zone.intensity.toFixed(1)}</td>
                              <td className="p-2 text-right font-mono font-bold text-blue-900">
                                {zone.type === 'standard'
                                  ? (zone.concentration !== undefined ? `${zone.concentration} (Std)` : '-')
                                  : zone.type === 'background'
                                  ? '-'
                                  : (zone.estimatedConcentration !== undefined ? `${zone.estimatedConcentration.toFixed(2)}` : '-')
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MICROSCOPY COUNTING ANALYSIS */}
          {ficha.countAnalysis && (
            <div className="border-t border-[#E69A5E]/15 pt-5 space-y-4">
              <h4 className="font-black text-sm text-[#3E2A1F] flex items-center gap-1.5">
                <span>{ficha.countAnalysis.isUfcApp ? '🧫' : '🦟'}</span> {t.countAnalysisResults}
              </h4>

              {ficha.countAnalysis.isUfcApp ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Cultivo de placa breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-xs">
                    <p className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Parámetros del Ensayo de Placa' : 'Plate Assay Parameters'}
                    </p>
                    <div className="space-y-2 text-[11px] font-semibold text-gray-700">
                      <div className="flex justify-between p-2 bg-gray-50 rounded border border-gray-100">
                        <span>{language === 'es' ? 'Recuento Total de Colonias / Placas:' : 'Total Colonies / Plaques:'}</span>
                        <span className="font-mono font-bold text-gray-900 bg-white border px-1.5 rounded">{ficha.countAnalysis.markers.length}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded border border-gray-100">
                        <span>{language === 'es' ? 'Volumen Sembrado (ul):' : 'Seeded Volume (ul):'}</span>
                        <span className="font-mono font-bold text-[#B95C2E] bg-white border px-1.5 rounded">{ficha.countAnalysis.seededVolume} µL</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded border border-gray-100">
                        <span>{language === 'es' ? 'Factor de Dilución:' : 'Dilution Factor:'}</span>
                        <span className="font-mono font-bold text-blue-800 bg-white border px-1.5 rounded">10^(-{ficha.countAnalysis.dilutionExponent})</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated CFU/PFU results */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-200 p-5 flex flex-col justify-center items-center text-center shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-blue-800 tracking-widest mb-1.5">
                      {language === 'es' ? 'Concentración Calculada' : 'Calculated Concentration'}
                    </span>
                    <p className="font-mono text-2xl font-black text-blue-900 leading-none">
                      {ficha.countAnalysis.calculatedConcentration !== undefined
                        ? ficha.countAnalysis.calculatedConcentration.toExponential(4)
                        : '0'
                      }
                    </p>
                    <span className="text-xs font-black text-[#1E3A8A] mt-1 font-mono uppercase bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                      UFC/ml o UFP/ml
                    </span>
                    <p className="text-[10px] text-gray-400 mt-3 font-mono border-t border-blue-100 pt-2 w-full text-center">
                      {language === 'es' ? 'Cáculo: [Recuento × 1000 × 10^x] / Volumen (ul)' : 'Formula: [Count × 1000 × 10^x] / Volume (ul)'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Populations breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-3">
                    <p className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-2">Poblaciones Recuentos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ficha.countAnalysis.counts).map(([name, val]) => (
                        <div key={name} className="p-2 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-gray-600">{name}:</span>
                          <span className="font-mono font-bold text-gray-900 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-2xs">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cocientes ratios */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-2">Relaciones Calculadas</p>
                      <div className="space-y-1.5 font-mono">
                        {((ficha.countAnalysis.predefinedRatios || []).length > 0 || (ficha.countAnalysis.customRatios || []).length > 0) ? (
                          [...(ficha.countAnalysis.predefinedRatios || []), ...(ficha.countAnalysis.customRatios || []).map(r => ({ label: `${r.typeA} / ${r.typeB}`, value: r.value }))].map((item) => (
                            <div key={item.label} className="p-1.5 rounded-lg border border-gray-100 flex justify-between items-center text-[10px] md:text-xs">
                              <span className="text-gray-500 font-medium truncate max-w-[150px]">{item.label}:</span>
                              <span className="font-bold text-blue-800 bg-blue-50/50 px-2 rounded">{item.value.toFixed(2)}%</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400 text-xs italic">N/A</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sider operations and triggers */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#E69A5E]/10 justify-center">
            
            {/* Duplication button */}
            <button
              onClick={handleDuplicateClick}
              className="px-4 py-3 bg-white border border-[#E69A5E]/30 text-[#B95C2E] hover:bg-[#FFF3E0]/30 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm"
            >
              📋 {t.duplicate}
            </button>

            {/* Print trigger */}
            <button
              onClick={handlePrintClick}
              className="px-5 py-3 bg-white border border-[#E69A5E]/30 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm"
            >
              🖨️ {t.exportPdf}
            </button>

            {/* Specialized analysis canvas shortcuts */}
            {(category.type === 'sds-page' || category.type === 'adn') && ficha.image && (
              <button
                id="btn-trigger-gel-analyzer"
                onClick={onAnalyzeGel}
                className="px-6 py-3 bg-[#E69A5E] hover:bg-[#D48A4A] text-white rounded-xl font-black transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm shadow"
              >
                📊 {t.analyzeGel}
              </button>
            )}

            {category.type === 'count' && (
              <button
                id="btn-trigger-cell-counter"
                onClick={onCountCells}
                className="px-6 py-3 bg-[#E69A5E] hover:bg-[#D48A4A] text-white rounded-xl font-black transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm shadow"
              >
                🧮 {language === 'es' ? 'Realizar Recuento' : 'Perform Count'}
              </button>
            )}

            {(category.type === 'doi-analyzer' || category.type === 'densitometria' || category.type === 'zimografia') && ficha.image && (
              <button
                id="btn-trigger-doi-analyzer"
                onClick={onAnalyzeDoi}
                className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl font-black transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm shadow"
              >
                📊 {category.type === 'zimografia'
                     ? (language === 'es' ? 'Analizar Zimografía' : 'Analyze Zymography')
                     : category.type === 'densitometria'
                     ? (language === 'es' ? 'Analizar Densitometría' : 'Analyze Densitometry')
                     : (language === 'es' ? 'Analizar Colorimetría' : 'Analyze Colorimetry')
                   }
              </button>
            )}

            {category.type === 'rgv-analyzer' && (
              <button
                id="btn-trigger-multichannel-combiner"
                onClick={onCombineChannels}
                className="px-6 py-3 bg-[#EC4899] hover:bg-[#DB2777] text-white rounded-xl font-black transition-all flex items-center justify-center gap-1.5 min-h-[48px] active:scale-95 cursor-pointer text-xs md:text-sm shadow"
              >
                🌈 {language === 'es' ? 'Abrir MERGE Multicanal' : 'Open MERGE Multi-Channel'}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* 1. Custom safe Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-[#A12312] flex items-center justify-center gap-1.5 animate-pulse-subtle">
              <span>🗑️</span> {language === 'es' ? 'Eliminar Trabajo' : 'Delete Work'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {language === 'es' 
                ? `¿Estás seguro de que deseas eliminar permanentemente el trabajo "${ficha.title}"? Esta acción es irreversible.`
                : `Are you sure you want to permanently delete the job "${ficha.title}"? This action cannot be undone.`
              }
            </p>

            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(ficha.id);
                  setShowDeleteConfirm(false);
                }}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom safe Duplicate Method Criteria Modal Overlay */}
      {showDuplicateConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-[#3E2A1F] flex items-center justify-center gap-1.5">
              <span>📋</span> {language === 'es' ? 'Duplicar Trabajo' : 'Duplicate Work'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-normal">
              {language === 'es'
                ? '¿Quieres aplicar la fecha de corrida del día de hoy en la nueva copia o prefieres conservar la fecha original del trabajo?'
                : 'Do you want to apply today\'s date as the run date in the new copy or keep the original run date?'}
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDuplicate(ficha, true);
                  setShowDuplicateConfirm(false);
                }}
                className="text-xs bg-[#E69A5E] hover:bg-[#D48A4A] text-white px-5 py-3 rounded-xl transition-all font-black min-h-[44px] cursor-pointer shadow-sm"
              >
                📅 {language === 'es' ? 'Sí, usar fecha de hoy' : "Yes, use today's date"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDuplicate(ficha, false);
                  setShowDuplicateConfirm(false);
                }}
                className="text-xs bg-white border border-[#E69A5E]/35 text-[#B95C2E] hover:bg-[#FFF3E0]/30 px-5 py-3 rounded-xl transition-all font-bold min-h-[44px] cursor-pointer"
              >
                🧬 {language === 'es' ? 'No, conservar fecha original' : 'No, keep original date'}
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateConfirm(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-755 px-5 py-2.5 rounded-xl transition-all font-bold min-h-[38px] cursor-pointer mt-2"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Additional Images */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {/* Download/Save button with visual feedback */}
            <a
              href={lightboxImage.src}
              download={`imagen_adicional_${lightboxImage.index + 1}_${Date.now()}.png`}
              onClick={() => {
                setIsSavedLightbox(true);
                setTimeout(() => setIsSavedLightbox(false), 2000);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                isSavedLightbox
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white scale-105'
                  : 'bg-[#E69A5E] hover:bg-[#D48A4A] text-white'
              }`}
            >
              {isSavedLightbox ? (
                <>✅ {language === 'es' ? '¡Guardado!' : 'Saved!'}</>
              ) : (
                <>📥 {language === 'es' ? 'Guardar en Galería' : 'Save to Gallery'}</>
              )}
            </a>
            {/* Close button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/20 hover:bg-white/35 text-white rounded-full transition-colors cursor-pointer text-sm font-bold flex items-center justify-center w-9 h-9"
              title={language === 'es' ? 'Cerrar' : 'Close'}
            >
              ✕
            </button>
          </div>

          <div className="max-w-4xl max-h-[75vh] p-2 bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center mt-12">
            <img 
              src={lightboxImage.src} 
              alt={`Zoom Extra ${lightboxImage.index + 1}`} 
              className="max-w-full max-h-[70vh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-white font-bold text-xs">
              {language === 'es' ? `Imagen Adicional #${lightboxImage.index + 1}` : `Additional Image #${lightboxImage.index + 1}`}
            </p>
            <p className="text-white/60 text-[10px] mt-1">
              {language === 'es' ? 'Puedes descargar esta imagen directamente en tu dispositivo' : 'You can download this image directly to your device'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
