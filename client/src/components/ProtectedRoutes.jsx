import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRole } from "../hooks/useRole";

export default function ProtectedRoute({ allow = [], children }) {
  const { loading, user, role } = useRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-teal-400">
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  // Logged in but wrong role
  if (allow.length > 0 && !allow.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}