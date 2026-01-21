import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

console.log('🔌 API Base URL:', axiosInstance.defaults.baseURL); // Debug Log

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
