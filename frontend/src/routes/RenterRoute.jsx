import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function RenterRoute({ children }) {
  const account = useSelector((state) => state.account.user);
  const roleName = account?.role?.roleName;

  if (!account) return <Navigate to="/login" />;
  if (roleName !== "RENTER") return <Navigate to="/404" />;
  return children;
}
