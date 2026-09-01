export function switchTab(tabId) {
    ['tab-sheet','tab-story','tab-support'].forEach(id => {
        document.getElementById(id).style.display = id === tabId ? '' : 'none';
        document.getElementById('btn-' + id).classList.toggle('active', id === tabId);
    });
}

export function toggleSection(id) {
    const el = document.getElementById(id);
    const tog = document.getElementById(id + '-tog');
    const hidden = el.style.display === 'none';
    el.style.display = hidden ? '' : 'none';
    tog.classList.toggle('collapsed', !hidden);
}

export function toggleCard(id) {
    const body = document.getElementById(id + '-body');
    const tog = document.getElementById(id + '-tog');
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
    tog.classList.toggle('collapsed', !hidden);
}
