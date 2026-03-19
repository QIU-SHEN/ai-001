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
- **难度渐进**：随分数提升速度和障碍频率
- **评分系统**：
  - < 200分："还需努力"
  - 200-500分："不错"
  - 500-1000分："很强"
  - 1000+分："精英"

## 操作方式

| 按键 | 功能 |
|-----|------|
| `空格` | 跳跃（双击二段跳） |
| `↓` 或 `S` | 滑铲（按住） |
| `鼠标点击` | 跳跃 |

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
│   │   ├── Game.js         # 主游戏逻辑
│   │   ├── Input.js        # 输入处理
│   │   └── Time.js         # 时间管理（慢动作等）
│   ├── entities/       # 游戏实体
│   │   ├── Player.js       # 玩家角色
│   │   └── Obstacle.js     # 障碍物
│   ├── systems/        # 游戏系统
│   │   ├── ParticleSystem.js   # 粒子系统
│   │   ├── ObstacleManager.js  # 障碍管理
│   │   ├── TrailSystem.js      # 拖尾系统
│   │   └── SoundSystem.js      # 音效系统
│   └── render/         # 渲染相关
│       └── Renderer.js     # 渲染器
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
