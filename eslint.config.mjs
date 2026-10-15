import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  globalIgnores([
    '.next/',
    'node_modules/',
    'src/payload-types.ts',
    'src/payload-generated-schema.ts',
    'src/migrations/',
    'src/app/(payload)/',
    'src/styles/tokens.generated.ts',
    'tests/fixtures/',
    'playwright-report/',
    'test-results/',
  ]),
])
