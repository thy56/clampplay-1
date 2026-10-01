# -*- coding: utf-8 -*-
"""Command line controller and simulator for the accessible instrument MVP."""

import argparse
import json
import sys

from engine import ChordStep, chord_events, drum_events
from protocol import encode


def _read_steps(path):
    with open(path, "r", encoding="utf-8") as stream:
        data = json.load(stream)
    return [ChordStep(item["chord"], item["start_ms"], item["duration_ms"],
                      item.get("velocity", 100)) for item in data]


def main(argv=None):
    parser = argparse.ArgumentParser(description="Accessible instrument MVP")
    parser.add_argument("--input", help="JSON chord steps")
    parser.add_argument("--drum", help="comma-separated hit timestamps")
    parser.add_argument("--output", help="write encoded frames as JSON")
    args = parser.parse_args(argv)
    if bool(args.input) == bool(args.drum):
        parser.error("choose exactly one of --input or --drum")
    events = (chord_events(_read_steps(args.input)) if args.input else
              drum_events([int(value) for value in args.drum.split(",")]))
    frames = [encode(event).hex() for event in events]
    payload = json.dumps(frames, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(payload + "\n")
    else:
        sys.stdout.write(payload + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
