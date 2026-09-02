import { THEME_KEY } from './state.js';

import { LS_CHAR_MODE } from '../core/constants.js';
const MODE_KEY = LS_CHAR_MODE;

export const THEMES = {
    gold:    { base: [212, 160, 23] },
    red:     { base: [192, 57, 43] },
    blue:    { base: [41, 128, 185] },
    navy:    { base: [44, 62, 110] },
    purple:  { base: [142, 68, 173] },
    green:   { base: [39, 174, 96] },
    teal:    { base: [22, 160, 133] },
    rose:    { base: [196, 112, 128] },
    silver:  { base: [149, 165, 166] },
    bronze:  { base: [176, 122, 60] },
};

export function hexFromRgb(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function applyTheme(name) {
    const theme = THEMES[name] || THEMES.gold;
    const [r, g, b] = theme.base;
    const color = hexFromRgb(r, g, b);
    for (let i = 1; i <= 5; i++) {
        document.documentElement.style.setProperty(`--accent-${i}`, color);
    }
    document.querySelectorAll('[data-theme-level]').forEach(el => {
        el.style.color = color;
        if (el.classList.contains('theme-dot-el')) el.style.backgroundColor = color;
    });
    document.querySelectorAll('[data-theme-border]').forEach(el => {
        el.style.borderLeftColor = color;
    });
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === name));
    localStorage.setItem(THEME_KEY, name);
    const btn = document.querySelector('#themePicker > div > button');
    if (btn) btn.style.background = color;
}

export function renderThemePicker() {
    const container = document.getElementById('kebabThemeSwatches') || document.getElementById('themePicker');
    if (!container) return;
    const current = localStorage.getItem(THEME_KEY) || 'gold';
    container.innerHTML = Object.entries(THEMES).map(([name, t]) => {
        const color = hexFromRgb(...t.base);
        return `<div class="theme-swatch ${name === current ? 'active' : ''}" style="background:${color}" data-theme="${name}" title="${name}"></div>`;
    }).join('');
    container.querySelectorAll('[data-theme]').forEach(el => {
        el.addEventListener('click', (e) => { e.stopPropagation(); applyTheme(el.dataset.theme); });
    });
}

const MODE_CYCLE = ['dark', 'light', 'scifi', 'fantasy'];
const MODE_ICONS = { dark: '🌙', light: '☀️', scifi: '🖥️', fantasy: '🐉' };

export function setMode(mode) {
    document.body.setAttribute('data-mode', mode);
    localStorage.setItem(MODE_KEY, mode);
    const icon = document.getElementById('modeToggleIcon');
    if (icon) icon.textContent = MODE_ICONS[mode];
}

export function toggleMode() {
    const current = document.body.getAttribute('data-mode') || 'dark';
    const idx = MODE_CYCLE.indexOf(current);
    setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
}

export function initMode() {
    const saved = localStorage.getItem(MODE_KEY) || 'dark';
    document.body.setAttribute('data-mode', saved);
    document.getElementById('modeToggleIcon').textContent = MODE_ICONS[saved] || '🌙';
}
