import os
import subprocess
import sys
import shutil

def run_command(command, cwd=None):
    print(f"\n>>> Executing: {command}")
    print(f">>> In: {cwd if cwd else os.getcwd()}")
    try:
        # Use shell=True for Windows compatibility with npm/uv
        subprocess.check_call(command, shell=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error executing command: {e}")
        sys.exit(1)

def main():
    project_root = os.path.abspath(os.path.dirname(__file__))
    frontend_dir = os.path.join(project_root, "frontend")
    backend_dir = os.path.join(project_root, "backend")
    dist_dir = os.path.join(project_root, "dist")

    print("========================================")
    print("🚀 InvoMaster - Windows Build Tool")
    print("========================================")

    # 1. Build Frontend
    print("\n[Step 1/4] Building Frontend Assets...")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("Installing npm dependencies...")
        run_command("npm install", cwd=frontend_dir)
    
    print("Running npm run build...")
    run_command("npm run build", cwd=frontend_dir)

    # 2. Preparation: Icons and Model Quantization
    print("\n[Step 2/4] Preparing Resources...")
    run_command("uv run python scripts/convert_icons.py", cwd=backend_dir)
    

    # 3. Package with PyInstaller via uv
    print("\n[Step 3/4] Packaging Python App with PyInstaller...")
    
    # We use uv run --project backend to ensure we are in the correct virtual environment
    # The spec file 'industry_pdf.spec' already contains all the complex configuration
    pyinstaller_cmd = "uv run --project backend pyinstaller industry_pdf.spec --clean --noconfirm"
    
    run_command(pyinstaller_cmd, cwd=project_root)

    # 4. Final Verification
    print("\n[Step 4/4] Verifying Output...")
    final_output = os.path.join(dist_dir, "InvoMaster")
    main_exe = os.path.join(final_output, 'InvoMaster.exe')
    backend_exe = os.path.join(final_output, '_invo_backend.exe')
    
    if os.path.exists(main_exe) and os.path.exists(backend_exe):
        print(f"\n✅ Build Successful!")
        print(f"📍 Location: {final_output}")
        print(f"👉 Frontend: {main_exe} (With App Icon)")
        print(f"👉 Backend:  {backend_exe} (Internal Service, Standard Icon)")
    elif os.path.exists(main_exe):
        print(f"\n⚠️ Build partially successful (backend_server.exe missing)")
        print(f"👉 Run: {main_exe}")
    else:
        print("\n❌ Build failed - output not found.")
        print(f"Checked: {main_exe}")

    print("\n========================================")

if __name__ == "__main__":
    main()
