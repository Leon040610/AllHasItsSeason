# Codex Prompt：用户协议与隐私政策页面接入 + 默认勾选改造

## 任务背景

小程序 v1.1.0 提审被拒，原因：「用户协议」「隐私政策」点击无响应。同时需要把登录页默认自动同意改为需用户手动勾选。协议与隐私政策的**完整内容已经写好**，位于项目根目录：

- `万物有期_用户协议.md`
- `万物有期_隐私政策.md`

本项目**已有成熟的富文本渲染模式**（使用说明页），请严格沿用，不要另起炉灶。

---

## 现有可复用模式（重要）

项目已安装 `mp-html@^2.5.2` 和 `marked@^18.0.6`。

**参考实现**：`pages/me/guide/index.vue`（使用说明页）
- 内容来源：`utils/usageGuideHtml.js`（Markdown 转成的 HTML 字符串模块）
- 渲染方式：`<mp-html :content="..." :tag-style="customStyles" />`
- 页面结构：顶部返回栏 + `scroll-view` + `mp-html` + 底部安全区
- `customStyles` 已调好品牌排版（宋体、燕麦白、鼠尾草绿），**直接复制复用**

---

## 具体任务

### 任务 1：生成两份 HTML 内容模块

参照 `utils/usageGuideHtml.js` 的格式，用 `marked` 把两份 Markdown 转成 HTML 字符串，分别输出到：

- `utils/userAgreementHtml.js`（导出 `agreementHtml`）
- `utils/privacyPolicyHtml.js`（导出 `privacyHtml`）

**注意**：两份文档中的联系邮箱目前是占位符 `[请填写您的联系邮箱]`。转换前请先确认 `env.js` 或配置中是否已有开发者联系邮箱；如有则替换，如无则保留占位符并在代码注释中标注 `TODO: 待填写开发者联系邮箱`。

### 任务 2：创建两个协议页面

新建以下两个页面，**完全照抄 `pages/me/guide/index.vue` 的结构和 `customStyles`**，只改三处：页面标题、导入的 HTML 模块、返回按钮图标（复用现有图标）：

- `pages/agreement/index.vue`（标题：用户服务协议，导入 `agreementHtml`）
- `pages/privacy/index.vue`（标题：隐私政策，导入 `privacyHtml`）

### 任务 3：注册路由

在 `pages.json` 的 `pages` 数组中新增两条路由（放在合适位置，style 参照现有页面用 `navigationStyle: "custom"`）：

```json
{
  "path": "pages/agreement/index",
  "style": { "navigationBarTitleText": "用户服务协议", "navigationStyle": "custom" }
},
{
  "path": "pages/privacy/index",
  "style": { "navigationBarTitleText": "隐私政策", "navigationStyle": "custom" }
}
```

### 任务 4：接通 4 个点击入口

**4.1 启动页 `pages/launch/index.vue`（第 69-70 行，当前是空函数）：**

```js
function onUserAgreement() {
  uni.navigateTo({ url: '/pages/agreement/index' })
}
function onPrivacyPolicy() {
  uni.navigateTo({ url: '/pages/privacy/index' })
}
```

**4.2 关于页 `pages/me/about/index.vue`（第 104-110 行，当前是"即将上线"占位 toast）：**

把两个占位 toast 替换为与 4.1 相同的 `uni.navigateTo` 跳转。

### 任务 5：默认勾选改为手动勾选

**5.1 `pages/launch/index.vue` 第 35 行：**

```js
// 改前
const agreed = ref(true)
// 改后
const agreed = ref(false)
```

**5.2 同步修改协议区文案（第 21 行附近）**，从"登录即同意"改为主动勾选的表述：

```
改前：登录即同意 用户协议 与 隐私政策
改后：我已阅读并同意 用户协议 与 隐私政策
```

**5.3 保留现有逻辑**：`onWxLogin` 中 `if (!agreed.value)` 的拦截和 toast 提示（"请先同意用户协议和隐私政策"）保持不变，未勾选时点击登录仍会被拦截。

---

## 验收标准

1. 启动页和关于页共 4 个协议/隐私链接，点击后都能打开对应内容页，内容完整渲染（宋体排版、有表格、有层级）。
2. 协议页有返回按钮，可正常返回上一页。
3. 启动页协议勾选框**默认未勾选**，未勾选点击"微信一键登录"时弹出提示且不登录。
4. 勾选后可正常登录。
5. 真机测试：协议页内容可滚动、可正常显示。

---

## 约束

- 严格复用 `pages/me/guide/index.vue` 的页面结构与 `customStyles`，保持视觉一致。
- 协议内容以根目录两份 `.md` 为唯一来源，不要自行增删条款。
- 不改动登录、云开发等其他逻辑。
