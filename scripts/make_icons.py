import os
import sys
import subprocess
from PIL import Image

def generate_icons(source_png, output_dir):
    if not os.path.exists(source_png):
        print(f"Error: Source file {source_png} not found.")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = Image.open(source_png)
    
    # 1. Generate ICO for Windows
    print("Generating icon.ico for Windows...")
    img.save(os.path.join(output_dir, "icon.ico"), format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])

    # 2. Generate ICNS for macOS
    if sys.platform == 'darwin':
        print("Generating icon.icns for macOS...")
        iconset_name = "icon.iconset"
        iconset_path = os.path.join(output_dir, iconset_name)
        
        if not os.path.exists(iconset_path):
            os.makedirs(iconset_path)

        sizes = [16, 32, 128, 256, 512]
        for size in sizes:
            # Normal size
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(os.path.join(iconset_path, f"icon_{size}x{size}.png"))
            
            # Retina size (@2x)
            retina_size = size * 2
            resized_retina = img.resize((retina_size, retina_size), Image.Resampling.LANCZOS)
            resized_retina.save(os.path.join(iconset_path, f"icon_{size}x{size}@2x.png"))

        try:
            subprocess.run(["iconutil", "-c", "icns", iconset_path, "-o", os.path.join(output_dir, "icon.icns")], check=True)
            print("Successfully generated icon.icns")
            # Cleanup iconset folder
            # import shutil
            # shutil.rmtree(iconset_path)
        except subprocess.CalledProcessError as e:
            print(f"Error generating icns: {e}")
            print("Ensure you are running on macOS to generate .icns")
    
    print("Icon generation complete.")

if __name__ == "__main__":
    SOURCE = "assets/icon.png"
    OUTPUT = "assets"
    generate_icons(SOURCE, OUTPUT)
