import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }) {
  const user = useSelector((state) => state.account.user);
  const token = localStorage.getItem("token");

  // ❌ Nếu chưa đăng nhập → cho vào guest route (login, register)
  if (!user || !user.role || !token) {
    return children;
  }

  // ✅ Nếu đã đăng nhập → redirect về trang homepage chung
  return <Navigate to="/home" replace />;
}
