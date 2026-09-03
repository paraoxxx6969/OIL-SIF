"""
Custom YOLOv8 Helmet Detection Training Script

To train your own model:
1. Collect ~500 images of workers with helmets and without helmets.
2. Label them on Roboflow (https://roboflow.com) or using 'labelImg' locally.
   - Annotate two classes: 0: 'helmet', 1: 'no-helmet'
   - Export the dataset in YOLO v8 format.
3. Extract the downloaded dataset into a folder named "helmet_dataset/" inside this directory.
4. Run this script: python train_helmet.py
"""

import os
from ultralytics import YOLO

def train():
    # ── 1. CHECK DATASET ───────────────────────────────────────
    dataset_yaml = os.path.join("helmet_dataset", "data.yaml")
    
    if not os.path.exists(dataset_yaml):
        print("\n" + "="*70)
        # Create a sample yaml structure to guide the user
        print("[ERROR] Dataset configuration 'data.yaml' not found.")
        print("Please place your labeled YOLO dataset folder here as 'helmet_dataset/'")
        print("\nExpected structure:")
        print("vision-safety-prototype/")
        print("├── helmet_dataset/")
        print("│   ├── data.yaml")
        print("│   ├── train/ (images & labels)")
        print("│   └── val/ (images & labels)")
        print("="*70 + "\n")
        return

    # ── 2. LOAD PRE-TRAINED MODEL ─────────────────────────────
    # Load YOLOv8 Nano model (small, fast, ideal for laptops)
    print("[INIT] Loading YOLOv8 nano base weights...")
    model = YOLO("yolov8n.pt") 

    # ── 3. START TRAINING ─────────────────────────────────────
    print("[TRAIN] Starting Custom Helmet Detection Training...")
    print("[TRAIN] This will run on GPU (CUDA) if available, otherwise CPU.")
    
    results = model.train(
        data=dataset_yaml,   # path to data.yaml
        epochs=50,           # number of training epochs (increase to 100 for better accuracy)
        imgsz=640,           # image size
        batch=16,            # batch size (decrease to 8 if laptop runs out of memory)
        device="cpu",        # force CPU. Change to 0 if you have an NVIDIA GPU with CUDA
        workers=2            # number of data loading workers
    )

    print("\n" + "="*50)
    print("  [✓] CUSTOM TRAINING COMPLETE!")
    print("="*50)
    print("Your trained model weights are saved at:")
    print("  runs/detect/train/weights/best.pt")
    print("\nTo use your new model:")
    print("Copy 'best.pt' and update vision_main.py config to:")
    print("  model = YOLO('best.pt')")
    print("="*50 + "\n")

if __name__ == "__main__":
    train()
