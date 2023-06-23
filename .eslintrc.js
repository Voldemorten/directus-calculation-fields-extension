module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    plugins: ['prettier'],
    extends: ['eslint:recommended', 'prettier'],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module'
    },
    rules: {
        'no-console': 0,
        'prettier/prettier': [2, { tabWidth: 4 }], // Means error  }
        'no-unused-vars': 1
    }
};
