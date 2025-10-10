{
  "preset": "ts-jest",
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/src/setupTests.ts"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@/hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@/services/(.*)$": "<rootDir>/src/services/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
    "^@/utils/(.*)$": "<rootDir>/src/utils/$1"
  },
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  "testMatch": [
    "<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)",
    "<rootDir>/src/**/*.(test|spec).(ts|tsx|js)"
  ],
  "collectCoverageFrom": [
    "src/**/*.(ts|tsx)",
    "!src/**/*.d.ts",
    "!src/setupTests.ts",
    "!src/vite-env.d.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  },
  "coverageReporters": ["text", "lcov", "html"],
  "testTimeout": 10000,
  "moduleFileExtensions": ["ts", "tsx", "js", "jsx", "json"],
  "transformIgnorePatterns": [
    "node_modules/(?!(.*\\.mjs$|@testing-library|@tanstack))"
  ]
}
