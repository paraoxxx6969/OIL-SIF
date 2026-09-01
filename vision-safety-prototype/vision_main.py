"""
Vision Safety Main Script — Webcam PPE Detection + Face Recognition
Uses: keremberke/yolov8n-hard-hat-detection (HuggingFace) + OpenCV LBPH Face Recognizer

Compatible with Python 3.14 — no TensorFlow required.

Run:
  1. python vision_backend.py   (Terminal 1)
  2. python vision_main.py      (Terminal 2)
"""

import cv2
import time
import base64
import requests
import os
import json
import numpy as np
from datetime import datetime
from ultralytics import YOLO

# ── CONFIG ────────────────────────────────────────────────────
BACKEND_URL        = "http://localhost:5001/api/vision/report"
FACE_DB_PATH       = "employees"
CAMERA_INDEX       = 0
CAMERA_LABEL       = "Webcam / Laptop Camera"
AREA_LABEL         = "Entry / Main Gate"
VIOLATION_COOLDOWN = 30      # seconds between repeated alerts per person
FRAME_SKIP         = 20      # run detection every N frames
CONF_THRESHOLD     = 0.45    # minimum YOLO confidence

# ── LOAD PPE MODEL ────────────────────────────────────────────
print("[INIT] Loading PPE detection model from HuggingFace...")
print("[INIT] First run will download ~6MB — please wait...")
try:
    model = YOLO("keremberke/yolov8n-hard-hat-detection")
    print(f"[INIT] ✓ PPE model loaded.")
    print(f"[INIT] Classes: {list(model.names.values())}")
except Exception as e:
    print(f"[WARN] HuggingFace model failed ({e}), using yolov8n.pt instead")
    model = YOLO("yolov8n.pt")

# ── PPE VIOLATION CLASS MAP ───────────────────────────────────
VIOLATION_CLASSES = {
    "no-hardhat":     "No Helmet",
    "no-helmet":      "No Helmet",
    "no hardhat":     "No Helmet",
    "no-safety vest": "No Safety Vest",
    "no-vest":        "No Safety Vest",
    "no safety vest": "No Safety Vest",
    "no-gloves":      "No Gloves",
    "no gloves":      "No Gloves",
    "no-mask":        "No Face Mask",
    "no mask":        "No Face Mask",
    "no-glasses":     "No Safety Glasses",
    "no glasses":     "No Safety Glasses",
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

def recognize_face_in_frame(gray_frame) -> tuple[str, str]:
    """
    Returns (employee_id, employee_name) using OpenCV LBPH.
    Falls back to UNKNOWN if not trained or no match.
    """
    if not recognizer_trained:
        return "UNKNOWN", "Unidentified Person"

    faces = face_cascade.detectMultiScale(gray_frame, 1.1, 5, minSize=(60, 60))
    for (x, y, w, h) in faces:
        face_roi = cv2.resize(gray_frame[y:y+h, x:x+w], (200, 200))
        try:
            label, confidence = face_recognizer.predict(face_roi)
            emp_id = label_to_id.get(label, "UNKNOWN")
            emp_name = registry.get(emp_id, {}).get("name", emp_id)
            print(f"[FACE] Match candidate: {emp_name} | Confidence: {confidence:.1f} (Threshold: < 125)")
            if confidence < 125:   # LBPH distance threshold (lower is closer/better match)
                return emp_id, emp_name
        except Exception as e:
            print(f"[FACE] Error predicting: {e}")

    return "UNKNOWN", "Unidentified Person"

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
        v = VIOLATION_CLASSES.get(label)
        if v and v not in seen:
            out.append(v)
            seen.add(v)
    return out

def post_violation(emp_id, emp_name, violations, frame):
    severity = "Critical" if len(violations) >= 2 else "High"
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
    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=3)
        if r.status_code == 201:
            print(f"[ALERT ✓] {r.json()['reportId']} | {emp_name} | {violations}")
    except Exception as e:
        print(f"[ALERT ✗] Backend unreachable: {e}")

def draw_boxes(frame, boxes, names, emp_id, emp_name):
    for box in boxes:
        if float(box[4]) < CONF_THRESHOLD:
            continue
        x1, y1, x2, y2 = map(int, box[:4])
        label = names[int(box[5])].lower().strip()
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

# ── MAIN LOOP ─────────────────────────────────────────────────

def run():
    frame_count  = 0
    last_alert_t = {}
    emp_id, emp_name = "UNKNOWN", "Unidentified Person"
    cached_boxes, cached_names = [], {}

    # DirectShow works best on Windows to avoid MSMF errors
    print("[INFO] Initializing camera with DirectShow backend...")
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    if not cap.isOpened():
        print("[WARN] DirectShow failed. Trying default camera backend...")
        cap.release()
        cap = cv2.VideoCapture(CAMERA_INDEX)

    if not cap.isOpened():
        print("[ERROR] Cannot open webcam. Check CAMERA_INDEX in config.")
        return

    print("[VISION] ✓ Camera running. Press Q to quit.")

    while True:
        try:
            ret, frame = cap.read()
        except Exception as e:
            print(f"[WARN] OpenCV read error: {e}. Retrying...")
            time.sleep(0.5)
            continue

        if not ret or frame is None or frame.size == 0:
            print("[WARN] Empty or corrupt frame grabbed.")
            continue

        frame_count += 1

        if frame_count % FRAME_SKIP == 0:
            # 1. PPE Detection (real model)
            results = model(frame, verbose=False)
            cached_boxes = results[0].boxes.data.cpu().numpy() if results[0].boxes else []
            cached_names = results[0].names

            # 2. Face Recognition (OpenCV LBPH)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            emp_id, emp_name = recognize_face_in_frame(gray)

            # 3. Check violations
            violations = get_violations(cached_boxes, cached_names)
            
            print(f"[VISION] Processing: Face detected as '{emp_name}' ({emp_id}) | Violations: {violations if violations else 'None'}")

            # 4. Fire alert with cooldown
            if violations:
                if time.time() - last_alert_t.get(emp_id, 0) > VIOLATION_COOLDOWN:
                    last_alert_t[emp_id] = time.time()
                    post_violation(emp_id, emp_name, violations, frame)

        # Draw bounding boxes from cached detections
        if cached_boxes is not None and len(cached_boxes) > 0:
            frame = draw_boxes(frame, cached_boxes, cached_names, emp_id, emp_name)
        else:
            # Always draw the identity tag even if no boxes are detected
            id_tag = f"  {emp_name}  [{emp_id}]  "
            cv2.rectangle(frame, (8, 68), (8 + len(id_tag) * 9, 92), (20, 20, 20), -1)
            cv2.putText(frame, id_tag, (12, 85),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)

        # Status bar
        ts = datetime.now().strftime("%d-%b-%Y  %H:%M:%S")
        cv2.putText(frame, f"OIL INDIA — Vision Safety Monitor | {ts}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 230, 0), 2)
        cv2.putText(frame, f"Zone: {AREA_LABEL}  |  Q = Quit",
                    (10, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 180, 180), 1)

        cv2.imshow("Vision Safety Monitor — OIL INDIA (Prototype)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[VISION] Stopped.")

if __name__ == "__main__":
    run()
