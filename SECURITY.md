# 开源安全与配置指南

## 本地运行前配置

1. 复制环境模板文件。

```bash
cp env.example.js env.js
```

2. 打开 `env.js`，将 `cloudEnvID` 替换为你自己的微信云开发环境 ID。

```js
export const cloudEnvID = '你的微信云开发环境 ID'
```

3. `env.js`、`.env`、`project.private.config.json`、`cloudfunctions/*/.env` 均为本地私有配置文件，不应提交到公开仓库。

## 微信云开发环境变量

如需启用第三方图像处理或文字提取能力，请在微信开发者工具的「云开发控制台 -> 设置 -> 环境变量」中手动配置以下变量：

| Key | 用途 | 获取方式 |
| --- | --- | --- |
| `ALIYUN_ACCESS_KEY_ID` | 阿里云访问身份标识 | 登录阿里云控制台，在 RAM 访问控制中创建 AccessKey |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云访问密钥 | 登录阿里云控制台，在 RAM 访问控制中创建 AccessKey Secret |
| `TENCENT_SECRET_ID` | 腾讯云访问身份标识 | 登录腾讯云控制台，在 API 密钥管理页面创建 SecretId |
| `TENCENT_SECRET_KEY` | 腾讯云访问密钥 | 登录腾讯云控制台，在 API 密钥管理页面创建 SecretKey |

云函数中统一使用 `process.env` 读取环境变量，严禁将任何密钥写入仓库。

## 数据与权限声明

- 本项目默认不收集、不上报、不出售任何用户隐私数据。
- 微信云数据库建议仅存储物品记录、提醒设置、草稿等业务数据，不存储身份证号、银行卡号、生物特征等敏感信息。
- 云数据库权限建议设置为“仅创建者可读写”或按集合拆分为最小权限策略。
- 云存储建议按用户维度隔离目录，并限制匿名读写。
