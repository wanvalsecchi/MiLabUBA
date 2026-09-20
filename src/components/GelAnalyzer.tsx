import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Ficha, GelAnalysis, MarkerBand, Language } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';
import { UbaSealSVG, ConicetIquifibSVG } from './OfficialLogos';
import { safeStorage } from '../storage';

interface GelAnalyzerProps {
  language: Language;
  ficha: Ficha;
  onSaveAnalysis: (analysis: GelAnalysis) => void;
  onBack: () => void;
}

export default function GelAnalyzer({
  language,
  ficha,
  onSaveAnalysis,
  onBack
}: GelAnalyzerProps) {
  const t = translations[language];

  // Active Tool: 'frente' | 'well' | 'marker' | 'sample' | 'none'
  const [activeTool, setActiveTool] = useState<'frente' | 'well' | 'marker' | 'sample' | 'none'>('none');

  // Coordinates fractions (0 to 1) relative to canvas height
  const [pocilloY, setPocilloY] = useState<number | null>(ficha.gelAnalysis?.pocilloY ?? null);
  const [frenteY, setFrenteY] = useState<number | null>(ficha.gelAnalysis?.frenteY ?? null);
  const [bands, setBands] = useState<MarkerBand[]>(ficha.gelAnalysis?.markers ?? []);

  // Regression calculation outcomes
  const [regression, setRegression] = useState<{
    equation: string;
    r2: number;
    slope: number;
    intercept: number;
    isSolvable: boolean;
  } | null>(null);

  // Drawing state pointers
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number, y: number }>>([]);

  // Custom Molecular weight popup configurations
  const [showMwModal, setShowMwModal] = useState(false);
  const [pendingBandY, setPendingBandY] = useState<number | null>(null);
  const [pendingBandRf, setPendingBandRf] = useState<number | null>(null);
  const [pendingBandXStart, setPendingBandXStart] = useState<number | null>(null);
  const [pendingBandXEnd, setPendingBandXEnd] = useState<number | null>(null);
  const [mwInputVal, setMwInputVal] = useState('');

  // Clean printable formal report states and configurations
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null);
  const [trendSnapshot, setTrendSnapshot] = useState<string | null>(null);
  const [savedLogos, setSavedLogos] = useState<Record<string, string>>({});

  const [reportTitle, setReportTitle] = useState(language === 'es' ? 'Reporte Científico de Análisis de Electroforesis' : 'Scientific Electrophoresis Analysis Report');
  const [reportInvestigator, setReportInvestigator] = useState(ficha.investigator || 'Dra./Dr./MSc Investigador Principal');
  const [reportSampleName, setReportSampleName] = useState(ficha.title || 'Muestra Gel #1');
  const [reportComments, setReportComments] = useState(ficha.comments || '');

  useEffect(() => {
    try {
      const stored = safeStorage.getItem('milabuba_logos');
      if (stored) {
        setSavedLogos(JSON.parse(stored));
      }
      
      // Load user preferences dynamically to get scientist investigator name
      const prefsStr = safeStorage.getItem('milabuba_user_prefs');
      if (prefsStr && !ficha.investigator) {
        const parsed = JSON.parse(prefsStr);
        if (parsed?.userName) {
          setReportInvestigator('Dra./Dr./MSc ' + parsed.userName);
        }
      }
    } catch (e) {}
  }, [ficha.investigator]);

  const handleOpenPrintReport = () => {
    if (mainCanvasRef.current) {
      setCanvasSnapshot(mainCanvasRef.current.toDataURL('image/png'));
    }
    if (trendCanvasRef.current) {
      setTrendSnapshot(trendCanvasRef.current.toDataURL('image/png'));
    }
    setIsPrintReportOpen(true);
  };

  // Interactive High-Resolution zoom factor scaling
  const [zoomScale, setZoomScale] = useState(1);
  const [activeFineTuneLine, setActiveFineTuneLine] = useState<'siembra' | 'frente'>('siembra');
  const [isPanning, setIsPanning] = useState(false);
  const [hasPanned, setHasPanned] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);

  // States for expanding the regression plot & viewing the numeric results table
  const [isExpandedGraphOpen, setIsExpandedGraphOpen] = useState(false);
  const expandedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load and fit image inside Canvas
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [selectedBandId, setSelectedBandId] = useState<string | null>(null);
  const [bypassEnhancements, setBypassEnhancements] = useState(false);

  // Concentration Estimation toggles
  const [enableConcMode, setEnableConcMode] = useState(false);
  const [concentrationMethod, setConcentrationMethod] = useState<'regression' | 'ruleOfThree'>('ruleOfThree');
  const [concRegression, setConcRegression] = useState<{
    equation: string;
    r2: number;
    slope: number;
    intercept: number;
    isSolvable: boolean;
  } | null>(null);

  useEffect(() => {
    if (!ficha.image) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      setImgObj(img);
    };
    img.src = ficha.image;
  }, [ficha.image]);

  // Redraw Main Canvas when assets update
  useEffect(() => {
    if (!mainCanvasRef.current || !imgObj) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use full natural dimensions of image so markers don't lose precision on lower screen widths!
    canvas.width = imgObj.naturalWidth || 800;
    canvas.height = imgObj.naturalHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!bypassEnhancements) {
      ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    const w = canvas.width;
    const h = canvas.height;

    // Draw Starting Well Line (Origin)
    if (pocilloY !== null) {
      const py = pocilloY * h;
      ctx.strokeStyle = '#2563EB'; // Blue
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();

      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('WELLS / ORIGEN (Y=0)', 15, py - 10);
    }

    // Draw Run Front Line
    if (frenteY !== null) {
      const fy = frenteY * h;
      ctx.strokeStyle = '#16A34A'; // Green
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(w, fy);
      ctx.stroke();

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('FRONT / FRENTE (Y=1)', 15, fy + 25);
    }

    // Draw Marker & Sample bands (semi-transparent & dashed, localized to exact swiped lanes)
    bands.forEach((band) => {
      const by = band.y * h;
      const isMarker = band.type === 'marker';

      // Use stored xStart/xEnd or fallback to localized lane if undefined (for retro-compatibility)
      const bx1 = band.xStart !== undefined ? band.xStart * w : w * 0.05;
      const bx2 = band.xEnd !== undefined ? band.xEnd * w : (isMarker ? w * 0.15 : w * 0.95);

      const isSelected = selectedBandId === band.id;

      if (isSelected) {
        ctx.strokeStyle = '#2563EB'; // Solid blue for visual selection indicator
        ctx.lineWidth = 4.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = isMarker ? 'rgba(225, 29, 72, 0.7)' : 'rgba(217, 119, 6, 0.7)'; // Semi-transparent Red vs Orange
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]); // Draw dashed horizontal line over the lane/swiped range
      }
      
      ctx.beginPath();
      ctx.moveTo(bx1, by);
      ctx.lineTo(bx2, by);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // If Concentration Estimation is enabled, draw the rectangle of known area integration
      if (enableConcMode) {
        const bandHeight = Math.max(10, Math.floor(h * 0.03));
        const byStart = by - bandHeight / 2;
        ctx.fillStyle = band.isStandardForConc ? 'rgba(37, 99, 235, 0.12)' : 'rgba(217, 119, 6, 0.08)';
        ctx.strokeStyle = band.isStandardForConc ? 'rgba(37, 99, 235, 0.8)' : 'rgba(217, 119, 6, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillRect(bx1, byStart, bx2 - bx1, bandHeight);
        ctx.strokeRect(bx1, byStart, bx2 - bx1, bandHeight);
      }

      // Draw subtle terminal ticks at boundaries to frame the lane nicely
      ctx.strokeStyle = isSelected ? '#1E3A8A' : (isMarker ? 'rgba(225, 29, 72, 0.85)' : 'rgba(217, 119, 6, 0.85)');
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(bx1, by - 5);
      ctx.lineTo(bx1, by + 5);
      ctx.moveTo(bx2, by - 5);
      ctx.lineTo(bx2, by + 5);
      ctx.stroke();

      // Label text only (no background box, with clean outline for readability on all gel tones)
      const labelX = Math.max(10, Math.min(bx1, w - 45));
      ctx.font = 'bold 12px monospace';
      
      let text = '';
      if (isMarker) {
        const markerBands = bands.filter((b) => b.type === 'marker');
        const mIdx = markerBands.findIndex((b) => b.id === band.id) + 1;
        text = `M${mIdx}`;
      } else {
        const sampleBands = bands.filter((b) => b.type === 'sample');
        const sIdx = sampleBands.findIndex((b) => b.id === band.id) + 1;
        if (enableConcMode && band.isStandardForConc) {
          text = `P${sIdx}*`;
        } else {
          text = `P${sIdx}`;
        }
      }

      // Thin dark outline for extreme legibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, labelX, by - 12);
      
      ctx.fillStyle = isMarker ? '#F43F5E' : '#F59E0B'; // Highlight Marker as bright Pink-Red and Sample as Amber
      ctx.fillText(text, labelX, by - 12);
    });

    // Draw currently drawing drag stroke
    if (isDrawingStroke && currentStroke.length >= 2) {
      ctx.strokeStyle = activeTool === 'marker' ? '#E11D48' : '#D97706';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x * w, currentStroke[0].y * h);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x * w, currentStroke[i].y * h);
      }
      ctx.stroke();
    }
  }, [imgObj, pocilloY, frenteY, bands, activeTool, isDrawingStroke, currentStroke, ficha.categoryId, contrast, brightness, enableConcMode, bypassEnhancements]);

  // Integrated pixel intensity/optical density (DOI) math solver
  const calculateBandDOI = (yFraction: number, xStartFraction: number, xEndFraction: number) => {
    if (!imgObj || !mainCanvasRef.current) return 0;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    
    const pxXStart = Math.max(0, Math.floor(xStartFraction * canvas.width));
    const pxXEnd = Math.min(canvas.width, Math.ceil(xEndFraction * canvas.width));
    
    // Band height thickness around 3% of canvas height
    const bandHeight = Math.max(8, Math.floor(canvas.height * 0.03));
    const centerY = Math.floor(yFraction * canvas.height);
    const pxYStart = Math.max(0, centerY - Math.floor(bandHeight / 2));
    const pxYEnd = Math.min(canvas.height, centerY + Math.ceil(bandHeight / 2));
    
    const w = pxXEnd - pxXStart;
    const h = pxYEnd - pxYStart;
    if (w <= 0 || h <= 0) return 0;
    
    try {
      const imgData = ctx.getImageData(pxXStart, pxYStart, w, h);
      let totalIntensitySum = 0;
      
      // Sample background corners to distinguish dark-on-light vs light-on-dark polarity
      let bgSampleSum = 0;
      let bgSampleCount = 0;
      for (let row = 0; row < h; row += Math.max(1, Math.floor(h/3))) {
        const idLeft = row * w * 4;
        const idRight = (row * w + (w - 1)) * 4;
        if (idLeft < imgData.data.length && idRight < imgData.data.length) {
          bgSampleSum += (imgData.data[idLeft] + imgData.data[idLeft+1] + imgData.data[idLeft+2])/3;
          bgSampleSum += (imgData.data[idRight] + imgData.data[idRight+1] + imgData.data[idRight+2])/3;
          bgSampleCount += 2;
        }
      }
      
      const avgBg = bgSampleSum / (bgSampleCount || 1);
      const isDarkBandOnLightBg = avgBg > 120; // light background, dark bands
      
      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i+1];
        const b = imgData.data[i+2];
        
        const pixelValue = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const val = isDarkBandOnLightBg ? (255 - pixelValue) : pixelValue;
        totalIntensitySum += val;
      }
      
      return Math.round(totalIntensitySum);
    } catch (err) {
      console.error('Error calculating DOI:', err);
      return 0;
    }
  };

  // Recalculate Rf values for bands when wells or front alters
  const computeRf = (y: number, wellYVal: number | null, frenteYVal: number | null): number => {
    if (wellYVal === null || frenteYVal === null) return 0;
    const totalDistance = Math.abs(frenteYVal - wellYVal);
    if (totalDistance === 0) return 0;
    return Math.abs(y - wellYVal) / totalDistance;
  };

  // Touch and Mouse pointer location translations
  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current) return null;
    const canvas = mainCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coordinates back into fractional values (0 to 1) relative to canvas size
    const xFraction = (clientX - rect.left) / rect.width;
    const yFraction = (clientY - rect.top) / rect.height;

    return { yFraction, xFraction };
  };

  const handlePanStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (zoomScale <= 1 || activeTool !== 'none') return;
    const container = e.currentTarget;
    const clientX = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientX : 0) 
      : e.clientX;
    const clientY = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientY : 0) 
      : e.clientY;

    if (clientX === 0 && clientY === 0) return;

    setIsPanning(true);
    setHasPanned(false);
    setPanStart({
      x: clientX,
      y: clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    });
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isPanning || zoomScale <= 1 || activeTool !== 'none') return;
    const container = e.currentTarget;
    const clientX = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientX : 0) 
      : e.clientX;
    const clientY = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientY : 0) 
      : e.clientY;

    if (clientX === 0 && clientY === 0) return;

    const dx = clientX - panStart.x;
    const dy = clientY - panStart.y;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      setHasPanned(true);
    }

    container.scrollLeft = panStart.scrollLeft - dx;
    container.scrollTop = panStart.scrollTop - dy;
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') {
      const coords = getMouseCoords(e);
      if (!coords) return;
      // Find a band close to the click vertically and horizontally
      const clickedBand = bands.find((b) => {
        const yDiff = Math.abs(b.y - coords.yFraction);
        const xs = b.xStart !== undefined ? b.xStart : 0.05;
        const xe = b.xEnd !== undefined ? b.xEnd : (b.type === 'marker' ? 0.15 : 0.95);
        const isWithinX = coords.xFraction >= Math.min(xs, xe) - 0.06 && coords.xFraction <= Math.max(xs, xe) + 0.06;
        return yDiff < 0.025 && isWithinX;
      });
      if (clickedBand) {
        setSelectedBandId(clickedBand.id);
      } else {
        setSelectedBandId(null);
      }
      return;
    }
    const coords = getMouseCoords(e);
    if (!coords) return;

    if (activeTool === 'well') {
      setPocilloY(coords.yFraction);
      setActiveTool('none');
    } else if (activeTool === 'frente') {
      setFrenteY(coords.yFraction);
      setActiveTool('none');
    } else if (activeTool === 'marker' || activeTool === 'sample') {
      if (pocilloY === null || frenteY === null) {
        alert(language === 'es' 
          ? 'Por favor, marca primero los pocillos (origen) y el frente de corrida.' 
          : 'Please mark the wells line and the running front first.');
        setActiveTool('none');
        return;
      }
      setIsDrawingStroke(true);
      setCurrentStroke([{ x: coords.xFraction, y: coords.yFraction }]);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingStroke) return;
    const coords = getMouseCoords(e);
    if (!coords) return;

    setCurrentStroke((prev) => [...prev, { x: coords.xFraction, y: coords.yFraction }]);
    e.preventDefault(); // blocks browser scroll dragging behavior
  };

  const handlePointerUp = () => {
    if (!isDrawingStroke) return;
    setIsDrawingStroke(false);

    if (currentStroke.length > 0 && pocilloY !== null && frenteY !== null) {
      // Calculate average Y of stroke
      const avgY = currentStroke.reduce((sum, pt) => sum + pt.y, 0) / currentStroke.length;
      const rf = computeRf(avgY, pocilloY, frenteY);

      // Extract horizontal range of swipe
      const xs = currentStroke.map((pt) => pt.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const centerX = (minX + maxX) / 2;

      let xStart = minX;
      let xEnd = maxX;

      // Expand narrow inputs (like taps or vertical strokes) to reasonable lane width
      if (xEnd - xStart < 0.06) {
        xStart = Math.max(0.01, centerX - 0.035);
        xEnd = Math.min(0.99, centerX + 0.035);
      } else {
        xStart = Math.max(0.01, xStart - 0.015);
        xEnd = Math.min(0.99, xEnd + 0.015);
      }

      if (activeTool === 'marker') {
        setPendingBandY(avgY);
        setPendingBandRf(rf);
        setPendingBandXStart(xStart);
        setPendingBandXEnd(xEnd);
        setMwInputVal('100'); // default initial suggestion
        setShowMwModal(true);
      } else if (activeTool === 'sample') {
        const calculatedDoi = calculateBandDOI(avgY, xStart, xEnd);
        const newBand: MarkerBand = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'sample',
          y: avgY,
          rf,
          label: 'Sample',
          xStart,
          xEnd,
          doi: calculatedDoi
        };

        setBands((prev) => [...prev, newBand]);
      }
    }

    setCurrentStroke([]);
  };

  // Undo last marked line
  const handleUndo = () => {
    if (bands.length > 0) {
      setBands((prev) => prev.slice(0, prev.length - 1));
    } else if (frenteY !== null) {
      setFrenteY(null);
    } else if (pocilloY !== null) {
      setPocilloY(null);
    }
  };

  // Delete a specific annotated band
  const handleDeleteBand = (id: string) => {
    setBands((prev) => prev.filter((b) => b.id !== id));
  };

  const adjustBandPosition = (id: string, dx: number, dy: number) => {
    setBands((prev) => {
      const updated = prev.map((b) => {
        if (b.id === id) {
          const nextY = Math.max(0, Math.min(1, b.y + dy));
          const xs = b.xStart !== undefined ? b.xStart : 0.05;
          const xe = b.xEnd !== undefined ? b.xEnd : (b.type === 'marker' ? 0.15 : 0.95);
          const nextXStart = Math.max(0, Math.min(1, xs + dx));
          const nextXEnd = Math.max(0, Math.min(1, xe + dx));
          
          const nextRf = computeRf(nextY, pocilloY || 0, frenteY || 1);
          const nextDoi = calculateBandDOI(nextY, nextXStart, nextXEnd);
          
          return {
            ...b,
            y: nextY,
            xStart: nextXStart,
            xEnd: nextXEnd,
            rf: nextRf,
            doi: nextDoi
          };
        }
        return b;
      });

      // Recalculate regression on-the-fly if regression is active
      if (regression) {
        const markerBands = updated.filter((b) => b.type === 'marker' && b.mw !== undefined);
        if (markerBands.length >= 2) {
          const points = markerBands.map((band) => ({
            x: band.rf,
            y: Math.log10(band.mw as number)
          }));
          const n = points.length;
          const sumX = points.reduce((s, p) => s + p.x, 0);
          const sumY = points.reduce((s, p) => s + p.y, 0);
          const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
          const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
          const meanX = sumX / n;
          const meanY = sumY / n;
          const numSlope = sumXY - n * meanX * meanY;
          const denSlope = sumXX - n * meanX * meanX;
          if (denSlope !== 0) {
            const slope = numSlope / denSlope;
            const intercept = meanY - slope * meanX;
            // Map predictions for samples on the fly!
            return updated.map((band) => {
              if (band.type === 'sample') {
                const logMw = slope * band.rf + intercept;
                return {
                  ...band,
                  predictedMw: Math.pow(10, logMw)
                };
              }
              return band;
            });
          }
        }
      }
      return updated;
    });
  };

  const adjustBandY = (id: string, delta: number) => {
    adjustBandPosition(id, 0, delta);
  };

  // Directly edit Molecular Weight of a marker band from the table list
  const handleEditMarkerMw = (id: string, newMw: number) => {
    setBands((prev) => prev.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          mw: newMw,
          label: `M: ${newMw}`
        };
      }
      return b;
    }));
  };

  // Reset entire analysis
  const handleReset = () => {
    if (window.confirm(language === 'es' ? '¿Quieres borrar todas las marcas?' : 'Clear all markings?')) {
      setPocilloY(null);
      setFrenteY(null);
      setBands([]);
      setRegression(null);
    }
  };

  // REGRESSION MATH: log10(MW) = a * Rf + b
  const handleCalculateRegression = () => {
    const markerBands = bands.filter((b) => b.type === 'marker' && b.mw !== undefined);
    
    if (markerBands.length < 2) {
      alert(t.regressionErr);
      return;
    }

    // Convert MW to Log10(MW)
    const points = markerBands.map((band) => ({
      x: band.rf,
      y: Math.log10(band!.mw as number)
    }));

    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const sumYY = points.reduce((s, p) => s + p.y * p.y, 0);

    const meanX = sumX / n;
    const meanY = sumY / n;

    // Ordinary Least Squares slope and intercept formulas
    const numSlope = sumXY - n * meanX * meanY;
    const denSlope = sumXX - n * meanX * meanX;

    if (denSlope === 0) {
      alert(language === 'es' ? 'Error: La inclinación no puede calcularse.' : 'Slope calculation failed due to division by zero.');
      return;
    }

    const slope = numSlope / denSlope;
    const intercept = meanY - slope * meanX;

    // Pearson Correlation coefficient
    const numeratorCorr = n * sumXY - sumX * sumY;
    const denominatorCorr = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const r = denominatorCorr !== 0 ? numeratorCorr / denominatorCorr : 0;
    const r2 = r * r;

    const equation = `log10(PM) = (${slope.toFixed(4)}) * Rf + (${intercept.toFixed(4)})`;

    setRegression({
      equation,
      r2,
      slope,
      intercept,
      isSolvable: true
    });

    // Solve and predict molecular weight for any Sample bands
    const updatedBands = bands.map((band) => {
      if (band.type === 'sample') {
        const logMw = slope * band.rf + intercept;
        const predictedMw = Math.pow(10, logMw);
        return {
          ...band,
          predictedMw
        };
      }
      return band;
    });

    setBands(updatedBands);
  };

  // Concentration math solvers: Regression calibration OLS & Single pattern rule-of-three
  const handleCalculateConcentration = () => {
    // 1. Recalculate DOI for all bands if missing
    const updatedBandsWithDoi = bands.map((b) => ({
      ...b,
      doi: b.doi || calculateBandDOI(
        b.y, 
        b.xStart !== undefined ? b.xStart : 0.05, 
        b.xEnd !== undefined ? b.xEnd : (b.type === 'marker' ? 0.15 : 0.95)
      )
    }));

    const standards = updatedBandsWithDoi.filter((b) => b.isStandardForConc && b.concentration !== undefined && !isNaN(b.concentration));

    if (concentrationMethod === 'regression') {
      if (standards.length < 2) {
        alert(language === 'es' 
          ? 'Por favor, indique al menos 2 bandas patrón con su concentración para trazar la curva de calibración.' 
          : 'Please indicate at least 2 standard bands with concentration to build the standard calibration curve.');
        return;
      }

      const n = standards.length;
      let sumX = 0; // DOI
      let sumY = 0; // Concentration
      let sumXX = 0;
      let sumYY = 0;
      let sumXY = 0;

      standards.forEach((b) => {
        const xVal = b.doi || 0;
        const yVal = b.concentration || 0;
        sumX += xVal;
        sumY += yVal;
        sumXX += xVal * xVal;
        sumYY += yVal * yVal;
        sumXY += xVal * yVal;
      });

      const meanX = sumX / n;
      const meanY = sumY / n;

      const numSlope = sumXY - n * meanX * meanY;
      const denSlope = sumXX - n * meanX * meanX;

      if (denSlope === 0) {
        alert(language === 'es' ? 'Error: No se pudo resolver la curva de calibración (pendiente indefinida).' : 'Error: Division by zero preparing calibration curve.');
        return;
      }

      const slope = numSlope / denSlope;
      const intercept = meanY - slope * meanX;

      // Pearson correlation coeff
      const numeratorCorr = n * sumXY - sumX * sumY;
      const denominatorCorr = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
      const r = denominatorCorr !== 0 ? numeratorCorr / denominatorCorr : 0;
      const r2 = r * r;

      const equation = `Conc = (${slope.toExponential(4)}) * DOI + (${intercept.toFixed(4)})`;

      setConcRegression({
        equation,
        r2,
        slope,
        intercept,
        isSolvable: true
      });

      // Solve concentrations for other sample/marker bands
      const solvedBands = updatedBandsWithDoi.map((b) => {
        if (!b.isStandardForConc) {
          const rawConc = slope * (b.doi || 0) + intercept;
          return {
            ...b,
            estimatedConcentration: Math.max(0, rawConc)
          };
        }
        return b;
      });

      setBands(solvedBands);
      alert(language === 'es' ? 'Concentraciones estimadas por curva de calibración.' : 'Concentrations estimated using OLS calibration curve.');
    } else {
      // ruleOfThree
      if (standards.length === 0) {
        alert(language === 'es'
          ? 'Por favor, marque al menos 1 banda como "Estándar Conc." e ingrese su concentración.'
          : 'Please check at least 1 band as "Estándar Conc." and input its concentration.');
        return;
      }

      const patt = standards[0];
      const DOIp = patt.doi || 1;
      const Cp = patt.concentration || 0;

      if (DOIp === 0) {
        alert(language === 'es' ? 'Error: La densidad óptica del patrón es cero.' : 'Error: Standard band intensity integrates to zero.');
        return;
      }

      setConcRegression(null);

      const solvedBands = updatedBandsWithDoi.map((b) => {
        if (b.id !== patt.id) {
          const DOIi = b.doi || 0;
          const val = (DOIi * Cp) / DOIp;
          return {
            ...b,
            estimatedConcentration: val
          };
        }
        return b;
      });

      setBands(solvedBands);
      alert(language === 'es' ? 'Concentraciones estimadas por regla de tres de un punto.' : 'Concentrations estimated using single-point standard rule of three.');
    }
  };

  // Clean modular function to draw the linear regression and standard curve on any HTML5 canvas
  const drawRegressionOnCanvas = (canvas: HTMLCanvasElement, isLarge: boolean) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dynamic padding adjustments
    const pad = isLarge ? 55 : 35;

    // Draw background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, w, h);

    // Draw borders/axes
    ctx.strokeStyle = '#3E2A1F';
    ctx.lineWidth = isLarge ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#3E2A1F';
    ctx.font = isLarge ? 'bold 12px monospace' : '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Rf (Rel. Migration)', w / 2, h - (isLarge ? 12 : 8));

    ctx.save();
    ctx.translate(isLarge ? 16 : 12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log10(MW)', 0, 0);
    ctx.restore();

    // Find Min and Max limits to lock plot mapping
    const markerBands = bands.filter((b) => b.type === 'marker' && b.mw !== undefined);
    const sampleBands = bands.filter((b) => b.type === 'sample' && b.predictedMw !== undefined);

    const allPts = [
      ...markerBands.map((b) => ({ x: b.rf, y: Math.log10(b.mw as number) })),
      ...sampleBands.map((b) => ({ x: b.rf, y: Math.log10(b.predictedMw ?? 1) }))
    ];

    if (allPts.length === 0 || !regression) return;

    const minX = 0;
    const maxX = 1;
    
    // Find min/max Y to center line beautifully style
    let minY = Math.min(...allPts.map((p) => p.y));
    let maxY = Math.max(...allPts.map((p) => p.y));

    // Pad Y extremes a little bit
    minY = minY - 0.2;
    maxY = maxY + 0.2;

    const mapX = (rx: number) => pad + ((rx - minX) / (maxX - minX)) * (w - 2 * pad);
    const mapY = (ry: number) => h - pad - ((ry - minY) / (maxY - minY)) * (h - 2 * pad);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(230, 154, 94, 0.15)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    for (let currentX = 0.1; currentX <= 1; currentX += 0.1) {
      ctx.moveTo(mapX(currentX), pad);
      ctx.lineTo(mapX(currentX), h - pad);
    }
    // Also horizontal grid lines for large graph
    if (isLarge) {
      const stepY = (maxY - minY) / 6;
      for (let i = 1; i <= 5; i++) {
        const valY = minY + i * stepY;
        ctx.moveTo(pad, mapY(valY));
        ctx.lineTo(w - pad, mapY(valY));
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the regression line
    const startXVal = 0;
    const endXVal = 1;
    const startYVal = regression.slope * startXVal + regression.intercept;
    const endYVal = regression.slope * endXVal + regression.intercept;

    ctx.strokeStyle = '#3E2A1F';
    ctx.lineWidth = isLarge ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(mapX(startXVal), mapY(startYVal));
    ctx.lineTo(mapX(endXVal), mapY(endYVal));
    ctx.stroke();

    // Plot known marker points as RED solid dots with index
    markerBands.forEach((b, i) => {
      const rx = b.rf;
      const ry = Math.log10(b.mw as number);
      ctx.fillStyle = '#E11D48'; // Red
      ctx.beginPath();
      ctx.arc(mapX(rx), mapY(ry), isLarge ? 7 : 5, 0, 2 * Math.PI);
      ctx.fill();

      // label
      ctx.fillStyle = '#3E2A1F';
      ctx.font = isLarge ? 'bold 10.5px monospace' : '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.mw ? `M${i+1}:${b.mw}` : '', mapX(rx), mapY(ry) - (isLarge ? 11 : 8));
    });

    // Plot projected problem sample points as ORANGE hollow circles
    const sampleBandsFull = bands.filter((b) => b.type === 'sample');
    sampleBands.forEach((b) => {
      const rx = b.rf;
      const ry = Math.log10(b.predictedMw as number);
      const sIdx = sampleBandsFull.findIndex((x) => x.id === b.id) + 1;

      ctx.strokeStyle = '#D97706'; // Orange
      ctx.lineWidth = isLarge ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(mapX(rx), mapY(ry), isLarge ? 8 : 6, 0, 2 * Math.PI);
      ctx.stroke();

      // Filled inner
      ctx.fillStyle = '#FFFDF9';
      ctx.beginPath();
      ctx.arc(mapX(rx), mapY(ry), isLarge ? 4 : 3, 0, 2 * Math.PI);
      ctx.fill();

      // label
      ctx.fillStyle = '#D97706';
      ctx.font = isLarge ? 'bold 11px monospace' : 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.predictedMw ? `P${sIdx}:${b.predictedMw.toFixed(0)}` : '', mapX(rx), mapY(ry) - (isLarge ? 12 : 9));
    });
  };

  // Render trend line graph on ancillary canvases
  useEffect(() => {
    if (regression) {
      if (trendCanvasRef.current) {
        drawRegressionOnCanvas(trendCanvasRef.current, false);
      }
      if (expandedCanvasRef.current) {
        drawRegressionOnCanvas(expandedCanvasRef.current, true);
      }
    }
  }, [regression, bands, isExpandedGraphOpen]);

  const getAnalysisExportData = () => {
    const isAdn = ficha.categoryId === 'adn';
    const analysisName = isAdn 
      ? (language === 'es' ? 'Análisis de Electroforesis de ADN' : 'DNA Electrophoresis Analysis')
      : (language === 'es' ? 'Análisis de Electroforesis SDS-PAGE' : 'SDS-PAGE Electrophoresis Analysis');
    const unitLabel = isAdn ? 'pb' : 'kDa';

    const metaRows: (string | number)[][] = [
      [analysisName, ''],
      [language === 'es' ? 'Ficha / Título' : 'Card / Title', ficha.title],
      [language === 'es' ? 'Fecha de Análisis' : 'Analysis Date', new Date().toLocaleString()],
    ];

    if (pocilloY !== null) {
      metaRows.push([language === 'es' ? 'Inicio de Gel (siembra Y)' : 'Gel Origin (Well Y)', parseFloat(pocilloY.toFixed(4))]);
    }
    if (frenteY !== null) {
      metaRows.push([language === 'es' ? 'Frente de Corrida (Y)' : 'Migration Front (Y)', parseFloat(frenteY.toFixed(4))]);
    }
    if (regression) {
      metaRows.push([language === 'es' ? 'Ecuación de Calibración' : 'Calibration Equation', regression.equation]);
      metaRows.push([language === 'es' ? 'Coeficiente R²' : 'R² Coefficient', parseFloat(regression.r2.toFixed(4))]);
    }
    if (concRegression) {
      metaRows.push([language === 'es' ? 'Ecuación de Concentración' : 'Concentration Equation', concRegression.equation]);
      metaRows.push([language === 'es' ? 'Coeficiente R² (Conc)' : 'R² Coefficient (Conc)', parseFloat(concRegression.r2.toFixed(4))]);
    }

    const mainTableHeaders = [
      language === 'es' ? 'N° Banda' : 'Band #',
      language === 'es' ? 'Tipo de Banda' : 'Band Type',
      'Rf',
      isAdn
        ? (language === 'es' ? `Tamaño (${unitLabel})` : `Size (${unitLabel})`)
        : (language === 'es' ? `Peso Molecular (${unitLabel})` : `Molecular Weight (${unitLabel})`),
      language === 'es' ? 'Estado' : 'Status',
      'X Inicio',
      'X Fin',
      'Y Centro'
    ];

    const sampleBands = bands.filter((b) => b.type === 'sample');

    const mainTableRows = bands.map((b, idx) => {
      let typeLabel = '';
      let mwVal: string | number = '-';
      let statusLabel = '';

      if (b.type === 'marker') {
        typeLabel = language === 'es' ? 'Marcador Patrón' : 'Standard Marker';
        mwVal = b.mw !== undefined ? b.mw : '-';
        statusLabel = language === 'es' ? 'Patrón Conocido' : 'Known Standard';
      } else {
        const sIdx = sampleBands.findIndex((s) => s.id === b.id) + 1;
        typeLabel = `${language === 'es' ? 'Muestra Incógnita' : 'Sample'} #${sIdx}`;
        mwVal = b.predictedMw !== undefined ? parseFloat(b.predictedMw.toFixed(2)) : '-';
        statusLabel = b.predictedMw !== undefined ? (language === 'es' ? 'Calculado por Regresión' : 'Calculated via Regression') : (language === 'es' ? 'Pendiente' : 'Pending');
      }

      return [
        idx + 1,
        typeLabel,
        parseFloat(b.rf.toFixed(4)),
        mwVal,
        statusLabel,
        parseFloat((b.xStart ?? 0).toFixed(4)),
        parseFloat((b.xEnd ?? 0).toFixed(4)),
        parseFloat(b.y.toFixed(4))
      ];
    });

    const fileBaseName = `PAGE_${ficha.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

    return {
      fileBaseName,
      metaRows,
      mainTableHeaders,
      mainTableRows
    };
  };

  const handleExportExcel = () => {
    const { fileBaseName, metaRows, mainTableHeaders, mainTableRows } = getAnalysisExportData();
    const sheetData: any[][] = [
      ...metaRows,
      [],
      mainTableHeaders,
      ...mainTableRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 22 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PAGE Electroforesis');
    XLSX.writeFile(wb, `${fileBaseName}.xlsx`);
  };

  const handleExportCSV = () => {
    const { fileBaseName, metaRows, mainTableHeaders, mainTableRows } = getAnalysisExportData();
    
    let csv = '';
    metaRows.forEach((row) => {
      csv += `"${row[0]}";"${row[1] !== undefined ? row[1] : ''}"\n`;
    });
    csv += `\n`;
    
    csv += mainTableHeaders.map((h) => `"${h}"`).join(';') + '\n';
    mainTableRows.forEach((row) => {
      csv += row.map((c) => `"${c}"`).join(';') + '\n';
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileBaseName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lock and save analysis details onto sheet state
  const handleSaveBtnClick = () => {
    if (bands.length === 0) {
      alert(language === 'es' ? 'Por favor marque al menos una banda primero.' : 'Please mark at least one band first.');
      return;
    }

    const gelAnalysis: GelAnalysis = {
      analysisDate: new Date().toISOString(),
      equation: regression?.equation || (concRegression?.equation || ''),
      r2: regression?.r2 || (concRegression?.r2 || 0),
      frenteY: frenteY || 1,
      pocilloY: pocilloY || 0,
      markers: bands
    };

    onSaveAnalysis(gelAnalysis);
    alert(language === 'es' ? 'Análisis guardado exitosamente.' : 'Analysis saved successfully.');
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:px-8 text-slate-900 flex flex-col justify-between print:hidden">
      <div className="w-full max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-lg p-4 md:p-6">
        
        {/* Navigation back and title header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl transition-all min-h-[44px] cursor-pointer"
          >
            ⬅️ {t.back}
          </button>
          
          <h2 className="text-sm md:text-base font-black flex items-center gap-1.5 text-[#1E3A8A] font-mono">
            <span>🔬</span> {t.gelAnalyzerTitle} 
            <span className="text-[10px] bg-blue-50 text-[#1E3A8A] border border-blue-100 px-2.5 py-0.5 rounded-full font-bold ml-1 uppercase">
              {ficha.title}
            </span>
          </h2>

          <div className="flex gap-2 items-center">
            <ThemeToggle />
          </div>
        </div>

        {/* User Assistant helper label hint */}
        <div className="bg-amber-50 border border-amber-200 text-[#3E2A1F] p-3 rounded-2xl mb-4 text-xs">
          <p className="font-semibold flex items-center gap-1">
            💡 {language === 'es' ? 'Paso a paso para calcular pesos moleculares:' : 'Step-by-step molecular weights estimator:'}
          </p>
          <ul className="list-decimal list-inside space-y-1 mt-1.5 pl-1 inline-block text-[11px] md:text-xs">
            <li>{language === 'es' ? 'Toca "Indicar inicio de gel (siembra)" y clica el origen de corrida del gel.' : 'Tap "Indicar inicio de gel (siembra)" and click on the start well slots line.'}</li>
            <li>{language === 'es' ? 'Toca "Indicar frente de corrida" y clica el límite final de corrida.' : 'Tap "Indicar frente de corrida" and click the run boundary at the bottom.'}</li>
            <li>{language === 'es' ? 'Toca "Marcar banda marcador" y dibuja encima de un marcador. Pon su MW en el prompt.' : 'Tap "Mark marker band", drag across a marker band, and feed its MW into the dialog.'} (mínimo 2).</li>
            <li>{language === 'es' ? 'Toca "Marcar banda problema" y dibuja encima de tus bandas de muestra.' : 'Tap "Mark sample band" and swipe across targets you want to estimate.'}</li>
            <li>{language === 'es' ? 'Por último clica "Calcular regresión". Verás el diagrama de calibración.' : 'Finally, tap "Calculate regression" to solve equations and map the trendline.'}</li>
          </ul>
        </div>

        {/* Analysis tool control center panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="md:col-span-3 space-y-3">
            {/* Interactive Image Filters (Contrast/Brightness for ghost bands visualization) */}
            <div className="flex flex-col gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              
              {/* Bypass Control Header */}
              <div className="flex flex-wrap items-center justify-end gap-3 pb-2 border-b border-zinc-100">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={bypassEnhancements}
                    onChange={(e) => setBypassEnhancements(e.target.checked)}
                    className="rounded text-blue-600 border-slate-300 focus:ring-blue-400 cursor-pointer h-3.5 w-3.5"
                  />
                  <span>⚠️ {language === 'es' ? 'Deshabilitar ajuste' : 'Disable Adjustments'}</span>
                </label>
              </div>

              <div className={`flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full transition-opacity ${bypassEnhancements ? 'opacity-40' : ''}`}>
                {/* Contrast Slider */}
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 min-w-[70px]" title={language === 'es' ? 'Contraste para ver bandas tenues' : 'Contrast to reveal faint bands'}>
                    🌓 {language === 'es' ? 'Contraste:' : 'Contrast:'}
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1 cursor-pointer accent-[#1E3A8A] h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-10 text-center">
                    {contrast}%
                  </span>
                </div>

                {/* Brightness Slider */}
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 min-w-[70px]">
                    ☀️ {language === 'es' ? 'Brillo:' : 'Brightness:'}
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1 cursor-pointer accent-[#1E3A8A] h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-10 text-center">
                    {brightness}%
                  </span>
                </div>

                {/* Reset button */}
                {(contrast !== 100 || brightness !== 100) && (
                  <button
                    type="button"
                    onClick={() => { setContrast(100); setBrightness(100); }}
                    className="text-[10px] items-center gap-1 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer self-start md:self-auto"
                  >
                    🔄 {language === 'es' ? 'Restablecer Filtros' : 'Reset Filters'}
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal tool buttons row */}
            <div className="flex flex-wrap gap-2 bg-[#FFF3E0]/40 p-2 rounded-2xl border border-[#E69A5E]/10 justify-center items-center">
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                  activeTool === 'none' 
                    ? 'bg-slate-700 text-white border-transparent scale-102 shadow-sm ring-2 ring-slate-200' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title={language === 'es' ? 'Desplazamiento horizontal / zoom' : 'Pan / Zoom Displacement'}
              >
                🖐️ {language === 'es' ? 'Desplazamiento' : 'Pan / Move'}
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'well' ? 'none' : 'well')}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                  activeTool === 'well' 
                    ? 'bg-[#2563EB] text-white border-transparent scale-102 shadow-sm' 
                    : 'bg-white text-[#2563EB] border-[#2563EB]/25 hover:bg-[#2563EB]/5'
                }`}
                title={t.markWells}
              >
                🧪 {t.markWells}
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'frente' ? 'none' : 'frente')}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                  activeTool === 'frente' 
                    ? 'bg-[#16A34A] text-white border-transparent scale-102 shadow-sm' 
                    : 'bg-white text-[#16A34A] border-[#16A34A]/25 hover:bg-[#16A34A]/5'
                }`}
                title={t.markFrente}
              >
                📏 {t.markFrente}
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'marker' ? 'none' : 'marker')}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                  activeTool === 'marker' 
                    ? 'bg-[#E11D48] text-white border-transparent scale-102 shadow-sm' 
                    : 'bg-white text-[#E11D48] border-[#E11D48]/25 hover:bg-red-50'
                }`}
                title={t.markMarcador}
              >
                🔴 {t.markMarcador}
              </button>

              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'sample' ? 'none' : 'sample')}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                  activeTool === 'sample' 
                    ? 'bg-[#D97706] text-white border-transparent scale-102 shadow-sm' 
                    : 'bg-white text-[#D97706] border-[#D97706]/25 hover:bg-amber-100/50'
                }`}
                title={t.markMuestra}
              >
                🔵 {t.markMuestra}
              </button>

              <div className="w-full sm:w-auto flex gap-1.5 justify-center md:ml-auto">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={bands.length === 0 && frenteY === null && pocilloY === null}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                >
                  ↩️ {t.undo}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-[#B95C2E] text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                >
                  🗑️ {language === 'es' ? 'Reiniciar' : 'Reset'}
                </button>
              </div>
            </div>

            {/* Active tool banner feedback state indicators */}
            {activeTool !== 'none' && (
              <div className="p-2 text-center text-xs font-bold rounded-xl animate-pulse text-white bg-[#E69A5E]">
                👉 {activeTool === 'well' && t.wellActive}
                {activeTool === 'frente' && t.frenteActive}
                {activeTool === 'marker' && t.marcadorActive}
                {activeTool === 'sample' && t.muestraActive}
              </div>
            )}

            {/* Native High-Precision continuous zoom slider (placed ABOVE the gel) */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs select-none mb-2.5">
              <span className="text-xs font-black text-blue-900 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider shrink-0">
                🔍 Zoom:
              </span>
              <input
                type="range"
                min="0.25"
                max="8"
                step="0.05"
                value={zoomScale}
                onChange={(e) => setZoomScale(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-[#1E3A8A] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
              />
              <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-350 w-12 text-right select-none bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                {Math.round(zoomScale * 100)}%
              </span>
              {zoomScale !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-450 px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer"
                >
                  {language === 'es' ? 'Restaurar' : 'Reset'}
                </button>
              )}
            </div>

            {/* Fine tuning of Wells (siembra) and Front (frente) - Single unified bar to save mobile space */}
            {(pocilloY !== null || frenteY !== null) && (
              <div className="mb-2.5 p-2.5 bg-[#F0F7FF] dark:bg-slate-900/40 rounded-2xl border border-blue-100/55 dark:border-slate-808 text-xs shadow-3xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100/30 dark:border-slate-800/50 pb-1.5">
                  <span className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    🛠️ {language === 'es' ? 'Ajuste Fino de Origen/Corrida:' : 'Line Micro-Adjust:'}
                  </span>
                  
                  {/* Selector Tabs: 🔵 Siembra vs 🟢 Frente */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {pocilloY !== null && (
                      <button
                        type="button"
                        onClick={() => setActiveFineTuneLine('siembra')}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          activeFineTuneLine === 'siembra'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        🔵 {language === 'es' ? 'Siembra' : 'Wells'} ({Math.round(pocilloY * 100)}%)
                      </button>
                    )}
                    {frenteY !== null && (
                      <button
                        type="button"
                        onClick={() => setActiveFineTuneLine('frente')}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          activeFineTuneLine === 'frente'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        🟢 {language === 'es' ? 'Corrida' : 'Front'} ({Math.round(frenteY * 100)}%)
                      </button>
                    )}
                  </div>
                </div>

                {/* Unified single slider container (compact, resembling DOI analyzer adjustments) */}
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFineTuneLine === 'siembra' && pocilloY !== null) {
                        const val = Math.max(0, pocilloY - 0.001);
                        setPocilloY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, val, frenteY || 1) })));
                      } else if (activeFineTuneLine === 'frente' && frenteY !== null) {
                        const val = Math.max(0, frenteY - 0.001);
                        setFrenteY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, pocilloY || 0, val) })));
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-800 font-extrabold rounded-lg transition-colors cursor-pointer text-xs"
                    title={language === 'es' ? 'Disminuir posición' : 'Nudge Up'}
                  >
                    ▲
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={activeFineTuneLine === 'siembra' ? (pocilloY ?? 0) : (frenteY ?? 1)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (activeFineTuneLine === 'siembra') {
                        setPocilloY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, val, frenteY || 1) })));
                      } else {
                        setFrenteY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, pocilloY || 0, val) })));
                      }
                    }}
                    className={`flex-1 cursor-pointer h-1 rounded-lg appearance-none ${
                      activeFineTuneLine === 'siembra' ? 'accent-blue-600' : 'accent-emerald-600'
                    } bg-slate-200 dark:bg-slate-800`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (activeFineTuneLine === 'siembra' && pocilloY !== null) {
                        const val = Math.min(1, pocilloY + 0.001);
                        setPocilloY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, val, frenteY || 1) })));
                      } else if (activeFineTuneLine === 'frente' && frenteY !== null) {
                        const val = Math.min(1, frenteY + 0.001);
                        setFrenteY(val);
                        setBands((prev) => prev.map(x => ({ ...x, rf: computeRf(x.y, pocilloY || 0, val) })));
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-250 border border-slate-200 dark:border-slate-800 font-extrabold rounded-lg transition-colors cursor-pointer text-xs"
                    title={language === 'es' ? 'Aumentar posición' : 'Nudge Down'}
                  >
                    ▼
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Canvas viewport scroll prevention with responsive high precision zoom scales and overflow pan layout */}
            <div 
              onMouseDown={handlePanStart}
              onTouchStart={handlePanStart}
              onMouseMove={handlePanMove}
              onTouchMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onTouchEnd={handlePanEnd}
              onMouseLeave={handlePanEnd}
              className={`bg-black/95 rounded-2xl border border-gray-200 overflow-auto max-h-[520px] shadow-inner p-1 relative transition-all duration-200 ${
                zoomScale > 1 && activeTool === 'none'
                  ? 'cursor-grab active:cursor-grabbing'
                  : ''
              }`}
            >
              <canvas
                ref={mainCanvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                style={{ 
                  width: `${100 * zoomScale}%`, 
                  minWidth: zoomScale < 1 ? `${100 * zoomScale}%` : '100%',
                  maxWidth: zoomScale <= 1 ? '100%' : 'none',
                  cursor: activeTool !== 'none' ? 'crosshair' : 'default',
                  transition: 'width 0.15s ease-out'
                }}
                className={`shadow bg-stone-900 touch-none ${zoomScale <= 1 ? 'mx-auto' : 'ml-0 mr-auto'}`}
              />
            </div>

          </div>

          {/* SIDER REGRESSION CALCULATORS SECTION */}
          <div className="md:col-span-1 space-y-4">
            {/* 4-direction precision nudge arrow HUD (ALWAYS VISIBLE in the sidebar, desktop & mobile) */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-2xl shadow-xs text-center space-y-3">
              <div className="flex justify-between items-center bg-amber-50/50 dark:bg-slate-900/60 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-400 tracking-wider">
                  🎯 {language === 'es' ? 'Ajustador de Precisión (4-Vías)' : 'Precision Nudge (4-Way)'}
                </span>
                {selectedBandId && (
                  <button
                    onClick={() => setSelectedBandId(null)}
                    className="text-[10px] hover:text-red-500 font-extrabold transition-colors cursor-pointer px-1 text-slate-405"
                    title={language === 'es' ? 'Limpiar selección' : 'Clear selection'}
                  >
                    ✕
                  </button>
                )}
              </div>

              {bands.length === 0 ? (
                <div className="p-3 bg-stone-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-gray-150 dark:border-slate-800 text-center">
                  <p className="text-[11px] font-medium text-slate-505 dark:text-slate-400 leading-normal">
                    {language === 'es' 
                      ? '⚠️ No hay bandas marcadas. Indique el inicio/frente de corrido y marque bandas para habilitar este control.'
                      : '⚠️ No bands marked yet. Mark some bands on the gel first to enable this control.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-505 dark:text-slate-400">
                      {language === 'es' ? 'Banda seleccionada:' : 'Selected Band:'}
                    </label>
                    <select
                      value={selectedBandId || ''}
                      onChange={(e) => setSelectedBandId(e.target.value || null)}
                      className="w-full text-xs font-bold p-2 bg-[#FFFDF9] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-slate-200 cursor-pointer outline-none focus:border-amber-400"
                    >
                      <option value="">
                        -- {language === 'es' ? 'Seleccione una banda' : 'Select a band'} --
                      </option>
                      {bands.map((b) => {
                        const sIdx = bands.filter((x) => x.type === 'sample').findIndex((x) => x.id === b.id) + 1;
                        const mIdx = bands.filter((x) => x.type === 'marker').findIndex((x) => x.id === b.id) + 1;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.type === 'marker'
                              ? `🔴 M${mIdx} (${language === 'es' ? 'Marcador' : 'Marker'}) [Rf: ${b.rf.toFixed(3)}]`
                              : `🟡 P${sIdx} (${language === 'es' ? 'Muestra' : 'Sample'}) [Rf: ${b.rf.toFixed(3)}]`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Cross layout */}
                  <div className="flex flex-col items-center justify-center gap-1.5 mt-2">
                    <button
                      type="button"
                      disabled={!selectedBandId}
                      onClick={() => selectedBandId && adjustBandPosition(selectedBandId, 0, -0.001)}
                      className={`w-10 h-8 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 border ${
                        selectedBandId 
                          ? 'bg-slate-100 hover:bg-amber-100 border-slate-205 text-slate-800 dark:bg-slate-820 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200' 
                          : 'bg-gray-50 text-gray-300 border-gray-150 dark:bg-slate-900/40 dark:text-slate-700 dark:border-slate-850 cursor-not-allowed'
                      }`}
                      title={language === 'es' ? 'Mover arriba (-Y)' : 'Nudge Up (-Y)'}
                    >
                      ▲
                    </button>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={!selectedBandId}
                        onClick={() => selectedBandId && adjustBandPosition(selectedBandId, -0.005, 0)}
                        className={`w-10 h-8 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 border ${
                          selectedBandId 
                            ? 'bg-slate-100 hover:bg-amber-100 border-slate-205 text-slate-800 dark:bg-slate-820 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200' 
                            : 'bg-gray-50 text-gray-300 border-gray-150 dark:bg-slate-900/40 dark:text-slate-700 dark:border-slate-850 cursor-not-allowed'
                        }`}
                        title={language === 'es' ? 'Mover izquierda (-X)' : 'Nudge Left (-X)'}
                      >
                        ◀
                      </button>
                      
                      <div className="px-3 py-1.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-805 dark:text-amber-400 font-extrabold text-[10px] uppercase tracking-wider select-none min-w-[70px]">
                        {selectedBandId ? (
                          <span>
                            {(() => {
                              const b = bands.find((x) => x.id === selectedBandId);
                              if (!b) return '';
                              const sIdx = bands.filter((x) => x.type === 'sample').findIndex((x) => x.id === b.id) + 1;
                              const mIdx = bands.filter((x) => x.type === 'marker').findIndex((x) => x.id === b.id) + 1;
                              return b.type === 'marker' ? `M${mIdx}` : `P${sIdx}`;
                            })()}
                          </span>
                        ) : (
                          <span>✏️ Rf</span>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        disabled={!selectedBandId}
                        onClick={() => selectedBandId && adjustBandPosition(selectedBandId, 0.005, 0)}
                        className={`w-10 h-8 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 border ${
                          selectedBandId 
                            ? 'bg-slate-100 hover:bg-amber-100 border-slate-205 text-slate-800 dark:bg-slate-820 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200' 
                            : 'bg-gray-50 text-gray-300 border-gray-150 dark:bg-slate-900/40 dark:text-slate-700 dark:border-slate-850 cursor-not-allowed'
                        }`}
                        title={language === 'es' ? 'Mover derecha (+X)' : 'Nudge Right (+X)'}
                      >
                        ▶
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedBandId}
                      onClick={() => selectedBandId && adjustBandPosition(selectedBandId, 0, 0.001)}
                      className={`w-10 h-8 flex items-center justify-center text-xs font-black rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 border ${
                        selectedBandId 
                          ? 'bg-slate-100 hover:bg-amber-100 border-slate-205 text-slate-800 dark:bg-slate-820 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200' 
                          : 'bg-gray-50 text-gray-300 border-gray-150 dark:bg-slate-900/40 dark:text-slate-700 dark:border-slate-850 cursor-not-allowed'
                      }`}
                      title={language === 'es' ? 'Mover abajo (+Y)' : 'Nudge Down (+Y)'}
                    >
                      ▼
                    </button>
                  </div>

                  <p className="text-[9px] text-gray-400 font-semibold italic">
                    {language === 'es' ? 'Ajusta vertical (Rf) y horizontal (línea de corrido)' : 'Nudge Rf vertical and lane horizontal center'}
                  </p>
                </div>
              )}
            </div>

            {/* 1. Solved molecular weights tables list (NOW AT THE TOP of the sidebar!) */}
            {bands.length > 0 && (
              <div className="space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xs">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1.5 border-b pb-2">
                  📋 {language === 'es' ? 'Tabla de Bandas (MW y Rf)' : 'Bands Records (MW & Rf)'}
                  <span className="font-mono bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 py-0.5 px-1.5 rounded font-bold text-[9px]">
                    {bands.length}
                  </span>
                </p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {bands.map((b) => {
                    const sampleBands = bands.filter((x) => x.type === 'sample');
                    const sIdx = sampleBands.findIndex((x) => x.id === b.id) + 1;
                    const isSelected = selectedBandId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBandId(isSelected ? null : b.id)}
                        className={`p-2 rounded-xl border text-[11px] flex flex-col gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-300'
                            : b.type === 'marker'
                              ? 'border-red-100 dark:border-red-950/50 bg-stone-25 dark:bg-slate-900/40 hover:bg-red-50/20 dark:hover:bg-red-950/20'
                              : 'border-amber-100 dark:border-amber-950/50 bg-stone-25 dark:bg-slate-900/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/20'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              b.type === 'marker' ? 'bg-[#E11D48]' : 'bg-[#D97706]'
                            }`} />
                            <span className="font-bold text-gray-700 dark:text-slate-200 truncate">
                              {b.type === 'marker'
                                ? `Marker (Rf:${b.rf.toFixed(2)})`
                                : `${language === 'es' ? 'Banda problema' : 'Sample band'} #${sIdx} (Rf:${b.rf.toFixed(2)})`
                              }
                            </span>
                          </div>
                        
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {b.type === 'marker' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={b.mw ?? ''}
                                  onChange={(e) => {
                                    const numVal = parseFloat(e.target.value);
                                    if (!isNaN(numVal)) {
                                      handleEditMarkerMw(b.id, numVal);
                                    }
                                  }}
                                  className="w-16 bg-stone-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center font-mono font-black text-xs p-1 rounded-lg text-[#3E2A1F] dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-300"
                                />
                                <span className="text-[10px] text-gray-400 font-bold shrink-0">
                                  {ficha.categoryId === 'adn' ? 'pb' : 'kDa'}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-[#3E2A1F] dark:text-slate-200">
                                {b.predictedMw 
                                  ? `${b.predictedMw.toFixed(1)} ${ficha.categoryId === 'adn' ? 'pb' : 'kDa'}`
                                  : '?'
                                }
                              </span>
                            )}

                            {/* Delete single band item button */}
                            <button
                              onClick={() => handleDeleteBand(b.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg cursor-pointer transition-colors shrink-0 ml-1.5 animate-fade-in"
                              title={language === 'es' ? 'Borrar banda' : 'Delete band'}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Optional Concentration Estimation row configuration */}
                        {enableConcMode && (
                          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-blue-50/40 dark:bg-blue-950/10 p-1.5 rounded-lg border border-blue-100/30 dark:border-blue-950/35 w-full" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1 text-[10px] font-bold text-blue-900 dark:text-blue-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={b.isStandardForConc || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setBands((prev) =>
                                    prev.map((x) =>
                                      x.id === b.id
                                        ? { ...x, isStandardForConc: checked, concentration: checked ? (x.concentration || 10) : undefined }
                                        : x
                                    )
                                  );
                                }}
                                className="rounded text-blue-600 focus:ring-blue-450 h-3 w-3 cursor-pointer"
                              />
                              <span>{language === 'es' ? 'Patrón Conc.' : 'Std Conc.'}</span>
                            </label>

                            <div className="flex items-center gap-1.5 ml-auto">
                              {b.isStandardForConc ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400">Val:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={b.concentration ?? ''}
                                    placeholder="ug/ul"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) {
                                        setBands((prev) =>
                                          prev.map((x) => (x.id === b.id ? { ...x, concentration: val } : x))
                                        );
                                      }
                                    }}
                                    className="w-12 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-center font-mono font-bold text-[10px] p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  />
                                  <span className="text-[9px] uppercase font-bold text-gray-500">µg/µl</span>
                                </div>
                              ) : (
                                <div className="text-[10px]">
                                  <span className="text-gray-500">{language === 'es' ? 'Calculado' : 'Est'}: </span>
                                  <span className="font-mono font-bold text-blue-800 dark:text-blue-300">
                                    {b.estimatedConcentration !== undefined
                                      ? `${b.estimatedConcentration.toFixed(1)} µg/µl`
                                      : '?'
                                    }
                                  </span>
                                </div>
                              )}
                              <span className="text-[9.5px] font-mono text-gray-400 ml-1 py-0.5 px-1 bg-stone-50 dark:bg-slate-900 border border-stone-200/50 dark:border-slate-800 rounded shrink-0">
                                DOI:{b.doi ?? 0}
                              </span>
                            </div>
                          </div>
                        )}


                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Action buttons (now directly underneath the table of bands!) */}
            <div className="space-y-2">
              <button
                id="btn-calculate-regression-trigger"
                onClick={handleCalculateRegression}
                className="w-full py-2.5 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-black text-xs md:text-sm rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all text-center"
              >
                📊 {t.calculateReg}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                <button
                  onClick={handleExportExcel}
                  disabled={bands.length === 0}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs disabled:opacity-50 active:scale-95 text-center min-h-[40px]"
                  title={language === 'es' ? 'Descargar como planilla Excel (.xlsx)' : 'Download as Excel spreadsheet (.xlsx)'}
                >
                  📊 {language === 'es' ? 'Excel' : 'Excel'}
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={bands.length === 0}
                  className="py-2 px-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs disabled:opacity-50 active:scale-95 text-center min-h-[40px]"
                  title={language === 'es' ? 'Descargar como archivo CSV delimitado' : 'Download as delimited CSV file'}
                >
                  📄 {language === 'es' ? 'CSV' : 'CSV'}
                </button>

                <button
                  onClick={handleSaveBtnClick}
                  disabled={!regression}
                  className="py-2 px-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs disabled:opacity-50 active:scale-95 text-center min-h-[40px]"
                >
                  💾 {t.saveBtn}
                </button>
              </div>
            </div>

            {/* 3. Linear calibration display card (renders below the buttons when solved) */}
            {regression && (
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-[#E69A5E]/20 dark:border-slate-850 shadow-3xs space-y-3">
                <h4 className="font-extrabold text-[#3E2A1F] dark:text-slate-300 text-xs uppercase tracking-wider text-center">
                  📈 {language === 'es' ? 'Calibración (M-OLS)' : 'Linear Fitting (M-OLS)'}
                </h4>

                <div className="space-y-1 text-center bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800">
                  <p className="font-mono text-[10px] font-bold text-blue-800 dark:text-blue-300 leading-tight">
                    {regression.equation}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500">
                    R² = <span className="text-green-600 dark:text-green-455 text-xs font-mono">{regression.r2.toFixed(4)}</span>
                  </p>
                </div>

                {/* Trendline Canvas container size */}
                <div className="flex flex-col items-center bg-[#FFFDF9] dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 p-1 w-full">
                  <canvas
                    ref={trendCanvasRef}
                    width={180}
                    height={150}
                    className="w-full h-auto bg-transparent cursor-zoom-in"
                    onClick={() => setIsExpandedGraphOpen(true)}
                    title={language === 'es' ? 'Clic para ampliar gráfico' : 'Click to enlarge chart'}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setIsExpandedGraphOpen(true)}
                    className="w-full mt-1.5 py-1 bg-stone-105 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-350 text-[10px] font-bold rounded-lg cursor-pointer transition-colors text-center"
                  >
                    🔍 {language === 'es' ? 'Ampliar gráfico' : 'Enlarge chart'}
                  </button>
                </div>

                {/* On-screen Results Table */}
                <div className="mt-3 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs bg-[#FFFDF9] dark:bg-slate-950">
                  <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-2 py-1.5 flex justify-between items-center text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                    <span>📊 {language === 'es' ? 'Resultados Calculados' : 'Results Matrix Table'}</span>
                    <span className="font-mono text-slate-400">N={bands.length}</span>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto overflow-x-hidden scrollbar-thin">
                    <table className="w-full border-collapse text-left text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 uppercase font-black border-b border-gray-200 dark:border-slate-800 text-[9px]">
                          <th className="p-1.5 pl-2">{language === 'es' ? 'Banda' : 'Band'}</th>
                          <th className="p-1.5">Rf</th>
                          <th className="p-1.5 text-right">{language === 'es' ? 'MW' : 'MW'}</th>
                          {enableConcMode && (
                            <th className="p-1.5 text-right pr-2">{language === 'es' ? 'Conc.' : 'Conc.'}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[#0F172A] dark:text-slate-300">
                        {bands.filter(b => b.type === 'marker').map((b, i) => (
                          <tr key={b.id} className="hover:bg-red-50/20 dark:hover:bg-red-950/10">
                            <td className="p-1.5 pl-2 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                              <span className="truncate max-w-[50px] md:max-w-[70px]">M{i + 1}</span>
                            </td>
                            <td className="p-1.5 font-mono text-gray-500">{b.rf.toFixed(3)}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-gray-800 dark:text-slate-200 font-bold">
                              {b.mw}
                            </td>
                            {enableConcMode && (
                              <td className="p-1.5 text-right font-mono font-bold text-blue-900 dark:text-blue-300 pr-2">
                                {b.isStandardForConc ? `${b.concentration ?? 0}` : (b.estimatedConcentration !== undefined ? b.estimatedConcentration.toFixed(1) : '?')}
                              </td>
                            )}
                          </tr>
                        ))}
                        {bands.filter(b => b.type === 'sample').map((b) => {
                          const sampleBandsList = bands.filter(x => x.type === 'sample');
                          const sIdx = sampleBandsList.findIndex(x => x.id === b.id) + 1;
                          return (
                            <tr key={b.id} className="hover:bg-amber-50/20 bg-amber-50/5 dark:bg-slate-900/10">
                              <td className="p-1.5 pl-2 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                <span className="truncate max-w-[50px] md:max-w-[70px]">P{sIdx}</span>
                              </td>
                              <td className="p-1.5 font-mono text-gray-500">{b.rf.toFixed(3)}</td>
                              <td className="p-1.5 text-right font-mono font-black text-amber-800 dark:text-amber-450">
                                {b.predictedMw ? `${b.predictedMw.toFixed(1)}` : '?'}
                              </td>
                              {enableConcMode && (
                                <td className="p-1.5 text-right font-mono font-black text-blue-900 dark:text-blue-400 pr-2">
                                  {b.estimatedConcentration !== undefined ? b.estimatedConcentration.toFixed(1) : '?'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* React-based Custom Modal for marker MW assignment (avoids window.prompt entirely!) */}
      {showMwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-[#3E2A1F]">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[#B95C2E] flex items-center gap-1.5">
              <span>🔴</span> {language === 'es' ? 'Definir Peso de Banda Marcador' : 'Define Marker Band MW'}
            </h3>
            
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-gray-700">
                {language === 'es' ? 'Valor numérico del peso molecular:' : 'Molecular weight numeric value:'}
              </label>
              
              <div className="relative">
                <input
                  type="number"
                  autoFocus
                  required
                  min="1"
                  step="any"
                  value={mwInputVal}
                  onChange={(e) => setMwInputVal(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E69A5E]/20 p-2.5 pr-14 rounded-xl text-[#3E2A1F] focus:outline-none focus:ring-2 focus:ring-[#E69A5E]/50 font-bold"
                  placeholder="e.g. 100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseFloat(mwInputVal);
                      if (!isNaN(num) && num > 0 && pendingBandY !== null && pendingBandRf !== null) {
                        const calculatedDoi = calculateBandDOI(pendingBandY, pendingBandXStart || 0.1, pendingBandXEnd || 0.9);
                        const newBand: MarkerBand = {
                          id: Math.random().toString(36).substring(2, 9),
                          type: 'marker',
                          y: pendingBandY,
                          rf: pendingBandRf,
                          mw: num,
                          label: `M: ${num}`,
                          xStart: pendingBandXStart ?? undefined,
                          xEnd: pendingBandXEnd ?? undefined,
                          doi: calculatedDoi
                        };
                        setBands((prev) => [...prev, newBand]);
                        setShowMwModal(false);
                        setPendingBandY(null);
                        setPendingBandRf(null);
                        setPendingBandXStart(null);
                        setPendingBandXEnd(null);
                      }
                    }
                  }}
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">
                  {ficha.categoryId === 'adn' ? 'pb' : 'kDa'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowMwModal(false);
                  setPendingBandY(null);
                  setPendingBandRf(null);
                  setPendingBandXStart(null);
                  setPendingBandXEnd(null);
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(mwInputVal);
                  if (isNaN(num) || num <= 0) {
                    alert(t.invalidMw);
                    return;
                  }
                  if (pendingBandY !== null && pendingBandRf !== null) {
                    const calculatedDoi = calculateBandDOI(pendingBandY, pendingBandXStart || 0.1, pendingBandXEnd || 0.9);
                    const newBand: MarkerBand = {
                      id: Math.random().toString(36).substring(2, 9),
                      type: 'marker',
                      y: pendingBandY,
                      rf: pendingBandRf,
                      mw: num,
                      label: `M: ${num}`,
                      xStart: pendingBandXStart ?? undefined,
                      xEnd: pendingBandXEnd ?? undefined,
                      doi: calculatedDoi
                    };
                    setBands((prev) => [...prev, newBand]);
                    setShowMwModal(false);
                    setPendingBandY(null);
                    setPendingBandRf(null);
                    setPendingBandXStart(null);
                    setPendingBandXEnd(null);
                  }
                }}
                disabled={!mwInputVal.trim()}
                className={`text-xs px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm text-white ${
                  mwInputVal.trim() ? 'bg-[#E11D48] hover:bg-rose-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Regression Curve & Values Table Modal Overlay */}
      {isExpandedGraphOpen && regression && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-[#3E2A1F]">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 shrink-0">
              <h3 className="text-sm md:text-base font-black text-[#B95C2E] flex items-center gap-1.5">
                <span>📈</span> {language === 'es' ? 'Diagrama de Calibración Detallado y Tabla de Regresión' : 'Detailed Calibration Curve & Regression Table'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpandedGraphOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-full cursor-pointer transition-colors font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Content body layout */}
            <div className="flex-1 overflow-y-auto my-4 pr-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left column: Expanded Canvas Plot & Formula summary config */}
              <div className="md:col-span-5 space-y-4 flex flex-col items-center">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-full flex justify-center">
                  <canvas
                    ref={expandedCanvasRef}
                    width={400}
                    height={320}
                    className="w-full max-w-xs md:max-w-md h-auto bg-transparent"
                  />
                </div>
                
                {/* Calibration equation summary info card */}
                <div className="bg-[#FFFDF9] border border-amber-200/50 p-4 rounded-xl space-y-2 text-center w-full">
                  <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                    {language === 'es' ? 'Ecuación de Calibración (M-OLS)' : 'Calibration Curve equation (OLS)'}
                  </p>
                  <p className="font-mono text-xs md:text-sm font-black text-blue-900 bg-blue-50/70 py-2 px-3 rounded-xl inline-block leading-normal">
                    {regression.equation}
                  </p>
                  <p className="text-[10px] font-extrabold text-gray-500 mt-1 block">
                    {language === 'es' ? 'Coeficiente de Determinación:' : 'Coefficient of Determination:'}{' '}
                    <span className="text-green-600 font-bold font-mono text-xs block md:inline-block">R² = {regression.r2.toFixed(5)}</span>
                  </p>
                </div>
              </div>

              {/* Right column: Formulated and calculated values detailed Table list */}
              <div className="md:col-span-7 space-y-4 w-full">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <p className="bg-stone-50 text-[10px] md:text-[11px] font-black text-[#3E2A1F]/70 py-2.5 px-3 uppercase tracking-wider border-b border-gray-200 text-center md:text-left">
                    📋 {language === 'es' ? 'Valores de Calibración de Bandas' : 'Calibration & Band Values Table'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[9px] md:text-[10px] border-b border-gray-200">
                          <th className="p-3">{language === 'es' ? 'Banda' : 'Band'}</th>
                          <th className="p-3">Rf</th>
                          <th className="p-3">log10(MW)</th>
                          <th className="p-3 text-right">{language === 'es' ? 'MW (kDa o pb)' : 'MW (kDa or bp)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px]">
                        {/* Markers Table List */}
                        {bands.filter(b => b.type === 'marker').map((b, i) => (
                          <tr key={b.id} className="hover:bg-red-50/10 text-gray-700">
                            <td className="p-2.5 font-bold flex items-center gap-1.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0" />
                              <span className="truncate">Marker M{i + 1}</span>
                            </td>
                            <td className="p-2.5 font-mono text-gray-600">{b.rf.toFixed(3)}</td>
                            <td className="p-2.5 font-mono text-gray-500">{(b.mw ? Math.log10(b.mw) : 0).toFixed(4)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-gray-900 bg-red-50/5">
                              {b.mw} <span className="text-[9px] text-gray-400 font-normal">({language === 'es' ? 'Conocido' : 'Known'})</span>
                            </td>
                          </tr>
                        ))}

                        {/* Problem Sample Bands Table List */}
                        {bands.filter(b => b.type === 'sample').map((b) => {
                          const sampleBandsList = bands.filter(x => x.type === 'sample');
                          const sIdx = sampleBandsList.findIndex(x => x.id === b.id) + 1;
                          return (
                            <tr key={b.id} className="hover:bg-amber-50/10 text-gray-700">
                              <td className="p-2.5 font-bold flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" />
                                <span className="truncate">{language === 'es' ? `Problema P${sIdx}` : `Sample P${sIdx}`}</span>
                              </td>
                              <td className="p-2.5 font-mono text-gray-600">{b.rf.toFixed(3)}</td>
                              <td className="p-2.5 font-mono text-gray-500">{(b.predictedMw ? Math.log10(b.predictedMw) : 0).toFixed(4)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-amber-700 bg-amber-50/10">
                                {b.predictedMw ? `${b.predictedMw.toFixed(1)}` : '?'}{' '}
                                <span className="text-[9px] text-amber-600/70 font-normal">({language === 'es' ? 'Propagado' : 'Propagated'})</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl text-[10px] md:text-[11px] leading-relaxed text-[#3E2A1F]/80">
                  ℹ️ {language === 'es' 
                    ? 'La regresión por O.L.S. (Mínimos Cuadrados Ordinarios) calcula la ecuación lineal: log10(Peso) = m * Rf + c. El factor de migración Rf (Relative migration) se evalúa a partir del origen de pocillos (Rf = 0) al frente de avance (Rf = 1).'
                    : 'The OLS linear regression computes the line formula: log10(Weight) = m * Rf + c. The relative migration Rf parameter is mapped starting from origin wells line (Rf = 0) down to final migration front line (Rf = 1).'
                  }
                </div>
              </div>

            </div>

            {/* Modal action bar footer */}
            <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsExpandedGraphOpen(false)}
                className="bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all text-center"
              >
                {language === 'es' ? 'Cerrar Ventana' : 'Close Details'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Pristine Academic Print Report Modal & Dynamic Customizer */}
      {isPrintReportOpen && regression && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-slate-50 w-full max-w-6xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row h-screen md:h-[92vh] overflow-hidden print:bg-white print:shadow-none print:rounded-none print:h-auto print:overflow-visible">
            
            {/* LEFT SIDEBAR: Report Metadata Editor (hidden during print) */}
            <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col overflow-y-auto shrink-0 print:hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  ⚙️ {language === 'es' ? 'Ajustar Reporte' : 'Adjust Report'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPrintReportOpen(false)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors cursor-pointer text-xs font-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {language === 'es' ? 'Título del Documento' : 'Document Title'}
                  </label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {language === 'es' ? 'Investigador / Científico' : 'Investigator name'}
                  </label>
                  <input
                    type="text"
                    value={reportInvestigator}
                    onChange={(e) => setReportInvestigator(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {language === 'es' ? 'Identificación de Muestra' : 'Sample Identification'}
                  </label>
                  <input
                    type="text"
                    value={reportSampleName}
                    onChange={(e) => setReportSampleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {language === 'es' ? 'Observaciones / Notas' : 'Observations & Comments'}
                  </label>
                  <textarea
                    rows={4}
                    value={reportComments}
                    onChange={(e) => setReportComments(e.target.value)}
                    placeholder={language === 'es' ? 'Añadir conclusiones o especificaciones de las bandas...' : 'Add conclusions or lane specifications...'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden text-[11px] resize-none"
                  />
                </div>
              </div>

              {/* Print CTA Button */}
              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
                >
                  🖨️ {language === 'es' ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintReportOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {language === 'es' ? 'Cerrar Vista Previa' : 'Close Preview'}
                </button>
              </div>
            </div>

            {/* RIGHT SIDEVIEW: Pure White Academic Document Sheet Preview */}
            <div className="flex-1 bg-[#F1F5F9] md:p-8 overflow-y-auto flex justify-center print:bg-white print:p-0 print:overflow-visible">
              
              {/* Document A4 Container */}
              <div id="scientific-report-sheet" className="w-[210mm] min-h-[297mm] bg-white p-[15mm] md:shadow-xl border border-slate-100 flex flex-col text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0">
                
                {/* Header Logos & Institution branding block */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-5">
                  <div className="flex gap-3 items-center">
                    {/* Logotype UBA */}
                    {savedLogos.uba ? (
                      <img src={savedLogos.uba} alt="UBA" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <UbaSealSVG className="w-12 h-12" />
                    )}

                    {/* Logotype CONICET / IQUIFIB */}
                    {savedLogos.conicet ? (
                      <img src={savedLogos.conicet} alt="CONICET" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <ConicetIquifibSVG className="w-12 h-12" />
                    )}
                  </div>

                  <div className="text-right flex-1 pl-4">
                    <h4 className="font-extrabold text-[12px] text-slate-900 tracking-wider font-mono">
                      UNIVERSIDAD DE BUENOS AIRES
                    </h4>
                    <h5 className="font-bold text-[11px] text-[#1E3A8A] font-mono leading-tight">
                      IQUIFIB-CONICET
                    </h5>
                    <p className="text-[8px] text-slate-500 font-sans tracking-tight leading-normal mt-0.5">
                      Instituto de Química y Fisicoquímica Biológicas, Prof. Alejandro C. Paladini (IQUIFIB)
                    </p>
                  </div>
                </div>

                {/* Report Document Title Card */}
                <div className="text-center mb-6">
                  <h1 className="text-base font-black text-slate-900 tracking-tight leading-snug uppercase border-b border-dashed border-slate-200 pb-2">
                    {reportTitle}
                  </h1>
                </div>

                {/* Grid Metadata details Block */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] mb-6 border border-slate-200 p-3 bg-slate-50/50 rounded-lg">
                  <div>
                    <span className="font-black text-slate-500 uppercase text-[9px] block">
                      {language === 'es' ? 'Investigador / Científico:' : 'Investigator:'}
                    </span>
                    <span className="font-extrabold text-slate-800">{reportInvestigator}</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-500 uppercase text-[9px] block">
                      {language === 'es' ? 'Fecha y Hora:' : 'Analysis Date:'}
                    </span>
                    <span className="font-mono text-slate-700">
                      {new Date(ficha.gelAnalysis?.analysisDate || new Date().toISOString()).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-black text-slate-500 uppercase text-[9px] block">
                      {language === 'es' ? 'Identificación de Corrida:' : 'Run Identification:'}
                    </span>
                    <span className="font-bold text-slate-800">{reportSampleName}</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-black text-slate-500 uppercase text-[9px] block">
                      {language === 'es' ? 'Metodología / Categoría:' : 'Methodology Category:'}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {ficha.categoryId === 'adn' 
                        ? (language === 'es' ? 'Electroforesis de ADN (pb)' : 'DNA Electrophoresis (bp)') 
                        : (language === 'es' ? 'SDS-PAGE de Proteína (kDa)' : 'Protein SDS-PAGE (kDa)')}
                    </span>
                  </div>
                </div>

                {/* Scientific Graphic Panels (Two columns grid layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Gel Picture Column */}
                  <div className="border border-slate-200 rounded-lg p-2 flex flex-col justify-between bg-slate-50/20">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center block mb-2">
                      📷 {language === 'es' ? 'Imagen de Corrida de Gel (Con Bandas)' : 'SDS-Gel Image (with markings)'}
                    </span>
                    <div className="flex-1 flex items-center justify-center p-1 bg-black rounded overflow-hidden max-h-[200px]">
                      {canvasSnapshot ? (
                        <img src={canvasSnapshot} alt="Analysed Gel" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono py-8">No gel loaded</span>
                      )}
                    </div>
                  </div>

                  {/* Calibration Line Column */}
                  <div className="border border-slate-200 rounded-lg p-2 flex flex-col justify-between bg-slate-50/20">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center block mb-2">
                      📈 {language === 'es' ? 'Curva de Regresión Lineal (OLS)' : 'Linear Fitting Curve (OLS)'}
                    </span>
                    <div className="flex-1 flex items-center justify-center p-1 bg-white rounded overflow-hidden max-h-[200px]">
                      {trendSnapshot ? (
                        <img src={trendSnapshot} alt="Calibration Curve" className="max-h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono py-8">Curve empty</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mathematial Formula highlight box */}
                <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg mb-6 text-center">
                  <p className="text-[9px] font-black uppercase text-[#1E3A8A] tracking-wider mb-1">
                    {language === 'es' ? 'Ecuación Predictiva (Mínimos Cuadrados)' : 'OLS Calibration Linear Formula'}
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-mono text-xs font-black text-blue-900 bg-white/80 border border-blue-100/50 px-3 py-1 rounded">
                      {regression.equation}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold">
                      {language === 'es' ? 'Coeficiente' : 'Coeff'} R² = <span className="font-mono text-green-700 font-black">{regression.r2.toFixed(5)}</span>
                    </span>
                  </div>
                </div>

                {/* Analytical Results Matrix Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <span className="bg-slate-50 text-[9px] font-black text-slate-600 py-2 px-3 uppercase tracking-wider border-b border-slate-200 block">
                    📋 {language === 'es' ? 'Resultados del Análisis de Migración y Concentración' : 'Migration & Concentration Results Matrix Table'}
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200 text-[9px] uppercase">
                          <th className="p-2 pl-3">{language === 'es' ? 'Banda' : 'Band'}</th>
                          <th className="p-2">Rf</th>
                          <th className="p-2">log10(MW)</th>
                          <th className="p-2 text-right">{language === 'es' ? 'Peso (MW)' : 'Weight (MW)'}</th>
                          {enableConcMode && (
                            <>
                              <th className="p-2 text-right">{language === 'es' ? 'Intensidad (DOI)' : 'Intensity (DOI)'}</th>
                              <th className="p-2 text-right pr-3">{language === 'es' ? 'Concentración' : 'Concentration'}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {bands.filter(b => b.type === 'marker').map((b, i) => (
                          <tr key={b.id} className="hover:bg-slate-50/50 font-sans">
                            <td className="p-2 pl-3 font-bold flex items-center gap-1.5 text-slate-800">
                              <span className="w-2 h-2 rounded-full bg-[#E11D48] shrink-0" />
                              <span>Marker M{i + 1}</span>
                            </td>
                            <td className="p-2 font-mono text-slate-600">{b.rf.toFixed(3)}</td>
                            <td className="p-2 font-mono text-slate-500">{(b.mw ? Math.log10(b.mw) : 0).toFixed(4)}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {b.mw} <span className="text-[8px] text-slate-400 font-normal">({language === 'es' ? 'Conocido' : 'Known'})</span>
                            </td>
                            {enableConcMode && (
                              <>
                                <td className="p-2 text-right font-mono text-slate-500">{(b.doi ?? 0).toFixed(1)}</td>
                                <td className="p-2 text-right pr-3 font-mono font-bold text-blue-900 font-black">
                                  {b.isStandardForConc ? `${b.concentration ?? 0}` : (b.estimatedConcentration !== undefined ? b.estimatedConcentration.toFixed(2) : '?')}{' '}
                                  <span className="text-[8px] text-slate-400 font-normal">({b.isStandardForConc ? (language === 'es' ? 'Patrón' : 'Standard') : (language === 'es' ? 'Estimado' : 'Estimated')})</span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}

                        {bands.filter(b => b.type === 'sample').map((b) => {
                          const sampleBandsList = bands.filter(x => x.type === 'sample');
                          const sIdx = sampleBandsList.findIndex(x => x.id === b.id) + 1;
                          return (
                            <tr key={b.id} className="bg-slate-50/20 hover:bg-slate-50 font-sans">
                              <td className="p-2 pl-3 font-bold flex items-center gap-1.5 text-[#1E3A8A]">
                                <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
                                <span>{language === 'es' ? `Problema P${sIdx}` : `Sample P${sIdx}`}</span>
                              </td>
                              <td className="p-2 font-mono text-slate-600">{b.rf.toFixed(3)}</td>
                              <td className="p-2 font-mono text-slate-500">{(b.predictedMw ? Math.log10(b.predictedMw) : 0).toFixed(4)}</td>
                              <td className="p-2 text-right font-mono font-bold text-[#1E3A8A] bg-blue-50/10">
                                {b.predictedMw ? `${b.predictedMw.toFixed(1)}` : '?'}{' '}
                                <span className="text-[8px] text-emerald-600 font-normal">({language === 'es' ? 'Estimado' : 'Estimated'})</span>
                              </td>
                              {enableConcMode && (
                                <>
                                  <td className="p-2 text-right font-mono text-slate-500">{(b.doi ?? 0).toFixed(1)}</td>
                                  <td className="p-2 text-right pr-3 font-mono font-black text-blue-900 bg-blue-50/10">
                                    {b.estimatedConcentration !== undefined ? b.estimatedConcentration.toFixed(2) : '?'}{' '}
                                    <span className="text-[8px] text-emerald-600 font-normal">({language === 'es' ? 'Propagado' : 'Propagated'})</span>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Indication of Concentration Estimation Method inside the Report */}
                {enableConcMode && (
                  <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/15 text-[10px] leading-relaxed mb-4">
                    <span className="block font-black text-emerald-800 uppercase text-[8px] mb-1">
                      🔬 {language === 'es' ? 'Metodología para Cálculo de Concentración:' : 'Concentration Methodology:'}
                    </span>
                    <p className="text-slate-800 font-medium">
                      {concentrationMethod === 'regression' ? (
                        language === 'es'
                          ? 'Se utilizó una curva de calibración lineal M-OLS (Mínimos Cuadrados Ordinarios) relacionando la Densidad Óptica Integrada (DOI) corregida de fondo contra las concentraciones ingresadas de los carriles patrón. Fórmula del ajuste: Concentración = m * DOI + c.'
                          : 'Computed via OLS (Ordinary Least Squares) linear standard calibration curve mapping integrated pixel density values (DOI) vs standard reference concentrations. Fit formula: Concentration = m * DOI + c.'
                      ) : (
                        language === 'es'
                          ? 'Se utilizó una estimación por regla de tres lineal simple de punto único escalada proporcionalmente desde la banda seleccionada como patrón de referencia.'
                          : 'Scaled linearly via simple single-point relative rule of three indexed to the highlighted reference standard band.'
                      )}
                    </p>
                  </div>
                )}

                {/* Comments box */}
                {reportComments && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/10 min-h-[50px] text-[10px] leading-relaxed mb-6">
                    <span className="block font-black text-slate-500 uppercase text-[8px] mb-1">
                      📝 {language === 'es' ? 'Observaciones Analíticas:' : 'Analytical comments:'}
                    </span>
                    <p className="text-slate-800 whitespace-pre-wrap">{reportComments}</p>
                  </div>
                )}

                {/* Academic Signoff / Signature stamps area */}
                <div className="mt-auto pt-10 flex justify-start text-[9px] text-slate-500">
                  <div className="flex flex-col items-center w-full max-w-[200px] text-center">
                    <div className="w-full border-b border-gray-400 h-8 mb-1.5" />
                    <span className="font-extrabold uppercase text-[8px] text-slate-700 block text-center truncate w-full">
                      {reportInvestigator}
                    </span>
                    <span className="font-semibold">{language === 'es' ? 'Firma de Investigador Principal' : 'Lead Investigator Signature'}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
