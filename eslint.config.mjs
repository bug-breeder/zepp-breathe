import js from '@eslint/js';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'assets/**'] },

  // Device app code — ZeppOS environment
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        App: 'readonly',
        Page: 'readonly',
        AppService: 'readonly',
        getApp: 'readonly',
        px: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
