import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**', 'logs/**', 'saves/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/array-type': 'off',
    },
  },
  {
    files: ['src/domain/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
          message:
            'Math.random() is banned in domain and content layers. Use injected SeededRandom.',
        },
        {
          selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
          message:
            'Date.now() is banned in domain and content layers. Keep domain logic deterministic.',
        },
        {
          selector: 'CallExpression[callee.object.name="performance"][callee.property.name="now"]',
          message:
            'performance.now() is banned in domain and content layers. Keep domain logic deterministic.',
        },
        {
          selector: 'NewExpression[callee.name="Date"]',
          message:
            'new Date() is banned in domain and content layers. Keep domain logic deterministic.',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
