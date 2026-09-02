import { cloudLoadRows, cloudDeleteRow, escHtml, showConfirm, showAlert } from './auth.js';

/**
 * Shared cloud picker — renders grouped (manual + autosave) rows into a modal.
 * @param {Object} opts
 * @param {string} opts.table        - Supabase table ('sessions' | 'characters')
 * @param {string} opts.nameColumn   - Column used for grouping ('campaign_name' | 'character_name')
 * @param {string} opts.modalId      - ID of the modal element to show
 * @param {string} opts.listId       - ID of the list container inside the modal
 * @param {function} opts.onPick     - Called with the full row when user picks a save
 * @param {function} [opts.onNew]    - Called when user clicks "New". If absent, "New" button hidden.
 * @param {string} [opts.newLabel]   - Label for new button (default "New")
 * @param {string} [opts.emptyText]  - Text when no saves found
 */
export async function showCloudPicker(opts) {
    const { table, nameColumn, modalId, listId, onPick, onNew, newLabel = 'New', emptyText = 'No cloud saves found.' } = opts;
    const modal = document.getElementById(modalId);
    const list = document.getElementById(listId);
    modal.classList.remove('hidden');

    list.innerHTML = '<div class="col-span-2 text-center text-zinc-600 text-xs py-4">Loading...</div>';

    const { rows, error } = await cloudLoadRows(table);
    if (error || !rows.length) {
        list.innerHTML = `<div class="col-span-2 text-center text-zinc-600 text-xs py-4">${escHtml(emptyText)}</div>`;
        return;
    }

    // Group by name: manual save + autosave
    const grouped = {};
    rows.forEach(r => {
        const key = r[nameColumn] || 'Unnamed';
        if (!grouped[key]) grouped[key] = {};
        if (r.is_autosave) grouped[key].autosave = r;
        else grouped[key].manual = r;
    });

    const close = () => modal.classList.add('hidden');

    // Build HTML
    list.innerHTML = Object.entries(grouped).map(([name, g]) => {
        const safeName = escHtml(name);
        const manualDate = g.manual ? new Date(g.manual.updated_at).toLocaleString() : null;
        const autoDate = g.autosave ? new Date(g.autosave.updated_at).toLocaleString() : null;

        const manualBtn = g.manual ? `<button data-pick-id="${g.manual.id}" class="cp-pick flex-1 p-3 rounded-lg text-left transition-all hover:border-[#d4a017]" style="background:#1a1714;border:1px solid #3d362a">
            <div class="text-[10px] font-bold text-[#d4a017] uppercase mb-1">Save</div>
            <div class="text-[10px] text-zinc-500">${manualDate}</div>
        </button>` : '';

        const autoBtn = g.autosave ? `<button data-pick-id="${g.autosave.id}" class="cp-pick flex-1 p-3 rounded-lg text-left transition-all hover:border-[#d4a017]" style="background:#1a2418;border:1px solid #3d5a2a">
            <div class="text-[10px] font-bold text-green-400 uppercase mb-1">Autosave</div>
            <div class="text-[10px] text-zinc-500">${autoDate}</div>
        </button>` : '';

        // Delete buttons
        const manualDel = g.manual ? `<button data-del-id="${g.manual.id}" class="cp-del text-zinc-700 hover:text-red-500 text-sm" title="Delete save">🗑</button>` : '';
        const autoDel = g.autosave ? `<button data-del-id="${g.autosave.id}" class="cp-del text-zinc-700 hover:text-red-500 text-sm" title="Delete autosave">🗑</button>` : '';

        return `<div class="col-span-2 p-4 rounded-xl" style="background:linear-gradient(145deg,#221f1a,#1e1b16);border:1px solid #3d362a">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${safeName}</div>
                <div class="flex gap-1">${manualDel}${autoDel}</div>
            </div>
            <div class="flex gap-2">${manualBtn}${autoBtn}</div>
        </div>`;
    }).join('');

    // Wire up pick buttons
    list.querySelectorAll('.cp-pick').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.pickId;
            const row = rows.find(r => r.id === id);
            if (!row) { showAlert('Failed to load save.'); return; }
            close();
            onPick(row);
        });
    });

    // Wire up delete buttons
    list.querySelectorAll('.cp-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.delId;
            showConfirm('Delete this cloud save?', async () => {
                const { error: delErr } = await cloudDeleteRow(table, id);
                if (delErr) showAlert('Delete failed: ' + delErr);
                else showCloudPicker(opts); // re-render
            });
        });
    });
}
