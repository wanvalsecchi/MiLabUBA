import React, { useState, useEffect } from 'react';
import { Category, Ficha, Language, UserPreferences } from '../types';
import { translations } from '../translations';
import ThemeToggle from './ThemeToggle';
import { SmartLogo } from './OfficialLogos';
import FeedbackModal from './FeedbackModal';
import { safeStorage } from '../storage';
import { getCategoryDescription } from '../categoryDescriptions';
import { QrModal } from './QrModal';
import { QrCode } from 'lucide-react';

interface CategoriesGridProps {
  language: Language;
  categories: Category[];
  fichas: Ficha[];
  onCreateCategory: (name: string) => void;
  onSelectCategory: (category: Category) => void;
  onOpenCredits: () => void;
  onSetLanguage: (lang: Language) => void;
  userPrefs: UserPreferences;
  onUpdateUserPrefs: (prefs: UserPreferences) => void;
  onImportData: (customCats: Category[], fichas: Ficha[]) => void;
}

export default function CategoriesGrid({
  language,
  categories,
  fichas,
  onCreateCategory,
  onSelectCategory,
  onOpenCredits,
  onSetLanguage,
  userPrefs,
  onUpdateUserPrefs,
  onImportData
}: CategoriesGridProps) {
  const t = translations[language];
  const [profileOpen, setProfileOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState(userPrefs.userName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userPrefs.avatar);
  const [savedLogos] = useState<{
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

  // Sharing states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [selectedCategoryForInfo, setSelectedCategoryForInfo] = useState<Category | null>(null);

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

  const handleExportData = () => {
    try {
      const customCats = categories.filter((c) => c.type === 'custom');
      const data = {
        customCategories: customCats,
        fichas: fichas
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milabuba_fichas_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export database", error);
      alert(language === 'es' ? 'Error al exportar los datos.' : 'Failed to export data.');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && (Array.isArray(parsed.fichas) || Array.isArray(parsed.customCategories))) {
          const importedCustomCats = Array.isArray(parsed.customCategories) ? parsed.customCategories : [];
          const importedFichas = Array.isArray(parsed.fichas) ? parsed.fichas : [];
          onImportData(importedCustomCats, importedFichas);
          setIsShareOpen(false);
        } else {
          alert(language === 'es' 
            ? 'Formato de archivo inválido. El JSON debe contener fichas.' 
            : 'Invalid file format. JSON must contain worksheets.'
          );
        }
      } catch (err) {
        alert(language === 'es' ? 'Error al procesar el archivo JSON.' : 'Error processing JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Custom iframe-safe Modal logic states
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState('');
  const [categoryCreationError, setCategoryCreationError] = useState<string | null>(null);

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

  useEffect(() => {
    setUsernameInput(userPrefs.userName);
    setAvatarPreview(userPrefs.avatar);
  }, [userPrefs]);

  const handleCreateCategoryClick = () => {
    setNewCategoryNameInput('');
    setCategoryCreationError(null);
    setIsCreatingCategory(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    onUpdateUserPrefs({
      ...userPrefs,
      userName: usernameInput.trim() || 'Researcher',
      avatar: avatarPreview
    });
    setProfileOpen(false);
  };

  // Helper to resolve Spanish/English name for default ones
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
        <svg className="h-[1.1em] w-[1.1em] inline-block align-text-bottom" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 12 L16 8.5 A7 7 0 1 0 16 15.5 Z" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="23" cy="12" r="1" opacity="0.6" />
        </svg>
      );
    }
    if (cat.type === 'rgv-analyzer') return '🌈';
    return '🧫';
  };

  const getCategoryColor = (cat: Category) => {
    if (cat.type === 'microscopy') return 'from-[#E69A5E] to-[#D48A4A]';
    if (cat.type === 'histology') return 'from-[#BE185D] to-[#EC4899]';
    if (cat.type === 'count') return 'from-[#1E3A8A] to-[#3B82F6]';
    if (cat.type === 'sds-page') return 'from-[#B95C2E] to-[#E69A5E]';
    if (cat.type === 'adn') return 'from-[#5D9C59] to-[#E69A5E]';
    if (cat.type === 'doi-analyzer') return 'from-[#8B5CF6] to-[#A78BFA]';
    if (cat.type === 'rgv-analyzer') return 'from-[#EC4899] to-[#EF4444]';
    if (cat.type === 'densitometria') return 'from-[#64748B] to-[#475569]';
    if (cat.type === 'zimografia') return 'from-[#0D9488] to-[#14B8A6]';
    return 'from-[#8C6A5C] to-[#E69A5E]';
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 py-6 px-4 md:px-8 select-none flex flex-col justify-between text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top dashboard control bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-[#E69A5E]/10 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <button
            id="profile-avatar-trigger"
            onClick={() => setProfileOpen(true)}
            className="w-12 h-12 rounded-full border-2 border-[#E69A5E] overflow-hidden bg-[#FFF3E0] flex items-center justify-center cursor-pointer hover:opacity-90 relative group overflow-hidden"
            title={t.editProfile}
          >
            {userPrefs.avatar ? (
              <img 
                src={userPrefs.avatar} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xl">👩‍🔬</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] text-white">✏️</span>
            </div>
          </button>
          <div>
            <p className="text-xs text-[#0F172A]/60">Buenos días / Good morning</p>
            <p className="font-bold text-sm text-[#0F172A] flex items-center gap-1">
              {userPrefs.userName} <span className="text-[#1E3A8A]">🔬</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* Share White Label Link Button */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
            title={language === 'es' ? 'Compartir e Instalar' : 'Share & Install'}
          >
            🔗 <span className="hidden sm:inline">{language === 'es' ? 'Compartir e Instalar' : 'Share & Install'}</span>
          </button>

          {/* Feedback and Survey Suggestion Button */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
            title={language === 'es' ? 'Sugerencias y Reportes' : 'Feedback & Suggestions'}
          >
            📬 <span className="hidden sm:inline">{language === 'es' ? 'Sugerencias' : 'Feedback'}</span>
          </button>

          <button
            id="btn-grid-credits"
            onClick={onOpenCredits}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold rounded-lg cursor-pointer transition-colors"
          >
            {t.creditsButton}
          </button>

          <ThemeToggle />

          {/* Language toggler */}
          <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onSetLanguage('es')}
              className={`px-2 py-1 text-[10px] md:text-xs rounded font-extrabold cursor-pointer transition-all ${
                language === 'es' ? 'bg-[#1E3A8A] text-white' : 'text-[#0F172A]/70'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => onSetLanguage('en')}
              className={`px-2 py-1 text-[10px] md:text-xs rounded font-extrabold cursor-pointer transition-all ${
                language === 'en' ? 'bg-[#1E3A8A] text-white' : 'text-[#0F172A]/70'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main categories selector heading */}
      <main className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
        <h2 className="text-2xl font-black text-[#3E2A1F] mb-6 flex items-center gap-2 tracking-tight">
          🗂️ {t.categories}
        </h2>

        {/* Categories Grid layout */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <div
              id={`cat-card-${cat.id}`}
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className={`h-44 bg-gradient-to-br ${getCategoryColor(
                cat
              )} text-white p-4 sm:p-5 rounded-2xl text-left flex flex-col justify-between shadow-md hover:shadow-lg active:scale-98 transition-all hover:-translate-y-0.5 border border-white/10 group relative overflow-hidden cursor-pointer select-none`}
            >
              {/* Abs reflection */}
              <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-300 pointer-events-none"></div>

              {/* Top Row: Emoji + Description Button */}
              <div className="flex items-center justify-between w-full z-10">
                <span className="text-3xl filter drop-shadow">
                  {getCategoryEmoji(cat)}
                </span>
                <button
                  type="button"
                  id={`btn-desc-${cat.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategoryForInfo(cat);
                  }}
                  className="bg-black/30 hover:bg-black/50 text-white px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold backdrop-blur-xs transition-all active:scale-90 flex items-center gap-1 border border-white/25 shadow-xs cursor-pointer"
                  title={language === 'es' ? 'Ver descripción y tips' : 'View description & tips'}
                >
                  <span>ℹ️</span>
                  <span>{language === 'es' ? 'Descripción' : 'Description'}</span>
                </button>
              </div>

              {/* Bottom Row: Name & Tag */}
              <div className="z-10 pt-2">
                <h3 className="font-extrabold text-sm sm:text-base md:text-lg leading-tight tracking-tight drop-shadow-sm group-hover:underline">
                  {getCategoryDisplayName(cat)}
                </h3>
                <p className="text-[10px] md:text-xs text-white/85 mt-1 font-mono uppercase tracking-wide flex items-center justify-between">
                  <span>{cat.type === 'custom' ? 'Custom' : 'Ficha'}</span>
                  <span className="text-xs opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all">➔</span>
                </p>
              </div>
            </div>
          ))}

          {/* New Category creation card */}
          <button
            id="btn-add-new-category"
            onClick={handleCreateCategoryClick}
            className="h-40 bg-white border-2 border-dashed border-[#E69A5E]/40 hover:border-[#E69A5E] text-[#B95C2E] p-5 rounded-2xl text-center flex flex-col justify-center items-center gap-3 hover:bg-[#FFFDF9] active:scale-98 transition-all cursor-pointer group shadow-xs"
          >
            <div className="text-3xl group-hover:scale-110 transition-transform duration-250">
              ➕
            </div>
            <div>
              <p className="font-bold text-sm md:text-base leading-tight">
                {t.newCategory}
              </p>
              <p className="text-[10px] text-[#3E2A1F]/50 mt-1 font-medium">
                localStorage
              </p>
            </div>
          </button>
        </div>
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-4xl mx-auto text-center border-t border-[#E69A5E]/10 pt-4 mt-8 text-[11px] text-[#3E2A1F]/50">
        {t.institution1} • FFyB • FOUBA • CONICET
      </footer>

      {/* Reusable, inline, safe Category Creation Modal Overlay */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-black text-[#3E2A1F] flex items-center justify-center gap-1.5">
              <span>➕</span> {t.newCategory}
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              {t.addCategoryPrompt}
            </p>
            <input
              type="text"
              value={newCategoryNameInput}
              onChange={(e) => {
                setNewCategoryNameInput(e.target.value);
                setCategoryCreationError(null);
              }}
              placeholder={language === 'es' ? 'Ej: Virología del Suelo' : 'e.g. Soil Virology'}
              className="w-full text-sm bg-white border border-[#E69A5E]/20 rounded-xl p-3 outline-none focus:border-[#E69A5E] font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = newCategoryNameInput.trim();
                  if (!trimmed) {
                    setCategoryCreationError(t.emptyCategoryErr);
                    return;
                  }
                  const dup = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
                  if (dup) {
                    setCategoryCreationError(t.duplicateCategoryErr);
                    return;
                  }
                  onCreateCategory(trimmed);
                  setIsCreatingCategory(false);
                }
              }}
            />
            
            {categoryCreationError && (
              <p className="text-xs font-bold text-rose-600 font-mono bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                ⚠️ {categoryCreationError}
              </p>
            )}

            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingCategory(false)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-all font-bold min-h-[40px] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = newCategoryNameInput.trim();
                  if (!trimmed) {
                    setCategoryCreationError(t.emptyCategoryErr);
                    return;
                  }
                  const dup = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
                  if (dup) {
                    setCategoryCreationError(t.duplicateCategoryErr);
                    return;
                  }
                  onCreateCategory(trimmed);
                  setIsCreatingCategory(false);
                }}
                className="text-xs bg-[#E69A5E] hover:bg-[#D48A4A] text-white px-5 py-2.5 rounded-xl transition-all font-black min-h-[40px] cursor-pointer shadow-sm"
              >
                {t.accept}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Editing Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-[#E69A5E]/30 rounded-2xl max-w-sm w-full p-6 shadow-xl relative text-center">
            <button
              onClick={() => setProfileOpen(false)}
              className="absolute top-3 right-3 text-lg p-1 hover:text-[#B95C2E]"
            >
              ❌
            </button>
            
            <h3 className="text-lg font-bold text-[#3E2A1F] mb-4">
              👩‍🔬 {t.editProfile}
            </h3>

            {/* Avatar customization */}
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="w-20 h-20 rounded-full border-2 border-[#E69A5E] overflow-hidden bg-[#FFF3E0] flex items-center justify-center relative">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl">👩‍🔬</span>
                )}
              </div>

              {/* Upload element */}
              <label className="text-xs bg-[#E69A5E]/10 hover:bg-[#E69A5E]/20 text-[#B95C2E] border border-[#E69A5E]/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors min-h-[36px] flex items-center">
                <span>📷 {t.selectAvatar}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Username input */}
            <div className="mb-6 text-left">
              <label className="block text-xs font-bold text-[#3E2A1F]/80 mb-1">
                {t.userNamePlaceholder}
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                maxLength={25}
                className="w-full p-2.5 border border-[#E69A5E]/30 rounded-xl bg-white text-sm outline-none focus:border-[#E69A5E] text-[#3E2A1F] font-bold"
                placeholder="Dra. Wanda Valsecchi"
              />
            </div>

            <button
              id="btn-save-profile"
              onClick={handleSaveProfile}
              className="w-full py-2 bg-[#E69A5E] hover:bg-[#D48A4A] text-white font-bold rounded-xl shadow-md min-h-[48px] cursor-pointer active:scale-98 transition-all"
            >
              💾 {t.saveProfile}
            </button>
          </div>
        </div>
      )}

      {/* Share Platform Info Modal Overlay */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFDF9] border border-emerald-500/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-left text-slate-800 max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-4">
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
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-[11px] leading-relaxed">
                <p className="font-bold text-slate-850 dark:text-gray-250 border-b border-slate-200/50 pb-1 flex items-center gap-1.5">
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
                  <p className="font-semibold text-slate-705 dark:text-slate-350">
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

              {/* Backups Export & Import Section */}
              <div className="pt-3.5 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  📁 {language === 'es' ? 'Transferencia de Trabajos (Backup)' : 'Transfer Worksheets'}
                </h4>
                <p className="text-[10px] text-gray-500 font-semibold leading-normal">
                  {language === 'es' 
                    ? '¿Cambiaste de computadora y no ves tus trabajos? Exporta todas tus fichas de laboratorio como un archivo descargable (.json) y súbelo en tu nueva PC.' 
                    : 'Switched computers and cannot see your jobs? Export all your laboratory worksheets as a JSON file, and import it on your other computer.'}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded-xl transition-all shadow-3xs hover:shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    📥 {language === 'es' ? 'Exportar Copia' : 'Export Backup'}
                  </button>

                  <label className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-xl transition-all shadow-3xs hover:shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 text-center">
                    📤 {language === 'es' ? 'Importar Copia' : 'Import Backup'}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
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

      {/* Category Description and Tips Modal Dialog */}
      {selectedCategoryForInfo && (() => {
        const desc = getCategoryDescription(selectedCategoryForInfo.type, language);
        return (
          <div 
            id="modal-category-description"
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedCategoryForInfo(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-[#E69A5E]/25 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-4 sm:p-5 bg-gradient-to-r ${getCategoryColor(selectedCategoryForInfo)} text-white flex items-center justify-between relative`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl filter drop-shadow">{getCategoryEmoji(selectedCategoryForInfo)}</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black leading-tight drop-shadow-sm">
                      {desc.title}
                    </h3>
                    <p className="text-[11px] text-white/85 font-mono uppercase tracking-wide">
                      {language === 'es' ? 'Guía de Categoría • MiLabUBA' : 'Category Guide • MiLabUBA'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-close-category-desc"
                  onClick={() => setSelectedCategoryForInfo(null)}
                  className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
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
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryForInfo(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {language === 'es' ? 'Cerrar' : 'Close'}
                </button>
                <button
                  type="button"
                  id="btn-open-category-from-modal"
                  onClick={() => {
                    const catToOpen = selectedCategoryForInfo;
                    setSelectedCategoryForInfo(null);
                    onSelectCategory(catToOpen);
                  }}
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#E69A5E] hover:bg-[#D48A4A] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>{language === 'es' ? 'Abrir Categoría' : 'Open Category'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Qr Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        language={language}
      />
    </div>
  );
}
