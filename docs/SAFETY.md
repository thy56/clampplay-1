# Safety Boundary

ClampPlay-1 can drive physical actuators. Treat every transition from simulation to hardware as a safety-critical engineering step.

## Non-negotiable controls

- Use a physical emergency stop that independently inhibits actuator power.
- Separate controller power from actuator power and use current limiting.
- Use soft contact materials where a mechanism touches an instrument.
- Add mechanical travel limits and a known neutral or released state.
- Reject invalid protocol frames and invalid actuator indexes.
- Release outputs after more than 1000 ms without a valid command.
- Require manual inspection and reset after an emergency stop.

## First hardware test

1. Do not attach the mechanism to an instrument or a person.
2. Test one actuator only.
3. Use the lowest practical output level and frequency.
4. Verify a command, release command, timeout release, and emergency stop.
5. Check heat, unexpected motion, mounting security, and contact-surface behavior.

Do not interpret browser animation, protocol unit tests, or concept renders as proof of hardware safety.
