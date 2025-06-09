import React from "react";
import {
  UserOutlined,
  NotificationOutlined,
  SettingOutlined,
  KeyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";

export default function AdminSidebar() {
  const adminMenu = [
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Account",
      path: "/admin/users",
    },
    {
      key: "/admin/notification",
      icon: <NotificationOutlined />,
      label: "Notification",
      path: "/admin/notification",
    },
    {
      key: "/admin/roles",
      icon: <TeamOutlined />,
      label: "Role",
      path: "/admin/roles",
    },
    {
      key: "/admin/permissions",
      icon: <KeyOutlined />,
      label: "Permission",
      path: "/admin/permissions",
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: "Other options",
      path: "/admin/settings",
    },
  ];

  return (
    <Sidebar
      name="Long ngu"
      avatar="https://i.pravatar.cc/40?img=1"
      menuItems={adminMenu}
      defaultKey="/admin/users"
    />
  );
}
