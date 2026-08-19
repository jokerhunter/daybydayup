---
title: '用 Markdown 写博客：从新建文件到发布'
description: '介绍本博客的写作流程：文件夹即分类、frontmatter 字段、本地预览、草稿机制，以及保存文件后如何自动生成页面。'
pubDate: 2026-08-10
updatedDate: 2026-08-16
---

在这个博客里，**每一篇文章就是一个 Markdown 文件，每一个文件夹就是一个分类**。你不需要改任何代码——新增、修改或删除 `.md` 文件，站点就会随之更新。这篇文章介绍完整的写作流程。

## 1. 文章放在哪里

所有文章都放在 `src/content/blog/` 目录下，按主题分子文件夹：

```text
src/content/blog/
├── 技术/
│   └── astro-content-collections.md
├── 写作/
│   └── markdown-writing-guide.md
└── 随笔/
    └── hello-world.md
```

- **文件夹 = 目录**：想在「技术」分类下发文章，就写进 `技术/`；想新建分类，直接新建文件夹；
- **文件名 = 文章路径**：`技术/astro-content-collections.md` 对应 `/blog/技术/astro-content-collections/`；
- 站点的[目录页](/blog/)会自动生成与文件夹结构一致的目录树。

## 2. frontmatter：文章的元信息

每篇文章开头用 `---` 包裹一段 YAML，用来声明元信息：

```yaml
---
title: '文章标题'
description: '一句话简介，显示在列表页和 RSS 中'
pubDate: 2026-08-10
updatedDate: 2026-08-16   # 可选：最后更新时间
draft: false              # 可选：true 表示草稿
---
```

各字段含义：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题 |
| `description` | ✅ | 简介，用于目录页、文章页和 RSS |
| `pubDate` | ✅ | 发布日期，决定列表排序 |
| `updatedDate` | ❌ | 最后更新日期，显示在文章页 |
| `draft` | ❌ | 草稿标记，为 `true` 时不出现在目录和 RSS 中 |

> 分类不需要写在 frontmatter 里——它由文件所在的文件夹决定。

## 3. 本地预览

在项目根目录运行：

```bash
npm run dev
```

浏览器打开 `http://localhost:4321`，然后编辑任意 `.md` 文件并保存，页面会**即时刷新**。

## 4. 生成静态文件

```bash
npm run build
```

构建完成后，所有页面生成到 `dist/` 目录。因为整个站点是纯静态 HTML，把它部署到任何静态托管（GitHub Pages、Vercel、Netlify 等）即可上线，详见《[静态博客部署指南](/blog/技术/静态博客部署指南/)》。

## 5. 写作小技巧

- **层级清晰**：一篇文章最多用两级标题（`##`、`###`）；
- **代码块标注语言**：``` ````ts ```` 之类的语言标注会开启语法高亮；
- **善用引用**：`>` 引用块适合放金句或补充说明；
- **草稿流程**：没写完的文章把 `draft: true` 加上，写完再改回 `false`。

> 一句话总结：写博客 = 写 Markdown，分类 = 建文件夹。剩下的交给 Astro。
