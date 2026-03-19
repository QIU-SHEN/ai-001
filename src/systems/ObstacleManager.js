// ============================================
// Obstacle Manager (Pattern-based)
// ============================================
import { CANVAS_WIDTH, PHASES } from '../core/Constants.js';
import { Obstacle } from '../entities/Obstacle.js';

export class ObstacleManager {
  constructor(game) {
    this.game = game;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.currentPattern = null;
    this.patternIndex = 0;
    this.reactionTime = 0.5;
  }
  
  getCurrentPhase() {
    const score = this.game.score;
    for (const phase of PHASES) {
      if (score < phase.maxScore) return phase;
    }
    return PHASES[PHASES.length - 1];
  }
  
  getSpawnInterval() {
    const phase = this.getCurrentPhase();
    return phase.interval + (Math.random() - 0.5) * 20;
  }
  
  getMinDistance() {
    return this.game.currentSpeed * this.reactionTime * 60;
  }
  
  update(timeScale) {
    const phase = this.getCurrentPhase();
    
    // Continue current pattern
    if (this.currentPattern && this.patternIndex < this.currentPattern.length) {
      const lastObstacle = this.obstacles[this.obstacles.length - 1];
      const minSpacing = this.getMinDistance() * 0.6;
      
      if (!lastObstacle || (CANVAS_WIDTH + 50 - lastObstacle.x >= minSpacing)) {
        const type = this.currentPattern[this.patternIndex];
        this.obstacles.push(new Obstacle(type, CANVAS_WIDTH + 50));
        this.patternIndex++;
      }
    } else if (this.spawnTimer <= 0) {
      // Start new pattern
      const patterns = phase.patterns;
      this.currentPattern = patterns[Math.floor(Math.random() * patterns.length)];
      this.patternIndex = 0;
      this.spawnTimer = this.getSpawnInterval();
    }
    
    this.spawnTimer -= timeScale;
    
    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(this.game.currentSpeed, timeScale);
      
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }
  }
  
  draw(ctx) {
    this.obstacles.forEach(obs => obs.draw(ctx));
  }
  
  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.currentPattern = null;
    this.patternIndex = 0;
  }
}
