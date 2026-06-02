/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/__mocks__/setupGlobals.cjs'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.cjs',
    '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/tests/__mocks__/fileMock.cjs',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(dexie|fake-indexeddb)/)',
  ],
};
