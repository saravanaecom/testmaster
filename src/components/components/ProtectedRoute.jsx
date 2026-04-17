// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedUserType }) => {
  const raw = localStorage.getItem("employee");

  // ❌ Not logged in → back to login
  if (!raw) return <Navigate to="/" replace />;

  const emp = JSON.parse(raw);

  // allowedUserType check (optional — pass "Admin" or "Employee")
  if (allowedUserType === "Admin" && emp.userType !== "Admin") {
    return <Navigate to="/testmaster" replace />;
  }
  if (allowedUserType === "Employee" && emp.userType === "Admin") {
    return <Navigate to="/question" replace />;
  }

  return children;
};

export default ProtectedRoute;       