# Architecture

## Product boundary

ClampPlay-1 is a controller platform with detachable instrument modules. The controller is shared; the mechanical interface is not. A piano, guitar, and drum kit demand different physical actions, so each uses a dedicated quick-change module.

```text
Mobile app or browser console
          |
          v
Controller core
  - protocol parser
  - event scheduler
  - actuator driver interface
  - sensor inputs
  - timeout and emergency stop
          |
          +-- Piano key-actuation module
          +-- Guitar fret module + pick module
          +-- Drum strike module
```

## Software path

1. An operator creates events in the mobile PWA or desktop console.
2. The scheduler resolves timing and actuator index data.
3. The protocol encoder writes a 14-byte binary frame.
4. A serial transport forwards the frame to firmware.
5. Firmware validates the frame and commands the selected output channel.
6. Sensor and safety logic can release outputs independently of the app.

## Hardware path

The shared controller must provide separate power domains for logic and actuators, protected outputs, a physical emergency stop, and module-presence detection. Instrument-contact surfaces must be soft materials such as felt, silicone, EVA, or TPU rather than bare metal.

## Module-specific execution

### Piano

`note -> key map -> single key actuator -> soft key contact -> return`

A piano module needs a stable clamp, an adjustable key pitch, a controlled travel stop, and a return mechanism. The current repository documents the workflow but does not claim real-instrument validation.

### Guitar

`chord -> fret positions -> fret confirmation -> pick or strum -> release or retain`

The fret and pick mechanisms are separate because fretting alone does not create sound. A module must prevent picking until the desired fretting positions are confirmed.

### Drums

`beat -> drum position -> beater drive -> strike -> return`

A drum module needs a mechanically isolated support, controlled beater travel, and a return confirmation before the next beat. The included kick-drive model is a concept artifact, not a production CAD assembly.
