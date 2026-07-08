const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const isValidScore = (score) => {
  return Number.isInteger(score) && score >= 0 && score <= 5;
};

const isValidTier = (tier) => {
  return ['free', 'starter', 'professional', 'enterprise'].includes(tier);
};

const isValidBadgeTier = (tier) => {
  return ['aware', 'aligned', 'assured'].includes(tier);
};

module.exports = {
  isValidEmail,
  isValidScore,
  isValidTier,
  isValidBadgeTier
};
