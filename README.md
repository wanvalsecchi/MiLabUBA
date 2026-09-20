# MiLabUBA — Quantitative Bioimage Analysis Platform for biomedical and biochemical research and higher education

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22851930.svg)](https://doi.org/10.5281/zenodo.22851930)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange.svg)](https://web.dev/progressive-web-apps/)

🌐 **[Versión en Español (Spanish version)](./README_es.md)**

**MiLabUBA** is an interactive scientific software and high-performance Progressive Web Application (PWA) designed for biomedical and biochemical research and university teaching. It enables on-site image acquisition, geometric region-of-interest (ROI) segmentation, and quantitative bioimage analysis without requiring continuous internet connectivity, alongside persistent experiment logbooks and automated PDF reporting.

---

## 🔬 Scientific Modules & Core Capabilities

### 1. Gel Densitometry (SDS-PAGE / Agarose / Western Blot)
- **Geometric Region of Interest (ROI) Segmentation:** Adaptive multi-shape boundary selection (ellipses, rectangles, trapezoids, triangles, and rhombuses) with rotation and bidirectional dimension fine-tuning.
- **Color Channel Decomposition:** Grayscale luminance extraction or selective inspection through Red, Green, or Blue channels.
- **Optical Quantification:** Automatic computation of Integrated Optical Density (IOD), Mean Pixel Intensity, and Geometric Pixel Area.
- **Background Normalization:** Localized background subtraction with blank controls.
- **Standard Calibration Curves:** Linear regression modeling using known standards for automated unknown sample concentration interpolation.

### 2. Zymography Analysis
- Enzymatic quantification on substrate-embedded gels (gelatin, casein).
- High-contrast detection of digestion clearance bands (*light-on-dark bands*), substrate background normalization, and total enzymatic activity computation.

### 3. RGV Colorimetry
- Quantitative absorbance and optical density analysis on culture plates, microtiter wells, and colorimetric chemical assays.
- Real-time aperture radius slider with dynamic batch recalculation across all reference and unknown reaction wells.

### 4. Cell Counting & Microscopy
- Manual differential cell counting grid over microphotographs with multiple marker types (e.g., live vs. dead cell viability determination).
- Automatic calculation of cell density per optical field and overall percentage viability.

### 5. Laboratory Records & Report Generation
- Client-side persistent storage (IndexedDB / LocalStorage) of protocols, metadata, dates, and experimental observations.
- Export of comprehensive PDF laboratory reports featuring calibrated regression charts, data tables, sample details, and visual ROI overlays.

---

## ⚙️ Architecture, Performance & Privacy

- **100% Client-Side Processing:** All pixel-level matrix operations, canvas 2D transformations, and bio-statistical regressions execute directly on the user device's local processor. No biological or confidential research images are uploaded to external servers, ensuring complete data privacy, HIPAA/GDPR-compliant security, and full offline usability (*offline-first*).
- **Technology Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Progressive Web App (PWA):** Equipped with a dedicated Service Worker caching strategy and web app manifest for installation across desktop (Windows, macOS, Linux) and mobile (Android, iOS) environments.

---

## 🚀 Installation & Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/wandafouba/milabuba.git
   cd milabuba
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## 🏛️ Academic Citation

If you use this software in your research, academic thesis, or laboratory coursework, please cite it as:

> **Valsecchi, WM.** (2026). *MiLabUBA — Quantitative Bioimage Analysis Platform for biomedical and biochemical research and higher education*. Zenodo. https://doi.org/10.5281/zenodo.22851930

---

## 📜 License & Copyright
Copyright (c) 2026 Wanda M. Valsecchi. All rights reserved under the MIT License.
