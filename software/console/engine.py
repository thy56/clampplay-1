# -*- coding: utf-8 -*-
"""Scheduling engine for keyboard, guitar, and drum MVP flows."""

from dataclasses import dataclass
from typing import Iterable
from protocol import ACTION_HIT, ACTION_NOTE_OFF, ACTION_NOTE_ON, Event

CHORDS = {"C": (60, 64, 67), "Dm": (62, 65, 69), "Em": (64, 67, 71), "F": (65, 69, 72), "G": (67, 71, 74), "Am": (69, 72, 76)}
GUITAR_CHORDS = {"C": "x32010", "G": "320003", "D": "xx0232", "Em": "022000", "Am": "x02210", "F": "xx3210"}

@dataclass(frozen=True)
class ChordStep:
    chord: str
    start_ms: int
    duration_ms: int
    velocity: int = 100

def chord_events(steps: Iterable[ChordStep], channel: int = 1):
    events = []
    for step in steps:
        if step.chord not in CHORDS:
            raise ValueError("unknown chord: %s" % step.chord)
        if step.duration_ms <= 0:
            raise ValueError("duration must be positive")
        for index in range(3):
            events.append(Event(channel, ACTION_NOTE_ON, index, step.velocity, step.start_ms, step.duration_ms))
            events.append(Event(channel, ACTION_NOTE_OFF, index, 0, step.start_ms + step.duration_ms, 0))
    return sorted(events, key=lambda item: (item.timestamp_ms, item.action))

def guitar_press_points(chord):
    fingering = GUITAR_CHORDS.get(chord)
    if fingering is None:
        raise ValueError("unknown guitar chord: %s" % chord)
    return [(string_index + 1, int(value)) for string_index, value in enumerate(fingering) if value not in "x0"]

def guitar_events(chord, start_ms=0, duration_ms=500, velocity=90, channel=2):
    points = guitar_press_points(chord)
    events = [Event(channel, ACTION_NOTE_ON, (string - 1) * 3 + (fret - 1), velocity, start_ms, duration_ms) for string, fret in points]
    events.extend(Event(channel, ACTION_NOTE_OFF, (string - 1) * 3 + (fret - 1), 0, start_ms + duration_ms, 0) for string, fret in points)
    return sorted(events, key=lambda item: (item.timestamp_ms, item.action))

def drum_events(hits: Iterable[int], velocity: int = 100, channel: int = 3):
    return [Event(channel, ACTION_HIT, 0, velocity, timestamp, 80) for timestamp in hits]

def validate_tempo(bpm: int) -> int:
    if not 30 <= bpm <= 240:
        raise ValueError("bpm must be between 30 and 240")
    return 60000 // bpm
