import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }) {
  const user = useSelector((state) => state.account.user);

  // ✅ Nếu đã đăng nhập thì redirect theo role
  if (user?.role) {
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

  // ✅ Nếu chưa login thì cho phép vào
  return children;
}
