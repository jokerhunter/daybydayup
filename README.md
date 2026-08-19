# Lucas 的博客

一个基于 **Astro 7** 的个人博客。设计语言参考 [4real.ltd](https://www.4real.ltd/)：单色 ink 体系、Space Grotesk + IBM Plex Mono 字体、极简排版。**文件夹即目录，Markdown 即文章**——站点目录树与 `src/content/blog/` 的文件夹结构完全一致。

## ✨ 特性

- **目录树**：`/blog/` 页以文件树形式展示文章，与 `src/content/blog/` 文件夹结构实时同步（可折叠、含文件数量与日期）
- **文件夹即分类**：每层文件夹生成一个目录页（`/blog/技术/`），支持任意层级嵌套，无需维护分类字段
- **面包屑路径**：文章页顶部展示 mono 字体的真实文件路径（`~/blog/技术/文件名.md`）
- **Markdown 驱动**：新增 / 修改 / 删除 `.md` 文件即可发布、更新或下架文章
- **frontmatter 校验**：标题、日期等元信息缺失或写错时构建会直接报错提示
- **草稿机制**：`draft: true` 的文章不出现在列表、目录与 RSS 中
- **阅读统计**：自动计算字数与预计阅读时长
- **代码高亮**：Shiki 双主题，跟随站点深浅色模式自动切换
- **视图过渡**：ClientRouter 页面切换动画
- **深浅色主题**：单色 ink 体系的 dark 变体，跟随系统或手动切换
- **RSS 订阅**（`/rss.xml`）与 **站点地图**（`/sitemap.xml`）
- **上一篇 / 下一篇**文章导航
- **零 JS 框架运行时**：构建产物为纯静态 HTML，加载极快
- **自托管字体**：Space Grotesk / IBM Plex Mono（latin 子集，位于 `public/fonts/`）

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 本地开发（保存文件即时刷新）
npm run dev
# 打开 http://localhost:4321

# 构建静态站点（输出到 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

## ✍️ 如何写文章

1. 在 `src/content/blog/` 下**新建文件夹或直接放入 `.md` 文件**——文件夹就是分类，文件名（不含扩展名）就是 URL 路径；
2. 填写 frontmatter：

```yaml
---
title: '文章标题'
description: '一句话简介，显示在列表页和 RSS 中'
pubDate: 2026-08-16        # 发布日期
updatedDate: 2026-08-20    # 可选：最后更新日期
draft: false               # 可选：true 表示草稿（不出现在目录）
---
```

3. 用标准 Markdown 语法书写正文（代码块标注语言即可获得语法高亮）；
4. 保存文件——`npm run dev` 下页面即时刷新，`npm run build` 时自动生成静态页面。

详细说明见站内文章《[用 Markdown 写博客：从新建文件到发布](/blog/写作/markdown-writing-guide/)》。

## 📁 目录结构

```text
lucasBlog/
├── astro.config.mjs        # 站点配置（网址、代码高亮双主题）
├── package.json
├── public/
│   ├── favicon.svg
│   └── fonts/              # 自托管字体（Space Grotesk / IBM Plex Mono）
└── src/
    ├── consts.ts           # 站点名称、作者、网址等全局配置
    ├── content.config.ts   # 博客内容集合的 schema 定义
    ├── content/blog/       # ⭐ 文章都放在这里（文件夹=目录，文件=文章）
    │   ├── 技术/
    │   ├── 写作/
    │   └── 随笔/
    ├── lib/posts.ts        # 文章读取、目录树构建、日期格式化等工具
    ├── layouts/            # 页面布局（含 ClientRouter）
    ├── components/         # Header / Footer / PostRow / DirTree（递归目录树）
    ├── pages/              # 首页 / 目录树 / 目录页与文章页 / 关于 / RSS / Sitemap
    └── styles/global.css   # ink 设计体系与全部样式
```

## 🎨 自定义

- **站点信息**（站名、作者、描述、网址）：修改 `src/consts.ts`；
- **配色与主题**：修改 `src/styles/global.css` 顶部的 CSS 变量（`:root` 与 `html.dark` 两组 ink 体系）；
- **代码高亮主题**：修改 `astro.config.mjs` 中的 `shikiConfig`。

## 📄 License

MIT
# daybydayup
