import os
import subprocess
import sys
import shutil

def run_command(command, cwd=None):
    print(f"Executing: {command} in {cwd if cwd else 'current directory'}")
    try:
        subprocess.check_call(command, shell=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        sys.exit(1)

def main():
    project_root = os.path.abspath(os.path.dirname(__file__))
    frontend_dir = os.path.join(project_root, "frontend")
    dist_dir = os.path.join(project_root, "dist")

    print("🚀 Starting Desktop App Build Process...")

    # 1. Build Frontend
    print("\n--- Step 1: Building Frontend ---")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        run_command("npm install", cwd=frontend_dir)
    run_command("npm run build", cwd=frontend_dir)

    # 2. Package with PyInstaller
    print("\n--- Step 2: Packaging with PyInstaller ---")
    
    # Check if we should use uv (recommended for this project)
    has_uv = subprocess.call("command -v uv", shell=True, stdout=subprocess.DEVNULL) == 0
    if has_uv:
        pyinstaller_cmd = "uv run pyinstaller industry_pdf.spec --clean --noconfirm"
    else:
        pyinstaller_cmd = "pyinstaller industry_pdf.spec --clean --noconfirm"
    
    run_command(pyinstaller_cmd, cwd=project_root)

    print("\n✨ Build Complete!")
    print(f"The packaged application can be found in: {dist_dir}")
    
    if sys.platform == 'darwin':
        print("Final App: dist/InvoMaster.app")
    elif sys.platform == 'win32':
        print("Final App Folder: dist/InvoMaster")

if __name__ == "__main__":
    main()
