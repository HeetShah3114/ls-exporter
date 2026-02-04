# LS Exporter 📦

A lightweight, modern Chrome Extension to manage, copy, and paste `localStorage` data as JSON.

![Icon](icons/icon48.png)

## Features
- **Modern UI**: Clean, dark-mode interface with a focus on usability.
- **JSON Highlighting**: View your local storage data with beautiful syntax highlighting.
- **Copy to Clipboard**: One-click export of the entire storage object as a formatted JSON.
- **Smart Import**: Paste JSON to update existing keys or add new ones.
- **Wipe & Restore**: Optional toggle to clear existing storage before importing.
- **Size Indicator**: Live calculation of total storage items and memory usage.

## Installation (Manual)
1. Clone this repository or download the ZIP.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.

## How to use
1. Navigate to any website where you want to inspect storage.
2. Click the **LS Exporter** icon in your browser toolbar.
3. Use the **View & Copy** tab to export data or the **Import JSON** tab to manipulate storage.

## Permissions Notice
This extension uses:
- `activeTab`: To read the storage of the page you are currently on.
- `scripting`: To execute the logic that fetches and updates the `localStorage` values.

---
Built with ❤️ for developers.
