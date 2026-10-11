import type { Game } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  BINDINGS,
  BITE_SECONDS,
  BOARD_X,
  BOARD_Y,
  CELL,
  CUES,
  COMBO_MAX,
  COMBO_WINDOW,
  COIL_DEBUG_VERSION,
  CUE_PATHS,
  DIRECTIONS,
  GRID_COLS,
  GRID_ROWS,
  HEAD_FRAMES,
  INTERIOR_MAX_COL,
  INTERIOR_MAX_ROW,
  INTERIOR_MIN_COL,
  INTERIOR_MIN_ROW,
  MODE,
  OBSTACLE_CELLS,
  OVER_ITEMS,
  PELLET_POINTS,
  SCREENS,
  SPRITE_PATHS,
  START_CELLS,
  START_DIR,
  STAGE_CX,
  TAGLINE_TEXT,
  TITLE_ITEMS,
  TITLE_TEXT,
  GAMEOVER_TEXT,
  CLEARED_TEXT,
  SCORE_LABEL,
  BEST_LABEL,
  MODE_LABEL,
  TICK_SECONDS,
  TURN_QUEUE_MAX,
  PAUSE_ITEMS,
} from "./constants";
import type { Cell, Direction, Screen } from "./constants";

export const BACKGROUND = "#070b18";
type Rect = { x: number; y: number; w: number; h: number };
export interface CoilState {
  screen: Screen;
  menuIndex: number;
  titleIndex: number;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: Direction;
  turns: Direction[];
  snake: Cell[];
  pellet: Cell | null;
  obstacles: Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: Cell | null;
  accumulator: number;
  bite: number;
  particles: { x: number; y: number; life: number; color: string }[];
  pointerDownIndex: number | null;
}
type Snapshot = {
  version: number;
  screen: Screen;
  menuIndex: number;
  titleIndex: number;
  mode: string;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: Direction;
  turns: Direction[];
  snake: Cell[];
  pellet: Cell | null;
  obstacles: Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: Cell | null;
};
export interface CoilDebugApi {
  version: number;
  reset(s: DeepReadonly<CoilState>): CoilState;
  reconcile(s: DeepReadonly<CoilState>): CoilState;
  snapshot(s: DeepReadonly<CoilState>): Snapshot;
  menuItemRect(s: DeepReadonly<CoilState>, index: number): Rect | null;
  setScreen(s: DeepReadonly<CoilState>, screen: Screen): CoilState;
  setMenuIndex(s: DeepReadonly<CoilState>, index: number): CoilState;
  setScore(s: DeepReadonly<CoilState>, points: number): CoilState;
  setBest(s: DeepReadonly<CoilState>, points: number): CoilState;
  setCombo(s: DeepReadonly<CoilState>, multiplier: number): CoilState;
  setComboWindow(s: DeepReadonly<CoilState>, seconds: number): CoilState;
  setSnake(s: DeepReadonly<CoilState>, cells: Cell[]): CoilState;
  setDirection(s: DeepReadonly<CoilState>, dir: Direction): CoilState;
  clearTurns(s: DeepReadonly<CoilState>): CoilState;
  setSnakeSteering(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setSnakeTravel(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setPellet(s: DeepReadonly<CoilState>, col: number, row: number): CoilState;
  clearPellet(s: DeepReadonly<CoilState>): CoilState;
  setPelletRespawn(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setNextPellet(
    s: DeepReadonly<CoilState>,
    col: number,
    row: number,
  ): CoilState;
  drawPelletCell(s: DeepReadonly<CoilState>): Cell | null;
}
let sprites: Record<string, ImageBitmap> = {};
const clone = (s: DeepReadonly<CoilState>): CoilState => ({
  ...s,
  turns: [...s.turns],
  snake: s.snake.map((c) => ({ ...c })),
  pellet: s.pellet && { ...s.pellet },
  obstacles: s.obstacles.map((c) => ({ ...c })),
  nextPellet: s.nextPellet && { ...s.nextPellet },
  particles: s.particles.map((p) => ({ ...p })),
});
const initial = (best = 0, muted = false): CoilState => ({
  screen: "title",
  menuIndex: 0,
  titleIndex: 0,
  score: 0,
  best,
  combo: 1,
  comboWindow: 0,
  muted,
  ticks: 0,
  simTime: 0,
  dir: START_DIR as Direction,
  turns: [],
  snake: START_CELLS.map((c) => ({ ...c })),
  pellet: null,
  obstacles: OBSTACLE_CELLS.map((c) => ({ ...c })),
  steering: true,
  travel: true,
  pelletRespawn: true,
  nextPellet: null,
  accumulator: 0,
  bite: 0,
  particles: [],
  pointerDownIndex: null,
});
const menuFor = (screen: Screen): readonly string[] =>
  screen === "title"
    ? TITLE_ITEMS
    : screen === "paused"
      ? PAUSE_ITEMS
      : screen === "gameover" || screen === "cleared"
        ? OVER_ITEMS
        : screen === "howto"
          ? ["BACK"]
          : [];
const rectFor = (index: number): Rect => ({
  x: STAGE_CX - 150,
  y: 430 + index * 58,
  w: 300,
  h: 46,
});
const validCell = (s: DeepReadonly<CoilState>, c: Cell, excludePellet = true) =>
  c.col >= INTERIOR_MIN_COL &&
  c.col <= INTERIOR_MAX_COL &&
  c.row >= INTERIOR_MIN_ROW &&
  c.row <= INTERIOR_MAX_ROW &&
  !s.snake.some((x) => x.col === c.col && x.row === c.row) &&
  !s.obstacles.some((x) => x.col === c.col && x.row === c.row) &&
  (!excludePellet ||
    !s.pellet ||
    c.col !== s.pellet.col ||
    c.row !== s.pellet.row);
const drawCell = (s: DeepReadonly<CoilState>): Cell | null => {
  const a: Cell[] = [];
  for (let row = INTERIOR_MIN_ROW; row <= INTERIOR_MAX_ROW; row++)
    for (let col = INTERIOR_MIN_COL; col <= INTERIOR_MAX_COL; col++) {
      const c = { col, row };
      if (validCell(s, c)) a.push(c);
    }
  return a.length ? a[Math.floor(Math.random() * a.length)]! : null;
};
const spawn = (s: CoilState): CoilState => {
  const c =
    s.nextPellet && validCell(s, s.nextPellet) ? s.nextPellet : drawCell(s);
  return {
    ...s,
    pellet: c && { ...c },
    nextPellet: null,
    screen: c ? "playing" : "cleared",
    menuIndex: 0,
  };
};
const startRound = (s: CoilState): CoilState => {
  const n = { ...initial(s.best, s.muted), screen: "playing" as Screen };
  return spawn(n);
};
const activateMenu = (
  s: CoilState,
  api: Parameters<Game<CoilState, CoilDebugApi>["update"]>[1],
): CoilState => {
  const item = menuFor(s.screen)[s.menuIndex];
  if (s.screen === "title") {
    s.titleIndex = s.menuIndex;
    if (s.menuIndex === 0) {
      s = startRound(s);
      api.audio.loop(CUES.music);
    } else {
      s.screen = "howto";
      s.menuIndex = 0;
    }
  } else if (s.screen === "howto") {
    s.screen = "title";
    s.menuIndex = s.titleIndex;
  } else if (s.screen === "paused") {
    if (item === "RESUME") s.screen = "playing";
    else if (item === "RESTART") {
      s = startRound(s);
      api.audio.loop(CUES.music);
    } else {
      s.screen = "title";
      s.menuIndex = s.titleIndex;
      api.audio.stop(CUES.music);
    }
  } else if (s.screen === "gameover" || s.screen === "cleared") {
    if (item === "PLAY AGAIN") {
      s = startRound(s);
      api.audio.loop(CUES.music);
    } else {
      s.screen = "title";
      s.menuIndex = s.titleIndex;
      api.audio.stop(CUES.music);
    }
  }
  return s;
};
const assert = (ok: boolean, msg: string): void => {
  if (!ok) throw new RangeError(msg);
};
const debug: CoilDebugApi = {
  version: COIL_DEBUG_VERSION,
  reset: (s) => initial(0, s.muted),
  reconcile: (s) => clone(s),
  snapshot: (s) => ({
    version: COIL_DEBUG_VERSION,
    screen: s.screen,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    mode: MODE,
    score: s.score,
    best: s.best,
    combo: s.combo,
    comboWindow: s.comboWindow,
    muted: s.muted,
    ticks: s.ticks,
    simTime: s.simTime,
    dir: s.dir,
    turns: [...s.turns],
    snake: s.snake.map((c) => ({ ...c })),
    pellet: s.pellet && { ...s.pellet },
    obstacles: s.obstacles.map((c) => ({ ...c })),
    steering: s.steering,
    travel: s.travel,
    pelletRespawn: s.pelletRespawn,
    nextPellet: s.nextPellet && { ...s.nextPellet },
  }),
  menuItemRect: (s, i) =>
    Number.isInteger(i) && i >= 0 && i < menuFor(s.screen).length
      ? rectFor(i)
      : null,
  setScreen: (s, screen) => {
    assert((SCREENS as readonly string[]).includes(screen), "invalid screen");
    return { ...clone(s), screen };
  },
  setMenuIndex: (s, index) => {
    assert(
      Number.isInteger(index) &&
        index >= 0 &&
        (s.screen === "playing"
          ? index === 0
          : index < menuFor(s.screen).length),
      "invalid menu index",
    );
    return { ...clone(s), menuIndex: index };
  },
  setScore: (s, points) => {
    assert(Number.isInteger(points) && points >= 0, "invalid score");
    return { ...clone(s), score: points };
  },
  setBest: (s, points) => {
    assert(Number.isInteger(points) && points >= 0, "invalid best");
    return { ...clone(s), best: points };
  },
  setCombo: (s, m) => {
    assert(Number.isInteger(m) && m >= 1 && m <= COMBO_MAX, "invalid combo");
    return { ...clone(s), combo: m };
  },
  setComboWindow: (s, v) => {
    assert(
      Number.isFinite(v) && v >= 0 && v <= COMBO_WINDOW,
      "invalid combo window",
    );
    return { ...clone(s), comboWindow: v };
  },
  setSnake: (s, cells) => {
    assert(cells.length > 0, "snake must not be empty");
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      assert(
        Number.isInteger(c.col) && Number.isInteger(c.row),
        "invalid snake cell",
      );
      assert(
        c.col >= 1 &&
          c.col < GRID_COLS - 1 &&
          c.row >= 1 &&
          c.row < GRID_ROWS - 1 &&
          !s.obstacles.some((o) => o.col === c.col && o.row === c.row),
        "invalid snake cell",
      );
      assert(
        !cells.slice(0, i).some((o) => o.col === c.col && o.row === c.row),
        "repeated snake cell",
      );
      if (i)
        assert(
          Math.abs(c.col - cells[i - 1]!.col) +
            Math.abs(c.row - cells[i - 1]!.row) ===
            1,
          "snake must be contiguous",
        );
    }
    return { ...clone(s), snake: cells.map((c) => ({ ...c })) };
  },
  setDirection: (s, dir) => {
    assert(
      (DIRECTIONS as readonly string[]).includes(dir),
      "invalid direction",
    );
    return { ...clone(s), dir };
  },
  clearTurns: (s) => ({ ...clone(s), turns: [] }),
  setSnakeSteering: (s, v) => {
    assert(typeof v === "boolean", "invalid steering switch");
    return { ...clone(s), steering: v };
  },
  setSnakeTravel: (s, v) => {
    assert(typeof v === "boolean", "invalid travel switch");
    return { ...clone(s), travel: v };
  },
  setPellet: (s, col, row) => {
    const c = { col, row };
    assert(
      Number.isInteger(col) && Number.isInteger(row) && validCell(s, c, false),
      "invalid pellet cell",
    );
    return { ...clone(s), pellet: c };
  },
  clearPellet: (s) => ({ ...clone(s), pellet: null }),
  setPelletRespawn: (s, v) => {
    assert(typeof v === "boolean", "invalid respawn switch");
    return { ...clone(s), pelletRespawn: v };
  },
  setNextPellet: (s, col, row) => {
    assert(
      Number.isInteger(col) &&
        Number.isInteger(row) &&
        col >= 0 &&
        col < GRID_COLS &&
        row >= 0 &&
        row < GRID_ROWS,
      "invalid next pellet",
    );
    return { ...clone(s), nextPellet: { col, row } };
  },
  drawPelletCell: (s) => drawCell(s),
};

export const game: Game<CoilState, CoilDebugApi> = {
  async initialize(api) {
    for (const a of ACTIONS) api.input.register(a, { keys: [...BINDINGS[a]] });
    sprites = {};
    for (const p of SPRITE_PATHS.head)
      sprites[p] = await api.assets.loadImage(p);
    for (const p of [SPRITE_PATHS.body, SPRITE_PATHS.corner, SPRITE_PATHS.tail])
      sprites[p] = await api.assets.loadImage(p);
    for (const cue of Object.values(CUES)) {
      if (cue === CUES.music) continue;
      await api.audio.load(cue, CUE_PATHS[cue]);
    }
    await api.audio.load(CUES.music, CUE_PATHS.music);
    for (const [n, f] of Object.entries({
      screen: (s: DeepReadonly<CoilState>) => s.screen,
      score: (s: DeepReadonly<CoilState>) => s.score,
      best: (s: DeepReadonly<CoilState>) => s.best,
      combo: (s: DeepReadonly<CoilState>) => s.combo,
      window: (s: DeepReadonly<CoilState>) => s.comboWindow,
      dir: (s: DeepReadonly<CoilState>) => s.dir,
      length: (s: DeepReadonly<CoilState>) => s.snake.length,
      head: (s: DeepReadonly<CoilState>) =>
        `${s.snake[0]?.col},${s.snake[0]?.row}`,
      pellet: (s: DeepReadonly<CoilState>) =>
        s.pellet ? `${s.pellet.col},${s.pellet.row}` : "none",
    }))
      api.diagnostics.register(n, f);
    return [initial(), debug];
  },
  update(state, api, dt) {
    let s = clone(state);
    s.best = Math.max(s.best, s.score);
    s.muted = api.audio.muted();
    for (const a of ACTIONS)
      if (api.input.pressed(a)) {
        if (a === "mute") api.audio.setMuted(!s.muted);
        else if (
          s.screen === "playing" &&
          ["up", "down", "left", "right"].includes(a)
        ) {
          if (s.steering && s.turns.length < TURN_QUEUE_MAX)
            s.turns.push(a as Direction);
        } else if (
          (a === "pause" && s.screen === "playing") ||
          (a === "back" && s.screen === "playing")
        ) {
          s.screen = "paused";
          s.menuIndex = 0;
        } else if (s.screen === "paused" && (a === "pause" || a === "back")) {
          s.screen = "playing";
        } else if (
          (a === "back" && s.screen === "howto") ||
          (a === "back" && (s.screen === "gameover" || s.screen === "cleared"))
        ) {
          s.screen = "title";
          s.menuIndex = s.titleIndex;
        } else if (
          (s.screen !== "playing" && a === "up") ||
          (s.screen !== "playing" && a === "down")
        ) {
          const m = menuFor(s.screen);
          if (m.length)
            s.menuIndex =
              (s.menuIndex + (a === "up" ? m.length - 1 : 1)) % m.length;
        } else if (a === "confirm" && s.screen !== "playing") {
          s = activateMenu(s, api);
        }
      }
    const samples = api.input.pointerSamples();
    const itemAt = (x: number, y: number): number | null => {
      for (let i = 0; i < menuFor(s.screen).length; i++) {
        const r = rectFor(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      }
      return null;
    };
    for (const p of samples) {
      const index = itemAt(p.x, p.y);
      if (index !== null) s.menuIndex = index;
      if (p.type === "down") s.pointerDownIndex = index;
      if (p.type === "up") {
        if (index !== null && index === s.pointerDownIndex)
          s = activateMenu(s, api);
        s.pointerDownIndex = null;
      }
    }
    if (s.screen === "playing") {
      s.simTime += dt;
      s.accumulator += dt;
      s.bite = Math.max(0, s.bite - dt);
      while (s.accumulator >= TICK_SECONDS && s.screen === "playing") {
        s.accumulator -= TICK_SECONDS;
        s.ticks++;
        if (s.steering && s.turns.length) {
          const d = s.turns.shift()!;
          const horizontal = s.dir === "left" || s.dir === "right";
          const nextHorizontal = d === "left" || d === "right";
          if (horizontal !== nextHorizontal) s.dir = d;
        }
        if (s.travel) {
          const h = s.snake[0]!;
          const delta = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0],
          }[s.dir]!;
          const nh = { col: h.col + delta[0]!, row: h.row + delta[1]! };
          const eat =
            !!s.pellet && nh.col === s.pellet.col && nh.row === s.pellet.row;
          const body = eat ? s.snake : s.snake.slice(0, -1);
          if (
            nh.col <= 0 ||
            nh.col >= GRID_COLS - 1 ||
            nh.row <= 0 ||
            nh.row >= GRID_ROWS - 1 ||
            s.obstacles.some((c) => c.col === nh.col && c.row === nh.row) ||
            body.some((c) => c.col === nh.col && c.row === nh.row)
          ) {
            s.screen = "gameover";
            s.menuIndex = 0;
            api.audio.stop(CUES.music);
            api.audio.play(CUES.death);
            s.accumulator = 0;
            break;
          }
          s.snake = [nh, ...(eat ? s.snake : s.snake.slice(0, -1))];
          if (eat) {
            const old = s.combo;
            s.combo = s.comboWindow > 0 ? Math.min(COMBO_MAX, s.combo + 1) : 1;
            s.score += PELLET_POINTS * s.combo;
            s.best = Math.max(s.best, s.score);
            s.comboWindow = COMBO_WINDOW;
            s.bite = BITE_SECONDS;
            s.particles = Array.from({ length: 14 }, (_, i) => ({
              x: BOARD_X + nh.col * CELL + 16,
              y: BOARD_Y + nh.row * CELL + 16,
              life: 0.35 + (i % 4) * 0.06,
              color: ["#7ef9ff", "#fa48d1", "#ffe66d"][i % 3]!,
            }));
            api.audio.play(CUES.eat);
            if (s.combo > old) api.audio.play(CUES.comboUp);
            if (s.pelletRespawn) {
              s = spawn(s);
              if (s.screen === "cleared") {
                s.accumulator = 0;
                api.audio.stop(CUES.music);
                s.menuIndex = 0;
              }
            } else s.pellet = null;
          }
        }
        s.comboWindow = Math.max(0, s.comboWindow - TICK_SECONDS);
        if (s.comboWindow === 0) s.combo = 1;
      }
    }
    s.muted = api.audio.muted();
    s.particles = s.particles
      .map((p) => ({ ...p, life: p.life - dt }))
      .filter((p) => p.life > 0);
    return s;
  },
  render(state, api) {
    const c = api.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#070b18";
    c.fillRect(0, 0, 1280, 720);
    const grad = c.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, "#101c38");
    grad.addColorStop(1, "#090d20");
    c.fillStyle = grad;
    c.fillRect(0, 0, 1280, 720);
    c.fillStyle = "#0a1022";
    c.fillRect(BOARD_X, BOARD_Y, CELL * GRID_COLS, CELL * GRID_ROWS);
    for (let r = 0; r < GRID_ROWS; r++)
      for (let col = 0; col < GRID_COLS; col++) {
        const x = BOARD_X + col * CELL,
          y = BOARD_Y + r * CELL;
        if (
          r === 0 ||
          col === 0 ||
          r === GRID_ROWS - 1 ||
          col === GRID_COLS - 1
        ) {
          c.fillStyle = "#182849";
          c.fillRect(x, y, CELL, CELL);
          c.strokeStyle = "#305778";
          c.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        } else {
          c.strokeStyle = "rgba(104,157,205,.09)";
          c.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
        }
      }
    c.fillStyle = "#53efff";
    c.font = "700 17px monospace";
    c.textAlign = "left";
    c.fillText(MODE_LABEL, BOARD_X, 40);
    c.fillStyle = "#8ca9ca";
    c.font = "12px monospace";
    c.fillText(SCORE_LABEL, 420, 25);
    c.fillText(BEST_LABEL, 610, 25);
    c.fillStyle = "#f2fbff";
    c.font = "700 28px monospace";
    c.fillText(String(state.score).padStart(4, "0"), 420, 58);
    c.fillText(String(state.best).padStart(4, "0"), 610, 58);
    if (state.combo >= 2) {
      c.fillStyle = "#ff4fd8";
      c.fillText(`x${state.combo}`, 820, 43);
      c.fillStyle = "#2b1e42";
      c.fillRect(820, 52, 110, 5);
      c.fillStyle = "#ff4fd8";
      c.fillRect(820, 52, (110 * state.comboWindow) / COMBO_WINDOW, 5);
    }
    c.fillStyle = state.muted ? "#ff6b75" : "#61728e";
    c.textAlign = "right";
    c.font = "12px monospace";
    c.fillText(state.muted ? "◉ MUTED" : "♫ SOUND ON", 1120, 34);
    for (const p of state.particles) {
      c.globalAlpha = Math.min(1, p.life / 0.15);
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, Math.max(1, (4 * p.life) / 0.4), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    if (state.pellet) {
      const x = BOARD_X + state.pellet.col * CELL + 16,
        y = BOARD_Y + state.pellet.row * CELL + 16;
      c.shadowColor = "#ff4fd8";
      c.shadowBlur = 22;
      c.fillStyle = "#ff4fd8";
      c.beginPath();
      c.arc(x, y, 8, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = "#fff0fb";
      c.beginPath();
      c.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = state.snake.length - 1; i >= 0; i--) {
      const cell = state.snake[i]!;
      const x = BOARD_X + cell.col * CELL,
        y = BOARD_Y + cell.row * CELL;
      let path: string;
      if (i === 0)
        path =
          SPRITE_PATHS.head[
            Math.min(
              HEAD_FRAMES - 1,
              state.bite > 0
                ? 1 +
                    Math.min(
                      2,
                      Math.floor(
                        (BITE_SECONDS - state.bite) / (BITE_SECONDS / 3),
                      ),
                    )
                : 0,
            )
          ]!;
      else if (i === state.snake.length - 1) path = SPRITE_PATHS.tail;
      else path = SPRITE_PATHS.body;
      try {
        const img = sprites[path];
        if (img) {
          let angle = 0;
          if (i === 0) {
            angle = (
              {
                right: 0,
                down: Math.PI / 2,
                left: Math.PI,
                up: -Math.PI / 2,
              } as const
            )[state.dir];
          } else if (i === state.snake.length - 1 && state.snake.length > 1) {
            const prev = state.snake[i - 1]!;
            const v = { col: prev.col - cell.col, row: prev.row - cell.row };
            angle =
              v.col > 0
                ? 0
                : v.row > 0
                  ? Math.PI / 2
                  : v.col < 0
                    ? Math.PI
                    : -Math.PI / 2;
          } else if (i > 0 && i < state.snake.length - 1) {
            const prev = state.snake[i - 1]!,
              next = state.snake[i + 1]!;
            const a = { x: prev.col - cell.col, y: prev.row - cell.row },
              b = { x: next.col - cell.col, y: next.row - cell.row };
            if (a.x !== -b.x && a.y !== -b.y) {
              const hasRight = a.x > 0 || b.x > 0,
                hasDown = a.y > 0 || b.y > 0,
                hasLeft = a.x < 0 || b.x < 0,
                hasUp = a.y < 0 || b.y < 0;
              angle =
                hasRight && hasDown
                  ? 0
                  : hasDown && hasLeft
                    ? Math.PI / 2
                    : hasLeft && hasUp
                      ? Math.PI
                      : -Math.PI / 2;
            }
          }
          c.save();
          c.translate(x + CELL / 2, y + CELL / 2);
          c.rotate(angle);
          c.drawImage(img, -CELL / 2, -CELL / 2, CELL, CELL);
          c.restore();
        } else throw new Error(`Missing Coil sprite: ${path}`);
      } catch {
        c.fillStyle = i === 0 ? "#e5ffff" : "#29cbd4";
        c.beginPath();
        c.roundRect(x + 3, y + 3, 26, 26, 12);
        c.fill();
      }
    }
    if (state.screen !== "playing") {
      c.fillStyle = "rgba(3,7,20,.73)";
      c.fillRect(BOARD_X, BOARD_Y, 960, 576);
      c.textAlign = "center";
      c.shadowColor = "#30eaff";
      c.shadowBlur = 22;
      c.fillStyle = "#e8fcff";
      c.font = "900 66px monospace";
      c.fillText(
        state.screen === "title"
          ? TITLE_TEXT
          : state.screen === "howto"
            ? "HOW TO PLAY"
            : state.screen === "paused"
              ? "PAUSED"
              : state.screen === "cleared"
                ? CLEARED_TEXT
                : GAMEOVER_TEXT,
        STAGE_CX,
        220,
      );
      c.shadowBlur = 0;
      if (state.screen === "title") {
        c.fillStyle = "#56dbe9";
        c.font = "16px monospace";
        c.fillText(TAGLINE_TEXT, STAGE_CX, 253);
        c.fillStyle = "#a1b6d2";
        c.fillText(`${BEST_LABEL}  ${state.best}`, STAGE_CX, 302);
      }
      if (state.screen === "howto") {
        c.fillStyle = "#bdd4ea";
        c.font = "15px monospace";
        [
          "The serpent never stops. Turns take effect on the next tick.",
          "Turn perpendicular; the wall and your own body are fatal.",
          "Pellets grow your coil. Quick eats raise your combo.",
          "Keep the pace: the multiplier falls when its timer runs out.",
          "ARROWS / WASD steer   ENTER select   P / ESC pause   M mute",
        ].forEach((line, i) => c.fillText(line, STAGE_CX, 310 + i * 29));
      }
      if (state.screen === "gameover" || state.screen === "cleared") {
        c.fillStyle = "#b4c6df";
        c.font = "16px monospace";
        c.fillText(
          `${SCORE_LABEL} ${state.score}     ${BEST_LABEL} ${state.best}`,
          STAGE_CX,
          290,
        );
      }
      menuFor(state.screen).forEach((item, i) => {
        const r = rectFor(i);
        c.fillStyle = i === state.menuIndex ? "#123c52" : "rgba(20,30,52,.7)";
        c.strokeStyle = i === state.menuIndex ? "#50f0ff" : "#32425f";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(r.x, r.y, r.w, r.h, 8);
        c.fill();
        c.stroke();
        c.fillStyle = i === state.menuIndex ? "#dffcff" : "#8aa4c5";
        c.font = "700 17px monospace";
        c.fillText(item, STAGE_CX, r.y + 29);
      });
    }
  },
};
