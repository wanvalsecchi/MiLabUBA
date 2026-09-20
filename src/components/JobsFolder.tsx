import React, { useState } from 'react';
import { Category, Ficha, Language } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';
import { getCategoryDescription } from '../categoryDescriptions';

interface JobsFolderProps {
  language: Language;
  category: Category;
  fichas: Ficha[];
  onSelectFicha: (ficha: Ficha) => void;
  onNewFichaClick: () => void;
  onBack: () => void;
  onDeleteCategory?: (id: string) => void;
  onDeleteFicha?: (id: string) => void;
}

export default function JobsFolder({
  language,
  category,
  fichas,
  onSelectFicha,
  onNewFichaClick,
  onBack,
  onDeleteCategory,
  onDeleteFicha
}: JobsFolderProps) {
  const t = translations[language];

  // Custom confirmation modals states
  const [fichaToDelete, setFichaToDelete] = useState<Ficha | null>(null);
  const [showCategoryConfirmDelete, setShowCategoryConfirmDelete] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter fichas belonging to this category and matching query
  const filteredFichas = fichas
    .filter((f) => f.categoryId === category.id)
    .filter((f) => f.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const getCategoryDisplayName = (cat: Category) => {
    if (cat.type === 'count') return t.count || (language === 'es' ? 'Contar' : 'Count');
    if (cat.type === 'densitometria') return language === 'es' ? 'Densitometría' : 'Densitometry';
    if (cat.type === 'sds-page') return t.sdsPage || 'PAGE';
    if (cat.type === 'zimografia') return language === 'es' ? 'Zimografía' : 'Zymography';
    if (cat.type === 'adn') return t.adn || (language === 'es' ? 'ADN' : 'DNA');
    if (cat.type === 'doi-analyzer') return language === 'es' ? 'Colorimetría RGV' : 'RGV Colorimetry';
    if (cat.type === 'microscopy') return t.microscopy;
    if (cat.type === 'histology') return t.histology || (language === 'es' ? 'Histología' : 'Histology');
    if (cat.type === 'rgv-analyzer') return language === 'es' ? 'MERGE Multicanal' : 'MERGE Multi-Channel';
    return cat.name;
  };

  const getCategoryEmoji = (cat: Category): React.ReactNode => {
    if (cat.type === 'microscopy') return '🔬';
    if (cat.type === 'histology') return '🔬';
    if (cat.type === 'count') return '🧮';
    if (cat.type === 'sds-page') {
      return (
        <svg className="h-[1.1em] w-[1.1em] inline-block align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 3c0 0 3.5 4 4.5 9s-2.5 7-1.5 9" />
          <path d="M10.5 3c0 0 3.5 4 4.5 9s-2.5 7-1.5 9" />
          <path d="M16.5 3c0 0 3.5 4 4.5 9s-2.5 7-1.5 9" />
          <line x1="6.5" y1="8" x2="12.5" y2="8" strokeDasharray="2 2" strokeWidth="1.5" />
          <line x1="12.5" y1="14" x2="18.5" y2="14" strokeDasharray="2 2" strokeWidth="1.5" />
        </svg>
      );
    }
    if (cat.type === 'adn') return '🧬';
    if (cat.type === 'doi-analyzer') return '📊';
    if (cat.type === 'densitometria') {
      return (
        <svg className="h-[1.1em] w-[1.1em] inline-block align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="7" y1="6" x2="9" y2="6" strokeWidth="2.5" />
          <line x1="11" y1="6" x2="13" y2="6" strokeWidth="2.5" />
          <line x1="15" y1="6" x2="17" y2="6" strokeWidth="2.5" />
          <line x1="7.5" y1="10" x2="8.5" y2="10" strokeWidth="3" />
          <line x1="7.5" y1="15" x2="8.5" y2="15" strokeWidth="3" />
          <line x1="11.5" y1="9" x2="12.5" y2="9" strokeWidth="3" />
          <line x1="11.5" y1="12" x2="12.5" y2="12" strokeWidth="3" />
          <line x1="11.5" y1="17" x2="12.5" y2="17" strokeWidth="3" />
          <line x1="15.5" y1="11" x2="16.5" y2="11" strokeWidth="3" />
          <line x1="15.5" y1="14" x2="16.5" y2="14" strokeWidth="3" />
        </svg>
      );
    }
    if (cat.type === 'zimografia') {
      return (
        <svg className="h-[1.1em] w-[1.1em] inline-block align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="7" y1="6" x2="9" y2="6" strokeWidth="2.5" />
          <line x1="11" y1="6" x2="13" y2="6" strokeWidth="2.5" />
          <line x1="15" y1="6" x2="17" y2="6" strokeWidth="2.5" />
          <line x1="7.5" y1="10" x2="8.5" y2="10" strokeWidth="3" />
          <line x1="7.5" y1="15" x2="8.5" y2="15" strokeWidth="3" />
          <line x1="11.5" y1="9" x2="12.5" y2="9" strokeWidth="3" />
          <line x1="11.5" y1="12" x2="12.5" y2="12" strokeWidth="3" />
          <line x1="11.5" y1="17" x2="12.5" y2="17" strokeWidth="3" />
          <line x1="15.5" y1="11" x2="16.5" y2="11" strokeWidth="3" />
          <line x1="15.5" y1="14" x2="16.5" y2="14" strokeWidth="3" />
        </svg>
      );
    }
    if (cat.type === 'rgv-analyzer') return '🌈';
    return '🧫';
  };

  const handleDeleteCategoryClick = () => {
    if (!onDeleteCategory) return;
    setShowCategoryConfirmDelete(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      <div className="w-full max-w-2xl mx-auto flex-1">
        {/* Navigation / Header bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-[#FFFDF9] dark:bg-slate-900 border border-[#E69A5E]/10 p-3.5 sm:p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <button
              id="btn-back-to-categories"
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-bold bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[38px]"
            >
              ⬅️ {t.back}
            </button>
            <h2 className="text-sm md:text-lg font-black text-[#3E2A1F] dark:text-slate-200 flex items-center gap-1.5 leading-tight">
              <span>{getCategoryEmoji(category)}</span>
              <span className="truncate max-w-[120px] sm:max-w-[250px]">
                {getCategoryDisplayName(category)}
              </span>
            </h2>
            <button
              type="button"
              id="btn-folder-category-desc"
              onClick={() => setShowInfoModal(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-[#B95C2E] dark:text-[#E69A5E] bg-[#E69A5E]/15 hover:bg-[#E69A5E]/25 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer border border-[#E69A5E]/20"
              title={language === 'es' ? 'Ver qué hace y tips de esta categoría' : 'View description & tips for this category'}
            >
              <span>ℹ️</span>
              <span className="hidden xs:inline">{language === 'es' ? 'Descripción' : 'Description'}</span>
            </button>
            <div className="sm:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button
              id="btn-new-fiche"
              onClick={onNewFichaClick}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs font-bold bg-[#E69A5E] hover:bg-[#D48A4A] text-white px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[38px] shadow-sm hover:shadow text-center"
            >
              {t.newWork}
            </button>
          </div>
        </div>

        {/* Category Description & Custom Delete button if custom */}
        {category.type === 'custom' && (
          <div className="mb-4 bg-white/60 p-3 rounded-xl border border-[#E69A5E]/15 flex justify-between items-center text-xs">
            <span className="text-[#3E2A1F]/70 italic">
              {language === 'es' ? 'Categoría definida por el usuario' : 'User-defined category'}
            </span>
            {onDeleteCategory && (
              <button
                id="btn-delete-custom-category"
                onClick={handleDeleteCategoryClick}
                className="text-[10px] md:text-xs font-bold text-[#B95C2E] hover:underline bg-red-50 hover:bg-red-100/60 px-2 py-1 rounded min-h-[32px] cursor-pointer"
              >
                🗑️ {language === 'es' ? 'Eliminar Categoría' : 'Delete Category'}
              </button>
            )}
          </div>
        )}

        {/* Search Input Filter Field */}
        <div className="mb-4">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'es' ? 'Buscar trabajos por título...' : 'Search jobs by title...'}
              className="w-full text-xs md:text-sm pl-9 pr-8 py-2 bg-white border border-[#E69A5E]/20 rounded-xl text-[#3E2A1F] focus:outline-none focus:ring-2 focus:ring-[#E69A5E]/30 focus:border-[#E69A5E] font-medium shadow-2xs placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs cursor-pointer focus:outline-none"
              >
                ✖
              </button>
            )}
          </div>
        </div>

        {/* Directory/Files count statement */}
        <div className="mb-4 flex items-center justify-between text-xs px-1 font-semibold text-[#3E2A1F]/70">
          <span>{t.worksFolder}</span>
          <span className="bg-[#E69A5E]/10 text-[#B95C2E] px-2 py-0.5 rounded-full font-mono">
            {filteredFichas.length} {filteredFichas.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Worksheets list container */}
        <div className="space-y-3.5">
          {filteredFichas.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-[#E69A5E]/20 rounded-2xl py-12 text-center text-sm text-[#3E2A1F]/60">
              <span className="text-4xl block mb-2">📁</span>
              {t.noWorks}
            </div>
          ) : (
            filteredFichas
              .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
              .map((ficha) => (
                <div
                  id={`ficha-card-${ficha.id}`}
                  key={ficha.id}
                  onClick={() => onSelectFicha(ficha)}
                  className="w-full text-left bg-white hover:bg-[#FFFDF9] border border-[#E69A5E]/15 p-3.5 rounded-2xl shadow-xs hover:shadow-md transition-all flex gap-4 items-center group cursor-pointer"
                >
                  {/* Worksheet Photo Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FFF3E0] border border-[#E69A5E]/10 flex items-center justify-center shrink-0 shadow-inner">
                    {ficha.image ? (
                      <img
                        src={ficha.image}
                        alt={ficha.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-2xl">📝</span>
                    )}
                  </div>

                  {/* Worksheet details summary */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm md:text-base text-[#3E2A1F] truncate group-hover:text-[#E69A5E] transition-colors leading-snug">
                      {ficha.title}
                    </h3>
                    <p className="text-xs text-[#3E2A1F]/60 mt-1 flex items-center gap-1.5">
                      <span>📅 {t.createdOn}</span> 
                      <span className="font-semibold font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {new Date(ficha.dateCreated).toLocaleDateString()}
                      </span>
                    </p>
                    
                    {/* Run Date indicator if filled */}
                    {ficha.runDate && (
                      <p className="text-[11px] text-[#3E2A1F]/50 mt-0.5">
                        🧬 {t.runDateLabel} {ficha.runDate}
                      </p>
                    )}

                    {/* Integrated analyses indicators badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ficha.gelAnalysis && (
                        <span className="text-[9px] font-bold bg-[#E69A5E]/15 text-[#B95C2E] px-2 py-0.5 rounded-full border border-[#E69A5E]/10">
                          📊 {language === 'es' ? 'Gel Analizado' : 'Gel Analysed'}
                        </span>
                      )}
                      {ficha.countAnalysis && (
                        <span className="text-[9px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                          🦟 {language === 'es' ? 'Recuento' : 'Cell Count'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row Operations buttons */}
                  <div className="flex items-center gap-2">
                    {onDeleteFicha && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFichaToDelete(ficha);
                        }}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl hover:scale-105 transition-all text-sm flex items-center justify-center min-h-[38px] cursor-pointer"
                        title={language === 'es' ? 'Eliminar este trabajo' : 'Delete this job'}
                      >
                        🗑️
                      </button>
                    )}

                    {/* Forward arrow marker */}
                    <div className="text-[#E69A5E] opacity-60 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all text-lg pr-1">
                      ➡️
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <footer className="w-full max-w-2xl mx-auto text-center border-t border-[#E69A5E]/10 pt-4 mt-8 text-[11px] text-[#3E2A1F]/50">
        {t.institution1} • FFyB • FOUBA • CONICET
      </footer>

      {/* Reusable, safe Delete Worksheet Modal Overlay */}
      {fichaToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-[#A12312] flex items-center justify-center gap-1.5">
              <span>🗑️</span> {language === 'es' ? 'Eliminar Trabajo' : 'Delete Job'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {language === 'es' 
                ? `¿Estás seguro de que deseas eliminar permanentemente el trabajo "${fichaToDelete.title}"?`
                : `Are you sure you want to permanently delete the job "${fichaToDelete.title}"?`
              }
            </p>

            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFichaToDelete(null)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteFicha) {
                    onDeleteFicha(fichaToDelete.id);
                  }
                  setFichaToDelete(null);
                }}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm animate-pulse-subtle"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category deletion Custom safe overlay modal */}
      {showCategoryConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-[#A12312] flex items-center justify-center gap-1.5">
              <span>⚠️</span> {language === 'es' ? 'Eliminar Categoría' : 'Delete Category'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {language === 'es' 
                ? `¿Estás seguro de eliminar la categoría de usuario "${category.name}" y TODOS sus trabajos (${filteredFichas.length}) permanentemente?` 
                : `Are you sure you want to delete your custom category "${category.name}" and ALL its worksheets (${filteredFichas.length}) permanently?`
              }
            </p>

            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryConfirmDelete(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCategory) {
                    onDeleteCategory(category.id);
                  }
                  setShowCategoryConfirmDelete(false);
                }}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Description and Tips Modal Dialog */}
      {showInfoModal && (() => {
        const desc = getCategoryDescription(category.type, language);
        return (
          <div 
            id="modal-folder-category-description"
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <div 
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-[#E69A5E]/25 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-[#3E2A1F] dark:bg-slate-800 text-white flex items-center justify-between relative border-b border-[#E69A5E]/20">
                <div className="flex items-center gap-3">
                  <span className="text-3xl filter drop-shadow">{getCategoryEmoji(category)}</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black leading-tight drop-shadow-sm">
                      {desc.title}
                    </h3>
                    <p className="text-[11px] text-[#E69A5E] font-mono uppercase tracking-wide">
                      {language === 'es' ? 'Guía de Categoría • MiLabUBA' : 'Category Guide • MiLabUBA'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-close-folder-category-desc"
                  onClick={() => setShowInfoModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">
                {/* Summary Section / Para qué sirve */}
                <div className="bg-amber-500/10 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-400/35 dark:border-amber-700/40 space-y-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#B95C2E] dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <span>🎯</span>
                    <span>{language === 'es' ? '¿Para qué sirve esta categoría?' : 'What is this category for?'}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {desc.summary}
                  </p>
                </div>

                {/* Practical Tip Section / Tip de cómo hacerlo */}
                <div className="bg-emerald-500/10 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-400/35 dark:border-emerald-700/40 space-y-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <span>💡</span>
                    <span>{language === 'es' ? 'Tip de uso y cómo hacerlo:' : 'Usage tip & how to do it:'}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {desc.tip}
                  </p>
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#E69A5E] hover:bg-[#D48A4A] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {language === 'es' ? 'Entendido' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
