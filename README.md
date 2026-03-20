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
- **本地关卡仓库系统**：
  - 选择任意本地文件夹作为关卡仓库
  - 自动扫描并列出所有 JSON 关卡
  - 自动记忆上次选择的仓库路径
  - 点击即可游玩关卡
- **关卡编辑器（UGC）**：
  - 可视化时间轴编辑
  - 拖拽调整障碍位置
  - 保存到仓库或导出 JSON
  - 实时 Playtest 测试
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
| `空格` 或 `↑` | 跳跃（双击二段跳） |
| `↓` 或 `S` | 滑铲（按住） |
| `鼠标点击` | 跳跃 |
| `ESC` | 返回主菜单 |

### 主菜单选择

| 按键 | 模式 |
|-----|------|
| `E` | 无尽模式 - 无限跑酷，挑战高分 |
| `T` | 关卡编辑器 - 可视化编辑关卡 |
| `R` | 关卡仓库 - 浏览和游玩本地关卡 |

### 游戏结束/胜利后

| 按键 | 功能 |
|-----|------|
| `回车` | 重新开始 |
| `ESC` | 返回主菜单 |

## 关卡仓库系统

### 使用方法

1. 在主菜单按 `R` 打开关卡仓库面板
2. 点击"选择关卡文件夹"，选择包含 `.json` 关卡文件的文件夹
3. 仓库会自动扫描所有 JSON 文件并列出关卡
4. 点击关卡旁的 ▶ 按钮即可游玩
5. 仓库路径会自动记忆，下次打开游戏无需重新选择

### 关卡文件格式

```json
{
  "meta": {
    "name": "关卡名称",
    "author": "作者",
    "version": "1.0"
  },
  "config": {
    "baseSpeed": 5,
    "gravity": 1.2,
    "spawnOffset": 600
  },
  "timeline": [
    { "time": 1500, "type": "low", "xOffset": 0 },
    { "time": 3000, "type": "air", "xOffset": 0 }
  ]
}
```

## 关卡编辑器

### 使用方法

1. 在主菜单按 `T` 进入关卡编辑器
2. 使用时间轴界面：
   - **点击时间轴** - 在点击位置添加障碍
   - **拖拽事件块** - 调整障碍时间（带 100ms 吸附）
   - **点击事件块** - 选中编辑属性
3. 控制按钮：
   - `+ low` / `+ air` - 添加障碍（同时设置默认类型）
   - `Delete` - 删除选中障碍
   - `保存关卡` - 保存到仓库（需先选择仓库）或导出 JSON
   - `Playtest` - 测试运行关卡

### 编辑器快捷键

| 按键 | 功能 |
|-----|------|
| `1` | 设置默认类型为 low（点击时间轴添加 low） |
| `2` | 设置默认类型为 air（点击时间轴添加 air） |
| `Delete` | 删除选中障碍 |
| `鼠标滚轮` | 缩放时间轴 |

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
│   │   ├── Constants.js        # 游戏常量
│   │   ├── Level.js            # 关卡数据结构
│   │   ├── LevelRepository.js  # 关卡仓库管理
│   │   ├── LevelLoader.js      # 关卡验证与加载
│   │   ├── Game.js             # 主游戏逻辑
│   │   ├── Input.js            # 输入处理
│   │   └── Time.js             # 时间管理
│   ├── entities/       # 游戏实体
│   │   ├── Player.js           # 玩家角色
│   │   ├── Obstacle.js         # 障碍物
│   │   └── ObstacleFactory.js  # 障碍工厂
│   ├── systems/        # 游戏系统
│   │   ├── ParticleSystem.js   # 粒子系统
│   │   ├── ObstacleManager.js  # 障碍管理
│   │   ├── TrailSystem.js      # 拖尾系统
│   │   └── SoundSystem.js      # 音效系统
│   ├── editor/         # 关卡编辑器
│   │   ├── Editor.js           # 编辑器核心
│   │   ├── Timeline.js         # 时间轴可视化
│   │   └── Inspector.js        # 属性检查器
│   ├── ui/             # UI 组件
│   │   └── LevelSelectView.js  # 关卡选择界面
│   ├── render/         # 渲染相关
│   │   └── Renderer.js         # 渲染器
│   └── game.js         # 游戏入口
├── levels/             # 示例关卡
│   └── level1.json
├── index.html          # 游戏界面
├── main.js             # Electron 主进程
├── preload.js          # Electron 预加载脚本
├── package.json        # 项目配置
└── README.md           # 本文件
```

## 技术亮点

- 使用 `requestAnimationFrame` 实现流畅渲染
- 对象池技术管理粒子，减少垃圾回收
- 优化碰撞检测
- 模块化 ES6 架构，便于维护扩展
- Electron IPC 安全通信（contextIsolation + preload）
- localStorage 持久化用户设置

## 开源协议

MIT License
