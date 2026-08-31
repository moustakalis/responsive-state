// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Use the injected window from options — the core must stay SSR-safe.' },
      ],
    },
  },
  { files: ['test/**', '*.config.ts'], rules: { 'no-restricted-globals': 'off' } },
);
