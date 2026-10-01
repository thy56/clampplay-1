# -*- coding: utf-8 -*-
"""Verify exposed mechanical model artifacts and workstation source."""
from pathlib import Path
import struct
from PIL import Image

root = Path(__file__).resolve().parent
for name in ["guitar_fret_assist_mechanical_v2", "kick_drive_mechanical_v2"]:
    glb = (root / (name + ".glb")).read_bytes()
    assert glb[:4] == b"glTF"
    assert struct.unpack("<II", glb[4:12])[1] == len(glb)
    obj = (root / (name + ".obj")).read_text(encoding="utf-8", errors="replace")
    assert sum(line.startswith("v ") for line in obj.splitlines()) > 100
    assert sum(line.startswith("f ") for line in obj.splitlines()) > 100
    assert Image.open(root / (name + "_render.png")).size == (1440, 900)
    print("OK", name, len(glb))
app = root.parent / "software" / "console" / "index.html"
text = app.read_text(encoding="utf-8")
for token in ["Web Serial", "急停 E-STOP", "吉他辅助按弦阵列", "底鼓推杆传动"]:
    assert token in text
print("OK workstation", app.stat().st_size)
