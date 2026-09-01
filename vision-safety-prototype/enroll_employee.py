"""
Employee Face Enrollment Tool — OpenCV LBPH (No TensorFlow required)
Captures face photos from webcam, saves to employees/ folder,
assigns unique OIL-EMP-XXXX ID.

Run: python enroll_employee.py
"""

import cv2
import os
import json
import uuid

FACE_DB_PATH   = "employees"
REGISTRY_FILE  = "employee_registry.json"

face_cascade = cv2.CascadeClassifier(
    "haarcascade_frontalface_default.xml"
)

def load_registry():
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            return json.load(f)
    return {}

def save_registry(reg):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(reg, f, indent=2)

def enroll():
    registry = load_registry()

    print("\n" + "="*50)
    print("  OIL INDIA — Employee Face Enrollment Tool")
    print("="*50)
    name        = input("Enter Employee Full Name   : ").strip()
    designation = input("Enter Designation          : ").strip()

    emp_id = f"OIL-EMP-{uuid.uuid4().hex[:4].upper()}"
    print(f"\n[ID ASSIGNED] {emp_id}")

    folder = os.path.join(FACE_DB_PATH, emp_id)
    os.makedirs(folder, exist_ok=True)

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[ERROR] Cannot access webcam.")
        return

    print("\n[CAM] Webcam ready.")
    print("Look at the camera — face must be detected (green box shown).")
    print("Press SPACE to capture each photo (need 5). Press Q to cancel.\n")

    captured = 0
    while captured < 5:
        ret, frame = cap.read()
        if not ret:
            break

        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(80, 80))

        display = frame.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(display, (x, y), (x+w, y+h), (0, 220, 0), 2)

        cv2.putText(display, f"Enrolling: {name} [{emp_id}]",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        cv2.putText(display, f"Photos: {captured}/5  |  SPACE = Capture  |  Q = Cancel",
                    (10, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.putText(display,
                    "Face detected ✓" if len(faces) > 0 else "No face detected — move closer",
                    (10, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (0, 255, 0) if len(faces) > 0 else (0, 0, 255), 1)

        cv2.imshow("Face Enrollment — OIL INDIA", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(" "):
            if len(faces) == 0:
                print("  [SKIP] No face detected. Please face the camera.")
                continue
            path = os.path.join(folder, f"face_{captured+1}.jpg")
            cv2.imwrite(path, frame)
            captured += 1
            print(f"  [SAVED] Photo {captured}/5 → {path}")

        elif key == ord("q"):
            print("[CANCELLED]")
            cap.release()
            cv2.destroyAllWindows()
            return

    cap.release()
    cv2.destroyAllWindows()

    if captured < 5:
        print(f"\n[ERROR] Enrollment failed. Only captured {captured}/5 photos.")
        # Clean up empty folder
        try:
            os.rmdir(folder)
        except Exception:
            pass
        return

    registry[emp_id] = {"name": name, "designation": designation}
    save_registry(registry)

    print(f"\n[✓] Enrollment complete!")
    print(f"    Employee ID  : {emp_id}")
    print(f"    Name         : {name}")
    print(f"    Designation  : {designation}")
    print(f"    Photos saved : {folder}/")
    print("\nRestart vision_main.py to load the new employee.")

if __name__ == "__main__":
    enroll()
