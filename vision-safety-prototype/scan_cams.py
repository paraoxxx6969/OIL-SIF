import cv2
import time

print("Scanning all camera indices 0 through 6...")
for i in range(7):
    cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret and frame is not None:
            fn = f"cam_index_{i}.jpg"
            cv2.imwrite(fn, frame)
            print(f"Camera Index {i}: OPENED OK -> Saved snapshot '{fn}'")
        else:
            print(f"Camera Index {i}: OPENED but blank/failed")
        cap.release()
    else:
        print(f"Camera Index {i}: Not accessible")
