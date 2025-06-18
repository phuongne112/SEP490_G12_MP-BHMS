import React from "react";
import {
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  ToolOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";

export default function LandlordSidebar() {
  const user = useSelector((state) => state.account.user);

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
      key: "/landlord/services",
      icon: <ToolOutlined />,
      label: "Service",
      path: "/landlord/services",
    },
  ];

  return (
    <Sidebar
      name={user?.fullName || "Landlord"}
      avatar="https://i.pravatar.cc/40?img=2"
      menuItems={landlordMenu}
      defaultKey="/landlord/renters"
    ></Sidebar>
  );
}
