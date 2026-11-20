import { apiRequest } from "./client";


export const login = (credentials) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });


export const signup = (details) =>
  apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(details),
  });


export const verifyOtp = (
  email,
  otp
) =>
  apiRequest("/auth/verify-otp", {
    method: "POST",

    body: JSON.stringify({
      email,
      otp
    }),
  });


export const resendOtp = (
  email
) =>
  apiRequest("/auth/resend-otp", {
    method: "POST",

    body: JSON.stringify({
      email
    }),
  });


/*
 * Password recovery
 */

export const forgotPassword = (
  email
) =>
  apiRequest(
    "/auth/forgot-password",
    {
      method: "POST",

      body: JSON.stringify({
        email
      }),
    }
  );


export const resetPassword = (
  token,
  password
) =>
  apiRequest(
    `/auth/reset-password/${encodeURIComponent(token)}`,
    {
      method: "POST",

      body: JSON.stringify({
        password
      }),
    }
  );