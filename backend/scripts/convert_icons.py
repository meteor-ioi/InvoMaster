import os
import sys
from PIL import Image

def convert_to_ico(source_png, target_ico):
    print(f"Converting {source_png} to {target_ico}...")
    try:
        img = Image.open(source_png)
        # ICO typically contains multiple sizes: 16, 32, 48, 64, 128, 256
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        img.save(target_ico, format='ICO', sizes=icon_sizes)
        print("Successfully created .ico")
    except Exception as e:
        print(f"Error creating .ico: {e}")

def convert_to_icns(source_png, target_icns):
    print(f"Converting {source_png} to {target_icns}...")
    try:
        img = Image.open(source_png)
        # Pillow supports ICNS saving if the sizes are correct (powers of 2)
        # 16, 32, 64, 128, 256, 512, 1024
        img.save(target_icns, format='ICNS')
        print("Successfully created .icns")
    except Exception as e:
        print(f"Note: Error creating .icns directly via Pillow: {e}")
        print("This is common on Windows. On macOS, this will be handled better.")

def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    assets_dir = os.path.join(project_root, 'assets')
    os.makedirs(assets_dir, exist_ok=True)

    win_png = os.path.join(project_root, 'ICON_WIN.png')
    mac_png = os.path.join(project_root, 'ICON_MAC.png')

    target_ico = os.path.join(assets_dir, 'icon.ico')
    target_icns = os.path.join(assets_dir, 'icon.icns')

    if os.path.exists(win_png):
        convert_to_ico(win_png, target_ico)
    else:
        print(f"Warning: {win_png} not found.")

    if os.path.exists(mac_png):
        # We only try on macOS or if Pillow supports it
        convert_to_icns(mac_png, target_icns)
    else:
        print(f"Warning: {mac_png} not found.")

if __name__ == "__main__":
    main()
