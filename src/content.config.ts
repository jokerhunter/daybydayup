import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * blog 内容集合：
 * 所有放在 src/content/blog/ 下的 .md 文件都会自动成为一篇博客文章。
 * 文件夹结构即站点目录：每一层文件夹是「目录」，文件是「文章」，
 * 新增、修改或删除 md 文件后，dev 模式即时刷新，build 时重新生成静态页面。
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    /** 文章标题 */
    title: z.string(),
    /** 文章简介，用于列表页与 RSS */
    description: z.string(),
    /** 发布日期 */
    pubDate: z.coerce.date(),
    /** 最后更新日期（可选） */
    updatedDate: z.coerce.date().optional(),
    /** 草稿：true 时不会出现在列表 / 目录 / RSS 中，但仍可本地直接访问 */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
