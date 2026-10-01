# ClampPlay-1

[中文文档](README.zh-CN.md) | [English](README.md)

> A modular automatic-instrument execution platform: one controller, interchangeable piano, guitar, and drum modules.

[![Software License: MIT](https://img.shields.io/badge/software-MIT-2ea44f.svg)](LICENSES/MIT.txt)
[![Hardware License: CERN--OHL--S--2.0](https://img.shields.io/badge/hardware-CERN--OHL--S--2.0-4c1.svg)](LICENSES/CERN-OHL-S-2.0.txt)
[![Protocol](https://img.shields.io/badge/protocol-14--byte%20binary-4B93E6.svg)](docs/PROTOCOL.md)

ClampPlay-1 separates a reusable control core from the different mechanical actions required by each instrument. A mobile web app creates timed events; a controller validates and schedules them; detachable modules perform the physical action.

<p align="center">
  <img src="https://github.com/thy56/clampplay-1/blob/main/docs/assets/mobile-app-home.png?raw=true" alt="ClampPlay-1 mobile app preview" width="300">
</p>

- **Piano module:** map a note to a key-position actuator and press the key with a soft contact tip.
- **Guitar module:** place fretting pressure first, confirm the position, then trigger a separate picking or strumming mechanism.
- **Drum module:** map a beat event to a drum-position actuator and drive a beater through a controlled strike-and-return cycle.

> [!WARNING]
> This repository is an engineering prototype and software demonstration, not a medical device or a validated hardware product. The mobile app and browser consoles default to simulation. Real hardware, instrument contact, and user-facing trials require risk assessment, current limiting, mechanical limits, emergency-stop validation, and staged low-force testing.

## Quick start

### 1. Run the protocol and scheduling tests

```bash
python -m unittest discover -s software/console -p test_console.py -v
```

### 2. Generate example controller frames

```bash
cd software/console
python console.py --input demo_chords.json --output demo_frames.json
python console.py --drum 0,500,1000
```

The generated JSON contains hexadecimal 14-byte frames. Send binary frames to a compatible controller; do not send the JSON text directly to firmware.

### 3. Run the mobile PWA

```bash
cd software/mobile-app
python -m http.server 8088
```

Open `http://localhost:8088`. For PWA installation and Web Serial, use `localhost` or HTTPS.

### 4. Run the mobile PWA with Docker

```bash
cd software/mobile-app
docker compose up --build -d
```

Open `http://localhost:8088`, then stop it with:

```bash
docker compose down
```

## How the project is implemented

1. **Author a performance event.** The app or console records an instrument type, actuator index, velocity, start time, and duration.
2. **Encode a binary frame.** `software/console/protocol.py` serializes each event as a fixed 14-byte frame with a checksum.
3. **Validate and schedule.** The controller rejects malformed frames and invalid actuator indices before any output is enabled.
4. **Drive an instrument module.** The selected quick-change module translates the generic actuator command into a piano press, guitar fret/pick sequence, or drum strike.
5. **Close the safety loop.** A stop event, invalid frame, or more than 1000 ms without a valid command releases all outputs.

Read the complete workflow in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Architecture

<p align="center">
  <img src="https://github.com/thy56/clampplay-1/blob/main/docs/assets/unified-controller-modules.png?raw=true" alt="Unified controller and detachable modules" width="900">
</p>

| Layer | Responsibility | Current state |
| --- | --- | --- |
| Mobile PWA | Song events, calibration records, local simulation, Web Serial entry, emergency-stop UI | Implemented for simulation |
| Browser console | Protocol demo, event scheduling, interaction prototype | Implemented |
| Binary protocol | Fixed-length events, checksum validation, stop action | Implemented and unit-tested |
| Firmware skeleton | Serial parser, actuator index checks, timeout release | Source provided; board-specific compilation and hardware integration remain required |
| Piano module | Note-to-key actuation with soft contact | Architecture only |
| Guitar module | Fretting mechanism plus separate picking mechanism | Fretting concept model provided; full dual-mechanism hardware remains to be validated |
| Drum module | Beat-to-beater action | Kick-drive concept model provided; full drum-kit adaptation remains to be validated |

<p align="center">
  <img src="https://github.com/thy56/clampplay-1/blob/main/docs/assets/instrument-execution-chains.png?raw=true" alt="Piano guitar and drum execution chains" width="900">
</p>

## Repository layout

```text
clampplay-1/
├── software/
│   ├── console/          # Protocol, scheduler, unit tests, browser demos
│   ├── firmware/         # Arduino-compatible serial firmware skeleton
│   └── mobile-app/       # Mobile-first PWA and Docker deployment
├── hardware/
│   ├── BOM.md            # Prototype bill of materials
│   ├── cad/              # CAD interface notes
│   ├── electronics/      # Electronics interface notes
│   └── models/           # Conceptual Blender, GLB, OBJ, and render artifacts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION.md
│   ├── PROTOCOL.md
│   ├── SAFETY.md
│   ├── TESTING.md
│   ├── assets/
│   └── diagrams/
└── LICENSES/
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Implementation flow](docs/IMPLEMENTATION.md)
- [Binary protocol](docs/PROTOCOL.md)
- [Hardware scope](docs/HARDWARE.md)
- [Safety boundary](docs/SAFETY.md)
- [Testing](docs/TESTING.md)
- [Mobile app deployment](software/mobile-app/README.md)

## Licensing

- Software is released under the [MIT License](LICENSES/MIT.txt).
- Hardware design materials are released under [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt).

See [LICENSE](LICENSE) for the split-license boundary.
