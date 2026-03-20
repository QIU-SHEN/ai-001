// ============================================
// LevelLoader - 关卡数据验证与加载
// ============================================

export class LevelLoader {
  /**
   * 验证关卡数据格式
   * @param {Object} level - 关卡数据
   * @returns {boolean}
   * @throws {Error} 验证失败时抛出错误
   */
  static validate(level) {
    if (!level || typeof level !== 'object') {
      throw new Error('关卡数据无效');
    }

    // 检查必要字段
    if (!level.meta || typeof level.meta !== 'object') {
      throw new Error('缺少 meta 信息');
    }

    if (!level.config || typeof level.config !== 'object') {
      throw new Error('缺少 config 配置');
    }

    if (!Array.isArray(level.timeline)) {
      throw new Error('timeline 必须是数组');
    }

    // 验证时间轴事件
    level.timeline.forEach((event, index) => {
      if (typeof event.time !== 'number' || event.time < 0) {
        throw new Error(`第 ${index + 1} 个事件时间无效: ${event.time}`);
      }
      
      if (!event.type || !['low', 'air'].includes(event.type)) {
        throw new Error(`第 ${index + 1} 个事件类型无效: ${event.type}`);
      }

      // xOffset 是可选的
      if (event.xOffset !== undefined && typeof event.xOffset !== 'number') {
        throw new Error(`第 ${index + 1} 个事件 xOffset 无效`);
      }
    });

    // 验证配置值 (支持 baseSpeed/spawnOffset 或 speed/duration)
    const config = level.config;
    const speed = config.baseSpeed || config.speed;
    if (typeof speed !== 'number' || speed <= 0) {
      throw new Error('config.baseSpeed 或 config.speed 必须是正数');
    }

    return true;
  }

  /**
   * 验证并修复关卡数据（尝试自动修复小问题）
   * @param {Object} level - 关卡数据
   * @returns {Object} 修复后的关卡数据
   * @throws {Error} 无法修复时抛出错误
   */
  static validateAndFix(level) {
    if (!level || typeof level !== 'object') {
      throw new Error('关卡数据无效');
    }

    // 深拷贝避免修改原数据
    const fixed = JSON.parse(JSON.stringify(level));

    // 确保必要字段存在
    fixed.meta = fixed.meta || { name: 'Untitled', author: '', version: '1.0' };
    fixed.config = fixed.config || { baseSpeed: 5, spawnOffset: 600 };
    fixed.timeline = fixed.timeline || [];

    // 修复时间轴事件
    fixed.timeline = fixed.timeline
      .filter(e => e && typeof e === 'object')
      .map((event, index) => ({
        id: event.id || `e${Date.now()}_${index}`,
        time: typeof event.time === 'number' ? Math.max(0, event.time) : 0,
        type: ['low', 'air'].includes(event.type) ? event.type : 'low',
        xOffset: typeof event.xOffset === 'number' ? event.xOffset : 0
      }));

    // 按时间排序
    fixed.timeline.sort((a, b) => a.time - b.time);

    // 确保配置值有效 (兼容 baseSpeed/spawnOffset 格式)
    fixed.config.baseSpeed = Math.max(2, Math.min(15, fixed.config.baseSpeed || fixed.config.speed || 5));
    fixed.config.spawnOffset = Math.max(300, Math.min(1000, fixed.config.spawnOffset || 600));
    fixed.config.gravity = fixed.config.gravity || 1.2;

    return fixed;
  }

  /**
   * 从文件路径加载并验证关卡
   * @param {string} filePath
   * @returns {Promise<Object>}
   */
  static async loadFromFile(filePath) {
    const content = await window.electronAPI.readFile(filePath);
    const data = JSON.parse(content);
    
    // 先尝试验证，失败则尝试修复
    try {
      LevelLoader.validate(data);
      return data;
    } catch (e) {
      console.warn('[LevelLoader] 验证失败，尝试自动修复:', e.message);
      return LevelLoader.validateAndFix(data);
    }
  }
}
