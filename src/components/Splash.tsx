import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { UbaSealSVG, ConicetIquifibSVG, FfybSVG, FoubaSVG } from './OfficialLogos';
import FeedbackModal from './FeedbackModal';
import { safeStorage } from '../storage';
import { QrModal } from './QrModal';
import { QrCode } from 'lucide-react';

interface SplashProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onStart: () => void;
  onOpenCredits: () => void;
}

// Highly polished, academic SVG icons for default fallback
const UbaIcon = () => (
  <UbaSealSVG className="w-14 h-14 mb-1.5" />
);

const ConicetIcon = () => (
  <ConicetIquifibSVG className="w-20 h-15 mb-0.5" />
);

const FfybIcon = () => (
  <FfybSVG className="w-14 h-14 mb-1.5" />
);

const FoubaIcon = () => (
  <FoubaSVG className="w-14 h-14 mb-1.5" />
);

export default function Splash({ language, onSetLanguage, onStart, onOpenCredits }: SplashProps) {
  const t = translations[language];

  // Load custom logos from localStorage so the user can easily brand the application
  const [logos, setLogos] = useState<{
    uba?: string;
    conicet?: string;
    ffyb?: string;
    fouba?: string;
  }>(() => {
    try {
      const saved = safeStorage.getItem('milabuba_logos');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Sharing states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  const handleForceUpdateApp = async () => {
    setIsUpdatingApp(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
    } catch (err) {
      console.error('Error limpiando caché:', err);
    }
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.replace(cleanUrl);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/';
    try {
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = url;
      tempTextArea.style.top = "0";
      tempTextArea.style.left = "0";
      tempTextArea.style.position = "fixed";
      document.body.appendChild(tempTextArea);
      tempTextArea.focus();
      tempTextArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempTextArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Link copy failed", err);
    }
  };

  const handleLogoUpload = (key: 'uba' | 'conicet' | 'ffyb' | 'fouba', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        const updated = { ...logos, [key]: base64 };
        setLogos(updated);
        safeStorage.setItem('milabuba_logos', JSON.stringify(updated));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogos = () => {
    if (window.confirm(language === 'es' ? '¿Quieres restablecer los logos a sus valores predeterminados?' : 'Do you want to reset logos to default placeholders?')) {
      setLogos({});
      safeStorage.removeItem('milabuba_logos');
    }
  };

  const handleNewTabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = window.location.origin + '/';
    let opened = false;
    try {
      const win = window.open(url, '_blank');
      if (win) {
        opened = true;
      }
    } catch (err) {
      console.warn("window.open failed", err);
    }

    if (!opened) {
      // Bulletproof fallback using a temporary offscreen text area
      try {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = url;
        tempTextArea.style.top = "0";
        tempTextArea.style.left = "0";
        tempTextArea.style.position = "fixed";
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(tempTextArea);
        
        if (successful) {
          alert(language === 'es'
            ? '📋 El navegador bloqueó la pestaña emergente. El enlace directo fue copiado al portapapeles. ¡Pégalo en tu navegador para abrir!\n\nEnlace: ' + url
            : '📋 Pop-up was blocked, but the link has been copied to your clipboard. Paste it in your browser directly!\n\nLink: ' + url
          );
          return;
        }
      } catch (err2) {
        console.error("Textarea copy failed", err2);
      }

      // Final fallback using standard windows prompt if all clipboard controls are blocked
      window.prompt(
        language === 'es'
          ? 'Copia este enlace de tu aplicación manualmente para abrirlo en tu celular o nueva pestaña:'
          : 'Copy this application link manually to open it in a new tab or on your phone:',
        url
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-between items-center p-3 md:p-8 select-none text-[#0F172A] transition-all">
      {/* Spacer to push card vertically balanced */}
      <div className="flex-1 flex flex-col justify-center items-center w-full">
        {/* Main Branding Card */}
        <div 
          id="splash-hero"
          className="w-full max-w-lg bg-white border-2 border-[#1E3A8A]/20 rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center shadow-xl text-center relative overflow-hidden"
        >
          {/* Soft Background Accents */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#1E3A8A]/5 rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#1E3A8A]/5 rounded-full pointer-events-none"></div>

          {/* Card Header Bar - relocated inside white box */}
          <div className="w-full flex justify-between items-center z-10 border-b border-slate-100 pb-2.5 mb-3.5">
            <button
              id="btn-splash-credits"
              onClick={onOpenCredits}
              className="text-[10px] md:text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-[#1E3A8A]/15 rounded-full hover:bg-slate-100 text-[#0F172A] shadow-3xs active:scale-95 transition-all cursor-pointer min-h-[32px] flex items-center"
            >
              {t.creditsButton}
            </button>

            <div className="flex gap-1.5 items-center">
              {/* Share White Label Link Button */}
              <button
                onClick={() => setIsShareOpen(true)}
                className="text-[10px] md:text-xs font-semibold px-2.5 py-1.5 bg-emerald-50 border border-emerald-500/15 rounded-full hover:bg-emerald-100/70 text-emerald-700 shadow-3xs active:scale-95 transition-all cursor-pointer min-h-[32px] flex items-center gap-1"
                title={language === 'es' ? 'Compartir e Instalar' : 'Share & Install'}
              >
                🔗 <span>{language === 'es' ? 'Compartir e Instalar' : 'Share & Install'}</span>
              </button>

              {/* Improved Language Switcher Selector */}
              <div className="flex bg-slate-50 p-0.5 rounded-full border border-[#1E3A8A]/15">
                <button
                  onClick={() => onSetLanguage('es')}
                  className={`px-2 md:px-2.5 py-0.5 text-[10px] md:text-xs rounded-full cursor-pointer font-bold transition-all ${
                    language === 'es' ? 'bg-[#1E3A8A] text-white shadow-3xs' : 'text-[#0F172A]/70 hover:text-[#0F172A]'
                  }`}
                >
                  ESP
                </button>
                <button
                  onClick={() => onSetLanguage('en')}
                  className={`px-2 md:px-2.5 py-0.5 text-[10px] md:text-xs rounded-full cursor-pointer font-bold transition-all ${
                    language === 'en' ? 'bg-[#1E3A8A] text-white shadow-3xs' : 'text-[#0F172A]/70 hover:text-[#0F172A]'
                  }`}
                >
                  ENG
                </button>
              </div>
            </div>
          </div>

          {/* Title - Double click secretly opens custom logo uploader admin */}
          <h1 
            onDoubleClick={() => setIsLogoModalOpen(true)}
            className="text-3xl md:text-4xl font-black text-[#1E3A8A] tracking-tight mb-3 transition-colors cursor-pointer select-none"
            title={language === 'es' ? 'Doble clic para administrar logos (Admin)' : 'Double click to administer logos (Admin)'}
          >
            MiLabUBA
          </h1>

          {/* Academic Hierarchy Items - Optimized space and shrinked sizes for premium mobile view stability */}
          <div className="space-y-2.5 w-full">
            {/* Level 1: UBA & CONICET (Equal level, compact structures) */}
            <div className="grid grid-cols-2 gap-2.5 border-t border-[#1E3A8A]/10 pt-3">
              <a 
                href="https://www.uba.ar/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200/50 flex flex-col justify-center items-center backdrop-blur-xs min-h-[105px] transition-all hover:scale-[102%] cursor-pointer active:scale-95"
              >
                {logos.uba ? (
                  <img src={logos.uba} alt="UBA Logo" className="w-14 h-14 object-contain rounded mb-1.5" referrerPolicy="no-referrer" />
                ) : (
                  <UbaIcon />
                )}
                <h3 className="font-extrabold text-[10px] text-[#0F172A] uppercase tracking-wider leading-tight text-center">
                  {t.institution1}
                </h3>
              </a>
              
              <a 
                href="https://iquifib.conicet.gov.ar/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200/50 flex flex-col justify-center items-center backdrop-blur-xs min-h-[105px] transition-all hover:scale-[102%] cursor-pointer active:scale-95"
              >
                {logos.conicet ? (
                  <img src={logos.conicet} alt="CONICET Logo" className="w-20 h-14 object-contain rounded mb-0.5" referrerPolicy="no-referrer" />
                ) : (
                  <ConicetIcon />
                )}
                <h3 className="font-extrabold text-[10px] text-[#1E3A8A] uppercase tracking-wider leading-tight text-center font-mono">
                  {t.conicet}
                </h3>
                <p className="text-[8px] text-[#0F172A]/70 leading-normal text-center mt-0.5 font-bold">
                  {language === 'es' ? 'Inst. de Química y Fisicoquímica Biológicas' : 'Inst. of Biological Chemistry and Physicochemistry'}
                </p>
              </a>
            </div>

            {/* Level 2: FFyB & FOUBA (Sub-branches of UBA, compact structures) */}
            <div className="grid grid-cols-2 gap-2.5">
              <a 
                href="https://www.ffyb.uba.ar/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col justify-center items-center shadow-3xs min-h-[110px] transition-all hover:scale-[102%] cursor-pointer active:scale-95"
              >
                {logos.ffyb ? (
                  <img src={logos.ffyb} alt="FFyB Logo" className="w-14 h-14 object-contain rounded mb-1.5" referrerPolicy="no-referrer" />
                ) : (
                  <FfybIcon />
                )}
                <p className="text-[8px] text-[#0F172A]/85 leading-tight text-center font-bold">
                  {t.institution2}
                </p>
              </a>

              <a 
                href="http://odontologia.uba.ar/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col justify-center items-center shadow-3xs min-h-[110px] transition-all hover:scale-[102%] cursor-pointer active:scale-95"
              >
                {logos.fouba ? (
                  <img src={logos.fouba} alt="FOUBA Logo" className="w-14 h-14 object-contain rounded mb-1.5" referrerPolicy="no-referrer" />
                ) : (
                  <FoubaIcon />
                )}
                <p className="text-[8px] text-[#0F172A]/85 leading-tight text-center font-bold">
                  {t.institution3}
                </p>
              </a>
            </div>
          </div>

          {/* Start Button */}
          <button
            id="btn-splash-start"
            onClick={onStart}
            className="mt-5 w-full max-w-xs flex items-center justify-center gap-2 text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] select-none font-bold text-base p-3 min-h-[48px] rounded-2xl shadow-md hover:shadow-lg active:scale-98 transition-all transform duration-150 cursor-pointer animate-pulse-subtle font-sans"
          >
            <span>🚀</span> {t.start}
          </button>
        </div>
      </div>

      {/* Footer Branding info */}
      <footer className="w-full max-w-md text-center py-2 z-10 text-[10px] md:text-xs text-[#0F172A]/60 px-4 font-normal">
        {t.institutionalFooter}
      </footer>

      {/* Institutional logo customization Modal */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-center select-none animate-fade-in">
            <h3 className="text-lg font-black text-[#1E3A8A] flex items-center justify-center gap-1.5 font-mono">
              <span>🖼️</span> {language === 'es' ? 'Cargar Logotipos Oficiales' : 'Upload Official Logos'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {language === 'es' 
                ? 'Puedes subir imágenes recortadas (PNG/JPG o SVG) de los logos institucionales para reemplazar los íconos por defecto de la pantalla inicial.'
                : 'You can upload cropped institutional logos (PNG/JPG or SVG) to replace the default startup icons.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              {/* UBA Logo Select */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">🏛️ UBA Logo</p>
                  <label className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer mt-1 block">
                    {logos.uba ? '🔄 Cambiar' : '📤 Seleccionar archivo'}
                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('uba', e)} className="hidden" />
                  </label>
                </div>
                {logos.uba && <img src={logos.uba} className="w-9 h-9 object-contain border rounded" referrerPolicy="no-referrer" />}
              </div>

              {/* CONICET Logo Select */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">🧬 CONICET Logo</p>
                  <label className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer mt-1 block">
                    {logos.conicet ? '🔄 Cambiar' : '📤 Seleccionar archivo'}
                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('conicet', e)} className="hidden" />
                  </label>
                </div>
                {logos.conicet && <img src={logos.conicet} className="w-9 h-9 object-contain border rounded" referrerPolicy="no-referrer" />}
              </div>

              {/* FFyB Logo Select */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">🧪 FFyB Logo</p>
                  <label className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer mt-1 block">
                    {logos.ffyb ? '🔄 Cambiar' : '📤 Seleccionar archivo'}
                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('ffyb', e)} className="hidden" />
                  </label>
                </div>
                {logos.ffyb && <img src={logos.ffyb} className="w-9 h-9 object-contain border rounded" referrerPolicy="no-referrer" />}
              </div>

              {/* FOUBA Logo Select */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">🦷 FOUBA Logo</p>
                  <label className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer mt-1 block">
                    {logos.fouba ? '🔄 Cambiar' : '📤 Seleccionar archivo'}
                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('fouba', e)} className="hidden" />
                  </label>
                </div>
                {logos.fouba && <img src={logos.fouba} className="w-9 h-9 object-contain border rounded" referrerPolicy="no-referrer" />}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-mono text-center pt-2 leading-relaxed">
              📁 {language === 'es' 
                ? 'Los logos cargados se guardan localmente en su navegador para persistir entre sesiones.' 
                : 'Uploaded logos are stored locally in the browser to persist across runs.'}
            </p>

            <div className="flex justify-center gap-2.5 pt-4">
              <button
                type="button"
                onClick={handleClearLogos}
                className="text-xs bg-red-50 hover:bg-red-100/80 text-rose-600 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                🔄 {language === 'es' ? 'Restablecer' : 'Reset defaults'}
              </button>
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="text-xs bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm"
              >
                {t.accept}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Platform Info Modal Overlay */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-emerald-500/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
                🔗 {language === 'es' ? 'Enlace de la Plataforma (White Label)' : 'Application Link (White Label)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-slate-800">
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                {language === 'es'
                  ? 'Este es el enlace directo oficial de marca blanca ("White Label") para tu plataforma. Copia este link para compartir la aplicación directamente con tu cátedra, alumnos o colegas.'
                  : 'This is the official un-embedded white-label URL of your platform. Share this link directly with students, researchers or colleagues.'}
              </p>

              {/* Link placeholder text row */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 overflow-hidden shadow-3xs">
                <span className="font-mono text-[11px] text-slate-700 truncate select-all flex-1 pl-1">
                  {window.location.origin + '/'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg shrink-0 cursor-pointer shadow-sm active:scale-98 transition-all"
                >
                  {copiedLink ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar Enlace' : 'Copy Link')}
                </button>
              </div>

              {/* Botón Ver QR */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full py-2.5 px-4 bg-[#582C83] hover:bg-[#47226b] text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <QrCode className="w-4 h-4" />
                <span>{language === 'es' ? 'Ver QR' : 'View QR'}</span>
              </button>

              {/* Multi-device guide */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-850 space-y-3 text-[11px] leading-relaxed">
                <p className="font-bold text-slate-850 dark:text-slate-200 border-b border-slate-200/50 pb-1 flex items-center gap-1.5">
                  📱 {language === 'es' ? 'Cómo guardar como Ícono o Acceso Directo:' : 'How to Save as an Icon or Shortcut:'}
                </p>
                
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-705 dark:text-slate-350">
                    💻 {language === 'es' ? 'En tu Computadora o Notebook (Ícono en el Escritorio):' : 'On your Computer or Notebook (Desktop Icon):'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1 font-medium">
                    {language === 'es' ? (
                      <>
                        <li><strong>Copiar enlace:</strong> Haz clic en el botón verde de <strong>"Copiar Enlace"</strong> de arriba.</li>
                        <li><strong>Abrir navegador:</strong> Abre Chrome o Edge en tu computadora, pega el link en la barra de direcciones superior y accede.</li>
                        <li><strong>Crear acceso directo:</strong> Toca el menú de <strong>3 puntos</strong> arriba a la derecha de tu navegador, elige <strong>"Guardar y compartir"</strong> y selecciona <strong>"Crear acceso directo..."</strong> (puedes tildar "Abrir como ventana" para que se comporte como un programa sin barra de navegación).</li>
                      </>
                    ) : (
                      <>
                        <li><strong>Copy Link:</strong> Click the green <strong>"Copy Link"</strong> button above.</li>
                        <li><strong>Open browser:</strong> Open Chrome or Edge on your laptop, paste the URL in the address bar and load the page.</li>
                        <li><strong>Create shortcut:</strong> Click the browser's <strong>3-dots menu</strong> at the top right, go to <strong>"Save and share"</strong> and select <strong>"Create shortcut..."</strong> (check "Open as window" to display it as a true standalone app).</li>
                      </>
                    )}
                  </ol>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/40">
                  <p className="font-semibold text-slate-755 dark:text-slate-350">
                    📱 {language === 'es' ? 'En tu Celular o Tablet (Acceso directo en pantalla de inicio):' : 'On your Mobile Phone or Tablet (Home Screen icon):'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1 font-medium">
                    {language === 'es' ? (
                      <>
                        <li><strong>Copiar enlace:</strong> Presiona el botón verde de <strong>"Copiar Enlace"</strong> de arriba.</li>
                        <li><strong>Abrir navegador:</strong> Abre Chrome (en Android) o Safari (en iOS), mantén presionada la barra de direcciones y pega el link oficial.</li>
                        <li><strong>Agregar a inicio:</strong>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-500/90 dark:text-slate-450 pl-3 pt-0.5">
                            <li><strong>Android (Chrome):</strong> Toca los tres puntos verticales arriba a la derecha y selecciona <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar aplicación"</strong>.</li>
                            <li><strong>iPhone/iPad (Safari):</strong> Toca el botón <strong>Compartir</strong> (icono de un cuadro con una flecha hacia arriba) abajo al centro y elige <strong>"Agregar a inicio"</strong>.</li>
                          </ul>
                        </li>
                      </>
                    ) : (
                      <>
                        <li><strong>Copy Link:</strong> Choose the green <strong>"Copy Link"</strong> button above.</li>
                        <li><strong>Open browser:</strong> Launch Chrome (Android) or Safari (iOS), tap the URL input field, paste the official direct link and navigate.</li>
                        <li><strong>Add to Home Screen:</strong>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-500/90 dark:text-slate-450 pl-3 pt-0.5">
                            <li><strong>Android (Chrome):</strong> Tap the 3 vertical dots at the top-right and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
                            <li><strong>iPhone/iPad (Safari):</strong> Tap the <strong>Share</strong> button (box with an arrow pointing up) on the bottom panel and select <strong>"Add to Home Screen"</strong>.</li>
                          </ul>
                        </li>
                      </>
                    )}
                  </ol>
                </div>
              </div>

              {/* How to update & fix cache section */}
              <div className="bg-amber-500/10 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-400/40 dark:border-amber-700/50 space-y-2.5 text-[11px] leading-relaxed">
                <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/50 pb-1.5">
                  <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    🔄 {language === 'es' ? '¿Cómo actualizar a la última versión?' : 'How to update to the latest version?'}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/60 font-bold text-amber-900 dark:text-amber-200">
                    {language === 'es' ? 'Importante' : 'Important'}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    💻 {language === 'es' ? 'En Computadora o Notebook (Escritorio):' : 'On Desktop / Laptop:'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 pl-1 font-medium">
                    {language === 'es' ? (
                      <>
                        Presiona la combinación de teclas <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 shadow-3xs">Ctrl + F5</kbd> (en Windows/Linux) o <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 shadow-3xs">Cmd + Shift + R</kbd> (en Mac). Esto limpia la memoria temporal del navegador y descarga de inmediato los últimos cambios del sistema.
                      </>
                    ) : (
                      <>
                        Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 shadow-3xs">Ctrl + F5</kbd> (Windows/Linux) or <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 shadow-3xs">Cmd + Shift + R</kbd> (Mac) to bypass cached files and load the newest application version.
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-amber-200/40 dark:border-amber-800/40">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    📱 {language === 'es' ? 'En Celular o Tablet (Solución si no se actualiza):' : 'On Mobile Phone or Tablet (Cache fix):'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 pl-1 font-medium">
                    {language === 'es'
                      ? 'Los celulares y accesos directos guardan el sitio en memoria para acelerar la apertura. Si no ves las funciones nuevas:'
                      : 'Mobile browsers and home screen apps cache content aggressively. If you do not see the new updates:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-2">
                    {language === 'es' ? (
                      <>
                        <li><strong>Paso 1 (Recomendado):</strong> Toca el botón <strong>"Limpiar Caché y Actualizar"</strong> de abajo para forzar la recarga inmediata del teléfono.</li>
                        <li><strong>Android (Chrome):</strong> Desliza la pantalla hacia abajo con fuerza (recarga) o cierra la app desde aplicaciones recientes. Si persiste, en Chrome ve a <em>Menú (3 puntos) &gt; Historial &gt; Borrar datos de navegación &gt; Archivos en caché</em>.</li>
                        <li><strong>iPhone / iPad (Safari):</strong> Cierra la pestaña/app. En Safari mantén presionado el icono de recargar 🔄 en la barra de direcciones. Si tienes el ícono en la pantalla de inicio, elimínalo y vuelve a añadirlo desde Safari para enlazar la versión actual.</li>
                      </>
                    ) : (
                      <>
                        <li><strong>Step 1 (Recommended):</strong> Tap the <strong>"Clear Cache & Update"</strong> button below to force refresh your mobile browser.</li>
                        <li><strong>Android (Chrome):</strong> Swipe down firmly to refresh or close from recent apps. Or go to <em>Settings &gt; Privacy &gt; Clear browsing data &gt; Cached images and files</em>.</li>
                        <li><strong>iPhone / iPad (Safari):</strong> Close app from multitasking. In Safari, long-press the reload icon 🔄. If saved to Home Screen, delete the old icon and add it again from Safari.</li>
                      </>
                    )}
                  </ul>

                  {/* Force Update Button */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={handleForceUpdateApp}
                      disabled={isUpdatingApp}
                      className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingApp ? (
                        <span>⏳ {language === 'es' ? 'Actualizando y limpiando caché...' : 'Updating & clearing cache...'}</span>
                      ) : (
                        <span>🔄 {language === 'es' ? 'Limpiar Caché y Forzar Actualización en este Dispositivo' : 'Clear Cache & Force Update on this Device'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 text-[10.5px] text-emerald-800 p-2.5 rounded-xl border border-emerald-200/50 leading-normal font-sans">
                💡 <strong>{language === 'es' ? 'Consejo:' : 'Tip:'}</strong>{' '}
                {language === 'es'
                  ? 'Puedes copiar este link y subirlo al Campus Virtual FFyB o FOUBA, enviarlo por grupos de WhatsApp, o pegarlo en tus guías de trabajos prácticos de microscopía y geles.'
                  : 'You can publish this link directly to Blackboard, Moodle, virtual classrooms, or worksheets to use for practical student experiments.'}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsShareOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {language === 'es' ? 'Entendido' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Feedback Modal component */}
      <FeedbackModal 
        language={language}
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Qr Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        language={language}
      />
    </div>
  );
}
