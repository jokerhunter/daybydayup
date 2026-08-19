import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { postDir } from '../lib/posts';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      customData: postDir(post)
        .split('/')
        .filter(Boolean)
        .map((dir) => `<category>${dir}</category>`)
        .join(''),
    })),
    customData: '<language>zh-cn</language>',
  });
}
