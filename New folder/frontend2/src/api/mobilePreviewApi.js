import { apiRequest } from "./client";

export const getMobilePreview = (sessionId) =>
  apiRequest(`/mobile-preview/${sessionId}`);
