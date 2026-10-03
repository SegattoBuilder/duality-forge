import { cloudLoadRows, cloudDeleteRow, getSupabase, showConfirm, showAlert } from './auth.js';
import { escHtml } from './utils.js';

export async function showCloudPicker(opts) {
    const { table, nameColumn, modalId, listId, onPick, emptyText = 'No cloud saves found.' } = opts;
    const modal = document.getElementById(modalId);
    const list = document.getElementById(listId);
    modal.classList.remove('hidden');

    list.innerHTML = '<div class="col-span-2 text-center text-zinc-600 text-xs py-4">Loading...</div>';

    // List only needs names/dates — full save data is fetched for the picked row
    const { rows, error } = await cloudLoadRows(table, 'updated_at', `id, updated_at, ${nameColumn}`);
    if (error) {
        list.innerHTML = `<div class="col-span-2 text-center text-red-400 text-xs py-4">Couldn't load saves: ${escHtml(error)}</div>`;
        return;
    }
    if (!rows.length) {
        list.innerHTML = `<div class="col-span-2 text-center text-zinc-600 text-xs py-4">${escHtml(emptyText)}</div>`;
        return;
    }

    const manualRows = rows;

    const close = () => modal.classList.add('hidden');

    list.innerHTML = manualRows.map(r => {
        const safeName = escHtml(r[nameColumn] || 'Unnamed');
        const manualDate = new Date(r.updated_at).toLocaleString();

        const manualBtn = `<button data-pick-id="${r.id}" data-pick-type="save" class="cp-pick picker-card">
            <div class="text-[10px] font-bold uppercase mb-1" style="color:var(--accent-1)">Save</div>
            <div class="text-[10px] text-zinc-500">${manualDate}</div>
        </button>`;

        return `<div class="col-span-2 p-4 rounded-xl panel-box">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${safeName}</div>
                <button data-del-id="${r.id}" class="cp-del text-red-400/60 hover:text-red-400 text-base" title="Delete">🗑</button>
            </div>
            <div class="flex gap-2">${manualBtn}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.cp-pick').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.pickId;
            if (!manualRows.some(r => r.id === id)) { showAlert('Failed to load save.'); return; }
            const { data: row, error: loadErr } = await getSupabase().from(table).select('*').eq('id', id).single();
            if (loadErr || !row) { showAlert('Failed to load save.'); return; }
            close();
            onPick(row);
        });
    });

    list.querySelectorAll('.cp-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.delId;
            showConfirm('Delete this save?', async () => {
                if (opts.onBeforeDelete) await opts.onBeforeDelete([id]);
                const { error: delErr } = await cloudDeleteRow(table, id);
                if (delErr) { showAlert('Delete failed: ' + delErr); return; }
                showCloudPicker(opts);
            });
        });
    });
}
