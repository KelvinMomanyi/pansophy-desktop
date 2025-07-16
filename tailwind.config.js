// tailwind.config.js
export default {
    darkMode: 'class', // Enables class-based dark mode
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
      extend: {},
    },
    plugins: [
      require('@tailwindcss/backdrop-filter'), // If available, check Tailwind plugins
    ],
  };
  