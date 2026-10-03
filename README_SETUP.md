# D&D Digital Solutions — Online Print System

## Architecture
Customer phone → GitHub Pages website → Google Apps Script API → Google Drive/Sheets → Windows Auto-Print Agent → Printer.

## 1. Create the free backend
1. Open Google Sheets and create a new spreadsheet named **DD Print Orders**.
2. Open **Extensions → Apps Script**.
3. Replace the editor contents with `backend/Code.gs`.
4. Save.
5. Deploy → New deployment → Web app.
6. Execute as **Me** and choose the access setting that allows your customers/agent to call the web app.
7. Copy the `/exec` URL.

## 2. Connect the website
Open `index.html` and set `API_URL` to your Apps Script `/exec` URL.
The browser can then create real orders and the backend stores files in your Google Drive folder **DD_Print_Jobs** and order data in the Sheet.

## 3. Windows Auto-Print Agent
1. Install Python 3 on the shop PC.
2. Optional but recommended: install SumatraPDF.
3. Open `windows-agent/agent.py`.
4. Set `API_URL` to the same Apps Script `/exec` URL.
5. Optionally set `PRINTER_NAME`.
6. Run: `python agent.py`.

The agent polls for Pending jobs, downloads the file data, prints it, then changes the order to Completed or Failed.

## Important
GitHub Pages itself is static, so it cannot securely receive/store customer print files. The Google Apps Script + Drive/Sheets layer is therefore required for the real online version.
