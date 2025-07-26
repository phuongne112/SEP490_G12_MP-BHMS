import React from "react";
import {
  HomeOutlined,
  DollarOutlined,
  ToolOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Menu } from "antd";

export default function LandlordSidebar() {
  const user = useSelector((state) => state.account.user);
  const location = useLocation();

  const landlordMenu = [
    {
      key: "/landlord/dashboard",
      icon: <HomeOutlined />,
      label: "Tổng quan",
      path: "/landlord/dashboard",
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
      key: "/landlord/contract-templates",
      icon: <FileTextOutlined />,
      label: "Mẫu hợp đồng",
      path: "/landlord/contract-templates",
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

  // Ưu tiên khớp chính xác path trước, nếu không thì mới dùng startsWith
  let selectedKey = landlordMenu.find((item) => location.pathname === item.path)?.key;
  if (!selectedKey) {
    selectedKey = landlordMenu.find((item) => location.pathname.startsWith(item.path))?.key;
  }

  return (
    <Sidebar
      name={user?.fullName || user?.name || user?.email || "Landlord"}
      avatar="https://i.pravatar.cc/40?img=2"
      menuItems={landlordMenu}
      selectedKeys={[selectedKey]}
    ></Sidebar>
  );
}
