import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, verifyOtp, resendOtp } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "./AuthLayout";

export default function Signup() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("signup"); // "signup" | "verify"
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submitSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await signup(form);
      if (data.requiresVerification) {
        setPendingEmail(data.email || form.email);
        setStep("verify");
        setNotice("Check your email for a 6-digit code.");
      }
    } catch (requestError) {
      // If login was attempted while unverified the backend sends requiresVerification too
      if (requestError.requiresVerification) {
        setPendingEmail(form.email);
        setStep("verify");
        setNotice("Check your email for a 6-digit code.");
      } else {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await verifyOtp(pendingEmail, otp);
      saveSession(data);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    try {
      const data = await resendOtp(pendingEmail);
      setNotice(data.message || "New code sent.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (step === "verify") {
    return (
      <AuthLayout
        eyebrow="One last step"
        title="Verify your email."
        description={`We sent a 6-digit code to ${pendingEmail}.`}
        footer={<>Wrong email? <Link to="/signup" onClick={() => setStep("signup")}>Go back</Link></>}
      >
        <form className="auth-form" onSubmit={submitOtp}>
          {error && <div className="form-error">{error}</div>}
          {notice && <div className="success-message">{notice}</div>}
          <label>
            Verification code
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              autoFocus
            />
          </label>
          <button className="auth-submit" disabled={loading}>
            {loading ? "Verifying..." : "Confirm email"}
            <span>↗</span>
          </button>
          <button type="button" className="text-button" onClick={handleResend}>
            Resend code
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Start building"
      title="Give your ideas a place to grow."
      description="Create an account and keep every version of what you make."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={submitSignup}>
        {error && <div className="form-error">{error}</div>}
        <label>
          Full name
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            minLength={3}
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        <button className="auth-submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
          <span>↗</span>
        </button>
      </form>
    </AuthLayout>
  );
}
