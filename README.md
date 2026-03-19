# 极简跑酷 (Minimal Endless Runner)

一个极简风格、注重手感的无尽跑酷游戏，基于 Electron 构建。

![游戏截图](screenshot.png)

## 游戏特色

- **极简美学**：黑白灰色调，干净利落
- **流畅手感**：非对称重力、输入缓冲、土狼时间
- **视觉特效**：
  - 高速时的运动拖尾
  - 粒子系统（跳跃扬尘、完美跳跃爆发、死亡爆炸）
  - 屏幕震动反馈
- **操作深度**：
  - 跳跃 + 二段跳
  - 滑铲（降低受击判定）
  - 完美跳跃机制（卡极限距离跳跃有额外奖励）
- **爽感系统**：
  - **连击系统**：完美跳跃积累连击数
  - **护盾机制**：每5次完美跳跃获得1次免死护盾
  - **冲锋状态**：有护盾时角色倾斜，表示处于冲锋状态
  - **滑行加速**：滑铲时速度提升（最高8%）
- **关卡系统（UGC）**：
  - **无尽模式**：经典跑酷，挑战高分
  - **关卡模式**：加载 JSON 关卡，通关挑战
  - **录制编辑器**：边玩边制作关卡，导出 JSON
  - **数据结构**：标准化 Level JSON（meta + config + timeline）
- **难度渐进**：随分数提升速度和障碍频率
- **评分系统**：
  - < 200分："还需努力"
  - 200-500分："不错"
  - 500-1000分："很强"
  - 1000+分："精英"

## 操作方式

### 游戏内操作

| 按键 | 功能 |
|-----|------|
| `空格` | 跳跃（双击二段跳） |
| `↓` 或 `S` | 滑铲（按住） |
| `鼠标点击` | 跳跃 |
| `ESC` | 返回主菜单 |

### 主菜单选择

| 按键 | 模式 |
|-----|------|
| `E` | 无尽模式 - 无限跑酷，挑战高分 |
| `L` | 关卡模式 - 挑战预设关卡 |
| `R` | 录制模式 - 制作自己的关卡 |

## 关卡编辑器（录制模式）

### 使用方法

1. 在主菜单按 `R` 进入录制模式
2. 游戏开始运行，此时**不会自动生成障碍**
3. 边跑边按数字键放置障碍：
   - `1` - 在玩家前方500px生成跳跃障碍（low）
   - `2` - 在玩家前方500px生成滑行障碍（air）
4. 按 `P` 导出完整关卡 JSON
5. 按 `R` 清空当前录制重新开始
6. 按 `Delete` 删除选中的障碍（编辑器模式）

### 导出格式

按 `P` 后，会输出完整的 Level JSON 格式：

```json
{
  "meta": {
    "name": "录制关卡",
    "author": "player",
    "version": 1
  },
  "config": {
    "baseSpeed": 6,
    "gravity": 1.2,
    "spawnOffset": 300
  },
  "timeline": [
    { "time": 1200, "type": "low", "xOffset": 0 },
    { "time": 2800, "type": "air", "xOffset": 0 }
  ]
}
```

### 加载自制关卡

**方法1：修改示例关卡（快速测试）**
编辑 `src/core/Game.js` 中的 `createExampleLevel()` 方法，粘贴你的 JSON。

**方法2：创建关卡文件（推荐）**
1. 在 `levels/` 目录创建 `.json` 文件
2. 粘贴导出的关卡数据
3. 实现文件加载器（后续版本支持）

### Level 数据结构

| 字段 | 说明 |
|-----|------|
| `meta.name` | 关卡名称 |
| `meta.author` | 作者 |
| `meta.version` | 数据版本 |
| `config.baseSpeed` | 初始速度 |
| `config.gravity` | 重力系数 |
| `config.spawnOffset` | 生成提前量 |
| `timeline[].time` | 触发时间（毫秒） |
| `timeline[].type` | 障碍类型：low/air |
| `timeline[].xOffset` | 位置偏移（可选） |

## 构建说明

### 环境要求

- [Node.js](https://nodejs.org/) (v16 或更高版本)

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
npm start
```

### 打包构建

```bash
# 构建安装版和便携版
npm run build

# 仅构建便携版
npm run build:portable
```

构建输出位于 `dist` 文件夹：
- `Minimal Endless Runner.exe` - 便携版（直接运行）
- `Minimal Endless Runner Setup.exe` - 安装程序

## 项目结构

```
minimal-endless-runner/
├── src/
│   ├── core/           # 核心系统
│   │   ├── Constants.js    # 游戏常量
│   │   ├── Level.js        # 关卡数据结构
│   │   ├── Game.js         # 主游戏逻辑
│   │   ├── Input.js        # 输入处理
│   │   └── Time.js         # 时间管理
│   ├── entities/       # 游戏实体
│   │   ├── Player.js       # 玩家角色
│   │   ├── Obstacle.js     # 障碍物
│   │   └── ObstacleFactory.js # 障碍工厂
│   ├── systems/        # 游戏系统
│   │   ├── ParticleSystem.js   # 粒子系统
│   │   ├── ObstacleManager.js  # 障碍管理
│   │   ├── TrailSystem.js      # 拖尾系统
│   │   └── SoundSystem.js      # 音效系统
│   ├── editor/         # 关卡编辑器
│   │   ├── Editor.js           # 编辑器核心
│   │   ├── Timeline.js         # 时间轴可视化
│   │   └── Inspector.js        # 属性检查器
│   └── render/         # 渲染相关
│       └── Renderer.js     # 渲染器
├── levels/             # 关卡仓库
│   └── level1.json     # 示例关卡
├── index.html          # 游戏界面
├── main.js             # Electron 主进程
├── package.json        # 项目配置
└── README.md           # 本文件
```

## 技术亮点

- 使用 `requestAnimationFrame` 实现流畅渲染
- 对象池技术管理粒子，减少垃圾回收
- 优化碰撞检测
- 模块化 ES6 架构，便于维护扩展

## 开源协议

MIT License
