import path from 'node:path';

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const IGNORED_FILE_NAMES = new Set(['App', 'index', 'main']);
const LOWER_CAMEL_CASE_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PASCAL_CASE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

function isSourceFile(filename) {
  return filename.split(path.sep).includes('src');
}

function getFileStem(basename) {
  return basename
    .replace(/\.d\.ts$/, '')
    .replace(/\.class\.[jt]sx?$/, '')
    .replace(/\.test\.[jt]sx?$/, '')
    .replace(/\.[jt]sx?$/, '');
}

const fileNamingPlugin = {
  rules: {
    camelcase: {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require PascalCase .tsx file names and camelCase .ts file names.',
        },
        messages: {
          tsxCase:
            'TSX file names must use PascalCase. Rename "{{name}}" to PascalCase.',
          tsCase:
            'TS file names must use camelCase. Rename "{{name}}" to camelCase.',
          noJsx:
            'TSX files must contain JSX. Rename "{{name}}" to a .ts file when it only exports functions, hooks, or constants.',
        },
      },
      create(context) {
        const filename = context.filename || context.getFilename();
        if (!filename || filename === '<input>' || filename === '<text>') {
          return {};
        }

        if (!isSourceFile(filename)) {
          return {};
        }

        const basename = path.basename(filename);
        if (
          basename.endsWith('.d.ts') ||
          basename.includes('.class.') ||
          basename.includes('.test.')
        ) {
          return {};
        }

        const stem = getFileStem(basename);
        if (!stem || IGNORED_FILE_NAMES.has(stem)) {
          return {};
        }

        return {
          Program(program) {
            const isTsx = basename.endsWith('.tsx');
            const isValid = isTsx
              ? PASCAL_CASE_PATTERN.test(stem)
              : LOWER_CAMEL_CASE_PATTERN.test(stem);

            if (isValid) {
              return;
            }

            context.report({
              node: program,
              messageId: isTsx ? 'tsxCase' : 'tsCase',
              data: { name: basename },
            });
          },
          'Program:exit'(program) {
            if (!basename.endsWith('.tsx')) {
              return;
            }

            const sourceCode = context.sourceCode ?? context.getSourceCode();
            const hasJsx = sourceCode.ast.tokens?.some(token =>
              ['JSXIdentifier', 'JSXText'].includes(token.type)
            );

            if (hasJsx) {
              return;
            }

            context.report({
              node: program,
              messageId: 'noJsx',
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
