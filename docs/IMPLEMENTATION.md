# Implementation Flow

## Phase 1: Define an action map

Create a per-module table that links a musical event to a physical actuator. Examples:

| Instrument | Event | Physical target | Required confirmation |
| --- | --- | --- | --- |
| Piano | C4 note | Key actuator for C4 | Key travel or return signal |
| Guitar | Am chord | Multiple fret points + pick actuator | All fret points confirmed before pick |
| Drums | Snare hit | Snare beater | Travel limit and return signal |

## Phase 2: Encode the event

The current protocol stores channel, action, actuator index, velocity, timestamp, duration, and checksum. `software/console/protocol.py` is the reference implementation.

## Phase 3: Validate before output

Firmware must reject malformed frames, unsupported protocol versions, and actuator indexes outside the configured range. A valid frame is necessary but not sufficient: module presence, safe mode, and physical limits must also permit the action.

## Phase 4: Execute by module

### Piano action

1. Resolve the note to a key position.
2. Confirm that the piano module is attached.
3. Set a bounded output value.
4. Press with a soft contact surface.
5. Return to the neutral position and record the result.

### Guitar action

1. Expand a chord to string and fret positions.
2. Position and press the fretting heads.
3. Confirm pressure or travel at each required point.
4. Wait for a short stabilization window.
5. Trigger a separate picker or strummer.
6. Hold or release the fretting heads according to the next event.

The repository currently includes software chord-to-fret mapping and a fretting concept model. Separate pick-actuator scheduling is part of the hardware integration work and should not be represented as validated hardware behavior.

### Drum action

1. Resolve the beat event to a drum position.
2. Verify the selected beater is in its neutral position.
3. Drive the beater with a bounded pulse.
4. Detect the end of travel and return.
5. Block the next strike until a safe return state is present.

## Phase 5: Fail safe

The reference firmware releases all configured outputs when no valid frame arrives for more than 1000 ms. A physical emergency stop must independently remove or inhibit actuator power.

## Phase 6: Test incrementally

1. Bench test one actuator with no instrument attached.
2. Use a current-limited supply and a low output level.
3. Verify command, return, timeout release, and emergency stop.
4. Add soft contact surfaces and mechanical limits.
5. Validate one instrument target at a time.
6. Only then evaluate sequences and user interaction.
