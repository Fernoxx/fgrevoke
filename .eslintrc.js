module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  globals: {
    BigInt: 'readonly'
  },
  rules: {
    'no-undef': 'off'
  }
};