# Binary Protocol

## Frame layout

The reference protocol uses a fixed 14-byte frame in little-endian order.

```text
AA | 0C | version | channel | action | actuator | velocity |
     timestamp_ms(uint32) | duration_ms(uint16) | checksum
```

| Field | Size | Description |
| --- | ---: | --- |
| `AA` | 1 byte | Frame magic |
| `0C` | 1 byte | Payload length after this field |
| `version` | 1 byte | Protocol version, currently `1` |
| `channel` | 1 byte | Instrument or module channel |
| `action` | 1 byte | Command type |
| `actuator` | 1 byte | Zero-based actuator index |
| `velocity` | 1 byte | Bounded command value, `0..255` |
| `timestamp_ms` | 4 bytes | Timeline offset in milliseconds |
| `duration_ms` | 2 bytes | Hold or strike duration |
| `checksum` | 1 byte | Low eight bits of the payload-byte sum |

## Actions

| Value | Name | Meaning |
| ---: | --- | --- |
| 1 | `ACTION_NOTE_ON` | Enable or press an actuator |
| 2 | `ACTION_NOTE_OFF` | Release an actuator |
| 4 | `ACTION_HIT` | Trigger a short strike |
| 5 | `ACTION_STOP` | Release all outputs |

## Reference safety behavior

- Reject bad length, magic, version, and checksum values.
- Ignore actuator indexes outside the configured output list.
- Release all outputs after more than 1000 ms without a valid frame.
- Give the stop action priority over normal output.

The frame format is validated by `software/console/test_console.py`. Real devices need an additional module map, physical limit handling, and current/temperature protections.
