import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401 and refreshing tokens
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Don't retry auth endpoints to prevent infinite loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    // If error is 401 and we haven't retried yet and it's not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await api.post('/auth/refresh');
        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Don't redirect here - let the component handle it
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
