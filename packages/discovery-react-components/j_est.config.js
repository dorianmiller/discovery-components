/** @type {import('jest').Config} */
const config = {
  verbose: true,
  resetMocks: false,
  displayName: 'Disco React Components (Unit) root',
  transform: {},
  moduleDirectories: ['packages/discovery-react-components/src'],
  rootDir: 'packages/discovery-react-components/src',
  transformIgnorePatterns: ['/!node_modules\\/react-virtualized/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/messages.{ts,js}',
    '!src/**/types.{ts,js}',
    '!src/**/typings.d.ts',
    '!src/**/__fixtures__/**',
    '!src/**/__stories__/**',
    '!src/**/*.stories.*'
  ]
};

module.exports = config;
