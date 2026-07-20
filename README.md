# 万物有期（All Has Its Season）

> 把生活好物，轻轻收进时间里。

「万物有期」是一款面向微信小程序的生活物品管理工具，用于记录食品、日化、美妆、药品、母婴等物品的效期、开封时间、图片与使用状态。它提供本地优先的记录体验；在配置微信云开发后，可启用账号隔离、跨设备同步、云端图片备份和订阅消息提醒。

## 目录

- [核心能力](#核心能力)
- [技术架构](#技术架构)
- [目录说明](#目录说明)
- [快速开始](#快速开始)
- [本地模式与云端模式](#本地模式与云端模式)
- [云开发部署](#云开发部署)
- [配置与安全](#配置与安全)
- [测试](#测试)
- [常见问题](#常见问题)
- [贡献与许可](#贡献与许可)

## 核心能力

### 物品与效期管理

- 支持食品、日化、美妆、药品、母婴及自定义分类的物品记录。
- 支持常态效期、开封后效期和双重效期，并提供剩余天数与状态展示。
- 支持物品图片、备注、购买日期、生产日期、开封日期和使用状态等信息维护。
- 支持搜索、分类筛选、状态筛选、详情查看、编辑和软删除。
- 提供效期计算器，便于快速推算预计到期日。

### 快速录入与草稿保护

- 可通过拍照识字辅助提取包装上的信息，再由用户确认和补充。
- 支持图片处理与贴纸手帐风的展示图生成；处理失败时会保留原图，不阻断保存。
- 编辑中的未完成内容可保存为草稿，并可在草稿箱继续编辑或批量清理。

### 提醒与同步

- 支持为物品设置临期提醒，并通过微信订阅消息完成通知。
- 支持本地优先的数据存储与多账户数据隔离。
- 登录并启用云同步后，可同步物品、分类、草稿、提醒设置和同步设置。
- 自动同步会在应用回到前台、网络恢复或本地数据变更后进行条件检查；不满足登录、联网、云环境配置或同步开关条件时不会发起同步。
- 已物理清理的云端物品会保留最小删除标记，避免旧设备同步时意外恢复旧记录。

### 云端数据治理

- 图片上传会登记受控云文件，便于后续审计。
- 定时任务会盘点无引用图片和保留期已满的软删除物品。
- 默认仅执行 `dry-run` 审计并写入安全日志，不会删除云文件或云数据库记录。
- 真正删除必须显式关闭演练开关并同时打开对应删除开关；详细流程见 [P3.3 部署说明](cloudfunctions/P3.3_DEPLOYMENT.md)。

## 技术架构

| 层级 | 技术与职责 |
| --- | --- |
| 小程序前端 | `uni-app`、Vue 3、SCSS、原生小程序 API |
| 页面路由 | `pages.json` 管理页面与自定义四栏 TabBar |
| 业务层 | `services/` 负责物品、分类、草稿、提醒、图片、认证和同步流程 |
| 数据访问层 | `repositories/` 封装本地存储与微信云开发调用 |
| 本地数据 | `uni` 本地存储，按账号作用域隔离 |
| 云端服务 | 微信云开发（CloudBase）、云函数、云数据库、云存储 |
| 资源与规范 | `static/` 图标和字体资源，`design-tokens.tokens.json` 为设计令牌源文件 |

前端页面不直接读写云数据库。认证、同步、图片处理、提醒和数据治理均经由云函数完成，减少身份字段暴露与权限扩散。

## 目录说明

```text
.
├── cloudfunctions/                 # 微信云函数与部署说明
│   ├── login/                      # 登录、首次用户档案、昵称与头像更新
│   ├── syncData/                   # 多集合增量同步、冲突处理与删除标记
│   ├── imageProcess/               # 图片上传准备与云端图片处理
│   ├── logRecognition/             # 识别记录落库
│   ├── registerCloudFile/          # 受控云文件登记
│   ├── registerReminderRecipient/  # 提醒接收者注册
│   ├── scheduledReminderScan/      # 定时扫描提醒任务
│   ├── sendReminderNotifications/  # 定时发送订阅消息
│   ├── auditCloudFiles/            # 云文件引用审计
│   ├── cleanupCloudFiles/          # 无引用云文件清理
│   ├── purgeDeletedData/           # 已软删除物品的保留期清理
│   ├── P3.2_DEPLOYMENT.md          # 订阅消息部署与验证说明
│   └── P3.3_DEPLOYMENT.md          # 云文件和已删除数据治理说明
├── custom-tab-bar/                 # 自定义底部导航栏
├── models/                         # 领域模型与数据转换
├── pages/                          # 小程序页面
│   ├── add/                        # 新增物品与拍照识字
│   ├── detail/                     # 物品详情和编辑
│   ├── index/                      # 首页
│   ├── library/                    # 物品库
│   ├── me/                         # 个人资料、分类、草稿、提醒和数据管理
│   └── tools/                      # 工具页与效期计算器
├── repositories/                   # 本地与云端仓储实现
├── services/                       # 业务服务层
├── static/                         # 图标、图片和字体资源
├── tests/                          # 可在 Node.js 中执行的安全测试
├── utils/                          # 日期、存储作用域、解析和 UUID 工具
├── App.vue                         # 应用生命周期、云环境初始化与字体加载
├── env.example.js                  # 前端环境配置模板
├── pages.json                      # 页面与导航配置
└── project.config.json             # 微信开发者工具项目配置
```

## 快速开始

### 前置条件

准备以下工具：

- [HBuilderX](https://www.dcloud.io/hbuilderx.html)，用于打开和编译 `uni-app` 项目。
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，用于预览、调试、上传及部署云函数。
- Node.js 18 或更高版本，用于运行仓库内的安全测试。
- 一个可用的微信小程序 AppID；如需云端能力，还需开通微信云开发环境。

> 本项目根目录没有前端 `package.json` 或 npm 构建脚本。请使用 HBuilderX 的运行/发行功能，而非执行 `npm install` 或 `npm run dev`。

### 1. 获取代码并创建本地配置

```powershell
git clone <你的仓库地址>
Set-Location AllHasItsSeason
Copy-Item env.example.js env.js
```

编辑新建的 `env.js`。只想体验本地模式时可以保留模板值；要启用云端能力，请至少填入实际的云开发环境 ID：

```js
export const cloudEnvID = '你的微信云开发环境 ID'

// 可选：自定义字体的 HTTPS 地址或云存储 File ID。
export const fontUrl = 'https://your-static-domain.example/fonts/noto-serif-sc-subset.ttf'
export const fontFileId = 'cloud://your-env-id.your-bucket-id/fonts/noto-serif-sc-subset.ttf'

// 可选：订阅消息模板 ID。
export const wxReminderTemplateId = ''
```

`env.js` 已被 Git 忽略，不能提交真实环境 ID、模板 ID 或其他私有配置。

### 2. 编译并打开小程序

1. 使用 HBuilderX 打开项目根目录。
2. 选择“运行 → 运行到小程序模拟器 → 微信开发者工具”，生成 `unpackage/dist/dev/mp-weixin/`。
3. 在微信开发者工具中**打开项目根目录**，而不是仅打开编译产物目录。根目录的 `project.config.json` 已将：
   - `miniprogramRoot` 指向 `unpackage/dist/dev/mp-weixin/`；
   - `cloudfunctionRoot` 指向 `cloudfunctions/`。
4. 在开发者工具中预览或使用真机调试。

## 本地模式与云端模式

| 模式 | 启用条件 | 可用能力 |
| --- | --- | --- |
| 本地模式 | 非微信环境、未配置有效 `cloudEnvID` 或云初始化失败 | 物品、分类、草稿、效期计算等本地功能；数据保存在当前设备 |
| 云端模式 | 微信小程序环境、`env.js` 中的 `cloudEnvID` 有效且云初始化成功 | 登录、跨设备同步、云端图片、订阅消息及云端治理能力 |

应用会在启动时初始化云环境。若环境不可用，它会安全降级为本地模式；这不是故障，也不会阻止用户继续记录物品。

## 云开发部署

云端功能涉及云数据库、云存储、云函数和定时触发器。请在同一个微信云开发环境中完成以下配置。

### 1. 配置前端环境

按照[快速开始](#1-获取代码并创建本地配置)创建 `env.js` 并设置 `cloudEnvID`。不要把服务端密钥、维护口令或 HMAC 盐值写进该文件。

### 2. 创建基础集合和服务端环境变量

在云开发控制台创建 `users` 集合，并设置为“仅云函数可读写”。随后在云开发控制台的环境变量中配置：

```text
OWNER_KEY_SALT=<长度不少于 32 位的随机字符串>
```

`OWNER_KEY_SALT` 需要在涉及用户归属的云函数中使用同一安全值，至少包括 `login`、`syncData` 和 `registerCloudFile`。该值仅属于服务端配置，绝不能提交、打印或写入数据库。

### 3. 部署基础云函数

在微信开发者工具中，对下列目录逐个右键选择“上传并部署：云端安装依赖”：

```text
cloudfunctions/login
cloudfunctions/syncData
cloudfunctions/imageProcess
cloudfunctions/logRecognition
cloudfunctions/registerCloudFile
cloudfunctions/registerReminderRecipient
cloudfunctions/scheduledReminderScan
cloudfunctions/sendReminderNotifications
cloudfunctions/auditCloudFiles
cloudfunctions/cleanupCloudFiles
cloudfunctions/purgeDeletedData
```

云函数均在各自目录中声明 `wx-server-sdk` 依赖，因此应选择“云端安装依赖”。部署后先在真机验证登录、本地保存和同步，再启用提醒与清理相关的定时任务。

### 4. 部署订阅消息提醒（可选）

提醒能力使用 `registerReminderRecipient`、`scheduledReminderScan` 与 `sendReminderNotifications`。需要手动创建对应的私有集合、配置消息模板和服务端环境变量，并上传两个定时触发器。

请严格按照 [P3.2 部署说明](cloudfunctions/P3.2_DEPLOYMENT.md) 进行。该文档包含：

- 所需云函数、集合和索引；
- 提醒模板与 `REMINDER_*` 环境变量；
- 默认 `dry-run` 验证步骤；
- `subscribeMessage.send` 权限配置与真实发送前的检查清单。

### 5. 部署云文件与已删除数据治理（可选）

云文件治理相关函数默认只审计，不会自动删除。启用前请阅读并完整执行 [P3.3 部署说明](cloudfunctions/P3.3_DEPLOYMENT.md)。

最重要的安全约束：

- `cloud_file_registry`、`cleanup_logs` 及相关治理集合应仅允许云函数读写。
- 所有保留期固定为 7 天；不要任意修改为其他数值。
- 先完成 `dry-run`，人工核对候选数据后再考虑真实删除。
- 真实删除需要同时关闭 `*_DRY_RUN` 并打开 `*_DELETE_ENABLED`（自动删除还需 `*_AUTO_DELETE_ENABLED`）。
- 每次只验证一个函数、一个候选对象，并在完成后恢复安全默认值。

## 配置与安全

### 应提交与不应提交的文件

| 文件 | 用途 | 是否提交 |
| --- | --- | --- |
| `env.example.js` | 前端配置示例 | 是 |
| `env.js` | 当前环境前端配置 | 否 |
| `project.config.json` | 公共项目配置 | 是 |
| `project.private.config.json` | 本机微信开发者工具配置 | 否 |
| `cloudfunctions/*/.env` | 云函数本地私有配置 | 否 |
| 云开发控制台环境变量 | 盐值、第三方密钥、维护口令 | 否，且不得写入代码 |

### 数据与权限原则

- 前端不直接操作云数据库；业务访问通过受控云函数完成。
- 不向云函数传递 `ownerKey`、`openid`、`userId` 等可伪造的身份归属字段。
- `users` 使用不可逆的 `ownerKey` 建立归属关系，不将明文 `openid` 写入业务集合。
- 云存储按用户维度隔离目录，并限制匿名读写。
- 不在前端日志、截图、仓库或数据库中留下 API Key、Secret Key、维护口令和用户身份标识。

更多细节见 [SECURITY.md](SECURITY.md)。发现潜在安全问题时，请先私下联系维护者，避免在公开 Issue 中披露密钥或可复现攻击步骤。

## 测试

仓库提供了针对 P3.3 云文件与数据治理安全开关的 Node.js 测试。它验证固定保留期、删除开关、删除标记和定时触发器配置等关键保护逻辑。

```powershell
node tests/p3.3-safety.test.cjs
```

预期输出：

```text
P3.3 safety assertions passed
```

建议在每次调整云函数逻辑或部署真实删除开关前执行该测试。涉及微信能力的页面、云函数和订阅消息仍应在微信开发者工具与真机上完成联调验证。

## 常见问题

### 为什么只能使用本地模式？

请检查是否运行在微信小程序环境，以及 `env.js` 的 `cloudEnvID` 是否替换为有效云开发环境 ID。云开发初始化失败时，项目会自动保留在本地模式。

### 为什么微信开发者工具看不到云函数？

请确认打开的是项目根目录，而不是 `unpackage/dist/dev/mp-weixin/`。根目录中的 `project.config.json` 负责同时声明编译产物和 `cloudfunctions/` 目录。

### 图片处理或拍照识字失败会丢失物品吗？

不会。相关流程会以可保存为优先策略处理异常，图片处理失败时保留原图并允许继续保存；识别结果也应由用户确认与补充。

### 可以直接打开自动删除吗？

不可以。请先完成 P3.3 的 `dry-run` 审计，备份相关集合并人工核对候选项。真实删除应从单条候选、小批次手动验证开始，随后立即恢复默认安全开关。

## 贡献与许可

欢迎通过 Issue 或 Pull Request 提交问题、修复和改进。提交前请确保：

- 不包含 `env.js`、`.env`、`project.private.config.json` 或任何密钥；
- 通过相关测试，并完成受影响小程序页面的手动验证；
- 不改变数据隔离、云函数权限和删除安全开关的默认保护行为。

当前仓库未包含许可证文件。在添加明确许可证前，代码使用、分发与二次开发应先取得项目维护者授权。
