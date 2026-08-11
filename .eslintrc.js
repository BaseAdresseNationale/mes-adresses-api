module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'eslint-plugin-security'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'legacy-api', 'scripts'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'security/detect-pseudoRandomBytes': 'error',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'crypto',
            importNames: ['pseudoRandomBytes'],
            message:
              'Utiliser randomBytes() (CSPRNG) au lieu de pseudoRandomBytes().',
          },
          {
            name: 'node:crypto',
            importNames: ['pseudoRandomBytes'],
            message:
              'Utiliser randomBytes() (CSPRNG) au lieu de pseudoRandomBytes().',
          },
        ],
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "MemberExpression[object.name='Math'][property.name='random']",
        message:
          "Math.random() n'est pas cryptographiquement sûr. Utiliser crypto.randomBytes() pour tout contexte de sécurité.",
      },
    ],
  },
};
