---
title: '用 Astro 内容集合搭建 Markdown 驱动的博客'
description: '深入本博客的实现：Astro 内容集合如何把 Markdown 文件变成页面，文件夹结构如何映射为站点目录。'
pubDate: 2026-08-02
updatedDate: 2026-08-16
---

这个博客完全由 **Astro 内容集合（Content Collections）** 驱动。这篇文章讲讲它是怎么工作的，以及为什么这个架构特别适合个人博客。

## 什么是内容集合

内容集合是 Astro 提供的「类型安全的内容管理 API」：把一类内容（比如博客文章）放在固定目录，通过统一的 schema 校验，再用 `getCollection()` 读取。

本博客的核心配置在 `src/content.config.ts`：

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

## 文件夹即目录

这是本站和很多博客不太一样的地方：**不靠 frontmatter 里的分类字段，文件夹结构本身就是分类**。

```text
src/content/blog/
├── 技术/
│   └── astro-content-collections.md   → /blog/技术/astro-content-collections/
├── 写作/
│   └── markdown-writing-guide.md      → /blog/写作/markdown-writing-guide/
└── 随笔/
    └── hello-world.md                 → /blog/随笔/hello-world/
```

每个 md 文件在集合中的 `id` 就是相对路径，比如 `技术/astro-content-collections`。构建时：

1. 收集所有 `id`，把路径分段还原成**目录树**——这棵树与 `content/blog` 的文件夹结构一一对应；
2. 为每个文件夹生成一个目录页（`/blog/技术/`），列出其中的子目录与文章；
3. 为每个文件生成文章页，页面上方是 mono 字体的面包屑路径 `~/blog/技术/文件名.md`。

于是「站点目录」和「content 下的文件夹目录」永远同步，不存在需要额外维护的分类配置。

## 数据流：从 .md 到 .html

1. **收集**：`glob` loader 扫描 `src/content/blog/**/*.md`，读取每篇文件的 frontmatter 与正文；
2. **校验**：schema 用 [Zod](https://zod.dev/) 校验 frontmatter——缺字段或类型错误时，构建会直接报错并指出文件；
3. **渲染**：`getStaticPaths()` 为每个文件夹和每篇文章生成路由，`render()` 把 Markdown 正文转成 HTML；
4. **产出**：最终输出纯静态 HTML 到 `dist/`，没有运行时框架负担。

## 几个关键点

### 列表页只读 frontmatter

文章列表（首页和目录页）不渲染正文，只排序并展示元信息：

```astro
---
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
---
```

注意 `draft` 草稿在这里被过滤掉，所以草稿文章不会出现在任何列表、目录和 RSS 中。

### 文章页渲染正文

`src/pages/blog/[...path].astro` 同时承担「文件夹页」和「文章页」两个角色——`getStaticPaths()` 枚举出所有文件夹路径与文章路径，命中文章时调用 `render()`：

```astro
---
const post = props.kind === 'post' ? props.post : undefined;
const { Content } = post ? await render(post) : { Content: null };
---

{Content && (
  <div class="prose">
    <Content />
  </div>
)}
```

代码块由 Shiki 高亮，且配置了**双主题**——浅色模式用 `github-light`，深色模式用 `github-dark`，跟随站点的深浅色切换。

## 为什么适合个人博客

- ✅ **零数据库**：文章就是文件，可以用 Git 做版本管理；
- ✅ **构建即校验**：frontmatter 写错会立刻报错，而不是上线后才发现；
- ✅ **秒开**：纯静态输出，没有客户端渲染；
- ✅ **可迁移**：Markdown 是通用格式，换工具成本极低。

如果你也在找「简单、可控、够用」的博客方案，Astro 内容集合值得一试。
