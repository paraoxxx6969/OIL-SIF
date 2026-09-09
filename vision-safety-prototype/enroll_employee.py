"""
Employee Face Enrollment Tool — InsightFace ArcFace
Captures face photos, extracts 512-dim ArcFace embeddings,
stores as .npy files. Far more accurate than LBPH.

Run: python enroll_employee.py
"""

import cv2
import os
import json
import uuid
import numpy as np

FACE_DB_PATH  = "employees"
REGISTRY_FILE = "employee_registry.json"

# ── Load InsightFace ──────────────────────────────────────────
try:
    import insightface
    from insightface.app import FaceAnalysis
    _app = FaceAnalysis(name="buffalo_sc",   # lightweight: det + recog only
                        providers=["CUDAExecutionProvider",
                                   "CPUExecutionProvider"])
    _app.prepare(ctx_id=0, det_size=(320, 320))
    print("[ENROLL] InsightFace ArcFace loaded (GPU).")
    USE_ARCFACE = True
except Exception as e:
    print(f"[ENROLL] InsightFace not available ({e}). Falling back to LBPH Haar.")
    USE_ARCFACE = False
    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")


def load_registry():
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            return json.load(f)
    return {}


def save_registry(reg):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(reg, f, indent=2)


def detect_faces_arcface(frame):
    """Returns list of InsightFace face objects detected in frame."""
    faces = _app.get(frame)
    return faces


def enroll():
    registry = load_registry()

    print("\n" + "="*50)
    print("  OIL INDIA — Employee Face Enrollment Tool")
    if USE_ARCFACE:
        print("  Mode: ArcFace Deep Learning (HIGH ACCURACY)")
    else:
        print("  Mode: LBPH (Legacy Fallback)")
    print("="*50)
    name        = input("Enter Employee Full Name   : ").strip()
    designation = input("Enter Designation          : ").strip()

    emp_id = f"OIL-EMP-{uuid.uuid4().hex[:4].upper()}"
    print(f"\n[ID ASSIGNED] {emp_id}")

    folder = os.path.join(FACE_DB_PATH, emp_id)
    os.makedirs(folder, exist_ok=True)

    cam_choice = input("Enter Camera Index (0 for Built-in, 1 for External) [Default 0]: ").strip()
    cam_idx = int(cam_choice) if cam_choice.isdigit() else 0

    cap = cv2.VideoCapture(cam_idx, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"[ERROR] Cannot access camera index {cam_idx}. Trying fallback...")
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("[ERROR] Cannot access webcam.")
            return

    print("\n[CAM] Webcam ready.")
    if USE_ARCFACE:
        print("ArcFace will auto-detect your face — no need to be very close.")
    print("Press SPACE to capture each photo. Press Q to cancel.\n")

    poses = [
        "Look STRAIGHT (Front)",
        "Turn face slightly LEFT",
        "Turn face slightly RIGHT",
        "Tilt face slightly UP",
        "Tilt face slightly DOWN"
    ]

    embeddings = []   # For ArcFace: store embedding vectors
    captured   = 0

    while captured < 5:
        ret, frame = cap.read()
        if not ret:
            break

        display = frame.copy()
        face_found = False

        if USE_ARCFACE:
            faces = detect_faces_arcface(frame)
            for face in faces:
                box = face.bbox.astype(int)
                x1, y1, x2, y2 = box
                cv2.rectangle(display, (x1, y1), (x2, y2), (0, 220, 0), 2)
                # Show confidence
                det_score = f"{face.det_score:.2f}"
                cv2.putText(display, f"Face ({det_score})",
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 0), 1)
            face_found = len(faces) > 0
        else:
            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(60, 60))
            for (x, y, w, h) in faces:
                cv2.rectangle(display, (x, y), (x+w, y+h), (0, 220, 0), 2)
            face_found = len(faces) > 0

        # HUD
        cv2.putText(display, f"Enrolling: {name} [{emp_id}]",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        current_pose = poses[captured]
        cv2.putText(display, f"POSE {captured+1}/5: {current_pose}",
                    (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.65,
                    (0, 255, 0) if face_found else (0, 120, 255), 2)
        cv2.putText(display, "SPACE = Capture  |  Q = Cancel",
                    (10, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        status_text = "Face detected ✓" if face_found else "No face — adjust position / lighting"
        cv2.putText(display, status_text, (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (0, 255, 0) if face_found else (0, 0, 255), 1)

        if USE_ARCFACE:
            cv2.putText(display, "ArcFace Mode — High Accuracy",
                        (10, display.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX,
                        0.45, (255, 200, 0), 1)

        cv2.imshow("Face Enrollment — OIL INDIA", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(" "):
            if not face_found:
                print("  [SKIP] No face detected. Please adjust your angle/lighting.")
                continue

            # Save raw image
            img_path = os.path.join(folder, f"face_{captured+1}.jpg")
            cv2.imwrite(img_path, frame)

            if USE_ARCFACE:
                # Extract and save ArcFace embedding (512-dim float32 vector)
                best_face = max(faces, key=lambda f: f.det_score)
                emb = best_face.normed_embedding   # Already L2-normalized
                emb_path = os.path.join(folder, f"embedding_{captured+1}.npy")
                np.save(emb_path, emb)
                embeddings.append(emb)
                print(f"  [SAVED] Photo {captured+1}/5 ({current_pose}) + ArcFace embedding → {folder}/")
            else:
                print(f"  [SAVED] Photo {captured+1}/5 ({current_pose}) → {img_path}")

            captured += 1

        elif key == ord("q"):
            print("[CANCELLED]")
            cap.release()
            cv2.destroyAllWindows()
            return

    cap.release()
    cv2.destroyAllWindows()

    if captured < 5:
        print(f"\n[ERROR] Enrollment failed. Only captured {captured}/5 photos.")
        try:
            import shutil
            shutil.rmtree(folder)
        except Exception:
            pass
        return

    # Save mean embedding (average of all 5 poses = more robust)
    if USE_ARCFACE and embeddings:
        mean_emb = np.mean(np.stack(embeddings), axis=0)
        # Re-normalize the mean
        mean_emb = mean_emb / np.linalg.norm(mean_emb)
        mean_path = os.path.join(folder, "mean_embedding.npy")
        np.save(mean_path, mean_emb)
        print(f"\n[✓] Mean ArcFace embedding saved → {mean_path}")

    registry[emp_id] = {"name": name, "designation": designation}
    save_registry(registry)

    print(f"\n[✓] Enrollment complete!")
    print(f"    Employee ID  : {emp_id}")
    print(f"    Name         : {name}")
    print(f"    Designation  : {designation}")
    print(f"    Photos saved : {folder}/")
    print(f"    Mode         : {'ArcFace deep embeddings' if USE_ARCFACE else 'LBPH (legacy)'}")
    print("\nRestart vision_main.py to load the new employee.")


if __name__ == "__main__":
    enroll()
