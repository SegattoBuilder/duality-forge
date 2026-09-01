import { autoCache } from './save.js';

export function addInventoryItem(text, qty) {
    const container = document.getElementById('inventoryList');
    if (container.innerText.trim() === 'None') container.innerHTML = '';
    const id = 'inv-' + Math.random().toString(36).substr(2, 9);
    const val = text || '';
    const q = qty || '1';
    const html = `
    <div class="flex items-center gap-2" id="${id}">
        <input type="text" value="${val}" placeholder="Item..." class="flex-1 bg-black/40 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 outline-none" data-autocache>
        <input type="text" value="${q}" placeholder="x1" class="w-14 bg-black/40 border border-zinc-800 rounded px-2 py-2 text-sm text-zinc-300 text-center outline-none" data-autocache>
        <button class="text-zinc-700 hover:text-red-500 text-sm inv-remove" data-id="${id}">✕</button>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.querySelector(`#${id} .inv-remove`).addEventListener('click', () => removeInventoryItem(id));
    if (!text && !qty) autoCache();
}

export function removeInventoryItem(id) {
    document.getElementById(id).remove();
    const container = document.getElementById('inventoryList');
    if (!container.children.length) container.innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    autoCache();
}

export function getInventoryData() {
    const items = [];
    document.querySelectorAll('#inventoryList > div[id^="inv-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        items.push({ name: inputs[0].value, qty: inputs[1].value });
    });
    return items;
}
