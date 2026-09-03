import os
from huggingface_hub import hf_hub_download
from ultralytics import YOLO

print("="*60)
print("  Downloading Pre-trained Helmet & PPE Detection Model...")
print("="*60)

# Try downloading pre-trained weights from HuggingFace
models_to_try = [
    ("foduucom/helmet-detection-yolov8", "best.pt"),
    ("keremberke/yolov8n-hard-hat-detection", "best.pt"),
    ("cyberai/ppe-yolov8", "best.pt")
]

downloaded_path = None

for repo_id, filename in models_to_try:
    try:
        print(f"\n[TRY] Fetching weights from {repo_id}...")
        file_path = hf_hub_download(repo_id=repo_id, filename=filename)
        print(f"[✓] SUCCESS! Downloaded model weights to: {file_path}")
        downloaded_path = file_path
        break
    except Exception as e:
        print(f"[WARN] Failed ({repo_id}): {e}")

if downloaded_path:
    # Test loading the model
    model = YOLO(downloaded_path)
    print(f"\n[MODEL INFO] Successfully loaded YOLO model!")
    print(f"[MODEL CLASSES] {model.names}")
    
    # Save a local copy as ppe_best.pt
    import shutil
    shutil.copy(downloaded_path, "ppe_best.pt")
    print("\n[SAVED] Saved local model file as: 'ppe_best.pt'")
else:
    print("\n[WARN] Could not download custom PPE weights. Standard yolov8n.pt will be used.")

print("="*60)
