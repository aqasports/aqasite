/**
 * AQA Sports Academy — i18n Engine v2.0
 * Supports: FR (default) | AR (RTL) | EN
 *
 * Usage on any page:
 *   1. Add data-i18n="key" to any element whose text should be translated.
 *   2. Add data-i18n-placeholder="key" for input placeholders.
 *   3. Include <script src="/js/i18n.js"></script> before </body>.
 *
 * Language switcher: call window.i18n.setLang('ar') etc.
 * The chosen language is persisted in localStorage.
 */

(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────
  const SUPPORTED  = ['fr', 'ar', 'en'];
  const DEFAULT    = 'fr';
  const STORAGE_KEY = 'aqa_lang';
  const LANG_DIR   = '/lang/';       // path to JSON files
  // ──────────────────────────────────────────────────────────────────

  let _lang   = DEFAULT;
  let _dict   = {};
  let _loaded = {};   // cache: { 'ar': {...}, 'en': {...} }

  // ── 1. Detect language ────────────────────────────────────────────
  function detectLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;

    const browser = (navigator.language || 'fr').split('-')[0].toLowerCase();
    return SUPPORTED.includes(browser) ? browser : DEFAULT;
  }

  // ── 2. Fetch & cache JSON ─────────────────────────────────────────
  async function loadDict(lang) {
    if (_loaded[lang]) return _loaded[lang];
    try {
      const res  = await fetch(`${LANG_DIR}${lang}.json?v=2`);
      const data = await res.json();
      _loaded[lang] = data;
      return data;
    } catch (e) {
      console.warn(`[i18n] Failed to load ${lang}.json`, e);
      return {};
    }
  }

  // ── 3. Apply to DOM ───────────────────────────────────────────────
  function applyToDOM(dict) {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });

    // aria-label
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-label');
      if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
    });

    // Title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key] !== undefined) el.setAttribute('title', dict[key]);
    });
  }

  // ── 4. Update <html> attributes ───────────────────────────────────
  function applyPageAttrs(dict) {
    const dir  = dict.dir       || 'ltr';
    const code = dict.html_lang || _lang;

    document.documentElement.lang = code;
    document.documentElement.dir  = dir;

    // RTL body tweak
    document.body.style.direction = dir;

    // Mark active lang button
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang-btn');
      btn.classList.toggle('lang-active', btnLang === _lang);
    });
  }

  // ── 5. Public: setLang ────────────────────────────────────────────
  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    _lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    _dict = await loadDict(lang);
    applyToDOM(_dict);
    applyPageAttrs(_dict);

    // Dispatch event for any listeners
    window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang, dict: _dict } }));
  }

  // ── 6. Init ───────────────────────────────────────────────────────
  async function init() {
    _lang = detectLang();
    await setLang(_lang);

    // Wire up lang switcher buttons automatically
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-lang-btn]');
      if (btn) {
        e.preventDefault();
        setLang(btn.getAttribute('data-lang-btn'));
      }
    });
  }

  // ── 7. Expose global API ──────────────────────────────────────────
  window.i18n = {
    setLang,
    getLang:  ()  => _lang,
    get:      (k) => _dict[k] || k,
    supported: SUPPORTED,
  };

  // ── 8. Run ────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
