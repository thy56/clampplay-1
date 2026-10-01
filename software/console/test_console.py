# -*- coding: utf-8 -*-
"""Focused tests for protocol, scheduling, and input validation."""

import unittest

from engine import ChordStep, chord_events, drum_events, validate_tempo
from protocol import Event, decode, encode


class ConsoleTests(unittest.TestCase):
    def test_protocol_round_trip(self):
        event = Event(3, 4, 0, 90, 1200, 80)
        self.assertEqual(decode(encode(event)), event)

    def test_protocol_rejects_corruption(self):
        frame = bytearray(encode(Event(1, 1, 0, 90, 0, 100)))
        frame[-1] ^= 1
        with self.assertRaises(ValueError):
            decode(bytes(frame))

    def test_chord_has_on_and_off_for_each_note(self):
        events = chord_events([ChordStep("C", 0, 500)])
        self.assertEqual(len(events), 6)
        self.assertEqual(events[0].timestamp_ms, 0)
        self.assertEqual(events[-1].timestamp_ms, 500)

    def test_drum_events(self):
        events = drum_events([0, 500, 1000])
        self.assertEqual([event.timestamp_ms for event in events], [0, 500, 1000])

    def test_tempo_bounds(self):
        self.assertEqual(validate_tempo(120), 500)
        with self.assertRaises(ValueError):
            validate_tempo(20)


if __name__ == "__main__":
    unittest.main()
