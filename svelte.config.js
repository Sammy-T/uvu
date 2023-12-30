import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    prerender: {
      handleMissingId: 'warn'
    }
  },

  preprocess: [vitePreprocess({})],
};

export default config;
