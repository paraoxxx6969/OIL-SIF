# OIL-SIF — Safety Integrated Framework
# OIL India Safety Integrated Framework

A complete industrial safety management system for OIL India consisting of:

1. **Safety Portal** — React-based web application for reporting, tracking, and managing safety incidents.
2. **Vision AI System** — Python-based CCTV/webcam PPE detection and face recognition system that auto-files violation reports to the portal.

---

## Project Structure

```
OIL-SIF/
├── oil-india-safety-reporting/    ← React Safety Portal
└── vision-safety-prototype/       ← Python Vision AI System
```

---

## Safety Portal

A multilingual (English, Hindi, Marathi, Bengali) safety reporting web application.

### Features
- Employee & Admin dashboards
- UC/UE incident reporting with voice-to-text
- Area-wise risk matrix & plant safety overview
- Real-time PPE violation reports from Vision AI (🤖 AUTO badge)
- Vision AI live status indicator in admin header

### Run
```bash
cd oil-india-safety-reporting
npm install
npm run dev
```
Opens at: http://localhost:5173

---

## Vision AI System

Standalone Python system that uses your webcam to detect PPE violations and auto-files reports to the admin dashboard.

### Features
- Real-time person detection using YOLOv8
- Employee face recognition using OpenCV LBPH (No TensorFlow needed)
- Automatic violation report filing via Flask API
- Multi-employee enrollment tool

### Setup
```bash
cd vision-safety-prototype
pip install -r requirements.txt
```

### Run
```bash
# Terminal 1 — Start API
python vision_backend.py

# Terminal 2 — Start webcam monitor
python vision_main.py

# Enroll new employee faces
python enroll_employee.py
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Vanilla CSS |
| PPE Detection | YOLOv8 (Ultralytics) |
| Face Recognition | OpenCV LBPH |
| Vision Backend | Flask |
| Multilingual | Custom TRANSLATIONS dictionary |
| Voice Input | Web Speech API |
