import React, { useState } from "react";
import { Dropdown, Menu, Modal, Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { logout as logoutService } from "../../services/authService";
import { getAccountInfo, getPersonalInfo } from "../../services/userApi";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.account.user);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [infoData, setInfoData] = useState(null);

  const handleLogout = () => {
    logoutService(dispatch);
  };

  const openAccountModal = async () => {
    try {
      const res = await getAccountInfo();
      setAccountData(res);
      setIsAccountModalOpen(true);
    } catch {
      setAccountData(null);
      setIsAccountModalOpen(true);
    }
  };

  const openInfoModal = async () => {
    try {
      const res = await getPersonalInfo();
      setInfoData(res);
      setIsInfoModalOpen(true);
    } catch {
      setInfoData(null);
      setIsInfoModalOpen(true);
    }
  };

  // Debug: Log user role info
  console.log("User role info:", {
    roleName: user?.role?.roleName,
    roleId: user?.role?.roleId,
    user: user
  });

  // Kiểm tra role dựa trên roleName trước, sau đó mới kiểm tra roleId
  const userRoleName = user?.role?.roleName?.toUpperCase();
  const userRoleId = user?.role?.roleId;
  
  const isRenter = userRoleName === "RENTER" || userRoleId === 2;
  const isAdmin = userRoleName === "ADMIN" || userRoleId === 1;
  const isLandlord = userRoleName === "LANDLORD" || userRoleId === 3;

  console.log("Role checks:", { 
    userRoleName, 
    userRoleId, 
    isRenter, 
    isAdmin, 
    isLandlord 
  });

  const menuItems = [
    {
      key: 'account',
      label: 'Thông tin tài khoản',
      onClick: openAccountModal
    },
    {
      key: 'personal',
      label: 'Thông tin cá nhân',
      onClick: openInfoModal
    },
    ...(isRenter ? [{
      key: 'renter-dashboard',
      label: 'Bảng điều khiển (Renter)',
      onClick: () => navigate("/renter/dashboard")
    }] : []),
    ...(isAdmin ? [{
      key: 'admin-dashboard',
      label: 'Bảng điều khiển (Admin)',
      onClick: () => navigate("/admin/dashboard")
    }] : []),
    ...(isLandlord ? [{
      key: 'landlord-dashboard',
      label: 'Bảng điều khiển (Landlord)',
      onClick: () => navigate("/landlord/dashboard")
    }] : []),
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      onClick: handleLogout,
      style: { color: 'red' }
    }
  ];

  return (
    <>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
        <div style={{ cursor: "pointer", color: "#fff" }}>
          {user?.email || user?.fullName || user?.username || "User"}
          {user?.role?.roleName ? (
            <span style={{ color: "#aaa", fontSize: 12, marginLeft: 4 }}>
              ({user.role.roleName})
            </span>
          ) : null}
        </div>
      </Dropdown>

      <Modal
        title="Thông tin tài khoản"
        open={isAccountModalOpen}
        onCancel={() => setIsAccountModalOpen(false)}
        footer={null}
      >
        {accountData ? (
          <ul>
            <li><strong>Username:</strong> {accountData.username}</li>
            <li><strong>Email:</strong> {accountData.email}</li>
            <li><strong>Họ tên:</strong> {accountData.fullName}</li>
          </ul>
        ) : (
          <Spin />
        )}
      </Modal>

      <Modal
        title="Thông tin cá nhân"
        open={isInfoModalOpen}
        onCancel={() => setIsInfoModalOpen(false)}
        footer={null}
        width={700}
      >
        {infoData ? (
          <ul>
            <li><strong>Họ tên:</strong> {infoData.fullName}</li>
            <li><strong>SĐT chính:</strong> {infoData.phoneNumber}</li>
            <li><strong>Giới tính:</strong> {infoData.gender}</li>
            <li><strong>Ngày sinh:</strong> {infoData.birthDate}</li>
            <li><strong>Nơi sinh:</strong> {infoData.birthPlace}</li>
            <li><strong>CCCD:</strong> {infoData.nationalID}</li>
            <li><strong>Nơi cấp:</strong> {infoData.nationalIDIssuePlace}</li>
            <li><strong>Địa chỉ thường trú:</strong> {infoData.permanentAddress}</li>
          </ul>
        ) : (
          <Spin />
        )}
      </Modal>
    </>
  );
}
