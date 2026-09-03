import eslint from '@eslint/js';
import globals from 'globals';
import playwright from 'eslint-plugin-playwright';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

const legacyDebtRules = {
  complexity: 'warn',
  'max-lines-per-function': 'warn',
  'max-lines': 'warn',
  'max-params': 'warn',
  'sonarjs/cognitive-complexity': 'warn',
  'sonarjs/no-duplicate-string': 'warn',
  'sonarjs/prefer-regexp-exec': 'warn',
  'sonarjs/void-use': 'warn',
  'sonarjs/no-nested-functions': 'warn',
  'sonarjs/code-eval': 'warn',
  'sonarjs/no-nested-conditional': 'warn',
  'sonarjs/no-nested-template-literals': 'warn',
  'sonarjs/super-linear-regex': 'warn',
  'sonarjs/no-redundant-jump': 'warn',
  'sonarjs/no-dead-store': 'warn',
  'sonarjs/fixme-tag': 'warn',
  'sonarjs/todo-tag': 'warn',
  'sonarjs/assertions-in-tests': 'off',
  '@typescript-eslint/explicit-function-return-type': 'warn',
  'no-useless-assignment': 'warn',
  'no-useless-escape': 'warn',
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'reports/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'playwright/.cache/**',
      'playwright/.auth/**',
      'scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': [
        'error',
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/cognitive-complexity': ['error', 10],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/page-objects/**/*.ts'],
    rules: legacyDebtRules,
  },
  {
    files: ['src/config/**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      complexity: 'warn',
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-duplicate-string': 'warn',
    },
  },
  {
    // Specs are scenario-length by design.
    files: ['tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'sonarjs/no-duplicate-string': 'warn',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-redeclare': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['src/**/*.ts'],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-element-handle': 'warn',
      'playwright/no-eval': 'error',
      'playwright/no-networkidle': 'error',
    },
  }
);
