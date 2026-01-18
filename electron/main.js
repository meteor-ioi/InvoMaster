const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const getPort = require('get-port');
const log = require('electron-log');

// Setup logging
log.transports.file.level = 'info';
console.log = log.log;

let mainWindow;
let backendProcess;
let backendPort = 8000;

const isDev = !app.isPackaged;

async function startBackend() {
    try {
        // 1. Find a free port
        backendPort = await getPort({ port: getPort.makeRange(8000, 8100) });
        log.info(`Allocated port for backend: ${backendPort}`);

        // 2. Determine executable path
        let cmd, args;
        if (isDev) {
            // Dev mode: use local python
            // Assumes we are running from 'electron' folder
            cmd = 'uv'; // Using uv to run
            args = ['run', 'python', path.join(__dirname, '../backend/run_server.py'), '--port', String(backendPort)];
        } else {
            // Prod mode: use packaged backend executable
            const backendExec = process.platform === 'win32'
                ? 'industry_pdf_backend.exe'
                : 'industry_pdf_backend';

            const backendPath = path.join(process.resourcesPath, 'backend', backendExec);
            log.info(`Backend executable path: ${backendPath}`);

            cmd = backendPath;
            args = ['--port', String(backendPort)];
        }

        // 3. Spawn process
        log.info(`Spawning backend: ${cmd} ${args.join(' ')}`);
        backendProcess = spawn(cmd, args, {
            cwd: isDev ? path.join(__dirname, '../backend') : path.join(process.resourcesPath, 'backend'),
            stdio: 'pipe' // Capture stdio
        });

        backendProcess.stdout.on('data', (data) => {
            log.info(`[Backend]: ${data}`);
        });

        backendProcess.stderr.on('data', (data) => {
            log.error(`[Backend ERR]: ${data}`);
        });

        backendProcess.on('close', (code) => {
            log.info(`Backend process exited with code ${code}`);
            if (code !== 0 && code !== null) {
                dialog.showErrorBox('Backend Error', `Backend service crashed with code ${code}. Please restart the app.`);
            }
        });

        // Simple wait for backend to be ready (could be improved with health check)
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        log.error('Failed to start backend:', error);
        dialog.showErrorBox('Startup Error', `Failed to start backend service:\n${error.message}`);
    }
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // Inject port via query parameter
    const startUrl = isDev
        ? `http://localhost:5173?api_port=${backendPort}`
        : `file://${path.join(__dirname, '../frontend/dist/index.html')}?api_port=${backendPort}`;

    log.info(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {
    await startBackend();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Ensure backend is killed when app quits
app.on('before-quit', () => {
    if (backendProcess) {
        log.info('Killing backend process...');
        backendProcess.kill();
    }
});
