import {
  useState
} from "react";

import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  login,
  verifyOtp,
  resendOtp
} from "../api/authApi";

import {
  useAuth
} from "../hooks/useAuth";

import AuthLayout
  from "./AuthLayout";


export default function Login() {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    saveSession
  } = useAuth();


  const [
    form,
    setForm
  ] = useState({
    email: "",
    password: ""
  });


  const [
    otp,
    setOtp
  ] = useState("");


  const [
    step,
    setStep
  ] = useState("login");


  const [
    pendingEmail,
    setPendingEmail
  ] = useState("");


  const [
    error,
    setError
  ] = useState("");


  const [
    notice,
    setNotice
  ] = useState("");


  const [
    loading,
    setLoading
  ] = useState(false);


  /*
   * LOGIN
   */
  const submitLogin =
    async (event) => {

      event.preventDefault();

      setLoading(true);
      setError("");
      setNotice("");


      try {

        const data =
          await login(form);


        saveSession(data);


        navigate(
          location.state?.from ||
          "/dashboard",
          {
            replace: true
          }
        );

      } catch (requestError) {

        /*
         * Backend sends requiresVerification
         * when account exists but email has
         * not yet been verified.
         */
        if (
          requestError.requiresVerification
        ) {

          setPendingEmail(
            requestError.email ||
            form.email
          );

          setStep("verify");

          setNotice(
            "A new code has been sent to your email."
          );

        } else {

          setError(
            requestError.message ||
            "Unable to sign in."
          );

        }

      } finally {

        setLoading(false);

      }
    };


  /*
   * VERIFY OTP
   */
  const submitOtp =
    async (event) => {

      event.preventDefault();

      setLoading(true);
      setError("");
      setNotice("");


      try {

        const data =
          await verifyOtp(
            pendingEmail,
            otp
          );


        saveSession(data);


        navigate(
          location.state?.from ||
          "/dashboard",
          {
            replace: true
          }
        );

      } catch (requestError) {

        setError(
          requestError.message ||
          "Verification failed."
        );

      } finally {

        setLoading(false);

      }
    };


  /*
   * RESEND OTP
   */
  const handleResend =
    async () => {

      setError("");
      setNotice("");


      try {

        const data =
          await resendOtp(
            pendingEmail
          );


        setNotice(
          data.message ||
          "New code sent."
        );

      } catch (requestError) {

        setError(
          requestError.message ||
          "Unable to resend code."
        );

      }
    };


  /*
   * EMAIL VERIFICATION SCREEN
   */
  if (
    step === "verify"
  ) {

    return (

      <AuthLayout

        eyebrow="Verify your email"

        title="Check your inbox."

        description={
          `We sent a 6-digit code to ${pendingEmail}.`
        }

        footer={
          <>
            <Link
              to="/login"

              onClick={() => {
                setStep("login");
                setOtp("");
                setError("");
                setNotice("");
              }}
            >
              Back to sign in
            </Link>
          </>
        }

      >

        <form
          className="auth-form"
          onSubmit={submitOtp}
        >

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}


          {notice && (
            <div className="success-message">
              {notice}
            </div>
          )}


          <label>

            Verification code

            <input

              value={otp}

              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }

              required

              maxLength={6}

              inputMode="numeric"

              autoComplete="one-time-code"

              placeholder="6-digit code"

              autoFocus

            />

          </label>


          <button
            className="auth-submit"
            disabled={loading}
          >

            {loading
              ? "Verifying..."
              : "Confirm email"
            }

            <span>↗</span>

          </button>


          <button

            type="button"

            className="text-button"

            onClick={handleResend}

            disabled={loading}

          >

            Resend code

          </button>

        </form>

      </AuthLayout>
    );
  }


  /*
   * NORMAL LOGIN SCREEN
   */
  return (

    <AuthLayout

      eyebrow="Welcome back"

      title="Make something worth keeping."

      description="Your projects, prompts, and iterations are waiting."

      footer={
        <>
          New to VibeApp?{" "}

          <Link to="/signup">
            Create an account
          </Link>
        </>
      }

    >

      <form
        className="auth-form"
        onSubmit={submitLogin}
      >

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}


        <label>

          Email

          <input

            type="email"

            value={form.email}

            onChange={(event) =>
              setForm({
                ...form,
                email:
                  event.target.value
              })
            }

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

            onChange={(event) =>
              setForm({
                ...form,
                password:
                  event.target.value
              })
            }

            required

            autoComplete="current-password"

            placeholder="Your password"

          />

        </label>


        {/* FORGOT PASSWORD */}

        <div className="forgot-password-row">

          <Link
            to="/forgot-password"
            className="forgot-password-link"
          >
            Forgot password?
          </Link>

        </div>


        <button
          className="auth-submit"
          disabled={loading}
        >

          {loading
            ? "Signing in..."
            : "Sign in"
          }

          <span>↗</span>

        </button>

      </form>

    </AuthLayout>
  );
}