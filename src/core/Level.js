// ============================================
// Level - 关卡数据结构和接口
// ============================================

export const OBSTACLE_TYPES = {
  LOW: 'low',
  AIR: 'air'
};

export const LEVEL_VERSION = 1;

// 创建空关卡
export function createEmptyLevel(name = 'New Level', author = 'unknown') {
  return {
    meta: {
      name,
      author,
      version: LEVEL_VERSION
    },
    config: {
      baseSpeed: 6,
      gravity: 1.2,
      spawnOffset: 300
    },
    timeline: []
  };
}

// 验证关卡数据
export function validateLevel(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid level data' };
  }
  
  if (!data.meta || !data.timeline || !data.config) {
    return { valid: false, error: 'Missing required fields (meta, config, timeline)' };
  }
  
  if (!Array.isArray(data.timeline)) {
    return { valid: false, error: 'timeline must be an array' };
  }
  
  for (const item of data.timeline) {
    if (typeof item.time !== 'number') {
      return { valid: false, error: 'Each timeline item must have a time number' };
    }
    if (!item.type || !Object.values(OBSTACLE_TYPES).includes(item.type)) {
      return { valid: false, error: `Invalid obstacle type: ${item.type}` };
    }
  }
  
  return { valid: true };
}

// 添加障碍到时间轴
export function addObstacle(level, time, type, xOffset = 0) {
  level.timeline.push({ time, type, xOffset });
  level.timeline.sort((a, b) => a.time - b.time);
  return level;
}

// 从时间轴移除障碍
export function removeObstacle(level, index) {
  level.timeline.splice(index, 1);
  return level;
}

// 导出为 JSON 字符串
export function exportLevel(level) {
  return JSON.stringify(level, null, 2);
}

// 从 JSON 字符串导入
export function importLevel(json) {
  try {
    const data = JSON.parse(json);
    const validation = validateLevel(data);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return data;
  } catch (e) {
    console.error('Failed to import level:', e.message);
    return null;
  }
}
