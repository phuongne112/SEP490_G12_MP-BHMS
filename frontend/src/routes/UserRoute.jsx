import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function UserRoute({ children }) {
  const account = useSelector((state) => state.account.user);
  const forbiddenRoles = ["LANDLORD", "ADMIN", "SUBADMIN", "RENTER"];
  const roleName = account?.role?.roleName;

  if (!account) return <Navigate to="/login" />;
  if (forbiddenRoles.includes(roleName)) return <Navigate to="/403" />;
  return children;
} 