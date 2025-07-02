import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  compilerOptions: {
    dev: true,
    compatibility: {
      componentApi: 4,
    },
  },
  preprocess: vitePreprocess(),
};
