export const mapSettingsError = (error: any): string => {
  if (!error) return 'An unknown error occurred.';
  if (error.response?.status === 403) return 'You do not have permission to perform this action.';
  if (error.response?.status === 404) return 'The requested resource was not found.';
  if (error.response?.status === 409) return 'Conflict: This resource was modified by someone else.';
  if (error.response?.status === 429) return 'Too many requests. Please wait a moment.';
  if (error.response?.status >= 500) return 'Server error. Please try again later.';
  if (error.message === 'Failed to fetch' || error.name === 'AbortError' || error.message === 'Request timeout') {
    return 'Network error. Please check your connection.';
  }
  return error.message || 'An unexpected error occurred.';
};