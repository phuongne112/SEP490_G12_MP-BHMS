import React from "react";
import {
  UserOutlined,
  NotificationOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";

export default function AdminSidebar() {
  const adminMenu = [
    {
      key: "1",
      icon: <UserOutlined />,
      label: "Account",
      path: "/admin/users",
    },
    {
      key: "2",
      icon: <NotificationOutlined />,
      label: "Notification",
      path: "/admin/notification",
    },
    {
      key: "3",
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
      defaultKey="1"
    />
  );
}
