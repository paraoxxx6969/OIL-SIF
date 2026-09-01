"""
Vision Safety Backend — Flask API
Receives violation reports from the vision detection script
and serves them to the React Safety Portal admin dashboard.
Run: python vision_backend.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow React portal (localhost:5173) to fetch

REPORTS_FILE = "auto_reports.json"

# ── Load / Save helpers ───────────────────────────────────────

def load_reports():
    if os.path.exists(REPORTS_FILE):
        with open(REPORTS_FILE, "r") as f:
            return json.load(f)
    return []

def save_reports(reports):
    with open(REPORTS_FILE, "w") as f:
        json.dump(reports, f, indent=2)

# ── Routes ────────────────────────────────────────────────────

@app.route("/api/vision/report", methods=["POST"])
def receive_violation():
    """Called by the Python vision script when a violation is detected."""
    data = request.json

    report = {
        "id": f"VIS-{uuid.uuid4().hex[:6].upper()}",
        "source": "AUTO-VISION",
        "type": "Unsafe Condition",
        "employeeId": data.get("employeeId", "UNKNOWN"),
        "employeeName": data.get("employeeName", "Unidentified Person"),
        "area": data.get("area", "Camera Zone"),
        "exactLocation": data.get("camera", "Webcam / CCTV"),
        "severity": data.get("severity", "High"),
        "status": "Submitted",
        "description": data.get("description", "PPE violation auto-detected by Vision AI."),
        "violations": data.get("violations", []),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "images": [data.get("snapshot", "")],
        "autoFiled": True
    }

    reports = load_reports()
    reports.insert(0, report)
    save_reports(reports)

    print(f"[VISION] New violation filed: {report['id']} — {report['employeeName']} — {report['violations']}")
    return jsonify({"success": True, "reportId": report["id"]}), 201


@app.route("/api/vision/reports", methods=["GET"])
def get_reports():
    """Called by the React portal to fetch all auto-filed vision reports."""
    return jsonify(load_reports())


@app.route("/api/vision/clear", methods=["DELETE"])
def clear_reports():
    """Dev utility to reset all vision reports."""
    save_reports([])
    return jsonify({"success": True})


@app.route("/api/vision/status", methods=["GET"])
def status():
    reports = load_reports()
    return jsonify({
        "status": "running",
        "totalAutoReports": len(reports),
        "lastReport": reports[0] if reports else None
    })


if __name__ == "__main__":
    print("=" * 50)
    print("  Vision Safety Backend  — Running on :5001")
    print("  React portal will poll: GET /api/vision/reports")
    print("  Vision script posts to: POST /api/vision/report")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5001, debug=False)
