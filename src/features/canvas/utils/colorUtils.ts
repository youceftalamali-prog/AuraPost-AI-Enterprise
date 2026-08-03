/**
 * Color Utilities
 * Comprehensive color manipulation and conversion utilities
 * Supports: RGB, HSL, HSV, HEX, CMYK, LAB, Color mixing,
 *           Color harmony, Color palettes, Accessibility checks
 * Phase: 5.4 Part 4
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface ColorInfo {
  hex: string;
  rgb: RGB;
  rgba: RGBA;
  hsl: HSL;
  hsv: HSV;
  cmyk: CMYK;
  lab: LAB;
  luminance: number;
  brightness: number;
  isDark: boolean;
  isLight: boolean;
}

export interface ColorHarmony {
  complementary: string[];
  analogous: string[];
  triadic: string[];
  tetradic: string[];
  splitComplementary: string[];
  monochromatic: string[];
}

export class ColorUtils {
  /**
   * Parse any color string to RGB
   */
  static parseColor(color: string): RGB {
    // Handle hex colors
    if (color.startsWith('#')) {
      return this.hexToRgb(color);
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
        };
      }
    }

    // Handle hsl/hsla colors
    if (color.startsWith('hsl')) {
      const match = color.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?(?:,\s*([\d.]+))?\)/);
      if (match) {
        const hsl: HSL = {
          h: parseInt(match[1]),
          s: parseInt(match[2]),
          l: parseInt(match[3]),
        };
        return this.hslToRgb(hsl);
      }
    }

    // Default to black
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Parse color string to RGBA
   */
  static parseColorToRGBA(color: string): RGBA {
    const rgb = this.parseColor(color);
    let alpha = 1;

    if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match && match[4]) {
        alpha = parseFloat(match[4]);
      }
    } else if (color.startsWith('hsla')) {
      const match = color.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?(?:,\s*([\d.]+))?\)/);
      if (match && match[4]) {
        alpha = parseFloat(match[4]);
      }
    }

    return { ...rgb, a: alpha };
  }

  /**
   * Convert hex to RGB
   */
  static hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      // Try short hex format
      const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
      if (shortResult) {
        return {
          r: parseInt(shortResult[1] + shortResult[1], 16),
          g: parseInt(shortResult[2] + shortResult[2], 16),
          b: parseInt(shortResult[3] + shortResult[3], 16),
        };
      }
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  /**
   * Convert RGB to hex
   */
  static rgbToHex(rgb: RGB): string {
    return (
      '#' +
      [rgb.r, rgb.g, rgb.b]
        .map(x => {
          const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  /**
   * Convert RGB to HSL
   */
  static rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /**
   * Convert HSL to RGB
   */
  static hslToRgb(hsl: HSL): RGB {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  /**
   * Convert RGB to HSV
   */
  static rgbToHsv(rgb: RGB): HSV {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  }

  /**
   * Convert HSV to RGB
   */
  static hsvToRgb(hsv: HSV): RGB {
    const h = hsv.h / 360;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    let r = 0,
      g = 0,
      b = 0;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /**
   * Convert RGB to CMYK
   */
  static rgbToCmyk(rgb: RGB): CMYK {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const k = 1 - Math.max(r, g, b);

    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  }

  /**
   * Convert CMYK to RGB
   */
  static cmykToRgb(cmyk: CMYK): RGB {
    const c = cmyk.c / 100;
    const m = cmyk.m / 100;
    const y = cmyk.y / 100;
    const k = cmyk.k / 100;

    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);

    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
    };
  }

  /**
   * Convert RGB to LAB (CIE L*a*b*)
   */
  static rgbToLab(rgb: RGB): LAB {
    // Convert RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ (D65 illuminant)
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    // Convert XYZ to LAB
    const xyz = [x, y, z].map(v =>
      v > 0.008856 ? Math.pow(v, 1 / 3) : 7.787 * v + 16 / 116
    );

    return {
      l: Math.round(116 * xyz[1] - 16),
      a: Math.round(500 * (xyz[0] - xyz[1])),
      b: Math.round(200 * (xyz[1] - xyz[2])),
    };
  }

  /**
   * Convert LAB to RGB
   */
  static labToRgb(lab: LAB): RGB {
    // Convert LAB to XYZ
    let y = (lab.l + 16) / 116;
    let x = lab.a / 500 + y;
    let z = y - lab.b / 200;

    const xyz = [x, y, z].map(v => {
      const v3 = v * v * v;
      return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
    });

    x = xyz[0] * 0.95047;
    y = xyz[1] * 1.0;
    z = xyz[2] * 1.08883;

    // Convert XYZ to RGB
    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.204 + z * 1.057;

    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.max(0, Math.min(255, Math.round(r * 255))),
      g: Math.max(0, Math.min(255, Math.round(g * 255))),
      b: Math.max(0, Math.min(255, Math.round(b * 255))),
    };
  }

  /**
   * Get comprehensive color information
   */
  static getColorInfo(color: string): ColorInfo {
    const rgb = this.parseColor(color);
    const rgba = this.parseColorToRGBA(color);
    const hex = this.rgbToHex(rgb);
    const hsl = this.rgbToHsl(rgb);
    const hsv = this.rgbToHsv(rgb);
    const cmyk = this.rgbToCmyk(rgb);
    const lab = this.rgbToLab(rgb);
    const luminance = this.getLuminance(rgb);
    const brightness = this.getBrightness(rgb);

    return {
      hex,
      rgb,
      rgba,
      hsl,
      hsv,
      cmyk,
      lab,
      luminance,
      brightness,
      isDark: brightness < 128,
      isLight: brightness >= 128,
    };
  }

  /**
   * Calculate relative luminance (WCAG 2.0)
   */
  static getLuminance(rgb: RGB): number {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Calculate perceived brightness
   */
  static getBrightness(rgb: RGB): number {
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  }

  /**
   * Calculate contrast ratio between two colors (WCAG 2.0)
   */
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    const lum1 = this.getLuminance(rgb1);
    const lum2 = this.getLuminance(rgb2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if color combination meets WCAG AA standard
   */
  static meetsWCAGAA(color1: string, color2: string): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return ratio >= 4.5;
  }

  /**
   * Check if color combination meets WCAG AAA standard
   */
  static meetsWCAGAAA(color1: string, color2: string): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return ratio >= 7;
  }

  /**
   * Mix two colors
   */
  static mixColors(color1: string, color2: string, weight: number = 0.5): string {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    const r = Math.round(rgb1.r * (1 - weight) + rgb2.r * weight);
    const g = Math.round(rgb1.g * (1 - weight) + rgb2.g * weight);
    const b = Math.round(rgb1.b * (1 - weight) + rgb2.b * weight);

    return this.rgbToHex({ r, g, b });
  }

  /**
   * Lighten a color
   */
  static lighten(color: string, amount: number): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.l = Math.min(100, hsl.l + amount);

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Darken a color
   */
  static darken(color: string, amount: number): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.l = Math.max(0, hsl.l - amount);

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Saturate a color
   */
  static saturate(color: string, amount: number): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.s = Math.min(100, hsl.s + amount);

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Desaturate a color
   */
  static desaturate(color: string, amount: number): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.s = Math.max(0, hsl.s - amount);

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Rotate hue
   */
  static rotateHue(color: string, degrees: number): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.h = (hsl.h + degrees + 360) % 360;

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Invert a color
   */
  static invert(color: string): string {
    const rgb = this.parseColor(color);

    return this.rgbToHex({
      r: 255 - rgb.r,
      g: 255 - rgb.g,
      b: 255 - rgb.b,
    });
  }

  /**
   * Grayscale a color
   */
  static grayscale(color: string): string {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    hsl.s = 0;

    const newRgb = this.hslToRgb(hsl);
    return this.rgbToHex(newRgb);
  }

  /**
   * Sepia effect
   */
  static sepia(color: string): string {
    const rgb = this.parseColor(color);

    const r = Math.min(255, rgb.r * 0.393 + rgb.g * 0.769 + rgb.b * 0.189);
    const g = Math.min(255, rgb.r * 0.349 + rgb.g * 0.686 + rgb.b * 0.168);
    const b = Math.min(255, rgb.r * 0.272 + rgb.g * 0.534 + rgb.b * 0.131);

    return this.rgbToHex({ r: Math.round(r), g: Math.round(g), b: Math.round(b) });
  }

  /**
   * Generate color harmony
   */
  static generateColorHarmony(color: string): ColorHarmony {
    const rgb = this.parseColor(color);
    const hsl = this.rgbToHsl(rgb);

    // Complementary (180°)
    const complementary = [
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 })),
    ];

    // Analogous (±30°)
    const analogous = [
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 330) % 360 })),
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 30) % 360 })),
    ];

    // Triadic (120°)
    const triadic = [
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 120) % 360 })),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 240) % 360 })),
    ];

    // Tetradic (90°)
    const tetradic = [
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 90) % 360 })),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 })),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 270) % 360 })),
    ];

    // Split Complementary (150°, 210°)
    const splitComplementary = [
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 150) % 360 })),
      this.rgbToHex(this.hslToRgb({ ...hsl, h: (hsl.h + 210) % 360 })),
    ];

    // Monochromatic (varying lightness)
    const monochromatic = [
      this.rgbToHex(this.hslToRgb({ ...hsl, l: Math.max(0, hsl.l - 30) })),
      this.rgbToHex(this.hslToRgb({ ...hsl, l: Math.max(0, hsl.l - 15) })),
      this.rgbToHex(rgb),
      this.rgbToHex(this.hslToRgb({ ...hsl, l: Math.min(100, hsl.l + 15) })),
      this.rgbToHex(this.hslToRgb({ ...hsl, l: Math.min(100, hsl.l + 30) })),
    ];

    return {
      complementary,
      analogous,
      triadic,
      tetradic,
      splitComplementary,
      monochromatic,
    };
  }

  /**
   * Generate color palette from base color
   */
  static generatePalette(
    baseColor: string,
    count: number = 5,
    mode: 'lighten' | 'darken' | 'both' = 'both'
  ): string[] {
    const rgb = this.parseColor(baseColor);
    const hsl = this.rgbToHsl(rgb);
    const palette: string[] = [];

    if (mode === 'both') {
      const half = Math.floor(count / 2);
      for (let i = half; i > 0; i--) {
        const lightness = Math.max(0, hsl.l - i * (100 / count));
        palette.push(this.rgbToHex(this.hslToRgb({ ...hsl, l: lightness })));
      }
      palette.push(baseColor);
      for (let i = 1; i <= half; i++) {
        const lightness = Math.min(100, hsl.l + i * (100 / count));
        palette.push(this.rgbToHex(this.hslToRgb({ ...hsl, l: lightness })));
      }
    } else if (mode === 'lighten') {
      for (let i = 0; i < count; i++) {
        const lightness = Math.min(100, hsl.l + i * (100 / count));
        palette.push(this.rgbToHex(this.hslToRgb({ ...hsl, l: lightness })));
      }
    } else {
      for (let i = count - 1; i >= 0; i--) {
        const lightness = Math.max(0, hsl.l - i * (100 / count));
        palette.push(this.rgbToHex(this.hslToRgb({ ...hsl, l: lightness })));
      }
    }

    return palette;
  }

  /**
   * Get nearest web-safe color
   */
  static getWebSafeColor(color: string): string {
    const rgb = this.parseColor(color);

    const r = Math.round(rgb.r / 51) * 51;
    const g = Math.round(rgb.g / 51) * 51;
    const b = Math.round(rgb.b / 51) * 51;

    return this.rgbToHex({ r, g, b });
  }

  /**
   * Calculate color distance (Euclidean in RGB space)
   */
  static getColorDistance(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  /**
   * Calculate perceptual color distance (CIEDE2000 simplified)
   */
  static getPerceptualDistance(color1: string, color2: string): number {
    const lab1 = this.rgbToLab(this.parseColor(color1));
    const lab2 = this.rgbToLab(this.parseColor(color2));

    return Math.sqrt(
      Math.pow(lab1.l - lab2.l, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
    );
  }

  /**
   * Check if two colors are similar
   */
  static areColorsSimilar(color1: string, color2: string, threshold: number = 30): boolean {
    return this.getColorDistance(color1, color2) <= threshold;
  }

  /**
   * Get complementary color
   */
  static getComplementary(color: string): string {
    return this.rotateHue(color, 180);
  }

  /**
   * Get triadic colors
   */
  static getTriadic(color: string): string[] {
    return [
      color,
      this.rotateHue(color, 120),
      this.rotateHue(color, 240),
    ];
  }

  /**
   * Get analogous colors
   */
  static getAnalogous(color: string): string[] {
    return [
      this.rotateHue(color, -30),
      color,
      this.rotateHue(color, 30),
    ];
  }

  /**
   * Generate random color
   */
  static randomColor(): string {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return this.rgbToHex({ r, g, b });
  }

  /**
   * Generate random color with constraints
   */
  static randomColorInRange(
    hueMin: number = 0,
    hueMax: number = 360,
    saturationMin: number = 50,
    saturationMax: number = 100,
    lightnessMin: number = 30,
    lightnessMax: number = 70
  ): string {
    const h = Math.floor(Math.random() * (hueMax - hueMin) + hueMin);
    const s = Math.floor(Math.random() * (saturationMax - saturationMin) + saturationMin);
    const l = Math.floor(Math.random() * (lightnessMax - lightnessMin) + lightnessMin);

    return this.rgbToHex(this.hslToRgb({ h, s, l }));
  }

  /**
   * Get named color (CSS color name)
   */
  static getNamedColor(color: string): string | null {
    const rgb = this.parseColor(color);
    const hex = this.rgbToHex(rgb).toLowerCase();

    const namedColors: Record<string, string> = {
      '#000000': 'black',
      '#ffffff': 'white',
      '#ff0000': 'red',
      '#00ff00': 'lime',
      '#0000ff': 'blue',
      '#ffff00': 'yellow',
      '#00ffff': 'cyan',
      '#ff00ff': 'magenta',
      '#c0c0c0': 'silver',
      '#808080': 'gray',
      '#800000': 'maroon',
      '#808000': 'olive',
      '#008000': 'green',
      '#800080': 'purple',
      '#008080': 'teal',
      '#000080': 'navy',
    };

    return namedColors[hex] || null;
  }

  /**
   * Validate color string
   */
  static isValidColor(color: string): boolean {
    try {
      const rgb = this.parseColor(color);
      return (
        rgb.r >= 0 && rgb.r <= 255 &&
        rgb.g >= 0 && rgb.g <= 255 &&
        rgb.b >= 0 && rgb.b <= 255
      );
    } catch {
      return false;
    }
  }

  /**
   * Convert color to string in specified format
   */
  static toString(color: string, format: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'): string {
    const rgb = this.parseColor(color);
    const rgba = this.parseColorToRGBA(color);
    const hsl = this.rgbToHsl(rgb);

    switch (format) {
      case 'hex':
        return this.rgbToHex(rgb);
      case 'rgb':
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      case 'rgba':
        return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
      case 'hsl':
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      case 'hsla':
        return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgba.a})`;
      default:
        return color;
    }
  }

  /**
   * Get supported color formats
   */
  static getSupportedFormats(): string[] {
    return ['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'cmyk', 'lab'];
  }

  /**
   * Get supported harmony types
   */
  static getSupportedHarmonies(): string[] {
    return [
      'complementary',
      'analogous',
      'triadic',
      'tetradic',
      'splitComplementary',
      'monochromatic',
    ];
  }
}