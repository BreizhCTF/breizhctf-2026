const filesList = document.getElementById('filesList');
const renameModal = document.getElementById('renameModal');
const renameInput = document.getElementById('renameInput');
const renameCancelBtn = document.getElementById('renameCancelBtn');
const renameConfirmBtn = document.getElementById('renameConfirmBtn');

let renamePending = null;

document.addEventListener('DOMContentLoaded', loadFiles);

async function loadFiles() {
    try {
        const res = await fetch('/api/admin/files');
        const files = await res.json();
        renderFiles(files);
    } catch (err) {
        filesList.innerHTML = '<div class="files-empty">Erreur lors du chargement.</div>';
    }
}

function renderFiles(files) {
    if (files.length === 0) {
        filesList.innerHTML = '<div class="files-empty">Aucun fichier uploadé.</div>';
        return;
    }

    filesList.innerHTML = '';
    files.forEach(filename => filesList.appendChild(createFileRow(filename)));
}

function createFileRow(filename) {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.dataset.filename = filename;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'file-name';

    const icon = document.createElement('span');
    icon.className = 'icon icon-file';

    const link = document.createElement('a');
    link.href = `/uploads/${filename}`;
    link.target = '_blank';
    link.textContent = filename;

    nameDiv.appendChild(icon);
    nameDiv.appendChild(link);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'file-btn';
    renameBtn.innerHTML = '<span class="icon icon-edit"></span> Renommer';
    renameBtn.addEventListener('click', () => openRenameModal(filename, row));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'file-btn danger';
    deleteBtn.innerHTML = '<span class="icon icon-trash"></span> Supprimer';
    deleteBtn.addEventListener('click', () => deleteFile(filename, row));

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(nameDiv);
    row.appendChild(actions);

    return row;
}

async function deleteFile(filename, row) {
    if (!confirm(`Supprimer "${filename}" ?`)) return;

    try {
        const res = await fetch('/api/admin/files/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (data.status === 'success') {
            row.remove();
            if (filesList.children.length === 0) {
                filesList.innerHTML = '<div class="files-empty">Aucun fichier uploadé.</div>';
            }
        } else {
            alert(data.error || 'Erreur lors de la suppression');
        }
    } catch (err) {
        console.error('Delete error', err);
    }
}

function openRenameModal(filename, row) {
    renamePending = { filename, row };
    renameInput.value = filename;
    renameModal.classList.remove('hidden');
    renameInput.focus();
    renameInput.select();
}

function closeRenameModal() {
    renameModal.classList.add('hidden');
    renamePending = null;
}

renameCancelBtn.addEventListener('click', closeRenameModal);
renameModal.addEventListener('click', (e) => {
    if (e.target === renameModal) closeRenameModal();
});
renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renameConfirmBtn.click();
    if (e.key === 'Escape') closeRenameModal();
});

renameConfirmBtn.addEventListener('click', async () => {
    if (!renamePending) return;
    const newFilename = renameInput.value.trim();
    if (!newFilename || newFilename === renamePending.filename) { closeRenameModal(); return; }

    try {
        const res = await fetch('/api/admin/files/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: renamePending.filename, newFilename: newFilename })
        });
        const data = await res.json();
        if (data.status === 'success') {
            const newFilename = data.new_filename;
            const { row } = renamePending;

            row.dataset.filename = newFilename;

            const link = row.querySelector('.file-name a');
            link.href = `/uploads/${newFilename}`;
            link.textContent = newFilename;

            const [rBtn, dBtn] = row.querySelectorAll('.file-btn');
            rBtn.replaceWith(rBtn.cloneNode(true));
            dBtn.replaceWith(dBtn.cloneNode(true));
            const [newRBtn, newDBtn] = row.querySelectorAll('.file-btn');
            newRBtn.addEventListener('click', () => openRenameModal(newFilename, row));
            newDBtn.addEventListener('click', () => deleteFile(newFilename, row));

            closeRenameModal();
        } else {
            alert(data.error || 'Erreur lors du renommage');
        }
    } catch (err) {
        console.error('Rename error', err);
    }
});
