import cv2
import time

def test_cameras():
    print("=" * 60)
    print("  Testing Connected Webcams...")
    print("=" * 60)

    for index in range(4):
        print(f"\n--- Testing Camera Index {index} ---")
        
        # Try MSMF / Default backend
        cap = cv2.VideoCapture(index, cv2.CAP_MSMF)
        backend_used = "MSMF"
        if not cap.isOpened():
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            backend_used = "DSHOW"

        if cap.isOpened():
            for _ in range(5):
                ret, frame = cap.read()
                time.sleep(0.1)

            if ret and frame is not None and frame.size > 0:
                h, w, _ = frame.shape
                filename = f"cam_test_index_{index}.jpg"
                cv2.imwrite(filename, frame)
                print(f"  [SUCCESS] Camera {index} WORKING! (Backend: {backend_used})")
                print(f"            Resolution: {w}x{h}")
                print(f"            Saved frame: {filename}")
            else:
                print(f"  [FAILED] Camera {index} opened with {backend_used} but could not grab frames.")
            cap.release()
        else:
            print(f"  [OFFLINE] Camera {index} not accessible.")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_cameras()
