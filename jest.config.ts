import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/src/**/*.service.ts',
    'apps/**/src/**/*.controller.ts',
    'apps/**/src/**/*.guard.ts',
    '!apps/**/src/main.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/shared(.*)$': '<rootDir>/libs/shared/src$1',
    '^@app/shared$': '<rootDir>/libs/shared/src',
  },
  verbose: true,
};

export default config;
