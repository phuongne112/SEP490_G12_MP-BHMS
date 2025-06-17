import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }) {
  const user = useSelector((state) => state.account.user);
  const token = localStorage.getItem("token");

  // ❌ Nếu chưa đăng nhập hoặc đã logout → cho vào guest route
  if (!user || !user.role || !token) {
    return children;
  }

  // ✅ Nếu đã đăng nhập → redirect theo vai trò
  const roleName =
    user?.role?.roleName?.toUpperCase?.() || user.role?.toUpperCase?.();

  switch (roleName) {
    case "ADMIN":
    case "SUBADMIN":
      return <Navigate to="/admin/users" replace />;
    case "RENTER":
      return <Navigate to="/room" replace />;
    case "LANDLORD":
      return <Navigate to="/landlord/dashboard" replace />;
    default:
      return <Navigate to="/403" replace />;
  }
}
