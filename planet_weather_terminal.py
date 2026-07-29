"""
PLANET WEATHER TERMINAL - Demo Phase 1 (UI Only)
Retro sci-fi CRT terminal UI built with PySide6.

Run:
    python planet_weather_terminal.py

Requires:
    pip install PySide6
"""

import sys
import math
import random

from PySide6.QtCore import (
    Qt, QTimer, QPointF, QRectF, QPropertyAnimation, QEasingCurve,
    Property, Signal
)
from PySide6.QtGui import (
    QPainter, QColor, QRadialGradient, QLinearGradient, QFont,
    QPen, QBrush, QPainterPath, QFontDatabase
)
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QGraphicsDropShadowEffect, QSizePolicy
)

WINDOW_W = 760
WINDOW_H = 900

# --------------------------------------------------------------------------
# PLANET DATA
# --------------------------------------------------------------------------

PLANETS = {
    "MERCURY": {
        "color": QColor(150, 150, 155),
        "highlight": QColor(210, 210, 215),
        "ring": False,
        "texture": "rock",
        "temp_min": -30, "temp_max": 90, "temp": "-173 / 427 C",
        "wind": "0 km/h",
        "press": "0 atm",
        "storm": "Solar Flare",
        "atm": "Exosphere (Na, K, O)",
        "surf": "Cratered regolith",
        "log": "Scorched dayside, frozen nightside, no atmosphere shield",
        "status": "READY",
    },
    "VENUS": {
        "color": QColor(210, 190, 110),
        "highlight": QColor(240, 225, 170),
        "ring": False,
        "texture": "cloud",
        "temp_min": 88, "temp_max": 92, "temp": "462 / 462 C",
        "wind": "360 km/h",
        "press": "92 atm",
        "storm": "Sulfuric Haze",
        "atm": "CO2, N2, dense clouds",
        "surf": "Volcanic plains",
        "log": "Runaway greenhouse effect, crushing surface pressure",
        "status": "READY",
    },
    "EARTH": {
        "color": QColor(80, 150, 220),
        "highlight": QColor(140, 210, 255),
        "ring": False,
        "texture": "cloud_anim",
        "temp_min": 30, "temp_max": 45, "temp": "-88 / 58 C",
        "wind": "40 km/h",
        "press": "1 atm",
        "storm": "None",
        "atm": "N2, O2, Ar",
        "surf": "Oceans, continents",
        "log": "Stable biosphere, weather systems nominal",
        "status": "READY",
    },
    "MARS": {
        "color": QColor(195, 90, 60),
        "highlight": QColor(230, 140, 100),
        "ring": False,
        "texture": "dust",
        "temp_min": 15, "temp_max": 25, "temp": "-153 / 20 C",
        "wind": "96 km/h",
        "press": "0.006 atm",
        "storm": "Global Dust Storm",
        "atm": "CO2, thin",
        "surf": "Iron oxide dust",
        "log": "Seasonal dust storms detected across Hellas Basin",
        "status": "READY",
    },
    "JUPITER": {
        "color": QColor(215, 140, 70),
        "highlight": QColor(245, 195, 140),
        "ring": False,
        "texture": "storm",
        "temp_min": 55, "temp_max": 70, "temp": "-145 / -108 C",
        "wind": "620 km/h",
        "press": "N/A (gas giant)",
        "storm": "Great Red Spot",
        "atm": "H2, He",
        "surf": "No solid surface",
        "log": "Centuries-old anticyclonic storm still active",
        "status": "READY",
    },
    "SATURN": {
        "color": QColor(225, 195, 120),
        "highlight": QColor(250, 230, 175),
        "ring": True,
        "texture": "rings",
        "temp_min": 65, "temp_max": 75, "temp": "-178 / -139 C",
        "wind": "1800 km/h",
        "press": "N/A (gas giant)",
        "storm": "Hexagon Vortex",
        "atm": "H2, He",
        "surf": "No solid surface",
        "log": "Polar hexagon jet stream stable for decades",
        "status": "READY",
    },
    "URANUS": {
        "color": QColor(140, 210, 220),
        "highlight": QColor(200, 240, 245),
        "ring": False,
        "texture": "ice",
        "temp_min": 92, "temp_max": 96, "temp": "-224 / -216 C",
        "wind": "900 km/h",
        "press": "N/A (ice giant)",
        "storm": "Methane Clouds",
        "atm": "H2, He, CH4",
        "surf": "No solid surface",
        "log": "Extreme axial tilt causes 42-year seasons",
        "status": "READY",
    },
    "NEPTUNE": {
        "color": QColor(60, 80, 190),
        "highlight": QColor(110, 140, 230),
        "ring": False,
        "texture": "dark",
        "temp_min": 95, "temp_max": 99, "temp": "-218 / -200 C",
        "wind": "2100 km/h",
        "press": "N/A (ice giant)",
        "storm": "Great Dark Spot",
        "atm": "H2, He, CH4",
        "surf": "No solid surface",
        "log": "Fastest planetary winds in the solar system recorded",
        "status": "READY",
    },
}

PLANET_ORDER = ["MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE"]

GREEN = QColor(70, 255, 120)
DIM_GREEN = QColor(40, 160, 80)
BG = QColor(6, 8, 6)


# --------------------------------------------------------------------------
# STAR FIELD + ORBIT + PLANET WIDGET
# --------------------------------------------------------------------------

class SpaceWidget(QWidget):
    """Animated star field, orbit rings, and rotating glowing planet."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumHeight(380)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        self.angle = 0.0
        self.pulse = 0.0
        self.current = "MERCURY"

        self.stars = []
        for _ in range(90):
            self.stars.append({
                "x": random.uniform(0, 1),
                "y": random.uniform(0, 1),
                "speed": random.uniform(0.05, 0.35),
                "size": random.uniform(1.0, 2.6),
                "phase": random.uniform(0, math.tau),
            })

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._tick)
        self.timer.start(16)  # ~60 FPS

    def set_planet(self, name):
        self.current = name
        self.update()

    def _tick(self):
        self.angle = (self.angle + 0.35) % 360
        self.pulse = (self.pulse + 0.02) % (math.tau)
        for s in self.stars:
            s["y"] += 0.0006 * s["speed"] * 16
            if s["y"] > 1.0:
                s["y"] = 0.0
                s["x"] = random.uniform(0, 1)
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        w, h = self.width(), self.height()

        p.fillRect(self.rect(), BG)

        # Stars
        for s in self.stars:
            twinkle = 0.5 + 0.5 * math.sin(self.pulse * 3 + s["phase"])
            alpha = int(90 + twinkle * 140)
            p.setBrush(QColor(200, 255, 220, alpha))
            p.setPen(Qt.NoPen)
            r = s["size"]
            p.drawEllipse(QPointF(s["x"] * w, s["y"] * h), r, r)

        data = PLANETS[self.current]
        cx, cy = w / 2, h / 2
        base_r = min(w, h) * 0.28

        # Orbit rings (decorative, always present, behind planet)
        p.setPen(QPen(QColor(70, 255, 120, 70), 1.4))
        p.setBrush(Qt.NoBrush)
        for i, factor in enumerate((1.55, 1.9)):
            rw = base_r * factor
            rh = base_r * factor * 0.34
            p.save()
            p.translate(cx, cy)
            p.rotate((self.angle * (0.5 if i == 0 else -0.3)) % 360)
            p.drawEllipse(QRectF(-rw, -rh, rw * 2, rh * 2))
            p.restore()

        # Glow behind planet
        glow = QRadialGradient(QPointF(cx, cy), base_r * 1.9)
        glow_color = QColor(data["color"])
        glow_color.setAlpha(120)
        glow.setColorAt(0.0, glow_color)
        glow.setColorAt(1.0, QColor(0, 0, 0, 0))
        p.setBrush(QBrush(glow))
        p.setPen(Qt.NoPen)
        p.drawEllipse(QPointF(cx, cy), base_r * 1.9, base_r * 1.9)

        # Planet body (rotating shading via gradient offset)
        grad = QRadialGradient(
            QPointF(cx - base_r * 0.35 * math.cos(math.radians(self.angle)),
                    cy - base_r * 0.35),
            base_r * 1.6
        )
        grad.setColorAt(0.0, data["highlight"])
        grad.setColorAt(0.55, data["color"])
        grad.setColorAt(1.0, data["color"].darker(180))
        p.setBrush(QBrush(grad))
        p.setPen(QPen(data["color"].darker(140), 2))
        p.drawEllipse(QPointF(cx, cy), base_r, base_r)

        # Texture overlays per planet (rotating with angle for "spin" feel)
        p.save()
        p.setClipRegion(self._circle_region(cx, cy, base_r))
        self._draw_texture(p, data["texture"], cx, cy, base_r)
        p.restore()

        # Saturn-style rings in front (only for ring planets, drawn after body)
        if data["ring"]:
            p.save()
            p.translate(cx, cy)
            p.setPen(QPen(QColor(230, 210, 150, 210), 3))
            p.setBrush(Qt.NoBrush)
            rw = base_r * 1.7
            rh = base_r * 0.42
            p.drawEllipse(QRectF(-rw, -rh, rw * 2, rh * 2))
            p.setPen(QPen(QColor(230, 210, 150, 140), 1.5))
            p.drawEllipse(QRectF(-rw * 0.88, -rh * 0.88, rw * 1.76, rh * 1.76))
            p.restore()

        # small "crater"/label callout like reference image
        p.setPen(QColor(70, 255, 120, 200))
        p.setFont(QFont("Consolas", 9))
        p.drawText(QRectF(cx + base_r * 0.55, cy - 10, 120, 20), Qt.AlignLeft, "> scan")

        p.end()

    def _circle_region(self, cx, cy, r):
        from PySide6.QtGui import QRegion
        return QRegion(int(cx - r), int(cy - r), int(r * 2), int(r * 2), QRegion.Ellipse)

    def _draw_texture(self, p, texture, cx, cy, r):
        p.setPen(Qt.NoPen)
        rnd = random.Random(42)  # deterministic texture layout per repaint
        if texture == "rock":
            p.setBrush(QColor(90, 90, 95, 120))
            for _ in range(14):
                a = rnd.uniform(0, math.tau)
                d = rnd.uniform(0, r * 0.85)
                x = cx + d * math.cos(a + math.radians(self.angle))
                y = cy + d * math.sin(a + math.radians(self.angle)) * 0.9
                s = rnd.uniform(4, 12)
                p.drawEllipse(QPointF(x, y), s, s * 0.8)
        elif texture == "cloud" or texture == "cloud_anim":
            p.setBrush(QColor(255, 255, 255, 60))
            offset = self.angle if texture == "cloud_anim" else self.angle * 0.3
            for i in range(6):
                band_y = cy - r * 0.6 + i * (r * 1.2 / 6)
                sway = math.sin(math.radians(offset) + i) * r * 0.15
                p.drawRoundedRect(
                    QRectF(cx - r + sway, band_y, r * 2, r * 0.16), 20, 20
                )
        elif texture == "dust":
            p.setBrush(QColor(255, 200, 160, 70))
            for _ in range(10):
                a = rnd.uniform(0, math.tau)
                d = rnd.uniform(0, r * 0.9)
                x = cx + d * math.cos(a - math.radians(self.angle))
                y = cy + d * math.sin(a - math.radians(self.angle)) * 0.9
                s = rnd.uniform(6, 18)
                p.drawEllipse(QPointF(x, y), s, s * 0.5)
        elif texture == "storm":
            p.setBrush(QColor(255, 255, 255, 50))
            for i in range(5):
                band_y = cy - r * 0.7 + i * (r * 1.4 / 5)
                p.drawRoundedRect(QRectF(cx - r, band_y, r * 2, r * 0.12), 30, 30)
            p.setBrush(QColor(200, 90, 60, 160))
            p.drawEllipse(QPointF(cx + r * 0.25, cy + r * 0.1), r * 0.22, r * 0.14)
        elif texture == "rings":
            p.setBrush(QColor(255, 235, 190, 40))
            for i in range(4):
                band_y = cy - r * 0.5 + i * (r / 4)
                p.drawRoundedRect(QRectF(cx - r, band_y, r * 2, r * 0.08), 10, 10)
        elif texture == "ice":
            p.setBrush(QColor(255, 255, 255, 45))
            for i in range(4):
                band_y = cy - r * 0.6 + i * (r * 1.2 / 4)
                p.drawRoundedRect(QRectF(cx - r, band_y, r * 2, r * 0.1), 15, 15)
        elif texture == "dark":
            p.setBrush(QColor(150, 180, 255, 55))
            for i in range(3):
                band_y = cy - r * 0.4 + i * (r * 0.8 / 3)
                p.drawRoundedRect(QRectF(cx - r, band_y, r * 2, r * 0.14), 15, 15)


# --------------------------------------------------------------------------
# TERMINAL PANEL (typing effect + blinking cursor)
# --------------------------------------------------------------------------

class TerminalPanel(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)

        self.lines = []          # full target lines
        self.rendered = []       # currently revealed text per line
        self.line_index = 0
        self.char_index = 0
        self.cursor_on = True

        self.type_timer = QTimer(self)
        self.type_timer.timeout.connect(self._type_step)
        self.type_timer.start(18)

        self.cursor_timer = QTimer(self)
        self.cursor_timer.timeout.connect(self._blink)
        self.cursor_timer.start(500)

        mono = QFont("Consolas")
        mono.setStyleHint(QFont.Monospace)
        mono.setPointSize(11)
        self.setFont(mono)
        self.setMinimumHeight(230)

    def set_data(self, data):
        self.lines = [
            f"> TEMP: {data['temp']}",
            f"> WIND: {data['wind']}",
            f"> PRESS: {data['press']}",
            f"> STORM: {data['storm']}",
            f"> ATM: {data['atm']}",
            f"> SURF: {data['surf']}",
            f"> LOG: {data['log']}",
            f"> STATUS: {data['status']}",
        ]
        self.rendered = ["" for _ in self.lines]
        self.line_index = 0
        self.char_index = 0
        self.update()

    def _type_step(self):
        if not self.lines:
            return
        if self.line_index >= len(self.lines):
            return
        target = self.lines[self.line_index]
        if self.char_index < len(target):
            self.char_index += 1
            self.rendered[self.line_index] = target[:self.char_index]
            self.update()
        else:
            self.line_index += 1
            self.char_index = 0

    def _blink(self):
        self.cursor_on = not self.cursor_on
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        rect = self.rect()

        # Panel background
        p.fillRect(rect, QColor(4, 10, 6))
        p.setPen(QPen(GREEN, 1))
        p.drawRect(rect.adjusted(0, 0, -1, -1))

        # Header bar "TERMINAL"
        header_h = 26
        p.setBrush(QColor(20, 90, 130, 210))
        p.setPen(Qt.NoPen)
        p.drawRect(QRectF(1, 1, rect.width() - 2, header_h))
        p.setPen(GREEN)
        p.setBrush(QBrush(GREEN))
        p.drawEllipse(QPointF(14, 1 + header_h / 2), 4, 4)
        p.drawText(QRectF(24, 1, 200, header_h), Qt.AlignVCenter, "TERMINAL")

        p.setPen(QColor(230, 240, 255))
        p.drawText(QRectF(rect.width() - 90, 1, 80, header_h),
                    Qt.AlignVCenter | Qt.AlignRight, "[TEMP]")

        # Log lines
        y = header_h + 22
        line_h = 20
        p.setPen(GREEN)
        for i, text in enumerate(self.rendered):
            display = text
            if i == self.line_index and self.cursor_on:
                display += "_"
            p.drawText(QRectF(14, y + i * line_h, rect.width() - 28, line_h),
                        Qt.AlignVCenter, display)

        p.end()


# --------------------------------------------------------------------------
# TEMPERATURE BAR
# --------------------------------------------------------------------------

class TempBar(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(34)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self._fill = 0.0
        self._target = 0.0
        self.anim = QPropertyAnimation(self, b"fill")
        self.anim.setDuration(700)
        self.anim.setEasingCurve(QEasingCurve.OutCubic)

    def getFill(self):
        return self._fill

    def setFill(self, v):
        self._fill = v
        self.update()

    fill = Property(float, getFill, setFill)

    def set_target(self, ratio):
        self._target = max(0.0, min(1.0, ratio))
        self.anim.stop()
        self.anim.setStartValue(self._fill)
        self.anim.setEndValue(self._target)
        self.anim.start()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        rect = self.rect().adjusted(1, 1, -1, -1)

        p.fillRect(self.rect(), QColor(4, 10, 6))
        p.setPen(QPen(GREEN, 1))
        p.drawRect(rect)

        inner = rect.adjusted(3, 3, -3, -3)
        fill_w = int(inner.width() * self._fill)
        if fill_w > 0:
            grad = QLinearGradient(inner.left(), 0, inner.left() + fill_w, 0)
            grad.setColorAt(0.0, QColor(20, 120, 60))
            grad.setColorAt(1.0, GREEN)
            p.setBrush(QBrush(grad))
            p.setPen(Qt.NoPen)
            p.drawRect(QRectF(inner.left(), inner.top(), fill_w, inner.height()))

        # tick marks
        p.setPen(QPen(QColor(20, 90, 50), 1))
        for i in range(1, 10):
            x = inner.left() + inner.width() * i / 10
            p.drawLine(QPointF(x, inner.top()), QPointF(x, inner.bottom()))

        p.setPen(GREEN)
        p.setFont(QFont("Consolas", 8))
        p.drawText(rect, Qt.AlignCenter, "TEMPERATURE SCAN")
        p.end()


# --------------------------------------------------------------------------
# CRT OVERLAY (scanlines + vignette)
# --------------------------------------------------------------------------

class CRTOverlay(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.offset = 0.0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._tick)
        self.timer.start(50)

    def _tick(self):
        self.offset = (self.offset + 1.0) % 4.0
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing, False)
        h = self.height()
        w = self.width()

        p.setPen(QPen(QColor(0, 0, 0, 40), 1))
        y = -4 + self.offset
        while y < h:
            p.drawLine(0, int(y), w, int(y))
            y += 4

        vignette = QRadialGradient(QPointF(w / 2, h / 2), max(w, h) * 0.75)
        vignette.setColorAt(0.0, QColor(0, 0, 0, 0))
        vignette.setColorAt(1.0, QColor(0, 0, 0, 130))
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(vignette))
        p.drawRect(self.rect())
        p.end()


# --------------------------------------------------------------------------
# STATUS ICONS (battery / signal)
# --------------------------------------------------------------------------

class BatteryIcon(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(30, 16)

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        p.setPen(QPen(GREEN, 1.5))
        p.setBrush(Qt.NoBrush)
        body = QRectF(1, 2, 24, 12)
        p.drawRoundedRect(body, 2, 2)
        p.drawRect(QRectF(26, 5, 3, 6))
        p.setBrush(QBrush(GREEN))
        p.setPen(Qt.NoPen)
        p.drawRoundedRect(body.adjusted(2, 2, -2, -2), 1, 1)
        p.end()


class SignalIcon(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(24, 16)

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(GREEN))
        bars = 4
        for i in range(bars):
            bar_h = 4 + i * 3
            p.drawRect(QRectF(i * 6, 16 - bar_h - 1, 4, bar_h))
        p.end()


# --------------------------------------------------------------------------
# PLANET SELECTOR BUTTON
# --------------------------------------------------------------------------

class PlanetButton(QPushButton):
    def __init__(self, name, color, parent=None):
        super().__init__(parent)
        self.name = name
        self.color = color
        self.setFixedSize(46, 46)
        self.setCursor(Qt.PointingHandCursor)
        self.setCheckable(True)
        self._apply_style(False)

        effect = QGraphicsDropShadowEffect(self)
        effect.setBlurRadius(0)
        effect.setColor(color)
        effect.setOffset(0, 0)
        self.setGraphicsEffect(effect)
        self._effect = effect

    def _apply_style(self, active):
        c = self.color
        border = "3px solid #46ff78" if active else "2px solid #1a1a1a"
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: rgb({c.red()},{c.green()},{c.blue()});
                border-radius: 23px;
                border: {border};
            }}
            QPushButton:hover {{
                border: 3px solid #ffffff;
            }}
        """)

    def set_active(self, active):
        self.setChecked(active)
        self._apply_style(active)
        self._effect.setBlurRadius(22 if active else 0)


# --------------------------------------------------------------------------
# MAIN WINDOW
# --------------------------------------------------------------------------

class PlanetWeatherTerminal(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PLANET WEATHER TERMINAL")
        self.setFixedSize(WINDOW_W, WINDOW_H)

        self.current_planet = "MERCURY"
        self.buttons = {}

        central = QWidget(self)
        central.setStyleSheet("background-color: black;")
        self.setCentralWidget(central)

        root = QVBoxLayout(central)
        root.setContentsMargins(16, 14, 16, 16)
        root.setSpacing(10)

        # ---- Top bar ----
        top_bar = QHBoxLayout()
        title_box = QVBoxLayout()
        title_box.setSpacing(0)

        title_lbl = QLabel("PLANET WEATHER")
        title_font = QFont("Consolas")
        title_font.setPointSize(14)
        title_font.setBold(True)
        title_lbl.setFont(title_font)
        title_lbl.setStyleSheet(f"color: {GREEN.name()};")

        self.planet_name_lbl = QLabel(self.current_planet)
        name_font = QFont("Consolas")
        name_font.setPointSize(20)
        name_font.setBold(True)
        self.planet_name_lbl.setFont(name_font)
        self.planet_name_lbl.setStyleSheet(f"color: {GREEN.name()};")

        title_box.addWidget(title_lbl)
        title_box.addWidget(self.planet_name_lbl)

        top_bar.addLayout(title_box)
        top_bar.addStretch(1)

        icons_box = QVBoxLayout()
        icons_row = QHBoxLayout()
        icons_row.setSpacing(8)
        icons_row.addWidget(SignalIcon())
        icons_row.addWidget(BatteryIcon())
        icons_box.addLayout(icons_row)

        self.status_lbl = QLabel("● ONLINE")
        self.status_lbl.setStyleSheet(f"color: {GREEN.name()}; font-family: Consolas; font-size: 10px;")
        self.status_lbl.setAlignment(Qt.AlignRight)
        icons_box.addWidget(self.status_lbl)

        top_bar.addLayout(icons_box)
        root.addLayout(top_bar)

        # ---- Center: space widget with CRT overlay stacked ----
        center_container = QWidget()
        center_container.setFixedHeight(400)
        self.space = SpaceWidget(center_container)
        self.crt_center = CRTOverlay(center_container)

        def resize_center(event):
            self.space.setGeometry(0, 0, center_container.width(), center_container.height())
            self.crt_center.setGeometry(0, 0, center_container.width(), center_container.height())
        center_container.resizeEvent = resize_center

        root.addWidget(center_container)

        # ---- Terminal panel ----
        self.terminal = TerminalPanel()
        root.addWidget(self.terminal)

        # ---- Temperature bar ----
        self.temp_bar = TempBar()
        root.addWidget(self.temp_bar)

        # ---- Bottom: SELECT label + circular buttons ----
        select_lbl = QLabel("SELECT")
        select_lbl.setStyleSheet(f"color: {GREEN.name()}; font-family: Consolas; font-size: 12px;")
        root.addWidget(select_lbl)

        grid = QHBoxLayout()
        grid.setSpacing(10)
        for name in PLANET_ORDER:
            color = PLANETS[name]["color"]
            btn = PlanetButton(name, color)
            btn.clicked.connect(lambda checked, n=name: self.select_planet(n))
            self.buttons[name] = btn
            grid.addWidget(btn)
        grid.addStretch(1)
        root.addLayout(grid)

        self.select_planet(self.current_planet, animate_bar=False)

    def select_planet(self, name, animate_bar=True):
        self.current_planet = name
        data = PLANETS[name]

        self.planet_name_lbl.setText(name)
        self.planet_name_lbl.setStyleSheet(f"color: {data['color'].name()};")

        self.space.set_planet(name)
        self.terminal.set_data(data)

        ratio = (data["temp_max"]) / 100.0
        self.temp_bar.set_target(max(0.05, min(1.0, ratio)))

        for n, btn in self.buttons.items():
            btn.set_active(n == name)


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = PlanetWeatherTerminal()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
