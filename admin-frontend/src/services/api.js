/**
 * API Service for Admin Backend
 * Connects to backend_v2 FastAPI (RAG Backend with NumPy vector search)
 */

// Base URL - use environment variable or default to localhost:8001
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

// Storage keys (must match AuthContext)
const TOKEN_STORAGE_KEY = 'admin_token';

/**
 * Get JWT token from storage (sessionStorage or localStorage)
 */
function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get session object for backward compatibility
 */
function getSession() {
  const token = getToken();
  return token ? { token } : null;
}

/**
 * Update token if server issued a new one (sliding expiration)
 */
function handleTokenRefresh(response) {
  const newToken = response.headers.get('X-New-Token');
  if (newToken) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    console.log('Token refreshed via sliding expiration');
  }
}

/**
 * Make an API request with authentication
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const token = getToken();

  try {
    const headers = {
      ...options.headers,
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    return handleResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or server down
    throw new ApiError(error.message || 'Network error', 0, { originalError: error });
  }
}

async function handleResponse(response) {
  // Check for token refresh (sliding expiration)
  handleTokenRefresh(response);

  if (!response.ok) {
    // Handle 401 - token expired, clear session
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem('admin_user_info');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `HTTP ${response.status}`,
      response.status,
      errorData
    );
  }

  return await response.json();
}

// ============================================
// Health & Dashboard API
// ============================================

export const healthApi = {
  /**
   * Check server health
   */
  async check() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get index stats (maps to backend /api/v1/stats)
   */
  async getStats() {
    return apiRequest('/api/v1/stats');
  },
};

// ============================================
// Knowledge Base API - connected to backend_v2
// ============================================

export const knowledgeBaseApi = {
  /**
   * List all documents from the vector store
   * Backend endpoint: GET /api/v1/documents
   */
  async list() {
    return apiRequest('/api/v1/documents');
  },

  // Alias for backwards compatibility
  async listDocuments() {
    return this.list();
  },

  /**
   * Permanently delete a document and all its chunks
   * Backend endpoint: DELETE /api/v1/documents/{document_id}
   */
  async delete(documentId) {
    return apiRequest(`/api/v1/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // Alias
  async deleteDocument(documentId) {
    return this.delete(documentId);
  },

  /**
   * Fetch the R2 preview URL for a document from the backend.
   * Backend returns JSON: { preview_url, document_id, source }
   */
  async preview(documentId) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/preview`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to load preview');
    const data = await response.json();
    return data.preview_url;
  },

  /**
   * Get the direct preview URL (calls the API to resolve the R2 link).
   * Returns a promise — use with await.
   */
  async getPreviewUrl(documentId) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/preview`, {
        headers,
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.preview_url;
    } catch {
      return null;
    }
  },

  /**
   * Get the download URL (triggers browser download)
   */
  getDownloadUrl(documentId) {
    return `${API_BASE_URL}/api/v1/documents/${documentId}/download`;
  },

  /**
   * Get reconstructed text content for a document
   * Backend endpoint: GET /api/v1/documents/{document_id}/content
   */
  async getContent(documentId) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/content`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to load content');
    return response.text();
  },
};

// ============================================
// Ingest API - for adding documents/text to knowledge base
// ============================================

export const ingestApi = {
  /**
   * Ingest text content into the vector store
   * Backend endpoint: POST /api/v1/ingest
   * @param {Object} data - Ingest request data
   * @param {string} data.content - Text content to ingest
   * @param {string} data.source - Source identifier (e.g. filename)
   * @param {string} [data.title] - Optional title
   * @param {string} [data.semester] - Optional semester filter (1st-8th)
   * @param {string} [data.stream] - Optional stream filter (cse, ece, eee, ee, me, ce)
   * @param {string} [data.subject] - Optional subject filter (cs, math, misc)
   */
  async ingest(data) {
    return apiRequest('/api/v1/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Filters API
// ============================================

export const filtersApi = {
  /**
   * Get available filter options
   * Backend endpoint: GET /api/v1/filters
   */
  async getFilters() {
    return apiRequest('/api/v1/filters');
  },
};

// ============================================
// Upload API - reads file content and sends to /api/v1/ingest
// ============================================

export const uploadApi = {
  async fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  },

  /**
   * Upload a single file by reading its text content and ingesting
   * @param {File} file - File to upload
   * @param {Object} options - Optional metadata (semester, stream, subject)
   * @param {Function} onStatusChange - Callback for status updates (status, progress)
   */
  async file(file, options = {}, onStatusChange = null) {
    if (onStatusChange) onStatusChange('uploading', 10);

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      const isDocx = file.name.toLowerCase().endsWith('.docx');
      const isPptx = file.name.toLowerCase().endsWith('.pptx');
      const isBinaryDoc = isPdf || isImage || isDocx || isPptx;
      let ingestPayload;

      if (isBinaryDoc) {
        const fileDataBase64 = await this.fileToBase64(file);
        let mimeType = file.type || 'application/octet-stream';
        if (isPdf) mimeType = 'application/pdf';
        if (isDocx) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (isPptx) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

        ingestPayload = {
          source: file.name,
          title: options.title || file.name,
          semester: options.semester || null,
          stream: options.stream || null,
          subject: options.subject || null,
          mime_type: mimeType,
          file_data_base64: fileDataBase64,
        };
      } else {
        // Keep existing behavior for text-like files.
        const content = await file.text();
        ingestPayload = {
          content,
          source: file.name,
          title: options.title || file.name,
          semester: options.semester || null,
          stream: options.stream || null,
          subject: options.subject || null,
        };
      }
      
      if (onStatusChange) onStatusChange('processing', 30);

      // Send to ingest endpoint
      const result = await ingestApi.ingest(ingestPayload);

      if (onStatusChange) {
        onStatusChange('embedding', 70);
        setTimeout(() => onStatusChange('storing', 90), 100);
        setTimeout(() => onStatusChange('complete', 100), 300);
      }

      return {
        status: 'success',
        document_id: result.document_id,
        chunks_created: result.chunks_created,
        message: result.message,
      };
    } catch (error) {
      if (onStatusChange) onStatusChange('error', 0);
      throw error;
    }
  },

  /**
   * Upload multiple files sequentially
   * @param {File[]} files - Array of files
   * @param {Object} options - Optional metadata (semester, stream, subject)
   * @param {Function} onStatusChange - Callback for status updates
   */
  async multiple(files, options = {}, onStatusChange = null) {
    const results = [];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const overallProgress = Math.round((i / files.length) * 100);

      if (onStatusChange) {
        onStatusChange('uploading', overallProgress, i);
      }

      try {
        const result = await this.file(file, options, (status, fileProgress) => {
          const totalProgress = Math.round((i / files.length) * 100 + (fileProgress / files.length));
          if (onStatusChange) {
            onStatusChange('uploading', totalProgress, i);
          }
        });

        results.push({ file: file.name, success: true, ...result });
        successCount++;

        if (onStatusChange) {
          onStatusChange('complete', Math.round(((i + 1) / files.length) * 100), i);
        }
      } catch (error) {
        results.push({ file: file.name, success: false, error: error.message });
        if (onStatusChange) {
          onStatusChange('error', overallProgress, i);
        }
      }
    }

    return {
      status: 'success',
      total: files.length,
      successful: successCount,
      failed: files.length - successCount,
      results
    };
  },
};

// ============================================
// Text Processing API - connected to /api/v1/ingest
// ============================================

export const textApi = {
  /**
   * Upload text content to knowledge base via ingest endpoint
   * @param {string} filename - Name for the document
   * @param {string} content - Text content
   * @param {Object} [filterOptions] - Optional filters (semester, stream, subject)
   * @param {Function} onStatusChange - Callback for status updates
   */
  async upload(filename, content, filterOptions = {}, onStatusChange = null) {
    if (onStatusChange) onStatusChange('uploading', 10);

    try {
      if (onStatusChange) onStatusChange('processing', 30);

      const result = await ingestApi.ingest({
        content: content,
        source: filename,
        title: filename,
        semester: filterOptions.semester || null,
        stream: filterOptions.stream || null,
        subject: filterOptions.subject || null,
      });

      if (onStatusChange) {
        setTimeout(() => onStatusChange('embedding', 70), 100);
        setTimeout(() => onStatusChange('storing', 90), 300);
        setTimeout(() => onStatusChange('complete', 100), 500);
      }

      return {
        status: 'success',
        document_id: result.document_id,
        chunks_created: result.chunks_created,
        message: result.message,
      };
    } catch (error) {
      if (onStatusChange) onStatusChange('error', 0);
      throw error;
    }
  },
};

// ============================================
// System Instructions API
// ============================================

export const systemInstructionsApi = {
  async get() {
    return apiRequest('/api/v1/system-instructions');
  },

  async save(content, message = null) {
    return apiRequest('/api/v1/system-instructions/save', {
      method: 'POST',
      body: JSON.stringify({ content, message }),
    });
  },

  async getHistory(limit = 10) {
    return apiRequest(`/api/v1/system-instructions/history?limit=${limit}`);
  },
};

// ============================================
// Auth API
// ============================================

export const authApi = {
  async login(email, password) {
    const result = await apiRequest('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.token) {
      sessionStorage.setItem('admin_token', result.token);
    }

    return result;
  },

  async logout() {
    localStorage.removeItem('admin_session');
    return { status: 'success' };
  },

  isLoggedIn() {
    return !!getToken();
  },

  getToken() {
    return getToken();
  },

  getSession() {
    return getSession();
  },
};

// ============================================
// User Management API (Superuser only)
// ============================================

export const userApi = {
  async list() {
    return apiRequest('/api/v1/users');
  },

  async get(userId) {
    return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}`);
  },

  async create(userData) {
    return apiRequest('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async update(userId, updateData) {
    return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async delete(userId) {
    return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async resetPassword(userId, newPassword) {
    return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  },
};

// ============================================
// Unified API object
// ============================================

export const api = {
  auth: authApi,
  health: healthApi,
  documents: knowledgeBaseApi,
  knowledgeBase: knowledgeBaseApi,
  upload: {
    file: uploadApi.file.bind(uploadApi),
    multiple: uploadApi.multiple.bind(uploadApi),
  },
  text: textApi,
  ingest: ingestApi,
  filters: filtersApi,
  systemInstructions: systemInstructionsApi,
  users: userApi,
  dashboard: {
    getStats: async () => {
      // Map backend /api/v1/stats to dashboard format
      const stats = await apiRequest('/api/v1/stats');
      return {
        stats: {
          total_documents: stats.total_documents || 0,
          active_documents: stats.total_documents || 0,
          total_chunks: stats.total_chunks || 0,
          total_size_bytes: 0,
          last_updated: new Date().toISOString(),
        }
      };
    },
    getData: async () => {
      return apiRequest('/api/v1/dashboard');
    },
  },
  handoffs: {
    list: async (options = {}) => {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit);
      const queryString = params.toString();
      return apiRequest(`/api/v1/handoffs${queryString ? `?${queryString}` : ''}`);
    },
    getStats: async () => apiRequest('/api/v1/handoffs/stats'),
    get: async (handoffId) => apiRequest(`/api/v1/handoffs/${encodeURIComponent(handoffId)}`),
    answer: async (handoffId, answer) => apiRequest(`/api/v1/handoffs/${encodeURIComponent(handoffId)}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),
    dismiss: async (handoffId, reason = null) => apiRequest(`/api/v1/handoffs/${encodeURIComponent(handoffId)}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  },
  admin: {
    students: async () => {
      // Fetch list of enrolled students
      const data = await apiRequest('/api/v1/students');
      return data.students || [];
    },
    enroll: async (csvData, options = {}) => {
      return apiRequest('/api/v1/admin/enroll_students', {
        method: 'POST',
        body: JSON.stringify({
          csv_data: csvData,
          stream: options.stream || null,
          semester: options.semester || null,
        }),
      });
    },
    saveCurriculum: async (curriculum) => {
      // Save curriculum: backend expects per-stream/per-semester
      // Iterate and upsert each stream+semester combo
      const results = [];
      for (const [stream, semesters] of Object.entries(curriculum)) {
        for (const [semester, subjects] of Object.entries(semesters)) {
          const subjectList = (subjects || []).filter(s => s !== 'NA').map(s => ({ name: s }));
          try {
            const res = await apiRequest('/api/v1/admin/curriculum', {
              method: 'POST',
              body: JSON.stringify({ stream, semester, subjects: subjectList }),
            });
            results.push({ stream, semester, status: 'success', ...res });
          } catch (err) {
            results.push({ stream, semester, status: 'error', error: err.message });
          }
        }
      }
      return results;
    },
  },
  analytics: {
    /**
     * Get stream-level analytics (HOD view)
     * Returns per-subject proficiency scores, net score, total queries
     * @param {string} [semester] - Optional semester filter e.g. "sem 3"
     */
    stream: async (semester = null) => {
      const params = new URLSearchParams();
      if (semester) params.append('semester', semester);
      const queryString = params.toString();
      return apiRequest(`/api/v1/analytics/stream${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get subject deep-dive analytics
     * Returns module-level heatmap and per-student query breakdown
     * @param {string} subjectName - The subject to analyze
     * @param {string} [semester] - Optional semester filter
     */
    subject: async (subjectName, semester = null) => {
      const params = new URLSearchParams();
      if (semester) params.append('semester', semester);
      const queryString = params.toString();
      return apiRequest(`/api/v1/analytics/subject/${encodeURIComponent(subjectName)}${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get overview analytics dashboard data
     * Returns total queries, at-risk students, weak domains, weekly data
     */
    overview: async () => {
      return apiRequest('/api/v1/analytics/overview');
    },

    /**
     * Pre-aggregated hit count endpoints (fast O(1) reads)
     */
    hitCounts: {
      /** Global stream-level subject + module hit counts */
      stream: async () => apiRequest('/api/v1/analytics/hit-counts/stream'),
      /** Per-student hit count breakdown (faculty+ access) */
      student: async (uid) => apiRequest(`/api/v1/analytics/hit-counts/student/${encodeURIComponent(uid)}`),
      /** Current student's own hit counts */
      me: async () => apiRequest('/api/v1/analytics/hit-counts/me'),
    },
  },
};

export default api;
