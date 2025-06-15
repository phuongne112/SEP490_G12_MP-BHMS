// Import useSelector để lấy dữ liệu từ Redux store
import { useSelector } from "react-redux";

// Component Access: kiểm soát quyền truy cập vào phần giao diện con (children)
export default function Access({ children, requiredPermissions = [] }) {
  // Lấy thông tin user (bao gồm permission) từ Redux store
  const user = useSelector((state) => state.account.user);

  // Kiểm tra biến môi trường để biết có bật kiểm tra quyền không (ACL: Access Control List)
  const aclEnabled = import.meta.env.VITE_ACL_ENABLE === "true";

  // Nếu không bật kiểm soát quyền, cho phép hiển thị mọi thứ
  if (!aclEnabled) return children;

  // Nếu chưa đăng nhập hoặc không có danh sách permission → không hiển thị gì
  if (!user || !user.permissions) return null;

  console.log("🔍 [Access Debug] requiredPermissions:", requiredPermissions);
  console.log("🔍 [Access Debug] user.permissions:", user?.permissions);
  // Kiểm tra xem user có đầy đủ các quyền yêu cầu không
  const hasPermission = requiredPermissions.every((perm) =>
    user.permissions.some((p) => {
      // Nếu là string: so sánh trực tiếp
      if (typeof p === "string") return p === perm;
      // Nếu là object: so sánh theo name
      return p?.name === perm;
    })
  );

  // Nếu có đủ quyền thì hiển thị children, ngược lại ẩn đi
  return hasPermission ? children : null;
}
