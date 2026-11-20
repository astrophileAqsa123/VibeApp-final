import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";

import Dashboard from "../pages/Dashboard";
import Build from "../pages/Build";
import ProjectDetails from "../pages/ProjectDetails";
import MobilePreview from "../pages/MobilePreview";

import ProtectedRoute from "./ProtectedRoute";


function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Navigate
      to="/dashboard"
      replace
    />
  ) : (
    children
  );
}


export default function AppRoutes() {
  return (
    <Routes>

      {/* ==============================
          PUBLIC PAGES
          ============================== */}

      <Route
        path="/"
        element={<Landing />}
      />

      {/* ==============================
          AUTH PAGES
          ============================== */}

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />


      {/* ==============================
          PASSWORD RECOVERY
          ============================== */}

      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      <Route
        path="/reset-password/:token"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />


      {/* ==============================
          PUBLIC MOBILE PREVIEW
          ============================== */}

      <Route
        path="/preview/:sessionId"
        element={<MobilePreview />}
      />


      {/* ==============================
          PROTECTED PAGES
          ============================== */}

      <Route element={<ProtectedRoute />}>

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/build"
          element={<Build />}
        />

        <Route
          path="/projects/:projectId"
          element={<ProjectDetails />}
        />

      </Route>


      {/* ==============================
          UNKNOWN ROUTES
          Keep this LAST
          ============================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}
