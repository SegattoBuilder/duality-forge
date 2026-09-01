import { autoCache } from './save.js';

export function renderDots(type, count) {
    const container = document.getElementById(`${type}_dots`);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${type}-dot`;
        dot.onclick = () => { dot.classList.toggle(`filled-${type}`); autoCache(); };
        container.appendChild(dot);
    }
}

export function updateThresholds() {
    const lvl = parseInt(document.getElementById('charLevel').value) || 0;
    const baseMajor = parseInt(document.getElementById('armor_thresh_major').value) || 0;
    const baseSevere = parseInt(document.getElementById('armor_thresh_severe').value) || 0;
    const extraMajor = parseInt(document.getElementById('thresh_major_extra').value) || 0;
    const extraSevere = parseInt(document.getElementById('thresh_severe_extra').value) || 0;
    document.getElementById('thresh_major').textContent = baseMajor + lvl + extraMajor;
    document.getElementById('thresh_severe').textContent = baseSevere + lvl + extraSevere;
}

export function updateAttackBonus() {
    [1, 2].forEach(n => {
        const traitId = document.getElementById(`wep${n}_trait`).value;
        const atkEl = document.getElementById(`wep${n}_atk`);
        if (traitId) {
            atkEl.textContent = document.getElementById(traitId).value || '0';
        } else {
            atkEl.textContent = '—';
        }
    });
}

export function getDotStates() {
    const states = {};
    ['hp','stress','hope','armor'].forEach(type => {
        const dots = document.getElementById(`${type}_dots`);
        if (!dots) return;
        states[type] = Array.from(dots.children).map(d => d.classList.contains(`filled-${type}`));
    });
    return states;
}

export function setDotStates(states) {
    if (!states) return;
    Object.keys(states).forEach(type => {
        const dots = document.getElementById(`${type}_dots`);
        if (!dots) return;
        states[type].forEach((filled, i) => {
            if (dots.children[i] && filled) dots.children[i].classList.add(`filled-${type}`);
        });
    });
}
