"""
Vision Safety Main Script — Webcam PPE + Fire/Smoke Detection + Face Recognition
Uses:
  - Hansung-Cho / PPE YOLOv8 model for PPE violations
  - SalahALHaismawi/yolov26-fire-detection  (best.pt) for fire & smoke
  - OpenCV LBPH Face Recognizer for employee identification

Compatible with Python 3.14 — no TensorFlow required.

Run:
  1. python vision_backend.py   (Terminal 1)
  2. python vision_main.py      (Terminal 2)
"""

import cv2
import time
import threading
import base64
import requests
import os
import json
import numpy as np
import torch
from datetime import datetime
from ultralytics import YOLO

# ── GPU / DEVICE SELECTION ───────────────────────────────────────
# Automatically uses CUDA if available, otherwise falls back to CPU.
_cuda_ok   = torch.cuda.is_available()
DEVICE     = "cuda:0" if _cuda_ok else "cpu"
if _cuda_ok:
    _gpu_name = torch.cuda.get_device_name(0)
    _vram_gb  = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"\n{'='*60}")
    print(f"  [GPU] Running on: {_gpu_name}")
    print(f"  [GPU] VRAM     : {_vram_gb:.1f} GB")
    print(f"  [GPU] CUDA     : {torch.version.cuda}")
    print(f"{'='*60}\n")
else:
    print("\n[WARN] CUDA not available — running on CPU (slower).")
    print("       Install PyTorch+CUDA: pip install torch --index-url https://download.pytorch.org/whl/cu126\n")

# ── CONFIG ────────────────────────────────────────────────────
BACKEND_URL        = "http://localhost:5001/api/vision/report"
FACE_DB_PATH       = "employees"
CAMERA_INDEX       = 0                     # 0 = Primary working webcam
CAMERA_LABEL       = "Primary Webcam"
AREA_LABEL         = "Entry / Main Gate"
VIOLATION_COOLDOWN  = 20     # seconds between repeated alerts per person
INFERENCE_INTERVAL = 0.25    # seconds between inference ticks (4 FPS inference, 30 FPS display)
INFERENCE_RESIZE   = 320     # inference input size — lower = faster (320 or 416)
CONF_THRESHOLD     = 0.15    # low threshold (0.15) for sensitive head/helmet detection

# ── POLYGON GEOFENCING CONFIG ────────────────────────────────
ENABLE_RESTRICTED_ZONE = True
ZONE_SAVE_PATH         = "zone_polygon.json"   # Click-drawn polygon auto-saved here

# Default polygon — overridden at runtime if zone_polygon.json exists
_DEFAULT_POLYGON = np.array([
    [300,  80],
    [630,  80],
    [630, 460],
    [300, 460]
], np.int32)

def _load_polygon():
    """Load polygon from JSON file if it exists, else use default."""
    if os.path.exists(ZONE_SAVE_PATH):
        try:
            with open(ZONE_SAVE_PATH) as f:
                pts = json.load(f)
            poly = np.array(pts, np.int32)
            if len(poly) >= 3:
                print(f"[ZONE] ✓ Loaded saved polygon ({len(poly)} vertices) from '{ZONE_SAVE_PATH}'")
                return poly
        except Exception as e:
            print(f"[ZONE] Could not load saved polygon: {e}")
    print("[ZONE] Using default polygon. Run with --zone to draw your own.")
    return _DEFAULT_POLYGON.copy()

RESTRICTED_POLYGON = _load_polygon()

# Authorized Employee IDs — managed via zone_access_manager.py GUI
# Stored in zone_access.json so changes take effect without restarting
ZONE_ACCESS_PATH = "zone_access.json"

def _load_authorized_ids() -> list[str]:
    """Load authorized employee IDs from zone_access.json (editable via GUI)."""
    if os.path.exists(ZONE_ACCESS_PATH):
        try:
            with open(ZONE_ACCESS_PATH) as f:
                data = json.load(f)
            ids = data.get("authorized_ids", [])
            print(f"[ZONE] ✓ Authorized IDs loaded: {ids}")
            return ids
        except Exception as e:
            print(f"[ZONE] Could not load zone_access.json: {e}")
    print("[ZONE] No zone_access.json found — all employees are UNAUTHORIZED by default.")
    return []

AUTHORIZED_EMP_IDS = _load_authorized_ids()


# ── LOAD PPE MODEL (GPU) ─────────────────────────────────────
print(f"[INIT] Loading PPE detection model on {DEVICE} ...")
if os.path.exists("hansung_ppe.pt"):
    model = YOLO("hansung_ppe.pt")
    model.to(DEVICE)
    print(f"[INIT] PPE Model ('hansung_ppe.pt') -> {DEVICE}")
    print(f"[INIT] PPE Classes: {model.names}")
elif os.path.exists("ppe_best.pt"):
    model = YOLO("ppe_best.pt")
    model.to(DEVICE)
    print(f"[INIT] PPE Model ('ppe_best.pt') -> {DEVICE}")
else:
    print("[WARN] Custom PPE models not found, falling back to yolov8n.pt")
    model = YOLO("yolov8n.pt")
    model.to(DEVICE)
    print(f"[INIT] Fallback PPE Model ('yolov8n.pt') -> {DEVICE}")

# ── LOAD FIRE / SMOKE DETECTION MODEL (GPU) ──────────────────
# SalahALHaismawi/yolov26-fire-detection  (HuggingFace)
# Run fetch_fire_model.py first to download best.pt -> fire_detection.pt
FIRE_MODEL_PATH = "fire_detection.pt"
fire_model = None
if os.path.exists(FIRE_MODEL_PATH):
    try:
        fire_model = YOLO(FIRE_MODEL_PATH)
        fire_model.to(DEVICE)
        print(f"[INIT] Fire/Smoke Model ('{FIRE_MODEL_PATH}') -> {DEVICE}")
        print(f"[INIT] Fire Classes: {fire_model.names}")
    except Exception as _e:
        print(f"[WARN] Could not load fire model: {_e}")
else:
    print("[WARN] fire_detection.pt not found. Run: python fetch_fire_model.py")

# Confidence threshold for fire/smoke — slightly higher to reduce false positives
FIRE_CONF_THRESHOLD = 0.35

# Print VRAM usage after loading all models
if _cuda_ok:
    _used = torch.cuda.memory_allocated(0) / 1024**2
    _res  = torch.cuda.memory_reserved(0)  / 1024**2
    print(f"[GPU] VRAM after model load: {_used:.0f} MB allocated / {_res:.0f} MB reserved")

# ── PPE VIOLATION CLASS MAP ───────────────────────────────────
# Maps YOLO detection labels -> human-readable violation report titles
VIOLATION_CLASSES = {
    # Hansung-Cho model classes (No-Hardhat, No-Mask, No-Safety Vest)
    "no-hardhat":     "No Helmet",
    "no-mask":        "No Face Mask",
    "no-safety vest": "No Safety Vest",

    # 10-Class Multi PPE labels
    "no_helmet":      "No Helmet",
    "no_glove":       "No Gloves",
    "no_goggles":     "No Safety Glasses",
    "no_mask":        "No Face Mask",
    "no_shoes":       "No Safety Boots",

    # Standard format fallback labels
    "no-helmet":      "No Helmet",
    "no hardhat":     "No Helmet",
    "no-vest":        "No Safety Vest",
    "no safety vest": "No Safety Vest",
    "no-gloves":      "No Gloves",
    "no gloves":      "No Gloves",
    "no-glasses":     "No Safety Glasses",
    "no glasses":     "No Safety Glasses",
}

# ── FIRE / SMOKE DETECTION CLASS MAP ─────────────────────────
# SalahALHaismawi/yolov26-fire-detection labels (class 0=fire, class 1=smoke)
FIRE_CLASSES = {
    "fire":  "FIRE DETECTED",
    "smoke": "Smoke Detected",
}

# ── OPENCV LBPH FACE RECOGNIZER ───────────────────────────────
# No TensorFlow needed — uses OpenCV's built-in LBPH algorithm

face_cascade = cv2.CascadeClassifier(
    "haarcascade_frontalface_default.xml"
)
face_recognizer = cv2.face.LBPHFaceRecognizer_create()

# Maps integer label → employee ID
label_to_id: dict[int, str] = {}

def load_registry() -> dict:
    if os.path.exists("employee_registry.json"):
        with open("employee_registry.json", "r") as f:
            return json.load(f)
    return {}

def train_face_recognizer():
    """
    Scans employees/ folder, loads face images, trains LBPH recognizer.
    Re-run automatically every startup.
    """
    global label_to_id
    faces, labels = [], []
    label_idx = 0

    if not os.path.exists(FACE_DB_PATH):
        return False

    for emp_id in os.listdir(FACE_DB_PATH):
        emp_folder = os.path.join(FACE_DB_PATH, emp_id)
        if not os.path.isdir(emp_folder):
            continue

        for img_file in os.listdir(emp_folder):
            img_path = os.path.join(emp_folder, img_file)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            # Detect face in stored photo
            detected = face_cascade.detectMultiScale(img, 1.1, 4)
            if len(detected) > 0:
                for (x, y, w, h) in detected:
                    faces.append(cv2.resize(img[y:y+h, x:x+w], (200, 200)))
                    labels.append(label_idx)
            else:
                # Fallback: use center crop of the image if face detection fails
                h_img, w_img = img.shape
                sz = min(h_img, w_img)
                cy, cx = h_img // 2, w_img // 2
                crop = img[cy - sz//2 : cy + sz//2, cx - sz//2 : cx + sz//2]
                faces.append(cv2.resize(crop, (200, 200)))
                labels.append(label_idx)

        if any(l == label_idx for l in labels):
            label_to_id[label_idx] = emp_id
            label_idx += 1

    if faces:
        face_recognizer.train(faces, np.array(labels))
        print(f"[FACE] Trained on {len(faces)} images for {label_idx} employee(s).")
        return True

    print("[FACE] No enrolled employees found. Persons will show as 'Unidentified'.")
    return False

recognizer_trained = train_face_recognizer()
registry = load_registry()

# ── TEMPORAL FACE VOTING BUFFER ───────────────────────────────
# Buffers last N raw LBPH predictions per face-position cluster.
# Returns the MAJORITY vote — eliminates single-frame flickering.

from collections import deque, Counter

# LBPH confidence is a distance — 0 = perfect, 100+ = no match.
# Keep strict: only accept predictions below 60 to avoid misidentification.
CONF_TIGHT      = 60    # Strict threshold — reject matches with conf >= 60
VOTE_WINDOW     = 12    # Smaller window = faster identity lock-on
VOTE_THRESHOLD  = 0.65  # Require 65% majority to confirm an ID (was 45%)
CLUSTER_RADIUS  = 80    # Pixels — same face if centers within this radius

class FaceVoter:
    """
    Tracks face identities across frames using majority voting.
    Each tracked face keeps a rolling deque of recent raw predictions.
    """
    def __init__(self):
        # List of {center, buffer} for each tracked face
        self._tracks: list[dict] = []

    def _find_track(self, cx: int, cy: int) -> dict | None:
        best, best_dist = None, float("inf")
        for t in self._tracks:
            dx = cx - t["cx"]
            dy = cy - t["cy"]
            d  = (dx*dx + dy*dy) ** 0.5
            if d < CLUSTER_RADIUS and d < best_dist:
                best, best_dist = t, d
        return best

    def update(self, cx: int, cy: int, raw_id: str) -> str:
        """Feed a raw prediction for a face at (cx, cy). Returns smoothed ID."""
        track = self._find_track(cx, cy)
        if track is None:
            track = {"cx": cx, "cy": cy,
                     "buf": deque(maxlen=VOTE_WINDOW),
                     "stable_id": "UNKNOWN"}
            self._tracks.append(track)

        # Update centroid with moving average
        track["cx"] = int(track["cx"] * 0.7 + cx * 0.3)
        track["cy"] = int(track["cy"] * 0.7 + cy * 0.3)
        track["buf"].append(raw_id)

        # Majority vote
        counts  = Counter(track["buf"])
        top_id, top_count = counts.most_common(1)[0]
        fraction = top_count / len(track["buf"])
        if fraction >= VOTE_THRESHOLD:
            track["stable_id"] = top_id
        # else: keep previous stable_id until a clear winner emerges

        return track["stable_id"]

    def prune(self, active_centers: list[tuple[int, int]]):
        """Remove tracks whose face has left the frame."""
        def still_active(t):
            for cx, cy in active_centers:
                dx, dy = cx - t["cx"], cy - t["cy"]
                if (dx*dx + dy*dy) ** 0.5 < CLUSTER_RADIUS * 2:
                    return True
            return False
        self._tracks = [t for t in self._tracks if still_active(t)]


_face_voter = FaceVoter()


def recognize_all_faces(gray_frame) -> list[dict]:
    """
    Detects ALL faces and returns smoothed identities via temporal voting.
    Runs detection on a 50%-scaled frame for speed, then maps coords back.
    Returns list of dicts: {emp_id, emp_name, face_pos, face_rect}
    """
    results = []

    # ── Speed-up: run Haar cascade on 75%-scaled frame ─────────────
    # 75% (not 50%) so distant/small faces are still above minSize threshold.
    # At 50% scale, minSize=(40,40) required 80px face in original — too big for distant people.
    # At 75% scale, minSize=(20,20) catches faces down to ~27px in original (~3-4m away).
    DETECT_SCALE = 0.75
    h_f, w_f = gray_frame.shape
    small = cv2.resize(gray_frame, (int(w_f * DETECT_SCALE), int(h_f * DETECT_SCALE)))

    # scaleFactor=1.1  — finer pyramid = catches more size variations (slightly slower)
    # minNeighbors=3   — less strict = fewer missed detections at distance
    # minSize=(20,20)  — at 75% scale → ~27px minimum face in original frame
    faces_small = face_cascade.detectMultiScale(small, 1.1, 3, minSize=(20, 20))

    # Scale detected rects back to original frame coordinates
    inv = 1.0 / DETECT_SCALE
    if len(faces_small) > 0:
        faces = (faces_small * inv).astype(int)
    else:
        faces = []

    active_centers = []
    for (x, y, w, h) in faces:
        # Clamp to frame bounds
        x  = max(0, x);  y  = max(0, y)
        x2 = min(w_f, x + w);  y2 = min(h_f, y + h)
        w  = x2 - x;  h = y2 - y
        if w < 20 or h < 20:
            continue

        cx, cy = x + w // 2, y + h // 2
        active_centers.append((cx, cy))

        raw_id, raw_name = "UNKNOWN", "Unidentified Person"
        if recognizer_trained:
            try:
                face_roi    = cv2.resize(gray_frame[y:y2, x:x2], (200, 200))
                label, conf = face_recognizer.predict(face_roi)
                # Only accept predictions where recognizer is actually confident
                if conf < CONF_TIGHT:
                    raw_id   = label_to_id.get(label, "UNKNOWN")
                    raw_name = registry.get(raw_id, {}).get("name", "Unidentified Person")
                    print(f"[FACE] Raw match: {raw_id} conf={conf:.1f} (threshold<{CONF_TIGHT})")
                else:
                    print(f"[FACE] Rejected match (conf={conf:.1f} >= {CONF_TIGHT}) — treating as UNKNOWN")
            except Exception as e:
                print(f"[FACE] Predict error: {e}")

        # Apply temporal vote smoothing
        stable_id   = _face_voter.update(cx, cy, raw_id)
        stable_name = registry.get(stable_id, {}).get("name", "Unidentified Person") \
                      if stable_id != "UNKNOWN" else "Unidentified Person"

        if stable_id != "UNKNOWN":
            print(f"[FACE] ✓ Identified: {stable_name} ({stable_id}) [voted]")

        results.append({
            "emp_id":    stable_id,
            "emp_name":  stable_name,
            "face_pos":  (cx, cy),
            "face_rect": (x, y, w, h),
        })

    _face_voter.prune(active_centers)
    return results



# ── POLYGON GEOFENCING HELPERS ───────────────────────────────

def check_geofence(emp_id, face_pos, frame_shape) -> tuple[bool, bool]:
    """
    Returns (is_inside, is_unauthorized_intrusion).
    Only checks the polygon when a face is actually detected.
    Returns (False, False) when no face is in frame.
    """
    if not ENABLE_RESTRICTED_ZONE:
        return False, False

    # ✅ KEY FIX: only check when a face is actually visible
    if face_pos is None:
        return False, False

    pt = (float(face_pos[0]), float(face_pos[1]))

    # OpenCV pointPolygonTest returns >= 0 if inside polygon
    dist = cv2.pointPolygonTest(RESTRICTED_POLYGON, pt, False)
    is_inside = dist >= 0

    if is_inside:
        is_authorized = emp_id != "UNKNOWN" and (emp_id in AUTHORIZED_EMP_IDS or len(AUTHORIZED_EMP_IDS) == 0)
        if not is_authorized:
            return True, True   # Inside AND Unauthorized!
        return True, False      # Inside but Authorized
    return False, False



def draw_polygon_zone(frame, is_intrusion=False, is_authorized=False):
    if not ENABLE_RESTRICTED_ZONE:
        return frame

    # If polygon is full frame or invalid shape, don't fill entire screen
    h_f, w_f = frame.shape[:2]
    
    if is_intrusion:
        color = (0, 0, 230)       # Red for intrusion
    elif is_authorized:
        color = (0, 200, 0)       # Green for authorized entry
    else:
        color = (0, 165, 255)     # Orange/Yellow for normal zone

    # Draw subtle translucent polygon fill (alpha 0.12)
    overlay = frame.copy()
    cv2.fillPoly(overlay, [RESTRICTED_POLYGON], color)
    cv2.addWeighted(overlay, 0.12, frame, 0.88, 0, frame)

    # Draw crisp polygon border
    cv2.polylines(frame, [RESTRICTED_POLYGON], isClosed=True, color=color, thickness=2)

    # Zone badge (text formatted with safe ASCII characters for OpenCV rendering)
    p0 = RESTRICTED_POLYGON[0]
    if is_intrusion:
        badge = "RESTRICTED ZONE - INTRUSION ALERT!"
    elif is_authorized:
        badge = "RESTRICTED ZONE - AUTHORIZED ENTRY"
    else:
        badge = "RESTRICTED ZONE - AUTHORIZED ONLY"

    cv2.rectangle(frame, (p0[0], p0[1] - 22), (p0[0] + len(badge) * 9, p0[1]), color, -1)
    cv2.putText(frame, badge, (p0[0] + 4, p0[1] - 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    return frame

# ── HELPERS ───────────────────────────────────────────────────

def encode_frame(frame) -> str:
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()

def get_violations(boxes, names) -> list[str]:
    seen, out = set(), []
    for box in boxes:
        if float(box[4]) < CONF_THRESHOLD:
            continue
        label = names[int(box[5])].lower().strip()
        if label in IGNORED_CLASSES:
            continue
        v = VIOLATION_CLASSES.get(label)
        if v and v not in seen:
            out.append(v)
            seen.add(v)
    return out

def post_violation(emp_id, emp_name, violations, frame):
    # SIF-based severity scoring
    sif_weights = {
        "Unauthorized Zone Entry": 3, # Critical
        "No Helmet":               3, # Critical (Head injury is fatal)
        "No Safety Vest":          2, # High (Visibility issue)
        "No Face Mask":            1, # Medium (Chemical exposure)
        "No Gloves":               1, # Medium
        "No Safety Glasses":       1, # Medium
        "No Safety Boots":         2, # High
    }
    
    max_score = 0
    for v in violations:
        score = sif_weights.get(v, 1)
        if score > max_score:
            max_score = score
            
    if max_score >= 3:
        severity = "Critical"
    elif max_score == 2:
        severity = "High"
    else:
        severity = "Medium"
    payload = {
        "employeeId":   emp_id,
        "employeeName": emp_name,
        "camera":       CAMERA_LABEL,
        "area":         AREA_LABEL,
        "severity":     severity,
        "violations":   violations,
        "description":  (
            f"Vision AI detected: {', '.join(violations)}. "
            f"Person: {emp_name} ({emp_id}). "
            f"Zone: {AREA_LABEL}. Time: {datetime.now().strftime('%H:%M:%S, %d-%b-%Y')}."
        ),
        "snapshot": encode_frame(frame)
    }
    def _send():
        try:
            r = requests.post(BACKEND_URL, json=payload, timeout=3)
            if r.status_code == 201:
                print(f"[ALERT ✓] {r.json()['reportId']} | {emp_name} | {violations}")
        except Exception as e:
            print(f"[ALERT ✗] Backend unreachable: {e}")
            
    threading.Thread(target=_send, daemon=True).start()

IGNORED_CLASSES = {"person", "machinery", "vehicle", "safety cone"}


def get_fire_detections(boxes, names) -> list[dict]:
    """
    Parse fire model output and return list of fire/smoke detections.
    Each item: {label, human_label, conf, bbox (x1,y1,x2,y2)}
    """
    detections = []
    for box in boxes:
        conf = float(box[4])
        if conf < FIRE_CONF_THRESHOLD:
            continue
        label = names[int(box[5])].lower().strip()
        human = FIRE_CLASSES.get(label)
        if human:
            x1, y1, x2, y2 = map(int, box[:4])
            detections.append({
                "label":       label,
                "human_label": human,
                "conf":        conf,
                "bbox":        (x1, y1, x2, y2),
            })
    return detections


def draw_fire_boxes(frame, fire_detections: list[dict]) -> None:
    """
    Draw bounding boxes for fire (red) and smoke (orange) detections.
    Also paints a red pulsing border around the full frame when fire is present.
    """
    has_fire  = any(d["label"] == "fire"  for d in fire_detections)
    has_smoke = any(d["label"] == "smoke" for d in fire_detections)

    # Full-frame emergency border when fire is detected
    if has_fire:
        h_f, w_f = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w_f - 1, h_f - 1), (0, 0, 255), 6)
        cv2.putText(frame, "!! FIRE ALERT !!",
                    (w_f // 2 - 120, h_f // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
    elif has_smoke:
        h_f, w_f = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w_f - 1, h_f - 1), (0, 120, 255), 4)

    for det in fire_detections:
        x1, y1, x2, y2 = det["bbox"]
        conf           = det["conf"]
        human          = det["human_label"]
        is_fire        = det["label"] == "fire"

        # Fire = bright red, Smoke = dark orange
        color = (0, 0, 240) if is_fire else (0, 120, 255)

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
        tag = f"{human}  {conf:.0%}"
        tw  = len(tag) * 10
        cv2.rectangle(frame, (x1, y1 - 28), (x1 + tw, y1), color, -1)
        cv2.putText(frame, tag, (x1 + 4, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2)


def post_fire_alert(fire_detections: list[dict], frame, emp_id="UNKNOWN", emp_name="Unidentified Person"):
    """Post fire/smoke violations to the backend dashboard."""
    violation_labels = list(dict.fromkeys(d["human_label"] for d in fire_detections))
    has_fire = any(d["label"] == "fire" for d in fire_detections)
    # Fire is always a FATAL / CRITICAL SIF risk
    severity = "Critical" if has_fire else "High"

    payload = {
        "employeeId":   emp_id,
        "employeeName": emp_name,
        "camera":       CAMERA_LABEL,
        "area":         AREA_LABEL,
        "severity":     severity,
        "violations":   violation_labels,
        "description":  (
            f"FIRE/SMOKE ALERT: {', '.join(violation_labels)} detected by Vision AI. "
            f"Zone: {AREA_LABEL}. Time: {datetime.now().strftime('%H:%M:%S, %d-%b-%Y')}."
        ),
        "snapshot": encode_frame(frame)
    }
    def _send():
        try:
            r = requests.post(BACKEND_URL, json=payload, timeout=3)
            if r.status_code == 201:
                print(f"[FIRE ALERT] {r.json()['reportId']} | {violation_labels}")
        except Exception as e:
            print(f"[FIRE ALERT] Backend unreachable: {e}")
            
    threading.Thread(target=_send, daemon=True).start()

def draw_boxes(frame, boxes, names, emp_id, emp_name):
    for box in boxes:
        if float(box[4]) < CONF_THRESHOLD:
            continue
        label = names[int(box[5])].lower().strip()
        if label in IGNORED_CLASSES:
            continue
        x1, y1, x2, y2 = map(int, box[:4])
        is_violation = label in VIOLATION_CLASSES
        color = (0, 0, 220) if is_violation else (0, 200, 0)
        tag = f"{names[int(box[5])]}  {float(box[4]):.0%}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.rectangle(frame, (x1, y1 - 22), (x1 + len(tag) * 9, y1), color, -1)
        cv2.putText(frame, tag, (x1 + 3, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    # Person identity tag
    id_tag = f"  {emp_name}  [{emp_id}]  "
    cv2.rectangle(frame, (8, 68), (8 + len(id_tag) * 9, 92), (20, 20, 20), -1)
    cv2.putText(frame, id_tag, (12, 85),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
    return frame

# ── THREADED CAMERA ───────────────────────────────────────────
class ThreadedCamera:
    """Reads frames in a background thread so the display loop never waits on I/O."""
    def __init__(self, src=0):
        self.src = src
        self.ret = False
        self.frame = None
        self.running = True
        self.is_opened = False
        self._lock = threading.Lock()

        # Initialize in background thread for Windows compatibility
        self.ready_event = threading.Event()
        self.thread = threading.Thread(target=self.update, daemon=True)
        self.thread.start()

        self.ready_event.wait(timeout=4.0)

    def update(self):
        # Force DirectShow to avoid MSMF bugs on Windows
        self.cap = cv2.VideoCapture(self.src, cv2.CAP_DSHOW)

        if self.cap.isOpened():
            self.is_opened = True
            for _ in range(10):  # Warm up
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self._lock:
                        self.ret, self.frame = ret, frame
                    break
                time.sleep(0.05)

        self.ready_event.set()

        while self.running:
            if self.is_opened:
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self._lock:
                        self.ret, self.frame = ret, frame
            time.sleep(0.003)   # ~300 FPS cap read — keeps buffer fresh

        if hasattr(self, 'cap'):
            self.cap.release()

    def read(self):
        with self._lock:
            if self.frame is None:
                return False, None
            return self.ret, self.frame.copy()   # Safe copy to avoid race

    def isOpened(self):
        return self.is_opened

    def release(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)


# ── ASYNC INFERENCE WORKER ────────────────────────────────────
class InferenceWorker:
    """
    Runs PPE + Fire + Face inference on a dedicated background thread.
    The display loop never blocks — it just reads the latest cached results.
    """
    def __init__(self):
        self._lock          = threading.Lock()
        self._running       = True
        self._frame_ready   = threading.Event()  # Set when a new frame is pushed
        self._input_frame   = None

        # Shared output — display loop reads these
        self.cached_boxes    = []
        self.cached_names    = {}
        self.cached_fire     : list[dict] = []
        self.cached_persons  : list[dict] = []
        self.any_intrusion         = False
        self.any_authorized_inside = False
        self.last_alert_t    = {}   # For zone / fire cooldowns

        # "Once per presence" PPE tracking:
        # _reported_ppe[eid] = set of violation strings already sent this session
        # _last_seen[eid]    = timestamp of last time this person was detected
        # When a person is gone for >PRESENCE_TIMEOUT seconds, their violations reset
        # so a new report fires if they return still in violation.
        self._reported_ppe : dict[str, set]   = {}
        self._last_seen    : dict[str, float]  = {}
        self.PRESENCE_TIMEOUT = 90.0  # seconds before a person's violations reset

        self._thread = threading.Thread(target=self._loop, daemon=True, name="InferenceWorker")
        self._thread.start()

    def push_frame(self, frame):
        """Feed a new frame for inference. Non-blocking."""
        with self._lock:
            self._input_frame = frame
        self._frame_ready.set()

    def _loop(self):
        last_tick = 0.0
        while self._running:
            # Wait for a new frame OR for the interval to expire
            self._frame_ready.wait(timeout=INFERENCE_INTERVAL)
            self._frame_ready.clear()

            now = time.time()
            if now - last_tick < INFERENCE_INTERVAL:
                continue   # Throttle to INFERENCE_INTERVAL seconds
            last_tick = now

            with self._lock:
                frame = self._input_frame
            if frame is None:
                continue

            try:
                self._run_inference(frame)
            except Exception as e:
                print(f"[INFERENCE] Error: {e}")

    def _run_inference(self, frame):
        # 1. PPE Detection
        results = model(frame, device=DEVICE, imgsz=INFERENCE_RESIZE,
                        quantize="fp16", verbose=False)
        new_boxes = results[0].boxes.data.cpu().numpy() if results[0].boxes else []
        new_names = results[0].names

        # 2. Fire / Smoke Detection
        new_fire: list[dict] = []
        if fire_model is not None:
            fire_results = fire_model(frame, device=DEVICE, imgsz=INFERENCE_RESIZE,
                                      quantize="fp16", verbose=False)
            fire_boxes = fire_results[0].boxes.data.cpu().numpy() if fire_results[0].boxes else []
            fire_names = fire_results[0].names
            new_fire   = get_fire_detections(fire_boxes, fire_names)
            if new_fire:
                print(f"[FIRE] Detected: {[d['human_label'] for d in new_fire]}")

        # 3. Face Recognition (CPU)
        gray        = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        new_persons = recognize_all_faces(gray)

        # 4. Geofence checks + alerts
        new_intrusion  = False
        new_authorized = False
        for person in new_persons:
            eid   = person["emp_id"]
            ename = person["emp_name"]
            fpos  = person["face_pos"]
            is_inside, is_intrusion = check_geofence(eid, fpos, frame.shape)
            person["is_inside"]    = is_inside
            person["is_intrusion"] = is_intrusion

            if is_intrusion:
                new_intrusion = True
                
                # KEY FIX: Do not send reports for unidentified people
                if eid != "UNKNOWN":
                    # alert_key must NOT include fpos — face position changes
                    # every frame, which breaks the cooldown and causes duplicate alerts.
                    alert_key = f"ZONE_{eid}"
                    if time.time() - self.last_alert_t.get(alert_key, 0) > VIOLATION_COOLDOWN:
                        self.last_alert_t[alert_key] = time.time()
                        print(f"[ZONE ⛔] UNAUTHORIZED INTRUSION — {ename} ({eid})")
                        post_violation(eid, ename, ["Unauthorized Zone Entry"], frame)
                else:
                    print(f"[ZONE ⛔] UNAUTHORIZED INTRUSION — Unidentified Person (Report Ignored)")
            elif is_inside:
                new_authorized = True

            zone_status = "RESTRICTED ⛔" if is_intrusion else ("INSIDE ✅" if is_inside else "OUTSIDE")
            print(f"[VISION] {ename} ({eid}) | Zone={zone_status}")

        # 5. PPE violation alerts — "once per presence" system
        # ---------------------------------------------------
        # Update last-seen timestamps for everyone in frame
        now_t = time.time()
        for person in new_persons:
            self._last_seen[person["emp_id"]] = now_t

        # Clear reported violations for people who left the frame (gone > PRESENCE_TIMEOUT)
        stale = [eid for eid, t in self._last_seen.items()
                 if now_t - t > self.PRESENCE_TIMEOUT]
        for eid in stale:
            self._reported_ppe.pop(eid, None)
            self._last_seen.pop(eid, None)
            print(f"[PPE] Presence reset for {eid} — violations will re-trigger if they return.")

        violations = get_violations(new_boxes, new_names)
        if violations:
            # Try to find a known employee to report the violation
            reporter = next((p for p in new_persons if p["emp_id"] != "UNKNOWN"), None)
            
            if reporter:
                eid_r   = reporter["emp_id"]
                ename_r = reporter["emp_name"]

                already_reported = self._reported_ppe.get(eid_r, set())
                # Only send violations that haven't been reported yet this session
                new_viols = [v for v in violations if v not in already_reported]

                if new_viols:
                    # Mark these as reported so they don't fire again
                    self._reported_ppe[eid_r] = already_reported | set(new_viols)
                    print(f"[PPE 🚨] {ename_r} — NEW violations: {new_viols}")
                    post_violation(eid_r, ename_r, new_viols, frame)
                else:
                    pass  # All violations already reported — suppressed
            elif new_persons:
                print(f"[PPE 🚨] Unidentified Person — NEW violations: {violations} (Report Ignored)")

        # 6. Fire alerts
        if new_fire:
            reporter = next((p for p in new_persons if p["emp_id"] != "UNKNOWN"),
                            new_persons[0] if new_persons else None)
            eid_f  = reporter["emp_id"]   if reporter else "UNKNOWN"
            name_f = reporter["emp_name"] if reporter else "Area Monitor"
            fire_key = "FIRE_ALERT"
            if time.time() - self.last_alert_t.get(fire_key, 0) > VIOLATION_COOLDOWN:
                self.last_alert_t[fire_key] = time.time()
                post_fire_alert(new_fire, frame, eid_f, name_f)

        # Atomically publish results for the display loop
        with self._lock:
            self.cached_boxes          = new_boxes
            self.cached_names          = new_names
            self.cached_fire           = new_fire
            self.cached_persons        = new_persons
            self.any_intrusion         = new_intrusion
            self.any_authorized_inside = new_authorized

    def get_results(self):
        """Returns a snapshot of the latest inference results (non-blocking)."""
        with self._lock:
            return (
                self.cached_boxes,
                self.cached_names,
                self.cached_fire,
                [p.copy() for p in self.cached_persons],
                self.any_intrusion,
                self.any_authorized_inside,
            )

    def stop(self):
        self._running = False
        self._frame_ready.set()


# ── MAIN LOOP ─────────────────────────────────────────────────

def run():
    # Attempt to open configured camera index, fallback to 0 if busy/locked
    cap = None
    target_indices = [CAMERA_INDEX] if CAMERA_INDEX == 0 else [CAMERA_INDEX, 0]

    for idx in target_indices:
        print(f"[INFO] Initializing Camera Index {idx} (Threaded DirectShow)...")
        cap = ThreadedCamera(idx)
        if cap.isOpened():
            break
        else:
            cap.release()

    if not cap or not cap.isOpened():
        print("[ERROR] Could not open any connected webcam. Please check camera USB connection.")
        return

    # Warm up camera sensor & flush initial blank frames
    time.sleep(1.0)
    for _ in range(5):
        cap.read()

    ret_test, frame_test = cap.read()
    if ret_test and frame_test is not None:
        print(f"[VISION] ✓ Camera {idx} connected! Frame shape: {frame_test.shape}")
    else:
        cap.release()
        print(f"[WARN] Camera Index {idx} is locked or unavailable.")
        return

    print("[VISION] ✓ Camera running. Press Q to quit.")
    print(f"[VISION] ✓ Inference interval: {INFERENCE_INTERVAL*1000:.0f} ms | Display: uncapped")
    print("[ZONE] ✓ Multi-person Restricted Zone geofencing is ACTIVE.")

    # ── Start async inference worker ─────────────────────────────
    worker = InferenceWorker()
    # Push the first frame immediately so inference starts right away
    _, first_frame = cap.read()
    if first_frame is not None:
        worker.push_frame(first_frame)

    # ── FPS counter ───────────────────────────────────────────────
    fps_counter  = 0
    fps_display  = 0.0
    fps_timer    = time.time()
    last_push_t  = 0.0

    # ── DISPLAY LOOP — purely rendering, zero inference blocking ──
    while True:
        try:
            ret, frame = cap.read()
        except Exception as e:
            print(f"[WARN] OpenCV read error: {e}. Retrying...")
            time.sleep(0.3)
            continue

        if not ret or frame is None or frame.size == 0:
            time.sleep(0.01)
            continue

        # Push frame to inference worker at INFERENCE_INTERVAL rate
        now = time.time()
        if now - last_push_t >= INFERENCE_INTERVAL:
            worker.push_frame(frame)
            last_push_t = now

        # ── Read latest cached results (non-blocking) ─────────────
        (
            cached_boxes,
            cached_names,
            cached_fire,
            cached_persons,
            any_intrusion,
            any_authorized_inside,
        ) = worker.get_results()

        # ── DRAW FIRE / SMOKE BOXES ───────────────────────────────
        draw_fire_boxes(frame, cached_fire)

        # ── DRAW RESTRICTED ZONE POLYGON ─────────────────────────
        frame = draw_polygon_zone(frame,
                                  is_intrusion=any_intrusion,
                                  is_authorized=(any_authorized_inside and not any_intrusion))

        # ── DRAW PER-PERSON FACE LABELS ───────────────────────────
        for person in cached_persons:
            x, y, w, h   = person["face_rect"]
            eid           = person["emp_id"]
            ename         = person["emp_name"].title()
            is_intrusion  = person.get("is_intrusion", False)
            is_inside     = person.get("is_inside", False)

            fc = (0, 0, 220) if is_intrusion else ((0, 200, 0) if is_inside else (0, 220, 255))
            cv2.rectangle(frame, (x, y), (x + w, y + h), fc, 2)

            if is_intrusion:
                tag = f" [!] {ename} [UNAUTHORIZED]"
            elif is_inside:
                tag = f" [OK] {ename} [AUTHORIZED]"
            else:
                tag = f"  {ename}  [{eid}]  "

            tw = len(tag) * 8
            cv2.rectangle(frame, (x, y - 24), (x + tw, y), fc, -1)
            cv2.putText(frame, tag, (x + 3, y - 7),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1)

        # ── DRAW PPE BOUNDING BOXES ───────────────────────────────
        primary_name = cached_persons[0]["emp_name"] if cached_persons else "Unidentified Person"
        primary_id   = cached_persons[0]["emp_id"]   if cached_persons else "UNKNOWN"
        if cached_boxes is not None and len(cached_boxes) > 0:
            frame = draw_boxes(frame, cached_boxes, cached_names, primary_id, primary_name)
        elif not cached_persons:
            id_tag = "  No Face Detected  "
            cv2.rectangle(frame, (8, 68), (8 + len(id_tag) * 9, 92), (20, 20, 20), -1)
            cv2.putText(frame, id_tag, (12, 85),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 100, 100), 1)

        # ── FPS counter ───────────────────────────────────────────
        fps_counter += 1
        if now - fps_timer >= 1.0:
            fps_display = fps_counter / (now - fps_timer)
            fps_counter = 0
            fps_timer   = now

        # ── STATUS BAR ───────────────────────────────────────────
        ts = datetime.now().strftime("%d-%b-%Y  %H:%M:%S")
        cv2.putText(frame, f"OIL INDIA - Vision Safety Monitor | {ts}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 230, 0), 2)
        cv2.putText(frame, f"Zone: {AREA_LABEL}  |  FPS: {fps_display:.0f}  |  Q = Quit",
                    (10, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 180, 180), 1)

        # ── ZONE OCCUPANCY HUD ────────────────────────────────────
        n_auth   = sum(1 for p in cached_persons if p.get("is_inside") and not p.get("is_intrusion"))
        n_intrus = sum(1 for p in cached_persons if p.get("is_intrusion"))
        total_in = n_auth + n_intrus
        if total_in > 0:
            zone_hud  = f"  ZONE: {total_in} person(s) inside  |  Authorized: {n_auth}  |  UNAUTHORIZED: {n_intrus}  "
            hud_color = (0, 0, 200) if n_intrus > 0 else (0, 160, 0)
            h_fr = frame.shape[0]
            cv2.rectangle(frame, (0, h_fr - 32), (frame.shape[1], h_fr), (20, 20, 20), -1)
            cv2.putText(frame, zone_hud, (8, h_fr - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, hud_color, 1)

        cv2.imshow("Vision Safety Monitor — OIL INDIA (Prototype)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    worker.stop()
    cap.release()
    cv2.destroyAllWindows()
    print("[VISION] Stopped.")

# ── INTERACTIVE POLYGON ZONE EDITOR ──────────────────────────

def define_zone():
    """
    Interactive polygon drawing tool.
    Opens the camera live feed. Click to add polygon vertices.
    Controls:
      LEFT CLICK  — add a point
      RIGHT CLICK — remove last point
      ENTER / S   — save the polygon and exit to main vision loop
      R           — reset / clear all points
      Q / ESC     — quit without saving
    """
    print("\n" + "="*60)
    print("  RESTRICTED ZONE EDITOR")
    print("  LEFT CLICK  : Add polygon vertex")
    print("  RIGHT CLICK : Remove last vertex")
    print("  ENTER / S   : Save polygon & start vision loop")
    print("  R           : Reset (clear all points)")
    print("  Q / ESC     : Quit without saving")
    print("="*60 + "\n")

    points = []
    mouse_pos = [0, 0]

    def on_mouse(event, x, y, flags, param):
        mouse_pos[0], mouse_pos[1] = x, y
        if event == cv2.EVENT_LBUTTONDOWN:
            points.append([x, y])
            print(f"[ZONE EDITOR] Added point {len(points)}: ({x}, {y})")
        elif event == cv2.EVENT_RBUTTONDOWN:
            if points:
                removed = points.pop()
                print(f"[ZONE EDITOR] Removed point: {removed}")

    # Open camera
    cap = None
    for idx in ([CAMERA_INDEX] if CAMERA_INDEX == 0 else [CAMERA_INDEX, 0]):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cap.isOpened() and cap.read()[0]:
            print(f"[ZONE EDITOR] ✓ Camera Index {idx} opened.")
            break
        if cap: cap.release()

    if not cap or not cap.isOpened():
        print("[ZONE EDITOR] ERROR: Could not open camera.")
        return

    WIN = "Zone Editor — Click to Draw Polygon | OIL INDIA"
    cv2.namedWindow(WIN)
    cv2.setMouseCallback(WIN, on_mouse)

    saved = False
    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            continue

        display = frame.copy()
        h, w = display.shape[:2]

        # Draw existing completed polygon fill (translucent)
        if len(points) >= 3:
            overlay = display.copy()
            poly_pts = np.array(points, np.int32)
            cv2.fillPoly(overlay, [poly_pts], (0, 165, 255))
            cv2.addWeighted(overlay, 0.30, display, 0.70, 0, display)
            cv2.polylines(display, [poly_pts], isClosed=True, color=(0, 165, 255), thickness=2)

        # Draw vertex dots + index labels
        for i, pt in enumerate(points):
            cv2.circle(display, tuple(pt), 6, (0, 200, 255), -1)
            cv2.putText(display, str(i + 1), (pt[0] + 8, pt[1] - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1)

        # Live rubber-band line from last point to cursor
        if len(points) >= 1:
            cv2.line(display, tuple(points[-1]), tuple(mouse_pos),
                     (255, 255, 0), 1, cv2.LINE_AA)
            if len(points) >= 3:
                # Close line back to first point
                cv2.line(display, tuple(mouse_pos), tuple(points[0]),
                         (255, 255, 0), 1, cv2.LINE_AA)

        # HUD instructions
        cv2.rectangle(display, (0, 0), (w, 60), (20, 20, 20), -1)
        cv2.putText(display, f"OIL INDIA — Zone Editor  |  Vertices: {len(points)}",
                    (10, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 230, 0), 2)
        status = "LEFT CLICK=Add  |  RIGHT CLICK=Undo  |  ENTER/S=Save  |  R=Reset  |  Q=Quit"
        cv2.putText(display, status, (10, 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1)

        if len(points) < 3:
            cv2.putText(display, "Add at least 3 points to create a zone",
                        (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 165, 255), 1)
        else:
            cv2.putText(display, f"✓ {len(points)} vertices — Press ENTER or S to save",
                        (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 220, 0), 1)

        cv2.imshow(WIN, display)
        key = cv2.waitKey(1) & 0xFF

        if key in (13, ord('s')):   # ENTER or S — save
            if len(points) < 3:
                print("[ZONE EDITOR] Need at least 3 points to save a polygon!")
            else:
                with open(ZONE_SAVE_PATH, 'w') as f:
                    json.dump(points, f)
                print(f"[ZONE EDITOR] ✓ Polygon saved to '{ZONE_SAVE_PATH}' ({len(points)} vertices)")
                saved = True
                break

        elif key == ord('r'):       # R — reset
            print("[ZONE EDITOR] Reset — all points cleared.")
            points.clear()

        elif key in (ord('q'), 27): # Q or ESC — quit
            print("[ZONE EDITOR] Quit without saving.")
            break

    cap.release()
    cv2.destroyAllWindows()

    if saved:
        # Reload polygon into global and launch main loop
        global RESTRICTED_POLYGON
        RESTRICTED_POLYGON = np.array(points, np.int32)
        print("[ZONE EDITOR] Launching Vision Safety Monitor with new zone...\n")
        run()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Vision Safety Monitor")
    parser.add_argument("--zone", action="store_true", help="Launch the polygon zone editor")
    parser.add_argument("--cam", type=int, default=0, help="Camera index to use (default: 0)")
    parser.add_argument("--name", type=str, default="Primary Webcam", help="Camera label (e.g., 'Entry Gate Cam')")
    parser.add_argument("--area", type=str, default="Entry / Main Gate", help="Area label (e.g., 'Warehouse A')")
    
    args = parser.parse_args()
    
    # Update global config variables
    CAMERA_INDEX = args.cam
    CAMERA_LABEL = args.name
    AREA_LABEL = args.area
    
    if args.zone:
        define_zone()
    else:
        run()
