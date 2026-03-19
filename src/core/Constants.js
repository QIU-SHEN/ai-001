// ============================================
// Constants
// ============================================

// Canvas
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const GROUND_Y = 480;
export const PLAYER_X = 100;

// Physics
export const GRAVITY_UP = 0.5;
export const GRAVITY_DOWN = 0.9;
export const JUMP_FORCE = -13;
export const JUMP_FORCE_SECOND = -10;

// Speed
export const START_SPEED = 3.5;
export const BASE_SPEED = 5;
export const MAX_SPEED = 16;

// Timing
export const COYOTE_TIME = 6; // ~100ms at 60fps
export const INPUT_BUFFER = 7; // ~120ms at 60fps
export const HIT_STOP = 3; // ~50ms
export const SLOW_MO_DURATION = 18; // ~300ms
export const PERFECT_JUMP_MIN = 10;  // 完美跳跃最小距离（像素）
export const PERFECT_JUMP_MAX = 45;  // 完美跳跃最大距离（像素）

// Near Miss 慢动作
export const NEAR_MISS_SLOWMO = 6; // ~0.1秒 (0.8x速度)
export const NEAR_MISS_SPEED = 0.8; // 慢动作速度乘数

// Slide boost
export const SLIDE_BOOST_MIN = 1.03;
export const SLIDE_BOOST_MAX = 1.10;

// Combo 系统
export const COMBO_THRESHOLD = 5; // 每5次获得奖励
export const COMBO_IMMUNITY = 1; // 免疫次数

// Difficulty Phases
export const PHASES = [
  { maxScore: 350, speedMult: 0.6, interval: 140, patterns: [['low']] },
  { maxScore: 800, speedMult: 0.85, interval: 110, patterns: [['low'], ['low', 'low'], ['air']] },
  { maxScore: 2000, speedMult: 1.1, interval: 90, patterns: [['low'], ['air'], ['low', 'air'], ['air', 'low']] },
  { maxScore: Infinity, speedMult: 1.3, interval: 75, patterns: [['low'], ['air'], ['low', 'air'], ['air', 'low'], ['low', 'low']] }
];

// Utility
export function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
export function easeInQuad(t) { return t * t; }
export function lerp(a, b, t) { return a + (b - a) * t; }
