export const PLANS = {
  FREE:       { name: 'Free',       rateLimit: 100,    color: 'gray'   },
  BASIC:      { name: 'Basic',      rateLimit: 1000,   color: 'blue'   },
  PRO:        { name: 'Pro',        rateLimit: 10000,  color: 'purple' },
  ENTERPRISE: { name: 'Enterprise', rateLimit: 100000, color: 'gold'   }
};

export const getPlanByRateLimit = (rateLimit) => {
  if (rateLimit >= 100000) return 'ENTERPRISE';
  if (rateLimit >= 10000)  return 'PRO';
  if (rateLimit >= 1000)   return 'BASIC';
  return 'FREE';
};

export default PLANS;
