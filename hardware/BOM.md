# BOM v1

价格为开发阶段参考值，不代表已采购或已实测兼容。采购前必须核对规格、电压、安装尺寸和替代件。

| 类别 | 物料 | 数量 | 参考规格 | 用途 | 状态 |
|---|---|---:|---|---|---|
| 主控 | Arduino Nano compatible | 1 | 5 V, USB serial | MVP 串口控制 | 待采购/待选板 |
| 主控备选 | ESP32 DevKit | 1 | 3.3 V, BLE + serial | 无线与扩展 | 待选板 |
| 执行器 | 5 V micro servo | 6 | 金属齿或塑料齿 | 键盘触发原型 | 待选型 |
| 驱动 | PCA9685 | 1 | 16-channel PWM | 扩展舵机通道 | 待选型 |
| 电源 | 5 V regulated supply | 1 | current limit required | 主控与执行器供电 | 待确认 |
| 保护 | inline fuse and switch | 1 set | low-current prototype | 过流与总电源 | 待确认 |
| 机械 | TPU soft contact pads | 6+ | replaceable | 接触琴键 | 待打印 |
| 机械 | 2020 extrusion and clamps | 1 set | adjustable | 可拆卸支架 | 待测量 |
| 机械 | M3 fasteners | 1 set | assorted lengths | 装配 | 待采购 |
| 调试 | USB cable | 1 | data capable | 下载与串口 | 待确认 |
| 调试 | emergency stop switch | 1 | normally-open or normally-closed per circuit | 急停 | 必须具备 |

## 采购规则

1. 先用低压、限流电源做空载验证。
2. 不在患者身上或乐器上直接试未经验证的执行器。
3. 舵机、电磁铁和线性推杆不能仅按外观替代，必须重新做力、行程和温升验证。
4. 价格、链接和兼容性在真实采购后再补入，不把搜索结果当成采购证据。
