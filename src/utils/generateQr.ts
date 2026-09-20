import fs from 'fs';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';

export function generateCustomQr(url = 'https://ais-pre-cr6lbmy3tembfe5ek32dsm-585370924389.us-west2.run.app', outputPath = 'public/QR-MiLabUBA.png') {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const modCount = qr.modules.size; // 37
  const margin = 2; // quiet zone
  const scale = 20; // 20px per module => 41 * 20 = 820px
  const totalMods = modCount + margin * 2; // 41
  const imgSize = totalMods * scale; // 820

  const png = new PNG({ width: imgSize, height: imgSize });
  png.data.fill(255); // White background

  const RED = [139, 14, 18]; // #8B0E12
  const BLACK = [0, 0, 0];

  function isFinder(r: number, c: number) {
    return (r < 7 && c < 7) || (r < 7 && c >= modCount - 7) || (r >= modCount - 7 && c < 7);
  }

  // Center logo covers 13..23 (11x11 modules)
  const logoStart = 13;
  const logoEnd = 24;

  // 1. Draw modules
  for (let r = 0; r < modCount; r++) {
    for (let c = 0; c < modCount; c++) {
      if (isFinder(r, c)) continue;
      if (r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd) continue;
      
      if (qr.modules.get(r, c)) {
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = ((startY + py) * imgSize + (startX + px)) * 4;
            png.data[idx] = RED[0];
            png.data[idx + 1] = RED[1];
            png.data[idx + 2] = RED[2];
            png.data[idx + 3] = 255;
          }
        }
      }
    }
  }

  // 2. Draw rounded rectangle helper
  function drawRoundedRect(startX: number, startY: number, w: number, h: number, rad: number, color: number[]) {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let inside = true;
        if (rad > 0) {
          if (px < rad && py < rad) inside = (px - rad) ** 2 + (py - rad) ** 2 <= rad ** 2;
          else if (px >= w - rad && py < rad) inside = (px - (w - rad - 1)) ** 2 + (py - rad) ** 2 <= rad ** 2;
          else if (px < rad && py >= h - rad) inside = (px - rad) ** 2 + (py - (h - rad - 1)) ** 2 <= rad ** 2;
          else if (px >= w - rad && py >= h - rad) inside = (px - (w - rad - 1)) ** 2 + (py - (h - rad - 1)) ** 2 <= rad ** 2;
        }
        if (inside) {
          const idx = ((startY + py) * imgSize + (startX + px)) * 4;
          png.data[idx] = color[0];
          png.data[idx + 1] = color[1];
          png.data[idx + 2] = color[2];
          png.data[idx + 3] = 255;
        }
      }
    }
  }

  // 3. Draw Finders with rounded corners (matches user image)
  function drawFinder(modR: number, modC: number) {
    const x = (modC + margin) * scale;
    const y = (modR + margin) * scale;
    const size7 = 7 * scale;
    const size5 = 5 * scale;
    const size3 = 3 * scale;
    const rOuter = Math.round(scale * 0.85); // 17px
    const rHole = Math.round(scale * 0.4);   // 8px
    const rBall = Math.round(scale * 0.45);  // 9px

    drawRoundedRect(x, y, size7, size7, rOuter, BLACK);
    drawRoundedRect(x + scale, y + scale, size5, size5, rHole, [255, 255, 255]);
    drawRoundedRect(x + scale * 2, y + scale * 2, size3, size3, rBall, BLACK);
  }

  drawFinder(0, 0);
  drawFinder(0, modCount - 7);
  drawFinder(modCount - 7, 0);

  // 4. Center logo
  if (fs.existsSync('public/logo_pwa.jpg')) {
    const logoRaw = fs.readFileSync('public/logo_pwa.jpg');
    const logoJpg = jpeg.decode(logoRaw, { useTArray: true });

    const logoX = (logoStart + margin) * scale;
    const logoY = (logoStart + margin) * scale;
    const logoSize = (logoEnd - logoStart) * scale; // 11 * 20 = 220px

    // Outer cream card
    drawRoundedRect(logoX, logoY, logoSize, logoSize, 16, [253, 246, 237]);

    // 2px Border
    const BORDER_COLOR = [244, 228, 211];
    for (let y = logoY; y < logoY + logoSize; y++) {
      for (let x = logoX; x < logoX + logoSize; x++) {
        const isBorder = (x === logoX || x === logoX + 1 || x === logoX + logoSize - 1 || x === logoX + logoSize - 2 ||
                          y === logoY || y === logoY + 1 || y === logoY + logoSize - 1 || y === logoY + logoSize - 2);
        if (isBorder) {
          const px = x - logoX;
          const py = y - logoY;
          const rad = 16;
          let inside = true;
          if (px < rad && py < rad) inside = (px - rad)**2 + (py - rad)**2 <= rad**2;
          else if (px >= logoSize - rad && py < rad) inside = (px - (logoSize - rad - 1))**2 + (py - rad)**2 <= rad**2;
          else if (px < rad && py >= logoSize - rad) inside = (px - rad)**2 + (py - (logoSize - rad - 1))**2 <= rad**2;
          else if (px >= logoSize - rad && py >= logoSize - rad) inside = (px - (logoSize - rad - 1))**2 + (py - (logoSize - rad - 1))**2 <= rad**2;
          if (inside) {
            const idx = (y * imgSize + x) * 4;
            png.data[idx] = BORDER_COLOR[0];
            png.data[idx + 1] = BORDER_COLOR[1];
            png.data[idx + 2] = BORDER_COLOR[2];
          }
        }
      }
    }

    // Inner logo image with padding
    const innerPad = 18;
    const innerX = logoX + innerPad;
    const innerY = logoY + innerPad;
    const innerSize = logoSize - innerPad * 2;
    const innerRad = 24;

    for (let py = 0; py < innerSize; py++) {
      for (let px = 0; px < innerSize; px++) {
        let inside = true;
        if (px < innerRad && py < innerRad) inside = (px - innerRad) ** 2 + (py - innerRad) ** 2 <= innerRad ** 2;
        else if (px >= innerSize - innerRad && py < innerRad) inside = (px - (innerSize - innerRad - 1)) ** 2 + (py - innerRad) ** 2 <= innerRad ** 2;
        else if (px < innerRad && py >= innerSize - innerRad) inside = (px - innerRad) ** 2 + (py - (innerSize - innerRad - 1)) ** 2 <= innerRad ** 2;
        else if (px >= innerSize - innerRad && py >= innerSize - innerRad) inside = (px - (innerSize - innerRad - 1)) ** 2 + (py - (innerSize - innerRad - 1)) ** 2 <= innerRad ** 2;
        
        if (inside) {
          const srcX = Math.floor((px / innerSize) * logoJpg.width);
          const srcY = Math.floor((py / innerSize) * logoJpg.height);
          const srcIdx = (srcY * logoJpg.width + srcX) * 4;
          const dstIdx = ((innerY + py) * imgSize + (innerX + px)) * 4;
          png.data[dstIdx] = logoJpg.data[srcIdx];
          png.data[dstIdx + 1] = logoJpg.data[srcIdx + 1];
          png.data[dstIdx + 2] = logoJpg.data[srcIdx + 2];
          png.data[dstIdx + 3] = 255;
        }
      }
    }
  }

  // Validate with jsQR
  const dec = jsQR(new Uint8ClampedArray(png.data), imgSize, imgSize);
  console.log('jsQR validation:', dec ? `OK (${dec.data})` : 'FAILED');

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buffer);
  return buffer;
}

// Self-run when executed directly
if (process.argv[1]?.endsWith('generate-qr.js') || process.argv[1]?.endsWith('generate-qr.ts')) {
  generateCustomQr();
}
