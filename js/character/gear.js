import { autoCache } from './save.js';

export function addGearItem(name, bonus, desc) {
    const container = document.getElementById('gearItemList');
    if (container.innerText.trim() === 'None') container.innerHTML = '';
    const id = 'gear-' + Math.random().toString(36).substr(2, 9);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3 space-y-2" id="${id}">
        <div class="flex items-center gap-2">
            <input type="text" value="${name || ''}" placeholder="Item name..." class="flex-1 bg-transparent border-b border-zinc-700 px-1 py-1 text-sm font-bold outline-none" data-autocache>
            <input type="text" value="${bonus || ''}" placeholder="Bonus" class="w-20 bg-transparent border-b border-zinc-700 px-1 py-1 text-sm text-center outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm gear-remove" data-id="${id}">✕</button>
        </div>
        <textarea placeholder="Description..." class="w-full bg-transparent border border-zinc-800 rounded px-2 py-1.5 text-xs outline-none resize-none h-12" data-autocache>${desc || ''}</textarea>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.querySelector(`#${id} .gear-remove`).addEventListener('click', () => removeGearItem(id));
    if (!name && !bonus && !desc) autoCache();
}

export function removeGearItem(id) {
    if (!confirm('Remove this item?')) return;
    document.getElementById(id).remove();
    const container = document.getElementById('gearItemList');
    if (!container.children.length) container.innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    autoCache();
}

export function getGearData() {
    const items = [];
    document.querySelectorAll('#gearItemList > div[id^="gear-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        const textarea = el.querySelector('textarea');
        items.push({ name: inputs[0].value, bonus: inputs[1].value, desc: textarea.value });
    });
    return items;
}
