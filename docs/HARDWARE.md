# Hardware Scope

## What is included

- A prototype BOM for low-voltage controller and actuator experiments.
- A guitar fretting-mechanism concept model in Blender, GLB, and OBJ formats.
- A kick-drive transmission concept model in Blender, GLB, and OBJ formats.
- Interface notes for CAD and electronics work.
- Editable Draw.io diagrams for the modular system and execution chains.

## What is not claimed

This repository does not claim that a controller board has been selected, firmware has been flashed to a target board, a real instrument has been played automatically, or that actuator force, travel, temperature, acoustic noise, durability, or user suitability has been validated.

## Suggested hardware build sequence

1. Choose a controller board and document its voltage domains.
2. Implement protected actuator drivers and a hardwired emergency-stop path.
3. Bring up one actuator with no instrument attached.
4. Measure current, travel, return time, and temperature.
5. Add a soft contact head and mechanical end stops.
6. Attach to a fixture before attaching to an instrument.
7. Validate one action per instrument before testing performance sequences.

## 3D artifacts

The files in `hardware/models/` are conceptual engineering models. They are useful for discussing component placement and motion paths, but they are not tolerance-controlled manufacturing drawings. A fabrication release still needs part dimensions, material specifications, fastener selection, load calculations, assembly drawings, and a verified bill of materials.
