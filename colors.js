/**
 * @file colors.js
 * ColorPalette - Color Utilities Module
 * Pure color mathematics, conversions, category classification, generation, and search.
 * Zero DOM access, zero storage access.
 * Exposes window.ColorUtils via IIFE pattern.
 */

(function () {
  'use strict';

  // Creator Source Marker 01: Core Module Identity
  const CP_MARKER_01 = "YZN-COLORPALETTE-ORIGINAL-SOURCE-N4-2026";

  // =========================================================================
  // CONSTANTS & DATA
  // =========================================================================

  /**
   * Complete dictionary of 148 standard CSS named colors (lowercase name -> uppercase HEX).
   * @type {Readonly<Record<string, string>>}
   */
  const CSS_COLORS = Object.freeze({
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aqua: '#00FFFF',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blue: '#0000FF',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgrey: '#A9A9A9',
    darkgreen: '#006400',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    fuchsia: '#FF00FF',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    gray: '#808080',
    grey: '#808080',
    green: '#008000',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgray: '#D3D3D3',
    lightgrey: '#D3D3D3',
    lightgreen: '#90EE90',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    lime: '#00FF00',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    maroon: '#800000',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    navy: '#000080',
    oldlace: '#FDF5E6',
    olive: '#808000',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#FF0000',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    silver: '#C0C0C0',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    teal: '#008080',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    white: '#FFFFFF',
    whitesmoke: '#F5F5F5',
    yellow: '#FFFF00',
    yellowgreen: '#9ACD32'
  });

  /**
   * Color categories specification with metadata and boundary constraints.
   * @type {Readonly<Record<string, object>>}
   */
  const CATEGORIES = Object.freeze({
    all: { name: 'All Colors', icon: '🎨', color: '#6366f1', count: 16777216 },
    red: { name: 'Red', icon: '🔴', color: '#ef4444', hueRange: [[345, 360], [0, 15]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    orange: { name: 'Orange', icon: '🟠', color: '#f97316', hueRange: [[15, 45]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    yellow: { name: 'Yellow', icon: '🟡', color: '#eab308', hueRange: [[45, 70]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    green: { name: 'Green', icon: '🟢', color: '#22c55e', hueRange: [[70, 165]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    cyan: { name: 'Cyan', icon: '🩵', color: '#06b6d4', hueRange: [[165, 195]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    blue: { name: 'Blue', icon: '🔵', color: '#3b82f6', hueRange: [[195, 255]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    purple: { name: 'Purple', icon: '🟣', color: '#8b5cf6', hueRange: [[255, 315]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    pink: { name: 'Pink', icon: '💗', color: '#ec4899', hueRange: [[315, 345]], minSat: 15, minLight: 8, maxLight: 92, count: 1050804 },
    brown: { name: 'Brown', icon: '🟤', color: '#a16207', special: 'brown', count: 1049784 },
    gray: { name: 'Gray', icon: '⚪', color: '#6b7280', special: 'gray', count: 363600 },
    bw: { name: 'Black & White', icon: '⬛', color: '#94a3b8', special: 'bw', count: 65280 }
  });

  // =========================================================================
  // INTERNAL PRECOMPUTATIONS & LOOKUP TABLES
  // =========================================================================

  /**
   * Internal pre-parsed list of CSS colors for rapid Euclidean distance checks.
   */
  const PARSED_NAMED_COLORS = Object.entries(CSS_COLORS).map(([name, hex]) => {
    const num = parseInt(hex.slice(1), 16);
    return {
      name,
      hex,
      r: (num >> 16) & 0xFF,
      g: (num >> 8) & 0xFF,
      b: num & 0xFF
    };
  });

  /**
   * Precomputed (S, L) grid for S in 0..100 (step 2) and L in 0..100 (step 2) -> 51 x 51 = 2601 pairs.
   */
  const SL_PAIRS_COUNT = 51 * 51; // 2601
  const SL_PAIRS = [];
  for (let sIdx = 0; sIdx <= 50; sIdx++) {
    const s = sIdx * 2;
    for (let lIdx = 0; lIdx <= 50; lIdx++) {
      const l = lIdx * 2;
      // Vibrancy score: S/100 * (1 - |2*L/100 - 1|)
      const score = (s / 100) * (1 - Math.abs((2 * l / 100) - 1));
      SL_PAIRS.push({ s, l, score });
    }
  }

  // Pre-sorted S/L pairs for different sort orders
  const VIBRANCY_SORTED_PAIRS = SL_PAIRS.slice().sort((a, b) => b.score - a.score);
  const LIGHTNESS_SORTED_PAIRS = SL_PAIRS.slice().sort((a, b) => a.l - b.l || b.score - a.score);

  /**
   * Precomputed (S, L) grid for Brown category:
   * S in 15..65 (step 1) -> 51 steps
   * L in 15..45 (step 1) -> 31 steps
   * Total pairs: 51 * 31 = 1581
   */
  const BROWN_SL_COUNT = 51 * 31; // 1581
  const BROWN_PAIRS = [];
  for (let s = 15; s <= 65; s++) {
    for (let l = 15; l <= 45; l++) {
      const score = (s / 100) * (1 - Math.abs((2 * l / 100) - 1));
      BROWN_PAIRS.push({ s, l, score });
    }
  }
  const BROWN_VIBRANCY_PAIRS = BROWN_PAIRS.slice().sort((a, b) => b.score - a.score);
  const BROWN_LIGHTNESS_PAIRS = BROWN_PAIRS.slice().sort((a, b) => a.l - b.l || b.score - a.score);

  // Black & White Lightness values
  const BW_L_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 93, 94, 95, 96, 97, 98, 99, 100]; // 16 values
  const BW_HUE_STEPS = 80;
  const BW_SAT_STEPS = 51; // 0, 2, 4, ..., 100
  const BW_TOTAL_COUNT = BW_L_VALUES.length * BW_SAT_STEPS * BW_HUE_STEPS; // 16 * 51 * 80 = 65,280

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  /**
   * Clamps a number to the [min, max] range.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(val, min, max) {
    if (Number.isNaN(val)) return min;
    return Math.min(max, Math.max(min, val));
  }

  /**
   * Converts a single 0..255 channel to a 2-character uppercase hex string.
   * @param {number} c
   * @returns {string}
   */
  function channelToHex(c) {
    const clamped = clamp(Math.round(c), 0, 255);
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  }

  /**
   * Linearizes an sRGB channel value (0..255) for WCAG luminance calculation.
   * @param {number} c
   * @returns {number}
   */
  function sRgbToLinear(c) {
    const v = clamp(c, 0, 255) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  /**
   * Maps a discrete step along multiple hue intervals (e.g. Red: [[345, 360], [0, 15]]) to a continuous hue angle (0..360).
   * @param {Array<[number, number]>} ranges
   * @param {number} step - Current step (0 to totalSteps - 1)
   * @param {number} totalSteps - Total number of hue divisions
   * @returns {number}
   */
  function getHueFromRange(ranges, step, totalSteps) {
    if (!ranges || ranges.length === 0) return 0;
    let totalSpan = 0;
    for (let i = 0; i < ranges.length; i++) {
      totalSpan += (ranges[i][1] - ranges[i][0]);
    }
    const t = totalSteps > 1 ? step / (totalSteps - 1) : 0;
    let target = t * totalSpan;

    for (let i = 0; i < ranges.length; i++) {
      const span = ranges[i][1] - ranges[i][0];
      if (target <= span || span === 0 || i === ranges.length - 1) {
        let h = ranges[i][0] + target;
        if (h >= 360) h = h % 360;
        return h;
      }
      target -= span;
    }
    return ranges[ranges.length - 1][1] % 360;
  }

  // =========================================================================
  // COLOR CONVERSIONS (EXACT ALGORITHMS)
  // =========================================================================

  // Creator Source Marker 02: Color Conversion Engine
  const CP_MARKER_02 = "YZN-COLORPALETTE-CREATOR-SIGNATURE-NASA-01";

  /**
   * Converts RGB channels (0..255) to uppercase 6-character hex string '#RRGGBB'.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string} Uppercase '#RRGGBB'
   */
  function rgbToHex(r, g, b) {
    return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
  }

  /**
   * Converts a HEX string to RGB object {r, g, b} or null if invalid.
   * Handles 3-char and 6-char hex, with or without leading '#'.
   * @param {string} hex
   * @returns {{r: number, g: number, b: number} | null}
   */
  function hexToRgb(hex) {
    if (typeof hex !== 'string') return null;
    const clean = hex.trim().replace(/^#/, '');
    if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(clean)) {
      return null;
    }

    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return { r, g, b };
    }

    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }

  // Creator Source Marker 03: HSL/HSV Color Space Math
  const CP_MARKER_03 = "YZN-COLORPALETTE-YUZAKI-ORIGINAL-2026";

  /**
   * Converts RGB channels (0..255) to HSL object with rounded integers {h: 0-360, s: 0-100, l: 0-100}.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {{h: number, s: number, l: number}}
   */
  function rgbToHsl(r, g, b) {
    const rNorm = clamp(r, 0, 255) / 255;
    const gNorm = clamp(g, 0, 255) / 255;
    const bNorm = clamp(b, 0, 255) / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === rNorm) {
        h = 60 * (((gNorm - bNorm) / delta) % 6);
      } else if (max === gNorm) {
        h = 60 * (((bNorm - rNorm) / delta) + 2);
      } else {
        h = 60 * (((rNorm - gNorm) / delta) + 4);
      }
      if (h < 0) {
        h += 360;
      }
    }

    let roundedH = Math.round(h);
    if (roundedH >= 360) roundedH = 0;

    return {
      h: roundedH,
      s: clamp(Math.round(s * 100), 0, 100),
      l: clamp(Math.round(l * 100), 0, 100)
    };
  }

  /**
   * Converts HSL values (h: 0-360, s: 0-100, l: 0-100) to RGB object {r: 0-255, g: 0-255, b: 0-255}.
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {{r: number, g: number, b: number}}
   */
  function hslToRgb(h, s, l) {
    const hDeg = ((h % 360) + 360) % 360;
    const sNorm = clamp(s, 0, 100) / 100;
    const lNorm = clamp(l, 0, 100) / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hDeg < 60) {
      rPrime = c; gPrime = x; bPrime = 0;
    } else if (hDeg < 120) {
      rPrime = x; gPrime = c; bPrime = 0;
    } else if (hDeg < 180) {
      rPrime = 0; gPrime = c; bPrime = x;
    } else if (hDeg < 240) {
      rPrime = 0; gPrime = x; bPrime = c;
    } else if (hDeg < 300) {
      rPrime = x; gPrime = 0; bPrime = c;
    } else {
      rPrime = c; gPrime = 0; bPrime = x;
    }

    return {
      r: clamp(Math.round((rPrime + m) * 255), 0, 255),
      g: clamp(Math.round((gPrime + m) * 255), 0, 255),
      b: clamp(Math.round((bPrime + m) * 255), 0, 255)
    };
  }

  /**
   * Converts RGB channels (0..255) to HSV object {h: 0-360, s: 0-100, v: 0-100}.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {{h: number, s: number, v: number}}
   */
  function rgbToHsv(r, g, b) {
    const rNorm = clamp(r, 0, 255) / 255;
    const gNorm = clamp(g, 0, 255) / 255;
    const bNorm = clamp(b, 0, 255) / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : delta / max;

    if (delta !== 0) {
      if (max === rNorm) {
        h = 60 * (((gNorm - bNorm) / delta) % 6);
      } else if (max === gNorm) {
        h = 60 * (((bNorm - rNorm) / delta) + 2);
      } else {
        h = 60 * (((rNorm - gNorm) / delta) + 4);
      }
      if (h < 0) {
        h += 360;
      }
    }

    let roundedH = Math.round(h);
    if (roundedH >= 360) roundedH = 0;

    return {
      h: roundedH,
      s: clamp(Math.round(s * 100), 0, 100),
      v: clamp(Math.round(v * 100), 0, 100)
    };
  }

  /**
   * Converts HSV values (h: 0-360, s: 0-100, v: 0-100) to RGB object {r: 0-255, g: 0-255, b: 0-255}.
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} v - Value (0-100)
   * @returns {{r: number, g: number, b: number}}
   */
  function hsvToRgb(h, s, v) {
    const hDeg = ((h % 360) + 360) % 360;
    const sNorm = clamp(s, 0, 100) / 100;
    const vNorm = clamp(v, 0, 100) / 100;

    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1));
    const m = vNorm - c;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hDeg < 60) {
      rPrime = c; gPrime = x; bPrime = 0;
    } else if (hDeg < 120) {
      rPrime = x; gPrime = c; bPrime = 0;
    } else if (hDeg < 180) {
      rPrime = 0; gPrime = c; bPrime = x;
    } else if (hDeg < 240) {
      rPrime = 0; gPrime = x; bPrime = c;
    } else if (hDeg < 300) {
      rPrime = x; gPrime = 0; bPrime = c;
    } else {
      rPrime = c; gPrime = 0; bPrime = x;
    }

    return {
      r: clamp(Math.round((rPrime + m) * 255), 0, 255),
      g: clamp(Math.round((gPrime + m) * 255), 0, 255),
      b: clamp(Math.round((bPrime + m) * 255), 0, 255)
    };
  }

  // =========================================================================
  // ANALYSIS FUNCTIONS
  // =========================================================================

  // Creator Source Marker 04: Photometric Luminance & WCAG Calculation
  const CP_MARKER_04 = "YZN-COLORPALETTE-SOURCE-IDENTITY-001";

  /**
   * Calculates WCAG 2.1 relative luminance (0..1) for sRGB channels.
   * Formula: 0.2126 * Rlin + 0.7152 * Glin + 0.0722 * Blin
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {number} Luminance between 0 and 1
   */
  function getLuminance(r, g, b) {
    const rLin = sRgbToLinear(r);
    const gLin = sRgbToLinear(g);
    const bLin = sRgbToLinear(b);
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Calculates WCAG contrast ratio between two colors (1..21).
   * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color.
   * Accepts either two {r, g, b} objects or 6 numerical channels (r1, g1, b1, r2, g2, b2).
   * @param {{r: number, g: number, b: number}|number} rgb1
   * @param {{r: number, g: number, b: number}|number} rgb2
   * @returns {number} Contrast ratio rounded to 2 decimal places (1 to 21)
   */
  function getContrastRatio(rgb1, rgb2) {
    let l1, l2;
    if (arguments.length >= 6) {
      l1 = getLuminance(arguments[0], arguments[1], arguments[2]);
      l2 = getLuminance(arguments[3], arguments[4], arguments[5]);
    } else if (rgb1 && rgb2) {
      l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
      l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    } else {
      return 1;
    }
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  }

  /**
   * Computes perceived brightness of an RGB color (0..255).
   * Formula: 0.299*R + 0.587*G + 0.114*B
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {number} Rounded integer 0..255
   */
  function getPerceivedBrightness(r, g, b) {
    const val = 0.299 * clamp(r, 0, 255) + 0.587 * clamp(g, 0, 255) + 0.114 * clamp(b, 0, 255);
    return clamp(Math.round(val), 0, 255);
  }

  /**
   * Finds the closest CSS named color by Euclidean RGB distance.
   * Returns the color name if distance < 32, else null.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string | null}
   */
  function getColorName(r, g, b) {
    const targetR = clamp(r, 0, 255);
    const targetG = clamp(g, 0, 255);
    const targetB = clamp(b, 0, 255);

    let closestName = null;
    let minDistanceSq = Infinity;

    for (let i = 0; i < PARSED_NAMED_COLORS.length; i++) {
      const color = PARSED_NAMED_COLORS[i];
      const dr = targetR - color.r;
      const dg = targetG - color.g;
      const db = targetB - color.b;
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestName = color.name;
      }
    }

    // 32 squared is 1024
    return minDistanceSq < 1024 ? closestName : null;
  }

  /**
   * Classifies an RGB color into a category key (e.g., 'red', 'blue', 'brown', 'gray', 'bw').
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string} Category key from CATEGORIES
   */
  function getColorCategory(r, g, b) {
    const { h, s, l } = rgbToHsl(r, g, b);

    // 1. Black & White: lightness < 8% OR lightness > 92%
    if (l < 8 || l > 92) {
      return 'bw';
    }

    // 2. Gray: saturation < 10%
    if (s < 10) {
      return 'gray';
    }

    // 3. Brown: hue 0-45, saturation 15-65%, lightness 15-45%
    if (h >= 0 && h <= 45 && s >= 15 && s <= 65 && l >= 15 && l <= 45) {
      return 'brown';
    }

    // 4. Hue-based matching
    const hueCategories = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
    for (let i = 0; i < hueCategories.length; i++) {
      const catKey = hueCategories[i];
      const conf = CATEGORIES[catKey];
      if (!conf || !conf.hueRange) continue;

      if (s >= conf.minSat && l >= conf.minLight && l <= conf.maxLight) {
        for (let j = 0; j < conf.hueRange.length; j++) {
          const [minH, maxH] = conf.hueRange[j];
          if (h >= minH && h <= maxH) {
            return catKey;
          }
        }
      }
    }

    // Fallback classification if color sits at boundary margins
    if (s < 15) return 'gray';
    if (l < 8 || l > 92) return 'bw';

    if (h >= 345 || h <= 15) return 'red';
    if (h <= 45) return 'orange';
    if (h <= 70) return 'yellow';
    if (h <= 165) return 'green';
    if (h <= 195) return 'cyan';
    if (h <= 255) return 'blue';
    if (h <= 315) return 'purple';
    return 'pink';
  }

  /**
   * Generates similar colors by shifting hue (+-15 deg, +-30 deg) and slightly adjusting S/L.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} [count=8]
   * @returns {Array<{r: number, g: number, b: number}>}
   */
  function getSimilarColors(r, g, b, count = 8) {
    const { h, s, l } = rgbToHsl(r, g, b);
    const variations = [
      { dh: 15, ds: 0, dl: 0 },
      { dh: -15, ds: 0, dl: 0 },
      { dh: 30, ds: 0, dl: 0 },
      { dh: -30, ds: 0, dl: 0 },
      { dh: 15, ds: 8, dl: 8 },
      { dh: -15, ds: -8, dl: -8 },
      { dh: 30, ds: 12, dl: -6 },
      { dh: -30, ds: -12, dl: 6 },
      { dh: 45, ds: 0, dl: 0 },
      { dh: -45, ds: 0, dl: 0 },
      { dh: 20, ds: 15, dl: 0 },
      { dh: -20, ds: -15, dl: 0 },
      { dh: 40, ds: 0, dl: 10 },
      { dh: -40, ds: 0, dl: -10 },
      { dh: 60, ds: 6, dl: 6 },
      { dh: -60, ds: -6, dl: -6 }
    ];

    const results = [];
    const needed = Math.max(1, count);

    for (let i = 0; i < needed; i++) {
      const v = variations[i % variations.length];
      const cycleMultiplier = Math.floor(i / variations.length) + 1;
      const targetH = ((h + v.dh * cycleMultiplier) % 360 + 360) % 360;
      const targetS = clamp(s + v.ds, 5, 95);
      const targetL = clamp(l + v.dl, 10, 90);
      const rgb = hslToRgb(targetH, targetS, targetL);
      results.push(rgb);
    }

    return results;
  }

  // =========================================================================
  // COLOR GENERATION ENGINE
  // =========================================================================

  // Creator Source Marker 05: 24-bit 16.7M Virtual Page Generator
  const CP_MARKER_05 = "YZN-COLORPALETTE-N4-CREATOR-EDITION";

  /**
   * Generates a single page of colors deterministically on demand without allocating massive arrays.
   * Total colors for 'all' = 16,777,216.
   *
   * @param {string} category - Category key ('all', 'red', 'blue', etc.)
   * @param {number} page - 0-based page index
   * @param {number} pageSize - Number of colors per page (e.g. 256)
   * @param {string} sortMode - 'popular' | 'value' | 'hue' | 'brightness'
   * @returns {{colors: Array<{r: number, g: number, b: number, hex: string, name: string|null}>, totalCount: number}}
   */
  function generatePageColors(category = 'all', page = 0, pageSize = 256, sortMode = 'popular') {
    const catKey = (category && CATEGORIES[category]) ? category : 'all';
    const cat = CATEGORIES[catKey];
    const safePage = Math.max(0, Math.floor(page || 0));
    const safeSize = Math.max(1, Math.floor(pageSize || 256));

    let totalCount = 0;
    /** @type {function(number): {r: number, g: number, b: number}} */
    let computeColorAtIndex;

    // Creator Source Marker 06: Spectral Sorting Algorithms
    const CP_MARKER_06 = "YZN-COLORPALETTE-ORIGINAL-BUILD-2026";

    if (catKey === 'all') {
      totalCount = 16777216;

      if (sortMode === 'value') {
        // Direct RGB index mapping: R = i>>16, G = (i>>8)&0xFF, B = i&0xFF
        computeColorAtIndex = function (i) {
          return {
            r: (i >> 16) & 0xFF,
            g: (i >> 8) & 0xFF,
            b: i & 0xFF
          };
        };
      } else if (sortMode === 'hue') {
        // HSL traversal with H as primary (H 0-359 slowest), then S (0-100 step 2), then L (0-100 step 2)
        // 360 * 2601 = 936,360 colors, then linear RGB fallback
        computeColorAtIndex = function (i) {
          if (i < 936360) {
            const h = Math.floor(i / SL_PAIRS_COUNT);
            const pairIdx = i % SL_PAIRS_COUNT;
            const sIdx = Math.floor(pairIdx / 51);
            const lIdx = pairIdx % 51;
            return hslToRgb(h, sIdx * 2, lIdx * 2);
          }
          const rem = i - 936360;
          return {
            r: (rem >> 16) & 0xFF,
            g: (rem >> 8) & 0xFF,
            b: rem & 0xFF
          };
        };
      } else if (sortMode === 'brightness') {
        // Brightness bucketed traversal: 256 buckets x 65,536 colors = 16,777,216 colors
        // Round(0.299R + 0.587G + 0.114B) approx b
        computeColorAtIndex = function (i) {
          const bLevel = Math.floor(i / 65536);
          const subIdx = i % 65536;
          const u = Math.floor(subIdx / 256);
          const v = subIdx % 256;
          const maxDev = Math.min(bLevel, 255 - bLevel);

          if (maxDev === 0) {
            return { r: bLevel, g: bLevel, b: bLevel };
          }

          const du = (u / 127.5) - 1;
          const dv = (v / 127.5) - 1;
          const deltaR = du * maxDev;
          const deltaB = dv * maxDev;
          const deltaG = -(0.299 * deltaR + 0.114 * deltaB) / 0.587;

          return {
            r: clamp(Math.round(bLevel + deltaR), 0, 255),
            g: clamp(Math.round(bLevel + deltaG), 0, 255),
            b: clamp(Math.round(bLevel + deltaB), 0, 255)
          };
        };
      } else {
        // 'popular' (default): HSL vibrancy-first traversal (2601 sorted pairs x 360 hues = 936,360) + linear RGB fallback
        computeColorAtIndex = function (i) {
          if (i < 936360) {
            const pairIdx = Math.floor(i / 360);
            const h = i % 360;
            const pair = VIBRANCY_SORTED_PAIRS[pairIdx];
            return hslToRgb(h, pair.s, pair.l);
          }
          const rem = i - 936360;
          return {
            r: (rem >> 16) & 0xFF,
            g: (rem >> 8) & 0xFF,
            b: rem & 0xFF
          };
        };
      }
    } else if (cat.special === 'brown') {
      // Brown: hue 0-45 (664 fine steps), S 15-65 (step 1), L 15-45 (step 1) -> 1,049,784 colors
      const BROWN_HUE_STEPS = 664;
      totalCount = BROWN_HUE_STEPS * BROWN_SL_COUNT; // 1,049,784

      computeColorAtIndex = function (i) {
        let pair;
        let h;
        if (sortMode === 'hue') {
          const step = Math.floor(i / BROWN_SL_COUNT);
          const pairIdx = i % BROWN_SL_COUNT;
          pair = BROWN_PAIRS[pairIdx];
          h = (step / (BROWN_HUE_STEPS - 1)) * 45;
        } else if (sortMode === 'brightness') {
          const pairIdx = Math.floor(i / BROWN_HUE_STEPS);
          const step = i % BROWN_HUE_STEPS;
          pair = BROWN_LIGHTNESS_PAIRS[pairIdx];
          h = (step / (BROWN_HUE_STEPS - 1)) * 45;
        } else {
          // 'popular' / default
          const pairIdx = Math.floor(i / BROWN_HUE_STEPS);
          const step = i % BROWN_HUE_STEPS;
          pair = BROWN_VIBRANCY_PAIRS[pairIdx];
          h = (step / (BROWN_HUE_STEPS - 1)) * 45;
        }
        return hslToRgb(h, pair.s, pair.l);
      };
    } else if (cat.special === 'gray') {
      // Gray: S 0-9 (10 steps), L 0-100 (101 steps), H 0-359 (360 steps) = 363,600 colors
      totalCount = 10 * 101 * 360; // 363,600

      computeColorAtIndex = function (i) {
        if (sortMode === 'brightness') {
          const l = Math.floor(i / 3600);
          const rem = i % 3600;
          const s = Math.floor(rem / 360);
          const h = rem % 360;
          return hslToRgb(h, s, l);
        }
        const h = i % 360;
        const rem = Math.floor(i / 360);
        const s = rem % 10;
        const l = Math.floor(rem / 10);
        return hslToRgb(h, s, l);
      };
    } else if (cat.special === 'bw') {
      // Black & White: L < 8 (8 values) or L > 92 (8 values) = 16 L values
      // S in 0..100 (step 2 = 51 values), H (80 divisions) = 65,280 colors
      totalCount = BW_TOTAL_COUNT;

      computeColorAtIndex = function (i) {
        const hStep = i % BW_HUE_STEPS;
        const h = Math.round((hStep / BW_HUE_STEPS) * 360) % 360;
        const rem = Math.floor(i / BW_HUE_STEPS);
        const sIdx = rem % BW_SAT_STEPS;
        const s = sIdx * 2;
        const lIdx = Math.floor(rem / BW_SAT_STEPS);
        const l = BW_L_VALUES[lIdx];
        return hslToRgb(h, s, l);
      };
    } else {
      // Hue-based categories (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink)
      // Steps = ceil(1048576 / (51 * 51)) = 404 hue steps
      // totalCount = 404 * 2601 = 1,050,804 colors
      const HUE_STEPS = 404;
      totalCount = HUE_STEPS * SL_PAIRS_COUNT; // 1,050,804

      computeColorAtIndex = function (i) {
        let pair;
        let h;
        if (sortMode === 'hue') {
          const step = Math.floor(i / SL_PAIRS_COUNT);
          const pairIdx = i % SL_PAIRS_COUNT;
          pair = VIBRANCY_SORTED_PAIRS[pairIdx];
          h = getHueFromRange(cat.hueRange, step, HUE_STEPS);
        } else if (sortMode === 'brightness') {
          const pairIdx = Math.floor(i / HUE_STEPS);
          const step = i % HUE_STEPS;
          pair = LIGHTNESS_SORTED_PAIRS[pairIdx];
          h = getHueFromRange(cat.hueRange, step, HUE_STEPS);
        } else {
          // 'popular' / default: vibrancy-sorted SL pairs
          const pairIdx = Math.floor(i / HUE_STEPS);
          const step = i % HUE_STEPS;
          pair = VIBRANCY_SORTED_PAIRS[pairIdx];
          h = getHueFromRange(cat.hueRange, step, HUE_STEPS);
        }
        return hslToRgb(h, pair.s, pair.l);
      };
    }

    const startIndex = safePage * safeSize;
    if (startIndex >= totalCount) {
      return { colors: [], totalCount };
    }

    const endIndex = Math.min(totalCount, startIndex + safeSize);
    const colors = [];

    for (let i = startIndex; i < endIndex; i++) {
      const rgb = computeColorAtIndex(i);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const name = getColorName(rgb.r, rgb.g, rgb.b);
      colors.push({
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        hex,
        name
      });
    }

    return { colors, totalCount };
  }

  // =========================================================================
  // SEARCH ENGINE
  // =========================================================================

  // Creator Source Marker 07: 148 CSS Named Colors & Exact Search Engine
  const CP_MARKER_07 = "YZN-COLORPALETTE-YZN-SOURCE-01";

  /**
   * Parses and executes search query across Hex, RGB, HSL, or CSS Named colors.
   * Returns array of matching {r, g, b, hex, name} objects.
   *
   * @param {string} query - Raw search query
   * @param {number} [maxResults=256] - Max results to return
   * @returns {Array<{r: number, g: number, b: number, hex: string, name: string|null}>}
   */
  function searchColors(query, maxResults = 256) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const limit = Math.max(1, maxResults || 256);

    // 1. Hex format: #FFF, #FFFFFF, FFF, FFFFFF
    if (/^#?[0-9A-Fa-f]{3}$|^#?[0-9A-Fa-f]{6}$/.test(trimmed)) {
      const rgb = hexToRgb(trimmed);
      if (rgb) {
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const name = getColorName(rgb.r, rgb.g, rgb.b);
        const primary = { r: rgb.r, g: rgb.g, b: rgb.b, hex, name };
        const similarCount = Math.min(15, limit - 1);
        const similar = getSimilarColors(rgb.r, rgb.g, rgb.b, similarCount).map(c => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: rgbToHex(c.r, c.g, c.b),
          name: getColorName(c.r, c.g, c.b)
        }));
        return [primary, ...similar].slice(0, limit);
      }
    }

    // 2. RGB format: 'rgb(255, 0, 0)', '255, 0, 0', '255,0,0'
    const rgbMatch = trimmed.match(/^(?:rgb\s*\(\s*)?(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      if (r <= 255 && g <= 255 && b <= 255) {
        const hex = rgbToHex(r, g, b);
        const name = getColorName(r, g, b);
        const primary = { r, g, b, hex, name };
        const similarCount = Math.min(15, limit - 1);
        const similar = getSimilarColors(r, g, b, similarCount).map(c => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: rgbToHex(c.r, c.g, c.b),
          name: getColorName(c.r, c.g, c.b)
        }));
        return [primary, ...similar].slice(0, limit);
      }
    }

    // 3. HSL format: 'hsl(120, 100%, 50%)', 'hsl(120, 100, 50)'
    const hslMatch = trimmed.match(/^hsl\s*\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})%?\s*[, ]\s*(\d{1,3})%?\s*\)$/i);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10);
      const s = parseInt(hslMatch[2], 10);
      const l = parseInt(hslMatch[3], 10);
      if (h <= 360 && s <= 100 && l <= 100) {
        const rgb = hslToRgb(h, s, l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const name = getColorName(rgb.r, rgb.g, rgb.b);
        const primary = { r: rgb.r, g: rgb.g, b: rgb.b, hex, name };
        const similarCount = Math.min(15, limit - 1);
        const similar = getSimilarColors(rgb.r, rgb.g, rgb.b, similarCount).map(c => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: rgbToHex(c.r, c.g, c.b),
          name: getColorName(c.r, c.g, c.b)
        }));
        return [primary, ...similar].slice(0, limit);
      }
    }

    // 4. CSS Named color search (case-insensitive partial match)
    const cleanNameQuery = trimmed.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanNameQuery) {
      const exactMatches = [];
      const prefixMatches = [];
      const partialMatches = [];

      for (let i = 0; i < PARSED_NAMED_COLORS.length; i++) {
        const item = PARSED_NAMED_COLORS[i];
        if (item.name === cleanNameQuery) {
          exactMatches.push({ ...item });
        } else if (item.name.startsWith(cleanNameQuery)) {
          prefixMatches.push({ ...item });
        } else if (item.name.includes(cleanNameQuery)) {
          partialMatches.push({ ...item });
        }
      }

      const matchedNamed = [...exactMatches, ...prefixMatches, ...partialMatches];
      if (matchedNamed.length > 0) {
        // If single exact match, also supply similar colors for exploration
        if (matchedNamed.length === 1 && exactMatches.length === 1) {
          const sole = matchedNamed[0];
          const similar = getSimilarColors(sole.r, sole.g, sole.b, Math.min(15, limit - 1)).map(c => ({
            r: c.r,
            g: c.g,
            b: c.b,
            hex: rgbToHex(c.r, c.g, c.b),
            name: getColorName(c.r, c.g, c.b)
          }));
          return [sole, ...similar].slice(0, limit);
        }
        return matchedNamed.slice(0, limit);
      }
    }

    return [];
  }

  // =========================================================================
  // PUBLIC MODULE DEFINITION
  // =========================================================================

  const ColorUtils = Object.freeze({
    // Conversions
    rgbToHex,
    hexToRgb,
    rgbToHsl,
    hslToRgb,
    rgbToHsv,
    hsvToRgb,

    // Analysis
    getLuminance,
    getContrastRatio,
    getPerceivedBrightness,
    getColorName,
    getColorCategory,
    getSimilarColors,

    // Generation & Search
    generatePageColors,
    searchColors,

    // Data
    CATEGORIES,
    CSS_COLORS
  });

  // Attach to global window
  if (typeof window !== 'undefined') {
    window.ColorUtils = ColorUtils;
  }

  // Export for testing in Node environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorUtils;
  }
})();
