// @ts-check
import { defineConfig } from 'astro/config';
import { SITE } from './src/consts';

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  markdown: {
    shikiConfig: {
      // 双主题：浅色 / 深色模式下代码高亮自动切换
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
      wrap: true,
    },
  },
});
