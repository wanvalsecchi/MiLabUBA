import React, { useState, useEffect, useRef } from 'react';
import { Ficha } from '../types';
import ThemeToggle from './ThemeToggle';

interface MultiChannelCombinerProps {
  language: 'es' | 'en';
  ficha: Ficha;
  onSaveAnalysis: (
    fichaId: string,
    mergedImageSrc: string,
    legendData: any,
    updatedFields?: {
      title?: string;
      runDate?: string;
      sampleType?: string;
      description?: string;
    }
  ) => void;
  onBack: () => void;
}

interface ChannelData {
  imageSrc: string | null;
  fileName: string | null;
  active: boolean;
  intensity: number; // 0 to 200% (Gain)
  brightness: number; // 0 to 200%, default 100
  contrast: number; // 0 to 200%, default 100
  label: string;
}

export default function MultiChannelCombiner({
  language,
  ficha,
  onSaveAnalysis,
  onBack,
}: MultiChannelCombinerProps) {
  // Channels setup with brightness, contrast, intensity, and label
  const [channels, setChannels] = useState<{
    brightfield: ChannelData;
    red: ChannelData;
    green: ChannelData;
    blue: ChannelData;
  }>({
    brightfield: {
      imageSrc: null,
      fileName: null,
      active: true,
      intensity: 100,
      brightness: 100,
      contrast: 100,
      label: language === 'es' ? 'Campo Claro' : 'Brightfield',
    },
    red: {
      imageSrc: null,
      fileName: null,
      active: true,
      intensity: 100,
      brightness: 100,
      contrast: 100,
      label: language === 'es' ? 'Canal Rojo' : 'Red Channel',
    },
    green: {
      imageSrc: null,
      fileName: null,
      active: true,
      intensity: 100,
      brightness: 100,
      contrast: 100,
      label: language === 'es' ? 'Canal Verde' : 'Green Channel',
    },
    blue: {
      imageSrc: null,
      fileName: null,
      active: true,
      intensity: 100,
      brightness: 100,
      contrast: 100,
      label: language === 'es' ? 'Canal Azul' : 'Blue/DAPI Channel',
    },
  });

  // Step 1: Editor Workspace, Step 2: Ficha data form
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [mergedDataUrl, setMergedDataUrl] = useState<string | null>(null);

  // Ficha details state
  const [jobTitle, setJobTitle] = useState(ficha.title || '');
  const [jobDate, setJobDate] = useState(ficha.runDate || new Date().toISOString().split('T')[0]);
  const [sampleType, setSampleType] = useState(ficha.fields?.sampleType || '');
  const [observations, setObservations] = useState(ficha.fields?.description || '');

  // References
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgElementsRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // Populate from original if loaded
  useEffect(() => {
    if (ficha.image && !channels.brightfield.imageSrc && !channels.red.imageSrc && !channels.green.imageSrc && !channels.blue.imageSrc) {
      setChannels((prev) => ({
        ...prev,
        red: {
          ...prev.red,
          imageSrc: ficha.image!,
          fileName: 'Original.png',
        },
      }));
    }
  }, [ficha.image]);

  // Split multi-channel single photo into R, G, B Grayscale images
  const handleSplitImage = (file: File) => {
    setErrorMessage(null);
    setIsSplitting(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          
          // Create offscreen canvas to process color components
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, w, h);
          const originalData = imgData.data;
          const length = originalData.length;

          // Red Channel
          const rCanvas = document.createElement('canvas');
          rCanvas.width = w;
          rCanvas.height = h;
          const rCtx = rCanvas.getContext('2d')!;
          const rImgData = rCtx.createImageData(w, h);
          const rData = rImgData.data;

          // Green Channel
          const gCanvas = document.createElement('canvas');
          gCanvas.width = w;
          gCanvas.height = h;
          const gCtx = gCanvas.getContext('2d')!;
          const gImgData = gCtx.createImageData(w, h);
          const gData = gImgData.data;

          // Blue Channel
          const bCanvas = document.createElement('canvas');
          bCanvas.width = w;
          bCanvas.height = h;
          const bCtx = bCanvas.getContext('2d')!;
          const bImgData = bCtx.createImageData(w, h);
          const bData = bImgData.data;

          for (let i = 0; i < length; i += 4) {
            const r = originalData[i];
            const g = originalData[i + 1];
            const b = originalData[i + 2];
            const a = originalData[i + 3];

            // Extract channels as Grayscale
            rData[i] = r; rData[i+1] = r; rData[i+2] = r; rData[i+3] = a;
            gData[i] = g; gData[i+1] = g; gData[i+2] = g; gData[i+3] = a;
            bData[i] = b; bData[i+1] = b; bData[i+2] = b; bData[i+3] = a;
          }

          rCtx.putImageData(rImgData, 0, 0);
          gCtx.putImageData(gImgData, 0, 0);
          bCtx.putImageData(bImgData, 0, 0);

          const rSrc = rCanvas.toDataURL('image/png');
          const gSrc = gCanvas.toDataURL('image/png');
          const bSrc = bCanvas.toDataURL('image/png');

          setChannels((prev) => ({
            ...prev,
            red: {
              ...prev.red,
              imageSrc: rSrc,
              fileName: `Split_Rojo_${file.name}`,
              active: true,
              brightness: 100,
              contrast: 100,
              intensity: 100,
            },
            green: {
              ...prev.green,
              imageSrc: gSrc,
              fileName: `Split_Verde_${file.name}`,
              active: true,
              brightness: 100,
              contrast: 100,
              intensity: 100,
            },
            blue: {
              ...prev.blue,
              imageSrc: bSrc,
              fileName: `Split_Azul_${file.name}`,
              active: true,
              brightness: 100,
              contrast: 100,
              intensity: 100,
            },
          }));

          setErrorMessage(null);
        } catch (err) {
          console.error(err);
          setErrorMessage(
            language === 'es'
              ? 'Error al descomponer los canales cromáticos de la imagen.'
              : 'Error splitting colored channels from the image.'
          );
        } finally {
          setIsSplitting(false);
        }
      };
      img.onerror = () => {
        setErrorMessage(language === 'es' ? 'Error al cargar la imagen.' : 'Error loading image.');
        setIsSplitting(false);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setErrorMessage(language === 'es' ? 'Error al leer el archivo.' : 'Error reading file.');
      setIsSplitting(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (channelKey: 'brightfield' | 'red' | 'green' | 'blue', file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setChannels((prev) => ({
        ...prev,
        [channelKey]: {
          ...prev[channelKey],
          imageSrc: result,
          fileName: file.name,
          active: true,
          brightness: 100,
          contrast: 100,
          intensity: 100,
        },
      }));
    };
    reader.onerror = () => {
      setErrorMessage(language === 'es' ? 'Error al leer el archivo de imagen.' : 'Error reading image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearChannel = (channelKey: 'brightfield' | 'red' | 'green' | 'blue') => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        imageSrc: null,
        fileName: null,
      },
    }));
    if (imgElementsRef.current[channelKey]) {
      delete imgElementsRef.current[channelKey];
    }
  };

  const handleToggleActive = (channelKey: 'brightfield' | 'red' | 'green' | 'blue') => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        active: !prev[channelKey].active,
      },
    }));
  };

  const handleIntensityChange = (channelKey: 'brightfield' | 'red' | 'green' | 'blue', val: number) => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        intensity: val,
      },
    }));
  };

  const handleBrightnessChange = (channelKey: 'brightfield' | 'red' | 'green' | 'blue', val: number) => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        brightness: val,
      },
    }));
  };

  const handleContrastChange = (channelKey: 'brightfield' | 'red' | 'green' | 'blue', val: number) => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        contrast: val,
      },
    }));
  };

  const handleLabelChange = (channelKey: 'brightfield' | 'red' | 'green' | 'blue', val: string) => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        label: val,
      },
    }));
  };

  const handleDownloadChannel = (channelKey: 'brightfield' | 'red' | 'green' | 'blue') => {
    const ch = channels[channelKey];
    if (!ch.imageSrc) return;
    const link = document.createElement('a');
    link.href = ch.imageSrc;
    link.download = ch.fileName || `${channelKey}_channel.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pixel-by-pixel sums with brightness/contrast corrections & intensity coefficients
  const adjustPixel = (v: number, brightness: number, contrast: number) => {
    // Apply contrast centered around 128
    let result = (v - 128) * (contrast / 100) + 128;
    // Apply brightness offset
    result = result + (brightness - 100);
    return Math.max(0, Math.min(255, result));
  };

  // Re-render combined overlay
  useEffect(() => {
    const drawMergedImage = async () => {
      const activeChannelsKeys = (['brightfield', 'red', 'green', 'blue'] as const).filter(
        (k) => channels[k].imageSrc && channels[k].active
      );

      if (activeChannelsKeys.length === 0) {
        if (mainCanvasRef.current) {
          const canvas = mainCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
        setMergedDataUrl(null);
        return;
      }

      setIsProcessing(true);
      try {
        const loadedImages: { [key: string]: HTMLImageElement } = {};
        for (const key of activeChannelsKeys) {
          const src = channels[key].imageSrc!;
          if (imgElementsRef.current[key] && imgElementsRef.current[key].src === src) {
            loadedImages[key] = imgElementsRef.current[key];
          } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.referrerPolicy = 'no-referrer';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                imgElementsRef.current[key] = img;
                loadedImages[key] = img;
                resolve();
              };
              img.onerror = () => reject(new Error(`Failed to load channel ${key}`));
              img.src = src;
            });
          }
        }

        const firstKey = activeChannelsKeys[0];
        const naturalW = loadedImages[firstKey]?.naturalWidth || 800;
        const naturalH = loadedImages[firstKey]?.naturalHeight || 800;

        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        canvas.width = naturalW;
        canvas.height = naturalH;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Black fluorescent summation frame
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, naturalW, naturalH);

        const pixelDataList: { key: 'brightfield' | 'red' | 'green' | 'blue'; data: Uint8ClampedArray }[] = [];

        for (const key of activeChannelsKeys) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = naturalW;
          tempCanvas.height = naturalH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(loadedImages[key], 0, 0, naturalW, naturalH);
            const { data } = tempCtx.getImageData(0, 0, naturalW, naturalH);
            pixelDataList.push({ key, data });
          }
        }

        const finalImgData = ctx.createImageData(naturalW, naturalH);
        const finalData = finalImgData.data;

        const size = naturalW * naturalH * 4;
        for (let i = 0; i < size; i += 4) {
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;

          for (const item of pixelDataList) {
            const chKey = item.key;
            const pxData = item.data;
            
            // Adjust raw pixel values for brightness and contrast
            const chBrightness = channels[chKey].brightness ?? 100;
            const chContrast = channels[chKey].contrast ?? 100;

            const r = adjustPixel(pxData[i], chBrightness, chContrast);
            const g = adjustPixel(pxData[i + 1], chBrightness, chContrast);
            const b = adjustPixel(pxData[i + 2], chBrightness, chContrast);

            const intensityMult = channels[chKey].intensity / 100;

            if (chKey === 'brightfield') {
              sumR += r * intensityMult;
              sumG += g * intensityMult;
              sumB += b * intensityMult;
            } else {
              const intensity = (0.299 * r + 0.587 * g + 0.114 * b) * intensityMult;
              if (chKey === 'red') {
                sumR += intensity;
              } else if (chKey === 'green') {
                sumG += intensity;
              } else if (chKey === 'blue') {
                sumB += intensity;
              }
            }
          }

          finalData[i] = Math.min(255, sumR);
          finalData[i + 1] = Math.min(255, sumG);
          finalData[i + 2] = Math.min(255, sumB);
          finalData[i + 3] = 255;
        }

        ctx.putImageData(finalImgData, 0, 0);
        setMergedDataUrl(canvas.toDataURL('image/png'));
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Error merging fluorescence channels:', err);
        setErrorMessage(
          language === 'es'
            ? 'Error al procesar la unión de canales. Verifica que compartan dimensiones idénticas.'
            : 'Error merging channels. Ensure images share matching boundaries.'
        );
      } finally {
        setIsProcessing(false);
      }
    };

    drawMergedImage();
  }, [channels, language]);

  // Finalize work and write to Ficha database
  const handleConfirmAndSave = () => {
    if (!mergedDataUrl) {
      alert(language === 'es' ? 'No hay una imagen combinada válida para guardar.' : 'No valid merged image to save.');
      return;
    }

    const legendJson = {
      brightfield: { active: channels.brightfield.active && !!channels.brightfield.imageSrc, label: channels.brightfield.label },
      red: { active: channels.red.active && !!channels.red.imageSrc, label: channels.red.label },
      green: { active: channels.green.active && !!channels.green.imageSrc, label: channels.green.label },
      blue: { active: channels.blue.active && !!channels.blue.imageSrc, label: channels.blue.label },
    };

    onSaveAnalysis(ficha.id, mergedDataUrl, legendJson, {
      title: jobTitle,
      runDate: jobDate,
      sampleType,
      description: observations
    });
    onBack(); // Go back to detail view
  };

  const handleDownloadMerged = () => {
    if (!mergedDataUrl) return;
    const link = document.createElement('a');
    link.href = mergedDataUrl;
    const cleanTitle = (jobTitle || 'milabuba_merged').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `${cleanTitle}_merged.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasAnyImage = !!(channels.brightfield.imageSrc || channels.red.imageSrc || channels.green.imageSrc || channels.blue.imageSrc);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      
      {/* HEADER BAR */}
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-5 shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3.5 mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs md:text-sm font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-3.5 py-2 rounded-xl transition-all min-h-[44px] cursor-pointer"
          >
            ⬅️ {language === 'es' ? 'Volver' : 'Back'}
          </button>
          <ThemeToggle />
        </div>

        <h2 className="text-sm md:text-base font-black flex items-center gap-1.5 text-[#3E2A1F] dark:text-slate-100">
          <span>🌈</span> 
          {language === 'es' ? 'Editor MERGE Multicanal' : 'MERGE Multi-Channel Engine'}
        </h2>

        {/* WIZARD STATUS CHIPS */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-slate-150 dark:border-slate-800">
          <span
            onClick={() => setActiveStep(1)}
            className={`text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
              activeStep === 1
                ? 'bg-[#E69A5E] text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            1. {language === 'es' ? 'Canales y Ajustes' : 'Channels & Sliders'}
          </span>
          <span className="text-[10px] text-slate-300">➔</span>
          <span
            onClick={() => { if (hasAnyImage) setActiveStep(2); }}
            className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
              !hasAnyImage ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            } ${
              activeStep === 2
                ? 'bg-[#E11D48] text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            2. {language === 'es' ? 'Datos de la Ficha' : 'Ficha Details'}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="w-full max-w-7xl mx-auto bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold mb-4">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* CORE WORKSPACE CONTENT */}
      <div className="flex-1 w-full max-w-7xl mx-auto">
        
        {/* STEP 1: UNIFIED CHANNELS AND ADJUSTMENTS WORKSPACE */}
        {activeStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN: LIVE COMBINED CANVAS & SPLIT TOOL (Occupies 2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* VIEWPORT FOR COMBINED OVERLAY */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-3xl flex flex-col items-center">
                <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    🧪 {language === 'es' ? 'Resultado de la Superposición' : 'Merged Output Result'}
                  </span>
                  
                  {isProcessing && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg animate-pulse">
                      ⚡ {language === 'es' ? 'Fusing pixeles...' : 'Blending...'}
                    </span>
                  )}
                </div>

                {/* Canvas Box */}
                <div className="w-full aspect-video bg-[#050505] rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 relative shadow-inner group p-4 min-h-[320px] md:min-h-[440px]">
                  <canvas
                    ref={mainCanvasRef}
                    className="max-w-full max-h-[420px] md:max-h-[55vh] object-contain rounded-lg transition-transform shadow-2xl"
                  />

                  {!hasAnyImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-slate-400 p-6 text-center select-none">
                      <span className="text-4xl mb-2">🎞️</span>
                      <p className="font-extrabold text-sm">{language === 'es' ? 'No hay canales cargados' : 'No Channels Uploaded'}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        {language === 'es' ? 'Sube imágenes en los slots de la derecha o descompón un canal integrado abajo.' : 'Add channel snapshots on the right side or upload an RGB image to split below.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AUTOMATIC SPLIT DECOMPOSER TOOL */}
              <div className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-slate-50 dark:from-indigo-950/20 dark:via-purple-950/5 dark:to-slate-900/10 border border-indigo-100/60 dark:border-slate-800 p-4.5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4.5 shadow-3xs">
                <div className="space-y-1 text-left flex-1">
                  <h4 className="font-extrabold text-[#1E3A8A] dark:text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-2 select-none">
                    <span>🔮</span>
                    {language === 'es' ? 'Descomponer Imagen en Canales (Split Channel)' : 'Split Channel Decomposer Tool'}
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95">
                      {language === 'es' ? 'Auto' : 'Auto'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                    {language === 'es'
                      ? 'Sube una única imagen combinada a color. La dividiremos instantáneamente en canales de intensidad Gris puro (Rojo, Verde, Azul) y los cargaremos automáticamente. ¡Podrás descargarlos por separado!'
                      : 'Upload a single colorful micrograph. We will split it into pure Grayscale Red, Green, and Blue channels and assign them instantly. You can also download each split channel!'}
                  </p>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <label className="flex items-center justify-center gap-2 cursor-pointer bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs px-4.5 py-3 rounded-xl transition-all shadow-3xs active:scale-[98%] select-none min-h-[44px]">
                    <span>✨</span>
                    {isSplitting 
                      ? (language === 'es' ? 'Procesando...' : 'Splitting...') 
                      : (language === 'es' ? 'Cargar Imagen y Dividir' : 'Upload Image & Split')}
                    <input
                      type="file"
                      accept="image/*,image/png,image/jpeg,image/webp"
                      disabled={isSplitting}
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleSplitImage(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: SLOTS FOR CHANNELS AND INDIVIDUAL PARAMETERS ADJUSTMENT */}
            <div className="space-y-4">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-3xl space-y-4">
                <h3 className="font-black text-xs uppercase text-[#3E2A1F] dark:text-slate-100 tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span>🎛️ {language === 'es' ? 'Canales de Imagen' : 'Image Channels'}</span>
                  <span className="text-[10px] text-slate-400 font-bold lowercase">{language === 'es' ? 'con brillo y contraste' : 'with brightness & contrast'}</span>
                </h3>

                <div className="space-y-4">
                  
                  {/* CHANNEL 1: CAMPO CLARO / BRIGHTFIELD */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-xs text-[#3E2A1F] dark:text-slate-200">
                        {channels.brightfield.imageSrc && (
                          <input
                            type="checkbox"
                            checked={channels.brightfield.active}
                            onChange={() => handleToggleActive('brightfield')}
                            className="rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5 cursor-pointer"
                          />
                        )}
                        <span>⚪ {language === 'es' ? 'Campo Claro (Estructural)' : 'Brightfield / Reference'}</span>
                      </label>
                      
                      {!channels.brightfield.imageSrc && (
                        <label className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-2 py-1 rounded cursor-pointer hover:bg-[#E69A5E] hover:text-white transition-all">
                          📤 {language === 'es' ? 'Subir' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('brightfield', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {channels.brightfield.imageSrc ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex gap-2.5 items-center">
                          <img
                            src={channels.brightfield.imageSrc}
                            alt="Brightfield mini preview"
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200 bg-white"
                          />
                          <input
                            type="text"
                            value={channels.brightfield.label}
                            onChange={(e) => handleLabelChange('brightfield', e.target.value)}
                            className="flex-1 p-1 text-[10px] border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 font-bold"
                          />
                        </div>

                        {/* SLIDERS BLOCK */}
                        <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                          {/* Gain */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Ganancia/Intensidad:' : 'Gain/Intensity:'}</span>
                              <span className="font-mono text-amber-600">{channels.brightfield.intensity}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.brightfield.intensity}
                              onChange={(e) => handleIntensityChange('brightfield', Number(e.target.value))}
                              className="w-full accent-amber-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Brightness */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Brillo:' : 'Brightness:'}</span>
                              <span className="font-mono text-amber-600">{channels.brightfield.brightness}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.brightfield.brightness}
                              onChange={(e) => handleBrightnessChange('brightfield', Number(e.target.value))}
                              className="w-full accent-amber-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Contrast */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Contraste:' : 'Contrast:'}</span>
                              <span className="font-mono text-amber-600">{channels.brightfield.contrast}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.brightfield.contrast}
                              onChange={(e) => handleContrastChange('brightfield', Number(e.target.value))}
                              className="w-full accent-amber-500 h-1 rounded bg-slate-100"
                            />
                          </div>
                        </div>

                        {/* DOWNLOAD / CLEAR */}
                        <div className="flex justify-between items-center text-[9px] font-bold pt-1">
                          <button
                            onClick={() => handleDownloadChannel('brightfield')}
                            className="text-indigo-650 hover:underline flex items-center gap-0.5"
                          >
                            📥 {language === 'es' ? 'Descargar' : 'Download'}
                          </button>
                          <button
                            onClick={() => handleClearChannel('brightfield')}
                            className="text-rose-600 hover:underline"
                          >
                            🗑️ {language === 'es' ? 'Quitar' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-450 italic">{language === 'es' ? 'Opcional (Vacío)' : 'Optional (Empty)'}</p>
                    )}
                  </div>

                  {/* CHANNEL 2: RED / ROJO */}
                  <div className="p-3 bg-rose-50/40 dark:bg-slate-950 rounded-2xl border border-rose-100 dark:border-rose-950/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-xs text-rose-900 dark:text-rose-300">
                        {channels.red.imageSrc && (
                          <input
                            type="checkbox"
                            checked={channels.red.active}
                            onChange={() => handleToggleActive('red')}
                            className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        )}
                        <span>🔴 {language === 'es' ? 'Canal Rojo (Emisión)' : 'Red Channel'}</span>
                      </label>
                      
                      {!channels.red.imageSrc && (
                        <label className="text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 px-2 py-1 rounded cursor-pointer hover:bg-rose-600 hover:text-white transition-all">
                          📤 {language === 'es' ? 'Subir' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('red', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {channels.red.imageSrc ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex gap-2.5 items-center">
                          <img
                            src={channels.red.imageSrc}
                            alt="Red mini preview"
                            className="w-9 h-9 object-cover rounded-lg border border-rose-200/50 bg-white"
                          />
                          <input
                            type="text"
                            value={channels.red.label}
                            onChange={(e) => handleLabelChange('red', e.target.value)}
                            className="flex-1 p-1 text-[10px] border border-rose-200/50 dark:border-rose-950 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 font-bold"
                          />
                        </div>

                        {/* SLIDERS BLOCK */}
                        <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-rose-100/40">
                          {/* Gain */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Ganancia Roja:' : 'Red Gain:'}</span>
                              <span className="font-mono text-rose-600">{channels.red.intensity}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.red.intensity}
                              onChange={(e) => handleIntensityChange('red', Number(e.target.value))}
                              className="w-full accent-rose-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Brightness */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Brillo Rojo:' : 'Red Brightness:'}</span>
                              <span className="font-mono text-rose-600">{channels.red.brightness}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.red.brightness}
                              onChange={(e) => handleBrightnessChange('red', Number(e.target.value))}
                              className="w-full accent-rose-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Contrast */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Contraste Rojo:' : 'Red Contrast:'}</span>
                              <span className="font-mono text-rose-600">{channels.red.contrast}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.red.contrast}
                              onChange={(e) => handleContrastChange('red', Number(e.target.value))}
                              className="w-full accent-rose-500 h-1 rounded bg-slate-100"
                            />
                          </div>
                        </div>

                        {/* DOWNLOAD / CLEAR */}
                        <div className="flex justify-between items-center text-[9px] font-bold pt-1">
                          <button
                            onClick={() => handleDownloadChannel('red')}
                            className="text-indigo-650 hover:underline flex items-center gap-0.5"
                          >
                            📥 {language === 'es' ? 'Descargar' : 'Download'}
                          </button>
                          <button
                            onClick={() => handleClearChannel('red')}
                            className="text-rose-600 hover:underline"
                          >
                            🗑️ {language === 'es' ? 'Quitar' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-rose-400 italic">{language === 'es' ? 'Vacío' : 'Empty'}</p>
                    )}
                  </div>

                  {/* CHANNEL 3: GREEN / VERDE */}
                  <div className="p-3 bg-emerald-50/40 dark:bg-slate-950 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-300">
                        {channels.green.imageSrc && (
                          <input
                            type="checkbox"
                            checked={channels.green.active}
                            onChange={() => handleToggleActive('green')}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        )}
                        <span>🟢 {language === 'es' ? 'Canal Verde (Emisión)' : 'Green Channel'}</span>
                      </label>
                      
                      {!channels.green.imageSrc && (
                        <label className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 px-2 py-1 rounded cursor-pointer hover:bg-emerald-600 hover:text-white transition-all">
                          📤 {language === 'es' ? 'Subir' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('green', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {channels.green.imageSrc ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex gap-2.5 items-center">
                          <img
                            src={channels.green.imageSrc}
                            alt="Green mini preview"
                            className="w-9 h-9 object-cover rounded-lg border border-emerald-200/50 bg-white"
                          />
                          <input
                            type="text"
                            value={channels.green.label}
                            onChange={(e) => handleLabelChange('green', e.target.value)}
                            className="flex-1 p-1 text-[10px] border border-emerald-200/50 dark:border-emerald-950 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 font-bold"
                          />
                        </div>

                        {/* SLIDERS BLOCK */}
                        <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-emerald-100/40">
                          {/* Gain */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Ganancia Verde:' : 'Green Gain:'}</span>
                              <span className="font-mono text-emerald-600">{channels.green.intensity}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.green.intensity}
                              onChange={(e) => handleIntensityChange('green', Number(e.target.value))}
                              className="w-full accent-emerald-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Brightness */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Brillo Verde:' : 'Green Brightness:'}</span>
                              <span className="font-mono text-emerald-600">{channels.green.brightness}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.green.brightness}
                              onChange={(e) => handleBrightnessChange('green', Number(e.target.value))}
                              className="w-full accent-emerald-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Contrast */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Contraste Verde:' : 'Green Contrast:'}</span>
                              <span className="font-mono text-emerald-600">{channels.green.contrast}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.green.contrast}
                              onChange={(e) => handleContrastChange('green', Number(e.target.value))}
                              className="w-full accent-emerald-500 h-1 rounded bg-slate-100"
                            />
                          </div>
                        </div>

                        {/* DOWNLOAD / CLEAR */}
                        <div className="flex justify-between items-center text-[9px] font-bold pt-1">
                          <button
                            onClick={() => handleDownloadChannel('green')}
                            className="text-indigo-650 hover:underline flex items-center gap-0.5"
                          >
                            📥 {language === 'es' ? 'Descargar' : 'Download'}
                          </button>
                          <button
                            onClick={() => handleClearChannel('green')}
                            className="text-rose-600 hover:underline"
                          >
                            🗑️ {language === 'es' ? 'Quitar' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-400 italic">{language === 'es' ? 'Vacío' : 'Empty'}</p>
                    )}
                  </div>

                  {/* CHANNEL 4: BLUE / AZUL */}
                  <div className="p-3 bg-indigo-50/40 dark:bg-slate-950 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-xs text-indigo-900 dark:text-indigo-300">
                        {channels.blue.imageSrc && (
                          <input
                            type="checkbox"
                            checked={channels.blue.active}
                            onChange={() => handleToggleActive('blue')}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        )}
                        <span>🔵 {language === 'es' ? 'Canal Azul (DAPI)' : 'Blue Channel'}</span>
                      </label>
                      
                      {!channels.blue.imageSrc && (
                        <label className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 px-2 py-1 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-all">
                          📤 {language === 'es' ? 'Subir' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('blue', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {channels.blue.imageSrc ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex gap-2.5 items-center">
                          <img
                            src={channels.blue.imageSrc}
                            alt="Blue mini preview"
                            className="w-9 h-9 object-cover rounded-lg border border-indigo-200/50 bg-white"
                          />
                          <input
                            type="text"
                            value={channels.blue.label}
                            onChange={(e) => handleLabelChange('blue', e.target.value)}
                            className="flex-1 p-1 text-[10px] border border-indigo-200/50 dark:border-indigo-950 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 font-bold"
                          />
                        </div>

                        {/* SLIDERS BLOCK */}
                        <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/40">
                          {/* Gain */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Ganancia Azul:' : 'Blue Gain:'}</span>
                              <span className="font-mono text-indigo-600">{channels.blue.intensity}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.blue.intensity}
                              onChange={(e) => handleIntensityChange('blue', Number(e.target.value))}
                              className="w-full accent-indigo-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Brightness */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Brillo Azul:' : 'Blue Brightness:'}</span>
                              <span className="font-mono text-indigo-600">{channels.blue.brightness}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.blue.brightness}
                              onChange={(e) => handleBrightnessChange('blue', Number(e.target.value))}
                              className="w-full accent-indigo-500 h-1 rounded bg-slate-100"
                            />
                          </div>

                          {/* Contrast */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{language === 'es' ? 'Contraste Azul:' : 'Blue Contrast:'}</span>
                              <span className="font-mono text-indigo-600">{channels.blue.contrast}%</span>
                            </div>
                            <input
                              type="range" min="0" max="200" value={channels.blue.contrast}
                              onChange={(e) => handleContrastChange('blue', Number(e.target.value))}
                              className="w-full accent-indigo-500 h-1 rounded bg-slate-100"
                            />
                          </div>
                        </div>

                        {/* DOWNLOAD / CLEAR */}
                        <div className="flex justify-between items-center text-[9px] font-bold pt-1">
                          <button
                            onClick={() => handleDownloadChannel('blue')}
                            className="text-indigo-650 hover:underline flex items-center gap-0.5"
                          >
                            📥 {language === 'es' ? 'Descargar' : 'Download'}
                          </button>
                          <button
                            onClick={() => handleClearChannel('blue')}
                            className="text-rose-600 hover:underline"
                          >
                            🗑️ {language === 'es' ? 'Quitar' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-indigo-400 italic">{language === 'es' ? 'Vacío' : 'Empty'}</p>
                    )}
                  </div>

                </div>

                {/* CONFIRM BUTTON */}
                <button
                  type="button"
                  disabled={!hasAnyImage}
                  onClick={() => setActiveStep(2)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-40 text-white font-black text-xs md:text-sm rounded-2xl flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  ➔ {language === 'es' ? 'Aceptar e Ir a la Ficha' : 'Accept & Proceed to Ficha'}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* STEP 2: SAVE RECORD DETAILS FORM */}
        {activeStep === 2 && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm animate-fade-in">
            <div className="text-center space-y-1">
              <span className="text-4xl block">📋</span>
              <h3 className="font-extrabold text-sm text-[#3E2A1F] dark:text-slate-100 uppercase tracking-widest">
                {language === 'es' ? 'Ficha de Laboratorio (Opcional)' : 'Optional Record Sheet'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'es' 
                  ? 'Completa de forma opcional los datos que identificarán a esta superposición multicanal.' 
                  : 'Optionally fill out descriptive metadata for this multi-channel overlap.'}
              </p>
            </div>

            <div className="space-y-4">
              {/* Job Title */}
              <div>
                <label className="block text-xs font-black text-[#3E2A1F]/80 dark:text-slate-200 mb-1">
                  🏷️ {language === 'es' ? 'Nombre del Trabajo' : 'Job Name / Title'}
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full p-2.5 border border-[#E69A5E]/25 rounded-xl text-xs font-bold outline-none bg-white dark:bg-slate-950"
                  placeholder={language === 'es' ? 'Ej. Ensayo de inmunofluorescencia HeLa' : 'e.g. Immunofluorescence HeLa assay'}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-black text-[#3E2A1F]/80 dark:text-slate-200 mb-1">
                  📅 {language === 'es' ? 'Fecha de Corrida' : 'Experiment Date'}
                </label>
                <input
                  type="date"
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="w-full p-2.5 border border-[#E69A5E]/25 rounded-xl text-xs font-bold outline-none bg-white dark:bg-slate-950"
                />
              </div>

              {/* Sample Type */}
              <div>
                <label className="block text-xs font-black text-[#3E2A1F]/80 dark:text-slate-200 mb-1">
                  🧪 {language === 'es' ? 'Tipo de Muestra' : 'Sample Type'}
                </label>
                <input
                  type="text"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full p-2.5 border border-[#E69A5E]/25 rounded-xl text-xs font-bold outline-none bg-white dark:bg-slate-950"
                  placeholder={language === 'es' ? 'Ej. Células HeLa, Cultivo primario neuronas' : 'e.g. HeLa cells, Primary neurons culture'}
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-black text-[#3E2A1F]/80 dark:text-slate-200 mb-1">
                  📝 {language === 'es' ? 'Observaciones / Notas' : 'Observations / Notes'}
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 border border-[#E69A5E]/25 rounded-xl text-xs font-bold outline-none bg-white dark:bg-slate-950 resize-none"
                  placeholder={language === 'es' ? 'Añade observaciones metodológicas, anticuerpos secundarios utilizados o notas...' : 'Enter secondary antibodies metadata, antibody ratios or methodology notes...'}
                />
              </div>
            </div>

            {/* Merged Preview and Direct Download */}
            {mergedDataUrl && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-black text-[#3E2A1F]/80 dark:text-slate-200">
                  🖼️ {language === 'es' ? 'Previsualización de la Fusión de Canales' : 'Merged Channels Preview'}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <div className="w-28 h-28 bg-black rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow flex items-center justify-center shrink-0">
                    <img
                      src={mergedDataUrl}
                      alt="Merged Preview"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      {language === 'es'
                        ? 'Funde y combina los canales activos aplicando los ajustes deseados y descarga la superposición directamente.'
                        : 'Merge and blend the active channels applying your desired settings and download the overlay directly.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadMerged}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow active:scale-[97%] transition-all cursor-pointer min-h-[38px]"
                    >
                      📥 {language === 'es' ? 'Combinar y Descargar' : 'Merge and Download'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition-all"
              >
                ⬅️ {language === 'es' ? 'Volver a Ajustar' : 'Back to Adjustment'}
              </button>

              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs rounded-xl shadow active:scale-[98%] transition-all"
              >
                💾 {language === 'es' ? 'Guardar y Finalizar' : 'Save & Finalise'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER METADATA */}
      <div className="w-full text-center text-[10px] text-slate-450 dark:text-slate-550 pt-6 mt-4 border-t border-[#E69A5E]/10 shrink-0">
        MiLabUBA Bioelectrophoresis Module • {language === 'es' ? 'MERGE Multicanal Aditivo en Color Directo' : 'Additive Color Brightfield/Fluorescence Combiner'}
      </div>

    </div>
  );
}
