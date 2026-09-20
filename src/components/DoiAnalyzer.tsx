import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import * as XLSX from 'xlsx';
import { Ficha, DoiAnalysis, DoiZone, Language } from '../types';
import { translations } from '../translations';

interface DoiAnalyzerProps {
  language: Language;
  ficha: Ficha;
  onSaveAnalysis: (analysis: DoiAnalysis) => void;
  onBack: () => void;
  categoryType?: string;
}

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

interface SensitiveSliderProps {
  label: string;
  icon?: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (val: number) => void;
  colorClass?: string;
}

const SensitiveSlider: React.FC<SensitiveSliderProps> = ({
  label,
  icon,
  value,
  min,
  max,
  unit = 'px',
  onChange,
  colorClass = 'text-indigo-650 dark:text-indigo-400'
}) => {
  // Quadratic power mapping: gives >50% of the slider track to the lower 25% value range for high precision on small bands
  const clampedVal = Math.max(min, Math.min(max, Math.round(value)));
  const rangeSpan = Math.max(1, max - min);
  const normalized = Math.max(0, Math.min(1, (clampedVal - min) / rangeSpan));
  const sliderPos = Math.round(Math.sqrt(normalized) * 1000);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseInt(e.target.value, 10);
    const frac = pos / 1000;
    const computedVal = Math.round(min + Math.pow(frac, 2) * rangeSpan);
    onChange(Math.max(min, Math.min(max, computedVal)));
  };

  const handleStep = (delta: number) => {
    const next = Math.max(min, Math.min(max, clampedVal + delta));
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
        <span className="flex items-center gap-1">
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={clampedVal <= min}
            className="w-4 h-4 flex items-center justify-center rounded bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-[10px] font-black hover:bg-gray-300 active:scale-95 disabled:opacity-30 cursor-pointer transition-all"
            title="-1 px"
          >
            -
          </button>
          <span className={`font-mono ${colorClass} font-black min-w-[2.2rem] text-center`}>
            {clampedVal} {unit ? <span className="text-[8px] font-normal text-gray-400">{unit}</span> : ''}
          </span>
          <button
            type="button"
            onClick={() => handleStep(1)}
            disabled={clampedVal >= max}
            className="w-4 h-4 flex items-center justify-center rounded bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-[10px] font-black hover:bg-gray-300 active:scale-95 disabled:opacity-30 cursor-pointer transition-all"
            title="+1 px"
          >
            +
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        value={sliderPos}
        onChange={handleSliderChange}
        className="w-full accent-indigo-500 cursor-pointer h-1.5"
      />
    </div>
  );
};

export default function DoiAnalyzer({
  language,
  ficha,
  onSaveAnalysis,
  onBack,
  categoryType
}: DoiAnalyzerProps) {
  const t = translations[language];

  // Component states
  const [zones, setZones] = useState<DoiZone[]>(ficha.doiAnalysis?.zones || []);
  const [method, setMethod] = useState<'regression' | 'ratio'>(ficha.doiAnalysis?.method || 'regression');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showConcModal, setShowConcModal] = useState<boolean>(false);
  const [concInputVal, setConcInputVal] = useState<string>('10');
  const [pendingZone, setPendingZone] = useState<{ x: number, y: number, label: string } | null>(null);
  
  // Zimography relative activity state
  const [controlZoneId, setControlZoneId] = useState<string | null>(ficha.doiAnalysis?.controlZoneId || null);
  const [customRatios, setCustomRatios] = useState<{ id: string; numId: string; denId: string }[]>(ficha.doiAnalysis?.customRatios || []);
  const [zimoBgPixel, setZimoBgPixel] = useState<number | null>(
    categoryType === 'zimografia' && ficha.doiAnalysis?.zimoBgPixel !== undefined
      ? ficha.doiAnalysis.zimoBgPixel
      : null
  );
  const [isSelectingZimoBg, setIsSelectingZimoBg] = useState<boolean>(false);
  
  // Settings
  const [activeType, setActiveType] = useState<'standard' | 'sample' | 'background'>('standard');
  const [globalRadius, setGlobalRadius] = useState<number>(
    ficha.doiAnalysis?.zones && ficha.doiAnalysis.zones[0]?.radius !== undefined
      ? ficha.doiAnalysis.zones[0].radius
      : 18
  );
  const [globalRadiusX, setGlobalRadiusX] = useState<number>(
    ficha.doiAnalysis?.zones && ficha.doiAnalysis.zones[0]?.radiusX !== undefined
      ? ficha.doiAnalysis.zones[0].radiusX
      : 24
  );
  const [globalRadiusY, setGlobalRadiusY] = useState<number>(
    ficha.doiAnalysis?.zones && ficha.doiAnalysis.zones[0]?.radiusY !== undefined
      ? ficha.doiAnalysis.zones[0].radiusY
      : 18
  );
  const [isDarkOnLight, setIsDarkOnLight] = useState<boolean>(
    categoryType === 'zimografia' ? false : true
  ); // dark spots on light background by default, light spots for zymo
  const [colorChannel, setColorChannel] = useState<'color' | 'gray' | 'red' | 'green' | 'blue'>(
    categoryType === 'densitometria' || categoryType === 'zimografia' ? 'gray' : 'color'
  );
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100% to 200%
  const [originalImgObj, setOriginalImgObj] = useState<HTMLImageElement | null>(null);
  const [processedImgSrc, setProcessedImgSrc] = useState<string>('');
  const [contrast, setContrast] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);
  const [bypassEnhancements, setBypassEnhancements] = useState<boolean>(false);
  
  // Selected zone pointer for quick editing
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  // Dragging states
  const [isDraggingZoneId, setIsDraggingZoneId] = useState<string | null>(null);

  const [selectedShape, setSelectedShape] = useState<'ellipse' | 'rectangle' | 'trapezoid' | 'triangle' | 'rhombus'>('ellipse');
  const [quantificationMode, setQuantificationMode] = useState<'zimografia' | 'densitometria'>(
    categoryType === 'zimografia' ? 'zimografia' : 'densitometria'
  );

  const handleQuantificationModeChange = (mode: 'zimografia' | 'densitometria') => {
    setQuantificationMode(mode);
    const newIsDarkOnLight = (mode === 'densitometria');
    setIsDarkOnLight(newIsDarkOnLight);
    if (!imgRef.current) return;
    setZones(prev => {
      const updated = prev.map(z => {
        const metrics = calculateDoiValue(
          imgRef.current!, 
          z.x, 
          z.y, 
          z, 
          newIsDarkOnLight
        );
        return { 
          ...z, 
          intensity: metrics.intensity,
          meanIntensity: metrics.meanIntensity,
          totalActivity: metrics.totalActivity,
          area: calculateGeometricArea(z)
        };
      });
      return solveQuantification(updated, method);
    });
  };

  const updateSelectedZoneProps = (props: Partial<DoiZone>) => {
    if (!selectedZoneId || !imgRef.current) return;

    const isDimensionChange = Object.keys(props).some(k => 
      ['width', 'height', 'rotation', 'radius', 'radiusX', 'radiusY', 'baseTop', 'baseBottom', 'base', 'diagMajor', 'diagMinor'].includes(k)
    );

    setZones(prev => {
      const updated = prev.map(z => {
        if (z.id === selectedZoneId || (categoryType === 'densitometria' && isDimensionChange)) {
          const merged = { ...z, ...props };
          const metrics = calculateDoiValue(
            imgRef.current!, 
            merged.x, 
            merged.y, 
            merged, 
            isDarkOnLight
          );
          return { 
            ...merged, 
            intensity: metrics.intensity,
            meanIntensity: metrics.meanIntensity,
            totalActivity: metrics.totalActivity,
            area: calculateGeometricArea(merged)
          };
        }
        return z;
      });
      return solveQuantification(updated, method);
    });
  };

  const handleShapeChange = (sh: 'ellipse' | 'rectangle' | 'trapezoid' | 'triangle' | 'rhombus') => {
    setSelectedShape(sh);
    if (categoryType === 'densitometria') {
      setZones(prev => {
        const updated = prev.map(z => {
          const merged = { ...z, shape: sh };
          if (!imgRef.current) return merged;
          const metrics = calculateDoiValue(
            imgRef.current, 
            merged.x, 
            merged.y, 
            merged, 
            isDarkOnLight
          );
          return { 
            ...merged, 
            intensity: metrics.intensity,
            meanIntensity: metrics.meanIntensity,
            totalActivity: metrics.totalActivity,
            area: calculateGeometricArea(merged)
          };
        });
        return solveQuantification(updated, method);
      });
    } else if (selectedZoneId) {
      // In Zimografía or general mode: if a zone is selected, update its shape immediately
      setZones(prev => {
        const updated = prev.map(z => {
          if (z.id === selectedZoneId) {
            const merged = { ...z, shape: sh };
            if (!imgRef.current) return merged;
            const metrics = calculateDoiValue(
              imgRef.current, 
              merged.x, 
              merged.y, 
              merged, 
              isDarkOnLight
            );
            return { 
              ...merged, 
              intensity: metrics.intensity,
              meanIntensity: metrics.meanIntensity,
              totalActivity: metrics.totalActivity,
              area: calculateGeometricArea(merged)
            };
          }
          return z;
        });
        return solveQuantification(updated, method);
      });
    }
  };

  // Image references for pixel analysis
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persistent interval and delay timers for continuous hold-to-move feature
  const nudgeTimerRef = useRef<any>(null);
  const nudgeTimeoutRef = useRef<any>(null);

  const nudgeZone = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (!selectedZoneId || !imgRef.current) return;
    setZones(prev => {
      const updated = prev.map(z => {
        if (z.id === selectedZoneId) {
          const step = 0.002; // smooth but noticeable movement
          let nextX = z.x;
          let nextY = z.y;
          if (dir === 'left') nextX = Math.max(0, z.x - step);
          if (dir === 'right') nextX = Math.min(1, z.x + step);
          if (dir === 'up') nextY = Math.max(0, z.y - step);
          if (dir === 'down') nextY = Math.min(1, z.y + step);

          const metrics = calculateDoiValue(imgRef.current!, nextX, nextY, z, isDarkOnLight);
          return {
            ...z,
            x: nextX,
            y: nextY,
            intensity: metrics.intensity,
            meanIntensity: metrics.meanIntensity,
            totalActivity: metrics.totalActivity,
            area: calculateGeometricArea(z)
          };
        }
        return z;
      });
      return solveQuantification(updated, method);
    });
  };

  const startNudging = (dir: 'left' | 'right' | 'up' | 'down') => {
    // Stop any existing intervals first
    stopNudging();

    // Trigger immediately on click/press
    nudgeZone(dir);

    // After 250ms of holding, begin rapid nudging
    nudgeTimeoutRef.current = setTimeout(() => {
      nudgeTimerRef.current = setInterval(() => {
        nudgeZone(dir);
      }, 50);
    }, 250);
  };

  const stopNudging = () => {
    if (nudgeTimerRef.current) {
      clearInterval(nudgeTimerRef.current);
      nudgeTimerRef.current = null;
    }
    if (nudgeTimeoutRef.current) {
      clearTimeout(nudgeTimeoutRef.current);
      nudgeTimeoutRef.current = null;
    }
  };

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current);
      if (nudgeTimeoutRef.current) clearTimeout(nudgeTimeoutRef.current);
    };
  }, []);

  // Load original image
  useEffect(() => {
    if (!ficha.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      setOriginalImgObj(img);
    };
    img.src = ficha.image;
  }, [ficha.image]);

  // Process image based on channel/contrast/brightness/bypass
  useEffect(() => {
    if (!originalImgObj) return;
    const canvas = document.createElement('canvas');
    canvas.width = originalImgObj.naturalWidth || 800;
    canvas.height = originalImgObj.naturalHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!bypassEnhancements) {
      ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(originalImgObj, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Apply color channel filters
    if (colorChannel !== 'color') {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (colorChannel === 'red') {
            data[i] = r;
            data[i + 1] = r;
            data[i + 2] = r;
          } else if (colorChannel === 'green') {
            data[i] = g;
            data[i + 1] = g;
            data[i + 2] = g;
          } else if (colorChannel === 'blue') {
            data[i] = b;
            data[i + 1] = b;
            data[i + 2] = b;
          } else if (colorChannel === 'gray') {
            const grayVal = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            data[i] = grayVal;
            data[i + 1] = grayVal;
            data[i + 2] = grayVal;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.error('Error filtering image in DoiAnalyzer:', err);
      }
    }
    setProcessedImgSrc(canvas.toDataURL('image/png'));
  }, [originalImgObj, colorChannel, contrast, brightness, bypassEnhancements]);

  // Trigger recalculations on mount or image load
  useEffect(() => {
    if (imageLoaded && imgRef.current) {
      recalculateAllDoi(zones, globalRadius, isDarkOnLight, globalRadiusX, globalRadiusY);
    }
  }, [imageLoaded, isDarkOnLight, colorChannel, contrast, brightness, bypassEnhancements, globalRadius, globalRadiusX, globalRadiusY, zimoBgPixel]);

  // Effect to paint trendline graph
  useEffect(() => {
    if (trendCanvasRef.current) {
      drawDoiTrendline(trendCanvasRef.current);
    }
  }, [zones, method, imageLoaded]);

  const drawDoiTrendline = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = 42;

    // Background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#3E2A1F';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(pad, pad - 10);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(w - pad + 15, h - pad);
    ctx.stroke();

    // Axis titles
    ctx.fillStyle = '#3E2A1F';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    
    // X axis (Concentration or Mass)
    ctx.fillText(categoryType === 'densitometria'
      ? (language === 'es' ? 'Masa (M)' : 'Mass (M)')
      : (language === 'es' ? 'Concentración (C)' : 'Concentration (C)'),
      w / 2, h - 8
    );

    // Get standards & samples & background
    const bgVal = getAverageBackground(zones);
    const standards = zones.filter(z => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
    const samples = zones.filter(z => z.type === 'sample');

    // Y axis (DOI / IOD)
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    const yAxisLabel = language === 'es' 
      ? (bgVal > 0 ? 'DOI Neto' : 'DOI (Densidad Óptica Integrada)')
      : (bgVal > 0 ? 'Net IOD' : 'IOD (Integrated Optical Density)');
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    if (standards.length === 0) {
      // Draw empty placeholder text
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Faltan datos de calibración' : 'No calibration data', w / 2, h / 2);
      return;
    }

    // Find min and max values for mapping using background-subtracted net DOI
    const allX = [...standards.map(s => s.concentration!), ...samples.map(s => s.estimatedConcentration || 0)];
    const allY = [
      ...standards.map(s => Math.max(0, s.intensity - bgVal)),
      ...samples.map(s => Math.max(0, s.intensity - bgVal))
    ];

    const maxX = Math.max(...allX, 10) * 1.15;
    const minX = 0;
    const maxY = Math.max(...allY, 10) * 1.15;
    const minY = 0;

    const mapX = (xVal: number) => pad + ((xVal - minX) / (maxX - minX)) * (w - 2 * pad + 15);
    const mapY = (yVal: number) => h - pad - ((yVal - minY) / (maxY - minY)) * (h - 2 * pad + 10);

    // 1. Draw gridlines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    for (let i = 1; i <= 4; i++) {
      const gridX = minX + (maxX - minX) * (i / 4);
      const gridY = minY + (maxY - minY) * (i / 4);
      
      // Vertical gridline
      ctx.beginPath();
      ctx.moveTo(mapX(gridX), pad - 10);
      ctx.lineTo(mapX(gridX), h - pad);
      ctx.stroke();

      // Horizontal gridline
      ctx.beginPath();
      ctx.moveTo(pad, mapY(gridY));
      ctx.lineTo(w - pad + 15, mapY(gridY));
      ctx.stroke();

      // Axis ticks / values
      ctx.fillStyle = '#64748B';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(gridX.toFixed(1), mapX(gridX), h - pad + 10);

      ctx.textAlign = 'right';
      ctx.fillText(gridY.toFixed(0), pad - 4, mapY(gridY) + 2);
    }
    ctx.setLineDash([]);

    // 2. Draw Regression Line or Rule-of-three Line
    const reg = getRegressionMetrics();
    if (method === 'regression' && reg) {
      // y (intensity) = slope * x (concentration) + intercept
      ctx.strokeStyle = '#4F46E5'; // Indigo
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(reg.intercept));
      ctx.lineTo(mapX(maxX), mapY(reg.slope * maxX + reg.intercept));
      ctx.stroke();
    } else if (method === 'ratio') {
      const rt = getRuleOfThreeMetrics();
      if (rt && rt.ratio > 0) {
        // Conc = intensity * ratio => intensity = Conc / ratio
        const slope = 1 / rt.ratio;
        ctx.strokeStyle = '#059669'; // Emerald
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mapX(0), mapY(0));
        ctx.lineTo(mapX(maxX), mapY(slope * maxX));
        ctx.stroke();
      }
    }

    // 3. Plot standards (purple points)
    standards.forEach(s => {
      const sx = mapX(s.concentration!);
      const sy = mapY(Math.max(0, s.intensity - bgVal));

      ctx.fillStyle = '#8B5CF6'; 
      ctx.strokeStyle = '#4C1D95'; 
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // standard label
      ctx.fillStyle = '#4C1D95';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(` ${s.label}`, sx + 4, sy + 2);
    });

    // 4. Plot samples (red points)
    samples.forEach(s => {
      if (s.estimatedConcentration !== undefined) {
        const sx = mapX(s.estimatedConcentration);
        const sy = mapY(Math.max(0, s.intensity - bgVal));

        ctx.fillStyle = '#EF4444'; 
        ctx.strokeStyle = '#7F1D1D'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // sample label
        ctx.fillStyle = '#7F1D1D';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${s.label} `, sx - 4, sy + 2);
      }
    });
  };

  const getAnalysisExportData = () => {
    const analysisName = categoryType === 'zimografia'
      ? (language === 'es' ? 'Zimografía' : 'Zymography')
      : categoryType === 'densitometria'
      ? (language === 'es' ? 'Densitometría' : 'Densitometry')
      : (language === 'es' ? 'Colorimetría RGV' : 'RGV Colorimetry');

    const prefix = categoryType === 'zimografia' ? 'ZIMO' : categoryType === 'densitometria' ? 'DENSI' : 'RGV';
    const fileBaseName = `${prefix}_Analisis_${ficha.title.replace(/\s+/g, '_')}`;

    const metaRows: [string, string][] = [];
    metaRows.push([language === 'es' ? 'Ficha / Muestra' : 'Sheet / Sample', ficha.title]);
    metaRows.push([language === 'es' ? 'Fecha de Análisis' : 'Analysis Date', new Date().toLocaleString()]);

    const bgVal = getAverageBackground(zones);

    if (categoryType !== 'zimografia') {
      metaRows.push([
        language === 'es' ? 'Método de Cuantificación' : 'Quantification Method',
        method === 'regression'
          ? (language === 'es' ? 'Regresión Lineal' : 'Linear Regression')
          : (language === 'es' ? 'Regla de tres' : 'Rule of Three')
      ]);
      const reg = getRegressionMetrics();
      if (method === 'regression' && reg) {
        metaRows.push([language === 'es' ? 'Ecuación de Calibración' : 'Calibration Equation', reg.equation]);
        metaRows.push([language === 'es' ? 'Coeficiente R²' : 'R² Coefficient', reg.r2.toFixed(4)]);
      }
      if (bgVal > 0) {
        metaRows.push([
          language === 'es' ? 'Intensidad Promedio Fondo/Blanco' : 'Average Background Intensity',
          bgVal.toFixed(1)
        ]);
      }
    } else {
      const controlZone = zones.find(z => z.id === controlZoneId);
      if (controlZone) {
        metaRows.push([
          language === 'es' ? 'Banda de Control de Referencia' : 'Reference Control Band',
          controlZone.label
        ]);
      }
      if (zimoBgPixel !== undefined && zimoBgPixel !== null && zimoBgPixel > 0) {
        metaRows.push([
          language === 'es' ? 'Valor de Fondo Restado' : 'Subtracted Background Value',
          zimoBgPixel.toString()
        ]);
      }
    }

    let mainTableHeaders: string[] = [];
    let mainTableRows: (string | number)[][] = [];
    let customRatioHeaders: string[] = [];
    let customRatioRows: (string | number)[][] = [];

    if (categoryType === 'densitometria') {
      mainTableHeaders = language === 'es'
        ? ['Zona', 'Tipo de Punto', 'Área (px²)', 'Int. Media', 'DOI Bruto', 'DOI Neto', 'Masa Conocida (Patrón)', 'Masa Estimada (Muestra)']
        : ['Zone', 'Point Type', 'Area (px²)', 'Mean Int.', 'Raw IOD', 'Net IOD', 'Known Mass (Standard)', 'Estimated Mass (Sample)'];

      mainTableRows = zones.map(z => {
        const samples = zones.filter(item => item.type === 'sample');
        const sIdx = samples.findIndex(item => item.id === z.id) + 1;
        const typeStr = z.type === 'standard'
          ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
          : z.type === 'background'
          ? (language === 'es' ? 'Fondo/Blanco' : 'Blank / Background')
          : `${language === 'es' ? 'Muestra' : 'Sample'} #${sIdx}`;

        const computedArea = z.area ?? calculateGeometricArea(z);
        const computedMean = z.meanIntensity ?? 0;
        const rawDoi = z.intensity;
        const netDoi = Math.max(0, z.intensity - bgVal);

        const knownMass = z.type === 'standard' ? (z.concentration ?? '-') : '-';
        const estMass = z.type === 'sample' ? (z.estimatedConcentration !== undefined ? z.estimatedConcentration.toFixed(2) : '-') : '-';

        return [
          z.label,
          typeStr,
          parseFloat(computedArea.toFixed(1)),
          parseFloat(computedMean.toFixed(1)),
          Math.round(rawDoi),
          z.type === 'background' ? '-' : Math.round(netDoi),
          knownMass,
          estMass
        ];
      });
    } else if (categoryType === 'zimografia') {
      mainTableHeaders = language === 'es'
        ? ['Zona', 'Tipo de Punto', 'Área (px²)', 'Int. Media', 'Int. Total', 'Actividad Relativa (%)']
        : ['Zone', 'Point Type', 'Area (px²)', 'Mean Int.', 'Total Int.', 'Relative Activity (%)'];

      const controlZone = zones.find(z => z.id === controlZoneId);

      mainTableRows = zones.map(z => {
        const samples = zones.filter(item => item.type === 'sample');
        const sIdx = samples.findIndex(item => item.id === z.id) + 1;
        const typeStr = z.type === 'standard'
          ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
          : z.type === 'background'
          ? (language === 'es' ? 'Fondo/Blanco' : 'Blank / Background')
          : `${language === 'es' ? 'Muestra' : 'Sample'} #${sIdx}`;

        const computedArea = z.area ?? calculateGeometricArea(z);
        const computedMean = z.meanIntensity ?? 0;
        const computedTotal = z.totalActivity ?? z.intensity;

        let relActivityStr = '-';
        if (controlZone && controlZone.totalActivity) {
          relActivityStr = ((computedTotal / controlZone.totalActivity) * 100).toFixed(1) + '%';
        } else if (z.type === 'background') {
          relActivityStr = language === 'es' ? 'Blanco' : 'Blank';
        }

        return [
          z.label,
          typeStr,
          parseFloat(computedArea.toFixed(1)),
          parseFloat(computedMean.toFixed(1)),
          Math.round(computedTotal),
          relActivityStr
        ];
      });

      if (customRatios.length > 0) {
        customRatioHeaders = language === 'es'
          ? ['Comparación (Numerador / Denominador)', 'Cociente / Valor Relativo']
          : ['Comparison (Numerator / Denominator)', 'Relative Value / Ratio'];

        customRatioRows = customRatios.map(r => {
          const numZ = zones.find(z => z.id === r.numId);
          const denZ = zones.find(z => z.id === r.denId);
          if (!numZ || !denZ) return ['', ''];
          const numVal = numZ.totalActivity ?? numZ.intensity;
          const denVal = denZ.totalActivity ?? denZ.intensity;
          const ratioVal = numVal / denVal;
          return [`${numZ.label} / ${denZ.label}`, parseFloat(ratioVal.toFixed(4))];
        }).filter(row => row[0] !== '');
      }
    } else {
      // Colorimetría RGV
      mainTableHeaders = language === 'es'
        ? ['Zona', 'Tipo de Punto', 'DOI Bruto', 'DOI Neto', 'Concentración Conocida (Patrón)', 'Concentración Estimada (Muestra)']
        : ['Zone', 'Point Type', 'Raw IOD', 'Net IOD', 'Known Concentration (Standard)', 'Estimated Concentration (Sample)'];

      mainTableRows = zones.map(z => {
        const samples = zones.filter(item => item.type === 'sample');
        const sIdx = samples.findIndex(item => item.id === z.id) + 1;
        const typeStr = z.type === 'standard'
          ? (language === 'es' ? 'Patrón Referencia' : 'Reference Standard')
          : z.type === 'background'
          ? (language === 'es' ? 'Fondo/Blanco' : 'Blank / Background')
          : `${language === 'es' ? 'Muestra' : 'Sample'} #${sIdx}`;

        const rawDoi = z.intensity;
        const netDoi = Math.max(0, z.intensity - bgVal);
        const knownConc = z.type === 'standard' ? (z.concentration ?? '-') : '-';
        const estConc = z.type === 'sample' ? (z.estimatedConcentration !== undefined ? z.estimatedConcentration.toFixed(2) : '-') : '-';

        return [
          z.label,
          typeStr,
          Math.round(rawDoi),
          z.type === 'background' ? '-' : Math.round(netDoi),
          knownConc,
          estConc
        ];
      });
    }

    return {
      analysisName,
      fileBaseName,
      metaRows,
      mainTableHeaders,
      mainTableRows,
      customRatioHeaders,
      customRatioRows
    };
  };

  const handleExportExcel = () => {
    const data = getAnalysisExportData();
    const aoa: any[][] = [];

    // Title & metadata
    aoa.push([`${data.analysisName} - Ficha: ${ficha.title}`]);
    data.metaRows.forEach(row => aoa.push([row[0], row[1]]));
    aoa.push([]); // blank line

    // Main Table
    aoa.push(data.mainTableHeaders);
    data.mainTableRows.forEach(row => aoa.push(row));

    // Custom ratios (if present)
    if (data.customRatioRows.length > 0) {
      aoa.push([]);
      aoa.push([language === 'es' ? 'Cocientes Personalizados Seleccionados' : 'Selected Custom Ratios']);
      aoa.push(data.customRatioHeaders);
      data.customRatioRows.forEach(row => aoa.push(row));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, language === 'es' ? 'Análisis' : 'Analysis');
    XLSX.writeFile(wb, `${data.fileBaseName}.xlsx`);
  };

  const handleExportCSV = () => {
    const data = getAnalysisExportData();
    let csv = '';

    csv += `"${data.analysisName} - Ficha: ${ficha.title}"\n`;
    data.metaRows.forEach(row => {
      csv += `"${row[0]}";"${row[1]}"\n`;
    });
    csv += `\n`;

    csv += data.mainTableHeaders.map(h => `"${h}"`).join(';') + '\n';
    data.mainTableRows.forEach(row => {
      csv += row.map(c => `"${c}"`).join(';') + '\n';
    });

    if (data.customRatioRows.length > 0) {
      csv += `\n"${language === 'es' ? 'Cocientes Personalizados Seleccionados' : 'Selected Custom Ratios'}"\n`;
      csv += data.customRatioHeaders.map(h => `"${h}"`).join(';') + '\n';
      data.customRatioRows.forEach(row => {
        csv += row.map(c => `"${c}"`).join(';') + '\n';
      });
    }

    // Add UTF-8 BOM for Excel Spanish compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.fileBaseName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recalculates IOD for all zones and returns the updated array
  const recalculateAllDoi = (
    currentZones: DoiZone[],
    radius: number,
    darkOnLight: boolean,
    radiusX?: number,
    radiusY?: number
  ) => {
    if (!imgRef.current || !imageLoaded) return;
    const imgObj = imgRef.current;

    const isColorimetry = categoryType === 'doi-analyzer';

    const updated = currentZones.map((z) => {
      // In colorimetry, all circles update dynamically to the new aperture radius
      const targetRadius = isColorimetry ? radius : (z.radius !== undefined ? z.radius : radius);
      const targetWidth = isColorimetry ? radius * 2 : (z.width !== undefined ? z.width : (radiusX !== undefined ? radiusX * 2 : targetRadius * 2));
      const targetHeight = isColorimetry ? radius * 2 : (z.height !== undefined ? z.height : (radiusY !== undefined ? radiusY * 2 : targetRadius * 2));
      const targetRx = isColorimetry ? radius : (z.radiusX !== undefined ? z.radiusX : targetRadius);
      const targetRy = isColorimetry ? radius : (z.radiusY !== undefined ? z.radiusY : targetRadius);

      const updatedZ: DoiZone = {
        ...z,
        radius: targetRadius,
        width: targetWidth,
        height: targetHeight,
        radiusX: targetRx,
        radiusY: targetRy,
      };

      const metrics = calculateDoiValue(imgObj, z.x, z.y, updatedZ, darkOnLight);
      return {
        ...updatedZ,
        intensity: metrics.intensity,
        meanIntensity: metrics.meanIntensity,
        totalActivity: metrics.totalActivity,
        area: calculateGeometricArea(updatedZ),
        label: z.label
      };
    });

    // Solve concentrations using current state
    const solved = solveQuantification(updated, method);
    setZones(solved);
  };

  // Helper inside click handler to compute pixel-exact integration
  const calculateDoiValue = (
    imgObj: HTMLImageElement,
    xFrac: number,
    yFrac: number,
    radiusOrZone: number | Partial<DoiZone>,
    darkOnLight: boolean,
    radiusX?: number,
    radiusY?: number
  ): { intensity: number; meanIntensity: number; totalActivity: number } => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = imgObj.naturalWidth;
    canvas.height = imgObj.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { intensity: 0, meanIntensity: 0, totalActivity: 0 };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!bypassEnhancements) {
      ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(imgObj, 0, 0);
    ctx.filter = 'none';

    const px = Math.round(xFrac * canvas.width);
    const py = Math.round(yFrac * canvas.height);

    let shape: 'ellipse' | 'rectangle' | 'trapezoid' | 'triangle' | 'rhombus' = 'ellipse';
    let width = 50;
    let height = 50;
    let baseTop = 30;
    let baseBottom = 50;
    let base = 50;
    let diagMajor = 60;
    let diagMinor = 40;

    if (typeof radiusOrZone === 'object' && radiusOrZone !== null) {
      shape = radiusOrZone.shape || 'ellipse';
      width = radiusOrZone.width !== undefined ? radiusOrZone.width : (radiusOrZone.radiusX !== undefined ? radiusOrZone.radiusX * 2 : (radiusOrZone.radius ? radiusOrZone.radius * 2 : 50));
      height = radiusOrZone.height !== undefined ? radiusOrZone.height : (radiusOrZone.radiusY !== undefined ? radiusOrZone.radiusY * 2 : (radiusOrZone.radius ? radiusOrZone.radius * 2 : 50));
      baseTop = radiusOrZone.baseTop || 30;
      baseBottom = radiusOrZone.baseBottom || 50;
      base = radiusOrZone.base || 50;
      diagMajor = radiusOrZone.diagMajor || 60;
      diagMinor = radiusOrZone.diagMinor || 40;
    } else {
      const r = typeof radiusOrZone === 'number' ? radiusOrZone : 18;
      const rx = radiusX !== undefined ? radiusX : r;
      const ry = radiusY !== undefined ? radiusY : r;
      shape = 'ellipse';
      width = rx * 2;
      height = ry * 2;
    }

    let rx = 0;
    let ry = 0;

    if (shape === 'ellipse' || shape === 'rectangle') {
      rx = Math.round(width / 2);
      ry = Math.round(height / 2);
    } else if (shape === 'trapezoid') {
      rx = Math.round(Math.max(baseTop, baseBottom) / 2);
      ry = Math.round(height / 2);
    } else if (shape === 'triangle') {
      rx = Math.round(base / 2);
      ry = Math.round(height / 2);
    } else if (shape === 'rhombus') {
      rx = Math.round(diagMinor / 2);
      ry = Math.round(diagMajor / 2);
    }

    rx = Math.max(1, rx);
    ry = Math.max(1, ry);

    let rotationDeg = 0;
    if (typeof radiusOrZone === 'object' && radiusOrZone !== null) {
      rotationDeg = radiusOrZone.rotation || 0;
    }

    const rotRad = (rotationDeg * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    const scanRx = rotationDeg === 0 
      ? rx 
      : Math.ceil(rx * Math.abs(cosR) + ry * Math.abs(sinR));
    const scanRy = rotationDeg === 0 
      ? ry 
      : Math.ceil(rx * Math.abs(sinR) + ry * Math.abs(cosR));

    const startX = Math.max(0, px - scanRx);
    const startY = Math.max(0, py - scanRy);
    const endX = Math.min(canvas.width - 1, px + scanRx);
    const endY = Math.min(canvas.height - 1, py + scanRy);

    const scanW = endX - startX + 1;
    const scanH = endY - startY + 1;
    if (scanW <= 0 || scanH <= 0) return { intensity: 0, meanIntensity: 0, totalActivity: 0 };

    try {
      const imgData = ctx.getImageData(startX, startY, scanW, scanH);
      const data = imgData.data;

      let totalIntensity = 0;
      let countedPixels = 0;

      for (let dy = -scanRy; dy <= scanRy; dy++) {
        for (let dx = -scanRx; dx <= scanRx; dx++) {
          const curX = px + dx;
          const curY = py + dy;

          // Rotate (dx, dy) back to the unrotated system to check shape inclusion
          let rdx = dx;
          let rdy = dy;
          if (rotationDeg !== 0) {
            // Un-rotate: R(-theta)
            rdx = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
            rdy = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);
          }

          // within the shape bounds
          let inShape = false;
          if (shape === 'ellipse') {
            inShape = (rdx * rdx) / (rx * rx) + (rdy * rdy) / (ry * ry) <= 1;
          } else if (shape === 'rectangle') {
            inShape = Math.abs(rdx) <= rx && Math.abs(rdy) <= ry;
          } else if (shape === 'trapezoid') {
            if (Math.abs(rdy) <= ry) {
              const t = (rdy + ry) / (2 * ry || 1);
              const halfW = (1 - t) * (baseTop / 2) + t * (baseBottom / 2);
              inShape = Math.abs(rdx) <= halfW;
            }
          } else if (shape === 'triangle') {
            if (Math.abs(rdy) <= ry) {
              const t = (rdy + ry) / (2 * ry || 1);
              const halfW = t * (base / 2);
              inShape = Math.abs(rdx) <= halfW;
            }
          } else if (shape === 'rhombus') {
            inShape = Math.abs(rdx) / (rx || 1) + Math.abs(rdy) / (ry || 1) <= 1;
          }

          if (inShape) {
            if (curX >= startX && curX <= endX && curY >= startY && curY <= endY) {
              const dataX = curX - startX;
              const dataY = curY - startY;
              const idx = (dataY * scanW + dataX) * 4;

              if (idx >= 0 && idx < data.length - 4) {
                const rVal = data[idx];
                const gVal = data[idx + 1];
                const bVal = data[idx + 2];

                let pixelValue = 0;
                if (colorChannel === 'red') {
                  pixelValue = rVal;
                } else if (colorChannel === 'green') {
                  pixelValue = gVal;
                } else if (colorChannel === 'blue') {
                  pixelValue = bVal;
                } else {
                  pixelValue = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
                }
                
                const value = darkOnLight ? (255 - pixelValue) : pixelValue;
                const subtractedValue = (categoryType === 'zimografia' && zimoBgPixel !== null)
                  ? Math.max(0, value - zimoBgPixel)
                  : value;
                totalIntensity += subtractedValue;
                countedPixels++;
              }
            }
          }
        }
      }

      if (countedPixels > 0) {
        const roundedIntensity = Math.round(totalIntensity);
        const avg = parseFloat((totalIntensity / countedPixels).toFixed(2));
        return {
          intensity: roundedIntensity,
          meanIntensity: avg,
          totalActivity: roundedIntensity
        };
      }
      return { intensity: 0, meanIntensity: 0, totalActivity: 0 };
    } catch (e) {
      console.error('Error reading pixels:', e);
      return { intensity: 0, meanIntensity: 0, totalActivity: 0 };
    }
  };

  // Calculate average intensity of background zones if any exist to use as blank subtractor
  const getAverageBackground = (currentZones: DoiZone[]) => {
    const backgrounds = currentZones.filter(z => z.type === 'background');
    if (backgrounds.length === 0) return 0;
    const sum = backgrounds.reduce((acc, z) => acc + z.intensity, 0);
    return sum / backgrounds.length;
  };

  // Regression / Rule of Three calculations
  const solveQuantification = (currentZones: DoiZone[], calcMethod: 'regression' | 'ratio'): DoiZone[] => {
    const standards = currentZones.filter(z => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
    const bgVal = getAverageBackground(currentZones);
    
    if (calcMethod === 'regression') {
      if (standards.length < 2) {
        // Not enough points for regression, reset estimated conc
        return currentZones.map(z => z.type === 'sample' ? { ...z, estimatedConcentration: undefined } : z);
      }

      // Linear regression: OID (netintensity) = slope * concentration + intercept
      // X = Concentration, Y = OID Net Intensity
      const n = standards.length;
      let sumX = 0; // Concentration
      let sumY = 0; // OID / Net Intensity
      let sumXY = 0;
      let sumXX = 0;

      standards.forEach(s => {
        const xVal = s.concentration!;
        const yVal = Math.max(0, s.intensity - bgVal);
        sumX += xVal;
        sumY += yVal;
        sumXY += (xVal * yVal);
        sumXX += (xVal * xVal);
      });

      const meanX = sumX / n;
      const meanY = sumY / n;

      let num = 0;
      let den = 0;
      standards.forEach(s => {
        const xVal = s.concentration!;
        const yVal = Math.max(0, s.intensity - bgVal);
        num += (xVal - meanX) * (yVal - meanY);
        den += (xVal - meanX) * (xVal - meanX);
      });

      const slope = den !== 0 ? num / den : 0;
      const intercept = meanY - slope * meanX;

      return currentZones.map(z => {
        if (z.type === 'sample') {
          // Concentration = (Net OID - intercept) / slope
          const netInt = Math.max(0, z.intensity - bgVal);
          const est = slope !== 0 ? (netInt - intercept) / slope : 0;
          return {
            ...z,
            estimatedConcentration: est > 0 ? parseFloat(est.toFixed(2)) : 0
          };
        }
        return z;
      });
    } else {
      // Rule of three using the average standard ratio: Conc / IOD
      if (standards.length === 0) {
        return currentZones.map(z => z.type === 'sample' ? { ...z, estimatedConcentration: undefined } : z);
      }

      const ratios = standards.map(s => s.concentration! / Math.max(1, s.intensity - bgVal));
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

      return currentZones.map(z => {
        if (z.type === 'sample') {
          const netInt = Math.max(0, z.intensity - bgVal);
          const est = netInt * avgRatio;
          return {
            ...z,
            estimatedConcentration: parseFloat(est.toFixed(2))
          };
        }
        return z;
      });
    }
  };

  // Get regression metrics for display
  const getRegressionMetrics = () => {
    const standards = zones.filter(z => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
    if (standards.length < 2) return null;

    const bgVal = getAverageBackground(zones);

    // Independent variate X = Concentration, Dependent variate Y = OID Net Intensity
    const n = standards.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    standards.forEach(s => {
      const xVal = s.concentration!;
      const yVal = Math.max(0, s.intensity - bgVal);
      sumX += xVal;
      sumY += yVal;
      sumXY += (xVal * yVal);
      sumXX += (xVal * xVal);
      sumYY += (yVal * yVal);
    });

    const meanX = sumX / n;
    const meanY = sumY / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    standards.forEach(s => {
      const xVal = s.concentration!;
      const yVal = Math.max(0, s.intensity - bgVal);
      num += (xVal - meanX) * (yVal - meanY);
      denX += (xVal - meanX) * (xVal - meanX);
      denY += (yVal - meanY) * (yVal - meanY);
    });

    const slope = denX !== 0 ? num / denX : 0;
    const intercept = meanY - slope * meanX;

    // R2 score based on y (OID Net intensity) residual
    let ssReg = 0;
    let ssTot = 0;
    standards.forEach(s => {
      const netY = Math.max(0, s.intensity - bgVal);
      const predicted = slope * s.concentration! + intercept;
      ssReg += (predicted - meanY) * (predicted - meanY);
      ssTot += (netY - meanY) * (netY - meanY);
    });

    const r2 = ssTot !== 0 ? ssReg / ssTot : 1;

    const yVar = language === 'es' ? 'DOI Neto' : 'Net IOD';
    const xVar = categoryType === 'densitometria' ? 'M' : 'C';

    return {
      equation: `${yVar} = ${slope.toFixed(4)} * ${xVar} + (${intercept.toFixed(2)})`,
      r2: parseFloat(r2.toFixed(4)),
      slope,
      intercept
    };
  };

  const getRuleOfThreeMetrics = () => {
    const standards = zones.filter(z => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
    if (standards.length === 0) return null;
    const bgVal = getAverageBackground(zones);
    const ratios = standards.map(s => s.concentration! / Math.max(1, s.intensity - bgVal));
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return {
      ratio: avgRatio
    };
  };

  const confirmAddPendingStandard = () => {
    if (!pendingZone || !imgRef.current) return;
    const num = parseFloat(concInputVal);
    if (!isNaN(num) && num >= 0) {
      const newId = Math.random().toString(36).substring(2, 9);
      
      const referenceZone = zones[0];
      const newZone: DoiZone = {
        id: newId,
        type: 'standard',
        x: pendingZone.x,
        y: pendingZone.y,
        radius: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radius !== undefined ? referenceZone.radius : 25),
        shape: selectedShape,
        width: categoryType === 'doi-analyzer' ? globalRadius * 2 : (referenceZone?.width !== undefined ? referenceZone.width : 50),
        height: categoryType === 'doi-analyzer' ? globalRadius * 2 : (referenceZone?.height !== undefined ? referenceZone.height : 50),
        radiusX: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radiusX !== undefined ? referenceZone.radiusX : 25),
        radiusY: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radiusY !== undefined ? referenceZone.radiusY : 25),
        baseTop: referenceZone?.baseTop !== undefined ? referenceZone.baseTop : 30,
        baseBottom: referenceZone?.baseBottom !== undefined ? referenceZone.baseBottom : 50,
        base: referenceZone?.base !== undefined ? referenceZone.base : 50,
        diagMajor: referenceZone?.diagMajor !== undefined ? referenceZone.diagMajor : 60,
        diagMinor: referenceZone?.diagMinor !== undefined ? referenceZone.diagMinor : 40,
        rotation: referenceZone?.rotation !== undefined ? referenceZone.rotation : 0,
        intensity: 0, // will compute below
        label: pendingZone.label,
        concentration: num
      };

      const metrics = calculateDoiValue(imgRef.current, pendingZone.x, pendingZone.y, newZone, isDarkOnLight);
      newZone.intensity = metrics.intensity;
      newZone.meanIntensity = metrics.meanIntensity;
      newZone.totalActivity = metrics.totalActivity;
      newZone.area = calculateGeometricArea(newZone);

      const updatedZones = [...zones, newZone];
      const solved = solveQuantification(updatedZones, method);
      setZones(solved);
      setSelectedZoneId(newId);
      setShowConcModal(false);
      setPendingZone(null);
    }
  };

  const samplePixelIntensity = (xFrac: number, yFrac: number): number => {
    if (!imgRef.current) return 0;
    const imgObj = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = imgObj.naturalWidth;
    canvas.height = imgObj.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    if (!bypassEnhancements) {
      ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(imgObj, 0, 0);
    ctx.filter = 'none';

    const px = Math.round(xFrac * canvas.width);
    const py = Math.round(yFrac * canvas.height);
    const imgData = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, px)), Math.max(0, Math.min(canvas.height - 1, py)), 1, 1);
    const rVal = imgData.data[0];
    const gVal = imgData.data[1];
    const bVal = imgData.data[2];

    let pixelValue = 0;
    if (colorChannel === 'red') {
      pixelValue = rVal;
    } else if (colorChannel === 'green') {
      pixelValue = gVal;
    } else if (colorChannel === 'blue') {
      pixelValue = bVal;
    } else {
      pixelValue = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
    }
    return isDarkOnLight ? (255 - pixelValue) : pixelValue;
  };

  // Canvas interaction
  const handleCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imgRef.current || !imageLoaded) return;
    
    // Disable placing new zones if dragging
    if (isDraggingZoneId) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to fractions (0 to 1) based on display dimensions
    const xFrac = clickX / rect.width;
    const yFrac = clickY / rect.height;

    // Eyedropper background selection for Zymography
    if (categoryType === 'zimografia' && isSelectingZimoBg) {
      const val = samplePixelIntensity(xFrac, yFrac);
      setZimoBgPixel(Math.round(val));
      setIsSelectingZimoBg(false);
      return;
    }

    // Check if clicked near an existing zone to select it
    const clickThreshold = 0.04; // 4% distance
    const clickedZone = zones.find(z => {
      const dist = Math.sqrt(Math.pow(z.x - xFrac, 2) + Math.pow(z.y - yFrac, 2));
      return dist < clickThreshold;
    });

    if (clickedZone) {
      setSelectedZoneId(clickedZone.id);
      if (clickedZone.shape) {
        setSelectedShape(clickedZone.shape);
      }
      return;
    }

    // Otherwise, create a new zone
    const isStandard = categoryType === 'zimografia' ? false : activeType === 'standard';
    const isBackground = categoryType === 'zimografia' ? false : activeType === 'background';
    const newId = Math.random().toString(36).substring(2, 9);
    
    const standardsCount = zones.filter(z => z.type === 'standard').length;
    const samplesCount = zones.filter(z => z.type === 'sample').length;
    const bgCount = zones.filter(z => z.type === 'background').length;
    
    let newLabel = '';
    if (categoryType === 'zimografia' || categoryType === 'densitometria') {
      newLabel = (zones.length + 1).toString();
    } else {
      if (isStandard) {
        newLabel = `Std ${standardsCount + 1}`;
      } else if (isBackground) {
        newLabel = language === 'es' ? `Fondo ${bgCount + 1}` : `Blank ${bgCount + 1}`;
      } else {
        newLabel = language === 'es' ? `Muestra ${samplesCount + 1}` : `Sample ${samplesCount + 1}`;
      }
    }

    if (isStandard) {
      setPendingZone({ x: xFrac, y: yFrac, label: newLabel });
      setConcInputVal('10');
      setShowConcModal(true);
      return;
    }

    const referenceZone = zones[0];
    const newZone: DoiZone = {
      id: newId,
      type: categoryType === 'zimografia' ? 'sample' : activeType,
      x: xFrac,
      y: yFrac,
      radius: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radius !== undefined ? referenceZone.radius : 25),
      shape: selectedShape,
      width: categoryType === 'doi-analyzer' ? globalRadius * 2 : (referenceZone?.width !== undefined ? referenceZone.width : 50),
      height: categoryType === 'doi-analyzer' ? globalRadius * 2 : (referenceZone?.height !== undefined ? referenceZone.height : 50),
      radiusX: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radiusX !== undefined ? referenceZone.radiusX : 25),
      radiusY: categoryType === 'doi-analyzer' ? globalRadius : (referenceZone?.radiusY !== undefined ? referenceZone.radiusY : 25),
      baseTop: referenceZone?.baseTop !== undefined ? referenceZone.baseTop : 30,
      baseBottom: referenceZone?.baseBottom !== undefined ? referenceZone.baseBottom : 50,
      base: referenceZone?.base !== undefined ? referenceZone.base : 50,
      diagMajor: referenceZone?.diagMajor !== undefined ? referenceZone.diagMajor : 60,
      diagMinor: referenceZone?.diagMinor !== undefined ? referenceZone.diagMinor : 40,
      rotation: referenceZone?.rotation !== undefined ? referenceZone.rotation : 0,
      intensity: 0, // will compute below
      label: newLabel,
      concentration: undefined
    };

    const metrics = calculateDoiValue(imgRef.current, xFrac, yFrac, newZone, isDarkOnLight);
    newZone.intensity = metrics.intensity;
    newZone.meanIntensity = metrics.meanIntensity;
    newZone.totalActivity = metrics.totalActivity;
    newZone.area = calculateGeometricArea(newZone);

    const updatedZones = [...zones, newZone];
    const solved = solveQuantification(updatedZones, method);
    setZones(solved);
    setSelectedZoneId(newId);
  };

  const handleMouseDownZone = (zoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingZoneId(zoneId);
    setSelectedZoneId(zoneId);
  };

  const handleTouchStartZone = (zoneId: string, e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingZoneId(zoneId);
    setSelectedZoneId(zoneId);
  };

  const handleMouseMoveContainer = (e: React.MouseEvent) => {
    if (!isDraggingZoneId || !containerRef.current || !imgRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left)) / rect.width;
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top)) / rect.height;

    const updated = zones.map(z => {
      if (z.id === isDraggingZoneId) {
        const metrics = calculateDoiValue(imgRef.current!, x, y, z, isDarkOnLight);
        return {
          ...z,
          x,
          y,
          intensity: metrics.intensity,
          meanIntensity: metrics.meanIntensity,
          totalActivity: metrics.totalActivity,
          area: calculateGeometricArea(z)
        };
      }
      return z;
    });

    const solved = solveQuantification(updated, method);
    setZones(solved);
  };

  const handleTouchMoveContainer = (e: React.TouchEvent) => {
    if (!isDraggingZoneId || !containerRef.current || !imgRef.current || e.touches.length === 0) return;
    e.preventDefault(); // prevent viewport scrolling while dragging spots

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left)) / rect.width;
    const y = Math.max(0, Math.min(rect.height, touch.clientY - rect.top)) / rect.height;

    const updated = zones.map(z => {
      if (z.id === isDraggingZoneId) {
        const metrics = calculateDoiValue(imgRef.current!, x, y, z, isDarkOnLight);
        return {
          ...z,
          x,
          y,
          intensity: metrics.intensity,
          meanIntensity: metrics.meanIntensity,
          totalActivity: metrics.totalActivity,
          area: calculateGeometricArea(z)
        };
      }
      return z;
    });

    const solved = solveQuantification(updated, method);
    setZones(solved);
  };

  const handleMouseUpContainer = () => {
    setIsDraggingZoneId(null);
  };

  // Actions
  const handleUndo = () => {
    if (zones.length === 0) return;
    const nextZones = zones.slice(0, -1);
    setZones(solveQuantification(nextZones, method));
    setSelectedZoneId(null);
  };

  const handleReset = () => {
    if (window.confirm(language === 'es' ? '¿Deseas eliminar todos los puntos marcados?' : 'Do you want to reset all marked zones?')) {
      setZones([]);
      setSelectedZoneId(null);
    }
  };

  const handleZoneLabelChange = (id: string, val: string) => {
    const updated = zones.map(z => z.id === id ? { ...z, label: val } : z);
    setZones(updated);
  };

  const handleZoneConcChange = (id: string, val: string) => {
    const num = parseFloat(val);
    const updated = zones.map(z => z.id === id ? { ...z, concentration: isNaN(num) ? undefined : num } : z);
    setZones(solveQuantification(updated, method));
  };

  const handleRemoveZone = (id: string) => {
    const updated = zones.filter(z => z.id !== id);
    setZones(solveQuantification(updated, method));
    setSelectedZoneId(null);
  };

  const handleMethodChange = (newMethod: 'regression' | 'ratio') => {
    setMethod(newMethod);
    setZones(solveQuantification(zones, newMethod));
  };

  const handleSave = () => {
    if (categoryType !== 'zimografia') {
      // Validate if any standards are set
      const standards = zones.filter(z => z.type === 'standard' && z.concentration !== undefined && z.concentration > 0);
      if (standards.length === 0) {
        alert(language === 'es' 
          ? 'Por favor marca al menos un estándar de calibración (patrón de concentración).' 
          : 'Please specify at least one reference calibration standard.'
        );
        return;
      }

      if (method === 'regression' && standards.length < 2) {
        alert(language === 'es'
          ? 'Se requieren al menos 2 estándares con concentración conocida para la regresión lineal. Cambia el método a regla de tres si solo tienes un estándar.'
          : 'At least 2 standards with known concentration are required for linear regression. Switch to rule of three if you only have one standard.'
        );
        return;
      }
    }

    const metricsStr = getRegressionMetrics();
    
    const analysis: DoiAnalysis = {
      analysisDate: new Date().toISOString(),
      method,
      equation: categoryType === 'zimografia' ? undefined : metricsStr?.equation,
      r2: categoryType === 'zimografia' ? undefined : metricsStr?.r2,
      zones,
      controlZoneId: categoryType === 'zimografia' ? controlZoneId : undefined,
      customRatios: categoryType === 'zimografia' ? customRatios : undefined,
      zimoBgPixel: categoryType === 'zimografia' ? zimoBgPixel : undefined
    };

    onSaveAnalysis(analysis);
  };

  const metrics = getRegressionMetrics();
  const ruleOfThree = getRuleOfThreeMetrics();

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6] dark:bg-slate-950 p-4 md:p-6 text-slate-800 dark:text-slate-100 transition-all duration-200">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 border border-[#E69A5E]/15 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 max-w-5xl mx-auto w-full gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all font-bold text-xs"
          >
            ← {language === 'es' ? 'Volver' : 'Back'}
          </button>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {categoryType === 'zimografia'
                ? (language === 'es' ? 'Analizador de Zimografía' : 'Zymography Analyzer')
                : categoryType === 'densitometria'
                ? (language === 'es' ? 'Analizador de Densitometría' : 'Densitometry Analyzer')
                : (language === 'es' ? 'Analizador de Colorimetría RGV' : 'RGV Colorimetry Analyzer')
              }
            </h2>
            <p className="text-[11px] text-gray-550 dark:text-gray-400 font-bold">
              {ficha.title} ({language === 'es' ? 'Muestra a Cuantificar' : 'Sample to quantify'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/25 dark:hover:bg-blue-950/45 text-blue-700 dark:text-blue-300 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            ❓ {language === 'es' ? 'Ayuda' : 'Help'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto w-full flex-grow items-start">
        {/* Left column: Visual Area Selection */}
        <div className="lg:col-span-7 flex flex-col items-center bg-white dark:bg-slate-900 border border-[#E69A5E]/10 dark:border-slate-800 rounded-3xl p-4 shadow-sm overflow-hidden select-none">
          <div className="w-full flex flex-col gap-2.5 border-b pb-3 mb-4 border-gray-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2">
              <span className="text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
                {language === 'es' ? 'Alineación de Apertura e Intensidad' : 'Aperture Pinpoint & Intensity'}
              </span>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Channel Select dropdown */}
                <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-slate-900 border border-neutral-100 dark:border-slate-800 py-0.5 px-1.5 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{language === 'es' ? 'Canal:' : 'Channel:'}</span>
                  <select
                    value={colorChannel}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setColorChannel(val);
                    }}
                    className="text-[10px] font-semibold bg-transparent border-0 rounded px-1 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer p-0"
                  >
                    {categoryType === 'densitometria' || categoryType === 'zimografia' ? (
                      <>
                        <option value="gray">{language === 'es' ? '⬜ Gris / Escala de grises' : 'Grayscale'}</option>
                        <option value="color">{language === 'es' ? '☀️ Foto Original (Color)' : '☀️ Original Image (Color)'}</option>
                      </>
                    ) : (
                      <>
                        <option value="color">{language === 'es' ? '☀️ Imagen Original (Color)' : '☀️ Original Image (Color)'}</option>
                        <option value="gray">{language === 'es' ? 'Gris / Luminancia' : 'Grayscale'}</option>
                        <option value="red">{language === 'es' ? '🔴 Canal Rojo (R)' : '🔴 Red Channel'}</option>
                        <option value="green">{language === 'es' ? '🟢 Canal Verde (G)' : '🟢 Green Channel'}</option>
                        <option value="blue">{language === 'es' ? '🔵 Canal Azul/Violeta (V/B)' : '🔵 Blue/Violet Channel'}</option>
                      </>
                    )}
                  </select>
                </div>

                {categoryType === 'zimografia' || categoryType === 'densitometria' ? (
                  null
                ) : (
                  /* Dark on Light Toggle */
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDarkOnLight}
                      onChange={(e) => setIsDarkOnLight(e.target.checked)}
                      className="rounded text-indigo-500 border-gray-300 focus:ring-indigo-400 cursor-pointer h-3 w-3"
                    />
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      {isDarkOnLight 
                        ? (language === 'es' ? '🟤 Absorbancia' : '🟤 Absorbance')
                        : (language === 'es' ? '🟡 Fluorescencia' : '🟡 Fluorescence')
                      }
                    </span>
                  </label>
                )}
              </div>
            </div>
            
            <div className="text-[10.5px] text-gray-550 dark:text-gray-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800/80 leading-relaxed font-semibold">
              💡 {language === 'es' ? (
                categoryType === 'zimografia' ? (
                  <span>
                    <strong>Indicación:</strong> Zimografía para bandas claras (actividad enzimática sobre fondo oscuro). ¡Haz clic en la imagen para colocar figuras!
                  </span>
                ) : categoryType === 'densitometria' ? (
                  <span>
                    <strong>Indicación:</strong> Densitometría estándar para bandas oscuras sobre fondo claro. ¡Haz clic en la imagen para colocar figuras!
                  </span>
                ) : (
                  <span>
                    <strong>Indicación:</strong> Elige <span className="text-amber-800">🟤 Absorbancia</span> (puntos oscuros sobre fondo claro) para placas teñidas con Coomassie, plata o inmunocromatografía. Cambia a <span className="text-yellow-600">🟡 Fluorescencia</span> (puntos claros sobre fondo oscuro) para geles fotografiados con luz UV, GFP o electroquimioluminiscencia (Western ECL).<br/>
                    <span className="text-blue-600 dark:text-blue-404 font-bold block mt-1">⚠️ Nota: La herramienta de Absorbancia / Fluorescencia es de máxima utilidad especialmente bajo el Canal Gris.</span>
                  </span>
                )
              ) : (
                categoryType === 'zimografia' ? (
                  <span>
                    <strong>Tip:</strong> Zymography for light bands on a dark backdrop (enzymatic activity). Click the image to place figures!
                  </span>
                ) : categoryType === 'densitometria' ? (
                  <span>
                    <strong>Tip:</strong> Standard Densitometry for dark bands on light background. Click the image to place figures!
                  </span>
                ) : (
                  <span>
                    <strong>Guide:</strong> Choose <span className="text-amber-800">🟤 Absorbance</span> (dark spots on light background) for Coomassie, silver stain, or basic microscopy. Toggle to <span className="text-yellow-600">🟡 Fluorescence</span> (light spots on dark background) for UV illumination, GFP, or chemiluminescent Western blots.<br/>
                    <span className="text-blue-600 dark:text-blue-405 font-semibold block mt-1">⚠️ Note: The Absorbance / Fluorescence selector is mostly useful when analyzing under the monochromatic Gray channel.</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Brillo y Contraste controls for DoiAnalyzer */}
            <div className="mt-2.5 w-full bg-neutral-55/40 dark:bg-slate-950/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">🌓 {language === 'es' ? 'Ajustes Visuales de la Placa' : 'Visual Adjustments'}</span>
                
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500">
                  <input
                    type="checkbox"
                    checked={bypassEnhancements}
                    onChange={(e) => setBypassEnhancements(e.target.checked)}
                    className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-400 cursor-pointer h-3 w-3"
                  />
                  <span>🚫 {language === 'es' ? 'Deshabilitar ajuste' : 'Bypass adjustments'}</span>
                </label>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity duration-150 ${bypassEnhancements ? 'opacity-40' : ''}`}>
                {/* Contrast */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-650 dark:text-slate-400 min-w-[55px]">{language === 'es' ? 'Contraste:' : 'Contrast:'}</span>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    disabled={bypassEnhancements}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1 cursor-pointer accent-indigo-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-650 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded w-9 text-center">{contrast}%</span>
                </div>

                {/* Brightness */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-655 dark:text-slate-400 min-w-[55px]">{language === 'es' ? 'Brillo:' : 'Brightness:'}</span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    disabled={bypassEnhancements}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1 cursor-pointer accent-indigo-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-650 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded w-9 text-center">{brightness}%</span>
                </div>
              </div>
            </div>

          {/* Zimografia Background Subtractor Panel */}
          {categoryType === 'zimografia' && (
            <div className="mt-2.5 w-full bg-indigo-50/15 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-indigo-150/40 dark:border-slate-800/80 flex flex-col gap-2">
              <span className="block text-[10.5px] uppercase font-extrabold text-indigo-700 dark:text-indigo-400 tracking-wider">
                🖤 {language === 'es' ? 'Fondo de Zimografía (Opcional)' : 'Zymography Background (Optional)'}
              </span>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {language === 'es' 
                  ? 'Permite indicar el valor de gris de fondo para restarlo de las bandas de actividad, facilitando la comparación entre diferentes geles.' 
                  : 'Allows specifying the background gray value to subtract from activity bands, enabling comparisons across different gels.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsSelectingZimoBg(!isSelectingZimoBg)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer transition-all flex items-center gap-1.5 ${
                    isSelectingZimoBg
                      ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse ring-2 ring-amber-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <span>🎯</span>
                  {isSelectingZimoBg
                    ? (language === 'es' ? 'Haz clic en la imagen...' : 'Click on image...')
                    : (language === 'es' ? 'Capturar con Gotero' : 'Sample with Eyedropper')}
                </button>

                {zimoBgPixel !== null ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 rounded-xl py-1 px-1.5">
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={zimoBgPixel}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setZimoBgPixel(Math.max(0, Math.min(255, val)));
                          } else {
                            setZimoBgPixel(0);
                          }
                        }}
                        className="w-11 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-transparent border-none outline-none p-0 text-xs"
                      />
                      <span className="text-[10px] text-gray-400">/255</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZimoBgPixel(null)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 rounded-lg cursor-pointer transition-colors text-xs"
                      title={language === 'es' ? 'Eliminar fondo' : 'Remove background'}
                    >
                      🗑️
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 italic py-1">
                    {language === 'es' ? 'Sin fondo seleccionado' : 'No background selected'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Placed Above Photo: Category Selection (1.6) */}
          {categoryType !== 'zimografia' && (
            <div className="w-full mb-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80">
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-2">
                {language === 'es' ? 'Tipo de punto a colocar' : 'Aperture Category to Place'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveType('standard')}
                  className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all gap-0.5 ${
                    activeType === 'standard'
                      ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300 ring-2 ring-purple-100'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400'
                  }`}
                >
                  <span className="text-base">🟣</span>
                  <span className="text-center">{language === 'es' ? 'Patrón' : 'Standard'}</span>
                </button>
                <button
                  onClick={() => setActiveType('sample')}
                  className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all gap-0.5 ${
                    activeType === 'sample'
                      ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300 ring-2 ring-red-100'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400'
                  }`}
                >
                  <span className="text-base">🔴</span>
                  <span className="text-center">{language === 'es' ? 'Muestra' : 'Sample'}</span>
                </button>
                <button
                  onClick={() => setActiveType('background')}
                  className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all gap-0.5 ${
                    activeType === 'background'
                      ? 'bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 ring-2 ring-slate-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400'
                  }`}
                >
                  <span className="text-base">⚪</span>
                  <span className="text-center">{language === 'es' ? 'Fondo/Blanco' : 'Blank (Bg)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Shape Selector Panel for Zimografía and Densitometría */}
          {(categoryType === 'densitometria' || categoryType === 'zimografia') && (
            <div className="w-full mb-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80">
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-2">
                {language === 'es' ? 'Figura del panel de herramientas' : 'Toolbar Shape'}
              </span>
              <div className={`grid gap-1.5 ${categoryType === 'densitometria' ? 'grid-cols-2' : 'grid-cols-5'}`}>
                {(categoryType === 'densitometria' 
                  ? (['ellipse', 'rectangle'] as const)
                  : (['ellipse', 'rectangle', 'trapezoid', 'triangle', 'rhombus'] as const)
                ).map((sh) => {
                  let emoji = '⬭';
                  let nameEs = '';
                  let nameEn = '';
                  if (sh === 'ellipse') { emoji = '⬭'; nameEs = 'Elipse'; nameEn = 'Ellipse'; }
                  else if (sh === 'rectangle') { emoji = '▭'; nameEs = 'Rectángulo'; nameEn = 'Rect'; }
                  else if (sh === 'trapezoid') { emoji = '⏢'; nameEs = 'Trapecio'; nameEn = 'Trapezoid'; }
                  else if (sh === 'triangle') { emoji = '△'; nameEs = 'Triángulo'; nameEn = 'Triangle'; }
                  else if (sh === 'rhombus') { emoji = '♢'; nameEs = 'Rombo'; nameEn = 'Rhombus'; }

                  return (
                    <button
                      key={sh}
                      onClick={() => handleShapeChange(sh)}
                      className={`py-1.5 px-1 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center border transition-all cursor-pointer ${
                        selectedShape === sh
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-100'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400'
                      }`}
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[9px] text-center whitespace-nowrap mt-0.5">{language === 'es' ? nameEs : nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placed Above Photo: Sliders (1.2, 1.6 - minimum globalRadius is 3 px) */}
          <div className="w-full bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80 mb-4">
            {(categoryType === 'densitometria' || categoryType === 'zimografia') ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 font-sans">
                  <span>🔍 {language === 'es' ? 'Zoom de Imagen' : 'Image Zoom'}</span>
                  <span className="font-mono text-indigo-650 dark:text-indigo-400 font-black">{zoomLevel}%</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={500}
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <SensitiveSlider
                  label={language === 'es' ? 'Apertura (Radio)' : 'Aperture Radius'}
                  icon="📏"
                  min={1}
                  max={120}
                  value={globalRadius}
                  onChange={(val) => {
                    setGlobalRadius(val);
                    recalculateAllDoi(zones, val, isDarkOnLight, val, val);
                  }}
                />

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 font-sans">
                    <span>🔍 {language === 'es' ? 'Zoom de Imagen' : 'Image Zoom'}</span>
                    <span className="font-mono text-indigo-650 dark:text-indigo-400 font-black">{zoomLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={500}
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive view bounds container wrapper with scrollbars for zoom & pan (1.1, 1.8) */}
          <div 
            className="w-full relative border-4 border-slate-100 dark:border-slate-800 rounded-2xl overflow-auto bg-slate-50 h-[280px] sm:h-[450px] md:h-[500px] lg:h-[520px]"
          >
            <div 
              ref={containerRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMoveContainer}
              onMouseUp={handleMouseUpContainer}
              onMouseLeave={handleMouseUpContainer}
              onTouchMove={handleTouchMoveContainer}
              onTouchEnd={handleMouseUpContainer}
              onTouchCancel={handleMouseUpContainer}
              className="relative cursor-crosshair transition-all duration-150 ease-out origin-top-left"
              style={{ 
                width: `${zoomLevel}%`, 
                minWidth: zoomLevel < 100 ? `${zoomLevel}%` : '100%',
              }}
            >
              {ficha.image ? (
                <img
                  ref={imgRef}
                  src={processedImgSrc || ficha.image}
                  alt="Gel/Plate"
                  onLoad={() => setImageLoaded(true)}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto select-none pointer-events-none block"
                />
              ) : (
                <div className="p-12 text-center text-gray-400 font-semibold">
                  {language === 'es' ? 'No hay imagen disponible.' : 'No image loaded.'}
                </div>
              )}

              {/* Display Circles/Ellipses on Overlay */}
              {imageLoaded && imgRef.current && containerRef.current && zones.map((zone, idx) => {
                const leftPercent = zone.x * 100;
                const topPercent = zone.y * 100;
                
                const isSelected = selectedZoneId === zone.id;
                const isStandard = zone.type === 'standard';
                const isBackground = zone.type === 'background';

                let borderColor = '#EF4444';
                if (isSelected) {
                  borderColor = '#3B82F6';
                } else if (isStandard) {
                  borderColor = '#8B5CF6';
                } else if (isBackground) {
                  borderColor = '#475569';
                }

                let labelBgColor = '#EF4444';
                if (isStandard) {
                  labelBgColor = '#8B5CF6';
                } else if (isBackground) {
                  labelBgColor = '#475569';
                }

                const shape = zone.shape || 'ellipse';
                const currentW = (categoryType === 'densitometria' || categoryType === 'zimografia')
                  ? (zone.width !== undefined ? zone.width : (zone.radiusX !== undefined ? zone.radiusX * 2 : 50))
                  : (zone.radius !== undefined ? zone.radius * 2 : (zone.width !== undefined ? zone.width : globalRadius * 2));
                const currentH = (categoryType === 'densitometria' || categoryType === 'zimografia')
                  ? (zone.height !== undefined ? zone.height : (zone.radiusY !== undefined ? zone.radiusY * 2 : 50))
                  : (zone.radius !== undefined ? zone.radius * 2 : (zone.height !== undefined ? zone.height : globalRadius * 2));

                const baseTop = zone.baseTop !== undefined ? zone.baseTop : 30;
                const baseBottom = zone.baseBottom !== undefined ? zone.baseBottom : 50;
                const baseVal = zone.base !== undefined ? zone.base : 50;
                const diagMajor = zone.diagMajor !== undefined ? zone.diagMajor : 60;
                const diagMinor = zone.diagMinor !== undefined ? zone.diagMinor : 40;

                // Visual sizes scaled with zoom:
                const zoomFactor = zoomLevel / 100;
                const dispW = currentW * zoomFactor;
                const dispH = currentH * zoomFactor;

                let boxW = dispW;
                let boxH = dispH;
                let svgContent = null;

                if (shape === 'ellipse') {
                  svgContent = (
                    <ellipse
                      cx={boxW / 2}
                      cy={boxH / 2}
                      rx={Math.max(1, boxW / 2 - 1.5)}
                      ry={Math.max(1, boxH / 2 - 1.5)}
                      stroke={borderColor}
                      strokeWidth="3"
                      strokeDasharray={isBackground ? "5,5" : "none"}
                      fill={isSelected ? "rgba(59, 130, 246, 0.18)" : (isBackground ? "rgba(71, 85, 105, 0.12)" : "transparent")}
                    />
                  );
                } else if (shape === 'rectangle') {
                  svgContent = (
                    <rect
                      x="1.5"
                      y="1.5"
                      width={Math.max(1, boxW - 3)}
                      height={Math.max(1, boxH - 3)}
                      stroke={borderColor}
                      strokeWidth="3"
                      strokeDasharray={isBackground ? "5,5" : "none"}
                      fill={isSelected ? "rgba(59, 130, 246, 0.18)" : (isBackground ? "rgba(71, 85, 105, 0.12)" : "transparent")}
                    />
                  );
                } else if (shape === 'trapezoid') {
                  const wTop = baseTop * zoomFactor;
                  const wBottom = baseBottom * zoomFactor;
                  boxW = Math.max(wTop, wBottom);
                  boxH = dispH;
                  const x1 = (boxW - wTop) / 2;
                  const y1 = 1.5;
                  const x2 = boxW - (boxW - wTop) / 2;
                  const y2 = 1.5;
                  const x3 = boxW - (boxW - wBottom) / 2;
                  const y3 = boxH - 1.5;
                  const x4 = (boxW - wBottom) / 2;
                  const y4 = boxH - 1.5;
                  svgContent = (
                    <polygon
                      points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                      stroke={borderColor}
                      strokeWidth="3"
                      strokeDasharray={isBackground ? "5,5" : "none"}
                      fill={isSelected ? "rgba(59, 130, 246, 0.18)" : (isBackground ? "rgba(71, 85, 105, 0.12)" : "transparent")}
                    />
                  );
                } else if (shape === 'triangle') {
                  const wBase = baseVal * zoomFactor;
                  boxW = wBase;
                  boxH = dispH;
                  const x1 = boxW / 2;
                  const y1 = 1.5;
                  const x2 = boxW - 1.5;
                  const y2 = boxH - 1.5;
                  const x3 = 1.5;
                  const y3 = boxH - 1.5;
                  svgContent = (
                    <polygon
                      points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
                      stroke={borderColor}
                      strokeWidth="3"
                      strokeDasharray={isBackground ? "5,5" : "none"}
                      fill={isSelected ? "rgba(59, 130, 246, 0.18)" : (isBackground ? "rgba(71, 85, 105, 0.12)" : "transparent")}
                    />
                  );
                } else if (shape === 'rhombus') {
                  const wDiag = diagMinor * zoomFactor;
                  const hDiag = diagMajor * zoomFactor;
                  boxW = wDiag;
                  boxH = hDiag;
                  const x1 = boxW / 2;
                  const y1 = 1.5;
                  const x2 = boxW - 1.5;
                  const y2 = boxH / 2;
                  const x3 = boxW / 2;
                  const y3 = boxH - 1.5;
                  const x4 = 1.5;
                  const y4 = boxH / 2;
                  svgContent = (
                    <polygon
                      points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                      stroke={borderColor}
                      strokeWidth="3"
                      strokeDasharray={isBackground ? "5,5" : "none"}
                      fill={isSelected ? "rgba(59, 130, 246, 0.18)" : (isBackground ? "rgba(71, 85, 105, 0.12)" : "transparent")}
                    />
                  );
                }

                return (
                  <div
                    key={zone.id}
                    className="absolute"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelected ? 40 : 20
                    }}
                  >
                    {/* SVG representing local aperture */}
                    <div
                      onMouseDown={(e) => handleMouseDownZone(zone.id, e)}
                      onTouchStart={(e) => handleTouchStartZone(zone.id, e)}
                      className="cursor-move select-none relative"
                      style={{
                        width: `${boxW}px`,
                        height: `${boxH}px`
                      }}
                    >
                      <svg
                        width={boxW}
                        height={boxH}
                        style={{ display: 'block', transform: `rotate(${zone.rotation || 0}deg)`, transition: 'transform 0.1s ease-out' }}
                      >
                        {svgContent}
                      </svg>

                      {/* Inner Label */}
                      <span 
                        className="absolute text-[8px] font-black text-white px-1 rounded-sm bottom-full left-1/2 -translate-x-1/2 mb-0.5 select-none text-center pointer-events-none whitespace-nowrap animate-fade-in"
                        style={{
                          backgroundColor: labelBgColor
                        }}
                      >
                        {zone.label}
                      </span>
                      
                      {/* Tiny visual anchor center point of IOD */}
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full border border-gray-900 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fine Nudge Controls for Selected Zone (Moved directly under the image canvas!) */}
          {selectedZoneId && imgRef.current && (
            <div className="mt-3 p-3 bg-indigo-50/40 dark:bg-slate-900/40 border border-indigo-100/50 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between text-xs gap-3 shadow-3xs">
              <span className="font-extrabold text-[#1E3A8A] dark:text-indigo-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                🎯 {language === 'es' ? `Ajuste fino de "${zones.find(z => z.id === selectedZoneId)?.label || ''}":` : `Nudge "${zones.find(z => z.id === selectedZoneId)?.label || ''}":`}
              </span>
              <div className="flex items-center gap-1.5 select-none">
                {/* Move Left */}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); startNudging('left'); }}
                  onMouseUp={stopNudging}
                  onMouseLeave={stopNudging}
                  onTouchStart={(e) => { e.preventDefault(); startNudging('left'); }}
                  onTouchEnd={stopNudging}
                  className="p-1.5 px-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 font-bold transition-all text-xs cursor-pointer shadow-3xs active:bg-indigo-50 dark:active:bg-indigo-950/30"
                  title={language === 'es' ? 'Mover a la izquierda' : 'Nudge left'}
                >
                  ◀
                </button>
                <div className="flex flex-col gap-0.5">
                  {/* Move Up */}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); startNudging('up'); }}
                    onMouseUp={stopNudging}
                    onMouseLeave={stopNudging}
                    onTouchStart={(e) => { e.preventDefault(); startNudging('up'); }}
                    onTouchEnd={stopNudging}
                    className="p-1 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 font-bold transition-all text-[10px] leading-none cursor-pointer shadow-3xs active:bg-indigo-50 dark:active:bg-indigo-950/30"
                    title={language === 'es' ? 'Mover arriba' : 'Nudge up'}
                  >
                    ▲
                  </button>
                  {/* Move Down */}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); startNudging('down'); }}
                    onMouseUp={stopNudging}
                    onMouseLeave={stopNudging}
                    onTouchStart={(e) => { e.preventDefault(); startNudging('down'); }}
                    onTouchEnd={stopNudging}
                    className="p-1 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 font-bold transition-all text-[10px] leading-none cursor-pointer shadow-3xs active:bg-indigo-50 dark:active:bg-indigo-950/30"
                    title={language === 'es' ? 'Mover abajo' : 'Nudge down'}
                  >
                    ▼
                  </button>
                </div>
                {/* Move Right */}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); startNudging('right'); }}
                  onMouseUp={stopNudging}
                  onMouseLeave={stopNudging}
                  onTouchStart={(e) => { e.preventDefault(); startNudging('right'); }}
                  onTouchEnd={stopNudging}
                  className="p-1.5 px-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 font-bold transition-all text-xs cursor-pointer shadow-3xs active:bg-indigo-50 dark:active:bg-indigo-950/30"
                  title={language === 'es' ? 'Mover a la derecha' : 'Nudge right'}
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZones(prev => {
                    const updated = prev.filter(z => z.id !== selectedZoneId);
                    return solveQuantification(updated, method);
                  });
                  setSelectedZoneId(null);
                }}
                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg font-bold border border-transparent hover:border-rose-250 cursor-pointer transition-colors animate-fade-in"
                title={language === 'es' ? 'Eliminar zona' : 'Delete zone'}
              >
                ❌ {language === 'es' ? 'Eliminar' : 'Delete'}
              </button>
            </div>
          )}

          {/* Dimension adjusters specifically for selected zone */}
          {selectedZoneId && imgRef.current && (() => {
            const z = zones.find(item => item.id === selectedZoneId);
            if (!z) return null;
            const sh = z.shape || 'ellipse';
            const widthVal = z.width !== undefined ? z.width : (z.radiusX !== undefined ? z.radiusX * 2 : (z.radius ? z.radius * 2 : 50));
            const heightVal = z.height !== undefined ? z.height : (z.radiusY !== undefined ? z.radiusY * 2 : (z.radius ? z.radius * 2 : 50));
            const bTop = z.baseTop !== undefined ? z.baseTop : 30;
            const bBottom = z.baseBottom !== undefined ? z.baseBottom : 50;
            const bVal = z.base !== undefined ? z.base : 50;
            const dMajor = z.diagMajor !== undefined ? z.diagMajor : 60;
            const dMinor = z.diagMinor !== undefined ? z.diagMinor : 40;

            return (
              <div className="w-full mt-3 p-3 bg-indigo-50/25 dark:bg-slate-900/40 border border-indigo-100/30 dark:border-slate-800 rounded-2xl text-xs space-y-3 shadow-3xs">
                <span className="font-extrabold text-[#1E3A8A] dark:text-indigo-400 uppercase text-[10px] tracking-wider block">
                  📐 {language === 'es' ? 'Ajuste de dimensiones' : 'Dimension Adjustment'}
                </span>

                {/* In colorimetry, provide radius control for the selected circle */}
                {categoryType === 'doi-analyzer' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <SensitiveSlider
                        label={language === 'es' ? 'Radio de este círculo' : 'This Circle Radius'}
                        icon="📏"
                        min={1}
                        max={120}
                        value={z.radius || globalRadius}
                        onChange={(r) => {
                          updateSelectedZoneProps({ 
                            radius: r, 
                            width: r * 2, 
                            height: r * 2,
                            radiusX: r,
                            radiusY: r
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const curR = z.radius || globalRadius;
                          setGlobalRadius(curR);
                          recalculateAllDoi(zones, curR, isDarkOnLight, curR, curR);
                        }}
                        className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-xl border border-indigo-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                      >
                        {language === 'es' ? '📏 Aplicar a todos los círculos' : '📏 Apply to all circles'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* We render sliders depending on the shape */}
                {sh === 'ellipse' && (
                  <div className="grid grid-cols-2 gap-3">
                    <SensitiveSlider
                      label={language === 'es' ? 'Ancho' : 'Width'}
                      icon="↔️"
                      min={1}
                      max={350}
                      value={widthVal}
                      onChange={(w) => updateSelectedZoneProps({ width: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Alto' : 'Height'}
                      icon="↕️"
                      min={1}
                      max={350}
                      value={heightVal}
                      onChange={(h) => updateSelectedZoneProps({ height: h })}
                    />
                  </div>
                )}

                {sh === 'rectangle' && (
                  <div className="grid grid-cols-2 gap-3">
                    <SensitiveSlider
                      label={language === 'es' ? 'Ancho' : 'Width'}
                      icon="↔️"
                      min={1}
                      max={350}
                      value={widthVal}
                      onChange={(w) => updateSelectedZoneProps({ width: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Alto' : 'Height'}
                      icon="↕️"
                      min={1}
                      max={350}
                      value={heightVal}
                      onChange={(h) => updateSelectedZoneProps({ height: h })}
                    />
                  </div>
                )}

                {sh === 'trapezoid' && (
                  <div className="grid grid-cols-3 gap-3">
                    <SensitiveSlider
                      label={language === 'es' ? 'Base Sup' : 'Top Base'}
                      icon="⏢"
                      min={1}
                      max={350}
                      value={bTop}
                      onChange={(w) => updateSelectedZoneProps({ baseTop: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Base Inf' : 'Bottom Base'}
                      icon="⏢"
                      min={1}
                      max={350}
                      value={bBottom}
                      onChange={(w) => updateSelectedZoneProps({ baseBottom: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Altura' : 'Height'}
                      icon="↕️"
                      min={1}
                      max={350}
                      value={heightVal}
                      onChange={(h) => updateSelectedZoneProps({ height: h })}
                    />
                  </div>
                )}

                {sh === 'triangle' && (
                  <div className="grid grid-cols-2 gap-3">
                    <SensitiveSlider
                      label={language === 'es' ? 'Base' : 'Base'}
                      icon="▲"
                      min={1}
                      max={350}
                      value={bVal}
                      onChange={(w) => updateSelectedZoneProps({ base: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Altura' : 'Height'}
                      icon="↕️"
                      min={1}
                      max={350}
                      value={heightVal}
                      onChange={(h) => updateSelectedZoneProps({ height: h })}
                    />
                  </div>
                )}

                {sh === 'rhombus' && (
                  <div className="grid grid-cols-2 gap-3">
                    <SensitiveSlider
                      label={language === 'es' ? 'Diag Mayor' : 'Major Diag'}
                      icon="↕️"
                      min={1}
                      max={350}
                      value={dMajor}
                      onChange={(w) => updateSelectedZoneProps({ diagMajor: w })}
                    />
                    <SensitiveSlider
                      label={language === 'es' ? 'Diag Menor' : 'Minor Diag'}
                      icon="↔️"
                      min={1}
                      max={350}
                      value={dMinor}
                      onChange={(h) => updateSelectedZoneProps({ diagMinor: h })}
                    />
                  </div>
                )}

                {/* Always-available Rotation Control */}
                <div className="pt-2 border-t border-indigo-100/30 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                    <span>🔄 {language === 'es' ? 'Girar / Rotación' : 'Rotate / Rotation'}</span>
                    <span className="font-mono text-indigo-650 dark:text-indigo-400 font-black">{(z.rotation || 0)}°</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={z.rotation || 0}
                      onChange={(e) => {
                        const r = parseInt(e.target.value);
                        updateSelectedZoneProps({ rotation: r });
                      }}
                      className="flex-1 accent-indigo-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextRot = ((z.rotation || 0) + 45) % 360;
                        updateSelectedZoneProps({ rotation: nextRot });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black cursor-pointer transition-colors border border-indigo-150/40"
                      title={language === 'es' ? 'Girar 45°' : 'Rotate 45°'}
                    >
                      +45°
                    </button>
                  </div>
                </div>
                </>
                )}
              </div>
            );
          })()}

          {/* Placed Below Photo: Undo / Deshacer and Reset / Reiniciar (1.5) */}
          <div className="w-full grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleUndo}
              disabled={zones.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-955/45 text-amber-800 dark:text-amber-300 rounded-xl font-bold transition-all text-xs disabled:opacity-40 border border-amber-200/30 cursor-pointer min-h-[44px]"
            >
              ↩️ {language === 'es' ? 'Deshacer' : 'Undo'}
            </button>
            <button
              onClick={handleReset}
              disabled={zones.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-955/45 text-[#A12312] rounded-xl font-bold transition-all text-xs disabled:opacity-40 border border-slate-200/30 cursor-pointer min-h-[44px]"
            >
              🗑️ {language === 'es' ? 'Reiniciar' : 'Reset'}
            </button>
          </div>

          <div className="mt-3.5 text-[11px] text-gray-400 font-medium text-center italic">
            💡 {language === 'es' 
              ? 'Haz clic en la imagen para añadir zonas. Arrastra los círculos para alinearlos en el centro de tu mancha o pocillo.'
              : 'Click on the image to place quantification zones. Drag circles to anchor them over the centers of spots or dots.'
            }
          </div>
        </div>

        {/* Right column: Calculations panel */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">

          {/* Core Calibration Engine options */}
          {categoryType !== 'zimografia' && (
            <div className="bg-white dark:bg-slate-900 border border-[#E69A5E]/10 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              <span className="block text-[10px] uppercase font-bold text-gray-400 mb-2">
                {language === 'es' ? 'Algoritmo de Cuantificación' : 'Quantification Algorithm'}
              </span>
              
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                <button
                  onClick={() => handleMethodChange('regression')}
                  className={`flex-1 py-2 text-center rounded-xl font-bold text-xs transition-all ${
                    method === 'regression'
                      ? 'bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📈 {language === 'es' ? 'Regresión Lineal' : 'Regression'}
                </button>
                <button
                  onClick={() => handleMethodChange('ratio')}
                  className={`flex-1 py-2 text-center rounded-xl font-bold text-xs transition-all ${
                    method === 'ratio'
                      ? 'bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ⚖️ {language === 'es' ? 'Regla de tres' : 'Rule of Three'}
                </button>
              </div>

              {/* Regression metrics output */}
              {method === 'regression' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl text-[11px] font-semibold space-y-1 border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider mb-2">Ajuste de Recta del Patrón</p>
                  {metrics ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{language === 'es' ? 'Ecuación calibrada' : 'Calibrated eqn'}:</span>
                        <span className="font-mono font-black text-indigo-700 dark:text-indigo-400">{metrics.equation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{language === 'es' ? 'Coef. Determinación (R²)' : 'Det. Coefficient (R²)'}:</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{metrics.r2.toFixed(4)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 italic text-center py-2">
                      {language === 'es' 
                        ? 'Marca al menos 2 patrones con concentraciones para resolver la regresión.' 
                        : 'Place at least 2 standards with entered concentration to fit calibrating curve.'
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Rule of Three stats output */}
              {method === 'ratio' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl text-[11px] font-semibold space-y-1 border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider mb-2">{language === 'es' ? 'Factor de Proporcionalidad' : 'Proportionality Ratio Factor'}</p>
                  {ruleOfThree ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {categoryType === 'densitometria' 
                          ? (language === 'es' ? 'Masa / DOI Promedio:' : 'Mass / IOD Average:') 
                          : (language === 'es' ? 'Conc / DOI Promedio:' : 'Conc / IOD Average:')}
                      </span>
                      <span className="font-mono font-black text-indigo-700 dark:text-indigo-400">
                        {ruleOfThree.ratio.toExponential(4)} {categoryType === 'densitometria' ? 'u(M)/DOI' : 'u(C)/DOI'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-center py-2">
                      {language === 'es'
                        ? 'Marca al menos 1 estándar para calcular el factor de regla de tres.'
                        : 'Place at least 1 reference standard to resolve rule of three multiplier.'
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Trendline Calibration Plot Visual */}
          {categoryType !== 'zimografia' && (
            <div className="bg-white dark:bg-slate-900 border border-[#E69A5E]/10 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col items-center">
              <span className="block text-[10px] uppercase font-bold text-gray-400 self-start mb-2 tracking-wider">
                📊 {language === 'es' 
                  ? (categoryType === 'densitometria' ? 'Curva de Calibración DOI vs Masa' : 'Curva de Calibración DOI vs Concentración') 
                  : (categoryType === 'densitometria' ? 'IOD vs Mass Calibration' : 'IOD vs Concentration Calibration')}
              </span>
              <div className="w-full flex justify-center bg-[#FFFDF9] dark:bg-slate-950 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800">
                <canvas
                  ref={trendCanvasRef}
                  width={300}
                  height={200}
                  className="w-full h-auto bg-transparent rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Quick selected zone editing context */}
          {selectedZoneId && (() => {
            const z = zones.find(item => item.id === selectedZoneId);
            if (!z) return null;
            return (
              <div className="bg-[#FFFDF9] dark:bg-slate-900 border border-blue-200/50 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>✏️</span> {language === 'es' ? 'Editar Punto Seleccionado' : 'Edit Selected Aperture'}
                  </span>
                  <button
                    onClick={() => handleRemoveZone(z.id)}
                    className="p-1 px-2.5 bg-red-50 text-[#A12312] rounded-xl hover:bg-red-100 font-bold text-[10px] transition-all"
                  >
                    🗑️ {language === 'es' ? 'Eliminar' : 'Delete'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                      {language === 'es' ? 'Etiqueta o Nombre:' : 'Label/Name:'}
                    </label>
                    <input
                      type="text"
                      value={z.label}
                      onChange={(e) => handleZoneLabelChange(z.id, e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    {z.type === 'standard' ? (
                      <>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                          {categoryType === 'densitometria'
                            ? (language === 'es' ? 'Masa Conocida (M):' : 'Known Mass (M):')
                            : (language === 'es' ? 'Concentración Conocida (C):' : 'Reference Concentration (C):')}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={z.concentration ?? ''}
                          onChange={(e) => handleZoneConcChange(z.id, e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none text-xs font-mono font-bold"
                          placeholder="e.g. 50"
                        />
                      </>
                    ) : z.type === 'background' ? (
                      <>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                          {language === 'es' ? 'Fondo Detectado:' : 'Detected Background:'}
                        </label>
                        <div className="p-2 bg-slate-100 dark:bg-slate-950/40 rounded-lg border dark:border-slate-800 font-mono font-bold text-gray-700 dark:text-gray-300">
                          {z.intensity.toFixed(0)} {language === 'es' ? 'DOI' : 'IOD'}
                        </div>
                      </>
                    ) : categoryType === 'zimografia' ? (
                      <>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                          {language === 'es' ? 'Área:' : 'Area:'}
                        </label>
                        <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-150 dark:border-indigo-900/40 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {(z.area ?? calculateGeometricArea(z)).toFixed(1)} px²
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                          {categoryType === 'densitometria'
                            ? (language === 'es' ? 'Masa Estimada (M):' : 'Estimated Mass (M):')
                            : (language === 'es' ? 'Conc. Estimada (C):' : 'Estimated Conc. (C):')}
                        </label>
                        <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-150 dark:border-indigo-900/40 font-mono font-black text-indigo-700 dark:text-indigo-400">
                          {z.estimatedConcentration !== undefined ? `${z.estimatedConcentration.toFixed(2)}` : '-'}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Detailed DOI comparison panel */}
                {z.type !== 'background' && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 grid grid-cols-2 gap-3.5 text-xs">
                    <div className={categoryType === 'zimografia' ? 'col-span-2' : ''}>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        {language === 'es' ? 'Int. Total (DOI Bruto):' : 'Total Int. (Raw IOD):'}
                      </span>
                      <div className="font-mono font-bold text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                        {z.intensity.toFixed(0)} {language === 'es' ? 'DOI' : 'IOD'}
                      </div>
                    </div>
                    {categoryType !== 'zimografia' && (
                      <div>
                        <span className="block text-[10px] font-extrabold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-1">
                          {language === 'es' ? 'DOI Neto (Restando Blanco):' : 'Net IOD (With subtraction):'}
                        </span>
                        <div className="font-mono font-black text-amber-900 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/10 p-2 rounded-lg border border-amber-100/50 dark:border-amber-900/30">
                          {(() => {
                            const bgVal = getAverageBackground(zones);
                            const netVal = Math.max(0, z.intensity - bgVal);
                            return bgVal > 0 
                              ? `${netVal.toFixed(0)} ${language === 'es' ? 'DOI' : 'IOD'} (${language === 'es' ? 'Resta' : 'Sub'} -${bgVal.toFixed(0)})` 
                              : `${z.intensity.toFixed(0)} ${language === 'es' ? 'DOI' : 'IOD'} (${language === 'es' ? 'Sin Blanco' : 'No Blank'})`;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Zones Summary Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-[#E69A5E]/10 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex-grow">
            <span className="block text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
              {language === 'es' ? 'Listado de Zonas de Análisis' : 'Analysed Aperture Zones'}
            </span>

            {zones.length === 0 ? (
              <p className="text-gray-400 italic text-[11px] text-center py-6">
                {language === 'es' ? 'No se han marcado puntos todavía.' : 'No zones marked yet.'}
              </p>
            ) : (
              <div className="overflow-y-auto max-h-[220px] text-[11px] border rounded-2xl dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 uppercase text-[9px] font-black text-gray-400">
                      <th className="p-2">Zona</th>
                      <th className="p-2">Tipo</th>
                      {categoryType === 'zimografia' ? (
                        <>
                          <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Int. Total' : 'Total Int.'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Act. Relativa (%)' : 'Rel. Activity (%)'}</th>
                        </>
                      ) : (
                        <>
                          {categoryType === 'densitometria' && (
                            <>
                              <th className="p-2 text-right">{language === 'es' ? 'Área (px²)' : 'Area (px²)'}</th>
                              <th className="p-2 text-right">{language === 'es' ? 'Int. Media' : 'Mean Int.'}</th>
                            </>
                          )}
                          <th className="p-2 text-right">{language === 'es' ? 'DOI Bruto' : 'Raw IOD'}</th>
                          <th className="p-2 text-right">{language === 'es' ? 'DOI Neto' : 'Net IOD'}</th>
                          <th className="p-2 text-right">
                            {categoryType === 'densitometria' 
                              ? (language === 'es' ? 'Masa (M)' : 'Mass (M)') 
                              : (language === 'es' ? 'Conc. (C)' : 'Conc. (C)')}
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {zones.map((zone) => {
                      const isSelected = selectedZoneId === zone.id;
                      const samples = zones.filter(z => z.type === 'sample');
                      const sIdx = samples.findIndex(z => z.id === zone.id) + 1;
                      const avgBg = getAverageBackground(zones);
                      const netVal = Math.max(0, zone.intensity - avgBg);
                      
                      const computedArea = zone.area ?? calculateGeometricArea(zone);
                      const computedMean = zone.meanIntensity ?? 0;
                      const computedTotal = zone.totalActivity ?? zone.intensity;
                      
                      const controlZone = zones.find(z => z.id === controlZoneId);
                      let relActivityStr = '-';
                      if (controlZone && controlZone.totalActivity) {
                        relActivityStr = ((computedTotal / controlZone.totalActivity) * 100).toFixed(1) + '%';
                      }

                      return (
                        <tr
                          key={zone.id}
                          onClick={() => setSelectedZoneId(zone.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20' 
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="p-2 font-bold text-gray-700 dark:text-gray-300">{zone.label}</td>
                          <td className="p-2 font-semibold">
                            {zone.type === 'standard' ? (
                              <span className="text-purple-600 dark:text-purple-300">Std</span>
                            ) : zone.type === 'background' ? (
                              <span className="text-slate-600 dark:text-slate-400">⚪ {language === 'es' ? 'Fondo/Blanco' : 'Blank'}</span>
                            ) : (
                              <span className="text-red-500">Muestra #{sIdx}</span>
                            )}
                          </td>
                          {categoryType === 'zimografia' ? (
                            <>
                              <td className="p-2 text-right font-mono text-gray-500">{computedArea.toFixed(1)}</td>
                              <td className="p-2 text-right font-mono text-gray-500">{computedMean.toFixed(1)}</td>
                              <td className="p-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400">{computedTotal.toFixed(0)}</td>
                              <td className="p-2 text-right font-mono font-black text-indigo-700 dark:text-indigo-400">
                                {relActivityStr}
                              </td>
                            </>
                          ) : (
                            <>
                              {categoryType === 'densitometria' && (
                                <>
                                  <td className="p-2 text-right font-mono text-gray-500">{computedArea.toFixed(1)}</td>
                                  <td className="p-2 text-right font-mono text-gray-500">{computedMean.toFixed(1)}</td>
                                </>
                              )}
                              <td className="p-2 text-right font-mono text-gray-400">{zone.intensity.toFixed(0)}</td>
                              <td className="p-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                                {zone.type === 'background' ? '-' : netVal.toFixed(0)}
                              </td>
                              <td className="p-2 text-right font-mono font-black text-indigo-700 dark:text-indigo-400">
                                {zone.type === 'standard' ? (
                                  <span>{zone.concentration ?? 'N/A'}</span>
                                ) : zone.type === 'background' ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <span>{zone.estimatedConcentration !== undefined ? zone.estimatedConcentration.toFixed(2) : '-'}</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Zimografía Special Tools: Control Selection, Formulas & Custom Ratios */}
            {categoryType === 'zimografia' && zones.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
                {/* 1. Control Reference Band Selector */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-[#1E3A8A] dark:text-indigo-400 mb-1 tracking-wider">
                    🎯 {language === 'es' ? 'Seleccionar Banda de Control (Referencia %)' : 'Select Control Band (Reference %)'}
                  </label>
                  <select
                    value={controlZoneId || ''}
                    onChange={(e) => setControlZoneId(e.target.value || null)}
                    className="w-full p-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 outline-none font-bold"
                  >
                    <option value="">{language === 'es' ? '-- Ninguna (Sin actividad relativa) --' : '-- None (No relative activity) --'}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label} ({z.type === 'standard' ? 'Std' : z.type === 'background' ? (language === 'es' ? 'Fondo' : 'Blank') : (language === 'es' ? 'Muestra' : 'Sample')}) - Act: {(z.totalActivity ?? z.intensity).toFixed(0)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Custom Comparison Ratios (Cocientes Personalizados) */}
                <div className="bg-slate-50/50 dark:bg-slate-950/45 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/80 space-y-2.5">
                  <span className="block text-[10px] uppercase font-extrabold text-[#1E3A8A] dark:text-indigo-400 tracking-wider">
                    ➗ {language === 'es' ? 'Cocientes Personalizados (Comparar Bandas)' : 'Custom Ratios (Compare Bands)'}
                  </span>
                  
                  {/* Create ratio row */}
                  <div className="flex items-center gap-1.5">
                    <select
                      id="ratio-num-select"
                      className="flex-1 p-1.5 text-[10px] border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 font-bold"
                    >
                      <option value="">{language === 'es' ? 'Numerador' : 'Numerator'}</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.label}</option>
                      ))}
                    </select>
                    <span className="text-gray-400 font-bold">/</span>
                    <select
                      id="ratio-den-select"
                      className="flex-1 p-1.5 text-[10px] border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 font-bold"
                    >
                      <option value="">{language === 'es' ? 'Denominador' : 'Denominator'}</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const numEl = document.getElementById('ratio-num-select') as HTMLSelectElement;
                        const denEl = document.getElementById('ratio-den-select') as HTMLSelectElement;
                        if (numEl && denEl && numEl.value && denEl.value) {
                          if (numEl.value === denEl.value) {
                            alert(language === 'es' ? 'Selecciona bandas diferentes' : 'Select different bands');
                            return;
                          }
                          const newRatio = {
                            id: Math.random().toString(),
                            numId: numEl.value,
                            denId: denEl.value
                          };
                          setCustomRatios(prev => [...prev, newRatio]);
                          numEl.value = '';
                          denEl.value = '';
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer transition-colors shadow-3xs"
                    >
                      +
                    </button>
                  </div>

                  {/* List active ratios */}
                  {customRatios.length > 0 ? (
                    <div className="space-y-1.5 mt-2">
                      {customRatios.map((r) => {
                        const numZ = zones.find(z => z.id === r.numId);
                        const denZ = zones.find(z => z.id === r.denId);
                        if (!numZ || !denZ) return null;
                        const ratioVal = (numZ.totalActivity ?? numZ.intensity) / (denZ.totalActivity ?? denZ.intensity);
                        return (
                          <div key={r.id} className="flex items-center justify-between bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-800 text-[10px] font-mono">
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                              {numZ.label} / {denZ.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-indigo-700 dark:text-indigo-400 text-xs">
                                {ratioVal.toFixed(3)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCustomRatios(prev => prev.filter(x => x.id !== r.id))}
                                className="text-red-500 hover:text-red-700 font-bold p-0.5"
                                title={language === 'es' ? 'Eliminar cociente' : 'Delete ratio'}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic text-center py-1.5">
                      {language === 'es' ? 'No se han configurado cocientes' : 'No custom ratios configured yet'}
                    </p>
                  )}
                </div>

                {/* 3. Formulas and Area Calculations Documentation */}
                <div className="p-3 bg-amber-50/20 dark:bg-slate-900/50 border border-amber-100/30 dark:border-slate-800/80 rounded-2xl text-[10.5px] leading-relaxed space-y-1.5 text-gray-650 dark:text-gray-400">
                  <span className="block font-black text-amber-850 dark:text-amber-400 uppercase text-[9px] tracking-wider mb-1">
                    ℹ️ {language === 'es' ? 'Fórmulas Matemáticas de Área Utilizadas:' : 'Mathematical Area Formulas Used:'}
                  </span>
                  <div className="grid grid-cols-1 gap-1 font-mono text-[9.5px]">
                    <div>• <strong>{language === 'es' ? 'Elipse' : 'Ellipse'}:</strong> π × (a/2) × (b/2)</div>
                    <div>• <strong>{language === 'es' ? 'Rectángulo' : 'Rectangle'}:</strong> a × b</div>
                    <div>• <strong>{language === 'es' ? 'Trapecio' : 'Trapezoid'}:</strong> ((B + b) / 2) × h</div>
                    <div>• <strong>{language === 'es' ? 'Triángulo' : 'Triangle'}:</strong> (B × h) / 2</div>
                    <div>• <strong>{language === 'es' ? 'Rombo' : 'Rhombus'}:</strong> (D × d) / 2</div>
                  </div>
                </div>
              </div>
            )}

            {/* Save & Export Buttons at the very bottom */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-4 shadow-sm mt-auto">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/10 min-h-[44px]"
                >
                  💾 {language === 'es' ? 'Guardar Análisis' : 'Save Analysis'}
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 min-h-[44px]"
                  title={language === 'es' ? 'Descargar como hoja de cálculo Excel (.xlsx)' : 'Download as Excel spreadsheet (.xlsx)'}
                >
                  📊 {language === 'es' ? 'Exportar Excel' : 'Export Excel'}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm min-h-[44px]"
                  title={language === 'es' ? 'Descargar como archivo CSV delimitado' : 'Download as CSV file'}
                >
                  📄 {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E69A5E]/25 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] md:max-h-[75vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-105 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>{categoryType === 'zimografia' ? '⚡' : categoryType === 'densitometria' ? '📊' : '🎨'}</span>{' '}
                {categoryType === 'zimografia'
                  ? (language === 'es' ? '¿Cómo funciona la Zimografía?' : 'How does Zymography work?')
                  : categoryType === 'densitometria'
                  ? (language === 'es' ? '¿Cómo funciona la Densitometría?' : 'How does Densitometry work?')
                  : (language === 'es' ? '¿Cómo funciona la Colorimetría RGV?' : 'How does RGV Colorimetry work?')
                }
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors cursor-pointer text-sm p-1"
                aria-label="Close help modal"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto pr-1 flex-1 space-y-3.5 text-xs text-slate-705 dark:text-slate-300 scrollbar-thin">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl space-y-1.5 border border-blue-100/30">
                <h4 className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                  <span>⚙️</span> {language === 'es' ? '¿Cómo funciona?' : 'How does it work?'}
                </h4>
                <p className="leading-relaxed text-[11px]">
                  {language === 'es' ? (
                    categoryType === 'zimografia' ? (
                      'Este analizador convierte de forma objetiva una fotografía de un gel de zimografía en datos numéricos cuantificables. Procesa los píxeles dentro de la figura seleccionada para calcular la Densidad Óptica Integrada (IOD/DOI) y la actividad relativa respecto a una zona de control.'
                    ) : (
                      'Este analizador convierte de forma objetiva una fotografía de un gel o placa en datos numéricos cuantificables. Procesa los píxeles dentro de la figura seleccionada para calcular la Densidad Óptica Integrada (IOD/DOI). La cantidad de luz absorbida (u oscuridad de la banda) es proporcional a la concentración de la proteína o analito de interés presente.'
                    )
                  ) : (
                    categoryType === 'zimografia' ? (
                      'This analyzer objectively converts a zymography gel photograph into quantifiable numerical data. It processes the pixels inside the selected shape to compute the Integrated Optical Density (IOD/DOI) and relative activity compared to a control zone.'
                    ) : (
                      'This analyzer objectively converts a gel or plate photograph into quantifiable numerical data. It processes the pixels inside the selected shape to compute the Integrated Optical Density (IOD/DOI). The amount of light absorbed (or darkness of the band) is directly proportional to the concentration of the protein or analyte of interest present.'
                    )
                  )}
                </p>
              </div>

              {categoryType === 'doi-analyzer' ? (
                <>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl space-y-1.5 border border-emerald-100/30">
                    <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                      <span>⬜</span> {language === 'es' ? 'Cuantificación de DOI en Escala de Grises:' : 'Grayscale DOI Quantification:'}
                    </h4>
                    <p className="leading-relaxed text-[11px]">
                      {language === 'es' ? (
                        <>
                          La aplicación convierte los píxeles de color de la imagen original a escala de grises usando la fórmula estándar internacional de luminancia:<br/>
                          <code className="block bg-white/60 dark:bg-slate-950/40 p-1.5 rounded-lg mt-1 text-center font-bold text-emerald-800 dark:text-emerald-400">
                            Gris = 0.299R + 0.587G + 0.114B
                          </code>
                          Posteriormente, cuantifica la intensidad promedio o total de gris acumulado en el área de la figura geométrica seleccionada para simular la absorbancia o acumulación global de color.
                        </>
                      ) : (
                        <>
                          The application converts color pixels of the original image into grayscale using the international standard luminance formula:<br/>
                          <code className="block bg-white/60 dark:bg-slate-950/40 p-1.5 rounded-lg mt-1 text-center font-bold text-emerald-800 dark:text-emerald-400">
                            Gray = 0.299R + 0.587G + 0.114B
                          </code>
                          It then quantifies the mean or total gray intensity accumulated inside the selected geometric shape to simulate absorbance or global color accumulation.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-1.5 border border-indigo-100/30">
                    <h4 className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                      <span>🌈</span> {language === 'es' ? 'Cuantificación en Canales Rojo, Verde y Azul:' : 'Red, Green, and Blue Channels Quantification:'}
                    </h4>
                    <p className="leading-relaxed text-[11px]">
                      {language === 'es' ? (
                        'Para los canales específicos (Rojo, Verde o Azul), la aplicación extrae únicamente la componente de color seleccionada (valores de 0 a 255) para cada píxel, descartando la información de los otros dos canales. Esto permite evaluar de forma selectiva tinciones fluorescentes, reacciones cromogénicas o coloraciones específicas que tienen su pico de absorbancia o emisión en una longitud de onda particular, logrando una cuantificación mucho más selectiva y sensible que el análisis global en escala de grises.'
                      ) : (
                        'For specific channels (Red, Green, or Blue), the application extracts only the selected color component (values from 0 to 255) for each pixel, discarding the other two channels. This allows for selective evaluation of fluorescent stains, chromogenic reactions, or specific colorings that have their absorbance or emission peak at a particular wavelength, achieving a much more selective and sensitive quantification than global grayscale analysis.'
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl space-y-1.5 border border-emerald-100/30">
                  <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                    <span>🎨</span> {language === 'es' ? 'Conversión a Escala de Grises:' : 'Grayscale Conversion:'}
                  </h4>
                  <p className="leading-relaxed text-[11px]">
                    {language === 'es' ? (
                      <>
                        Si la imagen es a color, el analizador convierte los píxeles a escala de grises usando la fórmula estándar internacional de luminancia:<br/>
                        <code className="block bg-white/60 dark:bg-slate-950/40 p-1.5 rounded-lg mt-1 text-center font-bold text-emerald-800 dark:text-emerald-400">
                          Gris = 0.299R + 0.587G + 0.114B
                        </code>
                      </>
                    ) : (
                      <>
                        If the image is in color, the analyzer converts pixels to grayscale using the international standard luminance formula:<br/>
                        <code className="block bg-white/60 dark:bg-slate-950/40 p-1.5 rounded-lg mt-1 text-center font-bold text-emerald-800 dark:text-emerald-400">
                          Gray = 0.299R + 0.587G + 0.114B
                        </code>
                      </>
                    )}
                  </p>
                </div>
              )}

              {categoryType !== 'densitometria' && (
                <div className="p-3 bg-amber-50/50 dark:bg-slate-950/40 rounded-xl space-y-1.5 border border-amber-200/20">
                  <h4 className="font-extrabold text-amber-900 dark:text-amber-400 flex items-center gap-1">
                    <span>📐</span> {language === 'es' ? 'Fórmulas Matemáticas de Área:' : 'Mathematical Area Formulas:'}
                  </h4>
                  <div className="leading-relaxed text-[11px] font-mono space-y-1">
                    {language === 'es' ? (
                      <>
                        • <strong>Elipse:</strong> π × (Ancho/2) × (Alto/2)<br/>
                        • <strong>Rectángulo:</strong> Ancho × Alto<br/>
                        • <strong>Trapecio:</strong> ((Base Mayor + Base Menor) / 2) × Alto<br/>
                        • <strong>Triángulo:</strong> (Base × Alto) / 2<br/>
                        • <strong>Rombo:</strong> (Diag. Mayor × Diag. Menor) / 2
                      </>
                    ) : (
                      <>
                        • <strong>Ellipse:</strong> π × (Width/2) × (Height/2)<br/>
                        • <strong>Rectangle:</strong> Width × Height<br/>
                        • <strong>Trapezoid:</strong> ((Top Base + Bottom Base) / 2) × Height<br/>
                        • <strong>Triangle:</strong> (Base × Height) / 2<br/>
                        • <strong>Rhombus:</strong> (Major Diag. × Minor Diag.) / 2
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Int. Total and Int. Media or DOI Bruto and DOI Neto Calculations explanation */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-1.5 border border-indigo-100/30">
                <h4 className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                  <span>🔢</span> {categoryType === 'densitometria' 
                    ? (language === 'es' ? 'Cálculo de DOI Bruto y DOI Neto:' : 'Raw IOD and Net IOD Calculation:')
                    : (language === 'es' ? 'Cálculo de Int. Total e Int. Media:' : 'Total Int. and Mean Int. Calculation:')
                  }
                </h4>
                <div className="leading-relaxed text-[11px] space-y-2">
                  {categoryType === 'densitometria' ? (
                    language === 'es' ? (
                      <>
                        <p>
                          • <strong>Intensidad del Píxel:</strong> Se determina según el canal de color seleccionado (escala de grises o canales individuales R/G/B) en un rango de 0 a 255, donde el valor se invierte para representar la absorbancia o densidad óptica (más oscuro = mayor absorbancia).
                        </p>
                        <p>
                          • <strong>DOI Bruto (Densidad Óptica Integrada Bruta):</strong> Es la sumatoria de las intensidades de todos los píxeles contenidos dentro de la figura geométrica trazada. Representa la cantidad total de luz absorbida (u oscuridad) sin ajustar por el fondo o ruido de la imagen.
                        </p>
                        <p>
                          • <strong>DOI Neto (Densidad Óptica Integrada Neta):</strong> Se obtiene restando la intensidad promedio de las zonas designadas como "Fondo/Blanco" al DOI Bruto de la muestra:
                          <code className="block bg-white/60 dark:bg-slate-950/40 p-1 rounded-md mt-1 text-center font-mono font-bold text-indigo-850 dark:text-indigo-400">
                            DOI Neto = Máx(0, DOI Bruto - (Intensidad_Media_Fondo × Área_Figura))
                          </code>
                          Esto permite una comparación justa y objetiva entre diferentes fotos al eliminar el fondo del soporte o papel.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          • <strong>Pixel Intensity:</strong> Determined based on the selected color channel (grayscale or R/G/B channels) ranging from 0 to 255, inverted to represent absorbance or optical density (darker = higher absorbance).
                        </p>
                        <p>
                          • <strong>Raw IOD (Gross Integrated Optical Density):</strong> The sum of the intensities of all pixels contained within the drawn geometric shape. It represents the raw volume of absorbed light (darkness) before adjusting for background noise.
                        </p>
                        <p>
                          • <strong>Net IOD (Net Integrated Optical Density):</strong> Calculated by subtracting the average intensity of the zones designated as "Fondo/Blanco" from the Raw IOD of the sample:
                          <code className="block bg-white/60 dark:bg-slate-950/40 p-1 rounded-md mt-1 text-center font-mono font-bold text-indigo-800 dark:text-indigo-400">
                            Net IOD = Max(0, Raw IOD - (Average_Background_Intensity × Shape_Area))
                          </code>
                          This enables a fair, objective comparison between different photographs by normalizing background differences.
                        </p>
                      </>
                    )
                  ) : (
                    language === 'es' ? (
                      <>
                        <p>
                          • <strong>Intensidad del Píxel:</strong> Se determina según el canal de color seleccionado (escala de grises, canal rojo, verde o azul) en un rango de 0 a 255.
                        </p>
                        {categoryType === 'zimografia' && (
                          <p>
                            • <strong>Resta del Fondo:</strong> Si se especifica un valor de fondo de zimografía (mediante el gotero o ajuste manual), este valor se resta de la intensidad de cada píxel individual de la figura: 
                            <code className="block bg-white/60 dark:bg-slate-950/40 p-1 rounded-md mt-1 text-center font-mono font-bold text-indigo-850 dark:text-indigo-400">
                              Intensidad_Píxel = Máx(0, Intensidad_Original - Valor_Fondo)
                            </code>
                          </p>
                        )}
                        <p>
                          • <strong>Intensidad Total (Int. Total):</strong> Es la sumatoria de las intensidades de todos los píxeles contenidos dentro del área de la figura geométrica trazada{categoryType === 'zimografia' ? ' (después de restar el fondo, si se ha aplicado)' : ''}.
                        </p>
                        <p>
                          • <strong>Intensidad Media (Int. Media):</strong> Es el promedio aritmético de las intensidades de los píxeles de la figura (Int. Total dividida entre el número total de píxeles contenidos).
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          • <strong>Pixel Intensity:</strong> Determined based on the selected color channel (grayscale, red, green, or blue channel) ranging from 0 to 255.
                        </p>
                        {categoryType === 'zimografia' && (
                          <p>
                            • <strong>Background Subtraction:</strong> If a zymography background value is specified (using the eyedropper or manual input), this value is subtracted from the intensity of each individual pixel in the shape:
                            <code className="block bg-white/60 dark:bg-slate-950/40 p-1 rounded-md mt-1 text-center font-mono font-bold text-indigo-800 dark:text-indigo-400">
                              Pixel_Intensity = Max(0, Original_Intensity - Background_Value)
                            </code>
                          </p>
                        )}
                        <p>
                          • <strong>Total Intensity (Int. Total):</strong> The sum of the intensities of all pixels contained within the boundary of the drawn geometric shape{categoryType === 'zimografia' ? ' (after background subtraction, if applied)' : ''}.
                        </p>
                        <p>
                          • <strong>Mean Intensity (Int. Media):</strong> The arithmetic average of the pixel intensities in the shape (Int. Total divided by the total number of pixels contained).
                        </p>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2 bg-[#E69A5E] hover:bg-[#D48A4A] text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
              >
                {language === 'es' ? 'Aceptar' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConcModal && pendingZone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-purple-500/25 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-105 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🟣</span> {categoryType === 'densitometria' 
                  ? (language === 'es' ? 'Masa del Patrón (M)' : 'Standard Mass (M)') 
                  : (language === 'es' ? 'Concentración del Patrón (C)' : 'Standard Concentration (C)')}
              </h3>
              <button 
                onClick={() => {
                  setShowConcModal(false);
                  setPendingZone(null);
                }}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors cursor-pointer text-sm p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-normal">
                {language === 'es' 
                  ? (categoryType === 'densitometria'
                    ? `Estás colocando el patrón "${pendingZone.label}". Por favor indica su valor o masa conocida (M) para la calibración:`
                    : `Estás colocando el patrón "${pendingZone.label}". Por favor indica su valor o concentración conocida (C) para la calibración:`) 
                  : (categoryType === 'densitometria'
                    ? `You are placing the standard "${pendingZone.label}". Please specify its value or known mass (M) for calibration:`
                    : `You are placing the standard "${pendingZone.label}". Please specify its value or known concentration (C) for calibration:`)}
              </p>
              
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold text-gray-400">
                  {categoryType === 'densitometria'
                    ? (language === 'es' ? 'Masa Conocida (M)' : 'Known Mass (M)')
                    : (language === 'es' ? 'Concentración Conocida (C)' : 'Known Concentration (C)')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={concInputVal}
                  onChange={(e) => setConcInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmAddPendingStandard();
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-850 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                  placeholder="e.g. 10"
                  autoFocus
                />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-850/80 pt-4 mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowConcModal(false);
                  setPendingZone(null);
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold transition-all text-xs cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={confirmAddPendingStandard}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm shadow-purple-600/10"
              >
                {language === 'es' ? 'Aceptar' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
