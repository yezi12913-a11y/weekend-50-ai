# 周末50元低预算出行 AI 助手

面向北京大学生的 React + Vite + Tailwind 原型。用户输入预算、心情、活动偏好、天气、同行状态和出发地后，系统会生成 3 个可执行的低预算周末出行方案。

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址为 `http://127.0.0.1:5173`。

## 配置高德地图

真实地图使用高德地图 JS API。本地运行前，在项目根目录创建 `.env`：

```bash
VITE_AMAP_KEY=你的高德Web端Key
VITE_AMAP_SECURITY_CODE=你的高德安全密钥
```

只使用 JS API 时，上面两个变量即可。应用会通过 `AMap.PlaceSearch`、`AMap.Geocoder`、`AMap.Transfer` 等插件查询地点和路线。

如果你还申请了高德 Web服务 API Key，可以额外配置：

```bash
VITE_AMAP_WEB_SERVICE_KEY=你的高德Web服务Key
```

配置后会优先使用 Web服务 API；如果没有配置或 Web服务没有返回结果，会回退到 JS API 插件搜索。没有配置地图变量时，页面不会白屏，会显示路线预览模式。

## 常用脚本

```bash
npm run test
npm run build
npm run preview
```

## 部署到 Vercel

1. 导入 GitHub 仓库。
2. Framework 选择 Vite，Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
3. 在 Project Settings -> Environment Variables 添加：
   - `VITE_AMAP_KEY`
   - `VITE_AMAP_SECURITY_CODE`
   - `VITE_AMAP_WEB_SERVICE_KEY`（可选，Web服务 API Key）
4. 重新部署。

## 部署到 Cloudflare Pages

1. 连接 GitHub 仓库。
2. Framework preset 选择 Vite。
3. Build command 使用 `npm run build`。
4. Build output directory 使用 `dist`。
5. 在 Settings -> Environment variables 添加：
   - `VITE_AMAP_KEY`
   - `VITE_AMAP_SECURITY_CODE`
   - `VITE_AMAP_WEB_SERVICE_KEY`（可选，Web服务 API Key）
6. 保存后重新部署。

## 原型边界

当前路线、地点、预算和交通估算仍是前端原型数据。地图导航会跳转到高德，但真实 POI 营业状态、实时天气、实时拥挤度和大模型生成能力还没有接入，后续可继续扩展为真实 POI 搜索、天气 API 和 LLM 推荐。
