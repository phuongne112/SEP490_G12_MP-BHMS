import React, { useState } from "react";
import { Dropdown, Menu, Modal, Spin } from "antd";
import { useDispatch } from "react-redux";
import { logout } from "../../store/accountSlice";
import { getAccountInfo, getPersonalInfo } from "../../services/userApi";

export default function UserMenu() {
  const dispatch = useDispatch();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [infoData, setInfoData] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
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

  const menu = (
    <Menu>
      <Menu.Item onClick={openAccountModal}>Thông tin tài khoản</Menu.Item>
      <Menu.Item onClick={openInfoModal}>Thông tin cá nhân</Menu.Item>
      <Menu.Divider />
      <Menu.Item onClick={handleLogout} style={{ color: "red" }}>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomRight" arrow>
        <div style={{ cursor: "pointer", color: "#fff" }}>Administrator</div>
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
