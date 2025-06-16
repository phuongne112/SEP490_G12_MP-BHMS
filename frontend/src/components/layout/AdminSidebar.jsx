import React from "react";
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
  const adminMenu = [
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Account",
      path: "/admin/users",
      requiredPermissions: ["Get User"],
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

  const user = useSelector((state) => state.account.user);
  const aclEnabled = import.meta.env.VITE_ACL_ENABLE === "true";

  const menuItems = aclEnabled
    ? adminMenu.filter(
        (item) =>
          !item.requiredPermissions || // nếu không yêu cầu quyền thì cho qua
          (user?.permissions &&
            item.requiredPermissions.every((perm) =>
              user.permissions.includes(perm)
            ))
      )
    : adminMenu;

  return (
    <Sidebar
      name="Long ngu"
      avatar="https://i.pravatar.cc/40?img=1"
      menuItems={menuItems}
      defaultKey="/admin/users"
    />
  );
}
