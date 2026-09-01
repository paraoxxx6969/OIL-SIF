# Vision Safety Prototype — Setup & Run Guide

## How It Works

```
Your Laptop Webcam
      │
      ▼  (runs separately, invisible to portal users)
vision_main.py  ──POST violation──▶  vision_backend.py (Flask :5001)
                                              │
                                              │  polled every 5 seconds
                                              ▼
                                    React Safety Portal (Admin Dashboard)
                                    Auto-filed report appears with 🤖 AUTO badge
```

---

## Step 1 — Install Python Dependencies

```bash
cd vision-safety-prototype
pip install -r requirements.txt
```

> First run downloads YOLOv8n model (~6MB) automatically.

---

## Step 2 — Enroll Employees (Optional but Recommended)

Run this once per person to register their face with a unique ID:

```bash
python enroll_employee.py
```

- Enter name & designation
- Press **SPACE** 5 times to capture face photos
- ID like `OIL-EMP-3F2A` is assigned automatically
- If skipped, detected persons show as **"Unidentified Person"**

---

## Step 3 — Start the Flask Backend

Open **Terminal 1**:

```bash
python vision_backend.py
```

You'll see:
```
  Vision Safety Backend  — Running on :5001
  React portal will poll: GET /api/vision/reports
  Vision script posts to: POST /api/vision/report
```

---

## Step 4 — Start the Webcam Detection

Open **Terminal 2**:

```bash
python vision_main.py
```

- Your webcam window opens titled **"Vision Safety Monitor — OIL INDIA (Prototype)"**
- Detection runs every ~1 second
- Violations are sent to Flask → appear in admin dashboard
- Press **Q** to quit

---

## Step 5 — Watch Reports Appear in Admin Dashboard

- Open the Safety Portal: **http://localhost:5173**
- Log in as Admin
- Admin header shows **🤖 Vision AI: LIVE** (green pulsing dot)
- When a violation is detected → a toast notification appears:
  > *"🤖 Vision AI filed 1 new violation report(s) automatically."*
- Go to **All Reports** — the report appears with a purple **🤖 AUTO** badge

---

## Configuration (vision_main.py)

| Setting | Default | Description |
|---------|---------|-------------|
| `CAMERA_INDEX` | `0` | Webcam index (0 = laptop cam) |
| `CAMERA_LABEL` | `Webcam / Laptop Camera` | Camera name in report |
| `AREA_LABEL` | `Entry / Main Gate` | Zone label in report |
| `VIOLATION_COOLDOWN` | `30` seconds | Min gap between repeated alerts per person |
| `FRAME_SKIP` | `30` frames | Detection frequency (~1 per second) |

---

## Folder Structure

```
vision-safety-prototype/
├── vision_backend.py      ← Flask API (run first)
├── vision_main.py         ← Webcam detection script
├── enroll_employee.py     ← Face enrollment tool
├── requirements.txt
├── employees/             ← Face database (auto-created by enrollment)
│   └── OIL-EMP-XXXX/
│       ├── face_1.jpg
│       └── face_2.jpg ...
├── violations/            ← Saved snapshots (future use)
└── auto_reports.json      ← Violation log (auto-created by backend)
```

---

## PPE Detection Model

The prototype uses **`keremberke/yolov8n-hard-hat-detection`** from HuggingFace.
This is a **real pre-trained model** — no simulation.

**Detects (real classes):**
| Detected Label | Violation Filed |
|---------------|----------------|
| `NO-Hardhat` | ❌ No Helmet |
| `Hardhat` | ✅ Compliant |
| `NO-Safety Vest` | ❌ No Safety Vest |
| `Safety Vest` | ✅ Compliant |
| `NO-Gloves` | ❌ No Gloves |
| `NO-Mask` | ❌ No Face Mask |
| `NO-Glasses` | ❌ No Safety Glasses |

The model downloads automatically on first run (~6MB via HuggingFace Hub).

