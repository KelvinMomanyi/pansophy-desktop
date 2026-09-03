import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', 'src-tauri/target/**'],
  },
  eslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.{js,svelte}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.js', 'src/lib/logger.js'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
];
