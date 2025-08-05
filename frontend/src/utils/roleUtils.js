// Hàm chuyển đổi vai trò sang tiếng Việt
export const getRoleDisplayName = (roleName) => {
  if (!roleName) return "";
  
  const roleMap = {
    "LANDLORD": "Chủ nhà",
    "RENTER": "Người thuê",
    "ADMIN": "Quản trị viên",
    "SUBADMIN": "Phó quản trị viên"
  };
  
  return roleMap[roleName.toUpperCase()] || roleName;
}; 