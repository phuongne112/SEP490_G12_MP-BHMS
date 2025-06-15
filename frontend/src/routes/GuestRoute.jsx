import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }) {
  const user = useSelector((state) => state.account.user);

  // Nếu đã đăng nhập thì chuyển hướng người dùng về trang chính phù hợp với role
  if (user?.role) {
    switch (user.role.toUpperCase()) {
      case "ADMIN":
        return <Navigate to="/admin/users" replace />;
      case "RENTER":
        return <Navigate to="/room" replace />;
      case "LANDLORD":
        return <Navigate to="/landlord/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  // Nếu chưa đăng nhập thì cho truy cập
  return children;
}
