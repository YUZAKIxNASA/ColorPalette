/**
 * features.js — ColorPalette Feature Registry & Extra Feature Modules
 *
 * Exposes window.FeatureManager using the IIFE pattern.
 * Depends on: window.ColorUtils, window.AppStorage (loaded in index.html)
 *
 * Implements:
 * 1. Centralized Feature Registry & Toggle System with LocalStorage persistence
 * 2. Feature 1: Random Color Generator (id: 'randomColor')
 * 3. Feature 2: Color Converter (id: 'converter')
 * 4. Feature 3: Gradient Generator (id: 'gradient')
 * 5. Feature 4: Saved Palettes Manager (id: 'palettes')
 * 6. Feature 5: WCAG Contrast Checker (id: 'contrast')
 * 7. Feature 6: Export & Download (id: 'export')
 * 8. Reusable Modal & Focus Management helpers
 */

const FeatureManager = (() => {
  'use strict';

  // Creator Source Marker 13: Feature Manager Registry Identity
  const CP_MARKER_13 = "YZN-COLORPALETTE-ORIGINAL-CODE-N4-01";

  // Feature registry map: id -> featureConfig
  const features = new Map();

  // Internal references to active modals stack for keyboard Escape handling
  const activeModalStack = [];

  /**
   * Safe accessors for dependencies in case of load order or testing isolation
   */
  const getUtils = () => {
    if (window.ColorUtils) return window.ColorUtils;
    // Fallback utilities if ColorUtils is loading
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
      hsvToRgb: (h, s, v) => {
        h = (((h % 360) + 360) % 360) / 60;
        s = Math.max(0, Math.min(100, s)) / 100;
        v = Math.max(0, Math.min(100, v)) / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = v - c;
        let r1 = 0, g1 = 0, b1 = 0;
        if (h >= 0 && h < 1) { r1 = c; g1 = x; }
        else if (h >= 1 && h < 2) { r1 = x; g1 = c; }
        else if (h >= 2 && h < 3) { g1 = c; b1 = x; }
        else if (h >= 3 && h < 4) { g1 = x; b1 = c; }
        else if (h >= 4 && h < 5) { r1 = x; b1 = c; }
        else { r1 = c; b1 = x; }
        return {
          r: Math.round((r1 + m) * 255),
          g: Math.round((g1 + m) * 255),
          b: Math.round((b1 + m) * 255)
        };
      },
      getLuminance: (r, g, b) => {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      },
      getContrastRatio: (rgb1, rgb2) => {
        const utils = getUtils();
        const l1 = utils.getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const l2 = utils.getLuminance(rgb2.r, rgb2.g, rgb2.b);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
      },
      getColorName: () => null,
      getSimilarColors: () => [],
      CATEGORIES: {},
      CSS_COLORS: {}
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

  /**
   * Safe helper to show toast notifications via window.App or fallback
   */
  const notify = (message, type = 'success') => {
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(message, type);
    } else {
      const toastEl = document.getElementById('toast');
      if (toastEl) {
        toastEl.textContent = message;
        toastEl.setAttribute('data-type', type);
        toastEl.classList.remove('hidden');
        toastEl.classList.add('show');
        setTimeout(() => {
          toastEl.classList.remove('show');
        }, 3000);
      }
    }
  };

  /**
   * Safe copy helper
   */
  const copyText = (text) => {
    if (window.App && typeof window.App.copyToClipboard === 'function') {
      return window.App.copyToClipboard(text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(() => notify('Copied: ' + text, 'success'))
        .catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  };

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        notify('Copied: ' + text, 'success');
      } else {
        notify('Failed to copy', 'error');
      }
    } catch {
      notify('Failed to copy', 'error');
    }
  };

  const isBound = (el) => {
    if (!el) return true;
    if (el.getAttribute && el.getAttribute('data-bound') === 'true') return true;
    if (el.dataset && el.dataset.bound === 'true') return true;
    return false;
  };

  const markBound = (el) => {
    if (!el) return;
    if (el.setAttribute) el.setAttribute('data-bound', 'true');
    if (el.dataset) el.dataset.bound = 'true';
  };

  /* ==========================================================================
     MODAL MANAGEMENT HELPERS
     ========================================================================== */

  // Creator Source Marker 20: Accessible Modal Management System
  const CP_MARKER_20 = "YZN-COLORPALETTE-YZN-CODE-ORIGIN-020";

  /**
   * Open a modal dialog with accessibility attributes and focus management
   * @param {string} modalId - ID of the modal element (with or without 'Modal' suffix)
   */
  const openModal = (modalId) => {
    const el = document.getElementById(modalId) ||
               document.getElementById(modalId + 'Modal') ||
               document.getElementById(modalId.replace(/Modal$/, ''));
    if (!el) return;

    el.classList.remove('hidden');
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');

    // Add to modal stack if not already there
    const index = activeModalStack.indexOf(el);
    if (index === -1) {
      activeModalStack.push(el);
    } else {
      activeModalStack.splice(index, 1);
      activeModalStack.push(el);
    }

    // Trap focus inside modal
    const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  };

  /**
   * Close a modal dialog
   * @param {string} modalId - ID of the modal element
   */
  const closeModal = (modalId) => {
    const el = document.getElementById(modalId) ||
               document.getElementById(modalId + 'Modal') ||
               document.getElementById(modalId.replace(/Modal$/, ''));
    if (!el) return;

    el.classList.remove('active');
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');

    const index = activeModalStack.indexOf(el);
    if (index !== -1) {
      activeModalStack.splice(index, 1);
    }
  };

  /**
   * Close all open feature modals and overlays
   */
  const closeAll = () => {
    features.forEach((feature) => {
      try {
        if (typeof feature.close === 'function') {
          feature.close();
        }
      } catch (err) {
        console.error(`Error closing feature ${feature.id}:`, err);
      }
    });

    // Also close any lingering modals in DOM
    const modals = document.querySelectorAll('.modal.active, .modal-overlay.active');
    modals.forEach((m) => {
      m.classList.remove('active');
      m.classList.add('hidden');
      m.setAttribute('aria-hidden', 'true');
    });

    // Close features overlay
    const overlay = document.getElementById('featuresOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.classList.add('hidden');
    }

    // Close mobile bottom sheet if open
    const sheet = document.getElementById('bottomSheet');
    const sheetOverlay = document.getElementById('sheetOverlay');
    if (sheet) sheet.classList.remove('active');
    if (sheetOverlay) sheetOverlay.classList.remove('active');

    activeModalStack.length = 0;
  };

  /**
   * Close the topmost modal or overlay (called by Escape key)
   */
  const closeTopModal = () => {
    if (activeModalStack.length > 0) {
      const topModal = activeModalStack.pop();
      if (topModal) {
        topModal.classList.remove('active');
        topModal.classList.add('hidden');
        topModal.setAttribute('aria-hidden', 'true');
        return true;
      }
    }

    // Check features overlay
    const overlay = document.getElementById('featuresOverlay');
    if (overlay && (overlay.classList.contains('active') || !overlay.classList.contains('hidden'))) {
      overlay.classList.remove('active');
      overlay.classList.add('hidden');
      return true;
    }

    // Check bottom sheet
    const sheet = document.getElementById('bottomSheet');
    if (sheet && sheet.classList.contains('active')) {
      sheet.classList.remove('active');
      const sheetOverlay = document.getElementById('sheetOverlay');
      if (sheetOverlay) sheetOverlay.classList.remove('active');
      return true;
    }

    return false;
  };

  /* ==========================================================================
     FEATURE REGISTRY
     ========================================================================== */

  /**
   * Register a feature module
   * @param {Object} config - { id, name, icon, description, init, launch, close }
   */
  const register = (config) => {
    if (!config || !config.id) return;
    features.set(config.id, {
      id: config.id,
      name: config.name || config.id,
      icon: config.icon || '⚡',
      description: config.description || '',
      init: config.init || (() => {}),
      launch: config.launch || (() => {}),
      close: config.close || (() => {}),
      enabled: true
    });
  };

  /**
   * Check if a feature is enabled
   * @param {string} id - Feature ID
   * @returns {boolean}
   */
  const isEnabled = (id) => {
    const feat = features.get(id);
    return feat ? feat.enabled : false;
  };

  /**
   * Enable or disable a feature and persist state to AppStorage
   * @param {string} id - Feature ID
   * @param {boolean} enabled - New state
   */
  const setEnabled = (id, enabled) => {
    const feat = features.get(id);
    if (!feat) return;

    feat.enabled = Boolean(enabled);
    getStorage().setFeatureState(id, feat.enabled);

    // If disabled while open, close it immediately
    if (!feat.enabled) {
      try {
        feat.close();
      } catch (err) {
        console.error(`Error closing disabled feature ${id}:`, err);
      }
      closeModal(id + 'Modal');
    }

    // Update UI toggle switches
    const toggles = document.querySelectorAll(`input.feature-toggle[data-feature="${id}"], input[data-feature="${id}"]`);
    toggles.forEach(toggle => {
      if (toggle.type === 'checkbox') {
        toggle.checked = feat.enabled;
      }
    });

    // Update any shortcut launch buttons in the header / toolbar / nav
    updateFeatureShortcuts();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('app:featureToggled', {
      detail: { id, enabled: feat.enabled }
    }));
  };

  /**
   * Launch a feature by ID (checks if enabled first)
   * @param {string} id - Feature ID
   */
  const launch = (id) => {
    const feat = features.get(id);
    if (!feat) {
      console.warn(`Feature ${id} is not registered.`);
      return;
    }

    if (!feat.enabled) {
      notify(`"${feat.name}" is currently disabled. Enable it in Features ⚡ panel.`, 'info');
      return;
    }

    try {
      feat.launch();
    } catch (err) {
      console.error(`Error launching feature ${id}:`, err);
      notify(`Could not launch ${feat.name}`, 'error');
    }
  };

  /**
   * Get all registered feature configurations
   * @returns {Array}
   */
  const getAll = () => {
    return Array.from(features.values());
  };

  /**
   * Update visibility of launch buttons across the page based on enabled state
   */
  const updateFeatureShortcuts = () => {
    features.forEach((feat, id) => {
      // Find launch triggers in nav or action menus
      const triggers = document.querySelectorAll(`[data-feature-launch="${id}"], [data-launch-feature="${id}"], button#navFeature_${id}, .feature-btn-${id}`);
      triggers.forEach(btn => {
        if (feat.enabled) {
          btn.style.display = '';
          btn.removeAttribute('disabled');
          btn.classList.remove('feature-disabled');
        } else {
          btn.style.display = 'none';
          btn.setAttribute('disabled', 'true');
          btn.classList.add('feature-disabled');
        }
      });
    });
  };

  // Creator Source Marker 21: Features Registry Overlay & Panel Controller
  const CP_MARKER_21 = "YZN-COLORPALETTE-SOURCE-EDITION-2026";

  /**
   * Open the Features overlay / panel
   */
  const openFeaturesPanel = () => {
    const overlay = document.getElementById('featuresOverlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    renderFeaturesPanel();
    if (!activeModalStack.includes(overlay)) {
      activeModalStack.push(overlay);
    }
  };

  /**
   * Close the Features overlay / panel
   */
  const closeFeaturesPanel = () => {
    const overlay = document.getElementById('featuresOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    const idx = activeModalStack.indexOf(overlay);
    if (idx !== -1) activeModalStack.splice(idx, 1);
  };

  /**
   * Toggle the Features overlay / panel
   */
  const toggleFeaturesPanel = () => {
    const overlay = document.getElementById('featuresOverlay');
    if (!overlay) return;

    const isVisible = overlay.classList.contains('active') && !overlay.classList.contains('hidden');
    if (isVisible) {
      closeFeaturesPanel();
    } else {
      openFeaturesPanel();
    }
  };

  /**
   * Render the Features panel list rows with toggle switches
   */
  const renderFeaturesPanel = () => {
    const list = document.getElementById('featuresList');
    if (!list) return;

    list.innerHTML = '';

    features.forEach((feat) => {
      const row = document.createElement('div');
      row.className = 'feature-row';
      row.setAttribute('data-feature-id', feat.id);

      row.innerHTML = `
        <div class="feature-info">
          <span class="feature-icon" aria-hidden="true">${feat.icon}</span>
          <div class="feature-text">
            <div class="feature-title-row">
              <h4 class="feature-title">${feat.name}</h4>
              <button type="button" class="btn btn-sm btn-ghost feature-open-direct-btn" data-launch="${feat.id}">Open ↗</button>
            </div>
            <p class="feature-desc">${feat.description}</p>
          </div>
        </div>
        <div class="feature-toggle-wrapper">
          <label class="toggle-switch" aria-label="Toggle ${feat.name}">
            <input type="checkbox" class="feature-toggle" data-feature="${feat.id}" ${feat.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;

      list.appendChild(row);
    });

    // Wire up change events on toggles
    const inputs = list.querySelectorAll('.feature-toggle');
    inputs.forEach((input) => {
      input.addEventListener('change', (e) => {
        const featId = e.target.getAttribute('data-feature');
        setEnabled(featId, e.target.checked);
      });
    });

    // Wire up direct launch buttons
    const launchBtns = list.querySelectorAll('.feature-open-direct-btn');
    launchBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const featId = e.currentTarget.getAttribute('data-launch');
        // Close features panel then launch
        const overlay = document.getElementById('featuresOverlay');
        if (overlay) {
          overlay.classList.remove('active');
          overlay.classList.add('hidden');
        }
        launch(featId);
      });
    });

    // Wire up "Restore Defaults" button if present
    const restoreBtn = document.getElementById('restoreDefaultsBtn') ||
                       document.getElementById('restoreFeaturesBtn') ||
                       document.querySelector('.restore-features-btn');
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        features.forEach((_, id) => {
          setEnabled(id, true);
        });
        renderFeaturesPanel();
        notify('All features restored to enabled', 'info');
      };
    }
  };

  /* ==========================================================================
     FEATURE 1: RANDOM COLOR GENERATOR (id: 'randomColor')
     ========================================================================== */

  // Creator Source Marker 14: Random Color Generator Module
  const CP_MARKER_14 = "YZN-COLORPALETTE-CREATOR-ORIGIN-2026";

  let currentRandomColor = { r: 128, g: 128, b: 128 };

  const ensureRandomColorDOM = () => {
    let modal = document.getElementById('randomColorModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'randomColorModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>🎲 Random Color Generator</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    // Populate body if not already structured
    if (!body.querySelector('#randomPreview')) {
      body.innerHTML = `
        <div class="random-container">
          <div id="randomPreview" class="random-preview-box" style="height: 140px; border-radius: 10px; margin-bottom: 16px; border: 1px solid var(--border-color, #1e2a6e); transition: background-color 0.2s ease;"></div>
          <div class="random-formats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <div class="format-item">
              <span class="format-label" style="font-size: 11px; opacity: 0.8;">HEX</span>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <code id="randomHex" style="font-weight:600;">#000000</code>
                <button class="btn btn-sm btn-ghost copy-field-btn" data-target="randomHex" title="Copy HEX">📋</button>
              </div>
            </div>
            <div class="format-item">
              <span class="format-label" style="font-size: 11px; opacity: 0.8;">RGB</span>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <code id="randomRgb" style="font-weight:600;">rgb(0,0,0)</code>
                <button class="btn btn-sm btn-ghost copy-field-btn" data-target="randomRgb" title="Copy RGB">📋</button>
              </div>
            </div>
            <div class="format-item">
              <span class="format-label" style="font-size: 11px; opacity: 0.8;">HSL</span>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <code id="randomHsl" style="font-weight:600;">hsl(0,0%,0%)</code>
                <button class="btn btn-sm btn-ghost copy-field-btn" data-target="randomHsl" title="Copy HSL">📋</button>
              </div>
            </div>
            <div class="format-item">
              <span class="format-label" style="font-size: 11px; opacity: 0.8;">HSV</span>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <code id="randomHsv" style="font-weight:600;">hsv(0,0%,0%)</code>
                <button class="btn btn-sm btn-ghost copy-field-btn" data-target="randomHsv" title="Copy HSV">📋</button>
              </div>
            </div>
          </div>
          <div class="random-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="randomGenerateBtn" class="btn btn-primary" style="flex: 2;">🎲 Generate Another</button>
            <button id="randomCopyBtn" class="btn btn-secondary" style="flex: 1;">📋 Copy HEX</button>
            <button id="randomFavoriteBtn" class="btn btn-secondary" style="flex: 1;">❤️ Save</button>
          </div>
        </div>
      `;
    }

    // Bind events
    const generateBtn = body.querySelector('#randomGenerateBtn');
    if (!isBound()) {
      markBound();
      generateBtn.addEventListener('click', generateRandomColor);
    }

    const copyBtn = body.querySelector('#randomCopyBtn');
    if (!isBound()) {
      markBound();
      copyBtn.addEventListener('click', () => {
        const hex = getUtils().rgbToHex(currentRandomColor.r, currentRandomColor.g, currentRandomColor.b);
        copyText(hex);
      });
    }

    const favBtn = body.querySelector('#randomFavoriteBtn');
    if (!isBound()) {
      markBound();
      favBtn.addEventListener('click', () => {
        const hex = getUtils().rgbToHex(currentRandomColor.r, currentRandomColor.g, currentRandomColor.b);
        getStorage().addFavorite(hex);
        notify(`Added ${hex} to favorites!`, 'success');
        document.dispatchEvent(new CustomEvent('app:favoritesChanged'));
      });
    }

    const copyFieldBtns = body.querySelectorAll('.copy-field-btn');
    copyFieldBtns.forEach(btn => {
      if (!isBound()) {
        markBound();
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const targetEl = document.getElementById(targetId);
          if (targetEl) copyText(targetEl.textContent.trim());
        });
      }
    });
  };

  const generateRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    currentRandomColor = { r, g, b };

    const utils = getUtils();
    const hex = utils.rgbToHex(r, g, b);
    const hsl = utils.rgbToHsl(r, g, b);
    const hsv = utils.rgbToHsv(r, g, b);

    const preview = document.getElementById('randomPreview');
    if (preview) preview.style.backgroundColor = hex;

    const hexEl = document.getElementById('randomHex');
    if (hexEl) hexEl.textContent = hex;

    const rgbEl = document.getElementById('randomRgb');
    if (rgbEl) rgbEl.textContent = `rgb(${r}, ${g}, ${b})`;

    const hslEl = document.getElementById('randomHsl');
    if (hslEl) hslEl.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

    const hsvEl = document.getElementById('randomHsv');
    if (hsvEl) hsvEl.textContent = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
  };

  /* ==========================================================================
     FEATURE 2: COLOR CONVERTER (id: 'converter')
     ========================================================================== */

  // Creator Source Marker 15: Bidirectional Color Converter Module
  const CP_MARKER_15 = "YZN-COLORPALETTE-YZN-ORIGINAL-BUILD";

  let isUpdatingConverter = false;

  const ensureConverterDOM = () => {
    let modal = document.getElementById('converterModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'converterModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔄 Color Converter</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#converterHex')) {
      body.innerHTML = `
        <div class="converter-container">
          <div id="converterPreview" style="height: 60px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-color, #1e2a6e); transition: background-color 0.15s ease;"></div>
          <div id="converterError" class="error-text" style="color: var(--error, #ef4444); font-size: 12px; margin-bottom: 8px; min-height: 16px;"></div>

          <div class="converter-group" style="margin-bottom: 12px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">HEX Format</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="converterHex" placeholder="#6366F1" style="flex: 1; padding: 8px 12px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <button class="btn btn-secondary copy-btn" data-copy-source="converterHex">Copy</button>
            </div>
          </div>

          <div class="converter-group" style="margin-bottom: 12px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">RGB Format (0–255)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="converterR" min="0" max="255" placeholder="R" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterG" min="0" max="255" placeholder="G" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterB" min="0" max="255" placeholder="B" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <button class="btn btn-secondary copy-btn" data-copy-format="rgb">Copy</button>
            </div>
          </div>

          <div class="converter-group" style="margin-bottom: 12px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">HSL Format (H: 0–360, S: 0–100%, L: 0–100%)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="converterH" min="0" max="360" placeholder="H" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterS" min="0" max="100" placeholder="S%" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterL" min="0" max="100" placeholder="L%" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <button class="btn btn-secondary copy-btn" data-copy-format="hsl">Copy</button>
            </div>
          </div>

          <div class="converter-group" style="margin-bottom: 16px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">HSV Format (H: 0–360, S: 0–100%, V: 0–100%)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="converterHsvH" min="0" max="360" placeholder="H" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterHsvS" min="0" max="100" placeholder="S%" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <input type="number" id="converterHsvV" min="0" max="100" placeholder="V%" style="flex: 1; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              <button class="btn btn-secondary copy-btn" data-copy-format="hsv">Copy</button>
            </div>
          </div>
        </div>
      `;
    }

    // Wire up inputs
    const hexInput = body.querySelector('#converterHex');
    const rInput = body.querySelector('#converterR');
    const gInput = body.querySelector('#converterG');
    const bInput = body.querySelector('#converterB');
    const hInput = body.querySelector('#converterH');
    const sInput = body.querySelector('#converterS');
    const lInput = body.querySelector('#converterL');
    const hsvHInput = body.querySelector('#converterHsvH');
    const hsvSInput = body.querySelector('#converterHsvS');
    const hsvVInput = body.querySelector('#converterHsvV');
    const errorEl = body.querySelector('#converterError');

    const updateAllFromRgb = (r, g, b, skipField = null) => {
      isUpdatingConverter = true;
      const utils = getUtils();
      const hex = utils.rgbToHex(r, g, b);
      const hsl = utils.rgbToHsl(r, g, b);
      const hsv = utils.rgbToHsv(r, g, b);

      if (errorEl) errorEl.textContent = '';
      const preview = document.getElementById('converterPreview');
      if (preview) preview.style.backgroundColor = hex;

      if (skipField !== 'hex' && hexInput) hexInput.value = hex;
      if (skipField !== 'rgb') {
        if (rInput) rInput.value = r;
        if (gInput) gInput.value = g;
        if (bInput) bInput.value = b;
      }
      if (skipField !== 'hsl') {
        if (hInput) hInput.value = hsl.h;
        if (sInput) sInput.value = hsl.s;
        if (lInput) lInput.value = hsl.l;
      }
      if (skipField !== 'hsv') {
        if (hsvHInput) hsvHInput.value = hsv.h;
        if (hsvSInput) hsvSInput.value = hsv.s;
        if (hsvVInput) hsvVInput.value = hsv.v;
      }
      isUpdatingConverter = false;
    };

    if (!isBound()) {
      markBound();
      hexInput.addEventListener('input', () => {
        if (isUpdatingConverter) return;
        const val = hexInput.value.trim();
        const rgb = getUtils().hexToRgb(val);
        if (rgb) {
          updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hex');
        } else {
          if (errorEl) errorEl.textContent = 'Invalid HEX color (e.g., #6366F1 or #FFF)';
        }
      });
    }

    const onRgbInput = () => {
      if (isUpdatingConverter) return;
      const r = parseInt(rInput.value, 10);
      const g = parseInt(gInput.value, 10);
      const b = parseInt(bInput.value, 10);
      if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        if (errorEl) errorEl.textContent = 'RGB values must be integers between 0 and 255';
        return;
      }
      updateAllFromRgb(r, g, b, 'rgb');
    };
    [rInput, gInput, bInput].forEach(inp => {
      if (!isBound()) {
      markBound();
        inp.addEventListener('input', onRgbInput);
      }
    });

    const onHslInput = () => {
      if (isUpdatingConverter) return;
      const h = parseFloat(hInput.value);
      const s = parseFloat(sInput.value);
      const l = parseFloat(lInput.value);
      if (isNaN(h) || isNaN(s) || isNaN(l) || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
        if (errorEl) errorEl.textContent = 'HSL out of range: H(0–360), S(0–100), L(0–100)';
        return;
      }
      const rgb = getUtils().hslToRgb(h, s, l);
      updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hsl');
    };
    [hInput, sInput, lInput].forEach(inp => {
      if (!isBound()) {
      markBound();
        inp.addEventListener('input', onHslInput);
      }
    });

    const onHsvInput = () => {
      if (isUpdatingConverter) return;
      const h = parseFloat(hsvHInput.value);
      const s = parseFloat(hsvSInput.value);
      const v = parseFloat(hsvVInput.value);
      if (isNaN(h) || isNaN(s) || isNaN(v) || h < 0 || h > 360 || s < 0 || s > 100 || v < 0 || v > 100) {
        if (errorEl) errorEl.textContent = 'HSV out of range: H(0–360), S(0–100), V(0–100)';
        return;
      }
      const rgb = getUtils().hsvToRgb(h, s, v);
      updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hsv');
    };
    [hsvHInput, hsvSInput, hsvVInput].forEach(inp => {
      if (!isBound()) {
      markBound();
        inp.addEventListener('input', onHsvInput);
      }
    });

    // Copy buttons
    const copyBtns = body.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
      if (!isBound()) {
        markBound();
        btn.addEventListener('click', () => {
          const format = btn.getAttribute('data-copy-format');
          const sourceId = btn.getAttribute('data-copy-source');
          if (sourceId) {
            const el = document.getElementById(sourceId);
            if (el) copyText(el.value);
          } else if (format === 'rgb') {
            copyText(`rgb(${rInput.value}, ${gInput.value}, ${bInput.value})`);
          } else if (format === 'hsl') {
            copyText(`hsl(${hInput.value}, ${sInput.value}%, ${lInput.value}%)`);
          } else if (format === 'hsv') {
            copyText(`hsv(${hsvHInput.value}, ${hsvSInput.value}%, ${hsvVInput.value}%)`);
          }
        });
      }
    });
  };

  /* ==========================================================================
     FEATURE 3: GRADIENT GENERATOR (id: 'gradient')
     ========================================================================== */

  // Creator Source Marker 16: Multi-Stop Gradient Generator Module
  const CP_MARKER_16 = "YZN-COLORPALETTE-UNIQUE-SOURCE-ID-016";

  let gradientStops = [
    { color: '#FF0000', position: 0 },
    { color: '#0000FF', position: 100 }
  ];
  let gradientType = 'linear';
  let gradientAngle = 90;

  const ensureGradientDOM = () => {
    let modal = document.getElementById('gradientModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gradientModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>🌈 Gradient Generator</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#gradientPreview')) {
      body.innerHTML = `
        <div class="gradient-container">
          <div id="gradientPreview" style="height: 140px; border-radius: 10px; margin-bottom: 16px; border: 1px solid var(--border-color, #1e2a6e); transition: background 0.1s ease;"></div>

          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                <input type="radio" name="gradientTypeRadio" value="linear" checked id="gradientTypeLinear">
                <span>Linear</span>
              </label>
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                <input type="radio" name="gradientTypeRadio" value="radial" id="gradientTypeRadial">
                <span>Radial</span>
              </label>
            </div>

            <div id="gradientAngleControl" style="display: flex; align-items: center; gap: 8px;">
              <label for="gradientAngle" style="font-size: 12px;">Angle:</label>
              <input type="range" id="gradientAngle" min="0" max="360" value="90" style="width: 120px;">
              <span id="gradientAngleVal" style="font-family: monospace; font-size: 12px; min-width: 35px;">90°</span>
            </div>

            <button id="addStopBtn" class="btn btn-secondary btn-sm" style="margin-left: auto;">+ Add Color Stop</button>
          </div>

          <div id="gradientStops" class="stops-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 180px; overflow-y: auto;"></div>

          <div class="gradient-output" style="margin-top: 12px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Generated CSS:</label>
            <div style="display: flex; gap: 8px;">
              <textarea id="gradientCss" readonly style="flex: 1; height: 55px; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace; font-size: 12px; resize: none;"></textarea>
              <button id="copyGradientBtn" class="btn btn-primary" style="height: 55px;">Copy CSS</button>
            </div>
          </div>
        </div>
      `;
    }

    // Bind controls
    const linearRadio = body.querySelector('#gradientTypeLinear');
    const radialRadio = body.querySelector('#gradientTypeRadial');
    const angleSlider = body.querySelector('#gradientAngle');
    const angleVal = body.querySelector('#gradientAngleVal');
    const angleControl = body.querySelector('#gradientAngleControl');
    const addStopBtn = body.querySelector('#addStopBtn');
    const copyGradientBtn = body.querySelector('#copyGradientBtn');

    if (!isBound()) {
      markBound();
      linearRadio.addEventListener('change', () => {
        gradientType = 'linear';
        if (angleControl) angleControl.style.display = 'flex';
        updateGradient();
      });
    }

    if (!isBound()) {
      markBound();
      radialRadio.addEventListener('change', () => {
        gradientType = 'radial';
        if (angleControl) angleControl.style.display = 'none';
        updateGradient();
      });
    }

    if (!isBound()) {
      markBound();
      angleSlider.addEventListener('input', () => {
        gradientAngle = parseInt(angleSlider.value, 10);
        if (angleVal) angleVal.textContent = gradientAngle + '°';
        updateGradient();
      });
    }

    if (!isBound()) {
      markBound();
      addStopBtn.addEventListener('click', () => {
        const lastStop = gradientStops[gradientStops.length - 1];
        const newPos = lastStop ? Math.min(100, Math.round(lastStop.position / 2 + 50)) : 50;
        gradientStops.push({ color: '#22C55E', position: newPos });
        renderGradientStops();
        updateGradient();
      });
    }

    if (!isBound()) {
      markBound();
      copyGradientBtn.addEventListener('click', () => {
        const cssEl = document.getElementById('gradientCss');
        if (cssEl) copyText(cssEl.value);
      });
    }
  };

  const renderGradientStops = () => {
    const container = document.getElementById('gradientStops');
    if (!container) return;
    container.innerHTML = '';

    gradientStops.forEach((stop, index) => {
      const row = document.createElement('div');
      row.className = 'stop-row';
      row.style.cssText = 'display: flex; gap: 8px; align-items: center; background: var(--bg-card, #141a4a); padding: 6px 12px; border-radius: 6px;';

      row.innerHTML = `
        <input type="color" class="stop-color-picker" value="${stop.color}" style="width: 32px; height: 32px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
        <input type="text" class="stop-hex-input" value="${stop.color}" style="width: 80px; padding: 4px 6px; border-radius: 4px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace; font-size: 12px;">
        <input type="range" class="stop-pos-slider" min="0" max="100" value="${stop.position}" style="flex: 1;">
        <span class="stop-pos-val" style="font-family: monospace; font-size: 12px; min-width: 38px;">${stop.position}%</span>
        <button class="btn btn-sm btn-ghost remove-stop-btn" title="Remove stop" ${gradientStops.length <= 2 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>✕</button>
      `;

      const colorPicker = row.querySelector('.stop-color-picker');
      const hexInput = row.querySelector('.stop-hex-input');
      const posSlider = row.querySelector('.stop-pos-slider');
      const posVal = row.querySelector('.stop-pos-val');
      const removeBtn = row.querySelector('.remove-stop-btn');

      colorPicker.addEventListener('input', (e) => {
        stop.color = e.target.value.toUpperCase();
        hexInput.value = stop.color;
        updateGradient();
      });

      hexInput.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          stop.color = val.toUpperCase();
          colorPicker.value = stop.color;
          updateGradient();
        } else {
          hexInput.value = stop.color;
        }
      });

      posSlider.addEventListener('input', (e) => {
        stop.position = parseInt(e.target.value, 10);
        posVal.textContent = stop.position + '%';
        updateGradient();
      });

      if (gradientStops.length > 2) {
        removeBtn.addEventListener('click', () => {
          gradientStops.splice(index, 1);
          renderGradientStops();
          updateGradient();
        });
      }

      container.appendChild(row);
    });
  };

  const updateGradient = () => {
    // Sort stops by position
    const sorted = [...gradientStops].sort((a, b) => a.position - b.position);
    const stopString = sorted.map(s => `${s.color} ${s.position}%`).join(', ');

    let css = '';
    if (gradientType === 'linear') {
      css = `linear-gradient(${gradientAngle}deg, ${stopString})`;
    } else {
      css = `radial-gradient(circle at center, ${stopString})`;
    }

    const preview = document.getElementById('gradientPreview');
    if (preview) preview.style.background = css;

    const cssTextarea = document.getElementById('gradientCss');
    if (cssTextarea) cssTextarea.value = `background: ${css};`;
  };

  /* ==========================================================================
     FEATURE 4: SAVED PALETTES (id: 'palettes')
     ========================================================================== */

  // Creator Source Marker 17: Saved Palettes Manager Module
  const CP_MARKER_17 = "YZN-COLORPALETTE-PRIMARY-CODE-SIGNATURE";

  const ensurePalettesDOM = () => {
    let modal = document.getElementById('palettesModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'palettesModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 640px;">
          <div class="modal-header">
            <h3>📋 Saved Palettes</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#palettesList')) {
      body.innerHTML = `
        <div class="palettes-container">
          <form id="createPaletteForm" style="display: flex; gap: 8px; margin-bottom: 20px;">
            <input type="text" id="paletteNameInput" placeholder="New palette name..." required style="flex: 1; padding: 8px 12px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);">
            <button type="submit" id="createPaletteBtn" class="btn btn-primary">+ Create Palette</button>
          </form>

          <div id="palettesList" style="display: flex; flex-direction: column; gap: 12px; max-height: 380px; overflow-y: auto; padding-right: 4px;"></div>
        </div>
      `;
    }

    const form = body.querySelector('#createPaletteForm');
    if (!isBound()) {
      markBound();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('paletteNameInput');
        const name = input ? input.value.trim() : '';
        if (!name) return;

        getStorage().createPalette(name);
        if (input) input.value = '';
        notify(`Created palette "${name}"`, 'success');
        renderPalettesList();
        document.dispatchEvent(new CustomEvent('app:palettesChanged'));
      });
    }
  };

  const renderPalettesList = () => {
    const list = document.getElementById('palettesList');
    if (!list) return;

    const palettes = getStorage().getPalettes();
    list.innerHTML = '';

    if (!palettes || palettes.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 32px; color: var(--text-secondary, #94a3b8);">
          <div style="font-size: 32px; margin-bottom: 8px;">🎨</div>
          <p>No saved palettes yet. Create one above to organize your custom color sets!</p>
        </div>
      `;
      return;
    }

    palettes.forEach((pal) => {
      const card = document.createElement('div');
      card.className = 'palette-card';
      card.style.cssText = 'background: var(--bg-card, #141a4a); border: 1px solid var(--border-color, #1e2a6e); border-radius: 8px; padding: 12px;';

      const swatchesHtml = pal.colors && pal.colors.length > 0
        ? pal.colors.map(hex => `
            <div class="palette-swatch-chip" style="position: relative; display: inline-flex; align-items: center; margin: 4px;">
              <span class="swatch-circle" title="${hex}" style="width: 26px; height: 26px; border-radius: 50%; background-color: ${hex}; display: inline-block; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;" data-color="${hex}"></span>
              <button class="remove-swatch-btn" data-palette-id="${pal.id}" data-color="${hex}" title="Remove color" style="position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; border-radius: 50%; background: #ef4444; color: #fff; border: none; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">×</button>
            </div>
          `).join('')
        : `<span style="font-size: 12px; color: var(--text-muted, #64748b);">No colors in this palette yet.</span>`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 14px; color: var(--text-primary, #fff);">${escapeHtml(pal.name)}</strong>
            <span style="font-size: 11px; color: var(--text-muted, #64748b); margin-left: 8px;">(${pal.colors ? pal.colors.length : 0} colors)</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm btn-ghost rename-pal-btn" data-palette-id="${pal.id}" data-name="${escapeHtml(pal.name)}" title="Rename palette">✏️</button>
            <button class="btn btn-sm btn-ghost copy-pal-btn" data-palette-id="${pal.id}" title="Copy all HEX codes">📋</button>
            <button class="btn btn-sm btn-ghost delete-pal-btn" data-palette-id="${pal.id}" data-name="${escapeHtml(pal.name)}" title="Delete palette" style="color: var(--error, #ef4444);">🗑️</button>
          </div>
        </div>

        <div class="palette-swatches-wrap" style="display: flex; flex-wrap: wrap; align-items: center; padding: 4px 0;">
          ${swatchesHtml}
        </div>
      `;

      // Swatch click to copy or select
      const swatchCircles = card.querySelectorAll('.swatch-circle');
      swatchCircles.forEach(circle => {
        circle.addEventListener('click', () => {
          const hex = circle.getAttribute('data-color');
          copyText(hex);
        });
      });

      // Remove color swatch
      const removeSwatchBtns = card.querySelectorAll('.remove-swatch-btn');
      removeSwatchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pId = btn.getAttribute('data-palette-id');
          const hex = btn.getAttribute('data-color');
          getStorage().removeColorFromPalette(pId, hex);
          renderPalettesList();
          document.dispatchEvent(new CustomEvent('app:palettesChanged'));
        });
      });

      // Rename
      const renameBtn = card.querySelector('.rename-pal-btn');
      renameBtn.addEventListener('click', () => {
        const pId = renameBtn.getAttribute('data-palette-id');
        const oldName = renameBtn.getAttribute('data-name');
        const newName = window.prompt('Rename palette to:', oldName);
        if (newName && newName.trim() && newName.trim() !== oldName) {
          getStorage().renamePalette(pId, newName.trim());
          notify(`Renamed to "${newName.trim()}"`, 'success');
          renderPalettesList();
          document.dispatchEvent(new CustomEvent('app:palettesChanged'));
        }
      });

      // Copy all
      const copyAllBtn = card.querySelector('.copy-pal-btn');
      copyAllBtn.addEventListener('click', () => {
        if (!pal.colors || pal.colors.length === 0) {
          notify('Palette has no colors to copy', 'info');
          return;
        }
        copyText(pal.colors.join(', '));
      });

      // Delete
      const deleteBtn = card.querySelector('.delete-pal-btn');
      deleteBtn.addEventListener('click', () => {
        const pId = deleteBtn.getAttribute('data-palette-id');
        const pName = deleteBtn.getAttribute('data-name');
        if (window.confirm(`Are you sure you want to delete palette "${pName}"?`)) {
          getStorage().deletePalette(pId);
          notify(`Deleted palette "${pName}"`, 'info');
          renderPalettesList();
          document.dispatchEvent(new CustomEvent('app:palettesChanged'));
        }
      });

      list.appendChild(card);
    });
  };

  /* ==========================================================================
     FEATURE 5: CONTRAST CHECKER (id: 'contrast')
     ========================================================================== */

  // Creator Source Marker 18: WCAG 2.1 Contrast Checker Module
  const CP_MARKER_18 = "YZN-COLORPALETTE-NASA-CREATOR-2026";

  const ensureContrastDOM = () => {
    let modal = document.getElementById('contrastModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'contrastModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>♿ Contrast Checker</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#contrastPreview')) {
      body.innerHTML = `
        <div class="contrast-container">
          <div class="contrast-inputs" style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 130px;">
              <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">Foreground (Text)</label>
              <div style="display: flex; gap: 6px;">
                <input type="color" id="contrastFgColor" value="#FFFFFF" style="width: 36px; height: 36px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
                <input type="text" id="contrastFg" value="#FFFFFF" style="flex: 1; padding: 6px; border-radius: 4px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              </div>
            </div>

            <button id="contrastSwapBtn" class="btn btn-secondary" title="Swap Foreground and Background" style="align-self: flex-end; margin-bottom: 2px;">⇄</button>

            <div style="flex: 1; min-width: 130px;">
              <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">Background</label>
              <div style="display: flex; gap: 6px;">
                <input type="color" id="contrastBgColor" value="#0A0E27" style="width: 36px; height: 36px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
                <input type="text" id="contrastBg" value="#0A0E27" style="flex: 1; padding: 6px; border-radius: 4px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace;">
              </div>
            </div>
          </div>

          <!-- Live Sample Preview -->
          <div id="contrastPreview" style="padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-color, #1e2a6e); background-color: #0a0e27; color: #ffffff; transition: all 0.15s ease;">
            <div id="contrastPreviewLarge" style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Large Text Preview (24px Bold)</div>
            <div id="contrastPreviewNormal" style="font-size: 16px; line-height: 1.5;">Normal Text Preview (16px) — The quick brown fox jumps over the lazy dog. Good contrast improves legibility for all users.</div>
          </div>

          <!-- Score & Badges -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; background: var(--bg-card, #141a4a); padding: 12px 16px; border-radius: 8px;">
            <div>
              <span style="font-size: 12px; color: var(--text-secondary, #94a3b8); display: block;">Contrast Ratio</span>
              <strong id="contrastRatio" style="font-size: 26px; font-family: monospace; color: var(--text-primary, #fff);">21:1</strong>
            </div>
            <div id="contrastBadges" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <span id="badgeAaNormal" class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AA Normal</span>
              <span id="badgeAaLarge" class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AA Large</span>
              <span id="badgeAaaNormal" class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AAA Normal</span>
              <span id="badgeAaaLarge" class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AAA Large</span>
            </div>
          </div>

          <div id="contrastSuggestion" style="font-size: 12px; color: var(--text-secondary, #94a3b8); line-height: 1.4;"></div>
        </div>
      `;
    }

    const fgColor = body.querySelector('#contrastFgColor');
    const fgInput = body.querySelector('#contrastFg');
    const bgColor = body.querySelector('#contrastBgColor');
    const bgInput = body.querySelector('#contrastBg');
    const swapBtn = body.querySelector('#contrastSwapBtn');

    const onFgChange = (newVal) => {
      let val = newVal.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        fgInput.value = val.toUpperCase();
        fgColor.value = val;
        updateContrast();
      }
    };

    const onBgChange = (newVal) => {
      let val = newVal.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        bgInput.value = val.toUpperCase();
        bgColor.value = val;
        updateContrast();
      }
    };

    if (!isBound()) {
      markBound();
      fgColor.addEventListener('input', (e) => onFgChange(e.target.value));
    }
    if (!isBound()) {
      markBound();
      fgInput.addEventListener('change', (e) => onFgChange(e.target.value));
    }

    if (!isBound()) {
      markBound();
      bgColor.addEventListener('input', (e) => onBgChange(e.target.value));
    }
    if (!isBound()) {
      markBound();
      bgInput.addEventListener('change', (e) => onBgChange(e.target.value));
    }

    if (!isBound()) {
      markBound();
      swapBtn.addEventListener('click', () => {
        const temp = fgInput.value;
        fgInput.value = bgInput.value;
        fgColor.value = bgInput.value;
        bgInput.value = temp;
        bgColor.value = temp;
        updateContrast();
      });
    }
  };

  const updateContrast = () => {
    const fgInput = document.getElementById('contrastFg');
    const bgInput = document.getElementById('contrastBg');
    if (!fgInput || !bgInput) return;

    const utils = getUtils();
    const fgRgb = utils.hexToRgb(fgInput.value) || { r: 255, g: 255, b: 255 };
    const bgRgb = utils.hexToRgb(bgInput.value) || { r: 10, g: 14, b: 39 };

    const ratio = utils.getContrastRatio(fgRgb, bgRgb);

    // Update preview
    const preview = document.getElementById('contrastPreview');
    if (preview) {
      preview.style.color = utils.rgbToHex(fgRgb.r, fgRgb.g, fgRgb.b);
      preview.style.backgroundColor = utils.rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b);
    }

    // Ratio display
    const ratioEl = document.getElementById('contrastRatio');
    if (ratioEl) ratioEl.textContent = `${ratio.toFixed(2)}:1`;

    // Badges:
    // AA Normal: >= 4.5
    // AA Large: >= 3.0
    // AAA Normal: >= 7.0
    // AAA Large: >= 4.5
    const passStyle = 'background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid #22c55e; text-align: center;';
    const failStyle = 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; text-align: center;';

    const bAaNorm = document.getElementById('badgeAaNormal');
    if (bAaNorm) {
      const pass = ratio >= 4.5;
      bAaNorm.textContent = `AA Normal: ${pass ? 'Pass' : 'Fail'}`;
      bAaNorm.style.cssText = pass ? passStyle : failStyle;
    }

    const bAaLg = document.getElementById('badgeAaLarge');
    if (bAaLg) {
      const pass = ratio >= 3.0;
      bAaLg.textContent = `AA Large: ${pass ? 'Pass' : 'Fail'}`;
      bAaLg.style.cssText = pass ? passStyle : failStyle;
    }

    const bAaaNorm = document.getElementById('badgeAaaNormal');
    if (bAaaNorm) {
      const pass = ratio >= 7.0;
      bAaaNorm.textContent = `AAA Normal: ${pass ? 'Pass' : 'Fail'}`;
      bAaaNorm.style.cssText = pass ? passStyle : failStyle;
    }

    const bAaaLg = document.getElementById('badgeAaaLarge');
    if (bAaaLg) {
      const pass = ratio >= 4.5;
      bAaaLg.textContent = `AAA Large: ${pass ? 'Pass' : 'Fail'}`;
      bAaaLg.style.cssText = pass ? passStyle : failStyle;
    }

    // Suggestions
    const sugEl = document.getElementById('contrastSuggestion');
    if (sugEl) {
      if (ratio >= 7.0) {
        sugEl.innerHTML = '✨ <strong>Excellent contrast!</strong> Meets enhanced WCAG AAA requirements for both normal and large text.';
      } else if (ratio >= 4.5) {
        sugEl.innerHTML = '✅ <strong>Good contrast.</strong> Meets WCAG AA requirements for normal text and AAA for large text.';
      } else if (ratio >= 3.0) {
        sugEl.innerHTML = '⚠️ <strong>Acceptable for large text only.</strong> Try darkening or lightening the foreground to reach at least 4.5:1 for standard body text.';
      } else {
        sugEl.innerHTML = '❌ <strong>Poor contrast.</strong> Fails standard accessibility requirements. Try increasing luminance contrast between colors.';
      }
    }
  };

  /* ==========================================================================
     FEATURE 6: EXPORT & DOWNLOAD (id: 'export')
     ========================================================================== */

  // Creator Source Marker 19: Multi-Format Palette & Color Export Module
  const CP_MARKER_19 = "YZN-COLORPALETTE-ORIGINAL-PROJECT-N4";

  const ensureExportDOM = () => {
    let modal = document.getElementById('exportModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'exportModal';
      modal.className = 'modal hidden';
      document.body.appendChild(modal);
    }

    let body = modal.querySelector('.modal-body');
    if (!body) {
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>📥 Export / Download</h3>
            <button class="modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      body = modal.querySelector('.modal-body');
    }

    if (!body.querySelector('#exportPreview')) {
      body.innerHTML = `
        <div class="export-container">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label for="exportSource" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Color Source:</label>
              <select id="exportSource" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);">
                <option value="favorites">Current Favorites</option>
                <option value="palette">Saved Palette</option>
                <option value="selected">Selected Color</option>
              </select>
            </div>

            <div>
              <label for="exportFormat" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Export Format:</label>
              <select id="exportFormat" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);">
                <option value="css">CSS Variables (.css)</option>
                <option value="json">JSON Array (.json)</option>
                <option value="text">Plain Text HEX (.txt)</option>
                <option value="png">PNG Swatch Image (.png)</option>
              </select>
            </div>
          </div>

          <div id="exportPaletteSelectorRow" style="display: none; margin-bottom: 16px;">
            <label for="exportPaletteSelect" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Select Palette:</label>
            <select id="exportPaletteSelect" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e);"></select>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Preview:</label>
            <div id="exportPreviewContainer">
              <textarea id="exportPreview" readonly style="width: 100%; height: 160px; padding: 10px; border-radius: 6px; background: var(--bg-tertiary, #131852); color: var(--text-primary, #fff); border: 1px solid var(--border-color, #1e2a6e); font-family: monospace; font-size: 12px; resize: none;"></textarea>
              <canvas id="exportCanvasPreview" style="display: none; max-width: 100%; border-radius: 6px; border: 1px solid var(--border-color, #1e2a6e);"></canvas>
            </div>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="exportCopyBtn" class="btn btn-secondary">📋 Copy Content</button>
            <button id="exportDownloadBtn" class="btn btn-primary">📥 Download File</button>
          </div>
        </div>
      `;
    }

    const sourceSelect = body.querySelector('#exportSource');
    const formatSelect = body.querySelector('#exportFormat');
    const palSelect = body.querySelector('#exportPaletteSelect');
    const palRow = body.querySelector('#exportPaletteSelectorRow');
    const copyBtn = body.querySelector('#exportCopyBtn');
    const downloadBtn = body.querySelector('#exportDownloadBtn');

    if (!isBound()) {
      markBound();
      sourceSelect.addEventListener('change', () => {
        if (sourceSelect.value === 'palette') {
          if (palRow) palRow.style.display = 'block';
          populateExportPalettes();
        } else {
          if (palRow) palRow.style.display = 'none';
        }
        updateExportPreview();
      });
    }

    if (!isBound()) {
      markBound();
      palSelect.addEventListener('change', updateExportPreview);
    }

    if (!isBound()) {
      markBound();
      formatSelect.addEventListener('change', updateExportPreview);
    }

    if (!isBound()) {
      markBound();
      copyBtn.addEventListener('click', () => {
        const preview = document.getElementById('exportPreview');
        if (preview && preview.style.display !== 'none') {
          copyText(preview.value);
        } else {
          notify('PNG cannot be copied as text, use Download button', 'info');
        }
      });
    }

    if (!isBound()) {
      markBound();
      downloadBtn.addEventListener('click', triggerExportDownload);
    }
  };

  const populateExportPalettes = () => {
    const palSelect = document.getElementById('exportPaletteSelect');
    if (!palSelect) return;
    const palettes = getStorage().getPalettes();
    palSelect.innerHTML = '';
    if (!palettes || palettes.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No palettes available';
      palSelect.appendChild(opt);
      return;
    }
    palettes.forEach(pal => {
      const opt = document.createElement('option');
      opt.value = pal.id;
      opt.textContent = `${pal.name} (${pal.colors ? pal.colors.length : 0} colors)`;
      palSelect.appendChild(opt);
    });
  };

  const getColorsForExport = () => {
    const sourceSelect = document.getElementById('exportSource');
    const source = sourceSelect ? sourceSelect.value : 'favorites';

    if (source === 'favorites') {
      return getStorage().getFavorites();
    } else if (source === 'palette') {
      const palSelect = document.getElementById('exportPaletteSelect');
      const palId = palSelect ? palSelect.value : '';
      const palettes = getStorage().getPalettes();
      const target = palettes.find(p => p.id === palId);
      return target ? target.colors || [] : [];
    } else if (source === 'selected') {
      if (window.App && typeof window.App.getCurrentColor === 'function') {
        const current = window.App.getCurrentColor();
        if (current) return [getUtils().rgbToHex(current.r, current.g, current.b)];
      }
      return ['#6366F1'];
    }
    return [];
  };

  const updateExportPreview = () => {
    const formatSelect = document.getElementById('exportFormat');
    const format = formatSelect ? formatSelect.value : 'css';
    const colors = getColorsForExport();

    const preview = document.getElementById('exportPreview');
    const canvas = document.getElementById('exportCanvasPreview');

    if (format === 'png') {
      if (preview) preview.style.display = 'none';
      if (canvas) {
        canvas.style.display = 'block';
        drawPngPreview(canvas, colors);
      }
      return;
    }

    if (canvas) canvas.style.display = 'none';
    if (preview) preview.style.display = 'block';

    if (!colors || colors.length === 0) {
      if (preview) preview.value = '/* No colors found in selected source */';
      return;
    }

    let output = '';
    if (format === 'css') {
      output = ':root {\n' + colors.map((hex, i) => `  --color-${i + 1}: ${hex};`).join('\n') + '\n}';
    } else if (format === 'json') {
      const utils = getUtils();
      const list = colors.map((hex, i) => {
        const rgb = utils.hexToRgb(hex) || { r: 0, g: 0, b: 0 };
        return {
          id: i + 1,
          hex: hex,
          rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          hsl: `hsl(${utils.rgbToHsl(rgb.r, rgb.g, rgb.b).h}, ${utils.rgbToHsl(rgb.r, rgb.g, rgb.b).s}%, ${utils.rgbToHsl(rgb.r, rgb.g, rgb.b).l}%)`
        };
      });
      output = JSON.stringify(list, null, 2);
    } else if (format === 'text') {
      output = colors.join('\n');
    }

    if (preview) preview.value = output;
  };

  const drawPngPreview = (canvas, colors) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const count = Math.max(1, colors.length);
    const swatchWidth = 80;
    const swatchHeight = 90;
    const cols = Math.min(6, count);
    const rows = Math.ceil(count / cols);

    canvas.width = cols * swatchWidth + 40;
    canvas.height = rows * swatchHeight + 60;

    // Background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ColorPalette Export', 20, 30);

    colors.forEach((hex, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * swatchWidth;
      const y = 45 + row * swatchHeight;

      // Color swatch
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, swatchWidth - 10, 50);

      // Border
      ctx.strokeStyle = '#1e2a6e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, swatchWidth - 10, 50);

      // Label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.fillText(hex, x + 4, y + 66);
    });
  };

  const triggerExportDownload = () => {
    const colors = getColorsForExport();
    if (!colors || colors.length === 0) {
      notify('No colors to export in the selected source', 'error');
      return;
    }

    const formatSelect = document.getElementById('exportFormat');
    const format = formatSelect ? formatSelect.value : 'css';
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'png') {
      const canvas = document.createElement('canvas');
      drawPngPreview(canvas, colors);
      canvas.toBlob((blob) => {
        if (!blob) {
          notify('Failed to generate PNG image', 'error');
          return;
        }
        downloadBlob(blob, `colorpalette-${timestamp}.png`);
      }, 'image/png');
      return;
    }

    const preview = document.getElementById('exportPreview');
    const content = preview ? preview.value : '';
    let mimeType = 'text/plain';
    let filename = `colorpalette-${timestamp}.txt`;

    if (format === 'css') {
      mimeType = 'text/css';
      filename = `colorpalette-${timestamp}.css`;
    } else if (format === 'json') {
      mimeType = 'application/json';
      filename = `colorpalette-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    notify(`Downloaded ${filename}`, 'success');
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
     LIFECYCLE INIT
     ========================================================================== */

  const init = () => {
    // 1. Register all 6 features
    register({
      id: 'randomColor',
      name: 'Random Color Generator',
      icon: '🎲',
      description: 'Generate unexpected random colors with full format values and quick-save options.',
      init: ensureRandomColorDOM,
      launch: () => {
        ensureRandomColorDOM();
        openModal('randomColorModal');
        generateRandomColor();
      },
      close: () => closeModal('randomColorModal')
    });

    register({
      id: 'converter',
      name: 'Color Converter',
      icon: '🔄',
      description: 'Bidirectional converter between HEX, RGB, HSL, and HSV formats with error checking.',
      init: ensureConverterDOM,
      launch: () => {
        ensureConverterDOM();
        openModal('converterModal');
        // Seed with current selected color if available
        let seedHex = '#6366F1';
        if (window.App && typeof window.App.getCurrentColor === 'function') {
          const cur = window.App.getCurrentColor();
          if (cur) seedHex = getUtils().rgbToHex(cur.r, cur.g, cur.b);
        }
        const hexInp = document.getElementById('converterHex');
        if (hexInp) {
          hexInp.value = seedHex;
          hexInp.dispatchEvent(new Event('input'));
        }
      },
      close: () => closeModal('converterModal')
    });

    register({
      id: 'gradient',
      name: 'Gradient Generator',
      icon: '🌈',
      description: 'Create multi-stop linear and radial gradients with live previews and CSS copy.',
      init: ensureGradientDOM,
      launch: () => {
        ensureGradientDOM();
        openModal('gradientModal');
        renderGradientStops();
        updateGradient();
      },
      close: () => closeModal('gradientModal')
    });

    register({
      id: 'palettes',
      name: 'Saved Palettes',
      icon: '📋',
      description: 'Manage color collections, rename groups, remove items, and copy or export palette codes.',
      init: ensurePalettesDOM,
      launch: () => {
        ensurePalettesDOM();
        openModal('palettesModal');
        renderPalettesList();
      },
      close: () => closeModal('palettesModal')
    });

    register({
      id: 'contrast',
      name: 'Contrast Checker',
      icon: '♿',
      description: 'Evaluate WCAG 2.1 AA and AAA contrast compliance between foreground and background.',
      init: ensureContrastDOM,
      launch: () => {
        ensureContrastDOM();
        openModal('contrastModal');
        updateContrast();
      },
      close: () => closeModal('contrastModal')
    });

    register({
      id: 'export',
      name: 'Export / Download',
      icon: '📥',
      description: 'Export palettes and favorites as CSS variables, JSON data, plain text, or PNG cards.',
      init: ensureExportDOM,
      launch: () => {
        ensureExportDOM();
        openModal('exportModal');
        updateExportPreview();
      },
      close: () => closeModal('exportModal')
    });

    // 2. Load saved feature states from AppStorage
    const savedStates = getStorage().getFeatureStates();
    if (savedStates && typeof savedStates === 'object') {
      Object.keys(savedStates).forEach(id => {
        if (features.has(id)) {
          features.get(id).enabled = Boolean(savedStates[id]);
        }
      });
    }

    // 3. Build features panel HTML
    renderFeaturesPanel();

    // 4. Update nav shortcuts visibility
    updateFeatureShortcuts();

    // 5. Global Modal Event Delegation (close buttons & backdrop clicks)
    document.addEventListener('click', (e) => {
      // Close button inside any modal
      const closeBtn = e.target.closest('.modal-close');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
          modal.classList.add('hidden');
          modal.setAttribute('aria-hidden', 'true');
          const idx = activeModalStack.indexOf(modal);
          if (idx !== -1) activeModalStack.splice(idx, 1);
        }
      }

      // Backdrop overlay click
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('features-overlay') || e.target.id === 'featuresOverlay') {
        const modal = e.target.closest('.modal') || document.getElementById('featuresOverlay');
        if (modal) {
          modal.classList.remove('active');
          modal.classList.add('hidden');
          modal.setAttribute('aria-hidden', 'true');
          const idx = activeModalStack.indexOf(modal);
          if (idx !== -1) activeModalStack.splice(idx, 1);
        }
      }
    });

    // 6. Global Escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeTopModal();
      }
    });

    // 7. Wire up Top Nav features button & features overlay close button
    const featuresBtn = document.getElementById('featuresBtn');
    if (featuresBtn && !isBound(featuresBtn)) {
      markBound(featuresBtn);
      featuresBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFeaturesPanel();
      });
    }

    const featuresCloseBtn = document.getElementById('featuresCloseBtn') ||
                             document.querySelector('#featuresPanel .modal-close') ||
                             document.querySelector('#featuresPanel .close-btn');
    if (featuresCloseBtn && !isBound(featuresCloseBtn)) {
      markBound(featuresCloseBtn);
      featuresCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeFeaturesPanel();
      });
    }
  };

  // Return public API
  return {
    register,
    getAll,
    isEnabled,
    setEnabled,
    init,
    launch,
    close: (id) => {
      const feat = features.get(id);
      if (feat && typeof feat.close === 'function') feat.close();
      closeModal(id + 'Modal');
    },
    closeAll,
    openModal,
    closeModal,
    renderFeaturesPanel,
    toggleFeaturesPanel,
    openFeaturesPanel,
    closeFeaturesPanel
  };
})();

// Attach to window for global access
window.FeatureManager = FeatureManager;
