// Auto-capture JS errors
window.onerror = function(msg, src, line, col) {
    fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', message: msg, source: src, line, col, page: location.pathname })
    }).catch(() => {});
};

// Manual user report
export function submitBugReport(inputEl, radioName, formEl, toastEl) {
    const type = document.querySelector(`input[name="${radioName}"]:checked`)?.value;
    const msg = inputEl.value.trim();
    if (!msg || !type) return;
    fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: msg, page: location.pathname })
    }).then(() => {
        inputEl.value = '';
        document.querySelectorAll(`input[name="${radioName}"]`).forEach(r => r.checked = false);
        if (formEl) formEl.classList.add('hidden');
        if (toastEl) {
            toastEl.classList.remove('hidden');
            setTimeout(() => toastEl.classList.add('hidden'), 6000);
        }
    }).catch(() => alert('Failed to send report. Try again later.'));
}
