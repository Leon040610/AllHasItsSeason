# 开源安全与配置指南

## 本地运行前配置

1. 复制环境模板文件。

```powershell
Copy-Item env.example.js env.js
```

2. 打开 `env.js`，将 `cloudEnvID` 替换为你自己的微信云开发环境 ID。注意，`env.js` 是本地构建的前置文件，如果配置不合法或未配置，小程序将安全降级为纯本地模式。

```js
export const cloudEnvID = '你的微信云开发环境 ID'
```

3. `env.js`、`.env`、`project.private.config.json`、`cloudfunctions/*/.env` 均为本地私有配置文件，已加入 `.gitignore`，**严禁提交到公开仓库**。

## 微信云开发环境变量

如需启用第三方图像处理或文字提取能力，请在微信开发者工具的「云开发控制台 -> 设置 -> 环境变量」中手动配置以下变量。所有调用都在云端完成。

| Key | 用途 | 适用阶段 | 备注 |
| --- | --- | --- | --- |
| `OWNER_KEY_SALT` | 生成用户 ownerKey 的 HMAC 盐值 | P2.2 起必须配置 | 自行生成 ≥ 32 位随机字符串，不得告知他人 |
| `BAIDU_API_KEY` | 百度商品抠图 API Key | 仅限后续阶段 P2.7 | 百度智能云控制台申请 |
| `BAIDU_SECRET_KEY` | 百度商品抠图 Secret Key | 仅限后续阶段 P2.7 | 百度智能云控制台申请 |

**注意与声明：**
- `OWNER_KEY_SALT` 必须在云开发控制台配置，**严禁写入代码、提交到 Git 或以任何方式公开**。
- 微信服务市场 OCR 的具体服务 ID、接口名和调用参数必须以购买服务的官方文档为准，不得硬编码、猜测或写入前端。
- 严禁将 API Key、Secret Key、`openid`、`cloudEnvID`、`ownerKey` 打印到前端日志、写入 Git 仓库或直接明文写入云数据库。云函数中统一使用 `process.env` 读取环境变量。

## 微信开发者工具云函数工作流

> **微信开发者工具必须打开项目根目录**（`AllHasItsSeason/`），而不是只打开 `unpackage/dist/dev/mp-weixin/`。

标准工作流：

```
1. 在 HBuilderX 中编译项目，生成 unpackage/dist/dev/mp-weixin/
2. 在微信开发者工具中打开项目根目录 AllHasItsSeason/
   （工具会根据 project.config.json 自动识别 cloudfunctions/）
3. 右键点击 cloudfunctions/login → 选择 "上传并部署：云端安装依赖"
4. 在云开发控制台完成 users 集合创建与 OWNER_KEY_SALT 环境变量配置
5. 使用云函数本地调试验证返回值不含 openid 和 ownerKey
```

云数据库集合权限要求：

| 集合 | 权限策略 |
| --- | --- |
| `users` | **仅云函数可读写**（不配置前端任意读写权限） |

## 数据与权限声明

- 本项目默认不收集、不上报、不出售任何用户隐私数据。
- 微信云数据库建议仅存储物品记录、提醒设置、草稿等业务数据，不存储身份证号、银行卡号、生物特征等敏感信息。
- `users` 集合使用不可逆 `ownerKey` 作为用户归属标识，明文 `openid` 不写入任何集合。
- 云存储建议按用户维度隔离目录，并限制匿名读写。
