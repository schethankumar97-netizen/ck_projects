let dropdowns = [];

const ddList = document.getElementById('ddList');
const emptyState = document.getElementById('emptyState');
const statBanner = document.getElementById('statBanner');
const toastStack = document.getElementById('toastStack');
const exportCodeEl = document.getElementById('exportCode');

// Fetch dropdowns from backend on load
fetchDropdowns();

async function fetchDropdowns() {
    try {
        const res = await fetch('/api/dropdowns');
        dropdowns = await res.json();
        renderAll();
    } catch (err) {
        toast('Failed to load dropdowns from server', 'error');
    }
}

async function handleCreate(e) {
    e.preventDefault();
    const nameEl = document.getElementById('ddName');
    const optsEl = document.getElementById('initOpts');
    const name = nameEl.value.trim();
    if (!name) return;

    const raw = optsEl.value.trim();
    const options = raw ? raw.split('\n').map(s => s.trim()).filter(s => s) : [];

    try {
        const res = await fetch('/api/dropdowns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, options })
        });
        
        if (!res.ok) throw new Error('Creation failed');

        nameEl.value = '';
        optsEl.value = '';
        toast('Dropdown created successfully', 'success');
        await fetchDropdowns(); // Refresh UI and DB state
    } catch (err) {
        toast('Error creating dropdown', 'error');
    }
}

async function deleteDropdown(id) {
    try {
        await fetch(`/api/dropdowns/${id}`, { method: 'DELETE' });
        toast('Dropdown removed', 'neutral');
        await fetchDropdowns();
    } catch (err) {
        toast('Error deleting dropdown', 'error');
    }
}

async function addOption(id, value) {
    value = (value || '').trim();
    if (!value) { toast('Enter an option value', 'error'); return; }

    try {
        const res = await fetch(`/api/dropdowns/${id}/addOption`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });

        const data = await res.json();
        if (!res.ok) {
            toast(data.error || 'Error adding option', 'error');
            return;
        }

        toast(`Added "${value}"`, 'success');
        await fetchDropdowns();
    } catch (err) {
        toast('Error adding option', 'error');
    }
}

async function removeOption(ddId, idx) {
    try {
        await fetch(`/api/dropdowns/${ddId}/removeOption`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: idx })
        });
        toast('Removed option', 'neutral');
        await fetchDropdowns();
    } catch (err) {
        toast('Error removing option', 'error');
    }
}

async function bulkAddDropdown(id) {
    const ta = document.getElementById('bulk-' + id);
    if (!ta || !ta.value.trim()) return;
    const items = ta.value.split('\n').map(s => s.trim()).filter(s => s);

    try {
        const res = await fetch(`/api/dropdowns/${id}/bulkAdd`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        const data = await res.json();
        ta.value = '';
        toast(`Added ${data.addedCount} option(s)`, 'success');
        await fetchDropdowns();
    } catch (err) {
        toast('Error importing options', 'error');
    }
}

async function bulkAddToAll() {
    const ta = document.getElementById('bulkGlobal');
    if (!ta || !ta.value.trim()) { toast('Enter items first', 'error'); return; }
    const items = ta.value.split('\n').map(s => s.trim()).filter(s => s);

    try {
        const res = await fetch('/api/dropdowns/bulkAddToAll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });

        const data = await res.json();
        if (!res.ok) {
            toast(data.error || 'Error', 'error');
            return;
        }

        ta.value = '';
        toast(`Added ${data.totalAdded} item(s) across all lists`, 'success');
        await fetchDropdowns();
    } catch (err) {
        toast('Error bulk adding', 'error');
    }
}

async function clearAll() {
    if (dropdowns.length === 0) return;
    try {
        await fetch('/api/dropdowns/clearAll', { method: 'DELETE' });
        toast('All dropdowns cleared', 'neutral');
        await fetchDropdowns();
    } catch (err) {
        toast('Error clearing dropdowns', 'error');
    }
}

function renderAll() {
    ddList.innerHTML = '';
    if (dropdowns.length === 0) {
        emptyState.style.display = '';
    } else {
        emptyState.style.display = 'none';
        dropdowns.forEach(dd => {
            const wrapper = document.createElement('div');
            wrapper.id = 'card-' + dd.id;
            ddList.appendChild(wrapper);
            renderCard(dd);
        });
    }
    updateStats();
}

function renderCard(dd) {
    const el = document.getElementById('card-' + dd.id);
    if (!el) return;

    const chipsHtml = dd.options.length === 0
        ? '<span class="no-options">No options added yet</span>'
        : dd.options.map((opt, i) => `
            <span class="chip">
                ${esc(opt)}
                <span class="chip-remove" onclick="removeOption(${dd.id},${i})" title="Remove" role="button" tabindex="0" aria-label="Remove ${esc(opt)}">&times;</span>
            </span>
        `).join('');

    const selectOpts = dd.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');

    el.innerHTML = `
        <div class="dd-card" data-color="${dd.color}">
            <div class="dd-card-banner">
                <div class="banner-left">
                    <div class="banner-count">${dd.options.length}</div>
                    <span class="banner-name">${esc(dd.name)}</span>
                </div>
                <button class="btn btn-rose btn-xs" onclick="deleteDropdown(${dd.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                </button>
            </div>
            <div class="dd-card-body">
                <div class="add-row">
                    <input type="text" class="form-input" id="inp-${dd.id}" placeholder="Type an option and press Enter..." onkeydown="handleKey(event,${dd.id})">
                    <button class="btn btn-accent btn-sm" onclick="triggerAdd(${dd.id})">Add</button>
                </div>

                <div class="chips-wrap">${chipsHtml}</div>

                <div class="bulk-section">
                    <label class="form-label">Bulk Import</label>
                    <div class="bulk-row">
                        <textarea class="form-textarea" id="bulk-${dd.id}" placeholder="Paste list, one per line..."></textarea>
                        <button class="btn btn-ghost btn-sm" onclick="bulkAddDropdown(${dd.id})" style="height:48px;">Import</button>
                    </div>
                </div>

                <div class="preview-banner">
                    <div class="preview-tag">Live Preview</div>
                    <select aria-label="Preview ${esc(dd.name)}">
                        <option value="" disabled selected>Select an option...</option>
                        ${selectOpts}
                    </select>
                </div>
            </div>
        </div>
    `;
}

function updateStats() {
    const totalOpts = dropdowns.reduce((sum, d) => sum + d.options.length, 0);
    statBanner.innerHTML = `<strong>${dropdowns.length}</strong> dropdown${dropdowns.length !== 1 ? 's' : ''} &middot; <strong>${totalOpts}</strong> total options`;
}

function exportAllHTML() {
    if (dropdowns.length === 0) { toast('Nothing to export', 'error'); return; }

    let html = '<!-- Generated by Dynamic Dropdown Manager -->\n\n';
    dropdowns.forEach(dd => {
        const slug = dd.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        html += `<div class="form-group">\n`;
        html += `  <label for="${slug}">${esc(dd.name)}</label>\n`;
        html += `  <select id="${slug}" name="${slug}">\n`;
        html += `    <option value="" disabled selected>Select...</option>\n`;
        dd.options.forEach(o => {
            html += `    <option value="${esc(o)}">${esc(o)}</option>\n`;
        });
        html += `  </select>\n</div>\n\n`;
    });

    exportCodeEl.textContent = html;
    toggleModal(true);
}

function copyCode() {
    navigator.clipboard.writeText(exportCodeEl.textContent).then(() => {
        toast('Copied to clipboard', 'success');
    }).catch(() => {
        const range = document.createRange();
        range.selectNodeContents(exportCodeEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        toast('Copied to clipboard', 'success');
    });
}

function toggleModal(show) {
    document.getElementById('exportModal').classList.toggle('active', show);
}

function closeModalBg(e) {
    if (e.target.classList.contains('modal-overlay')) toggleModal(false);
}

function handleKey(e, id) {
    if (e.key === 'Enter') { e.preventDefault(); triggerAdd(id); }
}

function triggerAdd(id) {
    const inp = document.getElementById('inp-' + id);
    if (inp && inp.value.trim()) addOption(id, inp.value);
}

function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function toast(msg, type) {
    type = type || 'neutral';
    const el = document.createElement('div');
    el.className = 'toast ' + type;

    let icon = '';
    if (type === 'success') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    else if (type === 'error') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    else icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    el.innerHTML = icon + '<span>' + msg + '</span>';
    toastStack.appendChild(el);

    setTimeout(() => {
        el.style.animation = 'toastOut 0.3s ease-out forwards';
        el.addEventListener('animationend', () => el.remove());
    }, 2800);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleModal(false);
});