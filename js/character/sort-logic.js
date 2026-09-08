export function computeInsertPosition(dragIdx, dropIdx) {
    return dragIdx < dropIdx ? 'after' : 'before';
}
