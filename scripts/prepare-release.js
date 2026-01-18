const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

function run(command, cwd = rootDir) {
    console.log(`\n> Executing: ${command} in ${cwd}`);
    try {
        execSync(command, { cwd, stdio: 'inherit' });
    } catch (e) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

console.log('--- Starting Release Preparation ---');

// 1. Download Models
console.log('\n[1/4] Preparing AI Models...');
// Check if python is available, or use uv
run('uv run python scripts/download_models.py');

// 2. Build Frontend
console.log('\n[2/4] Building Frontend...');
run('npm install', path.join(rootDir, 'frontend'));
run('npm run build', path.join(rootDir, 'frontend'));

// 3. Build Backend
console.log('\n[3/4] Building Backend...');
run('uv sync', path.join(rootDir, 'backend'));
// Ensure PyInstaller is installed
run('uv pip install pyinstaller', path.join(rootDir, 'backend'));
// Run Build
// Using --clean to robustify
run('uv run pyinstaller --clean build.spec', path.join(rootDir, 'backend'));

// 4. Build Electron (Dist)
// Note: This script just PREPARES. The actual 'dist' command might be run separately or here.
// But let's verify directory structure mainly.
const distBackend = path.join(rootDir, 'backend/dist/industry_pdf_backend');
const distBackendExe = path.join(rootDir, 'backend/dist/industry_pdf_backend.exe');

if (!fs.existsSync(distBackend) && !fs.existsSync(distBackendExe)) {
    console.error('Error: Backend binary not found in backend/dist/');
    process.exit(1);
}

console.log('\n[4/4] Release Preparation Complete!');
console.log('Now you can run: cd electron && npm run dist');
