import React from "react";
import {
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  ToolOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";
import { useLocation, Link } from "react-router-dom";
import { Menu } from "antd";

export default function LandlordSidebar() {
  const user = useSelector((state) => state.account.user);
  const location = useLocation();

  const landlordMenu = [
    {
      key: "/landlord/users",
      icon: <UserOutlined />,
      label: "Người dùng",
      path: "/landlord/users",
    },
    {
      key: "/landlord/renters",
      icon: <TeamOutlined />,
      label: "Người thuê",
      path: "/landlord/renters",
    },
    {
      key: "/landlord/rooms",
      icon: <HomeOutlined />,
      label: "Phòng",
      path: "/landlord/rooms",
    },
    {
      key: "/landlord/contract",
      icon: <FileTextOutlined />,
      label: "Hợp đồng",
      path: "/landlord/contract",
    },
    {
      key: "/landlord/services",
      icon: <ToolOutlined />,
      label: "Dịch vụ",
      path: "/landlord/services",
    },
    {
      key: "/landlord/electric",
      icon: <ToolOutlined />,
      label: "Điện",
      path: "/landlord/electric",
    },
    {
      key: "/landlord/bills",
      icon: <DollarOutlined />,
      label: "Hóa đơn",
      path: "/landlord/bills",
    },
    {
      key: "/landlord/assets",
      icon: <ToolOutlined />,
      label: "Tài sản",
      path: "/landlord/assets",
    },
    {
      key: "/landlord/bookings",
      icon: <CalendarOutlined />,
      label: "Danh sách đặt phòng",
      path: "/landlord/bookings",
    },
  ];

  const selectedKey = landlordMenu.find((item) =>
    location.pathname.startsWith(item.path)
  )?.key;

  return (
    <Sidebar
      name={user?.fullName || "Landlord"}
      avatar="https://i.pravatar.cc/40?img=2"
      menuItems={landlordMenu}
      selectedKeys={[selectedKey]}
    ></Sidebar>
  );
}
