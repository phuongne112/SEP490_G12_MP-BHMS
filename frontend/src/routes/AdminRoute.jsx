import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { message } from "antd";

export default function AdminRoute({ children }) {
  const user = useSelector((state) => state.account.user);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  if (!isAdmin) {
    message.error("You do not have access to this page.");
    return <Navigate to="/403" replace />;
  }

  return children;
}
