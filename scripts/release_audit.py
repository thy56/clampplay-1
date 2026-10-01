# -*- coding: utf-8 -*-
"""Run basic public-release checks for the ClampPlay-1 repository."""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".md", ".py", ".ino", ".js", ".html", ".css", ".json", ".svg", ".yml", ".yaml", ".webmanifest", ".txt", ".gitignore", ".gitattributes", ".editorconfig"}
REQUIRED = {
    "README.md",
    "LICENSE",
    "LICENSES/MIT.txt",
    "LICENSES/CERN-OHL-S-2.0.txt",
    "CHANGELOG.md",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    "docs/ARCHITECTURE.md",
    "docs/IMPLEMENTATION.md",
    "docs/PROTOCOL.md",
    "docs/SAFETY.md",
    "docs/TESTING.md",
}
SECRET_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"api[_-]?key\s*[:=]",
        r"secret\s*[:=]",
        r"password\s*[:=]",
        r"authorization\s*[:=]\s*bearer",
        r"gh[pousr]_[A-Za-z0-9_]+",
    ]
]
PRIVATE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"C:\\Users\\",
        r"OpenRDHub",
        r"黑客松",
        r"路演",
        r"\.pptx",
        r"周爽",
    ]
]
BANNED_NAMES = {"展示材料", "原始资料", "01_需求分析", "02_系统设计", "03_固件", "05_测试记录"}


def text_files():
    for path in ROOT.rglob("*"):
        if path.is_file() and (path.suffix.lower() in TEXT_SUFFIXES or path.name in {"LICENSE", ".gitignore", ".gitattributes", ".editorconfig"}):
            yield path


def main():
    failures = []
    required_missing = sorted(item for item in REQUIRED if not (ROOT / item).is_file())
    if required_missing:
        failures.append("missing required files: " + ", ".join(required_missing))

    banned_hits = []
    for path in ROOT.rglob("*"):
        if any(part in BANNED_NAMES for part in path.parts):
            banned_hits.append(path.relative_to(ROOT).as_posix())
    if banned_hits:
        failures.append("banned release paths: " + ", ".join(banned_hits[:10]))

    secret_hits = []
    private_hits = []
    for path in text_files():
        if path.resolve() == Path(__file__).resolve():
            continue
        if path.name == ".gitignore":
            continue
        try:
            source = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            failures.append("non-UTF-8 text file: " + path.relative_to(ROOT).as_posix())
            continue
        relative = path.relative_to(ROOT).as_posix()
        for line_number, line in enumerate(source.splitlines(), 1):
            if any(pattern.search(line) for pattern in SECRET_PATTERNS):
                secret_hits.append("%s:%d" % (relative, line_number))
            if any(pattern.search(line) for pattern in PRIVATE_PATTERNS):
                private_hits.append("%s:%d" % (relative, line_number))
    if secret_hits:
        failures.append("secret-like content: " + ", ".join(secret_hits))
    if private_hits:
        failures.append("private or contest references: " + ", ".join(private_hits))

    print("REQUIRED missing=%d" % len(required_missing))
    print("BANNED_PATHS hits=%d" % len(banned_hits))
    print("SECRET_LIKE hits=%d" % len(secret_hits))
    print("PRIVATE_CONTEXT hits=%d" % len(private_hits))
    print("TEXT_FILES scanned=%d" % sum(1 for _ in text_files()))
    if failures:
        for failure in failures:
            print("FAIL " + failure)
        return 1
    print("OK release audit passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
