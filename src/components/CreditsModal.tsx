import { Language } from '../types';
import { translations } from '../translations';

interface CreditsModalProps {
  language: Language;
  onClose: () => void;
}

export default function CreditsModal({ language, onClose }: CreditsModalProps) {
  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div 
        id="credits-dialog"
        className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-2xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
      >
        {/* Institutional Decorative Watermark */}
        <div className="absolute top-[-30px] right-[-30px] text-8xl opacity-5 select-none pointer-events-none">
          🏛️
        </div>
        
        <button 
          id="btn-close-credits"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3E2A1F]/70 hover:text-[#B95C2E] transition-colors p-2 text-xl"
          aria-label="Cerrar"
        >
          ❌
        </button>

        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">🏛️</span>
          <h2 className="text-xl font-bold text-[#3E2A1F] tracking-tight hover:text-[#E69A5E] transition-colors">
            {t.creditsTitle}
          </h2>
        </div>

        <div className="space-y-4 text-left my-4">
          {/* Level 1: Primary Entities */}
          <div className="space-y-4">
            {/* UBA Block */}
            <div className="p-4 bg-white border border-[#E69A5E]/20 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E69A5E]/10">
                <span className="text-xl">🏛️</span>
                <p className="font-black text-[#3E2A1F] text-sm md:text-base">{t.institution1}</p>
              </div>
              <div className="pl-6 space-y-3">
                <div className="relative">
                  <div className="absolute left-[-14px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#E69A5E]/50"></div>
                  <p className="font-bold text-xs text-[#3E2A1F] leading-relaxed">{t.institution2}</p>
                </div>
                <div className="relative">
                  <div className="absolute left-[-14px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#E69A5E]/50"></div>
                  <p className="font-bold text-xs text-[#3E2A1F] leading-relaxed">{t.institution3}</p>
                </div>
              </div>
            </div>

            {/* CONICET Block */}
            <div className="p-4 bg-white border border-[#E69A5E]/20 rounded-2xl shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-[#E69A5E]/10 w-full">
                <span className="text-xl">🧬</span>
                <p className="font-black text-[#3E2A1F] text-sm md:text-base leading-snug">{t.conicet}</p>
              </div>
              <div className="pl-6 relative">
                <div className="absolute left-[-14px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#E69A5E]/50"></div>
                <p className="font-bold text-xs text-[#3E2A1F] leading-relaxed">
                  {language === 'es'
                    ? 'Instituto de Química y Fisicoquímica Biológicas, Prof. Alejandro C. Paladini (IQUIFIB)'
                    : 'Institute of Biological Chemistry and Physicochemistry, Prof. Alejandro C. Paladini (IQUIFIB)'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E69A5E]/20 pt-4 mt-2 text-center">
            <p className="font-bold text-sm md:text-base text-[#3E2A1F]">{t.developedBy}</p>
            
            <a 
              href="https://orcid.org/0000-0002-8066-5445" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 underline font-mono mt-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-colors"
            >
              🟢 ID: https://orcid.org/0000-0002-8066-5445
            </a>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-[#3E2A1F]/60 font-medium">
          {t.year} • {t.title}
        </div>

        <div className="mt-5 flex justify-center">
          <button 
            id="btn-credits-accept"
            onClick={onClose}
            className="px-6 py-2 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-bold rounded-xl shadow-md min-h-[48px] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
