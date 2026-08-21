/**
 * 站点全局配置。
 * 修改这里的值即可改站名、描述、作者与网址（RSS / sitemap 也会同步生效）。
 */
export const SITE = {
  /** 部署后的站点地址（用于 sitemap 与 RSS），本地预览时不影响 dev server */
  url: 'https://aiden-jude.dev',
  title: 'Aiden Jude 的博客',
  description: '写代码、写生活、写思考。用 Astro 构建的个人博客——文件夹即目录，Markdown 即文章。',
  author: 'Aiden Jude',
  lang: 'zh-CN',
} as const;

/** 每篇文章的阅读速度（字/分钟），用于估算阅读时长 */
export const WORDS_PER_MINUTE = 400;
