// ============================================
// BeatRecorder - 音乐打点记录器
// ============================================

export class BeatRecorder {
  constructor(audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.events = [];
    this.lastEventTime = -Infinity; // 上次打点时间，用于防抖
    this.MIN_INTERVAL = 100; // 最小间隔 100ms，防止重复打点
    
    // 回调函数
    this.onEventAdded = null;
    this.onEventsCleared = null;
  }
  
  /**
   * 记录一个打点事件
   * @param {string} type - 事件类型：'low' 或 'air'，默认 'low'
   * @returns {Object|null} 返回创建的事件对象，如果防抖被拦截则返回 null
   */
  recordBeat(type = 'low') {
    if (!this.audioPlayer) {
      console.warn('[BeatRecorder] 未设置音频播放器');
      return null;
    }
    
    // 获取当前播放时间（毫秒）
    const time = this.audioPlayer.getCurrentTime();
    
    // 防抖检查：与上次事件时间间隔必须 >= MIN_INTERVAL
    if (time - this.lastEventTime < this.MIN_INTERVAL) {
      console.log('[BeatRecorder] 防抖拦截，时间间隔太短:', time - this.lastEventTime, 'ms');
      return null;
    }
    
    // 创建事件对象
    const event = {
      id: this.generateId(),
      time: Math.floor(time), // 取整毫秒
      type: type,
      xOffset: 0
    };
    
    // 添加到事件列表
    this.events.push(event);
    this.lastEventTime = time;
    
    // 按时间排序
    this.sortEvents();
    
    console.log('[BeatRecorder] 记录事件:', event);
    
    // 触发回调
    if (this.onEventAdded) {
      this.onEventAdded(event);
    }
    
    return event;
  }
  
  /**
   * 获取所有事件（按时间排序）
   * @returns {Array} 事件数组
   */
  getEvents() {
    return [...this.events]; // 返回副本，防止外部修改
  }
  
  /**
   * 清空所有事件
   */
  clear() {
    this.events = [];
    this.lastEventTime = -Infinity;
    
    console.log('[BeatRecorder] 已清空所有事件');
    
    if (this.onEventsCleared) {
      this.onEventsCleared();
    }
  }
  
  /**
   * 删除指定事件
   * @param {string} id - 事件ID
   */
  removeEvent(id) {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      const removed = this.events.splice(index, 1)[0];
      console.log('[BeatRecorder] 删除事件:', removed);
      return true;
    }
    return false;
  }
  
  /**
   * 获取事件数量
   * @returns {number}
   */
  getCount() {
    return this.events.length;
  }
  
  /**
   * 按时间排序事件
   */
  sortEvents() {
    this.events.sort((a, b) => a.time - b.time);
  }
  
  /**
   * 生成唯一ID
   * @returns {string}
   */
  generateId() {
    return 'e' + Date.now() + Math.random().toString(36).substr(2, 5);
  }
  
  /**
   * 导出关卡数据
   * @param {string} name - 关卡名称
   * @returns {Object} 完整的关卡 JSON 数据
   */
  exportLevel(name = 'Music Level') {
    return {
      meta: {
        name: name,
        author: 'user',
        version: '1.0',
        createdAt: new Date().toISOString()
      },
      config: {
        baseSpeed: 5,
        gravity: 1.2,
        spawnOffset: 600,
        preloadTime: 2000
      },
      timeline: this.getEvents()
    };
  }
}
