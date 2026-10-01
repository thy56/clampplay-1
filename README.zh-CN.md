# ClampPlay-1

[English](README.md) | [中文文档](README.zh-CN.md)

> 一套通用控制器，搭配可拆卸的钢琴、吉他和架子鼓自动执行组件。

[![软件许可证：MIT](https://img.shields.io/badge/software-MIT-2ea44f.svg)](LICENSES/MIT.txt)
[![硬件许可证：CERN--OHL--S--2.0](https://img.shields.io/badge/hardware-CERN--OHL--S--2.0-4c1.svg)](LICENSES/CERN-OHL-S-2.0.txt)
[![通信协议](https://img.shields.io/badge/protocol-14--byte%20binary-4B93E6.svg)](docs/PROTOCOL.md)

ClampPlay-1 将可复用的控制核心与不同乐器的机械动作拆开：移动端 App 负责曲目和动作事件，控制器负责校验与时序调度，可拆卸模块负责实际的按键、按弦/拨弦或敲击动作。

<p align="center">
  <img src="https://raw.githubusercontent.com/thy56/clampplay-1/main/docs/assets/mobile-app-home.png" alt="ClampPlay-1 移动端 App 预览" width="300">
</p>

- **钢琴组件：** 将音符映射到对应键位执行器，以软接触头自动按下琴键。
- **吉他组件：** 先完成按弦和到位确认，再由独立拨弦或扫弦机构让琴弦发声。
- **架子鼓组件：** 将节拍映射到目标鼓位，由鼓槌执行器完成敲击与回位。

> [!WARNING]
> 本仓库是工程原型与软件演示，不是医疗器械，也不代表硬件已经完成验证。移动端 App 与浏览器控制台默认工作于模拟模式。接入真实硬件、接触真实乐器或进行用户测试前，必须完成风险评估、限流、机械限位、急停验证以及低力度分阶段测试。

## 快速开始

### 1. 运行协议与调度测试

```bash
python -m unittest discover -s software/console -p test_console.py -v
```

### 2. 生成示例控制器帧

```bash
cd software/console
python console.py --input demo_chords.json --output demo_frames.json
python console.py --drum 0,500,1000
```

生成的 JSON 文件包含十六进制形式的 14 字节协议帧。串口发送端应逐帧发送二进制数据，不能把 JSON 文本直接发送给固件。

### 3. 本地运行移动端 PWA

```bash
cd software/mobile-app
python -m http.server 8088
```

打开 `http://localhost:8088`。PWA 安装和 Web Serial 功能需要运行在 `localhost` 或 HTTPS 环境。

### 4. 使用 Docker 部署移动端 PWA

```bash
cd software/mobile-app
docker compose up --build -d
```

打开 `http://localhost:8088`，停止服务：

```bash
docker compose down
```

## 具体实现流程

1. **编排演奏事件。** App 或浏览器控制台记录乐器类型、执行器索引、力度、开始时间和持续时间。
2. **编码二进制帧。** `software/console/protocol.py` 将每个事件编码为带校验和的固定 14 字节协议帧。
3. **校验并调度。** 控制器在输出前拒绝损坏帧、错误版本和无效执行器索引。
4. **驱动对应模块。** 快拆组件把通用执行器指令转换为钢琴按键、吉他按弦/拨弦流程或鼓槌敲击。
5. **进入安全闭环。** 急停、错误帧或超过 1000 ms 未收到有效指令时，系统释放全部输出。

完整说明见：[实现流程](docs/IMPLEMENTATION.md)。

## 系统架构

<p align="center">
  <img src="https://raw.githubusercontent.com/thy56/clampplay-1/main/docs/assets/unified-controller-modules.png" alt="统一控制器与可拆卸乐器组件架构图" width="900">
</p>

| 层级 | 作用 | 当前状态 |
| --- | --- | --- |
| 移动端 PWA | 曲目事件、校准记录、本地模拟、Web Serial 入口、急停界面 | 已实现模拟功能 |
| 浏览器控制台 | 协议演示、事件调度、交互原型 | 已实现 |
| 二进制协议 | 定长帧、校验和、停止动作 | 已实现并完成单元测试 |
| 固件骨架 | 串口解析、执行器索引检查、超时释放 | 已提供源码；仍需依据实际开发板完成编译与联调 |
| 钢琴组件 | 音符到琴键的软接触执行 | 架构设计阶段 |
| 吉他组件 | 按弦机构与独立拨弦机构 | 已提供按弦概念模型；双机构实体仍需验证 |
| 架子鼓组件 | 节拍到鼓槌的执行流程 | 已提供底鼓传动概念模型；完整架子鼓适配仍需验证 |

<p align="center">
  <img src="https://raw.githubusercontent.com/thy56/clampplay-1/main/docs/assets/instrument-execution-chains.png" alt="钢琴吉他架子鼓自动演奏动作链图" width="900">
</p>

## 目录结构

```text
clampplay-1/
├── software/
│   ├── console/          # 协议、调度、单元测试、浏览器演示
│   ├── firmware/         # Arduino 兼容串口固件骨架
│   └── mobile-app/       # 移动端 PWA 与 Docker 部署文件
├── hardware/
│   ├── BOM.md            # 原型物料表
│   ├── cad/              # CAD 接口说明
│   ├── electronics/      # 电子接口说明
│   └── models/           # Blender、GLB、OBJ 与渲染概念模型
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION.md
│   ├── PROTOCOL.md
│   ├── SAFETY.md
│   ├── TESTING.md
│   ├── assets/
│   └── diagrams/
└── LICENSES/
```

## 文档导航

- [系统架构](docs/ARCHITECTURE.md)
- [实现流程](docs/IMPLEMENTATION.md)
- [二进制协议](docs/PROTOCOL.md)
- [硬件范围](docs/HARDWARE.md)
- [安全边界](docs/SAFETY.md)
- [测试说明](docs/TESTING.md)
- [移动端 App 部署说明](software/mobile-app/README.md)

## 许可证

- 软件代码使用 [MIT License](LICENSES/MIT.txt)。
- 硬件设计资料使用 [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt)。

具体适用范围见 [LICENSE](LICENSE)。
