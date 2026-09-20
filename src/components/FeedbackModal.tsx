import React from 'react';
import { Language } from '../types';

interface FeedbackModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ language, isOpen, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;

  const formUrlDirect = language === 'es'
    ? "https://docs.google.com/forms/d/e/1FAIpQLSfLMaQRRKWIw1cm1K-f66y45v0xbfQaxEfYBvCAI_6w49gSjw/viewform?usp=publish-editor"
    : "https://docs.google.com/forms/d/e/1FAIpQLSeGm3RxgKMO0LI0z7ciEQkaoTc02MQXV9c5x17LhVfjXnhNIw/viewform?usp=publish-editor";

  const formUrlEmbedded = language === 'es'
    ? "https://docs.google.com/forms/d/e/1FAIpQLSfLMaQRRKWIw1cm1K-f66y45v0xbfQaxEfYBvCAI_6w49gSjw/viewform?embedded=true"
    : "https://docs.google.com/forms/d/e/1FAIpQLSeGm3RxgKMO0LI0z7ciEQkaoTc02MQXV9c5x17LhVfjXnhNIw/viewform?embedded=true";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-indigo-200/50 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-100 dark:border-slate-800 flex-shrink-0">
          <h3 className="text-sm font-black text-[#1E3A8A] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <span>📬</span> {language === 'es' ? 'Sugerencias y Reportes / Feedback' : 'Feedback & Suggestions'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors cursor-pointer text-sm p-1 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <p className="text-xs text-slate-705 dark:text-slate-300 leading-relaxed font-semibold">
            {language === 'es' 
              ? 'Queremos que MiLabUBA sea una herramienta perfecta para la docencia y la investigación. Tu aporte es fundamental:' 
              : 'We want MiLabUBA to be a perfect tool for teaching and research. Your input is vital:'}
          </p>

          {/* Banner Celeste (Complete questionnaire callout) */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-900/60 text-center space-y-3 shadow-3xs">
            <span className="text-xs font-black text-sky-900 dark:text-sky-300 block uppercase tracking-wider">
              📋 {language === 'es' ? 'Completar el cuestionario' : 'Complete the Questionnaire'}
            </span>
            <p className="text-xs text-sky-800 dark:text-sky-400 leading-normal max-w-lg mx-auto">
              {language === 'es' 
                ? 'Accede al cuestionario directamente desde aquí o haz clic en el botón de abajo para responder en pantalla completa.' 
                : 'Access the questionnaire here or click below to fill it in full screen.'}
            </p>
            <div className="flex justify-center">
              <a 
                href={formUrlDirect} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md hover:shadow-sky-500/20 active:scale-98 min-h-[40px]"
              >
                📝 {language === 'es' ? 'Abrir en pestaña nueva' : 'Open in new tab'} ↗
              </a>
            </div>
          </div>

          {/* Embedded Google Form Option */}
          <div className="border border-gray-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 h-[380px] md:h-[450px] relative">
            <iframe 
              src={formUrlEmbedded} 
              className="w-full h-full border-0"
              title="Google Form Survey"
            >
              {language === 'es' ? 'Cargando formulario...' : 'Loading form...'}
            </iframe>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mt-4 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-gray-300 font-extrabold rounded-xl cursor-pointer min-h-[38px] transition-colors"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
