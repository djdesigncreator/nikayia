module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'backend/tsconfig.json' }] },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
