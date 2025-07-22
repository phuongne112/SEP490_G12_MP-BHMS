import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { message } from "antd";

export default function AdminRoute({ children }) {
  const user = useSelector((state) => state.account.user);

  // 🐞 Log để kiểm tra
  console.log("👤 user:", user);
  console.log("🔑 user.role:", user?.role);
  console.log("🔠 user.roleName:", user?.role?.roleName);

  // Nếu user hoặc role chưa load → đợi
  if (!user || !user.role || !user.role.roleName) {
    console.warn("⛔ Không có user hoặc role hợp lệ → chuyển về /403");
    return <Navigate to="/403" replace />;
  }

  // const isAdmin = ["ADMIN", "SUBADMIN"].includes(user?.role?.toUpperCase());
  const roleName = user?.role?.roleName?.toUpperCase?.();
  const isAdmin = ["ADMIN", "SUBADMIN"].includes(roleName);
  if (!isAdmin) {
    message.error("Bạn không có quyền truy cập trang này.");
    return <Navigate to="/403" replace />;
  }

  return children;
}
