import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tailwindcss from 'eslint-plugin-tailwindcss';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
      prettier: prettier,
      tailwindcss,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
      'tailwindcss/no-contradicting-classname': 'warn',
      'tailwindcss/enforces-negative-arbitrary-values': 'warn',
      'tailwindcss/no-arbitrary-value': 'warn',
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'warn',
      'import/no-duplicates': 'error',
      'import/no-named-as-default-member': 'warn',
    },
  },
];
