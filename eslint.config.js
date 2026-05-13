import path from 'node:path';

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const fileNamingPlugin = {
  rules: {
    camelcase: {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require camelCase file names and disallow kebab-case names.',
        },
        messages: {
          kebabCase:
            'File names must use camelCase. Rename "{{name}}" to remove hyphens.',
        },
      },
      create(context) {
        const filename = context.filename || context.getFilename();
        if (!filename || filename === '<input>' || filename === '<text>') {
          return {};
        }

        const basename = path.basename(filename);
        if (basename.endsWith('.d.ts')) {
          return {};
        }

        if (!basename.includes('-')) {
          return {};
        }

        return {
          Program(node) {
            context.report({
              node,
              messageId: 'kebabCase',
              data: { name: basename },
            });
          },
        };
      },
    },
  },
};

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
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
      'file-naming': fileNamingPlugin,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'file-naming/camelcase': 'error',
    },
  },
];
