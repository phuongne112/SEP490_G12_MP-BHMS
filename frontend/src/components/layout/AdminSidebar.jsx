import React, { useEffect } from "react";
import {
  UserOutlined,
  NotificationOutlined,
  SettingOutlined,
  KeyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";

export default function AdminSidebar() {
  const user = useSelector((state) => state.account.user);
  const aclEnabled = import.meta.env.VITE_ACL_ENABLE === "true";
  useEffect(() => {
    console.log("🔁 Sidebar user.permissions:", user?.permissions);
  }, [user]);

  const adminMenu = [
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Tài khoản",
      path: "/admin/users",
      requiredPermissions: ["Get User"], // ✅ quyền cần để hiện mục này
    },
    {
      key: "/admin/notification",
      icon: <NotificationOutlined />,
      label: "Thông báo",
      path: "/admin/notification",
      requiredPermissions: ["View Notification"],
    },
    {
      key: "/admin/roles",
      icon: <TeamOutlined />,
      label: "Vai trò",
      path: "/admin/roles",
      requiredPermissions: ["View Roles"],
    },
    {
      key: "/admin/permissions",
      icon: <KeyOutlined />,
      label: "Phân quyền",
      path: "/admin/permissions",
      requiredPermissions: ["View Permissions"],
    },
    {
      key: "/admin/rooms",
      icon: <TeamOutlined />,
      label: "Phòng",
      path: "/admin/rooms",
      requiredPermissions: ["View Room"],
    },
    {
      key: "/admin/contract",
      icon: <SettingOutlined />,
      label: "Hợp đồng",
      path: "/admin/contract",
      requiredPermissions: ["View List Contract"],
    },
    // {
    //   key: "/admin/settings",
    //   icon: <SettingOutlined />,
    //   label: "Tùy chọn khác",
    //   path: "/admin/settings",
    // },
  ];

  const menuItems = adminMenu.filter((item) => {
    if (!aclEnabled || !item.requiredPermissions) return true;
    const userPermissions = user?.permissions || [];
    return item.requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );
  });

  return (
    <Sidebar
      name={user?.fullName || "User"}
      avatar="https://i.pravatar.cc/40?img=1"
      menuItems={menuItems}
      defaultKey="/admin/users"
    />
  );
}
