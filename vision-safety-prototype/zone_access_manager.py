"""
Zone Access Manager — OIL INDIA Vision Safety System
=====================================================
A Tkinter GUI to manage which employees are authorized
to enter the Restricted Zone monitored by vision_main.py.

Saves changes to zone_access.json which vision_main.py reads at startup.

Run:
    python zone_access_manager.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import datetime

# ── PATHS ────────────────────────────────────────────────────────
REGISTRY_PATH   = "employee_registry.json"
ACCESS_PATH     = "zone_access.json"

# ── COLORS ───────────────────────────────────────────────────────
BG_DARK    = "#0D1B2A"
BG_MID     = "#1B2A3B"
BG_CARD    = "#1E3250"
ACCENT     = "#F5A623"
ACCENT2    = "#2ECC71"
RED        = "#E74C3C"
TEXT_MAIN  = "#F0F4F8"
TEXT_SUB   = "#8FA3B1"
BORDER     = "#2C4A6E"

# ── DATA HELPERS ─────────────────────────────────────────────────

def load_registry() -> dict:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH) as f:
            return json.load(f)
    return {}

def load_authorized_ids() -> list[str]:
    if os.path.exists(ACCESS_PATH):
        try:
            with open(ACCESS_PATH) as f:
                data = json.load(f)
            return data.get("authorized_ids", [])
        except Exception:
            return []
    return []

def save_authorized_ids(ids: list[str]) -> None:
    data = {
        "authorized_ids": ids,
        "last_updated": datetime.now().isoformat(),
        "updated_by": "Zone Access Manager GUI"
    }
    with open(ACCESS_PATH, "w") as f:
        json.dump(data, f, indent=2)

# ── MAIN APP ─────────────────────────────────────────────────────

class ZoneAccessManager(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("OIL INDIA — Restricted Zone Access Manager")
        self.geometry("780x560")
        self.resizable(False, False)
        self.configure(bg=BG_DARK)

        # State
        self.registry       = load_registry()
        self.authorized_ids = set(load_authorized_ids())
        self.checkboxes: dict[str, tk.BooleanVar] = {}

        self._build_ui()
        self._populate_table()
        self._update_summary()

    # ── UI BUILD ─────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = tk.Frame(self, bg=BG_MID, height=70)
        hdr.pack(fill="x")
        tk.Label(hdr, text="🔒  RESTRICTED ZONE ACCESS MANAGER",
                 bg=BG_MID, fg=ACCENT,
                 font=("Segoe UI", 16, "bold")).pack(side="left", padx=20, pady=18)

        self._status_lbl = tk.Label(hdr, text="", bg=BG_MID,
                                    fg=ACCENT2, font=("Segoe UI", 10))
        self._status_lbl.pack(side="right", padx=20)

        # Sub-header info bar
        info = tk.Frame(self, bg=BG_CARD, height=36)
        info.pack(fill="x")
        tk.Label(info,
                 text="  Grant or revoke each employee's access to the Restricted Zone. "
                       "Changes are saved immediately and loaded on next vision_main.py run.",
                 bg=BG_CARD, fg=TEXT_SUB, font=("Segoe UI", 9)).pack(side="left", pady=8, padx=8)

        # Reload button
        tk.Button(info, text="↺ Reload", bg=BG_CARD, fg=ACCENT,
                  relief="flat", font=("Segoe UI", 9, "bold"),
                  cursor="hand2", activebackground=BG_CARD, activeforeground=ACCENT2,
                  command=self._reload).pack(side="right", padx=12, pady=4)

        # Table frame
        table_frame = tk.Frame(self, bg=BG_DARK)
        table_frame.pack(fill="both", expand=True, padx=20, pady=(16, 0))

        # Column headers
        cols = tk.Frame(table_frame, bg=BG_MID)
        cols.pack(fill="x", pady=(0, 2))
        headers = [("ACCESS", 80), ("EMP ID", 140), ("NAME", 180), ("DESIGNATION", 180), ("STATUS", 120)]
        for h, w in headers:
            tk.Label(cols, text=h, bg=BG_MID, fg=TEXT_SUB,
                     font=("Segoe UI", 9, "bold"),
                     width=w // 8, anchor="w").pack(side="left", padx=6, pady=6)

        # Scrollable area
        canvas = tk.Canvas(table_frame, bg=BG_DARK, highlightthickness=0)
        scroll = tk.Scrollbar(table_frame, orient="vertical", command=canvas.yview)
        self._scroll_frame = tk.Frame(canvas, bg=BG_DARK)
        self._scroll_frame.bind("<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self._scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        canvas.bind_all("<MouseWheel>",
            lambda e: canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"))

        # Divider
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x", padx=20, pady=(8, 0))

        # Bottom controls
        bottom = tk.Frame(self, bg=BG_DARK)
        bottom.pack(fill="x", padx=20, pady=12)

        self._summary_lbl = tk.Label(bottom, text="", bg=BG_DARK,
                                     fg=TEXT_SUB, font=("Segoe UI", 10))
        self._summary_lbl.pack(side="left")

        # Bulk buttons
        btn_frame = tk.Frame(bottom, bg=BG_DARK)
        btn_frame.pack(side="right")

        tk.Button(btn_frame, text="✅  Grant All", bg=ACCENT2, fg="white",
                  font=("Segoe UI", 10, "bold"), relief="flat", padx=14, pady=6,
                  cursor="hand2", activebackground="#27AE60",
                  command=self._grant_all).pack(side="left", padx=(0, 8))

        tk.Button(btn_frame, text="⛔  Revoke All", bg=RED, fg="white",
                  font=("Segoe UI", 10, "bold"), relief="flat", padx=14, pady=6,
                  cursor="hand2", activebackground="#C0392B",
                  command=self._revoke_all).pack(side="left", padx=(0, 8))

        tk.Button(btn_frame, text="💾  Save Changes", bg=ACCENT, fg=BG_DARK,
                  font=("Segoe UI", 10, "bold"), relief="flat", padx=14, pady=6,
                  cursor="hand2", activebackground="#D4901F",
                  command=self._save).pack(side="left")

    # ── TABLE POPULATION ─────────────────────────────────────────

    def _populate_table(self):
        for widget in self._scroll_frame.winfo_children():
            widget.destroy()
        self.checkboxes.clear()

        for i, (emp_id, info) in enumerate(self.registry.items()):
            is_authorized = emp_id in self.authorized_ids
            var = tk.BooleanVar(value=is_authorized)
            self.checkboxes[emp_id] = var

            row_bg = BG_CARD if i % 2 == 0 else BG_MID
            row = tk.Frame(self._scroll_frame, bg=row_bg)
            row.pack(fill="x", pady=1)

            # Checkbox
            chk = tk.Checkbutton(row, variable=var, bg=row_bg,
                                  activebackground=row_bg,
                                  selectcolor=BG_DARK,
                                  command=self._update_summary)
            chk.pack(side="left", padx=(14, 0), pady=8)

            # Employee ID
            tk.Label(row, text=emp_id, bg=row_bg, fg=ACCENT,
                     font=("Consolas", 10, "bold"), width=15,
                     anchor="w").pack(side="left", padx=6)

            # Name
            name = info.get("name", "—").title()
            tk.Label(row, text=name, bg=row_bg, fg=TEXT_MAIN,
                     font=("Segoe UI", 10), width=20,
                     anchor="w").pack(side="left", padx=6)

            # Designation
            desig = info.get("designation", "—").title()
            tk.Label(row, text=desig, bg=row_bg, fg=TEXT_SUB,
                     font=("Segoe UI", 10), width=20,
                     anchor="w").pack(side="left", padx=6)

            # Status badge
            status_text = "✅ AUTHORIZED" if is_authorized else "⛔ RESTRICTED"
            status_color = ACCENT2 if is_authorized else RED
            status_lbl = tk.Label(row, text=status_text, bg=row_bg, fg=status_color,
                                   font=("Segoe UI", 9, "bold"), width=14, anchor="w")
            status_lbl.pack(side="left", padx=6)

            # Update status badge dynamically when checkbox toggled
            def _make_updater(lbl, v):
                def _update(*_):
                    if v.get():
                        lbl.config(text="✅ AUTHORIZED", fg=ACCENT2)
                    else:
                        lbl.config(text="⛔ RESTRICTED", fg=RED)
                return _update
            var.trace_add("write", _make_updater(status_lbl, var))

    # ── ACTIONS ──────────────────────────────────────────────────

    def _grant_all(self):
        for var in self.checkboxes.values():
            var.set(True)
        self._update_summary()

    def _revoke_all(self):
        for var in self.checkboxes.values():
            var.set(False)
        self._update_summary()

    def _save(self):
        authorized = [eid for eid, var in self.checkboxes.items() if var.get()]
        save_authorized_ids(authorized)
        self.authorized_ids = set(authorized)
        self._status_lbl.config(
            text=f"✓ Saved at {datetime.now().strftime('%H:%M:%S')}",
            fg=ACCENT2)
        self._populate_table()
        self._update_summary()
        messagebox.showinfo(
            "Saved",
            f"Zone access updated!\n\n"
            f"✅ Authorized: {len(authorized)} employee(s)\n"
            f"⛔ Restricted: {len(self.checkboxes) - len(authorized)} employee(s)\n\n"
            f"Restart vision_main.py to apply."
        )

    def _reload(self):
        self.registry       = load_registry()
        self.authorized_ids = set(load_authorized_ids())
        self._populate_table()
        self._update_summary()
        self._status_lbl.config(
            text=f"↺ Reloaded at {datetime.now().strftime('%H:%M:%S')}",
            fg=ACCENT)

    def _update_summary(self):
        total   = len(self.checkboxes)
        granted = sum(1 for v in self.checkboxes.values() if v.get())
        self._summary_lbl.config(
            text=f"Total Employees: {total}   |   "
                 f"✅ Authorized: {granted}   |   "
                 f"⛔ Restricted: {total - granted}")

# ── ENTRY ────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = ZoneAccessManager()
    app.mainloop()
