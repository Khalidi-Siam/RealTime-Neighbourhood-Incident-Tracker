import { useState, useCallback } from 'react';

/**
 * Custom hook to handle rate limiting and provide user feedback
 * @returns {Object} - Rate limit state and handlers
 */
export const useRateLimit = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  // Handle rate limit errors
  const handleRateLimitError = useCallback((error) => {
    if (error.isRateLimit) {
      setIsRateLimited(true);
      setRateLimitInfo({
        message: error.message,
        retryAfter: error.retryAfter,
        remaining: error.remaining,
        limit: error.limit,
        resetTime: error.retryAfter ? new Date(parseInt(error.retryAfter) * 1000) : null
      });
      
      // Auto-clear rate limit status after retry time
      if (error.retryAfter) {
        const resetTime = parseInt(error.retryAfter) * 1000;
        const now = Date.now();
        const timeUntilReset = resetTime - now;
        
        if (timeUntilReset > 0) {
          setTimeout(() => {
            setIsRateLimited(false);
            setRateLimitInfo(null);
          }, timeUntilReset);
        }
      }
      
      return true; // Indicates this was a rate limit error
    }
    return false; // Not a rate limit error
  }, []);

  // Clear rate limit status manually
  const clearRateLimit = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitInfo(null);
  }, []);

  // Enhanced API call wrapper that handles rate limiting
  const callWithRateLimit = useCallback(async (apiFunction, ...args) => {
    try {
      const result = await apiFunction(...args);
      // Clear any previous rate limit state on successful call
      if (isRateLimited) {
        clearRateLimit();
      }
      return result;
    } catch (error) {
      const wasRateLimit = handleRateLimitError(error);
      if (!wasRateLimit) {
        // Re-throw non-rate-limit errors
        throw error;
      }
      // For rate limit errors, we don't re-throw, just handle them
      return null;
    }
  }, [isRateLimited, handleRateLimitError, clearRateLimit]);

  return {
    isRateLimited,
    rateLimitInfo,
    handleRateLimitError,
    clearRateLimit,
    callWithRateLimit
  };
};

export default useRateLimit;