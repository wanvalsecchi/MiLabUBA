import { CategoryType, Language } from './types';

export interface CategoryDescriptionInfo {
  type: CategoryType;
  title: {
    es: string;
    en: string;
  };
  summary: {
    es: string;
    en: string;
  };
  tip: {
    es: string;
    en: string;
  };
}

export const categoryDescriptions: Record<CategoryType, CategoryDescriptionInfo> = {
  count: {
    type: 'count',
    title: {
      es: 'Contar (Células, UFC y UFP)',
      en: 'Count (Cells, CFU & PFU)'
    },
    summary: {
      es: 'Permite realizar recuentos de células por poblaciones o cuantificar colonias bacterianas (UFC) y fagos (UFP) en placas de cultivo con cálculo automático de concentraciones.',
      en: 'Perform population-based cell counts or quantify bacterial colonies (CFU) and plaques (PFU) on culture plates with automatic concentration calculation.'
    },
    tip: {
      es: 'En el modo UFC/UFP, ingresa el volumen sembrado (µl) y exponente de dilución para obtener la concentración exacta en UFC/ml. Puedes usar zoom y clic para marcar cada colonia con precisión.',
      en: 'In CFU/PFU mode, enter seeded volume (µl) and dilution exponent to get the exact concentration in CFU/ml. Use zoom and click to mark each colony precisely.'
    }
  },
  densitometria: {
    type: 'densitometria',
    title: {
      es: 'Densitometría (DOI / IOD)',
      en: 'Densitometry (DOI / IOD)'
    },
    summary: {
      es: 'Cuantifica la densidad óptica integrada (DOI/IOD) de bandas o manchas en geles y western blots para calcular la abundancia relativa o masa respecto a estándares de calibración.',
      en: 'Quantifies integrated optical density (IOD/DOI) of bands or spots in gels and western blots to calculate relative abundance or mass against calibration standards.'
    },
    tip: {
      es: 'Ajusta el rectángulo de fondo (background ROI) sobre una zona libre adyacente para restar el ruido antes de integrar los picos de intensidad.',
      en: 'Adjust the background ROI rectangle on an adjacent clear area to subtract background noise before integrating intensity peaks.'
    }
  },
  'sds-page': {
    type: 'sds-page',
    title: {
      es: 'PAGE (Electroforesis de Proteínas)',
      en: 'PAGE (Protein Electrophoresis)'
    },
    summary: {
      es: 'Determina los pesos moleculares (kDa) de proteínas en geles de poliacrilamida (SDS-PAGE) mediante curvas de regresión lineal (Rf vs log(PM)) a partir de marcadores estándar.',
      en: 'Determines protein molecular weights (kDa) in polyacrylamide gels (SDS-PAGE) using standard linear regression curves (Rf vs log(MW)).'
    },
    tip: {
      es: 'Marca con exactitud la línea del pocillo de siembra (origen) y el frente de corrida del colorante para una normalización perfecta del valor de Rf.',
      en: 'Accurately mark the loading well line (origin) and the dye front line for perfect Rf normalization.'
    }
  },
  zimografia: {
    type: 'zimografia',
    title: {
      es: 'Zimografía (Actividad Enzimática)',
      en: 'Zymography (Enzymatic Activity)'
    },
    summary: {
      es: 'Mide la actividad de proteasas (como gelatinasas/MMP) analizando la degradación de sustrato en bandas claras sobre geles teñidos con azul de Coomassie.',
      en: 'Measures protease activity (such as MMPs/gelatinases) by analyzing substrate digestion clear bands on Coomassie-stained gels.'
    },
    tip: {
      es: 'Activa la opción de escala de grises invertida para transformar las zonas transparentes de lisis en picos positivos integrables con DOI.',
      en: 'Enable inverted grayscale to convert transparent lysis zones into quantifiable positive peaks with DOI integration.'
    }
  },
  adn: {
    type: 'adn',
    title: {
      es: 'ADN (Electroforesis en Agarosa)',
      en: 'DNA (Agarose Electrophoresis)'
    },
    summary: {
      es: 'Estima el tamaño en pares de bases (pb) de fragmentos de ADN o ARN corridos en geles de agarosa interpolando la movilidad electroforética (Rf) frente a escaleras moleculares.',
      en: 'Estimates base-pair size (bp) of DNA/RNA fragments run on agarose gels by interpolating electrophoretic mobility (Rf) against molecular ladders.'
    },
    tip: {
      es: 'Para máxima exactitud, selecciona las bandas marcadoras estándar que se encuentren inmediatamente arriba y abajo de tu banda problema.',
      en: 'For highest accuracy, select the standard ladder bands immediately above and below your sample band.'
    }
  },
  'doi-analyzer': {
    type: 'doi-analyzer',
    title: {
      es: 'Colorimetría RGV',
      en: 'RGV Colorimetry'
    },
    summary: {
      es: 'Evalúa la densidad cromática e intensidad promedio en canales Rojo, Verde, Azul o escala de grises para ensayos colorimétricos, eluatos, tiras reactivas o tinciones.',
      en: 'Evaluates chromatic density and mean intensity across Red, Green, Blue channels or grayscale for spot assays, test strips, eluates or stains.'
    },
    tip: {
      es: 'Selecciona una región de blanco de referencia en la misma imagen para compensar variaciones de iluminación o fondo del soporte.',
      en: 'Select a blank reference region on the same image to compensate for illumination or background variations.'
    }
  },
  microscopy: {
    type: 'microscopy',
    title: {
      es: 'Microscopía',
      en: 'Microscopy'
    },
    summary: {
      es: 'Documenta y cataloga microfotografías ópticas o de fluorescencia, permitiendo calibrar la escala espacial (µm/px), medir estructuras y rotular detalles morfológicos.',
      en: 'Documents and catalogs brightfield or fluorescence micrographs, allowing spatial scale calibration (µm/px), morphological measurements and annotations.'
    },
    tip: {
      es: 'Fotografía un micrómetro patrón con el mismo objetivo para calibrar la relación píxel/µm y obtener mediciones métricas directas en tus fichas.',
      en: 'Capture a stage micrometer with the same objective to calibrate pixel/µm ratio and get direct metric measurements on your cards.'
    }
  },
  histology: {
    type: 'histology',
    title: {
      es: 'Histología',
      en: 'Histology'
    },
    summary: {
      es: 'Archiva y analiza cortes de tejidos teñidos (H&E, PAS, Tricrómico, etc.), facilitando la descripción histopatológica, identificación de estructuras y registro de aumentos.',
      en: 'Archives and analyzes stained tissue sections (H&E, PAS, Trichrome), facilitating histopathological description, structure identification and magnification tracking.'
    },
    tip: {
      es: 'Registra el tipo de fijador, tinción y objetivo en los campos de observaciones para estandarizar tus informes de laboratorio.',
      en: 'Record fixative type, staining and objective in observation fields to standardize your laboratory reports.'
    }
  },
  'rgv-analyzer': {
    type: 'rgv-analyzer',
    title: {
      es: 'MERGE Multicanal',
      en: 'MERGE Multi-Channel'
    },
    summary: {
      es: 'Superpone y combina imágenes individuales de distintos canales de fluorescencia (DAPI/Azul, GFP/Verde, RFP/Rojo, etc.) o campo claro en una sola imagen compuesta multicanal.',
      en: 'Overlays and merges individual fluorescence channel captures (DAPI/Blue, GFP/Green, RFP/Red) or brightfield into a single multi-channel composite image.'
    },
    tip: {
      es: 'Utiliza los controles de micro-desplazamiento (Offset X/Y) para corregir aberraciones cromáticas o pequeños movimientos entre tomas antes de exportar.',
      en: 'Use the micro-offset controls (Offset X/Y) to correct chromatic shifts or minor movements between exposures before exporting.'
    }
  },
  custom: {
    type: 'custom',
    title: {
      es: 'Categoría Personalizada',
      en: 'Custom Category'
    },
    summary: {
      es: 'Espacio de trabajo configurable para registrar ensayos especiales, protocolos personalizados o análisis experimentales no contemplados en las categorías estándar.',
      en: 'Configurable workspace to record special assays, custom protocols or experimental workflows not covered in standard categories.'
    },
    tip: {
      es: 'Puedes crear múltiples categorías personalizadas y asignarles nombres específicos para organizar tus proyectos de investigación.',
      en: 'You can create multiple custom categories and assign specific names to organize your research projects.'
    }
  }
};

export function getCategoryDescription(type: CategoryType, language: Language) {
  const desc = categoryDescriptions[type] || categoryDescriptions.custom;
  return {
    title: desc.title[language] || desc.title.es,
    summary: desc.summary[language] || desc.summary.es,
    tip: desc.tip[language] || desc.tip.es
  };
}
