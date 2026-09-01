import { THEME_KEY } from './state.js';

const MODE_KEY = 'dh_mode';

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
    const container = document.getElementById('themePicker');
    const current = localStorage.getItem(THEME_KEY) || 'gold';
    const currentColor = hexFromRgb(...(THEMES[current] || THEMES.gold).base);
    container.innerHTML = `<div class="relative flex items-center">
        <button class="theme-swatch active flex items-center justify-center" style="background:${currentColor}" title="Change theme" id="themeToggleBtn"></button>
        <div id="themeDropdown" class="hidden absolute right-0 top-10 bg-[#221f1a] border border-[#4a3f30] rounded-xl p-3 shadow-xl z-50 min-w-[160px]">
            <div class="grid grid-cols-4 gap-3">${Object.entries(THEMES).map(([name, t]) => {
                const color = hexFromRgb(...t.base);
                return `<div class="theme-swatch ${name === current ? 'active' : ''}" style="background:${color}" data-theme="${name}" title="${name}"></div>`;
            }).join('')}</div>
        </div>
    </div>`;

    document.getElementById('themeToggleBtn').addEventListener('click', toggleThemeDropdown);
    container.querySelectorAll('[data-theme]').forEach(el => {
        el.addEventListener('click', (e) => { e.stopPropagation(); applyTheme(el.dataset.theme); });
    });
    document.addEventListener('click', closeThemeDropdown);
}

function toggleThemeDropdown(e) {
    e.stopPropagation();
    document.getElementById('themeDropdown').classList.toggle('hidden');
}

function closeThemeDropdown(e) {
    const dd = document.getElementById('themeDropdown');
    if (!dd || dd.classList.contains('hidden')) return;
    const picker = document.getElementById('themePicker');
    if (!picker.contains(e.target)) dd.classList.add('hidden');
}

const MODE_CYCLE = ['dark', 'light', 'scifi', 'fantasy'];
const MODE_ICONS = { dark: '🌙', light: '☀️', scifi: '🖥️', fantasy: '🐉' };

export function toggleMode() {
    const current = document.body.getAttribute('data-mode') || 'dark';
    const idx = MODE_CYCLE.indexOf(current);
    const newMode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
    document.body.setAttribute('data-mode', newMode);
    localStorage.setItem(MODE_KEY, newMode);
    document.getElementById('modeToggleIcon').textContent = MODE_ICONS[newMode];
}

export function initMode() {
    const saved = localStorage.getItem(MODE_KEY) || 'dark';
    document.body.setAttribute('data-mode', saved);
    document.getElementById('modeToggleIcon').textContent = MODE_ICONS[saved] || '🌙';
}
