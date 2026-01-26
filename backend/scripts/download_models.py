import os
import shutil
from huggingface_hub import hf_hub_download

def download_models():
    # Determine data directory
    # Default to relative path "backend/data" if running from root, or "data" if running from backend
    # But safer to always use relative to this script: ../data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Fallback to ../data (backend/data) relative to this script
    default_data_dir = os.path.join(os.path.dirname(script_dir), 'data')
    
    base_data_dir = os.environ.get("APP_DATA_DIR", default_data_dir)
    print(f"Downloading models to: {base_data_dir}")
    
    model_dir = os.path.join(base_data_dir, 'models')
    ocr_dir = os.path.join(model_dir, 'ocr')
    
    # Ensure directories exist
    os.makedirs(ocr_dir, exist_ok=True)
    
    # 1. Download YOLO model (from verified source)
    print('Downloading YOLO model...')
    try:
        yolo_path = hf_hub_download(
            repo_id='wybxc/DocLayout-YOLO-DocStructBench-onnx', 
            filename='doclayout_yolo_docstructbench_imgsz1024.onnx', 
            local_dir=model_dir, 
            local_dir_use_symlinks=False
        )
        # Rename to what the code expects: yolov10-doclayout.onnx
        dst_yolo = os.path.join(model_dir, 'yolov10-doclayout.onnx')
        if os.path.exists(yolo_path) and yolo_path != dst_yolo:
            shutil.move(yolo_path, dst_yolo)
            print(f"Moved YOLO model to {dst_yolo}")
    except Exception as e:
        print(f"Error downloading YOLO model: {e}")
        # If it failed but it was already there (somehow), we might want to continue, 
        # but usually in CI we want it to fail.
        raise

    # 2. Download OCR models (from verified source)
    ocr_repo = 'SWHL/RapidOCR'
    ocr_files = ['ch_PP-OCRv4_det_infer.onnx', 'ch_PP-OCRv4_rec_infer.onnx']
    for f in ocr_files:
        print(f'Downloading OCR model {f}...')
        try:
            downloaded_path = hf_hub_download(
                repo_id=ocr_repo, 
                filename=f'PP-OCRv4/{f}', 
                local_dir=ocr_dir, 
                local_dir_use_symlinks=False
            )
            # hf_hub_download with local_dir + subpath creates a subfolder. Move file to root of /ocr
            src = os.path.join(ocr_dir, 'PP-OCRv4', f)
            dst = os.path.join(ocr_dir, f)
            if os.path.exists(src):
                shutil.move(src, dst)
                print(f"Moved {f} to {dst}")
            
            # Cleanup the subfolder if empty
            subfolder = os.path.join(ocr_dir, 'PP-OCRv4')
            if os.path.exists(subfolder) and not os.listdir(subfolder):
                os.rmdir(subfolder)
        except Exception as e:
            print(f"Error downloading OCR model {f}: {e}")
            raise

if __name__ == "__main__":
    download_models()
