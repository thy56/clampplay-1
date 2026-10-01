# -*- coding: utf-8 -*-
"""Binary protocol and event model for the accessible instrument platform."""

from dataclasses import dataclass
import struct


MAGIC = 0xAA
VERSION = 1
FRAME_SIZE = 14
ACTION_NOTE_ON = 1
ACTION_NOTE_OFF = 2
ACTION_HIT = 4
ACTION_STOP = 5


@dataclass(frozen=True)
class Event:
    channel: int
    action: int
    actuator: int
    velocity: int
    timestamp_ms: int
    duration_ms: int = 0


def _u8(value: int, name: str) -> int:
    if not 0 <= value <= 255:
        raise ValueError("%s out of range" % name)
    return value


def encode(event: Event) -> bytes:
    channel = _u8(event.channel, "channel")
    action = _u8(event.action, "action")
    actuator = _u8(event.actuator, "actuator")
    velocity = _u8(event.velocity, "velocity")
    timestamp = event.timestamp_ms
    duration = event.duration_ms
    if not 0 <= timestamp <= 0xFFFFFFFF:
        raise ValueError("timestamp out of range")
    if not 0 <= duration <= 0xFFFF:
        raise ValueError("duration out of range")
    body = struct.pack("<BBBBBIH", VERSION, channel, action, actuator,
                       velocity, timestamp, duration)
    checksum = sum(body) & 0xFF
    return bytes([MAGIC, len(body) + 1]) + body + bytes([checksum])


def decode(frame: bytes) -> Event:
    if len(frame) != FRAME_SIZE:
        raise ValueError("invalid frame length")
    if frame[0] != MAGIC:
        raise ValueError("invalid frame magic")
    if frame[1] != FRAME_SIZE - 2:
        raise ValueError("invalid frame payload length")
    body = frame[2:-1]
    if (sum(body) & 0xFF) != frame[-1]:
        raise ValueError("invalid checksum")
    version, channel, action, actuator, velocity, timestamp, duration = struct.unpack(
        "<BBBBBIH", body)
    if version != VERSION:
        raise ValueError("unsupported protocol version")
    return Event(channel, action, actuator, velocity, timestamp, duration)
