import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

    const response = await api.post('/forms/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Create form from markdown text
  createForm: async (markdown, settings = {}) => {
    const response = await api.post('/forms/create', {
      markdown,
      settings,
    });
    return response.data;
  },

  // Get form by URL ID (public)
  getPublicForm: async (urlId) => {
    const response = await api.get(`/forms/public/${urlId}`);
    return response.data;
  },

  // Get all forms (admin)
  getAllForms: async (createdBy = 'anonymous') => {
    const response = await api.get('/forms', {
      params: { createdBy }
    });
    return response.data;
  },

  // Get form details with stats
  getFormDetails: async (formId) => {
    const response = await api.get(`/forms/${formId}`);
    return response.data;
  },

  // Update form settings
  updateForm: async (formId, updates) => {
    const response = await api.patch(`/forms/${formId}`, updates);
    return response.data;
  },

  // Delete form
  deleteForm: async (formId) => {
    const response = await api.delete(`/forms/${formId}`);
    return response.data;
  },
};

// Response APIs
export const responseAPI = {
  // Submit form response
  submitResponse: async (urlId, data) => {
    const startTime = data.startTime || Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    const response = await api.post(`/responses/submit/${urlId}`, {
      answers: data.answers,
      email: data.email,
      metadata: {
        timeSpent,
        deviceType: getDeviceType(),
      },
    });
    return response.data;
  },

  // Get form responses
  getResponses: async (formId, page = 1, limit = 50) => {
    const response = await api.get(`/responses/form/${formId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Export responses as CSV
  exportResponses: async (formId) => {
    const response = await api.get(`/responses/form/${formId}`, {
      params: { export: true },
      responseType: 'blob'
    });
    return response.data;
  },

  // Get response statistics
  getResponseStats: async (formId) => {
    const response = await api.get(`/responses/stats/${formId}`);
    return response.data;
  },

  // Delete response
  deleteResponse: async (responseId) => {
    const response = await api.delete(`/responses/${responseId}`);
    return response.data;
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