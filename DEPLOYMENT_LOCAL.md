# Local Deployment Scripts

Two one-click deployment scripts to get CertifAI running locally (development mode).

## ✅ What Each Script Does

Both scripts:
1. ✅ Verify you're in the project root directory
2. ✅ Install frontend dependencies (`npm install` at root)
3. ✅ Install backend dependencies (`npm install` in `backend/`)
4. ✅ Create `.env` file from `.env.example` (if missing)
5. ✅ Start **both** backend and frontend servers
6. ✅ Open the app in your browser (Mac only)

**Frontend:** http://localhost:5173  
**Backend:** http://localhost:3001

---

## 🖥️ For Mac / Linux

### Option 1: Direct Click (Finder)
1. Find `deploy-local.sh` in Finder
2. Right-click → "Open With" → Terminal
3. Press Enter when prompted
4. Wait for servers to start

### Option 2: Terminal
```bash
cd /path/to/certifAI
./deploy-local.sh
```

### Option 3: Make it Double-Clickable
1. Right-click `deploy-local.sh` in Finder
2. Get Info → Permissions → Check "Execute"
3. Now double-click to run

---

## 🪟 For Windows

### Option 1: Double-Click
1. Find `deploy-local.bat` in File Explorer
2. Double-click it
3. Two terminal windows will open (backend + frontend)
4. Wait for both servers to start

### Option 2: Command Prompt / PowerShell
```bash
cd C:\path\to\certifAI
deploy-local.bat
```

### Make It Easier (Optional)
- Right-click `deploy-local.bat`
- "Send to" → Desktop (creates shortcut)
- Double-click shortcut anytime to deploy

---

## ⚠️ Troubleshooting

### "Command not found" (Mac/Linux)
```bash
chmod +x deploy-local.sh
./deploy-local.sh
```

### "backend folder not found"
- Run the script from the **project root** directory
- The root should have: `CertifAI_MVP.jsx`, `backend/`, `package.json`

### Port Already in Use (3001 or 5173)
- Kill the process: 
  - **Mac/Linux:** `lsof -ti:3001 | xargs kill -9` (repeat for 5173)
  - **Windows:** `netstat -ano | findstr :3001` then `taskkill /PID <PID> /F`
- Or change ports in `.env` and `package.json`

### "npm not found"
- Install Node.js: https://nodejs.org/ (LTS recommended)
- Verify: `npm --version`

---

## 📊 What Runs

| Component | Port | Command |
|-----------|------|---------|
| Backend (Express) | 3001 | `cd backend && npm start` |
| Frontend (Vite) | 5173 | `npm run dev` |
| Database | — | SQLite (auto-reset in dev) |

---

## 🛑 Stopping the Servers

**Mac/Linux Terminal:**
- Press `Ctrl+C` in the terminal running the script

**Windows:**
- Close the two terminal windows
- Or press `Ctrl+C` in each window

---

## 🔄 After First Run

After the first successful run, you can:
- Keep running `./deploy-local.sh` or `deploy-local.bat`
- Or run `npm run dev` (frontend) + `cd backend && npm start` (backend) in separate terminals
- Or use your IDE's run configuration

---

## ✨ For the Team

**When cloning the repo:**
1. Clone: `git clone <repo-url>`
2. `cd` into the project directory
3. Double-click `deploy-local.bat` (Windows) or run `./deploy-local.sh` (Mac)
4. Wait ~30 seconds for servers to start
5. App opens automatically in your browser

That's it! No manual `npm install`, no separate terminal windows, no confusion.

---

**Generated:** 2026-07-24  
**Project:** CertifAI MVP  
**Platforms:** Mac/Linux (`.sh`) | Windows (`.bat`)
