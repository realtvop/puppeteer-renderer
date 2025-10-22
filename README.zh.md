# Puppeteer(基于Chrome无头浏览器的网页渲染器)

[English](README.md) | [中文](README.zh.md)

[Puppeteer](https://github.com/GoogleChrome/puppeteer) 是一个基于Chrome无头浏览器的网页渲染器。

适用于通过代理进行服务器端渲染。输出HTML、PDF和PNG格式的截图。

## 环境要求
您可以运行Chromium或Docker。

## 快速开始

### 使用Docker启动服务器（如果无法运行Chromium并安装了Docker）

```bash
docker run -d --name renderer -p 8080:3000 ghcr.io/realtvop/puppeteer-renderer-improved:latest
```

### 本地运行（克隆代码库）

`pnpm install`

#### 启动服务器（如果可以运行Chromium）
`pnpm dev`
（服务端口：3000）

#### 本地构建镜像

```bash
docker build . --file ./Dockerfile --tag local/puppeteer-renderer --build-arg SCOPE=puppeteer-renderer
```
docker run -d --name renderer -p 8080:3000 local/puppeteer-renderer
```

### 在浏览器中测试
输入URL `http://localhost:{port}/{html|pdf|screenshot}?url=https://www.google.com`

如果您能看到HTML代码，说明服务器运行正常。

### Puppeteer自定义

启动`pnpm {dev|start}`或Docker容器时，可以通过环境变量自定义Puppeteer。

- `IGNORE_HTTPS_ERRORS=true` - 忽略HTTPS错误
- `PUPPETEER_ARGS='--host-rules=MAP localhost yourproxy'` - 添加将传递给Puppeteer的额外参数。支持多个参数。
- `ALLOWED_DOMAINS='example.com,*.google.com'` - 允许的域名列表，逗号分隔。支持通配符`*`进行模式匹配。如果未设置或为空，则允许所有域名。
- `ENABLE_UI=true` - 启用网页UI界面，可通过 `/ui` 端点访问

## 网页UI

当设置`ENABLE_UI=true`时，您可以通过`http://localhost:{port}/ui`访问基于网页的用户界面。此UI提供了一个简单的方式来：

- 将网页渲染为HTML
- 生成自定义尺寸和格式的截图
- 导出网页为PDF文件

该UI使用[MDUI](https://www.mdui.org/)框架构建，为所有渲染操作提供了现代化、直观的界面。

## 与现有服务集成

如果您有活动服务，请设置代理配置与中间件集成。
请参阅[puppeteer-renderer-middleware](packages/middleware/README.md)以了解Express的用法。

```ts
import express from 'express'
import renderer from 'puppeteer-renderer-middleware'

const app = express()

app.use('/render-proxy', renderer({
  url: 'http://installed-your-puppeteer-renderer-url',
  // userAgentPattern: /My-Custom-Agent/i,
  // excludeUrlPattern: /*.html$/i
  // timeout: 30 * 1000,
}));

// 您的服务逻辑..

app.listen(8080);
```

## API

端点：`/{html|pdf|screenshot}`

| 名称               | 是否必需 |          值          | 描述                                                                                                               | 用法                                                                                  |
| ------------------ | :------: | :------------------: | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `url`              |   是     |                      | 目标URL                                                                                                            | `http://puppeteer-renderer/html?url=http://www.google.com`                            |
| `animationTimeout` |          | 毫秒为单位的超时时间 | 在截图前等待动画完成，仅适用于`screenshot`类型                                                                      | `http://puppeteer-renderer/screenshot?url=http://www.google.com&animationTimeout=3000` |
| (额外选项)         |          |                      | 额外选项（参见 [puppeteer API 文档](https://github.com/GoogleChrome/puppeteer/blob/v1.1.0/docs/api.md#pagepdfoptions)) | `http://puppeteer-renderer/pdf?url=http://www.google.com&scale=2`                     |

## PDF文件命名约定

生成的PDF文件带有`Content-disposition`头部，要求浏览器下载文件而不是直接显示。
文件名根据渲染的URL生成：

| URL                                            | 文件名               |
| ---------------------------------------------- | -------------------- |
| `https://www.example.com/`                     | `www.example.com.pdf` |
| `https://www.example.com:80/`                  | `www.example.com.pdf` |
| `https://www.example.com/resource`             | `resource.pdf`        |
| `https://www.example.com/resource.extension`   | `resource.pdf`        |
| `https://www.example.com/path/`                | `path.pdf`            |
| `https://www.example.com/path/to/`             | `pathto.pdf`          |
| `https://www.example.com/path/to/resource`     | `resource.pdf`        |
| `https://www.example.com/path/to/resource.ext` | `resource.pdf`        |


## 许可证

[MIT](http://opensource.org/licenses/MIT)

版权所有 (c) 2017-present, Yeongjin Lee & 2025-present, realtvop