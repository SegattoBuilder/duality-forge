export function normalizeInventoryInput(text, qty) {
    return { name: text || '', qty: qty || '1' };
}
