import {
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import {
  forgotPassword
} from "../api/authApi";

import AuthLayout
  from "./AuthLayout";


export default function ForgotPassword() {

  const [
    email,
    setEmail
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


  const [
    sent,
    setSent
  ] = useState(false);


  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setLoading(true);
      setError("");
      setNotice("");


      try {

        const data =
          await forgotPassword(
            email
          );


        setNotice(
          data.message ||
          "If an account exists for that email, a password recovery link has been sent."
        );

        setSent(true);

      } catch (requestError) {

        setError(
          requestError.message ||
          "Unable to send recovery email. Please try again."
        );

      } finally {

        setLoading(false);

      }
    };


  return (

    <AuthLayout

      eyebrow="Password recovery"

      title={
        sent
          ? "Check your inbox."
          : "Find your way back in."
      }

      description={
        sent
          ? "We’ve processed your recovery request. Check your inbox for the secure reset link."
          : "Enter the email connected to your VibeApp account and we’ll send you a secure password reset link."
      }

      footer={
        <>
          Remembered your password?{" "}

          <Link to="/login">
            Back to sign in
          </Link>
        </>
      }

    >

      <form
        className="auth-form"
        onSubmit={handleSubmit}
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


        {!sent && (

          <label>

            Email

            <input

              type="email"

              value={email}

              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }

              required

              autoComplete="email"

              placeholder="you@example.com"

              autoFocus

            />

          </label>

        )}


        {!sent ? (

          <button
            className="auth-submit"
            disabled={loading}
          >

            {loading
              ? "Sending recovery link..."
              : "Send recovery link"
            }

            <span>↗</span>

          </button>

        ) : (

          <>
            <Link
              to="/login"
              className="auth-submit password-reset-action"
            >
              Back to sign in

              <span>↗</span>
            </Link>


            <button

              type="button"

              className="text-button"

              onClick={() => {
                setSent(false);
                setNotice("");
              }}

            >
              Try another email
            </button>
          </>

        )}

      </form>

    </AuthLayout>
  );
}