import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { postDir } from '../lib/posts';

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  const staticRoutes = ['', '/blog/', '/about'];

  // 所有文件夹目录页
  const dirSet = new Set<string>();
  for (const p of posts) {
    const dir = postDir(p);
    if (!dir) continue;
    const parts = dir.split('/');
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      dirSet.add(acc);
    }
  }

  const urls = [
    ...staticRoutes.map((route) => ({
      loc: `${SITE.url}${route}`,
      lastmod: undefined as string | undefined,
    })),
    ...[...dirSet].map((dir) => ({
      loc: `${SITE.url}/blog/${dir}/`,
      lastmod: undefined as string | undefined,
    })),
    ...posts.map((post) => ({
      loc: `${SITE.url}/blog/${post.id}/`,
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
