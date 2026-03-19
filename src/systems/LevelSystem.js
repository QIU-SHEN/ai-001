// ============================================
// LevelSystem - 关卡系统（录制、回放、数据管理）
// ============================================
import { GAME_MODE } from '../core/Constants.js';

export class LevelSystem {
  constructor(game) {
    this.game = game;
    this.mode = GAME_MODE.ENDLESS;
    
    // 关卡数据
    this.levelData = [];
    this.currentIndex = 0;
    this.levelStartTime = 0;
    this.allSpawned = false;
    
    // 录制模式
    this.isRecording = false;
    this.recordedData = [];
    this.recordStartTime = 0;
  }
  
  // ========== 模式切换 ==========
  
  setMode(mode) {
    this.mode = mode;
    this.reset();
  }
  
  // ========== 关卡回放 ==========
  
  loadLevel(data) {
    this.levelData = [...data].sort((a, b) => a.time - b.time);
    this.currentIndex = 0;
    this.allSpawned = false;
    this.mode = GAME_MODE.LEVEL;
  }
  
  getNextObstacle() {
    if (this.currentIndex >= this.levelData.length) {
      this.allSpawned = true;
      return null;
    }
    return this.levelData[this.currentIndex];
  }
  
  advance() {
    this.currentIndex++;
  }
  
  // ========== 录制功能 ==========
  
  startRecording() {
    this.isRecording = true;
    this.recordedData = [];
    this.recordStartTime = performance.now();
    this.mode = GAME_MODE.EDITOR;
    console.log('[编辑器] 开始录制，按 1 放置 low，按 2 放置 air，R 清空，P 输出');
  }
  
  stopRecording() {
    this.isRecording = false;
  }
  
  recordObstacle(type) {
    if (!this.isRecording) return;
    
    const time = Math.floor(performance.now() - this.recordStartTime);
    this.recordedData.push({ time, type });
    
    console.log(`[编辑器] 记录: ${type} @ ${time}ms`);
    return { time, type }; // 返回数据供 Game.js 即时生成
  }
  
  clearRecording() {
    this.recordedData = [];
    this.recordStartTime = performance.now();
    console.log('[编辑器] 已清空记录');
  }
  
  exportLevel() {
    const json = JSON.stringify(this.recordedData, null, 2);
    console.log('[编辑器] 关卡数据：');
    console.log(json);
    
    // 同时复制到剪贴板（如果可用）
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        console.log('[编辑器] 已复制到剪贴板');
      });
    }
    
    return json;
  }
  
  // ========== 游戏流程 ==========
  
  onGameStart() {
    this.levelStartTime = performance.now();
    this.currentIndex = 0;
    this.allSpawned = false;
  }
  
  getLevelTime() {
    return performance.now() - this.levelStartTime;
  }
  
  checkWinCondition(obstaclesCleared) {
    if (this.mode !== GAME_MODE.LEVEL) return false;
    // 所有障碍已生成且全部通过（或被清除）
    return this.allSpawned && obstaclesCleared;
  }
  
  // ========== 重置 ==========
  
  reset() {
    this.currentIndex = 0;
    this.allSpawned = false;
    this.levelStartTime = 0;
  }
}
