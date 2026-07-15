# 云函数开发说明

## 工作流

```
HBuilderX 编译小程序
  ↓
微信开发者工具打开项目根目录 AllHasItsSeason/
  ↓  (工具自动识别 cloudfunctions/ 目录)
右键点击目标云函数目录 → "上传并部署：云端安装依赖"
```

> **重要**：微信开发者工具必须打开 **项目根目录**（`AllHasItsSeason/`），而不是只打开 `unpackage/dist/dev/mp-weixin/`。  
> `project.config.json` 中的 `miniprogramRoot` 已指向编译产物目录，`cloudfunctionRoot` 指向 `cloudfunctions/`，两者均在根目录下正确配置。

## 云函数列表

| 云函数 | 说明 | 状态 |
|---|---|---|
| `login` | 用户登录、首次创建档案、更新昵称 | P2.2 |

## 部署前置条件（必须人工完成）

在首次部署 login 云函数之前，必须在**云开发控制台**手动完成以下操作：

1. **创建 `users` 集合**  
   云开发控制台 → 数据库 → 新建集合，名称填写 `users`。  
   权限设置：**仅云函数可读写**（不配置任何前端直接读写权限）。

2. **配置 `OWNER_KEY_SALT` 环境变量**  
   云开发控制台 → 设置 → 环境变量 → 新增变量：  
   - Key：`OWNER_KEY_SALT`  
   - Value：一个长度 ≥ 32 位的随机字符串（自行生成，**不要告知他人，不得写入代码或提交 Git**）

3. **上传并部署**  
   微信开发者工具 → 右键 `cloudfunctions/login` → **上传并部署：云端安装依赖**

4. **本地调试验证**  
   在云函数本地调试中调用 login，检查返回值：
   - ✅ 应包含：`uid`、`nickname`、`createdAt`
   - ❌ 不应包含：`openid`、`ownerKey`、`OPENID`、`salt`

## 安全约束

- 严禁将 `OWNER_KEY_SALT`、API Key、openid 写入任何代码文件或提交到 Git。
- 云函数本地 `.env` 文件已在 `.gitignore` 中，不得提交。
- 所有云数据库读写必须通过云函数完成，前端不得直接操作 `users` 集合。
- 前端不得传递 `ownerKey`、`openid`、`userId` 等身份字段给云函数。
