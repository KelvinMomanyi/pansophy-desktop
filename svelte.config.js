import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  compilerOptions: {
    compatibility: {
      componentApi: 4,
    },
  },
  preprocess: vitePreprocess(),
};
