export function generateId(prefix = 'c') {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

export function computeDotToggle(index, currentFilled) {
    return index < currentFilled ? index : index + 1;
}

export function validateShareFields(title, desc, consent) {
    const descOk = desc.split(/\s+/).filter(Boolean).length >= 3;
    return !!(title && descOk && consent);
}

export function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function escHtmlAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
