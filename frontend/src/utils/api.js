import { jwtDecode } from "jwt-decode";
const BACKEND_URL = "http://localhost:8081";

// Helper function to get JWT from localStorage
const getToken = () => localStorage.getItem("jwt");

// Get email from JWT token
export const getEmailFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    return jwtDecode(token).sub;
  } catch {
    return null;
  }
};

// Wrapper around fetch
export const apiFetch = async (url, options = {}) => {
  const token = getToken();
  
  if (!token) {
    // If no token, force logout
    window.location.href = "/login";
    return;
  }
  
  // Add Authorization header
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  
  try {
    const res = await fetch(`${BACKEND_URL}${url}`, options);
    
    // If token expired or invalid, log out automatically
    if (res.status === 401) {
      localStorage.removeItem("jwt");
      window.location.href = "/login";
      return;
    }
    
    return res;
  } catch (err) {
    if (err.name !== "AbortError") console.error("API fetch error:", err);
    throw err;
  }
};