// ============================================
// Time - 处理时间缩放、帧率等
// ============================================
import { HIT_STOP, SLOW_MO_DURATION } from './Constants.js';

export class Time {
  constructor() {
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.deltaTime = 0;
    this.lastTime = 0;
  }

  update(timestamp) {
    if (this.lastTime === 0) {
      this.deltaTime = 16.67; // Assume 60fps for first frame
    } else {
      this.deltaTime = timestamp - this.lastTime;
    }
    this.lastTime = timestamp;
  }

  getTimeScale() {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer--;
      return 0;
    }
    if (this.slowMoTimer > 0) {
      this.slowMoTimer--;
      return 0.3;
    }
    return 1;
  }

  triggerHit() {
    this.hitStopTimer = HIT_STOP;
    this.slowMoTimer = SLOW_MO_DURATION;
  }

  reset() {
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.deltaTime = 0;
    this.lastTime = 0;
  }
}
