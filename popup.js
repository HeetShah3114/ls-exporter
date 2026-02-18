// DOM Elements
const jsonOutput = document.getElementById('json-output');
const jsonInput = document.getElementById('json-input');
const itemCount = document.getElementById('item-count');
const storageSize = document.getElementById('storage-size');
const copyBtn = document.getElementById('copy-btn');
const refreshBtn = document.getElementById('refresh-btn');
const importBtn = document.getElementById('import-btn');
const clearInputBtn = document.getElementById('clear-input-btn');
const clearBeforeImport = document.getElementById('clear-before-import');
const tabBtns = document.querySelectorAll('.tab-btn');
const toast = document.getElementById('toast');
// List View Elements
const storageList = document.getElementById('storage-list');
const searchKey = document.getElementById('search-key');
const addItemBtn = document.getElementById('add-item-btn');

// Modal Elements
const editModal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-title');
const editKey = document.getElementById('edit-key');
const editValue = document.getElementById('edit-value');
const isJsonValue = document.getElementById('is-json-value');
const closeModalObj = document.querySelector('.close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditBtn = document.getElementById('save-edit');
const deleteBtn = document.getElementById('delete-btn');

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const tabId = btn.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');
    });
});

// Show toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Format JSON with syntax highlighting
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Calculate storage size
function calculateSize(data) {
    const bytes = new Blob([JSON.stringify(data)]).size;
    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// Get localStorage from current tab
async function getLocalStorage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    let value = localStorage.getItem(key);

                    // Try to parse JSON values
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        // Keep as string if not valid JSON
                    }

                    data[key] = value;
                }
                return data;
            }
        });

        return results[0].result;
    } catch (error) {
        console.error('Error getting localStorage:', error);
        throw error;
    }
}

// Set localStorage on current tab
async function setLocalStorage(data, clearFirst = false) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (newData, shouldClear) => {
                if (shouldClear) {
                    localStorage.clear();
                }

                for (const [key, value] of Object.entries(newData)) {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    localStorage.setItem(key, stringValue);
                }

                return true;
            },
            args: [data, clearFirst]
        });

        return true;
    } catch (error) {
        console.error('Error setting localStorage:', error);
        throw error;
    }
}

// Delete localStorage item on current tab
async function deleteLocalStorage(key) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (keyToDelete) => {
                localStorage.removeItem(keyToDelete);
                return true;
            },
            args: [key]
        });

        return true;
    } catch (error) {
        console.error('Error deleting localStorage item:', error);
        throw error;
    }
}

// Refresh and display localStorage
async function refreshStorage() {
    try {
        const data = await getLocalStorage();
        const keys = Object.keys(data);

        // Update stats
        itemCount.textContent = keys.length;
        storageSize.textContent = calculateSize(data);

        // Update JSON View
        if (keys.length === 0) {
            jsonOutput.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No localStorage data found on this page</p></div>';
        } else {
            jsonOutput.innerHTML = syntaxHighlight(data);
        }

        // Store current data for copying
        jsonOutput.dataset.rawJson = JSON.stringify(data, null, 2);

        // Update List View
        renderStorageList(data);

    } catch (error) {
        jsonOutput.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Cannot access localStorage on this page.<br>Try on a regular website.</p></div>';
        storageList.innerHTML = '<div class="empty-state"><p>Cannot access localStorage</p></div>';
        itemCount.textContent = '-';
        storageSize.textContent = '-';
    }
}

// Render Storage List
function renderStorageList(data) {
    storageList.innerHTML = '';
    const searchTerm = searchKey.value.toLowerCase();
    const entries = Object.entries(data);

    if (entries.length === 0) {
        storageList.innerHTML = '<div class="empty-state"><p>No items found</p></div>';
        return;
    }

    let found = false;

    entries.sort((a, b) => a[0].localeCompare(b[0])).forEach(([key, value]) => {
        if (searchTerm && !key.toLowerCase().includes(searchTerm)) {
            return;
        }

        found = true;
        const item = document.createElement('div');
        item.className = 'storage-item';

        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        item.innerHTML = `
            <div class="item-content">
                <div class="item-key" title="${key}">${key}</div>
                <div class="item-value" title="${displayValue.replace(/"/g, '&quot;')}">${displayValue}</div>
            </div>
            <div class="item-actions">
                <button class="btn-icon-only edit-item-btn" title="Edit">✏️</button>
            </div>
        `;

        // Add event listener for edit button
        item.querySelector('.edit-item-btn').addEventListener('click', () => {
            openModal(key, value);
        });

        storageList.appendChild(item);
    });

    if (!found) {
        storageList.innerHTML = '<div class="empty-state"><p>No matching keys found</p></div>';
    }
}

// Modal Logic
let currentEditKey = null;

function openModal(key = null, value = '') {
    currentEditKey = key;

    if (key) {
        // Edit mode
        modalTitle.textContent = 'Edit Item';
        editKey.value = key;
        editKey.disabled = true; // Cannot change key when editing
        deleteBtn.style.display = 'block';

        if (typeof value === 'object') {
            editValue.value = JSON.stringify(value, null, 2);
            isJsonValue.checked = true;
        } else {
            editValue.value = value;
            isJsonValue.checked = false;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Item';
        editKey.value = '';
        editKey.disabled = false;
        editValue.value = '';
        isJsonValue.checked = false;
        deleteBtn.style.display = 'none';
    }

    editModal.classList.add('show');
    if (!key) setTimeout(() => editKey.focus(), 100);
    else setTimeout(() => editValue.focus(), 100);
}

function closeModal() {
    editModal.classList.remove('show');
    currentEditKey = null;
}

// Save Edit/Add
saveEditBtn.addEventListener('click', async () => {
    const key = editKey.value.trim();
    let value = editValue.value;
    const isJson = isJsonValue.checked;

    if (!key) {
        showToast('Key is required', 'error');
        return;
    }

    if (isJson) {
        try {
            value = JSON.parse(value);
        } catch (e) {
            showToast('Invalid JSON format', 'error');
            return;
        }
    }

    try {
        const data = { [key]: value };
        // If we are editing, we just set the new value. The key is locked so we don't need to delete old one (unless we allowed key editing).
        // If adding, we just set the key.

        await setLocalStorage(data, false);
        showToast('✓ Saved!', 'success');
        closeModal();
        refreshStorage();
    } catch (error) {
        showToast('Failed to save', 'error');
    }
});

// Delete Item
deleteBtn.addEventListener('click', async () => {
    if (!currentEditKey) return;

    if (confirm(`Are you sure you want to delete "${currentEditKey}"?`)) {
        try {
            await deleteLocalStorage(currentEditKey);
            showToast('✓ Deleted!', 'success');
            closeModal();
            refreshStorage();
        } catch (error) {
            showToast('Failed to delete', 'error');
        }
    }
});

// Modal Event Listeners
closeModalObj.addEventListener('click', closeModal);
cancelEditBtn.addEventListener('click', closeModal);
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
});



// Optimize search to not hit chrome API on every keystroke if possible, 
// BUT refreshStorage() updates everything. 
// A better approach: store `currentData` globally in the file.
let currentData = {};
const originalGetLocalStorage = getLocalStorage;
// Override/wrap to cache data
getLocalStorage = async function () {
    currentData = await originalGetLocalStorage();
    return currentData;
}

// Now update search listener to use cached data
// Search functionality
searchKey.addEventListener('input', () => {
    renderStorageList(currentData);
});


// Add Item Button
addItemBtn.addEventListener('click', () => {
    openModal();
});

// Initial load
refreshStorage();
