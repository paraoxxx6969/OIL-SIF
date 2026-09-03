"""
Download YOLOv26 Fire Detection Model from HuggingFace
Repo: SalahALHaismawi/yolov26-fire-detection
File: best.pt  →  saved locally as fire_detection.pt
"""

import os
import sys

REPO_ID  = "SalahALHaismawi/yolov26-fire-detection"
FILENAME = "best.pt"
LOCAL    = "fire_detection.pt"

if os.path.exists(LOCAL):
    print(f"[FIRE MODEL] '{LOCAL}' already exists — skipping download.")
    sys.exit(0)

print(f"[FIRE MODEL] Downloading '{FILENAME}' from '{REPO_ID}' ...")

try:
    from huggingface_hub import hf_hub_download
    path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)
    import shutil
    shutil.copy(path, LOCAL)
    print(f"[FIRE MODEL] ✓ Saved to '{LOCAL}'  ({os.path.getsize(LOCAL) // 1024} KB)")
except ImportError:
    print("[FIRE MODEL] huggingface_hub not installed — trying pip install ...")
    os.system("pip install huggingface_hub -q")
    from huggingface_hub import hf_hub_download
    path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)
    import shutil
    shutil.copy(path, LOCAL)
    print(f"[FIRE MODEL] ✓ Saved to '{LOCAL}'  ({os.path.getsize(LOCAL) // 1024} KB)")
