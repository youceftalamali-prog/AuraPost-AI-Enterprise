export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateRequestPayload = (payload: any, requiredFields: string[]): ValidationResult => {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Payload must be a valid object.'] };
  }

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};