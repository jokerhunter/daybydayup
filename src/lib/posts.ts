import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

/** 读取所有已发布文章，按日期倒序 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 文章所在目录路径（不含文件名），如 "技术"、"技术/前端"；根目录为空字符串 */
export function postDir(post: BlogPost): string {
  const idx = post.id.lastIndexOf('/');
  return idx === -1 ? '' : post.id.slice(0, idx);
}

/** 文件名（含 .md），用于目录树与面包屑展示 */
export function postFile(post: BlogPost): string {
  const idx = post.id.lastIndexOf('/');
  return idx === -1 ? post.id : post.id.slice(idx + 1);
}

export interface DirNode {
  name: string; // 目录名或文件名（含 .md）
  path: string; // 相对 content/blog 的路径（目录不含尾斜杠）
  type: 'dir' | 'file';
  children?: DirNode[];
  post?: BlogPost;
  postCount: number; // 目录下文章总数（含子目录）
}

/** 由文章 id 构建目录树，与 src/content/blog 的文件夹结构完全一致 */
export function buildTree(posts: BlogPost[]): DirNode {
  const root: DirNode = {
    name: 'blog',
    path: '',
    type: 'dir',
    children: [],
    postCount: posts.length,
  };
  for (const post of posts) {
    const parts = post.id.split('/');
    let cur = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      let child = cur.children!.find(
        (c) => c.name === part && c.type === (isFile ? 'file' : 'dir')
      );
      if (!child) {
        child = isFile
          ? { name: part, path, type: 'file', post, postCount: 1 }
          : { name: part, path, type: 'dir', children: [], postCount: 0 };
        cur.children!.push(child);
      }
      cur = child;
    });
  }
  countPosts(root);
  sortTree(root.children ?? []);
  return root;
}

function countPosts(node: DirNode): number {
  if (node.type === 'file') return 1;
  node.postCount = (node.children ?? []).reduce((n, c) => n + countPosts(c), 0);
  return node.postCount;
}

/** 目录在前、文件在后，同类型按名称排序 */
export function sortTree(nodes: DirNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  for (const n of nodes) {
    if (n.children) sortTree(n.children);
  }
}

/** 按年份分组（用于首页文章列表） */
export function groupByYear(
  posts: BlogPost[]
): { year: number; posts: BlogPost[] }[] {
  const map = new Map<number, BlogPost[]>();
  for (const p of posts) {
    const y = p.data.pubDate.getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(p);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, posts: list }));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026.08.16 */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 08 / 16 */
export function fmtShort(d: Date): string {
  return `${pad(d.getMonth() + 1)} / ${pad(d.getDate())}`;
}

/** 估算阅读时长（分钟），按中文约 400 字/分钟 */
export function readingTime(body: string, perMinute = 400): number {
  return Math.max(1, Math.round(body.length / perMinute));
}
