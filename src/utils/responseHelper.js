export const createSuccessResponse = (data, message = 'Operation successful', additionalData = {}) => ({
  success: true, message, data, timestamp: new Date().toISOString(), ...additionalData
});

export const createErrorResponse = (message, error = null) => ({
  success: false, message, error: error?.message || error || null, timestamp: new Date().toISOString()
});
