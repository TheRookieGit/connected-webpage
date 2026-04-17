/**
 * lang.js — Chinese / English language switcher for ConnectEd Research Institute
 *
 * HTML markup conventions:
 *   data-i18n                   Mark element for translation
 *   data-en="..."               English plain text (sets textContent)
 *   data-en-html="..."          English HTML (sets innerHTML; use when inline tags are needed)
 *   data-lang-hide-en           Hide this element in English mode
 *   data-lang-show-en           Show this element only in English mode
 *   data-title-en="..."         On <html>: English page title
 *   data-ph-en="..."            On <input>/<textarea>: English placeholder
 *   data-opt-en="..."           On <option>: English option text
 *
 * Toggle button markup:
 *   <button class="lang-toggle" onclick="toggleLang()">
 *     <span class="lang-opt" data-lang="zh">中文</span>
 *     <span class="lang-sep">|</span>
 *     <span class="lang-opt" data-lang="en">EN</span>
 *   </button>
 *
 * Default language: Chinese (Chinese is the canonical source).
 * User preference is persisted in localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ce-lang';

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'zh';
  }

  function applyLang(lang) {
    var isEn = (lang === 'en');
    localStorage.setItem(STORAGE_KEY, lang);

    /* ── 1. <html lang> attribute ── */
    document.documentElement.lang = isEn ? 'en' : 'zh-CN';

    /* ── 2. Translatable elements ── */
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      // Cache original Chinese HTML on first call
      if (!el.hasAttribute('data-zh')) {
        el.setAttribute('data-zh', el.innerHTML);
      }
      if (isEn) {
        var enHtml = el.getAttribute('data-en-html');
        var enText = el.getAttribute('data-en');
        if (enHtml !== null) {
          el.innerHTML = enHtml;
        } else if (enText !== null) {
          el.textContent = enText;
        }
      } else {
        el.innerHTML = el.getAttribute('data-zh');
      }
    }

    /* ── 3. Page <title> ── */
    var htmlEl = document.documentElement;
    if (!htmlEl.hasAttribute('data-title-zh')) {
      htmlEl.setAttribute('data-title-zh', document.title);
    }
    var titleEn = htmlEl.getAttribute('data-title-en');
    if (isEn && titleEn) {
      document.title = titleEn;
    } else {
      document.title = htmlEl.getAttribute('data-title-zh') || document.title;
    }

    /* ── 4. Input / textarea placeholders ── */
    var phs = document.querySelectorAll('[data-ph-en]');
    for (var j = 0; j < phs.length; j++) {
      var ph = phs[j];
      if (!ph.hasAttribute('data-ph-zh')) {
        ph.setAttribute('data-ph-zh', ph.placeholder || '');
      }
      ph.placeholder = isEn ? ph.getAttribute('data-ph-en') : ph.getAttribute('data-ph-zh');
    }

    /* ── 5. Select option text ── */
    var opts = document.querySelectorAll('option[data-opt-en]');
    for (var n = 0; n < opts.length; n++) {
      var opt = opts[n];
      if (!opt.hasAttribute('data-opt-zh')) {
        opt.setAttribute('data-opt-zh', opt.text);
      }
      opt.text = isEn ? opt.getAttribute('data-opt-en') : opt.getAttribute('data-opt-zh');
    }

    /* ── 6. Show / hide by language ── */
    var hideEn = document.querySelectorAll('[data-lang-hide-en]');
    for (var k = 0; k < hideEn.length; k++) {
      hideEn[k].style.display = isEn ? 'none' : '';
    }
    var showEn = document.querySelectorAll('[data-lang-show-en]');
    for (var l = 0; l < showEn.length; l++) {
      showEn[l].style.display = isEn ? '' : 'none';
    }

    /* ── 7. Toggle button active state ── */
    var btns = document.querySelectorAll('.lang-toggle');
    for (var m = 0; m < btns.length; m++) {
      var langOpts = btns[m].querySelectorAll('.lang-opt');
      for (var o = 0; o < langOpts.length; o++) {
        langOpts[o].classList.toggle('active', langOpts[o].getAttribute('data-lang') === lang);
      }
      btns[m].setAttribute('aria-label', isEn ? '切换到中文' : 'Switch to English');
    }
  }

  /* ══════════════════════════════════════════
     Blur-dissolve transition on toggle:
     translatable elements fade + blur out,
     text swaps, then fade + blur back in.
  ══════════════════════════════════════════ */
  var styleInjected = false;

  function ensureStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css = [
      '.lang-blur-out{animation:lb-out 0.08s ease-in forwards!important;}',
      '.lang-blur-in{animation:lb-in 0.1s ease-out forwards!important;}',
      '@keyframes lb-out{from{opacity:1;filter:blur(0);transform:translateY(0)}',
        'to{opacity:0;filter:blur(6px);transform:translateY(-6px)}}',
      '@keyframes lb-in{from{opacity:0;filter:blur(6px);transform:translateY(6px)}',
        'to{opacity:1;filter:blur(0);transform:translateY(0)}}'
    ].join('');
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function toggleLang() {
    ensureStyles();
    var newLang = getLang() === 'en' ? 'zh' : 'en';
    var targets = document.querySelectorAll('[data-i18n]');

    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.remove('lang-blur-in');
      targets[i].classList.add('lang-blur-out');
    }

    setTimeout(function () {
      applyLang(newLang);
      for (var j = 0; j < targets.length; j++) {
        targets[j].classList.remove('lang-blur-out');
        targets[j].classList.add('lang-blur-in');
      }
      setTimeout(function () {
        for (var k = 0; k < targets.length; k++) {
          targets[k].classList.remove('lang-blur-in', 'lang-blur-out');
        }
      }, 100);
    }, 80);
  }

  // Run as early as possible to minimise flash of untranslated content
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyLang(getLang()); });
  } else {
    applyLang(getLang());
  }

  // Global API
  window.toggleLang = toggleLang;
  window.applyLang  = applyLang;
  window.getLang    = getLang;
}());
