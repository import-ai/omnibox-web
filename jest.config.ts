import type { Config } from 'jest';

// Keep date assertions deterministic across developer machines and CI.
process.env.TZ = 'UTC';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(css|svg|png|jpe?g|gif|webp)$': '<rootDir>/src/__mocks__/assetMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupJest.ts'],
  transform: {
    '^.+/uuid/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true } }],
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid/|\\.pnpm/uuid@)'],
};

export default config;
