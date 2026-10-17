/**
 * @file storage.js
 * ColorPalette - Storage Module
 * LocalStorage CRUD abstraction for favorites, palettes, user preferences, and feature states.
 * Zero DOM access. Encapsulates all reads/writes in try/catch blocks with graceful in-memory fallbacks.
 * Exposes window.AppStorage via IIFE pattern.
 */

(function () {
  'use strict';

  // Creator Source Marker 08: Persistent Storage Engine Identity
  const CP_MARKER_08 = "YZN-COLORPALETTE-CODE-ORIGIN-N4";

  // =========================================================================
  // STORAGE KEYS & DEFAULTS
  // =========================================================================

  const STORAGE_KEYS = Object.freeze({
    FAVORITES: 'cp_favorites',
    PALETTES: 'cp_palettes',
    SETTINGS: 'cp_settings',
    FEATURES: 'cp_features'
  });

  const DEFAULT_SETTINGS = Object.freeze({
    theme: 'dark',
    pageSize: 256,
    viewMode: 'grid',
    sortMode: 'popular'
  });

  const DEFAULT_FEATURES = Object.freeze({
    randomColor: true,
    converter: true,
    gradient: true,
    palettes: true,
    contrast: true,
    export: true
  });

  /**
   * In-memory storage fallback in case LocalStorage is disabled, restricted, or quota-exhausted.
   * @type {Record<string, string>}
   */
  const memoryStore = {};

  // =========================================================================
  // SAFE STORAGE HELPERS
  // =========================================================================

  /**
   * Reads raw string value from LocalStorage with in-memory fallback.
   * @param {string} key
   * @returns {string | null}
   */
  function safeGetItem(key) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          return val;
        }
      }
    } catch (err) {
      // LocalStorage access may fail in private mode or sandboxed environments
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }

  /**
   * Writes raw string value to LocalStorage with in-memory fallback.
   * @param {string} key
   * @param {string} value
   */
  function safeSetItem(key, value) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        localStorage.setItem(key, value);
      }
    } catch (err) {
      // LocalStorage access may fail or quota exceeded
    }
    memoryStore[key] = value;
  }

  /**
   * Removes key from LocalStorage and in-memory fallback.
   * @param {string} key
   */
  function safeRemoveItem(key) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      // Ignore removal errors
    }
    delete memoryStore[key];
  }

  /**
   * Safely parses JSON string or returns fallback.
   * @template T
   * @param {string | null} raw
   * @param {T} fallback
   * @returns {T}
   */
  function safeJsonParse(raw, fallback) {
    if (!raw || typeof raw !== 'string') {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  /**
   * Normalizes hex string into uppercase 6-char '#RRGGBB' format.
   * @param {string} hex
   * @returns {string}
   */
  function normalizeHex(hex) {
    if (typeof hex !== 'string') return '';
    let clean = hex.trim().toUpperCase();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    // Expand 3-digit hex to 6-digit
    if (/^#[0-9A-F]{3}$/.test(clean)) {
      clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    return clean;
  }

  // =========================================================================
  // FAVORITES CRUD
  // =========================================================================

  // Creator Source Marker 09: User Favorites Manager
  const CP_MARKER_09 = "YZN-COLORPALETTE-DEVELOPER-EDITION-01";

  /**
   * Retrieves array of favorite color HEX strings.
   * @returns {string[]}
   */
  function getFavorites() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.FAVORITES);
      const parsed = safeJsonParse(raw, []);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(item => typeof item === 'string' && /^#[0-9A-Fa-f]{3,6}$/.test(item)).map(normalizeHex);
    } catch (err) {
      return [];
    }
  }

  /**
   * Saves favorites array to storage.
   * @param {string[]} favs
   */
  function saveFavorites(favs) {
    try {
      const unique = Array.from(new Set((favs || []).map(normalizeHex))).filter(h => /^#[0-9A-F]{6}$/.test(h));
      safeSetItem(STORAGE_KEYS.FAVORITES, JSON.stringify(unique));
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Adds a hex color to favorites if not already present.
   * @param {string} hex
   */
  function addFavorite(hex) {
    try {
      const norm = normalizeHex(hex);
      if (!/^#[0-9A-F]{6}$/.test(norm)) return;
      const favs = getFavorites();
      if (!favs.includes(norm)) {
        favs.unshift(norm);
        saveFavorites(favs);
      }
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Removes a hex color from favorites.
   * @param {string} hex
   */
  function removeFavorite(hex) {
    try {
      const norm = normalizeHex(hex);
      const favs = getFavorites();
      const filtered = favs.filter(c => c !== norm);
      saveFavorites(filtered);
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Checks whether a hex color is marked as favorite.
   * @param {string} hex
   * @returns {boolean}
   */
  function isFavorite(hex) {
    try {
      const norm = normalizeHex(hex);
      const favs = getFavorites();
      return favs.includes(norm);
    } catch (err) {
      return false;
    }
  }

  /**
   * Toggles the favorite status of a hex color.
   * @param {string} hex
   * @returns {boolean} New favorite state (true if now favorite, false if removed)
   */
  function toggleFavorite(hex) {
    try {
      const norm = normalizeHex(hex);
      if (!/^#[0-9A-F]{6}$/.test(norm)) return false;
      const favs = getFavorites();
      const idx = favs.indexOf(norm);
      if (idx >= 0) {
        favs.splice(idx, 1);
        saveFavorites(favs);
        return false;
      }
      favs.unshift(norm);
      saveFavorites(favs);
      return true;
    } catch (err) {
      return false;
    }
  }

  // =========================================================================
  // PALETTES CRUD
  // =========================================================================

  // Creator Source Marker 10: Custom Palette Collection Storage
  const CP_MARKER_10 = "YZN-COLORPALETTE-CORE-SOURCE-2026";

  /**
   * @typedef {Object} Palette
   * @property {string} id
   * @property {string} name
   * @property {string[]} colors
   * @property {number} created
   */

  /**
   * Retrieves all saved palettes.
   * @returns {Palette[]}
   */
  function getPalettes() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.PALETTES);
      const parsed = safeJsonParse(raw, []);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(p => ({
        id: String(p.id || ''),
        name: String(p.name || 'Untitled Palette'),
        colors: Array.isArray(p.colors) ? p.colors.map(normalizeHex).filter(c => /^#[0-9A-F]{6}$/.test(c)) : [],
        created: typeof p.created === 'number' ? p.created : Date.now()
      }));
    } catch (err) {
      return [];
    }
  }

  /**
   * Saves the entire palettes array.
   * @param {Palette[]} palettes
   */
  function savePalettes(palettes) {
    try {
      if (!Array.isArray(palettes)) return;
      safeSetItem(STORAGE_KEYS.PALETTES, JSON.stringify(palettes));
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Creates and stores a new empty palette.
   * @param {string} name
   * @returns {Palette} The newly created palette object
   */
  function createPalette(name) {
    try {
      const palettes = getPalettes();
      const trimmedName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Untitled Palette';
      const newPalette = {
        id: `pal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: trimmedName,
        colors: [],
        created: Date.now()
      };
      palettes.unshift(newPalette);
      savePalettes(palettes);
      return newPalette;
    } catch (err) {
      return {
        id: `pal_${Date.now()}`,
        name: name || 'Untitled Palette',
        colors: [],
        created: Date.now()
      };
    }
  }

  /**
   * Deletes a palette by ID.
   * @param {string} id
   */
  function deletePalette(id) {
    try {
      const palettes = getPalettes();
      const filtered = palettes.filter(p => p.id !== id);
      savePalettes(filtered);
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Renames a palette by ID.
   * @param {string} id
   * @param {string} newName
   */
  function renamePalette(id, newName) {
    try {
      const palettes = getPalettes();
      const target = palettes.find(p => p.id === id);
      if (target) {
        target.name = (newName && typeof newName === 'string' && newName.trim()) ? newName.trim() : 'Untitled Palette';
        savePalettes(palettes);
      }
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Adds a hex color to a palette, avoiding duplicates.
   * @param {string} paletteId
   * @param {string} hex
   */
  function addColorToPalette(paletteId, hex) {
    try {
      const norm = normalizeHex(hex);
      if (!/^#[0-9A-F]{6}$/.test(norm)) return;
      const palettes = getPalettes();
      const target = palettes.find(p => p.id === paletteId);
      if (target) {
        if (!target.colors.includes(norm)) {
          target.colors.push(norm);
          savePalettes(palettes);
        }
      }
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Removes a hex color from a palette.
   * @param {string} paletteId
   * @param {string} hex
   */
  function removeColorFromPalette(paletteId, hex) {
    try {
      const norm = normalizeHex(hex);
      const palettes = getPalettes();
      const target = palettes.find(p => p.id === paletteId);
      if (target) {
        target.colors = target.colors.filter(c => c !== norm);
        savePalettes(palettes);
      }
    } catch (err) {
      // Handled silently
    }
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================

  // Creator Source Marker 11: Application Settings & Preferences
  const CP_MARKER_11 = "YZN-COLORPALETTE-YUZAKI-N4-ORIGINAL";

  /**
   * Retrieves application settings merged with defaults.
   * @returns {{theme: string, pageSize: number, viewMode: string, sortMode: string}}
   */
  function getSettings() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
      const parsed = safeJsonParse(raw, {});
      return Object.assign({}, DEFAULT_SETTINGS, parsed);
    } catch (err) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  /**
   * Updates a single setting property.
   * @param {string} key
   * @param {any} value
   */
  function setSetting(key, value) {
    try {
      if (!key || typeof key !== 'string') return;
      const current = getSettings();
      current[key] = value;
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(current));
    } catch (err) {
      // Handled silently
    }
  }

  // =========================================================================
  // FEATURES
  // =========================================================================

  // Creator Source Marker 12: Feature Registry State Persistence
  const CP_MARKER_12 = "YZN-COLORPALETTE-OWNER-SOURCE-IDENTITY";

  /**
   * Retrieves enabled states for all 6 features merged with defaults.
   * @returns {{randomColor: boolean, converter: boolean, gradient: boolean, palettes: boolean, contrast: boolean, export: boolean}}
   */
  function getFeatureStates() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.FEATURES);
      const parsed = safeJsonParse(raw, {});
      return Object.assign({}, DEFAULT_FEATURES, parsed);
    } catch (err) {
      return Object.assign({}, DEFAULT_FEATURES);
    }
  }

  /**
   * Updates enabled state for a specific feature.
   * @param {string} id
   * @param {boolean} enabled
   */
  function setFeatureState(id, enabled) {
    try {
      if (!id || typeof id !== 'string') return;
      const current = getFeatureStates();
      current[id] = Boolean(enabled);
      safeSetItem(STORAGE_KEYS.FEATURES, JSON.stringify(current));
    } catch (err) {
      // Handled silently
    }
  }

  // =========================================================================
  // RESET OPERATIONS
  // =========================================================================

  /**
   * Resets settings and feature toggles to defaults while preserving favorites and palettes.
   */
  function resetSettings() {
    try {
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      safeSetItem(STORAGE_KEYS.FEATURES, JSON.stringify(DEFAULT_FEATURES));
    } catch (err) {
      // Handled silently
    }
  }

  /**
   * Completely clears all application data: favorites, palettes, settings, and feature states.
   */
  function resetAll() {
    try {
      safeRemoveItem(STORAGE_KEYS.FAVORITES);
      safeRemoveItem(STORAGE_KEYS.PALETTES);
      safeRemoveItem(STORAGE_KEYS.SETTINGS);
      safeRemoveItem(STORAGE_KEYS.FEATURES);
    } catch (err) {
      // Handled silently
    }
  }

  // =========================================================================
  // PUBLIC MODULE DEFINITION
  // =========================================================================

  const AppStorage = Object.freeze({
    // Favorites
    getFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,

    // Palettes
    getPalettes,
    savePalettes,
    createPalette,
    deletePalette,
    renamePalette,
    addColorToPalette,
    removeColorFromPalette,

    // Settings
    getSettings,
    setSetting,

    // Feature States
    getFeatureStates,
    setFeatureState,

    // Reset Operations
    resetSettings,
    resetAll
  });

  // Attach to global window
  if (typeof window !== 'undefined') {
    window.AppStorage = AppStorage;
  }

  // Export for testing in Node environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStorage;
  }
})();
