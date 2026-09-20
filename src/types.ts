export type CategoryType = 'microscopy' | 'count' | 'sds-page' | 'adn' | 'doi-analyzer' | 'rgv-analyzer' | 'custom' | 'histology' | 'densitometria' | 'zimografia';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
}

export interface FichaFieldValues {
  // Common
  title: string;
  runDate: string;
  
  // Microscopy
  microorganismType?: string;
  stainAffinity?: string; // Gram +, Gram -, no aplica, otra, AAR
  stainAffinityOther?: string;
  morphology?: string;    // coco, bacilo, cocobacilo, espirilo, filamentoso, otra
  morphologies?: string[]; // Multiple morphologies present
  morphologyOther?: string;
  grouping?: string;      // aislado, diplo, estrepto, estafilo, tetrada, otra
  groupingOther?: string;
  magnification?: string; // aumento (eg 100x)
  coloration?: string;    // Ziehl-Neelsen, Giemsa, Gram, otra, no aplica
  colorationOther?: string;

  // Cultivation Information
  cultureSupport?: string; // liquido, semi-solido, solido
  cultureMedium?: string;  // user typing text
  selectiveAgent?: string; // user typing text/antibiotic
  temperature?: string;    // temperature text
  incubationTime?: string; // incubation time text
  atmosphericConditions?: string; // atmospheric text

  // Macroscopic Information
  colonySize?: string;         // <1 mm, 1mm, 2 mm, >=3 mm
  colonyShape?: string;        // circular, fusiforme, rizoide, filamentosa, irregular
  colonyTransparency?: string; // opaca, transparente
  colonyBrightness?: string;   // sin brillo, brillante
  colonyColor?: string;        // text typing
  colonyTexture?: string;      // lisa, rugosa
  colonyConsistency?: string;  // dura, suave, mucoide
  colonyGrowth?: string;       // penetra agar, plana, elevada, otra
  colonyGrowthOther?: string;
  
  // SDS-PAGE o ADN
  sampleType?: string;
  approxMw?: string;      // Peso molecular aprox
  gelPercentage?: string; // Porcentaje de gel / agarosa
  glassThickness?: string;// Grosor del vidrio
  voltage?: string;
  amperage?: string;
  runTime?: string;       // Tiempo de corrida
  fragmentSize?: string;  // Tamaño fragmentos (pb) for ADN
  agarosePercentage?: string; // For ADN
  
  // Custom
  description?: string;

  // Histology SPECIFIC FIELDS
  specimenType?: string;
  specimenTypeOther?: string;
  organTissue?: string;
  organTissueOther?: string;
  texture?: string;
  textureOther?: string;

  // PROCESAMIENTO HISTOLÓGICO
  fixation?: string;
  fixationOther?: string;
  fixationTime?: string;
  inclusion?: string;
  inclusionOther?: string;
  sectioning?: string;
  sectioningOther?: string;
  sectionThickness?: string;
  mainStain?: string;
  mainStainOther?: string;

  // CONDICIONES DE CULTIVO (si aplica)
  histoCultureType?: string;
  histoCultureTypeOther?: string;
  histoCellLine?: string;
  histoCultureMedium?: string;
  histoCultureMediumOther?: string;
  histoTreatment?: string;

  // HALLAZGOS MICROSCÓPICOS (DESCRIPTIVOS)
  histoCellMorphology?: string;
  histoCellMorphologyOther?: string;
  histoStainingPattern?: string;
  histoStainingPatternOther?: string;
  histoNucleus?: string;
  histoCytoplasm?: string;
  histoMembrane?: string;
  
  // Textarea general
  observations?: string;
}

export interface MarkerBand {
  id: string;
  type: 'marker' | 'sample';
  y: number; // Y position relative to canvas height
  rf: number;
  mw?: number; // actual MW in kDa or bp
  predictedMw?: number; // calculated MW
  label: string;
  xStart?: number;
  xEnd?: number;
  
  // Concentration Estimation fields
  doi?: number; // Integrated Optical Density (sum of inverted pixel values)
  concentration?: number; // known standard concentration (mg/ml, etc.)
  estimatedConcentration?: number; // estimated concentration from curve or rule-of-three
  isStandardForConc?: boolean; // whether this is a reference standard band for concentration
}

export interface GelAnalysis {
  analysisDate: string;
  equation: string;
  r2: number;
  frenteY: number; // Y coordinate of front (0 to 1)
  pocilloY: number; // Y coordinate of well (0 to 1)
  markers: MarkerBand[];
}

export interface CellCountMarker {
  id: string;
  x: number; // coordinate fraction (0 to 1)
  y: number; // coordinate fraction (0 to 1)
  type: string; // classification name eg "Células totales", "Infectadas"
  color: string; // marker color
}

export interface CountAnalysis {
  analysisDate: string;
  markers: CellCountMarker[];
  counts: Record<string, number>;
  predefinedRatios?: Array<{ label: string; value: number }>;
  customRatios?: Array<{ typeA: string; typeB: string; value: number }>;
  isUfcApp?: boolean;
  seededVolume?: number; // in ul
  dilutionExponent?: number; // x in 10^-x
  calculatedConcentration?: number; // UFC/ml or UFP/ml
}

export interface DoiZone {
  id: string;
  type: 'standard' | 'sample' | 'background';
  x: number; // fraction 0 to 1
  y: number; // fraction 0 to 1
  radius: number; // spot radius in px
  radiusX?: number; // horizontal radius in px
  radiusY?: number; // vertical radius in px
  shape?: 'ellipse' | 'rectangle' | 'trapezoid' | 'triangle' | 'rhombus';
  width?: number;
  height?: number;
  rotation?: number; // rotation in degrees
  baseTop?: number;
  baseBottom?: number;
  base?: number;
  diagMajor?: number;
  diagMinor?: number;
  intensity: number; // integrated optical density (computed)
  area?: number; // geometric area (computed)
  meanIntensity?: number; // average pixel value within the shape (computed)
  totalActivity?: number; // sum of pixel values within the shape (computed)
  concentration?: number; // entered known concentration of standard
  estimatedConcentration?: number; // estimated concentration for samples
  label: string;
}

export interface DoiAnalysis {
  analysisDate: string;
  method: 'regression' | 'ratio';
  equation?: string;
  r2?: number;
  zones: DoiZone[];
  controlZoneId?: string | null;
  customRatios?: { id: string; numId: string; denId: string }[];
  zimoBgPixel?: number | null;
}

export interface Ficha {
  id: string;
  categoryId: string; // references Category.id
  title: string;
  dateCreated: string;
  runDate: string;
  image?: string; // Base64 encoded or object URL
  extraImages?: string[]; // Additional base64 encoded images to store and export in PDF
  fields: FichaFieldValues;
  gelAnalysis?: GelAnalysis;
  countAnalysis?: CountAnalysis;
  doiAnalysis?: DoiAnalysis;
  investigator?: string;
  comments?: string;
}

export type Language = 'es' | 'en';

export interface UserPreferences {
  language: Language;
  avatar: string | null; // Base64 avatar image string
  userName: string;
}
