import React from "react";
import {
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  ToolOutlined,
  TeamOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

export default function LandlordSidebar() {
  const user = useSelector((state) => state.account.user);
  const location = useLocation();

  const landlordMenu = [
    {
      key: "/landlord/renters",
      icon: <TeamOutlined />,
      label: "Renter",
      path: "/landlord/renters",
    },
    {
      key: "/landlord/rooms",
      icon: <HomeOutlined />,
      label: "Room",
      path: "/landlord/rooms",
    },
    {
      key: "/landlord/revenue",
      icon: <DollarOutlined />,
      label: "Revenue",
      path: "/landlord/revenue",
    },
    {
      key: "/landlord/contract",
      icon: <FileTextOutlined />,
      label: "Contract",
      path: "/landlord/contract",
    },
    {
      key: "/landlord/services",
      icon: <ToolOutlined />,
      label: "Service",
      path: "/landlord/services",
    },
    {
      key: "/landlord/electric",
      icon: <ToolOutlined />,
      label: "Electric",
      path: "/landlord/electric",
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
