// Use environment variable for API URL, fallback to local proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_BASE_CLEAN = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;

const buildUrl = (path, params) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${API_BASE_CLEAN}${normalizedPath}${query}`;
};

const handleResponse = async (response, responseType = 'json') => {
  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.clone().json();
    } catch (_) {
      errorPayload = await response.text();
    }

    const error = new Error(
      typeof errorPayload === 'object' && errorPayload !== null && errorPayload.error
        ? errorPayload.error
        : `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text();
  }

  // Default to JSON; handle empty responses gracefully
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const request = async (path, { method = 'GET', params, body, headers = {}, responseType } = {}) => {
  const url = buildUrl(path, params);
  const fetchOptions = {
    method,
    headers: {
      ...headers,
    },
  };

  if (body instanceof FormData) {
    fetchOptions.body = body;
    // Let the browser set multipart boundaries automatically
    delete fetchOptions.headers['Content-Type'];
  } else if (body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
  }

  const response = await fetch(url, fetchOptions);
  return handleResponse(response, responseType);
};

const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};

// Form APIs
export const formAPI = {
  // Upload markdown file
  uploadMarkdown: async (file, settings = {}) => {
    const formData = new FormData();
    formData.append('markdown', file);
    if (settings) {
      Object.keys(settings).forEach(key => {
        formData.append(`settings[${key}]`, settings[key]);
      });
    }

    return api.post('/forms/upload', formData);
  },

  // Create form from markdown text
  createForm: async (markdown, settings = {}) => {
    return api.post('/forms/create', {
      markdown,
      settings,
    });
  },

  // Get form by URL ID (public)
  getPublicForm: async (urlId) => {
    return api.get(`/forms/public/${urlId}`);
  },

  // Get all forms (admin)
  getAllForms: async (createdBy = 'anonymous') => {
    return api.get('/forms', {
      params: { createdBy }
    });
  },

  // Get form details with stats
  getFormDetails: async (formId) => {
    return api.get(`/forms/${formId}`);
  },

  // Update form settings
  updateForm: async (formId, updates) => {
    return api.patch(`/forms/${formId}`, updates);
  },

  // Delete form
  deleteForm: async (formId) => {
    return api.delete(`/forms/${formId}`);
  },
};

// Response APIs
export const responseAPI = {
  // Submit form response
  submitResponse: async (urlId, data) => {
    const startTime = data.startTime || Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    return api.post(`/responses/submit/${urlId}`, {
      answers: data.answers,
      email: data.email,
      metadata: {
        timeSpent,
        deviceType: getDeviceType(),
      },
    });
  },

  // Get form responses
  getResponses: async (formId, page = 1, limit = 50) => {
    return api.get(`/responses/form/${formId}`, {
      params: { page, limit }
    });
  },

  // Export responses as CSV
  exportResponses: async (formId) => {
    return api.get(`/responses/form/${formId}`, {
      params: { export: true },
      responseType: 'blob'
    });
  },

  // Get response statistics
  getResponseStats: async (formId) => {
    return api.get(`/responses/stats/${formId}`);
  },

  // Delete response
  deleteResponse: async (responseId) => {
    return api.delete(`/responses/${responseId}`);
  },
};

// Utility function to detect device type
function getDeviceType() {
  const userAgent = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

export default api;
