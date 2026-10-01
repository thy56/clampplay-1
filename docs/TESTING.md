# Testing

## Automated tests

Run from the repository root:

```bash
python -m unittest discover -s software/console -p test_console.py -v
```

The current unit tests cover:

- Protocol encode/decode round trips.
- Checksum corruption rejection.
- Note-on and note-off generation for a chord.
- Drum event timing.
- Tempo range validation.

## Manual software checks

```bash
cd software/console
python console.py --input demo_chords.json --output demo_frames.json
python console.py --drum 0,500,1000
```

Open either HTML console in a current browser to inspect the interaction prototype. The browser pages are demonstrations until they are wired to a verified controller.

## Hardware validation checklist

The following are future validation tasks, not completed test claims:

- Current draw and temperature at the expected duty cycle.
- Actuator travel, return time, and jam behavior.
- Emergency-stop and command-timeout release.
- Force and contact behavior against an instrument fixture.
- Noise, repeatability, and durability.
- Module-change locking and mis-installation prevention.
