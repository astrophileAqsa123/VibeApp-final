import { apiRequest } from "./client";

export const listProjects = () => apiRequest("/projects/my");
export const getProject = (id) => apiRequest(`/projects/${id}`);
export const createProject = (payload) => apiRequest("/projects", { method: "POST", body: JSON.stringify(payload) });
export const updateProjectChat = (id, message, baseVersion = null) =>
  apiRequest(`/projects/${id}/chat`, {
    method: "POST",
    body: JSON.stringify({ message, ...(baseVersion ? { baseVersion } : {}) }),
  });
export const restoreProjectVersion = (id, version) =>
  apiRequest(`/projects/${id}/versions/${version}/restore`, { method: "POST" });
export const toggleFavorite = (id) => apiRequest(`/projects/${id}/favorite`, { method: "PATCH" });
export const deleteProject = (id) => apiRequest(`/projects/${id}`, { method: "DELETE" });


export const getEngineeringReport = (id) => apiRequest(`/projects/${id}/engineering-report`);
export const getVersionDiff = (id, from, to) => apiRequest(`/projects/${id}/versions/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
