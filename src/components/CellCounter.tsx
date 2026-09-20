import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Ficha, CellCountMarker, CountAnalysis, Language } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';

interface CellCounterProps {
  language: Language;
  ficha: Ficha;
  onSaveAnalysis: (analysis: CountAnalysis, updatedImage?: string) => void;
  onBack: () => void;
}

export default function CellCounter({
  language,
  ficha,
  onSaveAnalysis,
  onBack
}: CellCounterProps) {
  const t = translations[language];

  // Temp image state
  const [tempImageSrc, setTempImageSrc] = useState<string | undefined>(ficha.image);

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate that it is an image
      const isImg = file.type.startsWith('image/');
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif', 'tiff', 'gif', 'bmp'];
      const hasValidExt = extension ? validExtensions.includes(extension) : false;

      if (!isImg && !hasValidExt) {
        alert(language === 'es' 
          ? 'Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG, WEBP).' 
          : 'Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const resultSrc = reader.result as string;
        setTempImageSrc(resultSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  // Counting Mode state support
  const [countingMode, setCountingMode] = useState<'select' | 'general' | 'ufc'>(() => {
    if (ficha.countAnalysis?.isUfcApp === true) return 'ufc';
    if (ficha.countAnalysis?.isUfcApp === false) return 'general';
    return 'select';
  });

  // CFU/PFU state variables
  const [seededVolume, setSeededVolume] = useState<number>(ficha.countAnalysis?.seededVolume ?? 100);
  const [dilutionExponent, setDilutionExponent] = useState<number>(ficha.countAnalysis?.dilutionExponent ?? 5);
  const [calculatedConcentration, setCalculatedConcentration] = useState<number | null>(
    ficha.countAnalysis?.calculatedConcentration ?? null
  );

  // Loaded microscopy image details
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preloaded/Custom counting keys
  const [populations, setPopulations] = useState<Array<{ name: string; color: string }>>([
    { name: language === 'es' ? 'Células totales' : 'Total cells', color: '#2563EB' }, // Blue
    { name: language === 'es' ? 'Infectadas' : 'Infected', color: '#DC2626' }, // Red
    { name: language === 'es' ? 'Trofos' : 'Trophozoites', color: '#16A34A' }, // Green
    { name: language === 'es' ? 'Esquizontes' : 'Schizonts', color: '#D97706' }, // Yellow/Amber
    { name: language === 'es' ? 'Anillos' : 'Rings', color: '#7C3AED' } // Purple
  ]);

  const [activePopIndex, setActivePopIndex] = useState(0);

  // Workflow step control: 'edit' (Stage 1) or 'count' (Stage 2)
  const [workflowStep, setWorkflowStep] = useState<'edit' | 'count'>(() => {
    if (ficha.countAnalysis?.markers && ficha.countAnalysis.markers.length > 0) {
      return 'count';
    }
    return 'edit';
  });

  // Action for clicking on the microscopy canvas
  const [clickAction, setClickAction] = useState<'add' | 'delete'>('add');

  // Microscope zoom level dynamic control
  const [zoomLevel, setZoomLevel] = useState(1);

  // New Image Editing, marker scale & Crop states
  const [markerSize, setMarkerSize] = useState(10); // default 10 instead of 8 for optimal mobile viewing
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100); // 50 to 200
  const [contrast, setContrast] = useState(100); // 50 to 200

  // Fractional values for cropping the active image live
  const [cropLeft, setCropLeft] = useState(0); // 0 to 0.45
  const [cropRight, setCropRight] = useState(0); // 0 to 0.45
  const [cropTop, setCropTop] = useState(0); // 0 to 0.45
  const [cropBottom, setCropBottom] = useState(0); // 0 to 0.45
  const [grabbedEdge, setGrabbedEdge] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);

  // States for tactile drag-to-scroll panning on zoom levels > 1
  const [isPanning, setIsPanning] = useState(false);
  const [hasPanned, setHasPanned] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Markers placed on the image
  const [markers, setMarkers] = useState<CellCountMarker[]>(() => {
    return ficha.countAnalysis?.markers ?? [];
  });

  // Modal results section
  const [resultsOpen, setResultsOpen] = useState(false);

  // Custom Ratio calculation state selection
  const [customRatioA, setCustomRatioA] = useState('');
  const [customRatioB, setCustomRatioB] = useState('');
  const [calculatedRatios, setCalculatedRatios] = useState<Array<{ label: string; value: number }>>([]);

  // Fetch or setup custom configurations from previous analyses
  useEffect(() => {
    if (countingMode === 'ufc') {
      setPopulations([
        { name: language === 'es' ? 'UFC / Placa' : 'CFU / Plate', color: '#16A34A' }
      ]);
      setActivePopIndex(0);
    } else if (countingMode === 'general') {
      const defaultPops = [
        { name: language === 'es' ? 'Células totales' : 'Total cells', color: '#2563EB' },
        { name: language === 'es' ? 'Infectadas' : 'Infected', color: '#DC2626' },
        { name: language === 'es' ? 'Trofos' : 'Trophozoites', color: '#16A34A' },
        { name: language === 'es' ? 'Esquizontes' : 'Schizonts', color: '#D97706' },
        { name: language === 'es' ? 'Anillos' : 'Rings', color: '#7C3AED' }
      ];

      // Add custom populations from saved markers if they exist
      if (ficha.countAnalysis?.markers) {
        const existingTypes = Array.from(new Set(ficha.countAnalysis.markers.map((m) => m.type)));
        const baseNames = defaultPops.map((p) => p.name);
        const missingTypes = existingTypes.filter((type) => !baseNames.includes(type) && type !== 'UFC / Placa' && type !== 'CFU / Plate');
        
        if (missingTypes.length > 0) {
          const extraColors = ['#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#64748B'];
          const extraPops = missingTypes.map((name, idx) => ({
            name,
            color: extraColors[idx % extraColors.length]
          }));
          setPopulations([...defaultPops, ...extraPops]);
        } else {
          setPopulations(defaultPops);
        }
      } else {
        setPopulations(defaultPops);
      }
      setActivePopIndex(0);
    }
  }, [countingMode, language]);

  // Keep UFC/UFP concentration calculated in real-time whenever inputs or markers change!
  useEffect(() => {
    if (countingMode === 'ufc') {
      const count = markers.length;
      const concentration = (count * 1000 * Math.pow(10, dilutionExponent)) / (seededVolume || 1);
      setCalculatedConcentration(concentration);
    }
  }, [markers.length, seededVolume, dilutionExponent, countingMode]);

  useEffect(() => {
    if (!tempImageSrc) {
      setImgObj(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      setImgObj(img);
    };
    img.src = tempImageSrc;
  }, [tempImageSrc]);

  // Main canvas redraw
  useEffect(() => {
    if (!mainCanvasRef.current || !imgObj) return;
    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const originalW = imgObj.naturalWidth || 800;
    const originalH = imgObj.naturalHeight || 600;

    canvas.width = isRotated90or270 ? originalH : originalW;
    canvas.height = isRotated90or270 ? originalW : originalH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // 1. First, apply any Brightness & Contrast HTML5 canvas filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // 2. Perform rotation trans-rotates
    if (rotation === 90) {
      ctx.translate(canvas.width, 0);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(imgObj, 0, 0, originalW, originalH);
    } else if (rotation === 180) {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate((180 * Math.PI) / 180);
      ctx.drawImage(imgObj, 0, 0, originalW, originalH);
    } else if (rotation === 270) {
      ctx.translate(0, canvas.height);
      ctx.rotate((270 * Math.PI) / 180);
      ctx.drawImage(imgObj, 0, 0, originalW, originalH);
    } else {
      ctx.drawImage(imgObj, 0, 0, originalW, originalH);
    }

    ctx.restore();

    // Reset filters to none for markers to remain standard crisp solid!
    ctx.filter = 'none';

    // Render live crop border guides if any crop value is active
    if (workflowStep === 'edit') {
      const xLeftPx = cropLeft * canvas.width;
      const xRightPx = (1 - cropRight) * canvas.width;
      const yTopPx = cropTop * canvas.height;
      const yBottomPx = (1 - cropBottom) * canvas.height;

      // Draw semi-translucent dark shroud for crop area visualization
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, 0, canvas.width, yTopPx); // Top
      ctx.fillRect(0, yBottomPx, canvas.width, canvas.height - yBottomPx); // Bottom
      ctx.fillRect(0, yTopPx, xLeftPx, yBottomPx - yTopPx); // Left
      ctx.fillRect(xRightPx, yTopPx, canvas.width - xRightPx, yBottomPx - yTopPx); // Right

      // Draw active crop box border in vibrant high-contrast blue with dash lines
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = Math.max(3, Math.floor(canvas.width * 0.005));
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(xLeftPx, yTopPx, xRightPx - xLeftPx, yBottomPx - yTopPx);
      ctx.setLineDash([]); // Reset line dash

      // Draw physical circular push handles for each of the four edges (Left, Right, Top, Bottom)
      const handleSize = Math.max(16, Math.floor(canvas.width * 0.024));
      
      const drawHandle = (hx: number, hy: number) => {
        // Outer core
        ctx.fillStyle = '#3B82F6';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2.5, handleSize * 0.18);
        ctx.beginPath();
        ctx.arc(hx, hy, handleSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Inner pivot target dot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(hx, hy, handleSize / 3, 0, 2 * Math.PI);
        ctx.fill();
      };

      const midX = xLeftPx + (xRightPx - xLeftPx) / 2;
      const midY = yTopPx + (yBottomPx - yTopPx) / 2;

      // Render handle elements at mid-edges
      drawHandle(xLeftPx, midY);   // Left crop handle
      drawHandle(xRightPx, midY);  // Right crop handle
      drawHandle(midX, yTopPx);    // Top crop handle
      drawHandle(midX, yBottomPx); // Bottom crop handle
    }

    // Draw markers relative to size
    markers.forEach((m) => {
      const mx = m.x * canvas.width;
      const my = m.y * canvas.height;

      // Draw dot outline circular
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = markerSize < 4 ? 0.75 : markerSize < 7 ? 1.5 : 2.5;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(mx, my, markerSize, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();

      // Draw inner core spot accent if markerSize is big enough
      if (markerSize >= 3) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(mx, my, markerSize / 3.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [imgObj, markers, rotation, brightness, contrast, cropLeft, cropRight, cropTop, cropBottom, markerSize, workflowStep, countingMode, zoomLevel]);

  // Translate click coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    const xFraction = (clientX - rect.left) / rect.width;
    const yFraction = (clientY - rect.top) / rect.height;

    return { xFraction, yFraction };
  };

  // Drag crop edges with mouse/touch directly on the photo canvas!
  const handleEditorMouseDownOrTouchStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (workflowStep !== 'edit' || !mainCanvasRef.current) return;
    const canvas = mainCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientX : 0) 
      : e.clientX;
    const clientY = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientY : 0) 
      : e.clientY;

    if (clientX === 0 && clientY === 0) return;

    const mouseX = (clientX - rect.left) / rect.width;
    const mouseY = (clientY - rect.top) / rect.height;

    const canvasX = mouseX * canvas.width;
    const canvasY = mouseY * canvas.height;

    const xLeftPx = cropLeft * canvas.width;
    const xRightPx = (1 - cropRight) * canvas.width;
    const yTopPx = cropTop * canvas.height;
    const yBottomPx = (1 - cropBottom) * canvas.height;

    // Tolerance in canvas pixels: let's give 35px for very easy finger grabbing on mobile!
    const screenScaleFactor = canvas.width / rect.width;
    const tol = 35 * screenScaleFactor; 

    const distL = Math.abs(canvasX - xLeftPx);
    const distR = Math.abs(canvasX - xRightPx);
    const distT = Math.abs(canvasY - yTopPx);
    const distB = Math.abs(canvasY - yBottomPx);

    let minDist = Infinity;
    let activeGrab: 'left' | 'right' | 'top' | 'bottom' | null = null;

    if (distL < tol && distL < minDist) { minDist = distL; activeGrab = 'left'; }
    if (distR < tol && distR < minDist) { minDist = distR; activeGrab = 'right'; }
    if (distT < tol && distT < minDist) { minDist = distT; activeGrab = 'top'; }
    if (distB < tol && distB < minDist) { minDist = distB; activeGrab = 'bottom'; }

    if (activeGrab) {
      if (e.cancelable) e.preventDefault();
      setGrabbedEdge(activeGrab);
    }
  };

  const handleEditorMouseMoveOrTouchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (workflowStep !== 'edit' || !mainCanvasRef.current) return;
    const canvas = mainCanvasRef.current;
    
    // Custom cursor feedback on hover
    if (!grabbedEdge && !('touches' in e)) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      const canvasX = mouseX * canvas.width;
      const canvasY = mouseY * canvas.height;

      const xLeftPx = cropLeft * canvas.width;
      const xRightPx = (1 - cropRight) * canvas.width;
      const yTopPx = cropTop * canvas.height;
      const yBottomPx = (1 - cropBottom) * canvas.height;

      const screenScaleFactor = canvas.width / rect.width;
      const tol = 25 * screenScaleFactor;

      const distL = Math.abs(canvasX - xLeftPx);
      const distR = Math.abs(canvasX - xRightPx);
      const distT = Math.abs(canvasY - yTopPx);
      const distB = Math.abs(canvasY - yBottomPx);

      if (distL < tol || distR < tol) {
        canvas.style.cursor = 'col-resize';
      } else if (distT < tol || distB < tol) {
        canvas.style.cursor = 'row-resize';
      } else {
        canvas.style.cursor = 'default';
      }
    }

    if (!grabbedEdge) return;

    if (e.cancelable) e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientX : 0) 
      : e.clientX;
    const clientY = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientY : 0) 
      : e.clientY;

    if (clientX === 0 && clientY === 0) return;

    const mouseX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const mouseY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    if (grabbedEdge === 'left') {
      setCropLeft(Math.max(0, Math.min(0.45, mouseX)));
    } else if (grabbedEdge === 'right') {
      setCropRight(Math.max(0, Math.min(0.45, 1 - mouseX)));
    } else if (grabbedEdge === 'top') {
      setCropTop(Math.max(0, Math.min(0.45, mouseY)));
    } else if (grabbedEdge === 'bottom') {
      setCropBottom(Math.max(0, Math.min(0.45, 1 - mouseY)));
    }
  };

  const handleEditorMouseUpOrTouchEnd = () => {
    setGrabbedEdge(null);
  };

  // Tactile drag-to-scroll panning helpers for zoomed frames
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1) return;
    const container = e.currentTarget;
    const clientX = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientX : 0) 
      : e.clientX;
    const clientY = 'touches' in e 
      ? (e.touches.length > 0 ? e.touches[0].clientY : 0) 
      : e.clientY;

    if (clientX === 0 && clientY === 0) return;

    setIsPanning(true);
    setHasPanned(false); // Reset panning flag on interaction start
    setPanStart({
      x: clientX,
      y: clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    });
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isPanning || zoomLevel <= 1) return;
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

    // If moved more than 6px, mark as panned to prevent placement
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      setHasPanned(true);
    }

    container.scrollLeft = panStart.scrollLeft - dx;
    container.scrollTop = panStart.scrollTop - dy;
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (workflowStep === 'edit') {
      // Sliders/adjusters are shown first. Clicks on the canvas in edit mode do not draw points.
      return;
    }

    // Dismiss click action if the user was just panning/scrolling
    if (hasPanned) {
      setHasPanned(false);
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const selectedPop = populations[activePopIndex];
    if (!selectedPop) return;

    const activeCategoryName = countingMode === 'ufc' 
      ? 'Colonia' 
      : selectedPop.name;

    // IF in DELETE click action, check if clicked on/very near a marker of the active category to remove it
    if (clickAction === 'delete') {
      if (mainCanvasRef.current) {
        const canvas = mainCanvasRef.current;
        const xPx = coords.xFraction * canvas.width;
        const yPx = coords.yFraction * canvas.height;
        
        let clickedMarkerIndex = -1;
        let minDistanceToDelete = 25; // generous click radius for deleting target cells easily
        
        for (let i = 0; i < markers.length; i++) {
          if (markers[i].type !== activeCategoryName) continue;

          const mx = markers[i].x * canvas.width;
          const my = markers[i].y * canvas.height;
          const dist = Math.sqrt((xPx - mx) ** 2 + (yPx - my) ** 2);
          
          if (dist <= minDistanceToDelete) {
            clickedMarkerIndex = i;
            break;
          }
        }
        
        if (clickedMarkerIndex !== -1) {
          setMarkers((prev) => prev.filter((_, idx) => idx !== clickedMarkerIndex));
        }
      }
      return;
    }

    // Otherwise, always ADD a new marker
    const newMarker: CellCountMarker = {
      id: Math.random().toString(36).substring(2, 9),
      x: coords.xFraction,
      y: coords.yFraction,
      type: activeCategoryName,
      color: selectedPop.color
    };

    setMarkers((prev) => [...prev, newMarker]);
  };

  // Create customized target cells
  const [showAddPopModal, setShowAddPopModal] = useState(false);
  const [newPopName, setNewPopName] = useState('');
  const [newPopColor, setNewPopColor] = useState('#EC4899');

  const handleAddCustomPopulation = () => {
    setShowAddPopModal(true);
    setNewPopName('');
    setNewPopColor('#EC4899');
  };

  const handleSaveCustomPopulation = () => {
    const trimmed = newPopName.trim();
    if (!trimmed) return;

    // Check dup
    if (populations.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(t.duplicateCategoryErr);
      return;
    }

    const newPop = { name: trimmed, color: newPopColor };
    setPopulations((prev) => [...prev, newPop]);
    setActivePopIndex(populations.length); // Select new pop automatically
    setShowAddPopModal(false);
  };

  const handleUndo = () => {
    if (markers.length > 0) {
      setMarkers((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const handleReset = () => {
    if (window.confirm(language === 'es' ? '¿Borrar todos los marcadores?' : 'Clear all markers?')) {
      setMarkers([]);
    }
  };

  // State for Auto-Detect similarity tolerance threshold
  const [similarityTolerance, setSimilarityTolerance] = useState(55);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);

  const handleAutoDetectSimilar = () => {
    setAutoDetectError(null);
    if (!imgObj || !mainCanvasRef.current) return;
    
    // Find a reference marker of the currently active population (if general) or just the first marker (if UFC)
    const activePop = populations[activePopIndex];
    const targetType = countingMode === 'ufc' ? 'Colonia' : (activePop ? activePop.name : null);
    
    // Find the last marker of this targetType to use as reference
    const refMarker = [...markers].reverse().find(m => countingMode === 'ufc' || m.type === targetType);
    
    if (!refMarker) {
      setAutoDetectError(
        language === 'es' 
          ? 'Por favor, coloque al menos un marcador manual sobre una célula/colonia de referencia primero para capturar su patrón de color.' 
          : 'Please place at least one manual marker on a reference cell/colony first to capture its color pattern.'
      );
      return;
    }
    
    try {
      const canvas = mainCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Calculate reference coordinates in pixels
      const refPx = Math.floor(refMarker.x * canvas.width);
      const refPy = Math.floor(refMarker.y * canvas.height);
      
      // Sample RGB average in a 5x5 box around it
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = refPx + dx;
          const py = refPy + dy;
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            const idx = (py * canvas.width + px) * 4;
            sumR += imgData.data[idx];
            sumG += imgData.data[idx+1];
            sumB += imgData.data[idx+2];
            count++;
          }
        }
      }
      
      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;

      // Sample a wider 13x13 neighborhood to detect local background polarity (contrast direction)
      let localBgR = 0, localBgG = 0, localBgB = 0, bgCount = 0;
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          const px = refPx + dx;
          const py = refPy + dy;
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
              const idx = (py * canvas.width + px) * 4;
              localBgR += imgData.data[idx];
              localBgG += imgData.data[idx+1];
              localBgB += imgData.data[idx+2];
              bgCount++;
            }
          }
        }
      }
      const bgAvgR = localBgR / (bgCount || 1);
      const bgAvgG = localBgG / (bgCount || 1);
      const bgAvgB = localBgB / (bgCount || 1);
      
      const refBrightness = (avgR + avgG + avgB) / 3;
      const bgBrightness = (bgAvgR + bgAvgG + bgAvgB) / 3;
      const isDarkCellOnLightBg = refBrightness < bgBrightness;
      
      // Run modular blob detection: scan in highly detailed increments
      const step = Math.max(3, Math.min(5, Math.floor(canvas.width / 200)));
      const minDistance = Math.max(12, markerSize * 1.4);
      
      // We will perform local clustering of matched similar pixels
      interface TempCluster {
        sumX: number;
        sumY: number;
        count: number;
        x: number;
        y: number;
      }
      const newClusters: TempCluster[] = [];
      
      for (let y = step + 2; y < canvas.height - step - 2; y += step) {
        for (let x = step + 2; x < canvas.width - step - 2; x += step) {
          const idx = (y * canvas.width + x) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx+1];
          const b = imgData.data[idx+2];
          
          const candBrightness = (r + g + b) / 3;

          // Relaxed contrast polarity gating so we don't discard true variations
          if (isDarkCellOnLightBg) {
            if (candBrightness > refBrightness + similarityTolerance * 1.45) {
              continue;
            }
          } else {
            if (candBrightness < refBrightness - similarityTolerance * 1.45) {
              continue;
            }
          }
          
          // Euclidean distance in RGB color space
          const diff = Math.sqrt(
            (r - avgR) ** 2 + 
            (g - avgG) ** 2 + 
            (b - avgB) ** 2
          );
          
          if (diff < similarityTolerance) {
            // Find closest cluster in the current turn
            let minCId = -1;
            let minCDist = Infinity;
            // Radius of grouping: we group pixels within minDistance * 1.4
            const groupRadius = minDistance * 1.4;

            for (let i = 0; i < newClusters.length; i++) {
              const c = newClusters[i];
              const dist = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
              if (dist < groupRadius && dist < minCDist) {
                minCDist = dist;
                minCId = i;
              }
            }

            if (minCId !== -1) {
              const c = newClusters[minCId];
              c.sumX += x;
              c.sumY += y;
              c.count += 1;
              c.x = c.sumX / c.count;
              c.y = c.sumY / c.count;
            } else {
              newClusters.push({
                sumX: x,
                sumY: y,
                count: 1,
                x: x,
                y: y
              });
            }
          }
        }
      }
      
      const updatedMarkers = [...markers];
      let addCount = 0;

      // Filter and add clusters that are not too close to any pre-existing markers
      for (const c of newClusters) {
        // Discard clusters containing too few pixels (e.g. noise / single outlier pixel)
        if (c.count < 3) continue;

        const fx = c.x / canvas.width;
        const fy = c.y / canvas.height;
        
        let tooClose = false;
        for (const m of markers) {
          const mx = m.x * canvas.width;
          const my = m.y * canvas.height;
          const dist = Math.sqrt((c.x - mx) ** 2 + (c.y - my) ** 2);
          if (dist < minDistance) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          updatedMarkers.push({
            id: Math.random().toString(36).substring(2, 9),
            x: fx,
            y: fy,
            type: refMarker.type,
            color: refMarker.color
          });
          addCount++;
        }
      }
      
      setMarkers(updatedMarkers);
      alert(
        language === 'es' 
          ? `¡Detección completada! Se añadieron ${addCount} marcadores similares de tipo "${refMarker.type}". Puedes hacer clic sobre cualquiera para eliminarlo si es un falso positivo.`
          : `Detection completed! Added ${addCount} similar markers of type "${refMarker.type}". You can click any to remove it if it's a false positive.`
      );
    } catch (e) {
      console.error(e);
      setAutoDetectError(
        language === 'es' 
          ? 'La imagen es demasiado grande o el navegador bloqueó la lectura de píxeles locales.' 
          : 'Image structure is too large or pixel reading was restricted by the browser.'
      );
    }
  };

  const applyCrop = (goToCount: boolean = false) => {
    if (!imgObj) return;

    // Check if any crop/filter adjustments were actually made
    const hasChanges = cropLeft > 0 || cropRight > 0 || cropTop > 0 || cropBottom > 0 || brightness !== 100 || contrast !== 100 || rotation !== 0;

    if (hasChanges) {
      // Create a temporary canvas matching crop area
      const tempCanvas = document.createElement('canvas');
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const originalW = imgObj.naturalWidth || 800;
      const originalH = imgObj.naturalHeight || 600;

      // Draw original rotated + adjustments baked in
      const rotatedCanvas = document.createElement('canvas');
      rotatedCanvas.width = isRotated90or270 ? originalH : originalW;
      rotatedCanvas.height = isRotated90or270 ? originalW : originalH;
      const rotCtx = rotatedCanvas.getContext('2d');
      if (rotCtx) {
        rotCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        if (rotation === 90) {
          rotCtx.translate(rotatedCanvas.width, 0);
          rotCtx.rotate((90 * Math.PI) / 180);
          rotCtx.drawImage(imgObj, 0, 0, originalW, originalH);
        } else if (rotation === 180) {
          rotCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
          rotCtx.rotate((180 * Math.PI) / 180);
          rotCtx.drawImage(imgObj, 0, 0, originalW, originalH);
        } else if (rotation === 270) {
          rotCtx.translate(0, rotatedCanvas.height);
          rotCtx.rotate((270 * Math.PI) / 180);
          rotCtx.drawImage(imgObj, 0, 0, originalW, originalH);
        } else {
          rotCtx.drawImage(imgObj, 0, 0, originalW, originalH);
        }
      }

      // We calculate coordinates in original image space
      const finalW = rotatedCanvas.width;
      const finalH = rotatedCanvas.height;
      const x = cropLeft * finalW;
      const y = cropTop * finalH;
      const w = (1 - cropRight - cropLeft) * finalW;
      const h = (1 - cropBottom - cropTop) * finalH;

      if (w > 0 && h > 0) {
        tempCanvas.width = w;
        tempCanvas.height = h;

        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(rotatedCanvas, x, y, w, h, 0, 0, w, h);
          const croppedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
          setTempImageSrc(croppedDataUrl);
        }
      }
    }

    // Reset crop states
    setCropLeft(0);
    setCropRight(0);
    setCropTop(0);
    setCropBottom(0);

    // Reset brightness and contrast to neutral 100% since they are baked into the raw pixels now!
    setBrightness(100);
    setContrast(100);
    setRotation(0);

    if (goToCount) {
      setWorkflowStep('count');
    } else {
      alert(language === 'es' ? 'Imagen editada y recortada con éxito.' : 'Image edited and cropped successfully.');
    }
  };

  // Compile totals counts
  const getCounts = (): Record<string, number> => {
    const counts: Record<string, number> = {};
    // Seed populations
    populations.forEach((p) => {
      counts[p.name] = 0;
    });

    markers.forEach((m) => {
      counts[m.type] = (counts[m.type] || 0) + 1;
    });

    return counts;
  };

  const activeCounts = getCounts();

  // Open up calculations analyzer
  const handleShowResults = () => {
    // Generate precalculated rates
    const freshRatios: Array<{ label: string; value: number }> = [];
    const counts = activeCounts;

    // Map keys depending on vocabulary language
    const totalKey = populations[0]?.name;
    const totalCount = counts[totalKey] || 0;

    if (totalCount > 0 && populations.length > 1) {
      populations.slice(1).forEach((pop) => {
         const count = counts[pop.name] || 0;
         if (count > 0) {
           const percentage = (count / totalCount) * 100;
           freshRatios.push({
             label: `${pop.name} / ${totalKey}`,
             value: percentage
           });
         }
      });
    }

    setCalculatedRatios(freshRatios);
    
    // Seed selectors
    if (populations.length > 1) {
      setCustomRatioA(populations[1].name);
      setCustomRatioB(populations[0].name);
    }

    setResultsOpen(true);
  };

  // Custom equation cross-multipliers
  const handleAddCustomRatio = () => {
    if (!customRatioA || !customRatioB) return;
    if (customRatioA === customRatioB) {
      alert(language === 'es' ? 'No puedes dividir una población por sí misma.' : 'Cannot divide a population by itself.');
      return;
    }

    const valA = activeCounts[customRatioA] || 0;
    const valB = activeCounts[customRatioB] || 0;

    if (valB === 0) {
      alert(language === 'es' ? 'Error: El denominador de conteo seleccionado es cero.' : 'Denominator count is zero.');
      return;
    }

    const percentage = (valA / valB) * 100;
    const labelText = `${customRatioA} / ${customRatioB}`;

    // Avoid duplicate calculations
    if (calculatedRatios.some((r) => r.label === labelText)) {
      alert(language === 'es' ? 'Este cociente ya fue calculado.' : 'This ratio is already calculated.');
      return;
    }

    setCalculatedRatios((prev) => [
      ...prev,
      { label: labelText, value: percentage }
    ]);
  };

  // Submit counting values on worksheet sheet dataset
  const handleSaveToFicha = () => {
    const finalCounts = getCounts();

    // Map predefined and custom categories
    const predefinedRatiosList: Array<{ label: string; value: number }> = [];
    const customRatiosList: Array<{ typeA: string; typeB: string; value: number }> = [];

    // Separate based on original populations
    calculatedRatios.forEach((ratio) => {
      const parts = ratio.label.split(' / ');
      if (parts.length === 2) {
        const isPredefined = populations.slice(1).some((p) => p.name === parts[0]) && parts[1] === populations[0].name;
        if (isPredefined) {
          predefinedRatiosList.push(ratio);
        } else {
          customRatiosList.push({
            typeA: parts[0],
            typeB: parts[1],
            value: ratio.value
          });
        }
      }
    });

    const valA = populations[0]?.name || 'Total';
    const analysis: CountAnalysis = {
      analysisDate: new Date().toISOString(),
      markers,
      counts: finalCounts,
      predefinedRatios: predefinedRatiosList,
      customRatios: customRatiosList,
      isUfcApp: false
    };

    onSaveAnalysis(analysis, tempImageSrc);
    setResultsOpen(false);
    alert(t.savedToCard);
  };

  const handleExportGeneralExcel = () => {
    const fileBaseName = `Recuento_Celulas_${ficha.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    const totalKey = populations[0]?.name || 'Total';
    const totalCount = activeCounts[totalKey] || markers.length || 0;

    const metaRows: (string | number)[][] = [
      [language === 'es' ? 'Recuento de Células / Poblaciones' : 'Cell Count Analysis', ''],
      [language === 'es' ? 'Ficha / Título' : 'Card / Title', ficha.title],
      [language === 'es' ? 'Fecha de Análisis' : 'Analysis Date', new Date().toLocaleString()],
      [language === 'es' ? 'Total de Marcadores' : 'Total Markers Count', markers.length]
    ];

    const popTableHeaders = [
      language === 'es' ? 'Población' : 'Population',
      language === 'es' ? 'Cantidad (Marcadores)' : 'Count (Markers)',
      language === 'es' ? 'Porcentaje sobre Total (%)' : 'Percentage of Total (%)'
    ];

    const popTableRows = populations.map((pop) => {
      const count = activeCounts[pop.name] || 0;
      const pct = totalCount > 0 ? parseFloat(((count / totalCount) * 100).toFixed(2)) : 0;
      return [pop.name, count, pct];
    });

    const sheetData: any[][] = [
      ...metaRows,
      [],
      [language === 'es' ? '--- RESUMEN POR POBLACIÓN ---' : '--- SUMMARY BY POPULATION ---'],
      popTableHeaders,
      ...popTableRows
    ];

    if (calculatedRatios.length > 0) {
      sheetData.push([]);
      sheetData.push([language === 'es' ? '--- COCIENTES / RATIOS CALCULADOS ---' : '--- CALCULATED RATIOS ---']);
      sheetData.push([
        language === 'es' ? 'Relación / Ratio' : 'Ratio Relation',
        language === 'es' ? 'Porcentaje (%)' : 'Percentage (%)'
      ]);
      calculatedRatios.forEach((item) => {
        sheetData.push([item.label, parseFloat(item.value.toFixed(2))]);
      });
    }

    sheetData.push([]);
    sheetData.push([language === 'es' ? '--- DETALLE DE MARCADORES INDIVIDUALES ---' : '--- INDIVIDUAL MARKERS DETAIL ---']);
    sheetData.push([
      language === 'es' ? 'N°' : '#',
      language === 'es' ? 'Población' : 'Population',
      'X (Fracción)',
      'Y (Fracción)'
    ]);
    markers.forEach((m, idx) => {
      sheetData.push([
        idx + 1,
        m.population || m.type,
        parseFloat(m.x.toFixed(4)),
        parseFloat(m.y.toFixed(4))
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recuento Celular');
    XLSX.writeFile(wb, `${fileBaseName}.xlsx`);
  };

  const handleExportGeneralCSV = () => {
    let csv = '';
    csv += `"Recuento de Celulas - Ficha: ${ficha.title}"\n`;
    csv += `"Fecha de Analisis";"${new Date().toLocaleString()}"\n\n`;

    csv += `"Poblacion";"Cantidad de Celulas (Marcadores)"\n`;
    populations.forEach((pop) => {
      const count = activeCounts[pop.name] || 0;
      csv += `"${pop.name}";"${count}"\n`;
    });
    csv += `\n`;

    if (calculatedRatios.length > 0) {
      csv += `"Ratios Calculados";"Porcentaje (%)"\n`;
      calculatedRatios.forEach((item) => {
        csv += `"${item.label}";"${item.value.toFixed(2)} %"\n`;
      });
      csv += `\n`;
    }

    csv += `"Indice";"Poblacion";"X (Fraccion)";"Y (Fraccion)"\n`;
    markers.forEach((m, idx) => {
      csv += `"${idx + 1}";"${m.population || m.type}";"${m.x.toFixed(4)}";"${m.y.toFixed(4)}"\n`;
    });

    const filename = `Recuento_Celulas_${ficha.title.replace(/\s+/g, '_')}.csv`;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUfcExcel = () => {
    const fileBaseName = `Recuento_UFC_${ficha.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    const concentration = (markers.length * 1000 * Math.pow(10, dilutionExponent)) / (seededVolume || 1);

    const sheetData: any[][] = [
      [language === 'es' ? 'Recuento de UFC / UFP' : 'Colony Count (CFU / PFU)', ''],
      [language === 'es' ? 'Ficha / Título' : 'Card / Title', ficha.title],
      [language === 'es' ? 'Fecha de Análisis' : 'Analysis Date', new Date().toLocaleString()],
      [language === 'es' ? 'Volumen Sembrado (µl)' : 'Seeded Volume (µl)', seededVolume],
      [language === 'es' ? 'Exponente de Dilución (10^-x)' : 'Dilution Exponent (10^-x)', dilutionExponent],
      [language === 'es' ? 'Recuento Total de Colonias' : 'Total Colonies Count', markers.length],
      [language === 'es' ? 'Concentración Calculada' : 'Calculated Concentration', `${concentration.toExponential(4)} UFC/ml o UFP/ml`],
      [],
      [language === 'es' ? '--- DETALLE DE COLONIAS / MARCADORES ---' : '--- COLONIES / MARKERS DETAIL ---'],
      [language === 'es' ? 'N°' : '#', 'X (Fracción)', 'Y (Fracción)']
    ];

    markers.forEach((m, idx) => {
      sheetData.push([
        idx + 1,
        parseFloat(m.x.toFixed(4)),
        parseFloat(m.y.toFixed(4))
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recuento UFC');
    XLSX.writeFile(wb, `${fileBaseName}.xlsx`);
  };

  const handleExportUfcCSV = () => {
    let csv = '';
    csv += `"Recuento de UFC / UFP - Ficha: ${ficha.title}"\n`;
    csv += `"Fecha de Analisis";"${new Date().toLocaleString()}"\n`;
    csv += `"Volumen Sembrado (ul)";"${seededVolume}"\n`;
    csv += `"Exponente de Dilucion (10^-x)";"${dilutionExponent}"\n`;
    csv += `"Recuento Total";"${markers.length}"\n`;
    
    const concentration = (markers.length * 1000 * Math.pow(10, dilutionExponent)) / (seededVolume || 1);
    csv += `"Concentracion Calculada";"${concentration.toExponential(4)} UFC/ml o UFP/ml"\n\n`;

    csv += `"Indice";"X (Fraccion)";"Y (Fraccion)"\n`;
    markers.forEach((m, idx) => {
      csv += `"${idx + 1}";"${m.x.toFixed(4)}";"${m.y.toFixed(4)}"\n`;
    });

    const filename = `Recuento_UFC_${ficha.title.replace(/\s+/g, '_')}.csv`;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UFC calculation helpers
  const handleCalculateUfc = () => {
    const count = markers.length;
    const concentration = (count * 1000 * Math.pow(10, dilutionExponent)) / (seededVolume || 1);
    setCalculatedConcentration(concentration);
  };

  const handleSaveUfcToFicha = () => {
    const count = markers.length;
    const finalConcentration = (count * 1000 * Math.pow(10, dilutionExponent)) / (seededVolume || 1);
    
    const analysis: CountAnalysis = {
      analysisDate: new Date().toISOString(),
      markers,
      counts: {
        'UFC / Placa': count
      },
      predefinedRatios: [],
      customRatios: [],
      isUfcApp: true,
      seededVolume,
      dilutionExponent,
      calculatedConcentration: finalConcentration
    };

    onSaveAnalysis(analysis, tempImageSrc);
    alert(language === 'es' ? '¡Análisis de placa UFC/UFP guardado exitosamente!' : 'Colony count analysis saved successfully!');
    onBack();
  };

  // ------------------------------------------------------------------------
  // SELECT METHODOLOGY AND SEQUENCE SCREENS
  // ------------------------------------------------------------------------

  // CASE 1: No image set yet: Show beautiful upload screen
  if (!tempImageSrc) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-8 px-4 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center transition-colors duration-200">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#E69A5E]/15 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-gray-100 text-[#B95C2E] border border-[#E69A5E]/20 px-3.5 py-1.5 rounded-xl cursor-pointer"
            >
              ⬅️ {t.back}
            </button>
            <ThemeToggle />
          </div>

          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 w-full bg-[#FFFDF9]">
            <div className="w-16 h-16 rounded-full bg-[#E69A5E]/10 flex items-center justify-center text-3xl animate-bounce">
              📷
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg text-[#3E2A1F]">
                {language === 'es' ? 'Tomar una foto o seleccionar' : 'Take a photo or select'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                {language === 'es' 
                  ? 'Arrastra tu microfotografía o selecciona un archivo para comenzar la edición' 
                  : 'Drag your photomicrograph here or select a file to start editing'
                }
              </p>
            </div>
            <label className="cursor-pointer bg-[#E69A5E] hover:bg-[#D48A4A] text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-xs inline-block">
              {language === 'es' ? 'Seleccionar Imagen o Archivo' : 'Select Image or File'}
              <input
                type="file"
                accept="*/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: Image is present but workflow step is 'edit': Show Photo Editor Setup!
  if (workflowStep === 'edit') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-[#E69A5E]/15 dark:border-slate-800 rounded-3xl shadow-lg p-4 md:p-6 mb-4">
          <div className="flex items-center justify-between gap-4 border-b border-[#E69A5E]/10 pb-4 mb-4">
            <button
              onClick={() => {
                setTempImageSrc(undefined);
              }}
              className="flex items-center gap-1 text-xs md:text-sm font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-3.5 py-2 rounded-xl transition-all min-h-[44px] cursor-pointer"
            >
              ⬅️ {language === 'es' ? 'Cambiar Foto / Descartar' : 'Discard Photo'}
            </button>
            <h2 className="text-sm md:text-base font-black flex items-center gap-1.5 text-[#3E2A1F]">
              🎨 {language === 'es' ? 'Editor de Fotografía' : 'Photo Editor'}
            </h2>
            <ThemeToggle />
          </div>

          <p className="text-xs text-[#3E2A1F]/75 text-center mb-4 leading-relaxed font-semibold">
            💡 {language === 'es' ? 'Encuadra la muestra usando las barras de recorte. Ajusta el brillo y contraste antes de ver el Selector.' : 'Crop out background artifacts using coordinates below and adjust lighting parameters before accessing the Method Selector.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-[#FFFDF9] rounded-2xl border border-gray-200 overflow-auto min-h-[300px] max-h-[500px] relative w-full flex justify-center items-center p-2 scrollbar-thin">
                <canvas
                  ref={mainCanvasRef}
                  onMouseDown={handleEditorMouseDownOrTouchStart}
                  onTouchStart={handleEditorMouseDownOrTouchStart}
                  onMouseMove={handleEditorMouseMoveOrTouchMove}
                  onTouchMove={handleEditorMouseMoveOrTouchMove}
                  onMouseUp={handleEditorMouseUpOrTouchEnd}
                  onTouchEnd={handleEditorMouseUpOrTouchEnd}
                  onMouseLeave={handleEditorMouseUpOrTouchEnd}
                  className="shadow bg-stone-100 block rounded-lg mx-auto select-none touch-none"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '480px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>

            <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
              <div className="border-b border-gray-100 pb-2">
                <h4 className="font-extrabold text-xs uppercase text-[#3E2A1F]/70 tracking-wider">
                  🛠️ {language === 'es' ? 'Filtros y Iluminación' : 'Visual parameters'}
                </h4>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>☀️ {language === 'es' ? 'Brillo' : 'Brightness'}</span>
                  <span className="font-mono text-xs font-bold text-[#E69A5E]">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#E69A5E] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>🌗 {language === 'es' ? 'Contraste' : 'Contrast'}</span>
                  <span className="font-mono text-xs font-bold text-[#E69A5E]">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#E69A5E] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1">🔄 {language === 'es' ? 'Rotar' : 'Rotate'}</span>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-all text-center"
                >
                  {rotation}° (+90°)
                </button>
              </div>

              <div className="space-y-2 bg-[#FFFDF9] p-3 rounded-xl border border-dashed border-[#E69A5E]/20">
                <span className="block text-[10px] font-black text-slate-500 uppercase">
                  ✂️ {language === 'es' ? 'Herramienta de Recorte' : 'Coordinates crop'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>⬅️ {language === 'es' ? 'Izquierda' : 'Left'}</span>
                      <span className="font-mono">{Math.round(cropLeft * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={Math.round(cropLeft * 100)}
                      onChange={(e) => setCropLeft(Number(e.target.value) / 100)}
                      className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>➡️ {language === 'es' ? 'Derecha' : 'Right'}</span>
                      <span className="font-mono">{Math.round(cropRight * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={Math.round(cropRight * 100)}
                      onChange={(e) => setCropRight(Number(e.target.value) / 100)}
                      className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>⬆️ {language === 'es' ? 'Superior' : 'Top'}</span>
                      <span className="font-mono">{Math.round(cropTop * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={Math.round(cropTop * 100)}
                      onChange={(e) => setCropTop(Number(e.target.value) / 100)}
                      className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>⬇️ {language === 'es' ? 'Inferior' : 'Bottom'}</span>
                      <span className="font-mono">{Math.round(cropBottom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={Math.round(cropBottom * 100)}
                      onChange={(e) => setCropBottom(Number(e.target.value) / 100)}
                      className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyCrop(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-750 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-[0.98] transition-all text-center"
              >
                ✅ {language === 'es' ? 'Aceptar y Proceder' : 'Accept & Proceed'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CASE 3: Active Image is cropped and workflow step is 'count' but countingMode is 'select': Show Count Selector!
  if (countingMode === 'select') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-8 px-4 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center transition-colors duration-200">
        {/* Header toolbar row */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-4">
          <button
            onClick={() => setWorkflowStep('edit')}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/90 hover:bg-white text-[#B95C2E] border border-[#E69A5E]/20 px-3.5 py-1.5 rounded-xl transition-all min-h-[36px] cursor-pointer"
          >
            ⬅️ {language === 'es' ? 'Volver al Editor de Foto' : 'Edit Photo'}
          </button>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-[#E69A5E]/15 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-[#3E2A1F] flex items-center justify-center gap-2">
              <span>🧮</span> {language === 'es' ? 'Selector de Recuento' : 'Count Selector'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {language === 'es' ? 'Selecciona la metodología de conteo para la ficha:' : 'Choose the counting methodology for this worksheet:'}
            </p>
            <span className="inline-block text-xs font-mono bg-[#E69A5E]/10 text-[#B95C2E] px-3 py-1 rounded-full font-bold uppercase mt-1">
              {ficha.title}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* General Cells Counter Card */}
            <button
              onClick={() => {
                setCountingMode('general');
              }}
              className="group p-6 text-left bg-white hover:bg-[#FFFDF9] border-2 border-gray-100 hover:border-[#E69A5E]/30 rounded-2xl shadow-xs hover:shadow transition-all space-y-3 cursor-pointer duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                🦟
              </div>
              <h3 className="font-bold text-sm md:text-base text-[#3E2A1F] group-hover:text-[#E69A5E]">
                {language === 'es' ? 'Células General' : 'General Cells'}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                {language === 'es' 
                  ? 'Contador celular multipoblación convencional con zoom y cálculo de porcentajes/cocientes.'
                  : 'Standard multi-population cell counter with zoom, custom ratios, and percentage calculator.'
                }
              </p>
            </button>

            {/* UFC / APP Counter Card */}
            <button
              onClick={() => {
                setCountingMode('ufc');
              }}
              className="group p-6 text-left bg-white hover:bg-[#FFFDF9] border-2 border-gray-100 hover:border-[#E69A5E]/30 rounded-2xl shadow-xs hover:shadow transition-all space-y-3 cursor-pointer duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                🧫
              </div>
              <h3 className="font-bold text-sm md:text-base text-[#3E2A1F] group-hover:text-[#E69A5E]">
                {language === 'es' ? 'UFC / UFP (Colonia o Placa)' : 'CFU / PFU'}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                {language === 'es'
                  ? 'Contador de colonias/placas individuales con parámetros de volumen sembrado, dilución y concentración por ml.'
                  : 'Colony and plaque forming unit count with custom volume, dilution exponents, and concentration output.'
                }
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // ACTIVE WORKSPACE GRAPHIC CONTROL PANEL
  // ------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-[#E69A5E]/15 dark:border-slate-800 rounded-3xl shadow-lg p-4 md:p-6">
        
        {/* Navigation and title block */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E69A5E]/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCountingMode('select')}
              className="flex items-center gap-1 text-xs md:text-sm font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-3.5 py-2 rounded-xl transition-all min-h-[44px] cursor-pointer"
            >
              ⬅️ {language === 'es' ? 'Volver al Selector' : 'Method Selector'}
            </button>
            <ThemeToggle />
          </div>

          <h2 className="text-sm md:text-base font-black flex items-center gap-1.5 text-[#3E2A1F]">
            <span>{countingMode === 'ufc' ? '🧫' : '🦟'}</span> 
            {countingMode === 'ufc'
              ? (language === 'es' ? 'Recuento de UFC / UFP' : 'CFU / PFU Counting')
              : t.cellCounterTitle
            }
            <span className="text-[10px] bg-[#E69A5E]/10 text-[#B95C2E] px-2.5 py-0.5 rounded-full font-bold uppercase ml-1">
              {ficha.title}
            </span>
          </h2>

          <div>
            {workflowStep === 'count' && (
              countingMode === 'general' ? (
                <div className="text-xs bg-[#E69A5E]/10 text-[#B95C2E] px-3 py-1.5 rounded-xl font-bold font-mono">
                  {language === 'es' ? 'Recuento General' : 'General Count'}
                </div>
              ) : (
                <div className="text-xs bg-indigo-50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-400 px-3 py-1.5 rounded-xl font-bold font-mono">
                  {language === 'es' ? 'Modo Dilución' : 'Dilution Mode'}
                </div>
              )
            )}
          </div>
        </div>


        {/* User Interactive Guide banner */}
        <div className="bg-blue-50 border border-blue-200 text-[#3E2A1F] p-3 rounded-2xl mb-4 text-xs">
          <p className="font-semibold flex items-center gap-1 text-blue-800">
            💡 {language === 'es' ? 'Instrucciones activas:' : 'Active Instructions:'}
          </p>
          <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] md:text-xs text-gray-700">
            {workflowStep === 'edit' ? (
              <>
                <li>{language === 'es' ? 'Utiliza los controles inferiores para recortar imperfecciones, rotar, o ajustar brillo y contraste.' : 'Use sliders below to crop border artifacts, rotate, or adjust brightness and contrast parameters.'}</li>
                <li>{language === 'es' ? 'Comprobarás los bordes con una línea de trazos rojos sobre la foto.' : 'Check the active boundaries through the red dashed outlines drawn over the image.'}</li>
                <li>{language === 'es' ? 'Al finalizar tus retoques, presiona el botón verde de abajo para confirmar.' : 'Upon adjustments completed, hit the primary green confirmation button below.'}</li>
              </>
            ) : (
              countingMode === 'ufc' ? (
                <>
                  <li>{language === 'es' ? 'Haz clic directamente sobre cada colonia o placa en la imagen.' : 'Click directly on each colony or viral plaque on the canvas.'}</li>
                  <li>{language === 'es' ? 'El zoom microscópico te permitirá identificar células pequeñas sin desmarcar.' : 'The microscopic zoom helps you target minor cells with ease.'}</li>
                  <li>{language === 'es' ? 'Puedes utilizar el identificador automático o ajustar la tolerancia abajo.' : 'Toggle smart auto-detection or adjust similarity tolerance below.'}</li>
                </>
              ) : (
                <>
                  <li>{language === 'es' ? 'Selecciona una población celular abajo (ej. Células totales, infectadas, anillos).' : 'Choose a cell population mode below (e.g., Total cells, infected, schizonts).'}</li>
                  <li>{language === 'es' ? 'Haz clic/tap en la imagen para colocar o remover un marcador asignado.' : 'Click or tap on the image to place or eliminate a specific marker.'}</li>
                  <li>{language === 'es' ? 'Regresa a la herramienta de edición si necesitas reajustar los filtros de luz.' : 'Go back to image setups if you need to redefine filters or crop sections.'}</li>
                </>
              )
            )}
          </ul>
        </div>

        {/* Main active counters dashboard section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="md:col-span-2 space-y-3.5">
            {/* Clickable Image canvas center window viewport */}
            <div 
              onMouseDown={handlePanStart}
              onTouchStart={handlePanStart}
              onMouseMove={handlePanMove}
              onTouchMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onTouchEnd={handlePanEnd}
              onMouseLeave={handlePanEnd}
              className={`rounded-2xl border border-gray-150 overflow-auto min-h-[300px] max-h-[500px] relative w-full p-2 scrollbar-thin transition-colors duration-200 ${
                zoomLevel > 1 
                  ? 'cursor-grab active:cursor-grabbing bg-slate-100 dark:bg-slate-950 block' 
                  : 'flex justify-center items-center bg-white dark:bg-slate-900'
              }`}
            >
              {imgObj ? (
                <canvas
                  ref={mainCanvasRef}
                  onClick={handleCanvasClick}
                  className={`shadow cursor-pointer bg-stone-100 touch-none block rounded-lg ${
                    zoomLevel === 1 ? 'mx-auto' : 'ml-0 mr-auto'
                  }`}
                  style={{
                    width: zoomLevel === 1 ? '100%' : `${100 * zoomLevel}%`,
                    minWidth: '100%',
                    maxWidth: zoomLevel === 1 ? '100%' : 'none',
                    height: 'auto',
                    maxHeight: zoomLevel === 1 ? '480px' : 'none',
                    objectFit: 'contain',
                    transition: 'width 0.15s ease-out'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 w-full">
                  <div className="w-16 h-16 rounded-full bg-[#E69A5E]/10 flex items-center justify-center text-3xl animate-bounce">
                    📷
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#3E2A1F]">
                      {language === 'es' ? 'Sube una imagen para realizar el recuento' : 'Upload an image to start counting'}
                    </p>
                    <p className="text-xs text-gray-500 max-w-sm">
                      {language === 'es' 
                        ? 'Arrastra tu microfotografía o selecciona un archivo JPG/PNG' 
                        : 'Drag your photomicrograph here or select a JPG/PNG file'
                      }
                    </p>
                  </div>
                  <label className="cursor-pointer bg-[#E69A5E] hover:bg-[#D48A4A] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs inline-block">
                    {language === 'es' ? 'Seleccionar Imagen o Archivo' : 'Select Image or File'}
                    <input
                      type="file"
                      accept="*/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Quick action buttons row (undo/clear and Zoom) - Only shown in active counting step 2 */}
            {workflowStep === 'count' && (
              <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 z-10 relative">
                
                {/* Information and Zoom row (Side by Side / wrapped gracefully) */}
                <div className="flex flex-row flex-wrap items-center justify-between gap-3 w-full">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 pl-1 shrink-0">
                    {countingMode === 'ufc' 
                      ? (language === 'es' ? 'Colonias totales:' : 'Total Colonies:') 
                      : t.countTotal
                    } <span className="font-mono text-sm text-[#3E2A1F] dark:text-slate-200 font-black">{markers.length}</span>
                  </span>

                  {/* Microscope Zoom range slider */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-3xs w-full sm:w-56 select-none shrink-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide truncate min-w-[32px]">
                      🔍 Zoom:
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="0.1"
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="flex-1 cursor-pointer accent-[#E69A5E] hover:accent-[#B95C2E] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 w-11 text-right select-none">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                  </div>
                </div>

                {/* Mobile Optimized Grid buttons: taking side-by-side equal sizing on cellphones and inline on desktops! */}
                <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => {
                      setRotation(0);
                      setBrightness(100);
                      setContrast(100);
                      setWorkflowStep('edit');
                    }}
                    className="px-2.5 py-2 bg-white hover:bg-amber-50/20 text-[#B95C2E] border border-amber-200 hover:border-amber-300 text-[11px] sm:text-xs font-black rounded-xl transition-all shadow-3xs cursor-pointer hover:shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 min-h-[38px] truncate"
                    title={language === 'es' ? 'Volver a recortar o ajustar luz' : 'Back to edits & crop'}
                  >
                    <span>⚙️ {language === 'es' ? 'Ajustes' : 'Crop'}</span>
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={markers.length === 0}
                    className="px-2.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 disabled:opacity-45 text-[11px] sm:text-xs font-black rounded-xl transition-all shadow-3xs cursor-pointer hover:shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 min-h-[38px] truncate"
                  >
                    <span>↩️ {t.undo}</span>
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={markers.length === 0}
                    className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-250 disabled:opacity-45 text-[11px] sm:text-xs font-black rounded-xl transition-all shadow-3xs cursor-pointer hover:shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 min-h-[38px] truncate"
                  >
                    <span>🗑️ {language === 'es' ? 'Reiniciar' : 'Reset'}</span>
                  </button>
                </div>

              </div>
            )}

            {/* STAGE 1: Image Setup Adjustments & Crop controls displayed right directly underneath the image canvas viewport! */}
            {workflowStep === 'edit' && imgObj && (
              <div className="bg-white p-4 rounded-2xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h4 className="font-extrabold text-sm uppercase text-[#3E2A1F] tracking-wide flex items-center gap-1.5">
                    ⚙️ {language === 'es' ? 'Herramientas de Edición y Recorte' : 'Image Editing & Cropping'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCropLeft(0);
                      setCropRight(0);
                      setCropTop(0);
                      setCropBottom(0);
                      setBrightness(100);
                      setContrast(100);
                      setRotation(0);
                    }}
                    className="text-xs font-extrabold text-[#B95C2E] hover:underline"
                  >
                    🔄 {language === 'es' ? 'Restaurar Todo' : 'Reset All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left block: Light Adjustments */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
                        <span>☀️ {language === 'es' ? 'Brillo / Exposición' : 'Brightness'}</span>
                        <span className="font-mono text-xs font-bold text-[#E69A5E]">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-[#E69A5E] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
                        <span>🌗 {language === 'es' ? 'Contraste' : 'Contrast'}</span>
                        <span className="font-mono text-xs font-bold text-[#E69A5E]">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-[#E69A5E] cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1">🔄 {language === 'es' ? 'Rotar Imagen' : 'Rotate Photo'}</span>
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors text-center"
                      >
                        {rotation}° (+90°)
                      </button>
                    </div>
                  </div>

                  {/* Right block: Cropping corners with sliders */}
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                    <span className="block text-[10px] font-black text-slate-500 uppercase">
                      ✂️ {language === 'es' ? 'Ajustes de Área de Recorte' : 'Margins crop lines:'}
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {language === 'es' 
                        ? 'Desliza para encuadrar solo la muestra microscópica, ignorando el fondo blanco o bordes oscuros en la placa.' 
                        : 'Adjust coordinates to isolate the cell sample, ignoring boarders or margins.'}
                    </p>

                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span>⬅️ {language === 'es' ? 'Izquierda' : 'Left'}</span>
                        <span className="font-mono">{Math.round(cropLeft * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="1"
                        value={Math.round(cropLeft * 100)}
                        onChange={(e) => setCropLeft(Number(e.target.value) / 100)}
                        className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span>➡️ {language === 'es' ? 'Derecha' : 'Right'}</span>
                        <span className="font-mono">{Math.round(cropRight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="1"
                        value={Math.round(cropRight * 100)}
                        onChange={(e) => setCropRight(Number(e.target.value) / 100)}
                        className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span>⬆️ {language === 'es' ? 'Superior' : 'Top'}</span>
                        <span className="font-mono">{Math.round(cropTop * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="1"
                        value={Math.round(cropTop * 100)}
                        onChange={(e) => setCropTop(Number(e.target.value) / 100)}
                        className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span>⬇️ {language === 'es' ? 'Inferior' : 'Bottom'}</span>
                        <span className="font-mono">{Math.round(cropBottom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="1"
                        value={Math.round(cropBottom * 100)}
                        onChange={(e) => setCropBottom(Number(e.target.value) / 100)}
                        className="w-full accent-[#E69A5E] cursor-pointer h-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Accept CTA */}
                <button
                  type="button"
                  onClick={() => applyCrop(true)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all text-center"
                >
                  ✅ {language === 'es' ? 'Aceptar y Proceder al Recuento' : 'Accept & Proceed to Count'}
                </button>
              </div>
            )}
          </div>

          {/* SIDE SELECTION COMPARTMENTS: Only visible in step 2 (Counting mode!) */}
          <div className="col-span-1 space-y-4">
            {workflowStep === 'count' ? (
              <>
                {/* 🔘 PUNTO THICKNESS PANEL - Requirement 3: relocated beautifully inside count panel */}
                <div className="bg-white p-4 rounded-2xl border border-[#E69A5E]/15 shadow-xs space-y-2">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                    🔘 {language === 'es' ? 'Grosor de Marcadores' : 'Point Thickness'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="24"
                      value={markerSize}
                      onChange={(e) => setMarkerSize(Number(e.target.value))}
                      className="w-full accent-[#E69A5E] cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-slate-700 shrink-0 w-6 text-right">
                      {markerSize}px
                    </span>
                  </div>
                </div>

                {countingMode === 'general' ? (
                  <div className="bg-white p-3 rounded-2xl border border-[#E69A5E]/15 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h4 className="font-black text-xs uppercase text-[#3E2A1F]/70 tracking-wider">
                        🧪 {t.modeSelector}
                      </h4>
                      <button
                        onClick={handleAddCustomPopulation}
                        className="text-[10px] font-black text-[#B95C2E] bg-[#E69A5E]/10 hover:bg-[#E69A5E]/18 px-2 py-1 rounded-lg cursor-pointer"
                        title="Nueva población"
                      >
                        ➕ {language === 'es' ? 'Nuevo' : 'New'}
                      </button>
                    </div>

                    {/* Selector populations grid */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                      {populations.map((pop, idx) => {
                        const count = activeCounts[pop.name] || 0;
                        const isActive = activePopIndex === idx;

                        return (
                          <button
                            key={pop.name}
                            onClick={() => setActivePopIndex(idx)}
                            className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                              isActive
                                ? 'border-transparent text-white scale-[1.01] shadow-xs font-bold'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{ backgroundColor: isActive ? pop.color : undefined }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Dot key */}
                              {!isActive && (
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white"
                                  style={{ backgroundColor: pop.color }}
                                />
                              )}
                              <span className="truncate text-xs">{pop.name}</span>
                            </div>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#E69A5E]/10 text-[#B95C2E]'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Show results button placed beautifully right below counting mode populations list */}
                    <button
                      onClick={handleShowResults}
                      disabled={markers.length === 0}
                      className="w-full mt-2 py-3 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-black text-xs sm:text-sm rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 hover:shadow-xs min-h-[44px] cursor-pointer animate-pulse"
                    >
                      📊 {t.seeResults}
                    </button>
                  </div>
                ) : (
                  // UFC / APP SIDE PANEL INPUTS
                  <div className="bg-white p-4 rounded-2xl border border-[#E69A5E]/15 shadow-xs space-y-4">
                    <div className="border-b border-gray-100 pb-2">
                      <h4 className="font-black text-xs uppercase text-[#3E2A1F]/70 tracking-wider flex items-center gap-1.5">
                        <span>🧫</span> {language === 'es' ? 'Parámetros UFC / UFP' : 'CFU / PFU Parameters'}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {/* Seeded volume */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600">
                          {language === 'es' ? 'Volumen Sembrado (µL):' : 'Seeded Volume (µL):'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={seededVolume}
                          onChange={(e) => setSeededVolume(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full text-xs font-mono font-bold bg-gray-50 border border-gray-200 p-2 rounded-lg text-[#3E2A1F] focus:outline-none"
                        />
                      </div>

                      {/* Dilution Factor Exponent x */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600 leading-normal">
                          {language === 'es' ? 'Factor de Dilución 10^(-x):' : 'Dilution Factor 10^(-x):'}
                          <span className="block text-[10px] text-[#B95C2E] font-medium mt-0.5">
                            {language === 'es' ? `Dilución: 10^${dilutionExponent}` : `Factor: 10^${dilutionExponent}`}
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={dilutionExponent}
                          onChange={(e) => setDilutionExponent(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full text-xs font-mono font-bold bg-gray-50 border border-gray-200 p-2 rounded-lg text-[#3E2A1F] focus:outline-none"
                        />
                      </div>

                      {/* Total colony count badge displaying in real-time */}
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-600">
                          {language === 'es' ? 'Placas / Colonias:' : 'Plaques / Colonies:'}
                        </span>
                        <span className="font-mono font-black text-[#1E3A8A] bg-blue-100/50 px-2.5 py-1 rounded shadow-3xs">
                          {markers.length}
                        </span>
                      </div>

                      {/* Calculate Concentration trigger btn */}
                      <button
                        type="button"
                        onClick={handleCalculateUfc}
                        className="w-full py-2.5 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1 hover:shadow-xs min-h-[40px] cursor-pointer"
                      >
                        🧮 {language === 'es' ? 'Calcular Concentración' : 'Calculate Concentration'}
                      </button>
                    </div>

                    {/* Calculated concentration results area */}
                    {calculatedConcentration !== null && (
                      <div className="pt-3.5 border-t border-gray-100 space-y-2.5">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50/45 border border-green-200 rounded-2xl p-3.5 text-center shadow-3xs">
                          <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider">
                            {language === 'es' ? 'Concentración Estimada' : 'Estimated Concentration'}
                          </span>
                          <p className="font-mono text-base font-black text-emerald-950 leading-snug mt-1">
                            {calculatedConcentration.toExponential(4)}
                          </p>
                          <span className="text-[10px] font-black text-emerald-700 font-mono">
                            UFC/ml o UFP/ml
                          </span>
                        </div>

                        <div className="bg-amber-50/30 p-2.5 rounded-xl border border-[#E69A5E]/10 space-y-1.5 text-[10px] text-gray-500 leading-relaxed font-semibold">
                          <p className="font-bold text-[#B95C2E] uppercase text-[9px] tracking-wide mb-0.5">
                            {language === 'es' ? 'Fórmula científica' : 'Scientific formula'}:
                          </p>
                          <p className="font-mono bg-white p-1.5 rounded border text-[9px]">
                            Result = (Count × 1000 × 10^x) / Vol
                          </p>
                          <p>
                            <strong>{language === 'es' ? 'Ejemplo' : 'Example'}:</strong><br />
                            {language === 'es' 
                              ? '45 colonias, 100 µL, x=5 → 4.50e7 UFC/ml' 
                              : '45 colonies, 100 µL, x=5 → 4.50e7 CFU/ml'
                            }
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                          <button
                            type="button"
                            onClick={handleExportUfcExcel}
                            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                            title={language === 'es' ? 'Descargar como planilla Excel (.xlsx)' : 'Download as Excel spreadsheet (.xlsx)'}
                          >
                            📊 {language === 'es' ? 'Excel' : 'Excel'}
                          </button>
                          <button
                            type="button"
                            onClick={handleExportUfcCSV}
                            className="py-2.5 px-2 bg-slate-700 hover:bg-slate-600 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                            title={language === 'es' ? 'Descargar como archivo CSV delimitado' : 'Download as delimited CSV file'}
                          >
                            📄 {language === 'es' ? 'CSV' : 'CSV'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveUfcToFicha}
                            className="py-2.5 px-2 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                          >
                            💾 {language === 'es' ? 'Guardar' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </>
            ) : (
              // Stage 1 informational check message card shown in right panel
              <div className="bg-[#FFFDF9] border border-[#E69A5E]/15 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                <span className="block text-xs font-black text-[#B95C2E] uppercase">📋 {language === 'es' ? 'Paso 1: Preparación' : 'Stage 1: Setup'}</span>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  {language === 'es' 
                    ? 'Por favor, recorte la imagen para eliminar bordes falsos o destellos no microscópicos y aplique los filtros de contraste/brillo necesarios para maximizar la calidad visual.' 
                    : 'Please trim border artifacts or dark background margins first, then adjust brightness/contrast values to maximize visual cell recognition.'}
                </p>
                <div className="p-3 bg-[#E69A5E]/5 border border-[#E69A5E]/10 rounded-xl text-[11px] text-[#B95C2E] font-medium">
                  <strong>{language === 'es' ? 'Nota:' : 'Note:'}</strong> {language === 'es' ? 'Los puntos e identificadores automáticos se habilitarán inmediatamente en el siguiente paso.' : 'Manual tagging and auto-detect will become active as soon as you proceed.'}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL WINDOW FOR CALCULATIONS & SAVE COCIENTES (GENERAL MODE) */}
      {resultsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/20 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setResultsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#B95C2E] p-1.5 text-lg"
            >
              ❌
            </button>

            <h3 className="text-lg font-black text-[#3E2A1F] border-b border-[#E69A5E]/10 pb-3 mb-4 text-center border-dashed">
              📊 {t.resultsTitle}
            </h3>

            {/* Matrix table count values */}
            <div className="space-y-4">
              <table className="w-full text-xs text-left border-collapse border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <thead>
                  <tr className="bg-gray-100 text-[#3E2A1F]/80 uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <th className="p-2.5 font-bold">{t.typeColumn}</th>
                    <th className="p-2.5 text-right font-bold">{t.countColumn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {populations.map((pop) => (
                    <tr key={pop.name} className="hover:bg-gray-50/50">
                      <td className="p-2.5 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: pop.color }} />
                        <span className="font-semibold text-gray-700">{pop.name}</span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                        {activeCounts[pop.name] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Ratios results display section */}
              {calculatedRatios.length > 0 && (
                <div className="bg-[#FFF3E0]/30 p-3.5 rounded-2xl border border-[#E69A5E]/10 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#3E2A1F]/70 text-center">
                    🧮 {t.ratiosCalculated}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {calculatedRatios.map((item) => (
                      <div key={item.label} className="bg-white p-2.5 rounded-xl border border-[#E69A5E]/10 flex justify-between items-center shadow-2xs">
                        <span className="font-mono text-[11px] text-gray-500 font-medium truncate shrink-0 max-w-[150px]">{item.label}</span>
                        <span className="font-mono font-bold text-blue-800 shrink-0">
                          {item.value.toFixed(2)} %
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic ratios calculator builder */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <h5 className="font-bold text-xs uppercase text-[#3E2A1F]/70 tracking-wide text-center">
                  ➕ {t.ratioSelectorHeader}
                </h5>
                <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-center">
                  <select
                    value={customRatioA}
                    onChange={(e) => setCustomRatioA(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg bg-white select-none shrink-0"
                  >
                    {populations.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <span className="font-bold font-mono text-gray-500 text-sm">/</span>

                  <select
                    value={customRatioB}
                    onChange={(e) => setCustomRatioB(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg bg-white select-none shrink-0"
                  >
                    {populations.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddCustomRatio}
                    className="p-2 font-bold text-white bg-[#E69A5E] hover:bg-[#D48A4A] px-4 rounded-lg min-h-[36px] transition-colors cursor-pointer"
                  >
                    {t.addRatio}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Modal operations */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap sm:flex-nowrap gap-2">
              <button
                onClick={() => setResultsOpen(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl min-h-[48px] cursor-pointer text-xs active:scale-95 transition-all text-center"
              >
                {t.back}
              </button>

              <button
                onClick={handleExportGeneralExcel}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl min-h-[48px] cursor-pointer text-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                title={language === 'es' ? 'Descargar como planilla Excel (.xlsx)' : 'Download as Excel spreadsheet (.xlsx)'}
              >
                📊 {language === 'es' ? 'Excel' : 'Excel'}
              </button>

              <button
                onClick={handleExportGeneralCSV}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl min-h-[48px] cursor-pointer text-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                title={language === 'es' ? 'Descargar como archivo CSV delimitado' : 'Download as CSV file'}
              >
                📄 {language === 'es' ? 'CSV' : 'CSV'}
              </button>

              <button
                onClick={handleSaveToFicha}
                className="flex-1 py-3 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-bold rounded-xl min-h-[48px] cursor-pointer text-xs shadow active:scale-95 transition-all text-center"
              >
                💾 {t.saveBtn}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* React-based Custom Modal for adding new Population  */}
      {showAddPopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-[#3E2A1F]">
            <h3 className="text-base font-black text-[#B95C2E] flex items-center gap-1.5">
              <span>➕</span> {language === 'es' ? 'Nueva población de conteo' : 'New Counting Population'}
            </h3>
            
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-gray-700">
                {language === 'es' ? 'Nombre de la población:' : 'Population Name:'}
              </label>
              <input
                type="text"
                autoFocus
                value={newPopName}
                onChange={(e) => setNewPopName(e.target.value)}
                className="w-full text-xs bg-white border border-[#E69A5E]/20 p-2.5 rounded-xl text-[#3E2A1F] focus:outline-none focus:ring-2 focus:ring-[#E69A5E]/50 placeholder-gray-400 font-bold"
                placeholder={language === 'es' ? 'Ej. Células necróticas' : 'e.g. Necrotic cells'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomPopulation();
                }}
              />

              <label className="block text-xs font-bold text-gray-700 pt-1">
                {language === 'es' ? 'Color identificativo:' : 'Identifier Color:'}
              </label>
              <div className="grid grid-cols-5 gap-2.5">
                {[
                  '#EC4899', // Pink
                  '#3B82F6', // Blue
                  '#EF4444', // Red
                  '#10B981', // Green
                  '#F59E0B', // Amber
                  '#8B5CF6', // Purple
                  '#14B8A6', // Teal
                  '#6366F1', // Indigo
                  '#06B6D4', // Cyan
                  '#64748B'  // Slate
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewPopColor(color)}
                    className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer relative flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: color,
                      borderColor: newPopColor === color ? '#3E2A1F' : 'transparent'
                    }}
                  >
                    {newPopColor === color && (
                      <span className="text-[10px] text-white">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowAddPopModal(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPopulation}
                disabled={!newPopName.trim()}
                className={`text-xs px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm text-white ${
                  newPopName.trim() ? 'bg-[#E69A5E] hover:bg-[#D48A4A]' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
