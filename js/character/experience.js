import { autoCache } from './save.js';

export function addExperience(name, value, desc) {
    const container = document.getElementById('experienceList');
    if (container.innerText.trim() === 'None') container.innerHTML = '';
    const id = 'exp-' + Math.random().toString(36).substr(2, 9);
    const n = name || '';
    const v = value || '';
    const d = desc || '';
    const html = `
    <div class="space-y-1" id="${id}">
        <div class="flex items-center gap-2">
            <span class="text-zinc-600 text-[10px] exp-chevron cursor-pointer exp-toggle" data-id="${id}">▶</span>
            <input type="text" value="${n}" placeholder="Name..." class="flex-1 bg-black/40 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 outline-none" data-autocache>
            <input type="text" value="${v}" placeholder="+0" class="w-14 bg-black/40 border border-zinc-800 rounded px-2 py-2 text-sm text-zinc-300 text-center outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm exp-remove" data-id="${id}">✕</button>
        </div>
        <textarea placeholder="Details..." class="exp-details hidden w-full bg-black/40 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-400 outline-none resize-none h-20" data-autocache>${d}</textarea>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.querySelector(`#${id} .exp-remove`).addEventListener('click', () => removeExperience(id));
    container.querySelector(`#${id} .exp-toggle`).addEventListener('click', () => toggleExpDetails(id));
    if (!name && !value && !desc) autoCache();
}

function toggleExpDetails(id) {
    const el = document.getElementById(id);
    const textarea = el.querySelector('.exp-details');
    const chevron = el.querySelector('.exp-chevron');
    textarea.classList.toggle('hidden');
    chevron.textContent = textarea.classList.contains('hidden') ? '▶' : '▼';
}

export function removeExperience(id) {
    document.getElementById(id).remove();
    const container = document.getElementById('experienceList');
    if (!container.children.length) container.innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    autoCache();
}

export function getExperienceData() {
    const items = [];
    document.querySelectorAll('#experienceList > div[id^="exp-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        const textarea = el.querySelector('textarea');
        items.push({ name: inputs[0].value, value: inputs[1].value, desc: textarea?.value || '' });
    });
    return items;
}
