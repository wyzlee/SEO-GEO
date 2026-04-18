/* ========== WYZLEE GUIDE — scripts.js ========== */

// ==================== Navigation ====================

const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-item');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(i => i.classList.remove('active'));
      const active = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.3 });

sections.forEach(s => observer.observe(s));

// ==================== Scroll Reveal ====================

const reveals = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
    }
  });
}, { threshold: 0.08 });

reveals.forEach(el => revealObs.observe(el));

// ==================== Toggle ====================

function toggleProject(el) {
  el.classList.toggle('open');
}

function toggleTrouble(el) {
  el.classList.toggle('open');
}

// ==================== Theme ====================

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('wyzlee-theme', isLight ? 'dark' : 'light');
  updateThemeUI();
}

function updateThemeUI() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.getElementById('theme-icon').innerHTML = isLight ? '&#9728;' : '&#9789;';
  const lang = getCurrentLang();
  const key = isLight ? 'theme-label-alt' : 'theme-label';
  document.getElementById('theme-label').textContent = translations[key][lang];
}

// ==================== Language (i18n) ====================

function getCurrentLang() {
  return localStorage.getItem('wyzlee-lang') || 'fr';
}

function toggleLang() {
  const current = getCurrentLang();
  const next = current === 'fr' ? 'en' : 'fr';
  localStorage.setItem('wyzlee-lang', next);
  document.documentElement.setAttribute('lang', next);
  applyTranslations(next);
}

function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key] && translations[key][lang]) {
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = translations[key][lang];
      } else {
        // Check if the translation contains HTML tags
        const text = translations[key][lang];
        if (/<[^>]+>/.test(text)) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    }
  });

  // Update lang toggle button
  const langLabel = document.getElementById('lang-label');
  if (langLabel) {
    langLabel.textContent = lang === 'fr' ? 'English' : 'Francais';
  }

  // Update theme label
  updateThemeUI();
}

// ==================== Init ====================

(function init() {
  // Theme
  const savedTheme = localStorage.getItem('wyzlee-theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  updateThemeUI();

  // Language
  const savedLang = getCurrentLang();
  document.documentElement.setAttribute('lang', savedLang);
  if (savedLang !== 'fr') {
    applyTranslations(savedLang);
  }
})();
