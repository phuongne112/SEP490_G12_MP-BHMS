import React from "react";
import {
  HomeOutlined,
  FileTextOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

export default function RenterSidebar() {
  const user = useSelector((state) => state.account.user);
  const location = useLocation();

  const renterMenu = [
    {
      key: "/renter/room",
      icon: <HomeOutlined />,
      label: "Phòng của tôi",
      path: "/renter/room",
    },
    {
      key: "/renter/contracts",
      icon: <FileTextOutlined />,
      label: "Hợp đồng",
      path: "/renter/contracts",
    },
    {
      key: "/renter/bills",
      icon: <DollarOutlined />,
      label: "Hóa đơn",
      path: "/renter/bills",
    },
  ];

  const selectedKey = renterMenu.find((item) =>
    location.pathname.startsWith(item.path)
  )?.key;

  return (
    <Sidebar
      name={user?.fullName || "Người thuê"}
      avatar="https://i.pravatar.cc/40?img=4"
      menuItems={renterMenu}
      selectedKeys={[selectedKey]}
    />
  );
}
