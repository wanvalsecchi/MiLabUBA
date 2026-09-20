import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Category, Ficha, FichaFieldValues, Language } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';

interface FichaFormProps {
  language: Language;
  category: Category;
  existingFicha?: Ficha;
  onSave: (title: string, runDate: string, image: string | undefined, fields: FichaFieldValues, extraImages?: string[]) => void;
  onCancel: () => void;
}

export default function FichaForm({
  language,
  category,
  existingFicha,
  onSave,
  onCancel
}: FichaFormProps) {
  const t = translations[language];

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

  // Steps: 'upload' | 'editor' | 'fields'
  const [step, setStep] = useState<'upload' | 'editor' | 'fields'>(
    existingFicha ? 'fields' : 'upload'
  );

  // States
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | undefined>(
    existingFicha?.image
  );
  const [editedImageSrc, setEditedImageSrc] = useState<string | undefined>(
    existingFicha?.image
  );

  // Form custom cancel & validation states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Field values state
  const [title, setTitle] = useState(existingFicha?.title || '');
  const [runDate, setRunDate] = useState(
    existingFicha?.runDate || new Date().toISOString().split('T')[0]
  );
  const [extraImages, setExtraImages] = useState<string[]>(
    existingFicha?.extraImages || []
  );
  const [lightboxImage, setLightboxImage] = useState<{ src: string; index: number } | null>(null);
  const [isSavedMain, setIsSavedMain] = useState<boolean>(false);
  const [isSavedLightbox, setIsSavedLightbox] = useState<boolean>(false);

  // Multi-select morphology dropdown state
  const [isMorphologyOpen, setIsMorphologyOpen] = useState(false);
  const [showGroupingInfo, setShowGroupingInfo] = useState(false);
  const morphologyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (morphologyRef.current && !morphologyRef.current.contains(e.target as Node)) {
        setIsMorphologyOpen(false);
      }
    };
    if (isMorphologyOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMorphologyOpen]);

  // Deep copy or initial values
  const [fields, setFields] = useState<FichaFieldValues>({
    title: existingFicha?.fields.title || '',
    runDate: existingFicha?.fields.runDate || new Date().toISOString().split('T')[0],
    
    // Microscopy
    microorganismType: existingFicha?.fields.microorganismType || '',
    stainAffinity: existingFicha?.fields.stainAffinity || '',
    stainAffinityOther: existingFicha?.fields.stainAffinityOther || '',
    morphology: existingFicha?.fields.morphology || '',
    morphologies: existingFicha?.fields.morphologies || (existingFicha?.fields.morphology ? existingFicha.fields.morphology.split(',').map(s => s.trim()).filter(Boolean) : []),
    morphologyOther: existingFicha?.fields.morphologyOther || '',
    grouping: existingFicha?.fields.grouping || '',
    groupingOther: existingFicha?.fields.groupingOther || '',
    magnification: existingFicha?.fields.magnification || '',
    coloration: existingFicha?.fields.coloration || '',
    colorationOther: existingFicha?.fields.colorationOther || '',

    // Cultivation Information
    cultureSupport: existingFicha?.fields.cultureSupport || '',
    cultureMedium: existingFicha?.fields.cultureMedium || '',
    selectiveAgent: existingFicha?.fields.selectiveAgent || '',
    temperature: existingFicha?.fields.temperature || '',
    incubationTime: existingFicha?.fields.incubationTime || '',
    atmosphericConditions: existingFicha?.fields.atmosphericConditions || '',

    // Macroscopic Information
    colonySize: existingFicha?.fields.colonySize || '',
    colonyShape: existingFicha?.fields.colonyShape || '',
    colonyTransparency: existingFicha?.fields.colonyTransparency || '',
    colonyBrightness: existingFicha?.fields.colonyBrightness || '',
    colonyColor: existingFicha?.fields.colonyColor || '',
    colonyTexture: existingFicha?.fields.colonyTexture || '',
    colonyConsistency: existingFicha?.fields.colonyConsistency || '',
    colonyGrowth: existingFicha?.fields.colonyGrowth || '',
    colonyGrowthOther: existingFicha?.fields.colonyGrowthOther || '',
    
    // SDS-PAGE & ADN
    sampleType: existingFicha?.fields.sampleType || '',
    approxMw: existingFicha?.fields.approxMw || '',
    gelPercentage: existingFicha?.fields.gelPercentage || '',
    glassThickness: existingFicha?.fields.glassThickness || '',
    voltage: existingFicha?.fields.voltage || '',
    amperage: existingFicha?.fields.amperage || '',
    runTime: existingFicha?.fields.runTime || '',
    fragmentSize: existingFicha?.fields.fragmentSize || '',
    agarosePercentage: existingFicha?.fields.agarosePercentage || '',
    
    // Custom
    description: existingFicha?.fields.description || '',

    // Histology Specific
    specimenType: existingFicha?.fields.specimenType || '',
    specimenTypeOther: existingFicha?.fields.specimenTypeOther || '',
    organTissue: existingFicha?.fields.organTissue || '',
    organTissueOther: existingFicha?.fields.organTissueOther || '',
    texture: existingFicha?.fields.texture || '',
    textureOther: existingFicha?.fields.textureOther || '',

    // Procesamiento Histológico
    fixation: existingFicha?.fields.fixation || '',
    fixationOther: existingFicha?.fields.fixationOther || '',
    fixationTime: existingFicha?.fields.fixationTime || '',
    inclusion: existingFicha?.fields.inclusion || '',
    inclusionOther: existingFicha?.fields.inclusionOther || '',
    sectioning: existingFicha?.fields.sectioning || '',
    sectioningOther: existingFicha?.fields.sectioningOther || '',
    sectionThickness: existingFicha?.fields.sectionThickness || '',
    mainStain: existingFicha?.fields.mainStain || '',
    mainStainOther: existingFicha?.fields.mainStainOther || '',

    // Condiciones de cultivo
    histoCultureType: existingFicha?.fields.histoCultureType || '',
    histoCultureTypeOther: existingFicha?.fields.histoCultureTypeOther || '',
    histoCellLine: existingFicha?.fields.histoCellLine || '',
    histoCultureMedium: existingFicha?.fields.histoCultureMedium || '',
    histoCultureMediumOther: existingFicha?.fields.histoCultureMediumOther || '',
    histoTreatment: existingFicha?.fields.histoTreatment || '',

    // Hallazgos microscópicos
    histoCellMorphology: existingFicha?.fields.histoCellMorphology || '',
    histoCellMorphologyOther: existingFicha?.fields.histoCellMorphologyOther || '',
    histoStainingPattern: existingFicha?.fields.histoStainingPattern || '',
    histoStainingPatternOther: existingFicha?.fields.histoStainingPatternOther || '',
    histoNucleus: existingFicha?.fields.histoNucleus || '',
    histoCytoplasm: existingFicha?.fields.histoCytoplasm || '',
    histoMembrane: existingFicha?.fields.histoMembrane || '',

    observations: existingFicha?.fields.observations || ''
  });

  const currentMorphologies = fields.morphologies && fields.morphologies.length > 0
    ? fields.morphologies
    : (fields.morphology ? fields.morphology.split(',').map(s => s.trim()).filter(Boolean) : []);
  const hasMultipleMorphologies = currentMorphologies.length > 1;

  // Canvas details for Image Editor
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editorMode, setEditorMode] = useState<'draw' | 'crop'>('draw');
  const [drawColor, setDrawColor] = useState('#E69A5E');
  const [lineWidth, setLineWidth] = useState(4);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState<Array<{ points: Array<{ x: number, y: number }>, color: string, width: number }>>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Array<{ x: number, y: number }>>([]);

  // Cropping State
  const [cropBox, setCropBox] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); // rates from 0 to 1
  const [isDraggingCrop, setIsDraggingCrop] = useState<'none' | 'center' | 'nw' | 'ne' | 'se' | 'sw'>('none');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartBox = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Handle file capture
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
        setSelectedImageSrc(reader.result as string);
        setAnnotations([]);
        setRotation(0);
        setStep('editor');
      };
      reader.readAsDataURL(file);
    }
  };

  // Image rotation controller
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Setup/Render canvas for editing
  useEffect(() => {
    if (step !== 'editor' || !selectedImageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      // Set resolution based on rotated measurements
      const is90or270 = rotation === 90 || rotation === 270;
      const baseWidth = img.naturalWidth || 800;
      const baseHeight = img.naturalHeight || 600;

      // Restrict max resolution for lightweight rendering
      const maxRes = 1024;
      let targetWidth = baseWidth;
      let targetHeight = baseHeight;

      if (Math.max(baseWidth, baseHeight) > maxRes) {
        const scale = maxRes / Math.max(baseWidth, baseHeight);
        targetWidth = Math.round(baseWidth * scale);
        targetHeight = Math.round(baseHeight * scale);
      }

      canvas.width = is90or270 ? targetHeight : targetWidth;
      canvas.height = is90or270 ? targetWidth : targetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Perform rotation offsets
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      ctx.restore();

      // Render drawing annotations
      annotations.forEach((item) => {
        if (item.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(item.points[0].x * canvas.width, item.points[0].y * canvas.height);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x * canvas.width, item.points[i].y * canvas.height);
        }
        ctx.stroke();
      });

      // Render currently drawing active stroke
      if (currentAnnotation.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(currentAnnotation[0].x * canvas.width, currentAnnotation[0].y * canvas.height);
        for (let i = 1; i < currentAnnotation.length; i++) {
          ctx.lineTo(currentAnnotation[i].x * canvas.width, currentAnnotation[i].y * canvas.height);
        }
        ctx.stroke();
      }

      // Render Crop overlay if in crop mode
      if (editorMode === 'crop') {
        const cx = cropBox.x * canvas.width;
        const cy = cropBox.y * canvas.height;
        const cw = cropBox.w * canvas.width;
        const ch = cropBox.h * canvas.height;

        // Dark dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        // Top rect
        ctx.fillRect(0, 0, canvas.width, cy);
        // Bottom rect
        ctx.fillRect(0, cy + ch, canvas.width, canvas.height - (cy + ch));
        // Left offset
        ctx.fillRect(0, cy, cx, ch);
        // Right offset
        ctx.fillRect(cx + cw, cy, canvas.width - (cx + cw), ch);

        // Crop border outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cw, ch);
        ctx.setLineDash([]);

        // Interactive beautiful circular corner handles - HIGH VISIBILITY BLUE FOR CELL COUNTER ALIGNMENTS
        ctx.fillStyle = '#2563EB'; // Bright royal blue to correspond perfectly to 'puntos azules'
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        const radius = 17; // Generous 34px diameter physical circles that are extremely easy to tap and drag!

        const drawHandleCircle = (hx: number, hy: number) => {
          ctx.beginPath();
          ctx.arc(hx, hy, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        };

        // NW
        drawHandleCircle(cx, cy);
        // NE
        drawHandleCircle(cx + cw, cy);
        // SE
        drawHandleCircle(cx + cw, cy + ch);
        // SW
        drawHandleCircle(cx, cy + ch);
      }
    };
    img.src = selectedImageSrc;
  }, [step, selectedImageSrc, rotation, annotations, currentAnnotation, editorMode, cropBox, drawColor, lineWidth]);

  // Touch & Mouse coordination mapping
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
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

    // Translate CSS pixel scaling back to actual Canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      normalX: (clientX - rect.left) / rect.width,
      normalY: (clientY - rect.top) / rect.height
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const coords = getCanvasCoords(e, canvasRef.current);
    if (!coords) return;

    if (editorMode === 'draw') {
      setIsDrawing(true);
      setCurrentAnnotation([{ x: coords.x / canvasRef.current.width, y: coords.y / canvasRef.current.height }]);
    } else if (editorMode === 'crop') {
      const canvas = canvasRef.current;
      const cx = cropBox.x * canvas.width;
      const cy = cropBox.y * canvas.height;
      const cw = cropBox.w * canvas.width;
      const ch = cropBox.h * canvas.height;

      const clickX = coords.x;
      const clickY = coords.y;

      const pixelLimit = 48; // Expanded to 48 pixels hit target radius for forgiving, smooth swipes on mobile & touch displays!
      const normalX = clickX / canvas.width;
      const normalY = clickY / canvas.height;

      // Determine click location inside or around corners
      let action: typeof isDraggingCrop = 'none';

      if (Math.hypot(clickX - cx, clickY - cy) < pixelLimit) {
        action = 'nw';
      } else if (Math.hypot(clickX - (cx + cw), clickY - cy) < pixelLimit) {
        action = 'ne';
      } else if (Math.hypot(clickX - (cx + cw), clickY - (cy + ch)) < pixelLimit) {
        action = 'se';
      } else if (Math.hypot(clickX - cx, clickY - (cy + ch)) < pixelLimit) {
        action = 'sw';
      } else if (
        normalX > cropBox.x &&
        normalX < cropBox.x + cropBox.w &&
        normalY > cropBox.y &&
        normalY < cropBox.y + cropBox.h
      ) {
        action = 'center';
      }

      if (action !== 'none') {
        setIsDraggingCrop(action);
        dragStartPos.current = { x: normalX, y: normalY };
        dragStartBox.current = { ...cropBox };
        e.preventDefault(); // prevents standard viewport scrolling on touch dragging
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const coords = getCanvasCoords(e, canvasRef.current);
    if (!coords) return;

    if (editorMode === 'draw' && isDrawing) {
      const relativeX = coords.x / canvasRef.current.width;
      const relativeY = coords.y / canvasRef.current.height;
      setCurrentAnnotation((prev) => [...prev, { x: relativeX, y: relativeY }]);
    } else if (editorMode === 'crop' && isDraggingCrop !== 'none') {
      const { normalX, normalY } = coords;
      const dx = normalX - dragStartPos.current.x;
      const dy = normalY - dragStartPos.current.y;

      const newBox = { ...dragStartBox.current };

      if (isDraggingCrop === 'center') {
        newBox.x = Math.max(0, Math.min(1 - newBox.w, newBox.x + dx));
        newBox.y = Math.max(0, Math.min(1 - newBox.h, newBox.y + dy));
      } else {
        const minSize = 0.1;
        if (isDraggingCrop === 'nw') {
          const right = newBox.x + newBox.w;
          const bottom = newBox.y + newBox.h;
          newBox.x = Math.max(0, Math.min(right - minSize, newBox.x + dx));
          newBox.y = Math.max(0, Math.min(bottom - minSize, newBox.y + dy));
          newBox.w = right - newBox.x;
          newBox.h = bottom - newBox.y;
        } else if (isDraggingCrop === 'ne') {
          const bottom = newBox.y + newBox.h;
          newBox.y = Math.max(0, Math.min(bottom - minSize, newBox.y + dy));
          newBox.w = Math.max(minSize, Math.min(1 - newBox.x, newBox.w + dx));
          newBox.h = bottom - newBox.y;
        } else if (isDraggingCrop === 'se') {
          newBox.w = Math.max(minSize, Math.min(1 - newBox.x, newBox.w + dx));
          newBox.h = Math.max(minSize, Math.min(1 - newBox.y, newBox.h + dy));
        } else if (isDraggingCrop === 'sw') {
          const right = newBox.x + newBox.w;
          newBox.x = Math.max(0, Math.min(right - minSize, newBox.x + dx));
          newBox.w = right - newBox.x;
          newBox.h = Math.max(minSize, Math.min(1 - newBox.y, newBox.h + dy));
        }
      }

      setCropBox(newBox);
      e.preventDefault();
    }
  };

  const handlePointerUp = () => {
    if (editorMode === 'draw' && isDrawing) {
      if (currentAnnotation.length >= 2) {
        setAnnotations((prev) => [
          ...prev,
          { points: currentAnnotation, color: drawColor, width: lineWidth }
        ]);
      }
      setIsDrawing(false);
      setCurrentAnnotation([]);
    } else if (editorMode === 'crop') {
      setIsDraggingCrop('none');
    }
  };

  // Undo draw line
  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, prev.length - 1));
  };

  // Clear all annotations
  const handleResetAnnotations = () => {
    setAnnotations([]);
  };

  // Accept/Apply adjustments inside editor
  const handleApplyEditor = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    try {
      if (editorMode === 'crop') {
        // Create a temporary canvas representing precisely the cropped region
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        const sx = cropBox.x * canvas.width;
        const sy = cropBox.y * canvas.height;
        const sw = cropBox.w * canvas.width;
        const sh = cropBox.h * canvas.height;

        tempCanvas.width = sw;
        tempCanvas.height = sh;

        tempCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

        const croppedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
        setEditedImageSrc(croppedDataUrl);
        setStep('fields');
      } else {
        // Just save full edited drawing
        const drawnDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setEditedImageSrc(drawnDataUrl);
        setStep('fields');
      }
    } catch (err) {
      console.error('Error cropping or exporting canvas image:', err);
      // Fallback: use selectedImageSrc directly so the user doesn't get stuck
      setEditedImageSrc(selectedImageSrc);
      setStep('fields');
    }
  };

  // Skip editing and go straight to form
  const handleSkipEditor = () => {
    setEditedImageSrc(selectedImageSrc);
    setStep('fields');
  };

  const handleAddExtraImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setExtraImages((prev) => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveExtraImage = (indexToRemove: number) => {
    setExtraImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleMorphology = (key: string) => {
    setFields((prev) => {
      const currentList: string[] = prev.morphologies && prev.morphologies.length > 0
        ? [...prev.morphologies]
        : (prev.morphology ? prev.morphology.split(',').map(s => s.trim()).filter(Boolean) : []);

      let nextList: string[];
      if (currentList.includes(key)) {
        nextList = currentList.filter(k => k !== key);
      } else {
        nextList = [...currentList, key];
      }

      return {
        ...prev,
        morphologies: nextList,
        morphology: nextList.join(', ')
      };
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError(language === 'es' ? 'ℹ️ El título del trabajo es obligatorio.' : 'ℹ️ Title of compilation is required.');
      return;
    }
    onSave(trimmedTitle, runDate, editedImageSrc, fields, extraImages);
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full max-w-2xl mx-auto bg-[#FFFDF9] border border-[#E69A5E]/15 rounded-3xl shadow-lg p-5 md:p-7">
        
        {/* Progress stepper title banner */}
        <div className="border-b border-[#E69A5E]/10 pb-4 mb-5 flex justify-between items-center gap-2">
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-1.5 truncate">
            <span>🔬</span>
            <span className="truncate">
              {existingFicha 
                ? (language === 'es' ? 'Modificar Trabajo' : 'Edit Job') 
                : `MiLabUBA • ${language === 'es' ? 'Nueva Ficha' : 'New Sheet'}`}
            </span>
          </h2>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
          <span className="text-xs bg-[#E69A5E]/10 text-[#B95C2E] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            {getCategoryDisplayName()}
          </span>
        </div>

        {/* STEP 1: PHOTO CAPTURE & SELECTION */}
        {step === 'upload' && (
          <div className="text-center py-6">
            <span className="text-5xl block mb-4">📷</span>
            <h3 className="font-extrabold text-base md:text-lg mb-2">
              {t.addPhoto}
            </h3>
            <p className="text-xs text-[#3E2A1F]/60 mb-6 max-w-sm mx-auto leading-relaxed">
              {language === 'es' 
                ? 'Sube capturas de microscopía o inmunogeles para analizarlos con las reglas integradas.' 
                : 'Upload microscopy or gel photographs to analyze them with integrated tool rulers.'}
            </p>

            <div className="flex flex-col gap-3.5 max-w-xs mx-auto">
              {/* Native Mobile Camera capture trigger */}
              <label className="flex items-center justify-center gap-2 text-white bg-[#E69A5E] hover:bg-[#D48A4A] px-5 py-3.5 rounded-2xl font-bold cursor-pointer transition-all active:scale-95 shadow min-h-[52px]">
                <span>{t.takePhoto}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Standard Gallery imports */}
              <label className="flex items-center justify-center gap-2 bg-white hover:bg-[#FFFDF9] text-[#B95C2E] border-2 border-[#E69A5E]/30 hover:border-[#E69A5E] px-5 py-3.5 rounded-2xl font-bold cursor-pointer transition-all active:scale-95 shadow-xs min-h-[52px]">
                <span>{language === 'es' ? 'Importar Foto o Archivo' : t.importGallery}</span>
                <input
                  type="file"
                  accept="*/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Skip photo step if none available */}
              <button
                type="button"
                onClick={() => setStep('fields')}
                className="text-xs text-[#3E2A1F]/60 hover:text-[#B95C2E] underline pt-2 cursor-pointer"
              >
                {language === 'es' ? 'Continuar sin foto' : 'Continue without photo'}
              </button>
            </div>

            <div className="mt-8 border-t border-[#E69A5E]/10 pt-4 flex justify-start">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs md:text-sm font-bold text-[#B95C2E] py-2 px-4 hover:underline"
              >
                ⬅️ {t.back}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CANVAS IMAGE EDITOR (CROP, DRAW, ROTATE) */}
        {step === 'editor' && selectedImageSrc && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm md:text-base text-center text-[#3E2A1F]">
              🛠️ {language === 'es' ? 'Herramientas de Edición' : 'Image Editing Tools'}
            </h3>

            {/* Editing mode tabs & rotation action */}
            <div className="flex flex-wrap items-center justify-center gap-2 bg-[#FFF3E0]/70 p-1.5 rounded-xl border border-[#E69A5E]/10">
              <button
                type="button"
                onClick={() => setEditorMode('draw')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editorMode === 'draw' ? 'bg-[#E69A5E] text-white' : 'text-[#3E2A1F]/70 hover:bg-[#E69A5E]/10'
                }`}
              >
                ✍️ {language === 'es' ? 'Anotar / Dibujar' : 'Annotate / Draw'}
              </button>
              
              <button
                type="button"
                onClick={() => setEditorMode('crop')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editorMode === 'crop' ? 'bg-[#E69A5E] text-white' : 'text-[#3E2A1F]/70 hover:bg-[#E69A5E]/10'
                }`}
              >
                ✂️ {language === 'es' ? 'Recortar' : 'Crop'}
              </button>

              <div className="h-4 w-px bg-[#E69A5E]/25"></div>

              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-[#E69A5E]/10 text-[#3E2A1F] transition-all cursor-pointer"
              >
                🔄 {language === 'es' ? 'Rotar 90°' : 'Rotate 90°'}
              </button>
            </div>

            {/* Brush Controls block if drawing mode active */}
            {editorMode === 'draw' && (
              <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-2.5 rounded-xl border border-[#E69A5E]/10 text-xs">
                {/* Color swatches */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-500 mr-1">Color:</span>
                  {['#E69A5E', '#B95C2E', '#E11D48', '#16A34A', '#2563EB', '#FFFFFF'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setDrawColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border border-gray-400 select-none cursor-pointer transition-transform ${
                        drawColor === c ? 'scale-110 ring-2 ring-amber-500' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>

                <div className="h-4 w-px bg-gray-200"></div>

                {/* Line size slider */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-500">Brush:</span>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-16 accent-[#E69A5E]"
                  />
                  <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded">{lineWidth}px</span>
                </div>

                <div className="h-4 w-px bg-gray-200"></div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={annotations.length === 0}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-[10px] font-bold rounded transition-colors"
                  >
                    ↩️ {t.undo}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAnnotations}
                    disabled={annotations.length === 0}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[#B95C2E] disabled:opacity-50 text-[10px] font-bold rounded transition-colors"
                  >
                    🗑️ {language === 'es' ? 'Borrar' : 'Clear'}
                  </button>
                </div>
              </div>
            )}

            {editorMode === 'crop' && (
              <p className="text-[10px] md:text-xs text-[#3E2A1F]/70 text-center bg-amber-50 border border-amber-200 p-2 rounded-lg">
                📋 {language === 'es' 
                  ? 'Arrastra los rectángulos de las esquinas para encuadrar la zona del gel/microbiología y presiona "Aceptar".' 
                  : 'Drag the corner anchor handles to frame your gel/microscopy area, then press "Accept".'}
              </p>
            )}

            {/* Interactive editing canvas container */}
            <div className="flex justify-center bg-gray-100 p-2 rounded-2xl border border-gray-200 overflow-hidden relative group max-h-[350px] md:max-h-[450px]">
              <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="max-w-full max-h-full object-contain cursor-crosshair shadow bg-white touch-none"
              />
            </div>

            {/* Form submit/skip navigation buttons */}
            <div className="flex justify-between items-center bg-white/50 p-2.5 rounded-xl mt-4">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs md:text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-xl min-h-[44px] cursor-pointer"
              >
                ⬅️ {language === 'es' ? 'Cambiar Foto' : 'Change Photo'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSkipEditor}
                  className="px-4 py-2 text-xs md:text-sm font-bold text-[#E69A5E] hover:underline min-h-[44px]"
                >
                  {language === 'es' ? 'Sin editar ⏩' : 'No editing ⏩'}
                </button>
                <button
                  type="button"
                  onClick={handleApplyEditor}
                  className="px-5 py-2 text-xs md:text-sm font-bold bg-[#E69A5E] hover:bg-[#D48A4A] text-white rounded-xl min-h-[44px] shadow cursor-pointer"
                >
                  {t.accept} ✔️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: WORK SHEET METADATA FORM FIELDS */}
        {step === 'fields' && (
          <form onSubmit={handleSaveForm} className="space-y-5">
            {/* Display chosen thumbnail preview */}
            {editedImageSrc ? (
              <div className="flex gap-4 items-center bg-[#FFF3E0]/40 p-3 rounded-xl border border-[#E69A5E]/10">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white shrink-0 border border-gray-200 shadow-sm">
                  <img src={editedImageSrc} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#3E2A1F]">📸 {t.previewPhoto}</p>
                  <div className="flex gap-3 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageSrc(editedImageSrc);
                        setStep('editor');
                      }}
                      className="text-[10px] md:text-xs text-[#B95C2E] hover:underline font-semibold"
                    >
                      ✏️ {language === 'es' ? 'Editar/Recortar esta foto otra vez' : 'Edit/Crop this photo again'}
                    </button>
                    <span className="text-gray-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageSrc(undefined);
                        setEditedImageSrc(undefined);
                      }}
                      className="text-[10px] md:text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      🗑️ {language === 'es' ? 'Quitar Foto' : 'Remove Photo'}
                    </button>
                    <span className="text-gray-300 text-xs">|</span>
                    <a
                      href={editedImageSrc}
                      download={`foto_principal_${Date.now()}.png`}
                      onClick={() => {
                        setIsSavedMain(true);
                        setTimeout(() => setIsSavedMain(false), 2000);
                      }}
                      className={`text-[10px] md:text-xs font-semibold flex items-center gap-0.5 cursor-pointer transition-all duration-200 ${
                        isSavedMain 
                          ? 'text-emerald-600 dark:text-emerald-400 font-extrabold scale-105 bg-emerald-50 dark:bg-emerald-950/25 px-2 py-0.5 rounded-lg border border-emerald-200/50' 
                          : 'text-indigo-600 hover:underline'
                      }`}
                    >
                      {isSavedMain ? (
                        <>✅ {language === 'es' ? '¡Guardado con éxito!' : 'Successfully Saved!'}</>
                      ) : (
                        <>📥 {language === 'es' ? 'Guardar en Galería' : 'Save to Gallery'}</>
                      )}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFF3E0]/40 p-4 rounded-2xl border-2 border-dashed border-[#E69A5E]/20 text-center space-y-2">
                <p className="text-xs font-bold text-[#3E2A1F]/70">
                  📁 {language === 'es' ? 'Este trabajo no tiene foto asignada' : 'No photo assigned to this worksheet'}
                </p>
                <div className="flex justify-center flex-wrap gap-2 pt-1">
                  <label className="text-[11px] font-black bg-[#E69A5E] hover:bg-[#D48A4A] text-white px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5 min-h-[40px]">
                    <span>📷 {language === 'es' ? 'Tomar con Cámara' : 'Use Camera'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <label className="text-[11px] font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5 min-h-[40px] border border-[#E69A5E]/15">
                    <span>📤 {language === 'es' ? 'Subir Foto o Archivo' : 'Upload Photo or File'}</span>
                    <input
                      type="file"
                      accept="*/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ADDITIONAL IMAGES FOR PDF (3.2) */}
            {!['sds-page', 'adn', 'count', 'densitometria', 'zimografia'].includes(category.type) && (
              <div className="bg-amber-50/20 dark:bg-slate-900/10 p-4 rounded-2xl border border-[#E69A5E]/15 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-[#3E2A1F] dark:text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                    🖼️ {language === 'es' ? 'Imágenes Adicionales para el PDF' : 'Additional Images for PDF'} 
                    <span className="text-[10px] font-normal text-[#3E2A1F]/50 dark:text-slate-500 lowercase">({language === 'es' ? 'opcional' : 'optional'})</span>
                  </h4>
                  <p className="text-[11px] text-[#3E2A1F]/70 dark:text-gray-400 mt-1">
                    {language === 'es' 
                      ? 'Sube fotos adicionales para la ficha y el PDF. Haz clic en una imagen cargada para verla a tamaño completo.'
                      : 'Upload additional images for the sheet and PDF. Click on any uploaded image to view it full size.'}
                  </p>
                </div>

                {/* Extra Images grid preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {extraImages.map((imgSrc, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setLightboxImage({ src: imgSrc, index: idx })}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xs cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all"
                      title={language === 'es' ? 'Hacer clic para ver a tamaño completo' : 'Click to view full size'}
                    >
                      <img src={imgSrc} alt={`Extra ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveExtraImage(idx);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors shadow-md cursor-pointer flex items-center justify-center z-10"
                        title={language === 'es' ? 'Quitar imagen' : 'Remove image'}
                      >
                        <span className="text-[10px] leading-none font-bold">✕</span>
                      </button>
                      <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/60 text-white font-mono px-1.5 rounded py-0.5">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Option 1: Tomar Foto con Cámara */}
                  <label className="border-2 border-dashed border-[#E69A5E]/30 hover:border-[#E69A5E] bg-white hover:bg-amber-50/20 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-[#B95C2E] p-2 select-none">
                    <span className="text-xl">📷</span>
                    <span className="text-[10px] font-bold text-center leading-tight">
                      {language === 'es' ? 'Tomar con Cámara' : 'Take with Camera'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAddExtraImage}
                      className="hidden"
                    />
                  </label>

                  {/* Option 2: OneDrive, Dropbox o Galería */}
                  <label className="border-2 border-dashed border-[#E69A5E]/30 hover:border-[#E69A5E] bg-white hover:bg-amber-50/20 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-[#B95C2E] p-2 select-none">
                    <span className="text-xl">📂</span>
                    <span className="text-[9px] font-bold text-center leading-tight">
                      {language === 'es' ? 'OneDrive, Dropbox, Galería...' : 'OneDrive, Dropbox, Gallery...'}
                    </span>
                    <input
                      type="file"
                      accept="*/*"
                      onChange={handleAddExtraImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* COMMON FIELDS PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#3E2A1F] uppercase tracking-wider mb-1">
                  {t.titleLabel}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-[#E69A5E]/30 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E] text-[#3E2A1F] font-bold shadow-xs"
                  placeholder={language === 'es' ? "Ej. Corrida de Control Gram" : "e.g. Gram Control Prep"}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#3E2A1F] uppercase tracking-wider mb-1">
                  📅 {t.runDateLabel}
                </label>
                <input
                  type="date"
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  className="w-full p-3 border border-[#E69A5E]/30 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E] text-[#3E2A1F] font-bold shadow-xs font-mono"
                />
              </div>
            </div>

            {/* CATEGORY SPECIFIC FIELDS RENDERER */}
            <div className="bg-[#FFF3E0]/20 p-4 rounded-2xl border border-[#E69A5E]/10 space-y-4">
              {/* MICROSCOPY */}
              {category.type === 'microscopy' && (
                <div className="space-y-6">
                  {/* Recuadro 1: Observación Microscópica */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🔬</span> {language === 'es' ? 'Observación Microscópica' : 'Microscopic Observation'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Aumento */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🔎 {language === 'es' ? 'Aumento (Magnification)' : 'Magnification'}
                        </label>
                        <input
                          type="text"
                          name="magnification"
                          value={fields.magnification}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. 1000x, 400x, etc.' : 'e.g. 1000x, 400x'}
                        />
                      </div>

                      {/* Tipo de microorganismo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🦠 {language === 'es' ? 'Tipo de microorganismo' : 'Type of Microorganism'}
                        </label>
                        <input
                          type="text"
                          name="microorganismType"
                          value={fields.microorganismType || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. Staphylococcus aureus, E. coli' : 'e.g. Staphylococcus aureus, E. coli'}
                        />
                      </div>

                      {/* Morfologías presentes (Selección múltiple estilo dropdown/select) */}
                      <div className="space-y-1.5" ref={morphologyRef}>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80">
                          💠 {language === 'es' ? 'Morfologías presentes' : 'Present Morphologies'}
                        </label>

                        {(() => {
                          const currentList = fields.morphologies && fields.morphologies.length > 0
                            ? fields.morphologies
                            : (fields.morphology ? fields.morphology.split(',').map(s => s.trim()).filter(Boolean) : []);

                          const morphologyOptionsList = [
                            { key: 'coco', label: t.morphologyOptions?.['coco'] || 'Coco' },
                            { key: 'bacilo', label: t.morphologyOptions?.['bacilo'] || 'Bacilo' },
                            { key: 'cocobacilo', label: t.morphologyOptions?.['cocobacilo'] || 'Cocobacilo' },
                            { key: 'espirilo', label: t.morphologyOptions?.['espirilo'] || 'Espirilo' },
                            { key: 'filamentoso', label: t.morphologyOptions?.['filamentoso'] || 'Filamentoso' },
                            { key: 'otra', label: t.morphologyOptions?.['otra'] || (language === 'es' ? 'Otra' : 'Other') },
                          ];

                          const displaySummary = currentList.length > 0
                            ? currentList.map(key => {
                                const opt = morphologyOptionsList.find(o => o.key === key);
                                return opt ? opt.label : key;
                              }).join(', ')
                            : '';

                          return (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsMorphologyOpen(prev => !prev)}
                                className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E] flex items-center justify-between text-left cursor-pointer min-h-[42px] transition-colors"
                              >
                                <span className={`truncate ${displaySummary ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                                  {displaySummary || t.selectPlaceholder}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isMorphologyOpen ? 'rotate-180 text-[#582C83]' : ''}`} />
                              </button>

                              {/* Dropdown list - full width vertical rows, comfortable for mobile portrait */}
                              {isMorphologyOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="text-[11px] font-bold text-slate-400 px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                                    <span>{language === 'es' ? 'Tocá las opciones para seleccionar una o más:' : 'Tap options to select one or more:'}</span>
                                    <span className="text-[#582C83] dark:text-purple-400 font-extrabold">{currentList.length}</span>
                                  </div>
                                  <div className="max-h-56 overflow-y-auto space-y-1 p-0.5">
                                    {morphologyOptionsList.map(({ key, label }) => {
                                      const isSelected = currentList.includes(key);
                                      return (
                                        <button
                                          key={key}
                                          type="button"
                                          onClick={() => handleToggleMorphology(key)}
                                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between cursor-pointer transition-all active:scale-99 text-left ${
                                            isSelected
                                              ? 'bg-[#582C83] text-white shadow-xs'
                                              : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <span>{label}</span>
                                          <span className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs shrink-0 ml-2 font-black ${
                                            isSelected
                                              ? 'border-white text-white bg-white/20'
                                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                                          }`}>
                                            {isSelected ? '✓' : ''}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                      type="button"
                                      onClick={() => setIsMorphologyOpen(false)}
                                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                                    >
                                      {language === 'es' ? 'Listo / Guardar selección' : 'Done / Keep selection'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Especificar otra morfología observada si está seleccionada */}
                              {currentList.includes('otra') && (
                                <div className="pt-2 animate-in fade-in duration-150">
                                  <input
                                    type="text"
                                    name="morphologyOther"
                                    value={fields.morphologyOther || ''}
                                    onChange={handleFieldChange}
                                    className="w-full p-2.5 border border-[#582C83]/30 rounded-xl bg-white text-sm outline-none focus:border-[#582C83]"
                                    placeholder={language === 'es' ? 'Especificar otra morfología observada...' : 'Specify other observed morphology...'}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Agrupación */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-extrabold text-[#3E2A1F]/80">
                            🔗 {language === 'es' ? 'Agrupación' : 'Grouping'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowGroupingInfo(prev => !prev)}
                            className="text-[11px] text-[#582C83] dark:text-purple-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>ℹ️</span>
                            <span>{language === 'es' ? (showGroupingInfo ? 'Ocultar guía' : 'Guía de agrupaciones') : (showGroupingInfo ? 'Hide guide' : 'Grouping guide')}</span>
                          </button>
                        </div>

                        {/* Guía informativa de opciones de agrupación */}
                        {showGroupingInfo && (
                          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                            <h5 className="font-bold text-[#582C83] dark:text-purple-300 text-[11px] uppercase tracking-wide">
                              🔬 {language === 'es' ? 'Referencia de Agrupaciones' : 'Grouping Reference'}
                            </h5>
                            <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-200">
                              <li><strong>• {t.groupingOptions?.['aislado'] || 'Aislado'}:</strong> {language === 'es' ? 'Células individuales dispersas tras la división.' : 'Single bacterial cells separated after division.'}</li>
                              <li><strong>• {t.groupingOptions?.['diplo'] || 'Diplo'}:</strong> {language === 'es' ? 'Células asociadas de a pares.' : 'Cells associated in pairs.'}</li>
                              <li><strong>• {t.groupingOptions?.['estrepto'] || 'Estrepto (cadenas)'}:</strong> {language === 'es' ? 'Células en cadenas lineales.' : 'Cells aligned in linear chains.'}</li>
                              <li><strong>• {t.groupingOptions?.['estafilo'] || 'Estafilo (ramillete)'}:</strong> {language === 'es' ? 'Células en racimos o ramilletes irregulares.' : 'Cells grouped in irregular clusters.'}</li>
                              <li><strong>• {t.groupingOptions?.['tetrada'] || 'Tétrada'}:</strong> {language === 'es' ? 'Grupos regulares de cuatro células.' : 'Arrangement of four cells.'}</li>
                              <li><strong>• {t.groupingOptions?.['otra'] || 'Otra (indicar)'}:</strong> {language === 'es' ? 'Empalizadas, formas pleomórficas, sarcinas, o cuando se observan múltiples morfologías.' : 'Palisades, pleomorphic forms, sarcinae, or when multiple morphologies are observed.'}</li>
                            </ul>
                          </div>
                        )}

                        {/* Cartel cuando se eligen más de una morfología */}
                        {hasMultipleMorphologies && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                            <div className="flex items-start gap-2">
                              <span className="text-amber-600 dark:text-amber-400 text-sm font-bold shrink-0">⚠️</span>
                              <div className="flex-1">
                                <p className="font-bold text-amber-900 dark:text-amber-200">
                                  {language === 'es'
                                    ? 'Observación con más de una morfología:'
                                    : 'Observation with multiple morphologies:'}
                                </p>
                                <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed text-[11px]">
                                  {language === 'es'
                                    ? 'En «Agrupación» debe seleccionar «Otra (indicar)» para detallar la agrupación de cada morfología observada.'
                                    : 'In «Grouping», select «Other (indicate)» to specify the grouping for each observed morphology below.'}
                                </p>
                              </div>
                            </div>
                            {fields.grouping !== 'otra' && (
                              <button
                                type="button"
                                onClick={() => setFields(prev => ({ ...prev, grouping: 'otra' }))}
                                className="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer active:scale-98 flex items-center gap-1 shadow-sm"
                              >
                                <span>👉</span>
                                <span>{language === 'es' ? 'Seleccionar «Otra (indicar)»' : 'Select «Other (indicate)»'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        <select
                          name="grouping"
                          value={fields.grouping || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="aislado">{t.groupingOptions?.['aislado'] || (language === 'es' ? 'Aislado' : 'Isolated')}</option>
                          <option value="diplo">{t.groupingOptions?.['diplo'] || (language === 'es' ? 'Diplo' : 'Diplo (Duplet)')}</option>
                          <option value="estrepto">{t.groupingOptions?.['estrepto'] || (language === 'es' ? 'Estrepto (cadenas)' : 'Strepto (Chain)')}</option>
                          <option value="estafilo">{t.groupingOptions?.['estafilo'] || (language === 'es' ? 'Estafilo (ramillete)' : 'Staphylo (Cluster)')}</option>
                          <option value="tetrada">{t.groupingOptions?.['tetrada'] || (language === 'es' ? 'Tétrada' : 'Tetrad')}</option>
                          <option value="otra">{t.groupingOptions?.['otra'] || (language === 'es' ? 'Otra (indicar)' : 'Other (indicate)')}</option>
                        </select>

                        {/* Habilitación para indicar la agrupación de cada morfología observada */}
                        {fields.grouping === 'otra' && (
                          <div className="pt-1 animate-in fade-in duration-150">
                            <label className="block text-[11px] font-bold text-[#582C83] dark:text-purple-300 mb-1">
                              ✍️ {hasMultipleMorphologies
                                ? (language === 'es' ? 'Indicar la agrupación de cada morfología observada:' : 'Specify the grouping of each observed morphology:')
                                : (language === 'es' ? 'Especificar agrupación observada:' : 'Specify observed grouping:')}
                            </label>
                            <input
                              type="text"
                              name="groupingOther"
                              value={fields.groupingOther || ''}
                              onChange={handleFieldChange}
                              placeholder={
                                hasMultipleMorphologies
                                  ? (language === 'es'
                                      ? 'Indicar agrupación de cada morfología observada (ej. Cocos en ramillete, bacilos aislados...)'
                                      : 'Specify grouping of each observed morphology (e.g. Cocci in clusters, isolated bacilli...)')
                                  : (language === 'es'
                                      ? 'Indicar agrupación...'
                                      : 'Specify grouping...')
                              }
                              className="w-full p-2.5 border border-[#582C83]/30 rounded-xl bg-white text-sm outline-none focus:border-[#582C83] text-slate-800"
                            />
                          </div>
                        )}
                      </div>

                      {/* Coloración */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🌈 {language === 'es' ? 'Coloración' : 'Coloration / Staining'}
                        </label>
                        <select
                          name="coloration"
                          value={fields.coloration || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Ziehl-Neelsen">Ziehl-Neelsen</option>
                          <option value="Giemsa">Giemsa</option>
                          <option value="Gram">Gram</option>
                          <option value="No aplica">{language === 'es' ? 'No aplica' : 'Not applicable'}</option>
                          <option value="otra">{language === 'es' ? 'Otra (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.coloration === 'otra' && (
                          <input
                            type="text"
                            name="colorationOther"
                            value={fields.colorationOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar coloración...' : 'Specify staining...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Afinidad tintorial */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🎨 {language === 'es' ? 'Afinidad Tintorial' : 'Staining Affinity'}
                        </label>
                        <select
                          name="stainAffinity"
                          value={fields.stainAffinity || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Gram +">Gram +</option>
                          <option value="Gram -">Gram -</option>
                          <option value="AAR">{language === 'es' ? 'AAR (Ácido alcohol resistente)' : 'AFB (Acid-fast)'}</option>
                          <option value="No aplica">{t.stainOptions?.['No aplica'] || 'No aplica'}</option>
                          <option value="otra">{t.stainOptions?.['Otra'] || 'otra'}</option>
                        </select>
                        {fields.stainAffinity === 'otra' && (
                          <input
                            type="text"
                            name="stainAffinityOther"
                            value={fields.stainAffinityOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar afinidad tintorial...' : 'Specify staining affinity...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recuadro 2: Información de cultivo */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🧫</span> {language === 'es' ? 'Información de Cultivo' : 'Cultivation Information'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Soporte */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧪 {language === 'es' ? 'Soporte' : 'Support'}
                        </label>
                        <select
                          name="cultureSupport"
                          value={fields.cultureSupport || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="líquido">{language === 'es' ? 'Líquido' : 'Liquid'}</option>
                          <option value="semi-sólido">{language === 'es' ? 'Semi-sólido' : 'Semi-solid'}</option>
                          <option value="sólido">{language === 'es' ? 'Sólido' : 'Solid'}</option>
                        </select>
                      </div>

                      {/* Medio de cultivo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧫 {language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}
                        </label>
                        <input
                          type="text"
                          name="cultureMedium"
                          value={fields.cultureMedium || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. LB agar, TSA' : 'e.g. LB agar, TSA'}
                        />
                      </div>

                      {/* Antibiótico o agente selector */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          💊 {language === 'es' ? 'Antibiótico o Agente Selector' : 'Antibiotic / Selective Agent'}
                        </label>
                        <input
                          type="text"
                          name="selectiveAgent"
                          value={fields.selectiveAgent || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. Ampicilina 100 ug/ml, ninguno' : 'e.g. Ampicillin 100 ug/ml, none'}
                        />
                      </div>

                      {/* Temperatura */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🌡️ {language === 'es' ? 'Temperatura' : 'Temperature'}
                        </label>
                        <input
                          type="text"
                          name="temperature"
                          value={fields.temperature || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. 37°C, RT' : 'e.g. 37°C, RT'}
                        />
                      </div>

                      {/* Tiempo de incubación */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ⏱️ {language === 'es' ? 'Tiempo de incubación' : 'Incubation Time'}
                        </label>
                        <input
                          type="text"
                          name="incubationTime"
                          value={fields.incubationTime || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. 24 hs, 48 hs' : 'e.g. 24 hours, 48 hours'}
                        />
                      </div>

                      {/* Condiciones atmosféricas */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ☁️ {language === 'es' ? 'Condiciones atmosféricas' : 'Atmospheric Conditions'}
                        </label>
                        <input
                          type="text"
                          name="atmosphericConditions"
                          value={fields.atmosphericConditions || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. Aerobiosis, Anaerobiosis' : 'e.g. Aerobiosis, Anaerobiosis'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recuadro 3: Macroscópica */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🔎</span> {language === 'es' ? 'Morfología Macroscópica de Colonia' : 'Colony Macromorphology'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tamaño */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          📏 {language === 'es' ? 'Tamaño' : 'Size'}
                        </label>
                        <select
                          name="colonySize"
                          value={fields.colonySize || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="<1 mm [Puntiforme]">{language === 'es' ? '<1 mm [Puntiforme]' : '<1 mm [Punctiform]'}</option>
                          <option value="1mm [Pequeña]">{language === 'es' ? '1 mm [Pequeña]' : '1 mm [Small]'}</option>
                          <option value="2 mm [Mediana]">{language === 'es' ? '2 mm [Mediana]' : '2 mm [Medium]'}</option>
                          <option value="3 mm o mayor [Grande]">{language === 'es' ? '3 mm o mayor [Grande]' : '3 mm or larger [Large]'}</option>
                        </select>
                      </div>

                      {/* Forma */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          💠 {language === 'es' ? 'Forma' : 'Shape'}
                        </label>
                        <select
                          name="colonyShape"
                          value={fields.colonyShape || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Circular">{language === 'es' ? 'Circular' : 'Circular'}</option>
                          <option value="fusiforme">{language === 'es' ? 'Fusiforme' : 'Spindle / Fusiform'}</option>
                          <option value="Rizoide">{language === 'es' ? 'Rizoide' : 'Rhizoid'}</option>
                          <option value="filamentosa">{language === 'es' ? 'Filamentosa' : 'Filamentous'}</option>
                          <option value="irregular">{language === 'es' ? 'Irregular' : 'Irregular'}</option>
                        </select>
                      </div>

                      {/* Transparencia */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          👁️ {language === 'es' ? 'Transparencia' : 'Transparency'}
                        </label>
                        <select
                          name="colonyTransparency"
                          value={fields.colonyTransparency || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Opaca">{language === 'es' ? 'Opaca' : 'Opaque'}</option>
                          <option value="transparente">{language === 'es' ? 'Transparente' : 'Transparent'}</option>
                        </select>
                      </div>

                      {/* Brillo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ✨ {language === 'es' ? 'Brillo' : 'Shine / Gloss'}
                        </label>
                        <select
                          name="colonyBrightness"
                          value={fields.colonyBrightness || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Sin brillo">{language === 'es' ? 'Sin brillo' : 'Dull / No gloss'}</option>
                          <option value="brillante">{language === 'es' ? 'Brillante' : 'Shiny / Glossy'}</option>
                        </select>
                      </div>

                      {/* Color */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🎨 {language === 'es' ? 'Color de Colonia' : 'Colony Color'}
                        </label>
                        <input
                          type="text"
                          name="colonyColor"
                          value={fields.colonyColor || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                          placeholder={language === 'es' ? 'Ej. Blanco, amarillo, translúcido' : 'e.g. White, yellow, translucent'}
                        />
                      </div>

                      {/* Textura */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/85 mb-1">
                          🧶 {language === 'es' ? 'Textura' : 'Texture'}
                        </label>
                        <select
                          name="colonyTexture"
                          value={fields.colonyTexture || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Lisa">{language === 'es' ? 'Lisa' : 'Smooth'}</option>
                          <option value="rugosa">{language === 'es' ? 'Rugosa' : 'Rough'}</option>
                        </select>
                      </div>

                      {/* Consistencia */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/85 mb-1">
                          🍮 {language === 'es' ? 'Consistencia' : 'Consistency'}
                        </label>
                        <select
                          name="colonyConsistency"
                          value={fields.colonyConsistency || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Dura">{language === 'es' ? 'Dura' : 'Hard'}</option>
                          <option value="Suave">{language === 'es' ? 'Suave' : 'Soft'}</option>
                          <option value="Mucoide">{language === 'es' ? 'Mucoide' : 'Mucoid'}</option>
                        </select>
                      </div>

                      {/* Crecimiento */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/85 mb-1">
                          📈 {language === 'es' ? 'Elevación/Crecimiento' : 'Elevation / Growth'}
                        </label>
                        <select
                          name="colonyGrowth"
                          value={fields.colonyGrowth || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="penetra el agar">{language === 'es' ? 'Penetra el agar' : 'Penetrates agar'}</option>
                          <option value="sobre el agar plana">{language === 'es' ? 'Sobre el agar plana' : 'Flat on agar'}</option>
                          <option value="elevada">{language === 'es' ? 'Elevada' : 'Elevated'}</option>
                          <option value="otra">{language === 'es' ? 'Otra (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.colonyGrowth === 'otra' && (
                          <input
                            type="text"
                            name="colonyGrowthOther"
                            value={fields.colonyGrowthOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar elevación y crecimiento...' : 'Specify elevation and growth...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTOLOGY */}
              {category.type === 'histology' && (
                <div className="space-y-6">
                  {/* Recuadro 1: Datos del Espécimen */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🩺</span> {language === 'es' ? 'Datos del Espécimen' : 'Specimen Information'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tipo de espécimen */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧫 {language === 'es' ? 'Tipo de espécimen' : 'Specimen Type'}
                        </label>
                        <select
                          name="specimenType"
                          value={fields.specimenType || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Biopsia">{language === 'es' ? 'Biopsia' : 'Biopsy'}</option>
                          <option value="Pieza quirúrgica">{language === 'es' ? 'Pieza quirúrgica' : 'Surgical Specimen'}</option>
                          <option value="Autopsia">{language === 'es' ? 'Autopsia' : 'Autopsy'}</option>
                          <option value="Citología">{language === 'es' ? 'Citología' : 'Cytology'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.specimenType === 'Otro' && (
                          <input
                            type="text"
                            name="specimenTypeOther"
                            value={fields.specimenTypeOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar espécimen...' : 'Specify specimen...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Órgano / Tejido */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧠 {language === 'es' ? 'Órgano / Tejido' : 'Organ / Tissue'}
                        </label>
                        <select
                          name="organTissue"
                          value={fields.organTissue || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Hígado">{language === 'es' ? 'Hígado' : 'Liver'}</option>
                          <option value="Riñón">{language === 'es' ? 'Riñón' : 'Kidney'}</option>
                          <option value="Pulmón">{language === 'es' ? 'Pulmón' : 'Lung'}</option>
                          <option value="Corazón">{language === 'es' ? 'Corazón' : 'Heart'}</option>
                          <option value="Cerebro">{language === 'es' ? 'Cerebro' : 'Brain'}</option>
                          <option value="Piel">{language === 'es' ? 'Piel' : 'Skin'}</option>
                          <option value="Músculo">{language === 'es' ? 'Músculo' : 'Muscle'}</option>
                          <option value="Hueso">{language === 'es' ? 'Hueso' : 'Bone'}</option>
                          <option value="Ganglio">{language === 'es' ? 'Ganglio' : 'Lymph Node'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.organTissue === 'Otro' && (
                          <input
                            type="text"
                            name="organTissueOther"
                            value={fields.organTissueOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar órgano/tejido...' : 'Specify organ/tissue...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Textura */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🖐️ {language === 'es' ? 'Textura' : 'Texture'}
                        </label>
                        <select
                          name="texture"
                          value={fields.texture || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Lisa">{language === 'es' ? 'Lisa' : 'Smooth'}</option>
                          <option value="Rugosa">{language === 'es' ? 'Rugosa' : 'Rough'}</option>
                          <option value="Granulosa">{language === 'es' ? 'Granulosa' : 'Granular'}</option>
                          <option value="Lobulada">{language === 'es' ? 'Lobulada' : 'Lobulated'}</option>
                          <option value="Quística">{language === 'es' ? 'Quística' : 'Cystic'}</option>
                          <option value="Ulcerada">{language === 'es' ? 'Ulcerada' : 'Ulcerated'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.texture === 'Otro' && (
                          <input
                            type="text"
                            name="textureOther"
                            value={fields.textureOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar textura...' : 'Specify texture...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recuadro 2: Procesamiento Histológico */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🧪</span> {language === 'es' ? 'Procesamiento Histológico' : 'Histological Processing'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fijación */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🔬 {language === 'es' ? 'Fijación' : 'Fixation'}
                        </label>
                        <select
                          name="fixation"
                          value={fields.fixation || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Formol al 10%">Formol al 10%</option>
                          <option value="Bouin">Bouin</option>
                          <option value="Alcohol">{language === 'es' ? 'Alcohol' : 'Alcohol'}</option>
                          <option value="Glutaraldehído">{language === 'es' ? 'Glutaraldehído' : 'Glutaraldehyde'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.fixation === 'Otro' && (
                          <input
                            type="text"
                            name="fixationOther"
                            value={fields.fixationOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar fijador...' : 'Specify fixative...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Tiempo de fijación */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ⏱️ {language === 'es' ? 'Tiempo de fijación' : 'Fixation Time'}
                        </label>
                        <input
                          type="text"
                          name="fixationTime"
                          value={fields.fixationTime || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. 24 horas, 48 horas' : 'e.g. 24 hours'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>

                      {/* Inclusión */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🕯️ {language === 'es' ? 'Inclusión' : 'Inclusion'}
                        </label>
                        <select
                          name="inclusion"
                          value={fields.inclusion || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Parafina">{language === 'es' ? 'Parafina' : 'Paraffin'}</option>
                          <option value="Resina (epoxi)">{language === 'es' ? 'Resina (epoxi)' : 'Resin (epoxy)'}</option>
                          <option value="OCT (congelación)">OCT (congelación)</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.inclusion === 'Otro' && (
                          <input
                            type="text"
                            name="inclusionOther"
                            value={fields.inclusionOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar inclusión...' : 'Specify inclusion...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Corte */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🔪 {language === 'es' ? 'Corte' : 'Sectioning'}
                        </label>
                        <select
                          name="sectioning"
                          value={fields.sectioning || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Microtomo">{language === 'es' ? 'Microtomo' : 'Microtome'}</option>
                          <option value="Criostato">{language === 'es' ? 'Criostato' : 'Cryostat'}</option>
                          <option value="Vibratomo">{language === 'es' ? 'Vibratomo' : 'Vibratome'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.sectioning === 'Otro' && (
                          <input
                            type="text"
                            name="sectioningOther"
                            value={fields.sectioningOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar corte...' : 'Specify sectioning...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Grosor del corte */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          📐 {language === 'es' ? 'Grosor del corte (μm)' : 'Section Thickness (μm)'}
                        </label>
                        <input
                          type="text"
                          name="sectionThickness"
                          value={fields.sectionThickness || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. 4 μm, 5 μm' : 'e.g. 4 μm'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>

                      {/* Tinción principal */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🎨 {language === 'es' ? 'Tinción principal' : 'Main Stain'}
                        </label>
                        <select
                          name="mainStain"
                          value={fields.mainStain || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="H&E">H&E (Hematoxilina y Eosina)</option>
                          <option value="PAS">PAS (Ácido Periódico de Schiff)</option>
                          <option value="Masson">Tricrómico de Masson</option>
                          <option value="Giemsa">Giemsa</option>
                          <option value="Inmunohistoquímica (IHC)">Inmunohistoquímica (IHC)</option>
                          <option value="Tinción especial">{language === 'es' ? 'Tinción especial (especificar)' : 'Special stain (specify)'}</option>
                        </select>
                        {fields.mainStain === 'Tinción especial' && (
                          <input
                            type="text"
                            name="mainStainOther"
                            value={fields.mainStainOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar tinción especial...' : 'Specify special stain...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recuadro 3: Condiciones de Cultivo (si aplica) */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🧫</span> {language === 'es' ? 'Condiciones de Cultivo (si aplica)' : 'Cultivation Conditions (if applicable)'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tipo de cultivo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🌱 {language === 'es' ? 'Tipo de cultivo' : 'Culture Type'}
                        </label>
                        <select
                          name="histoCultureType"
                          value={fields.histoCultureType || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Primario">{language === 'es' ? 'Primario' : 'Primary'}</option>
                          <option value="Línea celular">{language === 'es' ? 'Línea celular (especificar)' : 'Cell Line (specify)'}</option>
                          <option value="Explante">{language === 'es' ? 'Explante' : 'Explant'}</option>
                          <option value="Otro">{language === 'es' ? 'Otro' : 'Other'}</option>
                        </select>
                        {(fields.histoCultureType === 'Línea celular' || fields.histoCultureType === 'Otro') && (
                          <input
                            type="text"
                            name="histoCultureTypeOther"
                            value={fields.histoCultureTypeOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar tipo de cultivo...' : 'Specify culture type...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Línea celular */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧬 {language === 'es' ? 'Línea celular (si aplica)' : 'Cell Line (if applicable)'}
                        </label>
                        <input
                          type="text"
                          name="histoCellLine"
                          value={fields.histoCellLine || ''}
                          onChange={handleFieldChange}
                          placeholder="Ej. HeLa, MDCK, Caco-2"
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>

                      {/* Medio de cultivo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧪 {language === 'es' ? 'Medio de cultivo' : 'Culture Medium'}
                        </label>
                        <select
                          name="histoCultureMedium"
                          value={fields.histoCultureMedium || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="DMEM">DMEM</option>
                          <option value="RPMI">RPMI</option>
                          <option value="MEM">MEM</option>
                          <option value="Ham's F-12">Ham's F-12</option>
                          <option value="Otro">{language === 'es' ? 'Otro (especificar)' : 'Other (specify)'}</option>
                        </select>
                        {fields.histoCultureMedium === 'Otro' && (
                          <input
                            type="text"
                            name="histoCultureMediumOther"
                            value={fields.histoCultureMediumOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar medio de cultivo...' : 'Specify culture medium...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Tratamiento / Estímulo */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ⚡ {language === 'es' ? 'Tratamiento / Estímulo' : 'Treatment / Stimulus'}
                        </label>
                        <input
                          type="text"
                          name="histoTreatment"
                          value={fields.histoTreatment || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. TNF-α 10 ng/mL, 6 horas' : 'e.g. TNF-α 10 ng/mL, 6 hours'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recuadro 4: Hallazgos Microscópicos */}
                  <div className="bg-white p-4 rounded-xl border border-[#E69A5E]/20 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#B95C2E] tracking-wider border-b border-orange-50 pb-2 flex items-center gap-1">
                      <span>🔬</span> {language === 'es' ? 'Hallazgos Microscópicos (Descriptivos)' : 'Microscopic Findings (Descriptive)'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Morfología celular */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🧫 {language === 'es' ? 'Morfología celular' : 'Cell Morphology'}
                        </label>
                        <select
                          name="histoCellMorphology"
                          value={fields.histoCellMorphology || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Epitelial (cilíndrica, cúbica, plana)">{language === 'es' ? 'Epitelial (cilíndrica, cúbica, plana)' : 'Epithelial (columnar, cuboidal, squamous)'}</option>
                          <option value="Fusiforme">{language === 'es' ? 'Fusiforme' : 'Spindle'}</option>
                          <option value="Redonda">{language === 'es' ? 'Redonda' : 'Round'}</option>
                          <option value="Estrellada">{language === 'es' ? 'Estrellada' : 'Stellate'}</option>
                          <option value="Poligonal">{language === 'es' ? 'Poligonal' : 'Polygonal'}</option>
                          <option value="Atípica">{language === 'es' ? 'Atípica (especificar)' : 'Atypical (specify)'}</option>
                        </select>
                        {fields.histoCellMorphology === 'Atípica' && (
                          <input
                            type="text"
                            name="histoCellMorphologyOther"
                            value={fields.histoCellMorphologyOther || ''}
                            onChange={handleFieldChange}
                            placeholder={language === 'es' ? 'Especificar morfología atípica...' : 'Specify atypical morphology...'}
                            className="w-full mt-2 p-2.5 border border-[#E69A5E]/30 rounded-xl text-xs outline-none focus:border-[#E69A5E]"
                          />
                        )}
                      </div>

                      {/* Patrón de tinción */}
                      <div>
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          📊 {language === 'es' ? 'Patrón de tinción' : 'Staining Pattern'}
                        </label>
                        <select
                          name="histoStainingPattern"
                          value={fields.histoStainingPattern || ''}
                          onChange={handleFieldChange}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          <option value="Homogéneo">{language === 'es' ? 'Homogéneo' : 'Homogeneous'}</option>
                          <option value="Heterogéneo">{language === 'es' ? 'Heterogéneo' : 'Heterogeneous'}</option>
                          <option value="Granular">{language === 'es' ? 'Granular' : 'Granular'}</option>
                          <option value="Periférico">{language === 'es' ? 'Periférico' : 'Peripheral'}</option>
                          <option value="Nuclear">{language === 'es' ? 'Nuclear' : 'Nuclear'}</option>
                          <option value="Citoplasmático">{language === 'es' ? 'Citoplasmático' : 'Cytoplasmic'}</option>
                          <option value="Membranoso">{language === 'es' ? 'Membranoso' : 'Membranous'}</option>
                        </select>
                      </div>

                      {/* Núcleo */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          🔘 {language === 'es' ? 'Núcleo' : 'Nucleus'}
                        </label>
                        <input
                          type="text"
                          name="histoNucleus"
                          value={fields.histoNucleus || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. Hipercromático, pleomórfico, relación N/C aumentada' : 'e.g. Hyperchromatic, pleomorphic'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>

                      {/* Citoplasma */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          💧 {language === 'es' ? 'Citoplasma' : 'Cytoplasm'}
                        </label>
                        <input
                          type="text"
                          name="histoCytoplasm"
                          value={fields.histoCytoplasm || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. Granular, vacuolado, eosinófilo' : 'e.g. Granular, vacuolated'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>

                      {/* Membrana */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                          ⭕ {language === 'es' ? 'Membrana' : 'Membrane'}
                        </label>
                        <input
                          type="text"
                          name="histoMembrane"
                          value={fields.histoMembrane || ''}
                          onChange={handleFieldChange}
                          placeholder={language === 'es' ? 'Ej. Irregular, con prolongaciones' : 'e.g. Irregular'}
                          className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COUNT (IF WORK SHEET COMPILING COMPATIBLE) */}
              {category.type === 'count' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🔬 {t.microorganismType}
                    </label>
                    <input
                      type="text"
                      name="microorganismType"
                      value={fields.microorganismType}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. Sacharomyces cerevisiae"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🔍 {t.magnification}
                    </label>
                    <input
                      type="text"
                      name="magnification"
                      value={fields.magnification}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 400x"
                    />
                  </div>
                </div>
              )}

              {/* SDS-PAGE */}
              {category.type === 'sds-page' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🧪 {t.sampleType}
                    </label>
                    <input
                      type="text"
                      name="sampleType"
                      value={fields.sampleType}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. Fracciones solubles Proteína Recombinante"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      ⚖️ {t.approxMw}
                    </label>
                    <input
                      type="text"
                      name="approxMw"
                      value={fields.approxMw}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 45 kDa"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🏁 {t.gelPercentage}
                    </label>
                    <input
                      type="text"
                      name="gelPercentage"
                      value={fields.gelPercentage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 12%"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🖼️ {t.glassThickness}
                    </label>
                    <input
                      type="text"
                      name="glassThickness"
                      value={fields.glassThickness}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 1.0 mm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      ⚡ {t.voltage}
                    </label>
                    <input
                      type="text"
                      name="voltage"
                      value={fields.voltage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 120 V"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🔋 {t.amperage}
                    </label>
                    <input
                      type="text"
                      name="amperage"
                      value={fields.amperage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 400 mA"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      ⏱️ {t.runTime}
                    </label>
                    <input
                      type="text"
                      name="runTime"
                      value={fields.runTime}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 1h 15min"
                    />
                  </div>
                </div>
              )}

              {/* DNA (ADN) */}
              {category.type === 'adn' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🧬 {t.sampleType}
                    </label>
                    <input
                      type="text"
                      name="sampleType"
                      value={fields.sampleType}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. Producto de PCR"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      📈 {t.fragmentSize}
                    </label>
                    <input
                      type="text"
                      name="fragmentSize"
                      value={fields.fragmentSize}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 500 pb"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🏁 {t.agarosePercentage}
                    </label>
                    <input
                      type="text"
                      name="agarosePercentage"
                      value={fields.agarosePercentage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 1.5% Agarosa"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      ⚡ {t.voltage}
                    </label>
                    <input
                      type="text"
                      name="voltage"
                      value={fields.voltage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 90 V"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🔋 {t.amperage}
                    </label>
                    <input
                      type="text"
                      name="amperage"
                      value={fields.amperage}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 200 mA"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      ⏱️ {t.runTime}
                    </label>
                    <input
                      type="text"
                      name="runTime"
                      value={fields.runTime}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder="Ej. 45 min"
                    />
                  </div>
                </div>
              )}

              {/* DOI ANALYZER */}
              {category.type === 'doi-analyzer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🧪 {t.sampleType}
                    </label>
                    <input
                      type="text"
                      name="sampleType"
                      value={fields.sampleType || ''}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder={language === 'es' ? "Ej. Placa de ELISA, Gel de agarosa, Western Blot" : "e.g. ELISA plate, Agarose gel, Western Blot"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      📝 {language === 'es' ? 'Descripción del ensayo' : 'Assay Description'}
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={fields.description || ''}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder={language === 'es' ? "Ej. Ensayo de dot-blot de concentración" : "e.g. Dot-blot concentration assay"}
                    />
                  </div>
                </div>
              )}

              {/* RGV ANALYZER */}
              {category.type === 'rgv-analyzer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      🧪 {t.sampleType}
                    </label>
                    <input
                      type="text"
                      name="sampleType"
                      value={fields.sampleType || ''}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder={language === 'es' ? "Ej. Placa multiplex fluorescentes, Geles Teñidos" : "e.g. Multiplex fluorescent plates, Stained Gels"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                      📝 {language === 'es' ? 'Descripción del ensayo RGV' : 'RGV Assay Description'}
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={fields.description || ''}
                      onChange={handleFieldChange}
                      className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                      placeholder={language === 'es' ? "Ej. Análisis espectral de carriles por canal" : "e.g. Spectral lane analysis by channel"}
                    />
                  </div>
                </div>
              )}

              {/* CUSTOM / GENERIC CATEGORIES */}
              {category.type === 'custom' && (
                <div>
                  <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                    📝 {t.description}
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={fields.description}
                    onChange={handleFieldChange}
                    className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E]"
                    placeholder="Descripción genérica de la muestra"
                  />
                </div>
              )}

              {/* GENERAL OBSERVATIONS (TEXTAREA) */}
              <div>
                <label className="block text-xs font-extrabold text-[#3E2A1F]/80 mb-1">
                  ✍️ {t.observations}
                </label>
                <textarea
                  name="observations"
                  rows={3}
                  value={fields.observations}
                  onChange={handleFieldChange}
                  className="w-full p-2.5 border border-[#E69A5E]/20 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E] resize-none"
                  placeholder="Detalles experimentales adicionales..."
                />
              </div>
            </div>

            {/* Validation errors */}
            {validationError && (
              <div className="mt-4 p-3 bg-red-50 text-rose-600 text-xs font-bold rounded-xl border border-red-100 font-mono animate-shake">
                ⚠️ {validationError}
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-[#E69A5E]/10 mt-4">
              <button
                type="button"
                onClick={handleCancelClick}
                className="w-full sm:w-auto px-5 py-3 border border-[#B95C2E]/20 hover:bg-red-50 text-[#B95C2E] font-bold rounded-xl transition-all min-h-[48px] active:scale-95 cursor-pointer flex justify-center items-center text-xs md:text-sm"
              >
                {t.cancel}
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-bold rounded-xl shadow transition-all min-h-[48px] active:scale-95 cursor-pointer flex justify-center items-center text-xs md:text-sm"
              >
                💾 {t.save}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Custom absolute Cancel Confirmation Modal Overlay */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center text-[#3E2A1F]">
            <h3 className="text-lg font-black text-[#B95C2E] flex items-center justify-center gap-1.5">
              <span>⚠️</span> {language === 'es' ? 'Descartar Cambios' : 'Discard Changes'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {t.confirmDiscard}
            </p>

            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {language === 'es' ? 'Seguir editando' : 'Keep editing'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  setShowCancelConfirm(false);
                }}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm"
              >
                {language === 'es' ? 'Sí, descartar' : 'Yes, discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Additional Images */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {/* Download/Save button */}
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
