import {
  useState
} from "react";

import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

import {
  resetPassword
} from "../api/authApi";

import AuthLayout
  from "./AuthLayout";


export default function ResetPassword() {

  const {
    token
  } = useParams();


  const navigate =
    useNavigate();


  const [
    password,
    setPassword
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword
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
    complete,
    setComplete
  ] = useState(false);


  const validatePassword = () => {

    if (
      password.length < 8
    ) {
      return (
        "Password must be at least 8 characters."
      );
    }


    if (
      !/[A-Z]/.test(password)
    ) {
      return (
        "Password must contain an uppercase letter."
      );
    }


    if (
      !/[a-z]/.test(password)
    ) {
      return (
        "Password must contain a lowercase letter."
      );
    }


    if (
      !/[0-9]/.test(password)
    ) {
      return (
        "Password must contain a number."
      );
    }


    if (
      !/[!@#$%^&*(),.?":{}|<>]/.test(
        password
      )
    ) {
      return (
        "Password must contain a special character."
      );
    }


    if (
      password !==
      confirmPassword
    ) {
      return (
        "Passwords do not match."
      );
    }


    return null;
  };


  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setError("");
      setNotice("");


      const validationError =
        validatePassword();


      if (validationError) {

        setError(
          validationError
        );

        return;
      }


      if (!token) {

        setError(
          "This password reset link is invalid."
        );

        return;
      }


      setLoading(true);


      try {

        const data =
          await resetPassword(
            token,
            password
          );


        setNotice(
          data.message ||
          "Password reset successfully."
        );


        setComplete(true);


        /*
         * Clear password fields from component state.
         */
        setPassword("");
        setConfirmPassword("");

      } catch (requestError) {

        setError(
          requestError.message ||
          "Unable to reset password."
        );

      } finally {

        setLoading(false);

      }
    };


  return (

    <AuthLayout

      eyebrow={
        complete
          ? "Password updated"
          : "Secure recovery"
      }

      title={
        complete
          ? "You’re ready to return."
          : "Choose a new password."
      }

      description={
        complete

          ? "Your VibeApp password has been updated securely."

          : "Your new password must contain at least 8 characters, including uppercase, lowercase, a number, and a special character."
      }

      footer={
        !complete ? (
          <>
            Need a new recovery link?{" "}

            <Link to="/forgot-password">
              Request another
            </Link>
          </>
        ) : null
      }

    >

      {complete ? (

        <div className="auth-form">

          <div className="success-message">
            {notice}
          </div>


          <button

            type="button"

            className="auth-submit"

            onClick={() =>
              navigate(
                "/login",
                {
                  replace: true
                }
              )
            }

          >

            Sign in with new password

            <span>↗</span>

          </button>

        </div>

      ) : (

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}


          <label>

            New password

            <input

              type="password"

              value={password}

              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }

              required

              minLength={8}

              autoComplete="new-password"

              placeholder="Create a strong password"

              autoFocus

            />

          </label>


          <label>

            Confirm new password

            <input

              type="password"

              value={confirmPassword}

              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }

              required

              minLength={8}

              autoComplete="new-password"

              placeholder="Repeat your new password"

            />

          </label>


          <div className="password-rules">

            <span>
              8+ characters
            </span>

            <span>
              Upper & lowercase
            </span>

            <span>
              Number
            </span>

            <span>
              Special character
            </span>

          </div>


          <button
            className="auth-submit"
            disabled={loading}
          >

            {loading
              ? "Updating password..."
              : "Reset password"
            }

            <span>↗</span>

          </button>

        </form>

      )}

    </AuthLayout>
  );
}