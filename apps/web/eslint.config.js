import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The React Compiler cannot memoize the functions returned by TanStack
      // Table (useReactTable) or React Hook Form (useForm/watch), so it safely
      // skips optimizing those components. This rule only reports that skip — it
      // flags no defect and can't be resolved without dropping those libraries —
      // so we disable it rather than carry permanent, un-actionable warnings.
      'react-hooks/incompatible-library': 'off',
    },
  },
])
