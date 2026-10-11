import { describe, expect, it } from "vitest";
import { TICK_SECONDS } from "./constants";
import { game } from "./game";
import type { CoilState } from "./game";

const state = (): CoilState => ({
  screen: "title",
  menuIndex: 0,
  titleIndex: 0,
  score: 0,
  best: 0,
  combo: 1,
  comboWindow: 0,
  muted: false,
  ticks: 0,
  simTime: 0,
  dir: "right",
  turns: [],
  snake: [
    { col: 15, row: 8 },
    { col: 14, row: 8 },
    { col: 13, row: 8 },
  ],
  pellet: null,
  obstacles: [],
  steering: true,
  travel: true,
  pelletRespawn: true,
  nextPellet: null,
  accumulator: 0,
  bite: 0,
  particles: [],
  pointerDownIndex: null,
});
const api = (pressed = new Set<string>()) =>
  ({
    input: {
      pressed: (name: string) => pressed.delete(name),
      pointerSamples: () => [],
      value: () => 0,
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      pointerContacts: () => [],
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      muted: () => false,
      setMuted: () => undefined,
      play: () => undefined,
      loop: () => undefined,
      stop: () => undefined,
      looping: () => false,
    },
  }) as never;

describe("Coil simulation", () => {
  it("advances by fixed ticks and carries fractional time", () => {
    const s = {
      ...state(),
      screen: "playing" as const,
      pellet: { col: 25, row: 12 },
    };
    const half = game.update(s, api(), TICK_SECONDS / 2);
    expect(half.snake[0]).toEqual({ col: 15, row: 8 });
    const moved = game.update(half, api(), TICK_SECONDS / 2);
    expect(moved.snake[0]).toEqual({ col: 16, row: 8 });
    expect(moved.ticks).toBe(1);
  });

  it("buffers perpendicular turns and rejects a reversal", () => {
    let s: CoilState = {
      ...state(),
      screen: "playing" as const,
      pellet: { col: 25, row: 12 },
    };
    s = game.update(s, api(new Set(["left"])), 0);
    expect(s.turns).toEqual(["left"]);
    s = game.update(s, api(), TICK_SECONDS);
    expect(s.dir).toBe("right");
    expect(s.turns).toEqual([]);
    s = game.update(s, api(new Set(["down"])), 0);
    s = game.update(s, api(), TICK_SECONDS);
    expect(s.dir).toBe("down");
  });

  it("scores a pellet, grows, and opens the combo window", () => {
    const s = {
      ...state(),
      screen: "playing" as const,
      pellet: { col: 16, row: 8 },
    };
    const next = game.update(s, api(), TICK_SECONDS);
    expect(next.score).toBe(10);
    expect(next.best).toBe(10);
    expect(next.snake).toHaveLength(4);
    expect(next.comboWindow).toBeGreaterThan(3);
    expect(next.pellet).not.toBeNull();
  });

  it("ends on a wall and spends excess accumulated time", () => {
    const s = {
      ...state(),
      screen: "playing" as const,
      snake: [{ col: 28, row: 5 }],
    };
    const next = game.update(s, api(), TICK_SECONDS * 4);
    expect(next.screen).toBe("gameover");
    expect(next.ticks).toBe(1);
    expect(next.accumulator).toBe(0);
  });
});

const initialize = async () => {
  const noop = () => undefined;
  const api = {
    input: { register: noop, layout: () => null },
    assets: { loadImage: async () => ({}) },
    audio: { load: async () => undefined },
    diagnostics: { register: noop },
  };
  return game.initialize(api as never);
};

describe("Coil debug surface", () => {
  it("reports and poses values without mutating the input", async () => {
    const [opening, debug] = await initialize();
    const posed = debug.setScore(opening, 120);
    expect(opening.score).toBe(0);
    expect(debug.snapshot(posed).score).toBe(120);
    const reconciled = debug.reconcile(posed);
    expect(debug.snapshot(reconciled).score).toBe(120);
    expect(debug.menuItemRect(opening, 0)).toMatchObject({ w: 300, h: 46 });
    expect(debug.menuItemRect(opening, 9)).toBeNull();
  });

  it("validates poses and resets the session while preserving mute", async () => {
    const [opening, debug] = await initialize();
    const muted = { ...opening, muted: true, best: 88 };
    expect(() => debug.setCombo(muted, 6)).toThrow(RangeError);
    expect(() =>
      debug.setSnake(muted, [
        { col: 3, row: 3 },
        { col: 5, row: 3 },
      ]),
    ).toThrow(RangeError);
    const reset = debug.reset(muted);
    expect(debug.snapshot(reset)).toMatchObject({
      screen: "title",
      best: 0,
      score: 0,
      muted: true,
      ticks: 0,
    });
  });
});
