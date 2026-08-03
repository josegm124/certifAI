const PASSWORD_POLICY_MESSAGE = 'Password must have at least 6 characters, one uppercase letter, and one number';

const isPasswordValid = (password) => {
  const value = String(password || '');
  return value.length >= 6 &&
    value.length <= 200 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value);
};

module.exports = { isPasswordValid, PASSWORD_POLICY_MESSAGE };
