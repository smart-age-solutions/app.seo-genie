/**
 * Backend API Client
 * All database operations should go through the backend API
 * Uses Next.js API routes as proxy to handle authentication
 */

/**
 * Make a request to the backend through specific Next.js API routes
 * Handles both client-side and server-side requests
 */
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // Map backend endpoints to specific API routes
  const endpointMapping: Record<string, string> = {
    // Services
    '/services': '/api/services',
    '/services/': '/api/services/', // for IDs

    // Sub-services
    '/sub-services': '/api/sub-services',
    '/sub-services/': '/api/sub-services/', // for IDs and nested routes

    // Users
    '/users': '/api/users',
    '/users/': '/api/users/', // for IDs and actions

    // Settings
    '/settings/ai': '/api/admin/settings/ai',
    '/settings/google': '/api/admin/settings/google',

    // Prompt templates
    '/prompt-templates': '/api/prompt-templates',
    '/prompt-templates/': '/api/prompt-templates/',

  };

  // Build the URL - use absolute URL on server, relative on client
  let url: string;
  const isServer = typeof window === "undefined";

  if (isServer) {
    // On server, we need an absolute URL
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000";

    // Map endpoint to specific route
    let mappedEndpoint = endpoint;
    
    // Special handling for admin routes - routes that need /api/admin prefix
    if (endpoint.match(/^\/sub-services\/[^/]+\/form-fields/)) {
      // /sub-services/{id}/form-fields -> /api/admin/sub-services/{id}/form-fields
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/sub-services\/[^/]+\/prompts/)) {
      // /sub-services/{id}/prompts -> /api/admin/sub-services/{id}/prompts
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/sub-services\/[^/]+$/)) {
      // /sub-services/{id} -> /api/admin/sub-services/{id} (for PATCH/DELETE)
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/services\/[^/]+$/)) {
      // /services/{id} -> /api/admin/services/{id} (for PATCH/DELETE)
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/form-fields\/[^/]+$/)) {
      // /form-fields/{id} -> /api/admin/form-fields/{id}
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/prompts\/[^/]+$/)) {
      // /prompts/{id} -> /api/admin/prompts/{id}
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/users\/[^/]+/)) {
      // /users/{id} or /users/{id}/status or /users/{id}/role -> /api/admin/users (PATCH via body)
      // Actually users routes exist at /api/users/[id], so keep as is
      mappedEndpoint = `/api${endpoint}`;
    } else {
      // Standard mapping
      for (const [backendPath, apiRoute] of Object.entries(endpointMapping)) {
        if (endpoint.startsWith(backendPath)) {
          mappedEndpoint = endpoint.replace(backendPath, apiRoute);
          break;
        }
      }
    }

    url = `${baseUrl}${mappedEndpoint}`;
  } else {
    // On client, relative URL works fine
    let mappedEndpoint = endpoint;
    
    // Special handling for admin routes - routes that need /api/admin prefix
    if (endpoint.match(/^\/sub-services\/[^/]+\/form-fields/)) {
      // /sub-services/{id}/form-fields -> /api/admin/sub-services/{id}/form-fields
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/sub-services\/[^/]+\/prompts/)) {
      // /sub-services/{id}/prompts -> /api/admin/sub-services/{id}/prompts
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/sub-services\/[^/]+$/)) {
      // /sub-services/{id} -> /api/admin/sub-services/{id} (for PATCH/DELETE)
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/services\/[^/]+$/)) {
      // /services/{id} -> /api/admin/services/{id} (for PATCH/DELETE)
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/form-fields\/[^/]+$/)) {
      // /form-fields/{id} -> /api/admin/form-fields/{id}
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/prompts\/[^/]+$/)) {
      // /prompts/{id} -> /api/admin/prompts/{id}
      mappedEndpoint = `/api/admin${endpoint}`;
    } else if (endpoint.match(/^\/users\/[^/]+/)) {
      // /users/{id} -> /api/users/{id}
      mappedEndpoint = `/api${endpoint}`;
    } else {
      // Standard mapping
      for (const [backendPath, apiRoute] of Object.entries(endpointMapping)) {
        if (endpoint.startsWith(backendPath)) {
          mappedEndpoint = endpoint.replace(backendPath, apiRoute);
          break;
        }
      }
    }

    url = mappedEndpoint;
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/**
 * Backend API client
 */
export const backendApi = {
  // Services
  services: {
    getAll: async (isActive?: boolean) => {
      const query = isActive !== undefined ? `?isActive=${isActive}` : "";
      const response = await apiRequest(`/services${query}`);
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      return data.services;
    },
    getById: async (id: string) => {
      const response = await apiRequest(`/services/${id}`);
      if (!response.ok) throw new Error("Failed to fetch service");
      const data = await response.json();
      return data.service;
    },
    getBySlug: async (slug: string) => {
      const response = await apiRequest(`/services/slug/${slug}`);
      if (!response.ok) throw new Error("Failed to fetch service");
      const data = await response.json();
      return data.service;
    },
    create: async (data: unknown) => {
      const response = await apiRequest("/services", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create service");
      }
      const result = await response.json();
      return result.service;
    },
    update: async (id: string, data: unknown) => {
      const response = await apiRequest(`/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update service");
      }
      const result = await response.json();
      return result.service;
    },
    delete: async (id: string) => {
      const response = await apiRequest(`/services/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete service");
      }
    },
  },

  // Sub-Services
  subServices: {
    getAll: async (serviceId?: string, isActive?: boolean) => {
      const params = new URLSearchParams();
      if (serviceId) params.append("serviceId", serviceId);
      if (isActive !== undefined) params.append("isActive", String(isActive));
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest(`/sub-services${query}`);
      if (!response.ok) throw new Error("Failed to fetch sub-services");
      const data = await response.json();
      return data.subServices;
    },
    getById: async (id: string) => {
      const response = await apiRequest(`/sub-services/${id}`);
      if (!response.ok) throw new Error("Failed to fetch sub-service");
      const data = await response.json();
      return data.subService;
    },
    create: async (data:  unknown) => {
      const response = await apiRequest("/sub-services", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sub-service");
      }
      const result = await response.json();
      return result.subService;
    },
    update: async (id: string, data:  unknown) => {
      const response = await apiRequest(`/sub-services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update sub-service");
      }
      const result = await response.json();
      return result.subService;
    },
    delete: async (id: string) => {
      const response = await apiRequest(`/sub-services/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete sub-service");
      }
    },
  },

  // Service Prompts
  prompts: {
    getBySubService: async (subServiceId: string) => {
      const response = await apiRequest(`/sub-services/${subServiceId}/prompts`);
      if (!response.ok) throw new Error("Failed to fetch prompts");
      const data = await response.json();
      return data.prompts;
    },
    getById: async (id: string) => {
      const response = await apiRequest(`/prompts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch prompt");
      const data = await response.json();
      return data.prompt;
    },
    create: async (subServiceId: string, data:  unknown) => {
      const response = await apiRequest(`/sub-services/${subServiceId}/prompts`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create prompt");
      }
      const result = await response.json();
      return result.prompt;
    },
    update: async (id: string, data:  unknown) => {
      const response = await apiRequest(`/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update prompt");
      }
      const result = await response.json();
      return result.prompt;
    },
    delete: async (id: string) => {
      const response = await apiRequest(`/prompts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete prompt");
      }
    },
  },

  // Form Fields
  formFields: {
    getBySubService: async (subServiceId: string, includeInactive?: boolean) => {
      const query = includeInactive ? "?includeInactive=true" : "";
      const response = await apiRequest(`/sub-services/${subServiceId}/form-fields${query}`);
      if (!response.ok) throw new Error("Failed to fetch form fields");
      const data = await response.json();
      return data.formFields;
    },
    getById: async (id: string) => {
      const response = await apiRequest(`/form-fields/${id}`);
      if (!response.ok) throw new Error("Failed to fetch form field");
      const data = await response.json();
      return data.formField;
    },
    create: async (subServiceId: string, data:  unknown) => {
      const response = await apiRequest(`/sub-services/${subServiceId}/form-fields`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create form field");
      }
      const result = await response.json();
      return result.formField;
    },
    update: async (id: string, data:  unknown) => {
      const response = await apiRequest(`/form-fields/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update form field");
      }
      const result = await response.json();
      return result.formField;
    },
    delete: async (id: string) => {
      const response = await apiRequest(`/form-fields/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete form field" }));
        throw new Error(error.error || "Failed to delete form field");
      }
      // 204 No Content means success, no body to parse
      return true;
    },
    reorder: async (subServiceId: string, fieldIds: string[]) => {
      const response = await apiRequest(`/sub-services/${subServiceId}/form-fields/reorder`, {
        method: "POST",
        body: JSON.stringify({ fieldIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reorder form fields");
      }
    },
  },

  // Users
  users: {
    getAll: async (status?: string, role?: string) => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (role) params.append("role", role);
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest(`/users${query}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch users" }));
        throw new Error(error.error || "Failed to fetch users");
      }
      const data = await response.json();
      // Ensure we return an array
      return Array.isArray(data.users) ? data.users : [];
    },
    getById: async (id: string) => {
      const response = await apiRequest(`/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data.user;
    },
    update: async (id: string, data:  unknown) => {
      const response = await apiRequest(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }
      const result = await response.json();
      return result.user;
    },
    updateStatus: async (id: string, status: string) => {
      const response = await apiRequest(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }
      const result = await response.json();
      return result.user;
    },
    updateRole: async (id: string, role: string) => {
      const response = await apiRequest(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }
      const result = await response.json();
      return result.user;
    },
  },

  // Settings
  settings: {
    ai: {
      get: async () => {
        const response = await apiRequest("/settings/ai");
        if (!response.ok) throw new Error("Failed to fetch AI settings");
        const data = await response.json();
        return data.settings;
      },
      update: async (data:  unknown) => {
        const response = await apiRequest("/settings/ai", {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update AI settings");
        }
        const result = await response.json();
        return result.settings;
      },
    },
    google: {
      get: async () => {
        const response = await apiRequest("/settings/google");
        if (!response.ok) throw new Error("Failed to fetch Google settings");
        const data = await response.json();
        return data.settings;
      },
      update: async (data:  unknown) => {
        const response = await apiRequest("/settings/google", {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update Google settings");
        }
        const result = await response.json();
        return result.settings;
      },
    },
  },

  // Legacy Prompt Templates (keeping for backward compatibility)
  promptTemplates: {
    getAll: async () => {
      const response = await apiRequest("/prompt-templates");
      if (!response.ok) throw new Error("Failed to fetch prompt templates");
      const data = await response.json();
      return data.prompts;
    },
    create: async (data:  unknown) => {
      const response = await apiRequest("/prompt-templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create prompt template");
      }
      const result = await response.json();
      return result.prompt;
    },
    update: async (id: string, data:  unknown) => {
      const response = await apiRequest(`/prompt-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update prompt template");
      }
      const result = await response.json();
      return result.prompt;
    },
    delete: async (id: string) => {
      const response = await apiRequest(`/prompt-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete prompt template");
      }
    },
  },

  // Authentication & User Management (for NextAuth)
  // These methods call the backend directly to avoid recursion during auth callbacks
  auth: {
    // Get backend URL for direct calls
    _getBackendUrl: () => {
      return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL || "http://localhost:3001";
    },
    
    // Find user by email (for credentials login)
    // Calls backend directly - no auth required (public endpoint)
    findUserByEmail: async (email: string) => {
      const backendUrl = backendApi.auth._getBackendUrl();
      const url = `${backendUrl}/api/public/users/email/${encodeURIComponent(email)}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User not found - return null so auth can show appropriate error
          return null;
        }
        // For other errors, throw to be caught by auth handler
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch user" }));
        throw new Error(errorData.error || "Failed to fetch user");
      }
      const data = await response.json();
      return data.user;
    },
    
    // Find user by ID - calls backend directly
    findUserById: async (id: string) => {
      const backendUrl = backendApi.auth._getBackendUrl();
      const url = `${backendUrl}/api/users/${id}`;
      
      // Note: This endpoint requires auth, but during jwt callback we may not have session yet
      // Try without auth first (if endpoint allows), otherwise this may fail
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      const data = await response.json();
      return data.user;
    },
    
    // Create user (for OAuth sign-up) - calls backend directly (public endpoint)
    createUser: async (data: unknown) => {
      const backendUrl = backendApi.auth._getBackendUrl();
      const url = `${backendUrl}/api/public/users`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create user" }));
        throw new Error(error.error || "Failed to create user");
      }
      const result = await response.json();
      return result.user;
    },
    
    // Update user (e.g., lastLoginAt, loginCount) - calls backend directly
    updateUser: async (id: string, data: unknown) => {
      const backendUrl = backendApi.auth._getBackendUrl();
      const url = `${backendUrl}/api/users/${id}`;
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update user" }));
        throw new Error(error.error || "Failed to update user");
      }
      const result = await response.json();
      return result.user;
    },
    
    // Create or update session in database - calls backend directly (public endpoint)
    createSession: async (userId: string, sessionToken: string, expires?: Date) => {
      const backendUrl = backendApi.auth._getBackendUrl();
      const url = `${backendUrl}/api/public/auth/session`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          sessionToken,
          expires: expires ? expires.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create session" }));
        throw new Error(errorData.error || "Failed to create session");
      }
      const data = await response.json();
      return data.session;
    },
  },
};
