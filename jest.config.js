module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      // Automatically clear mock calls and instances between every test
      clearMocks: true,
      // The directory where Jest should output its coverage files
      coverageDirectory: 'coverage',
      // Indicates which provider should be used to instrument code for coverage
      coverageProvider: 'v8',
      // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
      moduleNameMapper: {
        // Handle module path aliases
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      // A list of paths to modules that run some code to configure or set up the testing framework before each test
      // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // Optional: if you need global setup
      // The glob patterns Jest uses to detect test files
      testMatch: [
        '**/tests/**/*.test.[jt]s?(x)',
        '**/?(*.)+(spec|test).[tj]s?(x)',
      ],
      // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    };