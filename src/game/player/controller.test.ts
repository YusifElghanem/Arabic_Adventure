import { describe, expect, it } from 'vitest';
import { COYOTE_TIME, DOUBLE_JUMP_SPEED, GROUND_ACCEL, JUMP_BUFFER, JUMP_SPEED, MAX_FALL_SPEED, MOVE_SPEED } from '../constants';
import { createControllerState, stepController } from './controller';

const DT = 1 / 60;
const idle = { axis: 0, jumpPresses: 0 };

describe('stepController', () => {
  it('accelerates smoothly up to the move speed', () => {
    const s = createControllerState();
    let vx = 0;
    let t = 0;
    const first = stepController(s, { axis: 1, jumpPresses: 0 }, { vx, vy: 0, grounded: true, now: t, dt: DT });
    expect(first.vx).toBeCloseTo(GROUND_ACCEL * DT);
    for (let i = 0; i < 60; i++) {
      vx = stepController(s, { axis: 1, jumpPresses: 0 }, { vx, vy: 0, grounded: true, now: (t += DT), dt: DT }).vx;
    }
    expect(vx).toBe(MOVE_SPEED);
  });

  it('brakes to a stop without input', () => {
    const s = createControllerState();
    let vx = MOVE_SPEED;
    for (let i = 0; i < 30; i++) vx = stepController(s, idle, { vx, vy: 0, grounded: true, now: i * DT, dt: DT }).vx;
    expect(vx).toBe(0);
  });

  it('jumps on a fresh press while grounded, and only once per press', () => {
    const s = createControllerState();
    const a = stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 0, grounded: true, now: 1, dt: DT });
    expect(a).toMatchObject({ jumped: true, vy: -JUMP_SPEED });
    const b = stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 0, grounded: true, now: 1 + DT, dt: DT });
    expect(b.jumped).toBe(false);
  });

  it('allows a jump shortly after walking off a ledge (coyote time)', () => {
    const s = createControllerState();
    stepController(s, idle, { vx: 0, vy: 0, grounded: true, now: 1, dt: DT });
    const late = stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 50, grounded: false, now: 1 + COYOTE_TIME * 0.9, dt: DT });
    expect(late.jumped).toBe(true);
  });

  it('double-jumps once in the air (a bit higher), then refuses until landing', () => {
    const s = createControllerState();
    stepController(s, idle, { vx: 0, vy: 0, grounded: true, now: 1, dt: DT });
    const air = { vx: 0, vy: 300, grounded: false, dt: DT };
    const second = stepController(s, { axis: 0, jumpPresses: 1 }, { ...air, now: 1 + COYOTE_TIME + 0.05 });
    expect(second).toMatchObject({ jumped: true, doubleJumped: true, vy: -DOUBLE_JUMP_SPEED });
    expect(DOUBLE_JUMP_SPEED).toBeGreaterThan(JUMP_SPEED);
    const third = stepController(s, { axis: 0, jumpPresses: 2 }, { ...air, now: 1.5 });
    expect(third.jumped).toBe(false);
    stepController(s, idle, { vx: 0, vy: 0, grounded: true, now: 3, dt: DT });
    stepController(s, { axis: 0, jumpPresses: 3 }, { vx: 0, vy: 0, grounded: true, now: 3 + DT, dt: DT });
    expect(stepController(s, { axis: 0, jumpPresses: 4 }, { ...air, now: 3.5 }).doubleJumped).toBe(true);
  });

  it('remembers a press made just before landing (jump buffer)', () => {
    const s = createControllerState();
    s.airJumpsLeft = 0; // double jump already used
    stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 400, grounded: false, now: 5, dt: DT });
    const landed = stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 0, grounded: true, now: 5 + JUMP_BUFFER * 0.8, dt: DT });
    expect(landed.jumped).toBe(true);
  });

  it('forgets a press made long before landing', () => {
    const s = createControllerState();
    s.airJumpsLeft = 0;
    stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 400, grounded: false, now: 5, dt: DT });
    const landed = stepController(s, { axis: 0, jumpPresses: 1 }, { vx: 0, vy: 0, grounded: true, now: 5 + JUMP_BUFFER + 0.1, dt: DT });
    expect(landed.jumped).toBe(false);
  });

  it('caps the fall speed', () => {
    const s = createControllerState();
    expect(stepController(s, idle, { vx: 0, vy: 5000, grounded: false, now: 0, dt: DT }).vy).toBe(MAX_FALL_SPEED);
  });

  it('ignores presses that happened before the controller was created', () => {
    const s = createControllerState(7);
    expect(stepController(s, { axis: 0, jumpPresses: 7 }, { vx: 0, vy: 0, grounded: true, now: 0, dt: DT }).jumped).toBe(false);
  });
});
