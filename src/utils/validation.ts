export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!name.trim()) {
    errors.push('Name is required');
  } else {
    if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (name.trim().length > 50) {
      errors.push('Name must be less than 50 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateForm = (formData: { name?: string; email: string; password: string }, isSignUp: boolean) => {
  const results: { [key: string]: ValidationResult } = {};
  
  if (isSignUp && formData.name !== undefined) {
    results.name = validateName(formData.name);
  }
  
  results.email = validateEmail(formData.email);
  results.password = validatePassword(formData.password);
  
  const isValid = Object.values(results).every(result => result.isValid);
  const allErrors = Object.values(results).flatMap(result => result.errors);
  
  // Convert results to fieldErrors format
  const fieldErrors: { [key: string]: string[] } = {};
  Object.entries(results).forEach(([field, result]) => {
    fieldErrors[field] = result.errors;
  });
  
  return {
    isValid,
    errors: allErrors,
    fieldErrors
  };
};