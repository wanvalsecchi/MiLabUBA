/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Category, Ficha, FichaFieldValues, Language, UserPreferences, GelAnalysis, CountAnalysis, DoiAnalysis } from './types';
import { getAllFichas, saveFicha, deleteFicha } from './db';
import { safeStorage } from './storage';

import Splash from './components/Splash';
import CreditsModal from './components/CreditsModal';
import CategoriesGrid from './components/CategoriesGrid';
import JobsFolder from './components/JobsFolder';
import FichaDetail from './components/FichaDetail';
import FichaForm from './components/FichaForm';
import GelAnalyzer from './components/GelAnalyzer';
import CellCounter from './components/CellCounter';
import DoiAnalyzer from './components/DoiAnalyzer';
import MultiChannelCombiner from './components/MultiChannelCombiner';

export default function App() {
  // Navigation State
  const [view, setView] = useState<'splash' | 'categories' | 'folder' | 'fiche_detail' | 'fiche_form' | 'gel_analyzer' | 'cell_counter' | 'doi_analyzer' | 'multichannel_combiner'>('splash');
  
  // Modals
  const [creditsOpen, setCreditsOpen] = useState(false);

  // Selected Entities pointers
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null);
  const [editingFicha, setEditingFicha] = useState<Ficha | undefined>(undefined);

  // Persistent user preferences setting loaded from localStorage
  const [language, setLanguage] = useState<Language>('es');
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    language: 'es',
    avatar: null,
    userName: 'Investigador UBA'
  });

  // DB datasets
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  // Base standard static categories
  const baseCategories: Category[] = [
    { id: 'count', name: 'Contar', type: 'count' },
    { id: 'densitometria', name: 'Densitometría', type: 'densitometria' },
    { id: 'sds-page', name: 'PAGE', type: 'sds-page' },
    { id: 'zimografia', name: 'Zimografía', type: 'zimografia' },
    { id: 'adn', name: 'ADN', type: 'adn' },
    { id: 'doi-analyzer', name: 'Colorimetría RGV', type: 'doi-analyzer' },
    { id: 'microscopy', name: 'Microscopía', type: 'microscopy' },
    { id: 'histology', name: 'Histología', type: 'histology' },
    { id: 'rgv-analyzer', name: 'MERGE Multicanal', type: 'rgv-analyzer' }
  ];

  // Load datasets on startup mount
  useEffect(() => {
    // 0. Theme settings - Always force light theme
    document.documentElement.classList.remove('dark');
    safeStorage.setItem('milabuba_theme', 'light');

    // 1. Language settings
    const storedLang = safeStorage.getItem('milabuba_language') as Language;
    if (storedLang === 'es' || storedLang === 'en') {
      setLanguage(storedLang);
    }

    // 2. Profile prefs
    const storedPrefsStr = safeStorage.getItem('milabuba_user_prefs');
    if (storedPrefsStr) {
      try {
        const parsed = JSON.parse(storedPrefsStr);
        setUserPrefs(parsed);
        if (parsed.language) {
          setLanguage(parsed.language);
        }
      } catch (err) {
        console.error('Error loading preferences from localStorage:', err);
      }
    }

    // 3. User Custom categories
    const storedCatsStr = safeStorage.getItem('milabuba_custom_categories');
    if (storedCatsStr) {
      try {
        setCustomCategories(JSON.parse(storedCatsStr));
      } catch (err) {
        console.error('Error loading custom categories:', err);
      }
    }

    // 4. Fetch worksheets from IndexedDB
    const loadFichas = async () => {
      try {
        const list = await getAllFichas();
        setFichas(list);
      } catch (err) {
        console.error('Failed to boot IndexedDB:', err);
      }
    };
    loadFichas();
  }, []);

  // Sync state helpers
  const handleUpdateUserPrefs = (newPrefs: UserPreferences) => {
    setUserPrefs(newPrefs);
    setLanguage(newPrefs.language);
    safeStorage.setItem('milabuba_user_prefs', JSON.stringify(newPrefs));
    safeStorage.setItem('milabuba_language', newPrefs.language);
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    safeStorage.setItem('milabuba_language', lang);
    const updatedPrefs = { ...userPrefs, language: lang };
    setUserPrefs(updatedPrefs);
    safeStorage.setItem('milabuba_user_prefs', JSON.stringify(updatedPrefs));
  };

  // Create user category custom
  const handleCreateCategory = (name: string) => {
    const newCat: Category = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      type: 'custom'
    };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    safeStorage.setItem('milabuba_custom_categories', JSON.stringify(updated));
  };

  // Delete custom category
  const handleDeleteCategory = async (id: string) => {
    const updated = customCategories.filter((c) => c.id !== id);
    setCustomCategories(updated);
    safeStorage.setItem('milabuba_custom_categories', JSON.stringify(updated));

    // Clear all children worksheets inside too
    const children = fichas.filter((f) => f.categoryId === id);
    for (const child of children) {
      await deleteFicha(child.id);
    }
    const refreshed = await getAllFichas();
    setFichas(refreshed);
    setView('categories');
    setSelectedCategory(null);
  };

  // Save/Update sheet details
  const handleSaveFicha = async (
    title: string,
    runDate: string,
    image: string | undefined,
    fields: FichaFieldValues,
    extraImages?: string[]
  ) => {
    if (!selectedCategory) return;

    if (editingFicha) {
      // Edit mode
      const updatedFicha: Ficha = {
        ...editingFicha,
        title,
        runDate,
        image,
        extraImages,
        fields: {
          ...fields,
          title,
          runDate
        }
      };

      await saveFicha(updatedFicha);
      setEditingFicha(undefined);
      setSelectedFicha(updatedFicha);
      setView('fiche_detail');
    } else {
      // Create mode
      const newFicha: Ficha = {
        id: Math.random().toString(36).substring(2, 9),
        categoryId: selectedCategory.id,
        title,
        dateCreated: new Date().toISOString(),
        runDate,
        image,
        extraImages,
        fields: {
          ...fields,
          title,
          runDate
        }
      };

      await saveFicha(newFicha);
      setSelectedFicha(newFicha);
      setView('fiche_detail');
    }

    // Reload files
    const list = await getAllFichas();
    setFichas(list);
  };

  // Delete sheet
  const handleDeleteFicha = async (id: string) => {
    await deleteFicha(id);
    const refreshed = await getAllFichas();
    setFichas(refreshed);
    setSelectedFicha(null);
    setView('folder');
  };

  // Duplicate sheet (making exact copy and suffix title with " - Copia")
  const handleDuplicateFicha = async (fichaToDup: Ficha, useCurrentDate: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const duplicatedTitle = `${fichaToDup.title} - ${language === 'es' ? 'Copia' : 'Copy'}`;
    const duplicatedRunDate = useCurrentDate ? todayStr : fichaToDup.runDate;

    const duplicated: Ficha = {
      ...fichaToDup,
      id: Math.random().toString(36).substring(2, 9),
      title: duplicatedTitle,
      dateCreated: new Date().toISOString(),
      runDate: duplicatedRunDate,
      fields: {
        ...fichaToDup.fields,
        title: duplicatedTitle,
        runDate: duplicatedRunDate
      }
    };

    await saveFicha(duplicated);
    const list = await getAllFichas();
    setFichas(list);
    setView('folder');
    setSelectedFicha(null);
  };

  // Save analytical configurations
  const handleSaveGelAnalysis = async (gelAnalysis: GelAnalysis) => {
    if (!selectedFicha) return;
    const updated: Ficha = {
      ...selectedFicha,
      gelAnalysis
    };
    await saveFicha(updated);
    setSelectedFicha(updated);
    
    const list = await getAllFichas();
    setFichas(list);
    setView('fiche_detail');
  };

  const handleSaveCountAnalysis = async (countAnalysis: CountAnalysis, updatedImage?: string) => {
    if (!selectedFicha) return;
    const updated: Ficha = {
      ...selectedFicha,
      countAnalysis
    };
    if (updatedImage) {
      updated.image = updatedImage;
    }
    await saveFicha(updated);
    setSelectedFicha(updated);

    const list = await getAllFichas();
    setFichas(list);

    setView('fiche_detail');
  };

  const handleSaveDoiAnalysis = async (doiAnalysis: DoiAnalysis) => {
    if (!selectedFicha) return;
    const updated: Ficha = {
      ...selectedFicha,
      doiAnalysis
    };
    await saveFicha(updated);
    setSelectedFicha(updated);

    const list = await getAllFichas();
    setFichas(list);

    setView('fiche_detail');
  };

  const handleSaveMultichannelAnalysis = async (
    fichaId: string,
    mergedImageSrc: string,
    legendData: any,
    updatedFields?: { title?: string; runDate?: string; sampleType?: string; description?: string }
  ) => {
    if (!selectedFicha) return;
    const updated: Ficha = {
      ...selectedFicha,
      title: updatedFields?.title || selectedFicha.title,
      runDate: updatedFields?.runDate || selectedFicha.runDate,
      image: mergedImageSrc,
      fields: {
        ...selectedFicha.fields,
        title: updatedFields?.title || selectedFicha.fields?.title || selectedFicha.title,
        runDate: updatedFields?.runDate || selectedFicha.fields?.runDate || selectedFicha.runDate,
        sampleType: updatedFields?.sampleType || selectedFicha.fields?.sampleType || '',
        description: updatedFields?.description || selectedFicha.fields?.description || ''
      },
      observations: updatedFields?.description || selectedFicha.observations || ''
    };
    await saveFicha(updated);
    setSelectedFicha(updated);

    const list = await getAllFichas();
    setFichas(list);
  };

  const handleImportData = async (importedCustomCategories: Category[], importedFichas: Ficha[]) => {
    try {
      // 1. Merge or overwrite custom categories
      const currentCustom = [...customCategories];
      importedCustomCategories.forEach((newCat) => {
        if (!currentCustom.some((c) => c.id === newCat.id)) {
          currentCustom.push(newCat);
        }
      });
      setCustomCategories(currentCustom);
      safeStorage.setItem('milabuba_custom_categories', JSON.stringify(currentCustom));

      // 2. Save all imported fichas to IndexedDB
      for (const f of importedFichas) {
        await saveFicha(f);
      }

      // 3. Reload from IndexedDB
      const refreshed = await getAllFichas();
      setFichas(refreshed);

      alert(language === 'es' ? '¡Base de datos importada con éxito!' : 'Database imported successfully!');
    } catch (err) {
      console.error('Database import failed', err);
      alert(language === 'es' ? 'Error al importar los datos. Verifica el formato del archivo.' : 'Failed to import. Check file format.');
    }
  };

  // Merge base categories + users custom categories
  const allCategories = [...baseCategories, ...customCategories];

  return (
    <div id="milabuba-root" className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 select-none text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Splash welcoming window */}
      {view === 'splash' && (
        <Splash
          language={language}
          onSetLanguage={handleSetLanguage}
          onStart={() => setView('categories')}
          onOpenCredits={() => setCreditsOpen(true)}
        />
      )}

      {/* 2. Main Categories Grid selector */}
      {view === 'categories' && (
        <CategoriesGrid
          language={language}
          categories={allCategories}
          fichas={fichas}
          onCreateCategory={handleCreateCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setView('folder');
          }}
          onOpenCredits={() => setCreditsOpen(true)}
          onSetLanguage={handleSetLanguage}
          userPrefs={userPrefs}
          onUpdateUserPrefs={handleUpdateUserPrefs}
          onImportData={handleImportData}
        />
      )}

      {/* 3. Works Folder listings directory */}
      {view === 'folder' && selectedCategory && (
        <JobsFolder
          language={language}
          category={selectedCategory}
          fichas={fichas}
          onSelectFicha={(f) => {
            setSelectedFicha(f);
            setView('fiche_detail');
          }}
          onNewFichaClick={async () => {
            if (selectedCategory && selectedCategory.type === 'count') {
              const existingCounts = fichas.filter(f => f.categoryId === selectedCategory.id);
              const countNum = existingCounts.length + 1;
              const title = language === 'es' ? `Recuento ${countNum}` : `Count ${countNum}`;
              const runDate = new Date().toISOString().split('T')[0];
              const newFicha: Ficha = {
                id: Math.random().toString(36).substring(2, 9),
                categoryId: selectedCategory.id,
                title,
                dateCreated: new Date().toISOString(),
                runDate,
                fields: {
                  title,
                  runDate
                }
              };
              await saveFicha(newFicha);
              const list = await getAllFichas();
              setFichas(list);
              setSelectedFicha(newFicha);
              setView('cell_counter');
            } else if (selectedCategory && selectedCategory.type === 'rgv-analyzer') {
              const existingRgv = fichas.filter(f => f.categoryId === selectedCategory.id);
              const rgvNum = existingRgv.length + 1;
              const title = language === 'es' ? `Combinación ${rgvNum}` : `Combination ${rgvNum}`;
              const runDate = new Date().toISOString().split('T')[0];
              const newFicha: Ficha = {
                id: Math.random().toString(36).substring(2, 9),
                categoryId: selectedCategory.id,
                title,
                dateCreated: new Date().toISOString(),
                runDate,
                fields: {
                  title,
                  runDate,
                  sampleType: '',
                  description: ''
                }
              };
              await saveFicha(newFicha);
              const list = await getAllFichas();
              setFichas(list);
              setSelectedFicha(newFicha);
              setView('multichannel_combiner');
            } else {
              setEditingFicha(undefined);
              setView('fiche_form');
            }
          }}
          onBack={() => {
            setSelectedCategory(null);
            setView('categories');
          }}
          onDeleteCategory={handleDeleteCategory}
          onDeleteFicha={handleDeleteFicha}
        />
      )}

      {/* 4. Worksheet metadata file Form */}
      {view === 'fiche_form' && selectedCategory && (
        <FichaForm
          language={language}
          category={selectedCategory}
          existingFicha={editingFicha}
          onSave={handleSaveFicha}
          onCancel={() => {
            setEditingFicha(undefined);
            if (editingFicha) {
              setView('fiche_detail');
            } else {
              setView('folder');
            }
          }}
        />
      )}

      {/* 5. Sheet Profiles Details view */}
      {view === 'fiche_detail' && selectedCategory && selectedFicha && (
        <FichaDetail
          language={language}
          category={selectedCategory}
          ficha={selectedFicha}
          onBack={() => {
            setSelectedFicha(null);
            setView('folder');
          }}
          onEdit={() => {
            setEditingFicha(selectedFicha);
            setView('fiche_form');
          }}
          onDelete={handleDeleteFicha}
          onDuplicate={handleDuplicateFicha}
          onAnalyzeGel={() => setView('gel_analyzer')}
          onCountCells={() => setView('cell_counter')}
          onAnalyzeDoi={() => setView('doi_analyzer')}
          onCombineChannels={() => setView('multichannel_combiner')}
        />
      )}

      {/* 6. Electroforesis Gel Analyzer */}
      {view === 'gel_analyzer' && selectedFicha && (
        <GelAnalyzer
          language={language}
          ficha={selectedFicha}
          onSaveAnalysis={handleSaveGelAnalysis}
          onBack={() => setView('fiche_detail')}
        />
      )}

      {/* 7. Manual cell assists counter */}
      {view === 'cell_counter' && selectedFicha && (
        <CellCounter
          language={language}
          ficha={selectedFicha}
          onSaveAnalysis={handleSaveCountAnalysis}
          onBack={() => {
            setView('fiche_detail');
          }}
        />
      )}

      {/* 8. Integrated Optical Intensity Doi analyzer */}
      {view === 'doi_analyzer' && selectedFicha && (
        <DoiAnalyzer
          language={language}
          ficha={selectedFicha}
          categoryType={selectedCategory?.type}
          onSaveAnalysis={handleSaveDoiAnalysis}
          onBack={() => {
            setView('fiche_detail');
          }}
        />
      )}

      {/* 9. Specialized Fluorescence Multi-Channel Combiner */}
      {view === 'multichannel_combiner' && selectedFicha && (
        <MultiChannelCombiner
          language={language}
          ficha={selectedFicha}
          onSaveAnalysis={handleSaveMultichannelAnalysis}
          onBack={() => {
            setView('fiche_detail');
          }}
        />
      )}

      {/* Credits Dialog modal overlay */}
      {creditsOpen && (
        <CreditsModal
          language={language}
          onClose={() => setCreditsOpen(false)}
        />
      )}
    </div>
  );
}
