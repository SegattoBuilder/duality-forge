import { autoCache } from './save.js';

let draggedEl = null;

export function initSortable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('[data-sortable-id]').forEach(el => {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', onDragStart);
        el.addEventListener('dragend', onDragEnd);
        el.addEventListener('dragover', onDragOver);
        el.addEventListener('dragenter', onDragEnter);
        el.addEventListener('dragleave', onDragLeave);
        el.addEventListener('drop', onDrop);
    });
}

function onDragStart(e) {
    draggedEl = e.currentTarget;
    draggedEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedEl.dataset.sortableId);
}

function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedEl = null;
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target !== draggedEl) target.classList.add('drag-over');
}

function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    if (!draggedEl || target === draggedEl) return;

    const container = target.parentElement;
    const items = Array.from(container.querySelectorAll('[data-sortable-id]'));
    const dragIdx = items.indexOf(draggedEl);
    const dropIdx = items.indexOf(target);

    if (dragIdx < dropIdx) {
        container.insertBefore(draggedEl, target.nextSibling);
    } else {
        container.insertBefore(draggedEl, target);
    }

    autoCache();
}

export function getSectionOrder(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-sortable-id]')).map(el => el.dataset.sortableId);
}

export function applySectionOrder(containerId, order) {
    if (!order || !order.length) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    order.forEach(id => {
        const el = container.querySelector(`[data-sortable-id="${id}"]`);
        if (el) container.appendChild(el);
    });
}
