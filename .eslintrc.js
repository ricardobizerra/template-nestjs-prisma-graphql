module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
  overrides: [
    {
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@nestjs/*',
                  '@/lib/*',
                  '@/infrastructure/*',
                  '@/infrastructure/**',
                  '@prisma/client',
                  '@/**/infrastructure/*',
                  '@/**/application/*',
                  '@/**/presentation/*',
                ],
                message:
                  'Domain layer cannot depend on framework, infrastructure, application, or presentation.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/**/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@/lib/*',
                  '@/infrastructure/*',
                  '@/infrastructure/**',
                  '@prisma/client',
                  '@/**/infrastructure/*',
                  '@/**/presentation/*',
                ],
                message:
                  'Application layer can depend on domain/ports (and Nest DI), but not infra or presentation.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/**/presentation/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@/lib/prisma/*',
                  '@/lib/queue/*',
                  '@/lib/storage/*',
                  '@/lib/redis/*',
                  '@prisma/client',
                ],
                message:
                  'Presentation must access infra only through application/use-case abstractions.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/infrastructure/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/**/presentation/*'],
                message:
                  'Infrastructure must not depend on presentation layer.',
              },
            ],
          },
        ],
      },
    },
  ],
};
