import { autoCache } from './save.js';

export function renderDots(type, count) {
    const container = document.getElementById(`${type}_dots`);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${type}-dot`;
        dot.onclick = () => {
            const filled = Array.from(container.children).filter(d => d.classList.contains(`filled-${type}`)).length;
            const target = i < filled ? i : i + 1;
            Array.from(container.children).forEach((d, j) => {
                d.classList.toggle(`filled-${type}`, j < target);
            });
            autoCache();
        };
        container.appendChild(dot);
    }
}

export function updateThresholds() {
    const lvl = parseInt(document.getElementById('charLevel').value) || 0;
    const equipped = document.querySelector('#armorList > div[data-equipped="true"]');
    const baseMajor = equipped ? (parseInt(equipped.querySelector('.arm-major')?.value) || 0) : 0;
    const baseSevere = equipped ? (parseInt(equipped.querySelector('.arm-severe')?.value) || 0) : 0;
    const extraMajor = parseInt(document.getElementById('thresh_major_extra').value) || 0;
    const extraSevere = parseInt(document.getElementById('thresh_severe_extra').value) || 0;
    document.getElementById('thresh_major').textContent = baseMajor + lvl + extraMajor;
    document.getElementById('thresh_severe').textContent = baseSevere + lvl + extraSevere;
}

export function updateAttackBonus() {
    document.querySelectorAll('#weaponList > div[id^="wep-"]').forEach(el => {
        const traitId = el.querySelector('.wep-trait').value;
        const atkEl = el.querySelector('.wep-atk');
        atkEl.textContent = traitId ? (document.getElementById(traitId)?.value || '0') : '—';
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
