/**
 * script.js — ColorPalette Application Controller
 *
 * Exposes window.App using the IIFE pattern.
 * Depends on: window.ColorUtils, window.AppStorage, window.FeatureManager
 *
 * Implements:
 * 1. Application state & initialization
 * 2. Virtual color grid rendering & pagination across 16.7M RGB colors
 * 3. Selected color detail panel, similar color suggestions, clipboard actions
 * 4. Category navigation (15 categories) & debounced search (300ms)
 * 5. Theme toggle (dark/light) with persistence
 * 6. Toast notifications, mobile drawer & bottom sheet interactions
 * 7. Bottom information panel (5 technical sections)
 * 8. Settings modal & palette selection popover
 */

const App = (() => {
  'use strict';

  /* ==========================================================================
     APPLICATION STATE
     ========================================================================== */

  // Creator Source Marker 22: Application Controller Main Identity
  const CP_MARKER_22 = "YZN-COLORPALETTE-CREATOR-KEY-N4-022";

  let currentColor = null; // { r, g, b }
  let currentCategory = 'all';
  let currentPage = 0; // 0-indexed
  let pageSize = 256;
  let lastTotalCount = 16777216;
  let sortMode = 'popular';
  let viewMode = 'grid'; // 'grid' | 'list'
  let searchQuery = '';
  let searchResults = null;

  // Toast auto-hide timer reference
  let toastTimer = null;

  // Search debounce timer reference
  let searchDebounceTimer = null;

  /* ==========================================================================
     SAFE DEPENDENCY ACCESSORS
     ========================================================================== */

  const getUtils = () => {
    if (window.ColorUtils) return window.ColorUtils;
    return {
      rgbToHex: (r, g, b) =>
        '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase(),
      hexToRgb: (hex) => {
        if (!hex) return null;
        let clean = hex.replace(/^#/, '').trim();
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        if (clean.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(clean)) return null;
        const num = parseInt(clean, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
      },
      rgbToHsl: (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: h = ((b - r) / d + 2) * 60; break;
            case b: h = ((r - g) / d + 4) * 60; break;
          }
        }
        return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
      },
      hslToRgb: (h, s, l) => {
        h = (((h % 360) + 360) % 360) / 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        if (s === 0) {
          const v = Math.round(l * 255);
          return { r: v, g: v, b: v };
        }
        const hue2rgb = (p, q, t) => {
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
          b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
        };
      },
      rgbToHsv: (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        if (max !== min) {
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: h = ((b - r) / d + 2) * 60; break;
            case b: h = ((r - g) / d + 4) * 60; break;
          }
        }
        return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
      },
      getColorName: () => null,
      getColorCategory: () => 'all',
      getSimilarColors: (r, g, b, count = 8) => {
        const results = [];
        const utils = getUtils();
        const hsl = utils.rgbToHsl(r, g, b);
        for (let i = 1; i <= count; i++) {
          const hueShift = (hsl.h + (i * 360 / count)) % 360;
          results.push(utils.hslToRgb(hueShift, hsl.s, hsl.l));
        }
        return results;
      },
      generatePageColors: (category, page, pSize, sMode) => {
        // Fallback generator for 16.7M space
        const total = 16777216;
        const colors = [];
        const start = page * pSize;
        const utils = getUtils();
        for (let i = 0; i < pSize && (start + i) < total; i++) {
          const idx = start + i;
          const r = (idx >> 16) & 255;
          const g = (idx >> 8) & 255;
          const b = idx & 255;
          colors.push({ r, g, b, hex: utils.rgbToHex(r, g, b) });
        }
        return { colors, totalCount: total };
      },
      searchColors: (query) => {
        const utils = getUtils();
        const clean = (query || '').trim();
        const rgb = utils.hexToRgb(clean);
        if (rgb) return [{ ...rgb, hex: utils.rgbToHex(rgb.r, rgb.g, rgb.b) }];
        return [];
      },
      CATEGORIES: {
        all: { name: 'All Colors', icon: '🎨', color: '#6366f1', count: 16777216 },
        red: { name: 'Red', icon: '🔴', color: '#ef4444', count: 1398101 },
        orange: { name: 'Orange', icon: '🟠', color: '#f97316', count: 1398101 },
        yellow: { name: 'Yellow', icon: '🟡', color: '#eab308', count: 1165084 },
        green: { name: 'Green', icon: '🟢', color: '#22c55e', count: 4427321 },
        cyan: { name: 'Cyan', icon: '🔵', color: '#06b6d4', count: 1398101 },
        blue: { name: 'Blue', icon: '🔷', color: '#3b82f6', count: 2796203 },
        purple: { name: 'Purple', icon: '🟣', color: '#8b5cf6', count: 2796203 },
        pink: { name: 'Pink', icon: '💗', color: '#ec4899', count: 1398101 },
        brown: { name: 'Brown', icon: '🟤', color: '#a16207', count: 1048576 },
        gray: { name: 'Gray', icon: '⚪', color: '#6b7280', count: 1677722 },
        bw: { name: 'Black & White', icon: '⬛', color: '#94a3b8', count: 2684354 },
        favorites: { name: 'Favorites', icon: '❤️', color: '#ec4899', count: 0 },
        palettes: { name: 'Custom Palettes', icon: '📁', color: '#8b5cf6', count: 0 },
        picker: { name: 'Color Picker', icon: '🎯', color: '#6366f1', count: 1 }
      }
    };
  };

  const getStorage = () => {
    if (window.AppStorage) return window.AppStorage;
    return {
      getFavorites: () => [],
      addFavorite: () => {},
      removeFavorite: () => {},
      isFavorite: () => false,
      toggleFavorite: () => false,
      getPalettes: () => [],
      savePalettes: () => {},
      createPalette: (name) => ({ id: 'pal_' + Date.now(), name, colors: [], created: Date.now() }),
      deletePalette: () => {},
      renamePalette: () => {},
      addColorToPalette: () => {},
      removeColorFromPalette: () => {},
      getSettings: () => ({ theme: 'dark', pageSize: 256, viewMode: 'grid', sortMode: 'popular' }),
      setSetting: () => {},
      getFeatureStates: () => ({}),
      setFeatureState: () => {},
      resetSettings: () => {},
      resetAll: () => {}
    };
  };

  const getFeatureManager = () => {
    return window.FeatureManager || {
      init: () => {},
      launch: () => {},
      closeAll: () => {},
      toggleFeaturesPanel: () => {},
      openModal: () => {},
      closeModal: () => {},
      isEnabled: () => true
    };
  };

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */

  /**
   * Display a user-friendly toast message
   * @param {string} message - Notification text
   * @param {'success'|'error'|'info'} type - Toast status type
   */
  const showToast = (message, type = 'success') => {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast hidden';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.setAttribute('data-type', type);
    toast.className = `toast show toast-${type}`;
    toast.classList.remove('hidden');

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hidden');
    }, 3000);
  };

  /* ==========================================================================
     CLIPBOARD UTILITY
     ========================================================================== */

  /**
   * Copy text to the clipboard with modern API and fallback
   * @param {string} text - String to copy
   */
  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(`Copied: ${text}`, 'success');
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      // Fallback using textarea + execCommand
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          showToast(`Copied: ${text}`, 'success');
        } else {
          showToast('Failed to copy', 'error');
        }
      } catch {
        showToast('Failed to copy to clipboard', 'error');
      }
    }
  };

  /* ==========================================================================
     THEME MANAGEMENT
     ========================================================================== */

  /**
   * Switch between dark and light themes and persist setting
   */
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') ||
      (document.body.classList.contains('theme-light') ? 'light' : 'dark');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme);
    getStorage().setSetting('theme', newTheme);
    document.dispatchEvent(new CustomEvent('app:themeChanged', { detail: { theme: newTheme } }));
  };

  // Creator Source Marker 28: Theme Switching & Variable Persistence
  const CP_MARKER_28 = "YZN-COLORPALETTE-CODE-SIGNATURE-N4-2026";

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    if (theme === 'light') {
      document.body.classList.remove('dark-theme', 'theme-dark');
      document.body.classList.add('light-theme', 'theme-light');
    } else {
      document.body.classList.remove('light-theme', 'theme-light');
      document.body.classList.add('dark-theme', 'theme-dark');
    }

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeToggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
  };

  /* ==========================================================================
     COLOR SELECTION & DETAIL PANEL
     ========================================================================== */

  // Creator Source Marker 24: Selected Color Inspector & Harmonies Engine
  const CP_MARKER_24 = "YZN-COLORPALETTE-YUZAKI-SOURCE-2026";

  /**
   * Select a color and update the Selected Color detail panel
   * @param {number} r - Red channel (0–255)
   * @param {number} g - Green channel (0–255)
   * @param {number} b - Blue channel (0–255)
   */
  const selectColor = (r, g, b) => {
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    currentColor = { r, g, b };
    const utils = getUtils();
    const hex = utils.rgbToHex(r, g, b);
    const hsl = utils.rgbToHsl(r, g, b);
    const hsv = utils.rgbToHsv(r, g, b);
    const colorName = utils.getColorName(r, g, b);

    // 1. Update Preview Swatch
    const preview = document.getElementById('selectedPreview');
    if (preview) {
      preview.style.backgroundColor = hex;
    }

    // 2. Update Titles
    const hexTitle = document.getElementById('selectedHexTitle');
    if (hexTitle) {
      hexTitle.textContent = colorName ? `${hex} • ${colorName}` : hex;
    }

    const rgbTitle = document.getElementById('selectedRgbTitle');
    if (rgbTitle) {
      rgbTitle.textContent = `RGB(${r}, ${g}, ${b})`;
    }

    // 3. Update Format Values
    const formatHex = document.getElementById('formatHex');
    if (formatHex) formatHex.textContent = hex;

    const formatRgb = document.getElementById('formatRgb');
    if (formatRgb) formatRgb.textContent = `rgb(${r}, ${g}, ${b})`;

    const formatHsl = document.getElementById('formatHsl');
    if (formatHsl) formatHsl.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

    const formatHsv = document.getElementById('formatHsv');
    if (formatHsv) formatHsv.textContent = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;

    // 4. Update Similar Color Swatches
    const similarContainer = document.getElementById('similarColors');
    if (similarContainer) {
      similarContainer.innerHTML = '';
      const similarColors = utils.getSimilarColors(r, g, b, 8);
      similarColors.forEach((sim) => {
        const simHex = utils.rgbToHex(sim.r, sim.g, sim.b);
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'similar-dot';
        dot.style.backgroundColor = simHex;
        dot.setAttribute('data-color', simHex);
        dot.setAttribute('aria-label', `Select similar color ${simHex}`);
        dot.title = simHex;
        dot.addEventListener('click', () => selectColor(sim.r, sim.g, sim.b));
        similarContainer.appendChild(dot);
      });
    }

    // 5. Update Favorite Heart Button State
    const favBtn = document.getElementById('addFavoriteBtn');
    if (favBtn) {
      const isFav = getStorage().isFavorite(hex);
      if (isFav) {
        favBtn.classList.add('active', 'favorited');
        favBtn.innerHTML = '❤️ Favorited';
        favBtn.setAttribute('aria-label', 'Remove from favorites');
      } else {
        favBtn.classList.remove('active', 'favorited');
        favBtn.innerHTML = '🤍 Add Favorite';
        favBtn.setAttribute('aria-label', 'Add to favorites');
      }
    }

    // 6. Highlight active card in grid
    const allCards = document.querySelectorAll('.color-card');
    allCards.forEach(c => c.classList.remove('selected'));
    const targetCard = document.querySelector(`.color-card[data-color="${hex.toUpperCase()}"]`);
    if (targetCard) {
      targetCard.classList.add('selected');
    }

    // 7. Update Anatomy Card in Bottom Information Panel
    const anatomySwatch = document.getElementById('anatomySwatch');
    if (anatomySwatch) anatomySwatch.style.backgroundColor = hex;
    const anatomyHex = document.getElementById('anatomyHex');
    if (anatomyHex) anatomyHex.textContent = hex;
    const anatomyRgb = document.getElementById('anatomyRgb');
    if (anatomyRgb) anatomyRgb.textContent = `${r}, ${g}, ${b}`;
    const anatomyHsl = document.getElementById('anatomyHsl');
    if (anatomyHsl) anatomyHsl.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
    const anatomyHsv = document.getElementById('anatomyHsv');
    if (anatomyHsv) anatomyHsv.textContent = `${hsv.h}°, ${hsv.s}%, ${hsv.v}%`;
    const anatomyFavBtn = document.getElementById('anatomyFavBtn');
    if (anatomyFavBtn) {
      const isFav = getStorage().isFavorite(hex);
      anatomyFavBtn.textContent = isFav ? '❤️ Favorited' : '❤️ Favorite';
    }

    // 8. Dispatch event
    document.dispatchEvent(new CustomEvent('app:colorSelected', {
      detail: { r, g, b, hex }
    }));
  };

  /* ==========================================================================
     CATEGORY NAVIGATION & GRID REFRESH
     ========================================================================== */

  // Creator Source Marker 26: Category Navigation & Sidebar Counters
  const CP_MARKER_26 = "YZN-COLORPALETTE-ORIGINAL-DEV-SIGNATURE";

  /**
   * Navigate to a category and refresh the view
   * @param {string} category - Category key
   */
  const navigateCategory = (category) => {
    currentCategory = category;
    currentPage = 0;
    searchQuery = '';
    searchResults = null;

    // Reset search inputs
    const mainSearch = document.getElementById('searchInput');
    if (mainSearch) mainSearch.value = '';
    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch) quickSearch.value = '';

    // Update active state in sidebar
    const items = document.querySelectorAll('.category-item');
    items.forEach((item) => {
      const cat = item.getAttribute('data-category');
      if (cat === category) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    // Update titles
    const utils = getUtils();
    const catData = (utils.CATEGORIES && utils.CATEGORIES[category]) ? utils.CATEGORIES[category] : {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      count: 0
    };

    const titleEl = document.getElementById('categoryTitle');
    if (titleEl) {
      titleEl.textContent = catData.name;
    }

    const subEl = document.getElementById('categorySubtitle');
    if (subEl) {
      if (category === 'all') {
        subEl.textContent = 'Full 24-bit RGB Color Space — 16,777,216 distinct color combinations';
      } else if (category === 'favorites') {
        subEl.textContent = 'Your saved colors collections stored locally';
      } else if (category === 'palettes') {
        subEl.textContent = 'Custom organized palettes and color sets';
      } else if (category === 'picker') {
        subEl.textContent = 'Interactive color exploration and manual mixing workspace';
      } else {
        subEl.textContent = `Browse curated hues in the ${catData.name} spectrum`;
      }
    }

    refreshGrid();
    document.dispatchEvent(new CustomEvent('app:categoryChanged', { detail: { category } }));
  };

  // Creator Source Marker 23: Virtual Color Grid & List Rendering
  const CP_MARKER_23 = "YZN-COLORPALETTE-ORIGINAL-IDENTITY-023";

  /**
   * Refresh the color grid DOM based on active category, pagination, and search
   */
  const refreshGrid = () => {
    const grid = document.getElementById('colorGrid');
    if (!grid) return;

    // Handle special category: Interactive Color Picker
    if (currentCategory === 'picker') {
      renderInteractivePickerView(grid);
      renderPagination(1);
      const totalEl = document.getElementById('totalCount');
      if (totalEl) totalEl.textContent = '1';
      const infoEl = document.getElementById('gridInfo');
      if (infoEl) infoEl.textContent = 'Color Picker Mode';
      return;
    }

    let colors = [];
    let totalCount = 0;

    // 1. Search Results Mode
    if (searchResults !== null) {
      totalCount = searchResults.length;
      const start = currentPage * pageSize;
      colors = searchResults.slice(start, start + pageSize);

      if (totalCount === 0) {
        grid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-secondary, #94a3b8);">
            <div style="font-size: 36px; margin-bottom: 12px;">🔍</div>
            <h3 style="font-size: 18px; color: var(--text-primary, #fff); margin-bottom: 8px;">No Colors Found</h3>
            <p>We couldn't find any colors matching "${escapeHtml(searchQuery)}". Try a HEX code (#FF0000), RGB value, or CSS color name.</p>
            <button id="clearSearchBtn" class="btn btn-primary" style="margin-top: 16px;">Clear Search</button>
          </div>
        `;
        const clearBtn = grid.querySelector('#clearSearchBtn');
        if (clearBtn) clearBtn.addEventListener('click', resetFilters);
        renderPagination(0);
        updateGridHeaderStats(0, 0);
        return;
      }
    }
    // 2. Favorites Mode
    else if (currentCategory === 'favorites') {
      const favs = getStorage().getFavorites();
      totalCount = favs.length;

      if (totalCount === 0) {
        grid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-secondary, #94a3b8);">
            <div style="font-size: 36px; margin-bottom: 12px;">❤️</div>
            <h3 style="font-size: 18px; color: var(--text-primary, #fff); margin-bottom: 8px;">No Favorite Colors Yet</h3>
            <p>Click the heart icon on any color card or in the selected color panel to save it here.</p>
            <button id="browseAllBtn" class="btn btn-primary" style="margin-top: 16px;">Browse All Colors</button>
          </div>
        `;
        const browseBtn = grid.querySelector('#browseAllBtn');
        if (browseBtn) browseBtn.addEventListener('click', () => navigateCategory('all'));
        renderPagination(0);
        updateGridHeaderStats(0, 0);
        return;
      }

      const start = currentPage * pageSize;
      const pageHexes = favs.slice(start, start + pageSize);
      const utils = getUtils();
      colors = pageHexes.map(hex => {
        const rgb = utils.hexToRgb(hex) || { r: 0, g: 0, b: 0 };
        return {
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          hex: hex,
          name: utils.getColorName(rgb.r, rgb.g, rgb.b)
        };
      });
    }
    // 3. Palettes Mode
    else if (currentCategory === 'palettes') {
      renderPalettesGridView(grid);
      return;
    }
    // 4. Standard Category Generation Mode
    else {
      const utils = getUtils();
      const result = utils.generatePageColors(currentCategory, currentPage, pageSize, sortMode);
      colors = result.colors;
      totalCount = result.totalCount;
    }

    // Render Cards using DocumentFragment for maximum performance
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const curHex = currentColor ? getUtils().rgbToHex(currentColor.r, currentColor.g, currentColor.b) : null;

    colors.forEach((color) => {
      const card = document.createElement('div');
      card.className = `color-card ${curHex === color.hex ? 'selected' : ''}`;
      card.setAttribute('data-color', color.hex);
      card.setAttribute('data-r', color.r);
      card.setAttribute('data-g', color.g);
      card.setAttribute('data-b', color.b);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Color ${color.hex}`);

      card.innerHTML = `
        <div class="color-swatch" style="background-color: ${color.hex};"></div>
        <div class="color-info">
          <span class="color-hex">${color.hex}</span>
          <span class="color-rgb">RGB(${color.r}, ${color.g}, ${color.b})</span>
        </div>
      `;

      fragment.appendChild(card);
    });

    window.requestAnimationFrame(() => {
      grid.appendChild(fragment);
    });

    // Update stats and pagination
    updateGridHeaderStats(totalCount, colors.length);
    renderPagination(totalCount);
  };

  const updateGridHeaderStats = (totalCount, renderedCount) => {
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = totalCount.toLocaleString();

    const infoEl = document.getElementById('gridInfo');
    if (infoEl) {
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      infoEl.textContent = `Showing ${renderedCount.toLocaleString()} colors (Page ${(currentPage + 1).toLocaleString()} of ${totalPages.toLocaleString()})`;
    }
  };

  /**
   * Render custom palettes within the main grid view when category is 'palettes'
   */
  const renderPalettesGridView = (grid) => {
    const palettes = getStorage().getPalettes();
    grid.innerHTML = '';
    updateGridHeaderStats(palettes.length, palettes.length);
    renderPagination(1);

    if (palettes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-secondary, #94a3b8);">
          <div style="font-size: 36px; margin-bottom: 12px;">📁</div>
          <h3 style="font-size: 18px; color: var(--text-primary, #fff); margin-bottom: 8px;">No Palettes Created</h3>
          <p>You haven't created any custom palettes yet. Open the Palettes tool to start organizing colors.</p>
          <button id="openPalettesFeatureBtn" class="btn btn-primary" style="margin-top: 16px;">Open Palettes Manager</button>
        </div>
      `;
      const btn = grid.querySelector('#openPalettesFeatureBtn');
      if (btn) btn.addEventListener('click', () => getFeatureManager().launch('palettes'));
      return;
    }

    palettes.forEach((pal) => {
      const card = document.createElement('div');
      card.className = 'palette-grid-card';
      card.style.cssText = 'background: var(--bg-card, #141a4a); border: 1px solid var(--border-color, #1e2a6e); border-radius: 10px; padding: 16px;';

      const swatchesHtml = (pal.colors || []).map(hex => `
        <span class="palette-grid-swatch" style="width: 32px; height: 32px; border-radius: 6px; background-color: ${hex}; display: inline-block; margin: 3px; cursor: pointer;" title="${hex}" data-color="${hex}"></span>
      `).join('');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 16px; color: var(--text-primary, #fff);">${escapeHtml(pal.name)}</h4>
          <span style="font-size: 12px; color: var(--text-muted, #64748b);">${(pal.colors || []).length} colors</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; margin-bottom: 12px;">
          ${swatchesHtml || '<p style="font-size: 12px; color: var(--text-muted, #64748b);">Empty palette</p>'}
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-secondary copy-pal-grid-btn" data-palette-id="${pal.id}">Copy All</button>
          <button class="btn btn-sm btn-ghost open-pal-grid-btn" data-palette-id="${pal.id}">Manage ↗</button>
        </div>
      `;

      card.querySelectorAll('.palette-grid-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          const hex = sw.getAttribute('data-color');
          const rgb = getUtils().hexToRgb(hex);
          if (rgb) selectColor(rgb.r, rgb.g, rgb.b);
        });
      });

      card.querySelector('.copy-pal-grid-btn').addEventListener('click', () => {
        if (!pal.colors || pal.colors.length === 0) return;
        copyToClipboard(pal.colors.join(', '));
      });

      card.querySelector('.open-pal-grid-btn').addEventListener('click', () => {
        getFeatureManager().launch('palettes');
      });

      grid.appendChild(card);
    });
  };

  /**
   * Render the interactive color picker view when category is 'picker'
   */
  const renderInteractivePickerView = (grid) => {
    grid.innerHTML = `
      <div class="picker-view-container" style="grid-column: 1 / -1; background: var(--bg-card, #141a4a); border: 1px solid var(--border-color, #1e2a6e); border-radius: 12px; padding: 24px; max-width: 680px; margin: 0 auto; width: 100%;">
        <h3 style="margin-bottom: 16px; font-size: 18px; color: var(--text-primary, #fff);">Interactive Color Mixer</h3>
        
        <div style="display: flex; gap: 24px; align-items: center; margin-bottom: 24px; flex-wrap: wrap;">
          <div id="pickerLargePreview" style="width: 140px; height: 140px; border-radius: 10px; border: 1px solid var(--border-color, #1e2a6e); background-color: #6366F1;"></div>
          
          <div style="flex: 1; min-width: 200px;">
            <div style="margin-bottom: 12px;">
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">HTML5 Picker</label>
              <input type="color" id="pickerNativeInput" value="#6366F1" style="width: 100%; height: 44px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Manual HEX</label>
              <input type="text" id="pickerManualHex" value="#6366F1" style="width: 100%; padding: 8px 12px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button id="pickerSelectBtn" class="btn btn-primary" style="flex: 1;">Apply as Selected Color</button>
          <button id="pickerCopyBtn" class="btn btn-secondary" style="flex: 1;">Copy HEX</button>
          <button id="pickerSaveBtn" class="btn btn-secondary" style="flex: 1;">Save to Favorites</button>
        </div>
      </div>
    `;

    const nativeInp = grid.querySelector('#pickerNativeInput');
    const manualInp = grid.querySelector('#pickerManualHex');
    const preview = grid.querySelector('#pickerLargePreview');
    const selectBtn = grid.querySelector('#pickerSelectBtn');
    const copyBtn = grid.querySelector('#pickerCopyBtn');
    const saveBtn = grid.querySelector('#pickerSaveBtn');

    const updateColor = (hex) => {
      preview.style.backgroundColor = hex;
      nativeInp.value = hex;
      manualInp.value = hex.toUpperCase();
    };

    nativeInp.addEventListener('input', (e) => updateColor(e.target.value));

    manualInp.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        updateColor(val);
      }
    });

    selectBtn.addEventListener('click', () => {
      const rgb = getUtils().hexToRgb(manualInp.value);
      if (rgb) selectColor(rgb.r, rgb.g, rgb.b);
      showToast(`Selected ${manualInp.value}`, 'success');
    });

    copyBtn.addEventListener('click', () => copyToClipboard(manualInp.value));

    saveBtn.addEventListener('click', () => {
      getStorage().addFavorite(manualInp.value);
      showToast(`Saved ${manualInp.value} to favorites`, 'success');
    });
  };

  /* ==========================================================================
     VIRTUAL PAGINATION CONTROLS (HORIZONTAL SCROLLABLE STRIP & CONTROLS)
     ========================================================================== */

  /**
   * Attach smooth mouse-drag and wheel horizontal scroll interactions to a pagination strip
   * @param {HTMLElement} strip - The .pagination-strip DOM element
   */
  const attachStripScrollInteractions = (strip) => {
    if (!strip || strip.__hasScrollInteractions) return;
    strip.__hasScrollInteractions = true;

    // 1. Mouse wheel horizontal scrolling
    strip.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        strip.scrollLeft += e.deltaY * 1.2;
      }
    }, { passive: false });

    // 2. Mouse drag-to-scroll
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    strip.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      strip.style.cursor = 'grabbing';
      strip.style.userSelect = 'none';
      startX = e.pageX - strip.offsetLeft;
      scrollStart = strip.scrollLeft;
    });

    const stopDragging = () => {
      if (!isDown) return;
      isDown = false;
      strip.style.cursor = '';
      strip.style.removeProperty('user-select');
      if (hasDragged) {
        setTimeout(() => { hasDragged = false; }, 50);
      }
    };

    window.addEventListener('mouseup', stopDragging);
    strip.addEventListener('mouseleave', stopDragging);

    strip.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - strip.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 4) {
        hasDragged = true;
      }
      strip.scrollLeft = scrollStart - walk;
    });

    // Prevent button click if dragging occurred
    strip.addEventListener('click', (e) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  };

  /**
   * Handle jump-to-page submission from either input or Go button
   * @param {HTMLElement} container - Container holding the jump input
   */
  const handleJumpToPage = (container) => {
    if (!container) return;
    const input = container.querySelector('.page-jump-input');
    if (!input) return;
    const val = parseInt(input.value.trim(), 10);
    const totalPages = Math.max(1, Math.ceil(lastTotalCount / pageSize));
    if (isNaN(val) || val < 1 || val > totalPages) {
      showToast(`Please enter a valid page between 1 and ${totalPages.toLocaleString()}`, 'error');
      input.value = (currentPage + 1).toString();
      input.focus();
      return;
    }
    goToPage(val - 1);
  };

  /**
   * Update category count badges in the sidebar
   */
  const updateSidebarCounts = () => {
    const utils = getUtils();
    const categories = utils.CATEGORIES || {};
    const storage = getStorage();

    const counts = {
      all: 16777216,
      red: (categories.red && categories.red.count) || 1050804,
      orange: (categories.orange && categories.orange.count) || 1050804,
      yellow: (categories.yellow && categories.yellow.count) || 1050804,
      green: (categories.green && categories.green.count) || 1050804,
      cyan: (categories.cyan && categories.cyan.count) || 1050804,
      blue: (categories.blue && categories.blue.count) || 1050804,
      purple: (categories.purple && categories.purple.count) || 1050804,
      pink: (categories.pink && categories.pink.count) || 1050804,
      brown: (categories.brown && categories.brown.count) || 1049784,
      gray: (categories.gray && categories.gray.count) || 363600,
      bw: (categories.bw && categories.bw.count) || 65280,
      favorites: (storage.getFavorites ? storage.getFavorites().length : 0),
      palettes: (storage.getPalettes ? storage.getPalettes().length : 0)
    };

    document.querySelectorAll('.cat-count[data-count-for]').forEach((el) => {
      const catKey = el.getAttribute('data-count-for');
      if (counts[catKey] !== undefined) {
        el.textContent = counts[catKey].toLocaleString();
      }
    });
  };

  // Creator Source Marker 27: Dual Synchronized Pagination Component
  const CP_MARKER_27 = "YZN-COLORPALETTE-YZN-PRIVATE-SOURCE-027";

  /**
   * Reusable builder for full-featured, horizontal scrollable pagination bar
   * @param {HTMLElement} container - Target container element
   * @param {string} idSuffix - Identifier suffix ('Top' or 'Bottom')
   * @param {number} totalPages - Total available pages
   */
  const buildPaginationBar = (container, idSuffix, totalPages) => {
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const bar = document.createElement('div');
    bar.className = 'pagination-bar';

    // Left Navigation Group (First & Prev)
    const leftGroup = document.createElement('div');
    leftGroup.className = 'pagination-nav-group';

    const firstBtn = document.createElement('button');
    firstBtn.type = 'button';
    firstBtn.className = 'page-btn page-nav-btn page-first';
    firstBtn.setAttribute('data-action', 'first');
    firstBtn.setAttribute('aria-label', 'Go to first page');
    firstBtn.title = 'First Page (1)';
    firstBtn.innerHTML = '⏮ First';
    if (currentPage === 0) firstBtn.disabled = true;
    leftGroup.appendChild(firstBtn);

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'page-btn page-nav-btn page-prev';
    prevBtn.setAttribute('data-action', 'prev');
    prevBtn.setAttribute('aria-label', 'Previous page');
    prevBtn.title = 'Previous Page';
    prevBtn.innerHTML = '◀ Prev';
    if (currentPage === 0) prevBtn.disabled = true;
    leftGroup.appendChild(prevBtn);

    bar.appendChild(leftGroup);

    // Center Strip Wrapper + Scrollable Strip
    const stripWrapper = document.createElement('div');
    stripWrapper.className = 'pagination-strip-wrapper';

    const strip = document.createElement('div');
    strip.className = 'pagination-strip';
    strip.setAttribute('role', 'navigation');
    strip.setAttribute('aria-label', `Scrollable page numbers strip (${idSuffix})`);

    // Dynamic window around currentPage (radius 20 => ~41 visible buttons)
    const windowRadius = 20;
    let startPage = Math.max(0, currentPage - windowRadius);
    let endPage = Math.min(totalPages - 1, currentPage + windowRadius);

    const targetWindow = Math.min(totalPages, (windowRadius * 2) + 1);
    if (endPage - startPage + 1 < targetWindow) {
      if (startPage === 0) {
        endPage = Math.min(totalPages - 1, targetWindow - 1);
      } else if (endPage === totalPages - 1) {
        startPage = Math.max(0, totalPages - targetWindow);
      }
    }

    if (startPage > 0) {
      const startEll = document.createElement('span');
      startEll.className = 'page-ellipsis';
      startEll.textContent = '…';
      startEll.title = `Pages 1 to ${startPage.toLocaleString()} available via Jump input or First button`;
      strip.appendChild(startEll);
    }

    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
      btn.setAttribute('data-page', p);
      btn.setAttribute('aria-label', `Page ${(p + 1).toLocaleString()}`);
      btn.textContent = (p + 1).toLocaleString();
      strip.appendChild(btn);
    }

    if (endPage < totalPages - 1) {
      const endEll = document.createElement('span');
      endEll.className = 'page-ellipsis';
      endEll.textContent = '…';
      endEll.title = `Pages ${(endPage + 2).toLocaleString()} to ${totalPages.toLocaleString()} available via Jump input or Last button`;
      strip.appendChild(endEll);
    }

    stripWrapper.appendChild(strip);
    bar.appendChild(stripWrapper);

    // Right Navigation Group (Next & Last)
    const rightGroup = document.createElement('div');
    rightGroup.className = 'pagination-nav-group';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'page-btn page-nav-btn page-next';
    nextBtn.setAttribute('data-action', 'next');
    nextBtn.setAttribute('aria-label', 'Next page');
    nextBtn.title = 'Next Page';
    nextBtn.innerHTML = 'Next ▶';
    if (currentPage >= totalPages - 1) nextBtn.disabled = true;
    rightGroup.appendChild(nextBtn);

    const lastBtn = document.createElement('button');
    lastBtn.type = 'button';
    lastBtn.className = 'page-btn page-nav-btn page-last';
    lastBtn.setAttribute('data-action', 'last');
    lastBtn.setAttribute('aria-label', 'Go to last page');
    lastBtn.title = `Last Page (${totalPages.toLocaleString()})`;
    lastBtn.innerHTML = 'Last ⏭';
    if (currentPage >= totalPages - 1) lastBtn.disabled = true;
    rightGroup.appendChild(lastBtn);

    bar.appendChild(rightGroup);

    // Jump to Page Group
    const jumpGroup = document.createElement('div');
    jumpGroup.className = 'pagination-jump';

    const jumpLabel = document.createElement('label');
    jumpLabel.htmlFor = `pageJumpInput${idSuffix}`;
    jumpLabel.textContent = 'Page';

    const jumpInput = document.createElement('input');
    jumpInput.type = 'number';
    jumpInput.id = `pageJumpInput${idSuffix}`;
    jumpInput.className = 'page-jump-input';
    jumpInput.min = '1';
    jumpInput.max = totalPages.toString();
    jumpInput.value = (currentPage + 1).toString();
    jumpInput.setAttribute('aria-label', `Jump to page number between 1 and ${totalPages}`);

    const jumpTotal = document.createElement('span');
    jumpTotal.className = 'page-jump-total';
    jumpTotal.textContent = `/ ${totalPages.toLocaleString()}`;

    const jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.className = 'page-jump-btn';
    jumpBtn.setAttribute('data-action', 'jump');
    jumpBtn.setAttribute('aria-label', 'Go to specified page');
    jumpBtn.textContent = 'Go';

    jumpGroup.appendChild(jumpLabel);
    jumpGroup.appendChild(jumpInput);
    jumpGroup.appendChild(jumpTotal);
    jumpGroup.appendChild(jumpBtn);

    bar.appendChild(jumpGroup);
    container.appendChild(bar);

    // Attach Drag-to-Scroll & Wheel Horizontal Scroll on the strip
    attachStripScrollInteractions(strip);

    // Auto-center active button inside the horizontal strip
    requestAnimationFrame(() => {
      const activeBtn = strip.querySelector('.page-btn.active');
      if (activeBtn) {
        const stripWidth = strip.clientWidth;
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        strip.scrollLeft = btnLeft - (stripWidth / 2) + (btnWidth / 2);
      }
    });
  };

  /**
   * Render pagination controls (both top and bottom share identical layout, sizing & behavior)
   * @param {number} totalCount - Total number of colors available
   */
  const renderPagination = (totalCount) => {
    lastTotalCount = totalCount;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const topContainer = document.getElementById('paginationTop');
    const bottomContainer = document.getElementById('paginationBottom');

    if (topContainer) buildPaginationBar(topContainer, 'Top', totalPages);
    if (bottomContainer) buildPaginationBar(bottomContainer, 'Bottom', totalPages);
  };

  /**
   * Navigate to a specific page number
   * @param {number} newPage - 0-indexed target page
   */
  const goToPage = (newPage) => {
    const totalPages = Math.max(1, Math.ceil(lastTotalCount / pageSize));
    newPage = Math.max(0, Math.min(totalPages - 1, newPage));
    if (newPage === currentPage) return;
    currentPage = newPage;
    refreshGrid();

    // Smooth scroll to top of color grid
    const mainContent = document.getElementById('mainContent') || document.getElementById('colorGrid');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ==========================================================================
     SEARCH & FILTERING
     ========================================================================== */

  // Creator Source Marker 25: Real-Time Debounced Search & Filter Logic
  const CP_MARKER_25 = "YZN-COLORPALETTE-CORE-IDENTITY-N4-025";

  /**
   * Handle debounced search query changes
   * @param {string} query - Search string
   */
  const handleSearch = (query) => {
    searchQuery = (query || '').trim();

    if (!searchQuery) {
      searchResults = null;
      currentPage = 0;
      refreshGrid();
      return;
    }

    const utils = getUtils();
    searchResults = utils.searchColors(searchQuery);
    currentPage = 0;
    refreshGrid();
  };

  /**
   * Reset all search, sort, and pagination filters to defaults
   */
  const resetFilters = () => {
    searchQuery = '';
    searchResults = null;
    currentPage = 0;
    sortMode = 'popular';
    pageSize = 256;

    const mainSearch = document.getElementById('searchInput');
    if (mainSearch) mainSearch.value = '';
    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch) quickSearch.value = '';

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'popular';

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) pageSizeSelect.value = '256';

    refreshGrid();
    showToast('Filters reset to defaults', 'info');
  };

  /* ==========================================================================
     PALETTE POPOVER (ADD TO PALETTE)
     ========================================================================== */

  /**
   * Show popover to add current color to an existing or new palette
   */
  const showPaletteSelectorPopover = (buttonEl) => {
    if (!currentColor) {
      showToast('Select a color first', 'info');
      return;
    }

    const existingPopover = document.getElementById('paletteSelectPopover');
    if (existingPopover) {
      existingPopover.remove();
      return;
    }

    const hex = getUtils().rgbToHex(currentColor.r, currentColor.g, currentColor.b);
    let palettes = getStorage().getPalettes();

    if (!palettes || palettes.length === 0) {
      const defaultPal = getStorage().createPalette('My Palette');
      palettes = [defaultPal];
    }

    const popover = document.createElement('div');
    popover.id = 'paletteSelectPopover';
    popover.className = 'palette-popover';
    popover.style.cssText = `
      position: absolute;
      z-index: 1000;
      background: var(--bg-secondary, #0d1333);
      border: 1px solid var(--border-color, #1e2a6e);
      border-radius: 8px;
      box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.5));
      padding: 12px;
      min-width: 220px;
    `;

    // Position relative to button
    const rect = buttonEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
    popover.style.left = `${Math.max(10, rect.left + window.scrollX - 60)}px`;

    let html = `
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary, #fff);">Add ${hex} to Palette:</div>
      <div class="popover-pal-list" style="max-height: 160px; overflow-y: auto; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
    `;

    palettes.forEach(pal => {
      html += `
        <button class="popover-pal-item btn btn-ghost" data-palette-id="${pal.id}" style="text-align: left; padding: 6px 8px; font-size: 13px; border-radius: 4px; display: flex; justify-content: space-between;">
          <span>${escapeHtml(pal.name)}</span>
          <span style="font-size: 11px; opacity: 0.6;">(${(pal.colors || []).length})</span>
        </button>
      `;
    });

    html += `
      </div>
      <button id="popoverNewPalBtn" class="btn btn-sm btn-secondary" style="width: 100%;">+ Create New Palette</button>
    `;

    popover.innerHTML = html;
    document.body.appendChild(popover);

    // Event handlers
    popover.querySelectorAll('.popover-pal-item').forEach(item => {
      item.addEventListener('click', () => {
        const pId = item.getAttribute('data-palette-id');
        getStorage().addColorToPalette(pId, hex);
        showToast(`Added ${hex} to palette!`, 'success');
        popover.remove();
        document.dispatchEvent(new CustomEvent('app:palettesChanged'));
      });
    });

    const newPalBtn = popover.querySelector('#popoverNewPalBtn');
    if (newPalBtn) {
      newPalBtn.addEventListener('click', () => {
        const name = window.prompt('Enter new palette name:');
        if (name && name.trim()) {
          const newPal = getStorage().createPalette(name.trim());
          getStorage().addColorToPalette(newPal.id, hex);
          showToast(`Created "${name.trim()}" and added ${hex}!`, 'success');
          popover.remove();
          document.dispatchEvent(new CustomEvent('app:palettesChanged'));
        }
      });
    }

    // Close when clicking outside
    const outsideClickListener = (e) => {
      if (!popover.contains(e.target) && e.target !== buttonEl) {
        popover.remove();
        document.removeEventListener('click', outsideClickListener);
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClickListener), 10);
  };

  /* ==========================================================================
     SETTINGS MODAL
     ========================================================================== */

  const ensureSettingsModal = () => {
    let modal = document.getElementById('settingsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settingsModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 520px;">
          <div class="modal-header">
            <h3>⚙️ Preferences & Settings</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#settingsThemeSelect')) {
      const currentSettings = getStorage().getSettings();
      body.innerHTML = `
        <div class="settings-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label for="settingsThemeSelect" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Theme Mode</label>
            <select id="settingsThemeSelect" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);">
              <option value="dark" ${currentSettings.theme === 'dark' ? 'selected' : ''}>Dark Navy Premium</option>
              <option value="light" ${currentSettings.theme === 'light' ? 'selected' : ''}>Light Minimalist</option>
            </select>
          </div>

          <div>
            <label for="settingsPageSize" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Default Page Size</label>
            <select id="settingsPageSize" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);">
              <option value="64" ${currentSettings.pageSize === 64 ? 'selected' : ''}>64 colors</option>
              <option value="128" ${currentSettings.pageSize === 128 ? 'selected' : ''}>128 colors</option>
              <option value="256" ${currentSettings.pageSize === 256 ? 'selected' : ''}>256 colors (Recommended)</option>
              <option value="500" ${currentSettings.pageSize === 500 ? 'selected' : ''}>500 colors</option>
            </select>
          </div>

          <div style="border-top: 1px solid var(--border-color, #1e2a6e); padding-top: 16px; margin-top: 8px;">
            <h4 style="font-size: 13px; color: var(--text-primary, #fff); margin-bottom: 8px;">Data & Reset Options</h4>
            <div style="display: flex; gap: 8px;">
              <button id="resetSettingsBtn" class="btn btn-secondary" style="flex: 1;">Reset Preferences</button>
              <button id="resetAllDataBtn" class="btn btn-secondary" style="flex: 1; color: var(--error, #ef4444);">Clear All Data</button>
            </div>
          </div>
        </div>
      `;

      const themeSel = body.querySelector('#settingsThemeSelect');
      themeSel.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        getStorage().setSetting('theme', e.target.value);
      });

      const pSizeSel = body.querySelector('#settingsPageSize');
      pSizeSel.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        getStorage().setSetting('pageSize', pageSize);
        const barSelect = document.getElementById('pageSizeSelect');
        if (barSelect) barSelect.value = pageSize.toString();
        currentPage = 0;
        refreshGrid();
      });

      const resetSetBtn = body.querySelector('#resetSettingsBtn');
      resetSetBtn.addEventListener('click', () => {
        getStorage().resetSettings();
        applyTheme('dark');
        pageSize = 256;
        sortMode = 'popular';
        viewMode = 'grid';
        refreshGrid();
        showToast('Settings reset to factory defaults', 'info');
      });

      const resetAllBtn = body.querySelector('#resetAllDataBtn');
      resetAllBtn.addEventListener('click', () => {
        if (window.confirm('Are you sure you want to delete all favorites, palettes, and custom settings?')) {
          getStorage().resetAll();
          applyTheme('dark');
          navigateCategory('all');
          showToast('All local storage data cleared', 'info');
        }
      });
    }

    getFeatureManager().openModal('settingsModal');
  };

  /* ==========================================================================
     BOTTOM INFORMATION PANEL (6 TECHNICAL SECTIONS)
     ========================================================================== */

  // Creator Source Marker 29: Full-Width 6-Column Bottom Information Panel
  const CP_MARKER_29 = "YZN-COLORPALETTE-FOUNDERS-SOURCE-029";

  /**
   * Initialize and bind the 6 technical sections inside #bottomPanelContent
   */
  const populateBottomPanelContent = () => {
    const container = document.getElementById('bottomPanelContent');
    if (!container) return;

    const utils = getUtils();
    const categories = utils.CATEGORIES || {};

    // 1. Setup Category List in Col 1
    const catList = document.getElementById('bottomCatList');
    if (catList) {
      catList.innerHTML = Object.keys(categories).map(k => {
        const c = categories[k];
        const countStr = (c.count || 0).toLocaleString();
        return `
          <div class="bottom-cat-row" data-category="${k}" role="button" tabindex="0" title="View ${escapeHtml(c.name)}">
            <span class="bottom-cat-left">
              <span class="cat-dot" style="background:${c.color || '#6366f1'};"></span>
              <span>${escapeHtml(c.name)}</span>
            </span>
            <span class="bottom-count">${countStr}</span>
          </div>
        `;
      }).join('');

      catList.addEventListener('click', (e) => {
        const row = e.target.closest('.bottom-cat-row');
        if (row) {
          const cat = row.getAttribute('data-category');
          if (cat) {
            navigateCategory(cat);
            const grid = document.getElementById('colorGrid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    }

    // 2. Setup Anatomy Card Actions in Col 2
    const anatomyCopyBtn = document.getElementById('anatomyCopyBtn');
    if (anatomyCopyBtn) {
      anatomyCopyBtn.addEventListener('click', () => {
        const hex = currentColor ? utils.rgbToHex(currentColor.r, currentColor.g, currentColor.b) : '#CC33FF';
        copyToClipboard(hex);
      });
    }

    const anatomyFavBtn = document.getElementById('anatomyFavBtn');
    if (anatomyFavBtn) {
      anatomyFavBtn.addEventListener('click', () => {
        const hex = currentColor ? utils.rgbToHex(currentColor.r, currentColor.g, currentColor.b) : '#CC33FF';
        const isFav = getStorage().toggleFavorite(hex);
        anatomyFavBtn.textContent = isFav ? '❤️ Favorited' : '❤️ Favorite';
        showToast(isFav ? `Saved ${hex} to favorites` : `Removed ${hex} from favorites`, 'info');
      });
    }

    // 3. Setup Interactive Color Picker Canvas in Col 5
    const pickerCanvas = document.getElementById('pickerCanvas');
    const pickerHue = document.getElementById('pickerHue');
    const pickerHexReadout = document.getElementById('pickerHexReadout');
    const pickerRgbReadout = document.getElementById('pickerRgbReadout');
    const pickerApplyBtn = document.getElementById('pickerApplyBtn');
    const pickerAddPaletteBtn = document.getElementById('pickerAddPaletteBtn');

    if (pickerCanvas && pickerCanvas.getContext) {
      const ctx = pickerCanvas.getContext('2d');
      let currentHue = pickerHue ? parseInt(pickerHue.value, 10) || 289 : 289;
      let activePickerRgb = { r: 204, g: 51, b: 255, hex: '#CC33FF' };

      const drawSpectrum = (hue) => {
        const w = pickerCanvas.width;
        const h = pickerCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Horizontal gradient: white to pure hue
        const hGrad = ctx.createLinearGradient(0, 0, w, 0);
        hGrad.addColorStop(0, '#ffffff');
        hGrad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
        ctx.fillStyle = hGrad;
        ctx.fillRect(0, 0, w, h);

        // Vertical gradient: transparent to black
        const vGrad = ctx.createLinearGradient(0, 0, 0, h);
        vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vGrad.addColorStop(1, '#000000');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, w, h);
      };

      const pickColor = (e) => {
        const rect = pickerCanvas.getBoundingClientRect();
        const scaleX = pickerCanvas.width / rect.width;
        const scaleY = pickerCanvas.height / rect.height;
        const x = Math.max(0, Math.min(pickerCanvas.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(pickerCanvas.height - 1, Math.round((e.clientY - rect.top) * scaleY)));

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0], g = pixel[1], b = pixel[2];
        const hex = utils.rgbToHex(r, g, b);
        activePickerRgb = { r, g, b, hex };

        if (pickerHexReadout) pickerHexReadout.textContent = hex;
        if (pickerRgbReadout) pickerRgbReadout.textContent = `RGB(${r}, ${g}, ${b})`;
      };

      let isDragging = false;
      pickerCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        pickColor(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (isDragging) pickColor(e);
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
      pickerCanvas.addEventListener('click', pickColor);

      if (pickerHue) {
        pickerHue.addEventListener('input', (e) => {
          currentHue = parseInt(e.target.value, 10) || 0;
          drawSpectrum(currentHue);
        });
      }

      // Presets
      const presets = container.querySelectorAll('.picker-preset');
      presets.forEach((dot) => {
        dot.addEventListener('click', () => {
          const hex = dot.getAttribute('data-color') || '#CC33FF';
          const rgb = utils.hexToRgb(hex);
          if (rgb) {
            activePickerRgb = { r: rgb.r, g: rgb.g, b: rgb.b, hex };
            if (pickerHexReadout) pickerHexReadout.textContent = hex;
            if (pickerRgbReadout) pickerRgbReadout.textContent = `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            const hsl = utils.rgbToHsl(rgb.r, rgb.g, rgb.b);
            if (pickerHue) {
              pickerHue.value = hsl.h;
              currentHue = hsl.h;
              drawSpectrum(currentHue);
            }
          }
        });
      });

      if (pickerApplyBtn) {
        pickerApplyBtn.addEventListener('click', () => {
          selectColor(activePickerRgb.r, activePickerRgb.g, activePickerRgb.b);
          showToast(`Selected ${activePickerRgb.hex}`, 'success');
        });
      }

      if (pickerAddPaletteBtn) {
        pickerAddPaletteBtn.addEventListener('click', () => {
          const storage = getStorage();
          const palettes = storage.getPalettes();
          let target = palettes[0];
          if (!target) target = storage.createPalette('My Palette');
          storage.addColorToPalette(target.id, activePickerRgb.hex);
          showToast(`Added ${activePickerRgb.hex} to ${target.name}`, 'success');
        });
      }

      // Initial spectrum render
      drawSpectrum(currentHue);
    }

    // 4. Setup More Options & Feature Shortcuts in Col 6
    const shortcutBtns = container.querySelectorAll('.feature-shortcut-btn');
    shortcutBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const featId = btn.getAttribute('data-feature');
        if (featId) {
          getFeatureManager().launch(featId);
        }
      });
    });
  };

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */

  const setupEventListeners = () => {
    // 1. Sidebar Category Item Clicks (Delegation on #categoryNav or .category-item)
    const categoryNav = document.getElementById('categoryNav') || document.getElementById('sidebar');
    if (categoryNav) {
      categoryNav.addEventListener('click', (e) => {
        const item = e.target.closest('.category-item');
        if (item) {
          const category = item.getAttribute('data-category');
          if (category) {
            navigateCategory(category);
            // Close mobile sidebar if open
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('active', 'open');
            if (overlay) overlay.classList.remove('active', 'show');
          }
        }
      });
    }

    // 2. Toolbar Quick Search (debounced 300ms)
    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch) {
      quickSearch.addEventListener('input', (e) => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          handleSearch(e.target.value);
        }, 300);
      });
    }

    // 3. Top Nav Search Input (debounced 300ms)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          handleSearch(e.target.value);
        }, 300);
      });
    }

    // 4. Sort Dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortMode = e.target.value;
        getStorage().setSetting('sortMode', sortMode);
        currentPage = 0;
        refreshGrid();
      });
    }

    // 5. Page Size Dropdown
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        getStorage().setSetting('pageSize', pageSize);
        currentPage = 0;
        refreshGrid();
      });
    }

    // 6. View Mode Toggles (Grid vs List)
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const gridEl = document.getElementById('colorGrid');

    const setViewMode = (mode) => {
      viewMode = mode;
      getStorage().setSetting('viewMode', mode);
      if (gridEl) {
        if (mode === 'list') {
          gridEl.classList.remove('grid-view');
          gridEl.classList.add('list-view');
        } else {
          gridEl.classList.remove('list-view');
          gridEl.classList.add('grid-view');
        }
      }
      if (viewGridBtn) viewGridBtn.classList.toggle('active', mode === 'grid');
      if (viewListBtn) viewListBtn.classList.toggle('active', mode === 'list');
    };

    if (viewGridBtn) viewGridBtn.addEventListener('click', () => setViewMode('grid'));
    if (viewListBtn) viewListBtn.addEventListener('click', () => setViewMode('list'));

    // 7. Reset Filters Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    // 8. Top Nav Action Buttons
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    const favoritesNavBtn = document.getElementById('favoritesNavBtn');
    if (favoritesNavBtn) favoritesNavBtn.addEventListener('click', () => navigateCategory('favorites'));

    const featuresBtn = document.getElementById('featuresBtn');
    if (featuresBtn && !featuresBtn.getAttribute('data-bound')) {
      featuresBtn.setAttribute('data-bound', 'true');
      featuresBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fm = getFeatureManager();
        if (fm && typeof fm.toggleFeaturesPanel === 'function') {
          fm.toggleFeaturesPanel();
        }
      });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', ensureSettingsModal);

    // 9. Mobile Hamburger & Sidebar Overlay
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('active') || sidebar.classList.contains('open');
        if (isOpen) {
          sidebar.classList.remove('active', 'open');
          if (sidebarOverlay) sidebarOverlay.classList.remove('active', 'show');
        } else {
          sidebar.classList.add('active', 'open');
          if (sidebarOverlay) sidebarOverlay.classList.add('active', 'show');
        }
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('active', 'open');
        sidebarOverlay.classList.remove('active', 'show');
      });
    }

    // 10. Mobile More FAB & Bottom Sheet
    const mobileMoreBtn = document.getElementById('mobileMoreBtn');
    const bottomSheet = document.getElementById('bottomSheet');
    const sheetOverlay = document.getElementById('sheetOverlay');
    const sheetCloseBtn = document.getElementById('sheetCloseBtn') ||
                          document.querySelector('#bottomSheet .sheet-close-btn');

    if (mobileMoreBtn && bottomSheet) {
      mobileMoreBtn.addEventListener('click', () => {
        bottomSheet.classList.add('active');
        if (sheetOverlay) sheetOverlay.classList.add('active');
      });
    }

    if (sheetOverlay && bottomSheet) {
      sheetOverlay.addEventListener('click', () => {
        bottomSheet.classList.remove('active');
        sheetOverlay.classList.remove('active');
      });
    }

    if (sheetCloseBtn && bottomSheet) {
      sheetCloseBtn.addEventListener('click', () => {
        bottomSheet.classList.remove('active');
        if (sheetOverlay) sheetOverlay.classList.remove('active');
      });
    }

    // 11. Color Grid Event Delegation (click on .color-card)
    if (gridEl) {
      gridEl.addEventListener('click', (e) => {
        const card = e.target.closest('.color-card');
        if (card) {
          const r = parseInt(card.getAttribute('data-r'), 10);
          const g = parseInt(card.getAttribute('data-g'), 10);
          const b = parseInt(card.getAttribute('data-b'), 10);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            selectColor(r, g, b);
          }
        }
      });

      // Keyboard support for cards
      gridEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest('.color-card');
          if (card) {
            e.preventDefault();
            const r = parseInt(card.getAttribute('data-r'), 10);
            const g = parseInt(card.getAttribute('data-g'), 10);
            const b = parseInt(card.getAttribute('data-b'), 10);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
              selectColor(r, g, b);
            }
          }
        }
      });
    }

    // 12. Selected Panel Action Buttons
    const copyHexBtn = document.getElementById('copyHexBtn');
    if (copyHexBtn) copyHexBtn.addEventListener('click', () => {
      const el = document.getElementById('formatHex');
      if (el) copyToClipboard(el.textContent.trim());
    });

    const copyRgbBtn = document.getElementById('copyRgbBtn');
    if (copyRgbBtn) copyRgbBtn.addEventListener('click', () => {
      const el = document.getElementById('formatRgb');
      if (el) copyToClipboard(el.textContent.trim());
    });

    const copyHslBtn = document.getElementById('copyHslBtn');
    if (copyHslBtn) copyHslBtn.addEventListener('click', () => {
      const el = document.getElementById('formatHsl');
      if (el) copyToClipboard(el.textContent.trim());
    });

    const copyHsvBtn = document.getElementById('copyHsvBtn');
    if (copyHsvBtn) copyHsvBtn.addEventListener('click', () => {
      const el = document.getElementById('formatHsv');
      if (el) copyToClipboard(el.textContent.trim());
    });

    const copyColorBtn = document.getElementById('copyColorBtn');
    if (copyColorBtn) copyColorBtn.addEventListener('click', () => {
      if (currentColor) {
        copyToClipboard(getUtils().rgbToHex(currentColor.r, currentColor.g, currentColor.b));
      }
    });

    const copyAllBtn = document.getElementById('copyAllBtn');
    if (copyAllBtn) copyAllBtn.addEventListener('click', () => {
      if (!currentColor) return;
      const utils = getUtils();
      const hex = utils.rgbToHex(currentColor.r, currentColor.g, currentColor.b);
      const hsl = utils.rgbToHsl(currentColor.r, currentColor.g, currentColor.b);
      const hsv = utils.rgbToHsv(currentColor.r, currentColor.g, currentColor.b);
      const text = `HEX: ${hex}\nRGB: rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)\nHSV: hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
      copyToClipboard(text);
    });

    // Add to Favorites Button
    const addFavoriteBtn = document.getElementById('addFavoriteBtn');
    if (addFavoriteBtn) {
      addFavoriteBtn.addEventListener('click', () => {
        if (!currentColor) return;
        const hex = getUtils().rgbToHex(currentColor.r, currentColor.g, currentColor.b);
        const newState = getStorage().toggleFavorite(hex);
        if (newState) {
          addFavoriteBtn.classList.add('active', 'favorited');
          addFavoriteBtn.innerHTML = '❤️ Favorited';
          showToast(`Added ${hex} to favorites!`, 'success');
        } else {
          addFavoriteBtn.classList.remove('active', 'favorited');
          addFavoriteBtn.innerHTML = '🤍 Add Favorite';
          showToast(`Removed ${hex} from favorites`, 'info');
        }
        document.dispatchEvent(new CustomEvent('app:favoritesChanged'));
      });
    }

    // Add to Palette Button
    const addToPaletteBtn = document.getElementById('addToPaletteBtn');
    if (addToPaletteBtn) {
      addToPaletteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPaletteSelectorPopover(addToPaletteBtn);
      });
    }

    // 13. Pagination Containers Event Delegation
    [document.getElementById('paginationTop'), document.getElementById('paginationBottom')].forEach(pCont => {
      if (pCont) {
        pCont.addEventListener('click', (e) => {
          // Check if clicked Go button for jump
          const jumpBtn = e.target.closest('.page-jump-btn');
          if (jumpBtn) {
            handleJumpToPage(pCont);
            return;
          }

          const btn = e.target.closest('.page-btn');
          if (!btn || btn.disabled) return;

          const action = btn.getAttribute('data-action');
          if (action === 'first') {
            goToPage(0);
          } else if (action === 'prev') {
            goToPage(currentPage - 1);
          } else if (action === 'next') {
            goToPage(currentPage + 1);
          } else if (action === 'last') {
            const totalPages = Math.max(1, Math.ceil(lastTotalCount / pageSize));
            goToPage(totalPages - 1);
          } else {
            const pageNum = parseInt(btn.getAttribute('data-page'), 10);
            if (!isNaN(pageNum)) goToPage(pageNum);
          }
        });

        // Enter key in jump input
        pCont.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.target.classList.contains('page-jump-input')) {
            e.preventDefault();
            handleJumpToPage(pCont);
          }
        });
      }
    });

    // 14. Bottom Panel Collapsible Toggle
    const bottomPanel = document.getElementById('bottomPanel');
    const bottomPanelToggle = document.getElementById('bottomPanelToggle');
    if (bottomPanel && bottomPanelToggle) {
      bottomPanelToggle.addEventListener('click', () => {
        const isCollapsed = bottomPanel.classList.toggle('collapsed');
        bottomPanelToggle.setAttribute('aria-expanded', String(!isCollapsed));
        if (!isCollapsed) {
          requestAnimationFrame(() => {
            bottomPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
      });
    }

    // 15. Feature Launch Shortcut Buttons across navigation
    document.querySelectorAll('[data-feature-launch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const featId = e.currentTarget.getAttribute('data-feature-launch');
        if (featId) getFeatureManager().launch(featId);
      });
    });

    // 16. Custom Event Listeners
    document.addEventListener('app:favoritesChanged', () => {
      updateSidebarCounts();
      if (currentCategory === 'favorites') refreshGrid();
      if (currentColor) {
        const hex = getUtils().rgbToHex(currentColor.r, currentColor.g, currentColor.b);
        const isFav = getStorage().isFavorite(hex);
        const btn = document.getElementById('addFavoriteBtn');
        if (btn) {
          btn.classList.toggle('active', isFav);
          btn.classList.toggle('favorited', isFav);
          btn.innerHTML = isFav ? '❤️ Favorited' : '🤍 Add Favorite';
        }
      }
    });

    document.addEventListener('app:palettesChanged', () => {
      updateSidebarCounts();
      if (currentCategory === 'palettes') refreshGrid();
    });
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* ==========================================================================
     LIFECYCLE INITIALIZATION
     ========================================================================== */

  // Creator Source Marker 30: Application Bootstrap & Initialization
  const CP_MARKER_30 = "YZN-COLORPALETTE-YZN-ORIGINAL-2026-030";

  /**
   * Main application entry point — called on DOMContentLoaded
   */
  const init = () => {
    // 1. Load settings from storage
    const settings = getStorage().getSettings();
    if (settings) {
      if (settings.theme) applyTheme(settings.theme);
      if (settings.pageSize) pageSize = settings.pageSize;
      if (settings.sortMode) sortMode = settings.sortMode;
      if (settings.viewMode) viewMode = settings.viewMode;
    } else {
      applyTheme('dark');
    }

    // Synchronize UI dropdowns with loaded settings
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect && sortMode) sortSelect.value = sortMode;

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect && pageSize) pageSizeSelect.value = pageSize.toString();

    const gridEl = document.getElementById('colorGrid');
    if (gridEl && viewMode) {
      gridEl.classList.toggle('list-view', viewMode === 'list');
      gridEl.classList.toggle('grid-view', viewMode === 'grid');
    }

    // 2. Initialize Feature Manager & modules
    try {
      getFeatureManager().init();
    } catch (err) {
      console.error('Error initializing FeatureManager:', err);
    }

    // 3. Setup all event listeners
    setupEventListeners();

    // 4. Populate bottom information panel
    populateBottomPanelContent();

    // 5. Navigate to default category ("all")
    navigateCategory('all');

    // 6. Select initial default color (#CC33FF)
    selectColor(204, 51, 255);

    // 7. Update sidebar category counts
    updateSidebarCounts();
  };

  // Automatically initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // If DOM already loaded (e.g. script loaded async or deferred)
    setTimeout(init, 0);
  }

  // Public API
  return {
    init,
    showToast,
    selectColor,
    navigateCategory,
    refreshGrid,
    copyToClipboard,
    toggleTheme,
    updateSidebarCounts,
    getCurrentColor: () => currentColor,
    getState: () => ({
      currentColor,
      currentCategory,
      currentPage,
      pageSize,
      sortMode,
      viewMode,
      searchQuery
    })
  };
})();

// Attach to window for global access
window.App = App;
