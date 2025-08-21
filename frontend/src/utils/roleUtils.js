// Hàm chuyển đổi vai trò sang tiếng Việt
export const getRoleDisplayName = (roleName) => {
  if (!roleName) return "";
  
  const roleMap = {
    "LANDLORD": "chủ trọ",
    "RENTER": "người thuê",
    "ADMIN": "quản trị viên",
    "SUBADMIN": "quản trị viên phụ"
  };
  
  return roleMap[roleName.toUpperCase()] || roleName;
}; 