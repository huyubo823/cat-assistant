---
name: 猫咪助手
description: 小猫养育助手 — 科学喂养、健康管理、成长记录
colors:
  sunrise-orange: "#FF8C42"
  sunrise-light: "#FFF0E5"
  sunrise-deep: "#E67A30"
  cream-bg: "#FFFAF5"
  surface-white: "#FFFFFF"
  ink-primary: "#333333"
  ink-secondary: "#888888"
  ink-muted: "#AAAAAA"
  border-light: "#EEEEEE"
  danger-red: "#E74C3C"
  danger-red-light: "#FDEDEC"
  success-green: "#27AE60"
  success-green-light: "#E8F8F0"
  warning-amber: "#F39C12"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.sunrise-orange}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.sunrise-deep}"
---

# Design System: 猫咪助手

## 1. Overview

**Creative North Star: "午后梳毛"**

午后梳毛是一种安静日常的照料仪式——不急不缓，有节奏感，充满信任和温度。这也是猫咪助手想传达的体验：它不是催促你做事的闹钟，而是陪在你身边、提醒你今天该为小猫做什么的温柔伙伴。

整个系统的视觉语言从「日光」和「触感」出发。暖橘是日出那一刻的光，米白是铺在窗台上的柔软毯子，深色的文字是梳子划过毛发留下的痕迹。卡片有厚度，像叠在手边的毛巾；按钮圆润柔软，按下去有轻微的回弹感。

**Key Characteristics:**
- 暖而不烫——橘色是点睛，不是铺满
- 厚而不重——卡片有阴影有层次，但页面整体轻量
- 软而不散——圆角大、动效柔，但信息层级清晰
- 拒绝杂乱——每个页面只有一个核心动作，像我的南京那种信息堆砌是反模式

## 2. Colors

日出暖阳为锚定的暖橘色系统。中性色偏暖米白而非冷灰，营造包裹感和温度。

### Primary
- **日出橘** (`#FF8C42`): 主要操作按钮、选中状态、当前步骤指示。只用在不超 10% 的页面面积上，克制使用才有分量。
- **日出浅** (`#FFF0E5`): 橘色的背景延伸，用于高亮区块、当前步骤、轻量强调。
- **日出深** (`#E67A30`): hover/active 状态，提供按压反馈的深度。

### Neutral
- **奶霜底** (`#FFFAF5`): 页面全局背景，暖米白色。不是纯白，有微妙的温度。
- **卡片白** (`#FFFFFF`): 卡片和浮层表面，与奶霜底形成轻微对比。
- **墨色** (`#333333`): 正文和主要标题。不用纯黑，墨色更柔和。
- **灰笔记** (`#888888`): 辅助文字、说明、时间戳。
- **浅灰线** (`#AAAAAA`): 禁用态、占位符。
- **边界灰** (`#EEEEEE`): 分割线、卡片边框、输入框描边。

### Semantic
- **危险红** (`#E74C3C`): 删除、紧急、逾期标记。浅底 `#FDEDEC` 用于逾期卡片。
- **安心绿** (`#27AE60`): 完成、打卡、正常状态。浅底 `#E8F8F0` 用于已完成任务。
- **提醒黄** (`#F39C12`): 待处理、需要关注。

### Named Rules
**The 10% Rule.** 日出橘在任何页面上的面积不超过 10%。它的力量来自稀缺，不是铺张。

**The Warm White Anchor.** 所有背景都偏向暖白色谱。永远不用冷灰 (#f5f5f5, #e0e0e0) 作为底色。

## 3. Typography

**System font stack with Chinese priority.** PingFang SC 和 Microsoft YaHei 在前，确保中文渲染品质。iOS 用 SF，Android 用 Roboto，Windows 用 Segoe UI。

**Character:** 干净、柔和、不抢戏。标题有重量但温和，正文舒适可读。不做戏剧性的字体对比，让内容说话。

### Hierarchy
- **Title** (600, 22px, 1.3): 卡片标题。够大够清晰，但不喧哗。
- **Body** (400, 16px, 1.6): 页面正文、任务名称、说明文字。行宽控制在 65–75 字符。
- **Label** (500, 13px, 1.4, 0.02em): 按钮文字、标签、分类、时间。略微的字间距增加清晰度。

### Named Rules
**The One Size Down Rule.** 当不确定字体大小时，选小一号。猫咪助手用信息密度换取呼吸感。

## 4. Elevation

卡片有明显厚度——不是 Material Design 的重阴影，而是两层柔和的叠加阴影：一层近的制造边缘感，一层远的制造浮起感。阴影是暖色调的，不是纯黑叠加。

### Shadow Vocabulary
- **卡片阴影** (`box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08)`): 默认卡片状态。两层叠加制造自然厚度。
- **浮起阴影** (`box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)`): 模态框、弹出层。明显浮起感。
- **按压阴影** (`box-shadow: 0 1px 2px rgba(0,0,0,0.06)`): 按钮按下时阴影收缩，模拟物理按压。

### Named Rules
**The Warm Shadow Rule.** 所有阴影叠在暖色底上。不用纯黑 `rgba(0,0,0,x)` 叠加阴影——在暖米白底上看起来会发灰。考虑用 `rgba(230,122,48,0.06)` 做暖色阴影底层。

## 5. Components

### Buttons
- **Shape:** 圆角 12px（`--radius-btn: 14px` 升级），hover 时 scale(1.02)，transition 0.2s ease-out
- **Primary:** 日出橘底 + 白色文字，padding 12px 24px
- **Hover:** 过渡到日出深 `#E67A30`，transform scale(1.02)
- **Active/Press:** 阴影收缩，scale(0.98)，模拟物理按压
- **Ghost/Secondary:** 日出橘描边 + 透明底，同款 hover 动效

### Cards
- **Shape:** 圆角升级到 20px（当前 16px），带双层暖色阴影
- **Background:** 卡片白 `#FFFFFF`，悬在奶霜底上
- **Internal Padding:** 16px
- **Hover (可点击卡片):** 轻微浮起，阴影扩大，transition 0.3s ease-out

### Task Items (列表项)
- **Shape:** 圆角 12px，左边框 3px 颜色区分类型
- **Checked:** 绿色底 + 白色勾号，整行 opacity 0.6 + 删除线
- **Overdue:** 红色左边框 + 浅红底 + "逾期" 标签

### Navigation (底部 Tab Bar)
- **Style:** 白色底 + 上边框 1px `#EEEEEE`
- **Active:** 日出橘图标 + 文字
- **Inactive:** 灰笔记色图标 + 文字

### Inputs / Forms
- **Style:** 边界灰描边 1px，圆角 12px，padding 12px
- **Focus:** 描边变为日出橘，加 0 0 0 3px 日出浅的外发光
- **Error:** 描边危险红

## 6. Do's and Don'ts

### Do:
- **Do** 使用暖色系——米白底、奶霜色、暖橘点缀
- **Do** 卡片用双层阴影制造厚度，shadow 要有呼吸感
- **Do** 圆角至少 12px，卡片推荐 20px
- **Do** 按钮 hover 加微动效（scale 1.02 + transition 0.2s）
- **Do** 每个页面保持一个核心操作，信息层级不超过三层
- **Do** 已完成任务保持可见但低调（opacity 0.6 + 删除线 + 沉底）

### Don't:
- **Don't** 使用冷灰色底色——不要 `#f5f5f5`、`#e0e0e0`、`#fafafa`
- **Don't** 像「我的南京」一样把功能堆在一个页面——信息密集、层级混乱
- **Don't** 像 QQ 一样入口拥挤、干扰元素多——每个 Tab 聚焦一件事
- **Don't** 用纯黑 `#000000` 做文字色——墨色 `#333` 更柔和
- **Don't** 阴影太重——不要超过 `0 8px 24px`
- **Don't** 卡片用直角或小圆角（<8px）——这会让界面感觉冷硬
- **Don't** 过度使用橘色——任何页面橘色面积不超过 10%
