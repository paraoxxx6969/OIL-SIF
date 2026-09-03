import os
from huggingface_hub import hf_hub_download
from ultralytics import YOLO
import shutil

print("="*60)
print("  Searching & Downloading Multi-Class Full PPE Model...")
print("="*60)

# List of pre-trained Multi-PPE models on HuggingFace (Helmet, Vest, Gloves, Mask, Boots)
multi_ppe_models = [
    ("keremberke/yolov8n-protective-equipment-detection", "best.pt"),
    ("sartor/ppe-detection-yolov8", "best.pt"),
    ("arnabdhar/YOLOv8-PPE-Detection", "best.pt"),
    ("subhadeep/yolov8x-ppe", "best.pt")
]

downloaded_model = None

for repo_id, filename in multi_ppe_models:
    try:
        print(f"\n[TRY] Fetching multi-PPE weights from '{repo_id}'...")
        file_path = hf_hub_download(repo_id=repo_id, filename=filename)
        print(f"[✓] SUCCESS! Downloaded model from '{repo_id}'")
        downloaded_model = (repo_id, file_path)
        break
    except Exception as e:
        print(f"[WARN] Could not fetch '{repo_id}': {e}")

if downloaded_model:
    repo_id, file_path = downloaded_model
    model = YOLO(file_path)
    print("\n" + "="*50)
    print(f"  [✓] MULTI-CLASS PPE MODEL LOADED SUCCESSFULLY!")
    print("="*50)
    print(f"Total Classes ({len(model.names)}):")
    for cls_idx, cls_name in model.names.items():
        print(f"  Class {cls_idx}: '{cls_name}'")
    
    # Save as multi_ppe_best.pt
    shutil.copy(file_path, "multi_ppe_best.pt")
    print("\n[SAVED] Model weights saved locally as 'multi_ppe_best.pt'")
else:
    print("\n[ERROR] Could not fetch multi-class model.")

print("="*60)
