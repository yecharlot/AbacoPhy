/**
 * ÁbacoPhy Desktop — shell Electron.
 * Arranca el binario Go embebido (extraResources/bin) o usa ABACOPHY_BIN.
 * Si no hay binario, abre la URL de ABACOPHY_URL (nube / Cloudflare).
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let child = null;
const PORT = process.env.ABACOPHY_PORT || '17890';

function binPath() {
  if (process.env.ABACOPHY_BIN) return process.env.ABACOPHY_BIN;
  const name = process.platform === 'win32' ? 'abacophy.exe' : 'abacophy';
  const candidates = [
    path.join(process.resourcesPath || '', 'bin', name),
    path.join(__dirname, 'bin', name),
    path.join(__dirname, '..', 'abacophy'),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function waitReady(url, tries = 40) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (n >= tries) reject(new Error('timeout waiting for engine'));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

async function startEngine() {
  const remote = process.env.ABACOPHY_URL;
  if (remote) return remote.replace(/\/$/, '');

  const bin = binPath();
  if (!bin) {
    console.warn('Sin binario local; use ABACOPHY_URL o coloque bin/abacophy');
    return null;
  }
  const dataDir = path.join(app.getPath('userData'), 'abacophy_data');
  fs.mkdirSync(dataDir, { recursive: true });
  child = spawn(bin, [], {
    env: {
      ...process.env,
      PORT: PORT,
      ABACOPHY_DATA: dataDir,
      ABACOPHY_STATIC: process.env.ABACOPHY_STATIC || '',
    },
    cwd: path.dirname(bin),
  });
  child.stdout.on('data', (d) => console.log('[engine]', d.toString()));
  child.stderr.on('data', (d) => console.error('[engine]', d.toString()));
  child.on('exit', (code) => console.log('engine exit', code));
  const base = 'http://127.0.0.1:' + PORT;
  await waitReady(base + '/api/v1/info');
  return base;
}

async function createWindow() {
  let base;
  try {
    base = await startEngine();
  } catch (e) {
    console.error(e);
    base = process.env.ABACOPHY_URL || null;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 560,
    title: 'ÁbacoPhy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (base) {
    await mainWindow.loadURL(base + '/');
  } else {
    await mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<h1>ÁbacoPhy</h1><p>No se encontró el motor local. Compile el binario Go y colóquelo en desktop/bin/ o defina ABACOPHY_URL.</p>'
        )
    );
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (child) try { child.kill(); } catch (_) {}
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  if (child) try { child.kill(); } catch (_) {}
});
