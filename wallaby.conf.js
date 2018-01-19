module.exports = function(wallaby) {
  return {
    env: {
      type: 'node'
    },
    testFramework: 'mocha',

    files: [
      'src/**/*.{ts,html,css}',
      {
        pattern: 'test/**/_suite.ts',
        instrument: false
      }
    ],
    tests: ['test/unit/**/*.ts'],
    preprocessors: {
      '**/*.{html,css}': (file) => ({ code: `module.exports = ${JSON.stringify(file.content)};` })
    },
    setup() {
      require('@storefront/testing').wallaby(require('chai'));
    }
  };
};
