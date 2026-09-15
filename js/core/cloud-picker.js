import { cloudLoadRows, cloudDeleteRow, showConfirm, showAlert } from './auth.js';
import { escHtml } from './utils.js';

export async function showCloudPicker(opts) {
    const { table, nameColumn, modalId, listId, onPick, emptyText = 'No cloud saves found.' } = opts;
    const modal = document.getElementById(modalId);
    const list = document.getElementById(listId);
    modal.classList.remove('hidden');

    list.innerHTML = '<div class="col-span-2 text-center text-zinc-600 text-xs py-4">Loading...</div>';

    const { rows, error } = await cloudLoadRows(table);
    if (error || !rows.length) {
        list.innerHTML = `<div class="col-span-2 text-center text-zinc-600 text-xs py-4">${escHtml(emptyText)}</div>`;
        return;
    }

    const manualRows = rows.filter(r => !r.is_autosave);

    const close = () => modal.classList.add('hidden');

    list.innerHTML = manualRows.map(r => {
        const safeName = escHtml(r[nameColumn] || 'Unnamed');
        const manualDate = new Date(r.updated_at).toLocaleString();

        const manualBtn = `<button data-pick-id="${r.id}" data-pick-type="save" class="cp-pick picker-card">
            <div class="text-[10px] font-bold uppercase mb-1" style="color:var(--accent-1)">Save</div>
            <div class="text-[10px] text-zinc-500">${manualDate}</div>
        </button>`;

        let autoBtn = '';
        if (r.autosave_data && r.autosave_at) {
            const autoDate = new Date(r.autosave_at).toLocaleString();
            autoBtn = `<button data-pick-id="${r.id}" data-pick-type="autosave" class="cp-pick picker-card picker-card-auto">
                <div class="text-[10px] font-bold text-green-400 uppercase mb-1">Autosave</div>
                <div class="text-[10px] text-zinc-500">${autoDate}</div>
            </button>`;
        }

        return `<div class="col-span-2 p-4 rounded-xl panel-box">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${safeName}</div>
                <button data-del-id="${r.id}" class="cp-del text-red-400/60 hover:text-red-400 text-base" title="Delete">🗑</button>
            </div>
            <div class="flex gap-2">${manualBtn}${autoBtn}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.cp-pick').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.pickId;
            const pickType = btn.dataset.pickType;
            const row = manualRows.find(r => r.id === id);
            if (!row) { showAlert('Failed to load save.'); return; }
            close();
            if (pickType === 'autosave' && row.autosave_data) {
                const autosaveRow = { ...row, data: row.autosave_data };
                onPick(autosaveRow);
            } else {
                onPick(row);
            }
        });
    });

    list.querySelectorAll('.cp-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.delId;
            showConfirm('Delete this save and its autosave?', async () => {
                if (opts.onBeforeDelete) await opts.onBeforeDelete([id]);
                const { error: delErr } = await cloudDeleteRow(table, id);
                if (delErr) { showAlert('Delete failed: ' + delErr); return; }
                showCloudPicker(opts);
            });
        });
    });
}
