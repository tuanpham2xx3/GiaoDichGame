/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: false,
      tsconfig: {
        strict: false,
        noUncheckedIndexedAccess: false,
        skipLibCheck: true,
        moduleResolution: 'node',
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@giaodich/shared(.*)$': '<rootDir>/../../../packages/shared/src$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'src/wallet/wallet.service.spec.ts',
    'src/orders/orders.service.spec.ts',
    'src/queue/processors/orders.processor.spec.ts',
    'src/auth/auth.service.spec.ts',
  ],
};
