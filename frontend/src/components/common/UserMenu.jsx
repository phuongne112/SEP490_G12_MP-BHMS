import React, { useState } from "react";
import { Dropdown, Menu, Modal, Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/accountSlice";
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
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/home";
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

  const isRenter = user?.role?.roleName?.toUpperCase() === "RENTER" || user?.role?.roleId === 2;
  const isAdmin = user?.role?.roleName?.toUpperCase() === "ADMIN" || user?.role?.roleId === 1;

  const menu = (
    <Menu>
      <Menu.Item onClick={openAccountModal}>Account Info</Menu.Item>
      <Menu.Item onClick={openInfoModal}>Personal Info</Menu.Item>
      {isRenter && (
        <Menu.Item onClick={() => navigate("/room")}>Renter Dashboard</Menu.Item>
      )}
      {isAdmin && (
        <Menu.Item onClick={() => navigate("/admin/users")}>Admin Dashboard</Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item onClick={handleLogout} style={{ color: "red" }}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomRight" arrow>
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
