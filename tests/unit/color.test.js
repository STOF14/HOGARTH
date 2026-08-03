import { describe, it, expect } from 'vitest';
import { hexToInts, rgbToHex, rgbToHsl, hslToHex, shade, hashHue } from '../../src/utils/color.js';

describe('hexToInts / rgbToHex round-trip', () => {
  it('converts a hex color to RGB ints and back losslessly', () => {
    expect(hexToInts('#a0b1c2')).toEqual([0xa0, 0xb1, 0xc2]);
    expect(rgbToHex(0xa0, 0xb1, 0xc2)).toBe('#a0b1c2');
  });

  it('clamps out-of-range RGB values instead of producing invalid hex', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
  });
});

describe('rgbToHsl / hslToHex round-trip', () => {
  it('recovers approximately the same color after an RGB -> HSL -> hex round trip', () => {
    const original = '#3366cc';
    const [r, g, b] = hexToInts(original);
    const [h, s, l] = rgbToHsl(r, g, b);
    const roundTripped = hslToHex(h, s * 100, l * 100);
    // Allow small rounding drift from the HSL conversion, not exact equality
    const [origR, origG, origB] = hexToInts(original);
    const [newR, newG, newB] = hexToInts(roundTripped);
    expect(Math.abs(origR - newR)).toBeLessThanOrEqual(2);
    expect(Math.abs(origG - newG)).toBeLessThanOrEqual(2);
    expect(Math.abs(origB - newB)).toBeLessThanOrEqual(2);
  });

  it('treats pure gray as zero saturation', () => {
    const [h, s, l] = rgbToHsl(128, 128, 128);
    expect(s).toBe(0);
  });
});

describe('shade', () => {
  it('lightens a color with a positive amount', () => {
    const lightened = shade('#404040', 0.2);
    const [r] = hexToInts(lightened);
    expect(r).toBeGreaterThan(0x40);
  });

  it('darkens a color with a negative amount', () => {
    const darkened = shade('#808080', -0.2);
    const [r] = hexToInts(darkened);
    expect(r).toBeLessThan(0x80);
  });

  it('clamps rather than overflowing at the extremes', () => {
    expect(shade('#ffffff', 0.5)).toBe('#ffffff');
    expect(shade('#000000', -0.5)).toBe('#000000');
  });
});

describe('hashHue', () => {
  it('is deterministic for the same input', () => {
    expect(hashHue('Untitled Draft #1')).toBe(hashHue('Untitled Draft #1'));
  });

  it('always returns a value in the valid hue range', () => {
    const samples = ['a', 'a much longer title', '', 'Emoji 🚀 Title', '12345'];
    for (const s of samples){
      const h = hashHue(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it('produces different hues for different titles (not a guarantee, but should hold for this fixed set)', () => {
    const a = hashHue('Alpha Comic');
    const b = hashHue('Beta Comic');
    expect(a).not.toBe(b);
  });
});
