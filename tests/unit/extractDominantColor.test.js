import { describe, it, expect } from 'vitest';
import { extractDominantColor } from '../../src/utils/color.js';

// Builds a fake canvas-like object exposing just enough of the 2D context
// API (getImageData) for extractDominantColor to run without a real DOM.
function fakeCanvas(width, height, pixels){
  // pixels: array of [r,g,b,a] in row-major order, one per pixel
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach(([r,g,b,a], i) => {
    data[i*4] = r; data[i*4+1] = g; data[i*4+2] = b; data[i*4+3] = a;
  });
  return {
    width, height,
    getContext: () => ({
      getImageData: () => ({ data })
    })
  };
}

describe('extractDominantColor', () => {
  it('picks the hue that appears most often', () => {
    // 6 red-ish pixels, 2 blue-ish pixels -- red should win
    const pixels = [
      ...Array(6).fill([200, 30, 30, 255]),
      ...Array(2).fill([30, 30, 200, 255])
    ];
    const canvas = fakeCanvas(2, 4, pixels);
    const result = extractDominantColor(canvas);
    const r = parseInt(result.slice(1,3), 16);
    const b = parseInt(result.slice(5,7), 16);
    expect(r).toBeGreaterThan(b);
  });

  it('ignores fully transparent pixels', () => {
    const pixels = [
      [200, 30, 30, 0],   // transparent -- should be ignored
      [30, 30, 200, 255], // opaque blue -- should win by default
      [30, 30, 200, 255],
      [30, 30, 200, 255]
    ];
    const canvas = fakeCanvas(2, 2, pixels);
    const result = extractDominantColor(canvas);
    const b = parseInt(result.slice(5,7), 16);
    const r = parseInt(result.slice(1,3), 16);
    expect(b).toBeGreaterThan(r);
  });

  it('falls back to an RGB average when every pixel is grayscale', () => {
    const pixels = Array(4).fill([128, 128, 128, 255]);
    const canvas = fakeCanvas(2, 2, pixels);
    const result = extractDominantColor(canvas);
    // Should resolve close to mid-gray rather than throwing or returning black
    const r = parseInt(result.slice(1,3), 16);
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(160);
  });

  it('returns a well-formed hex color string', () => {
    const pixels = Array(4).fill([80, 160, 40, 255]);
    const canvas = fakeCanvas(2, 2, pixels);
    const result = extractDominantColor(canvas);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
