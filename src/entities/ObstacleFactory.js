// ============================================
// ObstacleFactory - 障碍工厂（支持扩展）
// ============================================
import { Obstacle } from './Obstacle.js';
import { OBSTACLE_TYPES } from '../core/Level.js';

export class ObstacleFactory {
  static create(data) {
    const { type, xOffset = 0 } = data;
    
    switch (type) {
      case OBSTACLE_TYPES.LOW:
        return this.createLowObstacle(data);
      case OBSTACLE_TYPES.AIR:
        return this.createAirObstacle(data);
      default:
        console.warn(`Unknown obstacle type: ${type}`);
        return null;
    }
  }
  
  static createLowObstacle(data) {
    // 从右侧屏幕外生成，可加上 xOffset 偏移
    const spawnX = data.spawnX || 1000;
    return new Obstacle('low', spawnX + (data.xOffset || 0));
  }
  
  static createAirObstacle(data) {
    const spawnX = data.spawnX || 1000;
    return new Obstacle('air', spawnX + (data.xOffset || 0));
  }
}
