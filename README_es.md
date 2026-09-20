# MiLabUBA — Quantitative Bioimage Analysis Platform for biomedical and biochemical research and higher education

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22851930.svg)](https://doi.org/10.5281/zenodo.22851930)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange.svg)](https://web.dev/progressive-web-apps/)

🌐 **[Read this documentation in English](./README.md)**

**MiLabUBA** es un software científico interactivo y aplicación web progresiva (PWA) de alto rendimiento orientada a la investigación biomédica, bioquímica y docencia universitaria. Permite la adquisición, segmentación geométrica y procesamiento cuantitativo de imágenes de laboratorio (*in situ* y sin necesidad de conexión externa continua), así como el registro estructurado de fichas de trabajo y generación de informes técnicos exportables.

---

## 🔬 Módulos Científicos y Funcionalidades

### 1. Densitometría de Geles (SDS-PAGE / Agarosa / Western Blot)
- **Segmentación de Regiones de Interés (ROI):** Selección adaptativa mediante formas geométricas (elipses, rectángulos, trapezoides, triángulos y rombos) con rotación y ajuste bidimensional de dimensiones.
- **Canales de color:** Descomposición en luminancia / escala de grises, canal Rojo, Verde o Azul.
- **Cuantificación Óptica:** Cálculo de Densidad Óptica Integrada (IOD, *Integrated Optical Density*), intensidad media y área en píxeles.
- **Corrección de Fondo:** Sustracción local de fondo (zonas de control de blanco/background).
- **Curvas de Calibración:** Ajuste lineal de estándares para interpolación directa de concentración de muestras problema.

### 2. Zimografía
- Cuantificación enzimática sobre geles con sustratos embebidos (gelatina, caseína).
- Detección de bandas claras sobre fondo oscuro (*Light on Dark*), con normalización de fondo de degradación y determinación de actividad enzimática total.

### 3. Colorimetría RGV
- Análisis de absorbancia/densidad en placas de cultivo, micropocillos y ensayos colorimétricos.
- Ajuste dinámico de apertura y radio de análisis con actualización instantánea de parámetros espectrofotométricos aproximados por imagen.

### 4. Recuento Celular / Microscopía
- Marcado y conteo diferencial de campos microscópicos con discriminación por tipos celulares o viabilidad (vivas vs. muertas).
- Cálculo de densidad celular por campo y viabilidad porcentual.

### 5. Fichas de Trabajo y Exportación
- Registro persistente local (IndexedDB / LocalStorage) de protocolos, observaciones y metadatos experimentales.
- Exportación automatizada de reportes en PDF con tablas analíticas, curvas de regresión y captura de las regiones evaluadas.

---

## ⚙️ Arquitectura Tecnológica y Privacidad

- **Procesamiento 100% Client-Side:** Todas las operaciones de convolución, lectura de píxeles en canvas 2D, transformaciones matriciales y cálculos estadísticos se ejecutan localmente en el procesador del dispositivo cliente. No se transmiten imágenes sensibles a servidores de terceros, garantizando privacidad de datos y funcionamiento en laboratorios sin conexión a internet (*offline-first*).
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Estándar PWA:** Service Worker con políticas de caché y manifiesto web para instalación como aplicación de escritorio o móvil (Android / iOS).

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- Node.js (v18 o superior)
- npm o yarn

### Pasos
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/wandafouba/milabuba.git
   cd milabuba
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar en modo desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador en `http://localhost:3000`.

4. Compilar para producción:
   ```bash
   npm run build
   ```

---

## 🏛️ Cita Académica y Depósito

Si utiliza este software en publicaciones científicas, trabajos prácticos o tesis, por favor cite este trabajo como:

> **Valsecchi, WM.** (2026). *MiLabUBA — Quantitative Bioimage Analysis Platform for biomedical and biochemical research and higher education*. Zenodo. https://doi.org/10.5281/zenodo.22851930

---

## 📜 Licencia y Derechos de Autor
Copyright (c) 2026 Wanda M. Valsecchi. All rights reserved under the MIT License.
