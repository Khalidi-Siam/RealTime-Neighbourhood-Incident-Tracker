// Central API configuration and service functions
// This file centralizes all API calls to make it easy to manage base URLs and endpoints
// Automatically detects and switches between local development server and production server

// Configuration - Automatically detect available API endpoint
let API_BASE_URL = null;
const LOCAL_API = 'http://localhost:3000/api';
const PRODUCTION_API = 'https://realtime-neighbourhood-incident-tracker.onrender.com/api';

// Function to detect which API endpoint is available
const detectAvailableAPI = async () => {
  if (API_BASE_URL) return API_BASE_URL; // Return cached result
  
  // Helper function to create fetch with timeout
  const fetchWithTimeout = (url, timeout = 3000) => {
    return Promise.race([
      fetch(url, { method: 'GET' }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  };
  
  // Try local API first (use root endpoint since no /health endpoint exists)
  try {
    const response = await fetchWithTimeout(LOCAL_API.replace('/api', ''), 3000);
    if (response.ok || response.status < 500) {
      API_BASE_URL = LOCAL_API;
      console.log('Using local API:', LOCAL_API);
      return API_BASE_URL;
    }
  } catch (error) {
    console.log('Local API not available, trying production API...');
  }
  
  // Fall back to production API
  try {
    const response = await fetchWithTimeout(PRODUCTION_API.replace('/api', ''), 5000);
    if (response.ok || response.status < 500) {
      API_BASE_URL = PRODUCTION_API;
      console.log('Using production API:', PRODUCTION_API);
      return API_BASE_URL;
    }
  } catch (error) {
    console.log('Production API not available');
  }
  
  // Default to production if both fail (for graceful degradation)
  API_BASE_URL = PRODUCTION_API;
  console.log('Defaulting to production API:', PRODUCTION_API);
  return API_BASE_URL;
};

// Initialize API detection
detectAvailableAPI();

// Helper function to get auth headers
const getAuthHeaders = (includeAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

// Helper function to get the detected API base URL
const getApiBaseUrl = async () => {
  return await detectAvailableAPI();
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error' };
    }
    
    // Handle validation errors that come as an array of objects
    let errorMessage = 'Request failed';
    if (errorData.message) {
      if (Array.isArray(errorData.message)) {
        // If message is an array of error objects, extract the messages
        errorMessage = errorData.message.map(err => err.message || err).join(', ');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (typeof errorData.message === 'object') {
        errorMessage = JSON.stringify(errorData.message);
      }
    }
    
    throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// ===== AUTH API =====
export const authAPI = {
  // Login user
  login: async (email, password) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  // Register user
  register: async (username, email, phone, password) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, email, phone, password }),
    });
    return handleResponse(response);
  },

  // Get user profile
  getProfile: async () => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/profile`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get all users
  getAllUsers: async (page = 1, limit = 20, search = '') => {
    const baseUrl = await getApiBaseUrl();
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    
    const response = await fetch(`${baseUrl}/auth/admin/users?${params}`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get users count
  getUsersCount: async () => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/admin/users-count`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },
};

// ===== INCIDENTS API =====
export const incidentsAPI = {
  // Get all incidents with filters and pagination
  getAll: async (filters = {}) => {
    const baseUrl = await getApiBaseUrl();
    const {
      page = 1,
      limit = 10,
      category = '',
      severity = '',
      sortBy = 'timestamp',
      order = -1,
    } = filters;

    const params = new URLSearchParams({
      page,
      limit,
      sortBy,
      order,
    });

    if (category && category !== 'All') params.append('category', category);
    if (severity && severity !== 'All') params.append('severity', severity);

    const headers = getAuthHeaders();
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/incidents?${params}`, {
      headers,
    });
    return handleResponse(response);
  },

  // Get incident by ID
  getById: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const headers = getAuthHeaders();
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/incidents/${incidentId}`, {
      headers,
    });
    return handleResponse(response);
  },

  // Create new incident
  create: async (incidentData) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/submit`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(incidentData),
    });
    return handleResponse(response);
  },

  // Delete incident
  delete: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Vote on incident
  vote: async (incidentId, voteType) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ voteType }),
    });
    return handleResponse(response);
  },

  // Report false incident
  reportFalse: async (incidentId, reason) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/report-false`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  // Check if user has reported incident
  checkUserReport: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/user-report`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get reported incidents
  getReportedIncidents: async (page = 1, limit = 10) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/admin/reported-incidents?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Accept false report
  acceptFalseReport: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/accept`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Reject false report
  rejectFalseReport: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },
};

// ===== COMMENTS API =====
export const commentsAPI = {
  // Get comments for an incident
  getByIncident: async (incidentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/comments`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create new comment
  create: async (incidentId, content) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/incidents/${incidentId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text: content }), // Backend expects 'text' not 'content'
    });
    return handleResponse(response);
  },

  // Update comment
  update: async (commentId, content) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/comment/${commentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text: content }), // Backend expects 'text' not 'content'
    });
    return handleResponse(response);
  },

  // Delete comment
  delete: async (commentId) => {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/comment/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },
};

// ===== UTILITY FUNCTIONS =====

// Get the base URL for easy configuration changes
export const getBaseURL = async () => {
  return await getApiBaseUrl();
};

// Change the base URL (useful for environment switching)
export const setBaseURL = (newBaseURL) => {
  API_BASE_URL = newBaseURL;
  console.log('Base URL updated to:', newBaseURL);
};

// Generic fetch wrapper for custom endpoints
export const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = await getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(options.auth !== false),
    ...options,
  });
  return handleResponse(response);
};

// Export the base URL getter for external access
export { getApiBaseUrl as getAPIBaseURL };
