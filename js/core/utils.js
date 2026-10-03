import '../vendor/purify.min.js';

// Run fn once the DOM is parsed — also works if DOMContentLoaded already fired
// (modules with top-level await can finish after it)
export function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
}

// Read JSON from localStorage; corrupt or missing data returns the fallback instead of throwing
export function readJson(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

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

// Rich text (Quill HTML, homebrew descriptions) from users — strips scripts, handlers, javascript: URLs.
// Inline styles are reduced to text color / highlight (Quill color pickers).
const SANITIZE_OPTS = {
    ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'span', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'data-list'],
};

let _purifyReady = false;
function getPurify() {
    const purify = globalThis.DOMPurify;
    if (!purify?.isSupported) return null;
    if (!_purifyReady) {
        purify.addHook('afterSanitizeAttributes', node => {
            if (!node.hasAttribute?.('style')) return;
            const { color, backgroundColor } = node.style;
            node.removeAttribute('style');
            if (color) node.style.color = color;
            if (backgroundColor) node.style.backgroundColor = backgroundColor;
        });
        _purifyReady = true;
    }
    return purify;
}

export function sanitizeHtml(html) {
    if (!html) return '';
    const purify = getPurify();
    if (!purify) return escHtmlAttr(html);
    return purify.sanitize(String(html), SANITIZE_OPTS);
}
