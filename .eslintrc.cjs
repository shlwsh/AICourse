/**
 * ESLint 配置文件
 * 定义代码检查规则
 *
 * 规则说明：
 * - 使用 TypeScript 严格类型检查
 * - 遵循 Vue 3 最佳实践
 * - 强制代码风格一致性
 * - 确保代码质量和可维护性
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:vue/vue3-strongly-recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    // ========== TypeScript 规则 ==========

    // 类型安全
    '@typescript-eslint/no-explicit-any': 'warn',

    // 未使用变量
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // 函数返回类型
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // 命名规范
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      {
        selector: 'class',
        format: ['PascalCase'],
      },
    ],

    // 禁止使用 require
    '@typescript-eslint/no-require-imports': 'error',

    // 禁止使用 var
    '@typescript-eslint/no-var-requires': 'error',

    // 优先使用 nullish coalescing（需要 parserOptions.project，暂时禁用）
    '@typescript-eslint/prefer-nullish-coalescing': 'off',

    // 优先使用 optional chaining（需要 parserOptions.project，暂时禁用）
    '@typescript-eslint/prefer-optional-chain': 'off',

    // 禁止不必要的类型断言（需要 parserOptions.project，暂时禁用）
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',

    // ========== Vue 规则 ==========

    // 组件命名
    'vue/multi-word-component-names': 'off',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],

    // 属性顺序
    'vue/attributes-order': [
      'warn',
      {
        order: [
          'DEFINITION',
          'LIST_RENDERING',
          'CONDITIONALS',
          'RENDER_MODIFIERS',
          'GLOBAL',
          'UNIQUE',
          'TWO_WAY_BINDING',
          'OTHER_DIRECTIVES',
          'OTHER_ATTR',
          'EVENTS',
          'CONTENT',
        ],
      },
    ],

    // 组件选项顺序
    'vue/order-in-components': [
      'warn',
      {
        order: [
          'el',
          'name',
          'key',
          'parent',
          'functional',
          ['delimiters', 'comments'],
          ['components', 'directives', 'filters'],
          'extends',
          'mixins',
          ['provide', 'inject'],
          'ROUTER_GUARDS',
          'layout',
          'middleware',
          'validate',
          'scrollToTop',
          'transition',
          'loading',
          'inheritAttrs',
          'model',
          ['props', 'propsData'],
          'emits',
          'setup',
          'asyncData',
          'data',
          'fetch',
          'head',
          'computed',
          'watch',
          'watchQuery',
          'LIFECYCLE_HOOKS',
          'methods',
          ['template', 'render'],
          'renderError',
        ],
      },
    ],

    // HTML 属性
    'vue/html-self-closing': [
      'warn',
      {
        html: {
          void: 'always',
          normal: 'never',
          component: 'always',
        },
        svg: 'always',
        math: 'always',
      },
    ],

    // 最大属性数
    'vue/max-attributes-per-line': [
      'warn',
      {
        singleline: 3,
        multiline: 1,
      },
    ],

    // HTML 缩进
    'vue/html-indent': [
      'warn',
      2,
      {
        attribute: 1,
        baseIndent: 1,
        closeBracket: 0,
        alignAttributesVertically: true,
      },
    ],

    // 禁止使用 v-html（安全考虑）
    'vue/no-v-html': 'warn',

    // 要求 prop 默认值
    'vue/require-default-prop': 'warn',

    // 要求 prop 类型
    'vue/require-prop-types': 'error',

    // 禁止在 computed 中使用异步操作
    'vue/no-async-in-computed-properties': 'error',

    // 禁止重复的键
    'vue/no-dupe-keys': 'error',

    // 禁止重复的属性
    'vue/no-duplicate-attributes': 'error',

    // 组合式 API 规则
    'vue/no-setup-props-destructure': 'error',
    'vue/prefer-import-from-vue': 'error',

    // ========== 通用规则 ==========

    // 控制台和调试
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    // 代码风格
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
    'no-trailing-spaces': 'warn',
    'eol-last': ['warn', 'always'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],
    'arrow-spacing': 'warn',
    'key-spacing': 'warn',
    'keyword-spacing': 'warn',
    'space-before-blocks': 'warn',
    'space-infix-ops': 'warn',

    // 最佳实践
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-return': 'warn',
    'no-else-return': 'warn',
    'no-lonely-if': 'warn',
    'no-unneeded-ternary': 'warn',

    // 错误预防
    'no-duplicate-imports': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'warn',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    'require-atomic-updates': 'error',

    // 复杂度控制
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 5],
  },
  overrides: [
    {
      // 测试文件规则放宽
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.tsx', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        'max-lines-per-function': 'off',
      },
    },
    {
      // 配置文件规则放宽
      files: ['*.config.ts', '*.config.js', '.eslintrc.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      // Scripts 目录规则放宽
      files: ['scripts/**/*.ts', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
