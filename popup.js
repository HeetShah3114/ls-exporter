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

// Refresh and display localStorage
async function refreshStorage() {
    try {
        const data = await getLocalStorage();
        const keys = Object.keys(data);

        itemCount.textContent = keys.length;
        storageSize.textContent = calculateSize(data);

        if (keys.length === 0) {
            jsonOutput.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No localStorage data found on this page</p></div>';
        } else {
            jsonOutput.innerHTML = syntaxHighlight(data);
        }

        // Store current data for copying
        jsonOutput.dataset.rawJson = JSON.stringify(data, null, 2);

    } catch (error) {
        jsonOutput.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Cannot access localStorage on this page.<br>Try on a regular website.</p></div>';
        itemCount.textContent = '-';
        storageSize.textContent = '-';
    }
}

// Copy JSON to clipboard
copyBtn.addEventListener('click', async () => {
    const rawJson = jsonOutput.dataset.rawJson;

    if (!rawJson || rawJson === '{}') {
        showToast('No data to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(rawJson);
        showToast('✓ Copied to clipboard!', 'success');
    } catch (error) {
        showToast('Failed to copy', 'error');
    }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
    refreshStorage();
    showToast('✓ Refreshed!', 'success');
});

// Clear input button
clearInputBtn.addEventListener('click', () => {
    jsonInput.value = '';
    jsonInput.focus();
});

// Import JSON
importBtn.addEventListener('click', async () => {
    const inputValue = jsonInput.value.trim();

    if (!inputValue) {
        showToast('Please enter JSON data', 'error');
        return;
    }

    let data;
    try {
        data = JSON.parse(inputValue);
    } catch (error) {
        showToast('Invalid JSON format', 'error');
        return;
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        showToast('JSON must be an object', 'error');
        return;
    }

    try {
        await setLocalStorage(data, clearBeforeImport.checked);
        showToast('✓ Storage updated!', 'success');

        // Switch to view tab and refresh
        tabBtns[0].click();
        await refreshStorage();

        // Clear input
        jsonInput.value = '';

    } catch (error) {
        showToast('Failed to update storage', 'error');
    }
});

// Initialize
refreshStorage();
