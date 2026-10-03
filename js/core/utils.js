import '../vendor/purify.min.js';

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

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeText(str) {
    return String(str).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

// Safe for element content and quoted attributes; also renders **bold**
export function escHtml(str) {
    if (str == null || str === false || str === '') return '';
    return escapeText(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Safe for element content and quoted attributes (no formatting)
export function escHtmlAttr(str) {
    if (str == null || str === false || str === '') return '';
    return escapeText(str);
}

// Safe inside a quoted JS string literal in an inline handler: onclick="fn('${escJs(x)}')"
export function escJs(str) {
    if (str == null) return '';
    return escapeText(String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029'));
}

// Rich text (Quill HTML, homebrew descriptions) from users — strips scripts, handlers, javascript: URLs
const SANITIZE_OPTS = {
    ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'span', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-list'],
};

export function sanitizeHtml(html) {
    if (!html) return '';
    const purify = globalThis.DOMPurify;
    if (!purify?.isSupported) return escHtmlAttr(html);
    return purify.sanitize(String(html), SANITIZE_OPTS);
}
