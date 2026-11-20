const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    // Forward extra fields from the response body onto the error object
    // so callers can inspect e.g. error.requiresVerification, error.email
    if (data.requiresVerification) error.requiresVerification = true;
    if (data.email) error.email = data.email;
    throw error;
  }

  return data;
}
