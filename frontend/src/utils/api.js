// Central API configuration and service functions
// This file centralizes all API calls to make it easy to manage base URLs and endpoints

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

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
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  // Register user
  register: async (username, email, phone, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, email, phone, password }),
    });
    return handleResponse(response);
  },

  // Get user profile
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get all users
  getAllUsers: async (page = 1, limit = 20, search = '') => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    
    const response = await fetch(`${API_BASE_URL}/auth/admin/users?${params}`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get users count
  getUsersCount: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/admin/users-count`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },
};

// ===== INCIDENTS API =====
export const incidentsAPI = {
  // Get all incidents with filters and pagination
  getAll: async (filters = {}) => {
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

    const response = await fetch(`${API_BASE_URL}/incidents?${params}`, {
      headers,
    });
    return handleResponse(response);
  },

  // Get incident by ID
  getById: async (incidentId) => {
    const headers = getAuthHeaders();
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
      headers,
    });
    return handleResponse(response);
  },

  // Create new incident
  create: async (incidentData) => {
    const response = await fetch(`${API_BASE_URL}/incidents/submit`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(incidentData),
    });
    return handleResponse(response);
  },

  // Delete incident
  delete: async (incidentId) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Vote on incident
  vote: async (incidentId, voteType) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ voteType }),
    });
    return handleResponse(response);
  },

  // Report false incident
  reportFalse: async (incidentId, reason) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/report-false`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  // Check if user has reported incident
  checkUserReport: async (incidentId) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/user-report`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Get reported incidents
  getReportedIncidents: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/incidents/admin/reported-incidents?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Accept false report
  acceptFalseReport: async (incidentId) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/accept`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },

  // Admin: Reject false report
  rejectFalseReport: async (incidentId) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/reject`, {
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
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/comments`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create new comment
  create: async (incidentId, content) => {
    const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text: content }), // Backend expects 'text' not 'content'
    });
    return handleResponse(response);
  },

  // Update comment
  update: async (commentId, content) => {
    const response = await fetch(`${API_BASE_URL}/comment/${commentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text: content }), // Backend expects 'text' not 'content'
    });
    return handleResponse(response);
  },

  // Delete comment
  delete: async (commentId) => {
    const response = await fetch(`${API_BASE_URL}/comment/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    return handleResponse(response);
  },
};

// ===== UTILITY FUNCTIONS =====

// Get the base URL for easy configuration changes
export const getBaseURL = () => API_BASE_URL;

// Change the base URL (useful for environment switching)
export const setBaseURL = (newBaseURL) => {
  // Note: This would require modifying the constant above
  // For a more dynamic approach, you could use a variable instead of a const
  console.warn('To change the base URL, modify the API_BASE_URL constant in api.js');
};

// Generic fetch wrapper for custom endpoints
export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(options.auth !== false),
    ...options,
  });
  return handleResponse(response);
};

// Export the base URL constant for external access
export { API_BASE_URL };
