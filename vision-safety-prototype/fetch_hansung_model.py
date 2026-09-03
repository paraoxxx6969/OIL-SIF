import os
from huggingface_hub import hf_hub_download
from ultralytics import YOLO
import shutil

print("="*60)
print("  Fetching 'Hansung-Cho/yolov8-ppe-detection' Model...")
print("="*60)

repo_id = "Hansung-Cho/yolov8-ppe-detection"

# Try downloading model weights file (best.pt or model.pt or pytorch_model.bin)
weight_filenames = ["best.pt", "model.pt", "yolov8_ppe.pt", "weights/best.pt"]

downloaded_file = None
for fname in weight_filenames:
    try:
        print(f"[TRY] Checking for file '{fname}' in '{repo_id}'...")
        file_path = hf_hub_download(repo_id=repo_id, filename=fname)
        print(f"[✓] Found file: {file_path}")
        downloaded_file = file_path
        break
    except Exception as e:
        print(f"  [-] '{fname}' not found: {e}")

if not downloaded_file:
    # List files in repo if specific filenames failed
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        files = api.list_repo_files(repo_id)
        print(f"\nFiles available in repository '{repo_id}':")
        for f in files:
            print(f"  - {f}")
            if f.endswith(".pt") or f.endswith(".onnx") or f.endswith(".bin"):
                file_path = hf_hub_download(repo_id=repo_id, filename=f)
                downloaded_file = file_path
                break
    except Exception as ex:
        print(f"[ERROR] Could not list repo files: {ex}")

if downloaded_file:
    try:
        model = YOLO(downloaded_file)
        print("\n" + "="*50)
        print("  [✓] HANSUNG-CHO PPE MODEL LOADED SUCCESSFULLY!")
        print("="*50)
        print(f"Total Classes ({len(model.names)}):")
        for cls_idx, cls_name in model.names.items():
            print(f"  Class {cls_idx}: '{cls_name}'")
        
        shutil.copy(downloaded_file, "hansung_ppe.pt")
        print("\n[SAVED] Saved local model file as 'hansung_ppe.pt'")
    except Exception as err:
        print(f"[ERROR] Loading YOLO model failed: {err}")
else:
    print("\n[ERROR] Model download failed.")

print("="*60)
