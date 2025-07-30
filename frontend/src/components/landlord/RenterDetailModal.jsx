import React from "react";
import { Modal, Descriptions, Tag, Avatar, Divider, Card, Row, Col } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined, CalendarOutlined, IdcardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

export default function RenterDetailModal({ visible, onClose, renterData }) {
  if (!renterData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("DD/MM/YYYY");
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("DD/MM/YYYY HH:mm");
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar 
            size={32} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: "#1890ff" }}
          />
          <span>Thông tin chi tiết người thuê</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <div style={{ padding: "16px 0" }}>
        {/* Thông tin cơ bản */}
        <Card 
          title="Thông tin cá nhân" 
          size="small" 
          style={{ marginBottom: 16 }}
          headStyle={{ backgroundColor: "#fafafa", fontWeight: 600 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <UserOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Họ và tên:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.fullName || renterData.name || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <IdcardOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Tên đăng nhập:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.username || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <MailOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Email:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.email || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <PhoneOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Số điện thoại:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.phoneNumber || renterData.userInfo?.phoneNumber || "N/A"}
              </div>
            </Col>
            {renterData.userInfo?.phoneNumber2 && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <PhoneOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Số điện thoại 2:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.userInfo.phoneNumber2}
                </div>
              </Col>
            )}
            {(renterData.citizenId || renterData.userInfo?.nationalID) && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IdcardOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>CCCD/CMND:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.citizenId || renterData.userInfo?.nationalID}
                </div>
              </Col>
            )}
            {renterData.userInfo?.nationalIDIssuePlace && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IdcardOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Nơi cấp:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.userInfo.nationalIDIssuePlace}
                </div>
              </Col>
            )}
            {renterData.userInfo?.nationalIDIssueDate && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <CalendarOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Ngày cấp:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {formatDate(renterData.userInfo.nationalIDIssueDate)}
                </div>
              </Col>
            )}
            {(renterData.dateOfBirth || renterData.userInfo?.birthDate) && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <CalendarOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Ngày sinh:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {formatDate(renterData.dateOfBirth || renterData.userInfo?.birthDate)}
                </div>
              </Col>
            )}
            {renterData.userInfo?.birthPlace && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <HomeOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Nơi sinh:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.userInfo.birthPlace}
                </div>
              </Col>
            )}
            {renterData.userInfo?.gender && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <UserOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Giới tính:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.userInfo.gender === "MALE" ? "Nam" : renterData.userInfo.gender === "FEMALE" ? "Nữ" : "Khác"}
                </div>
              </Col>
            )}
            {(renterData.address || renterData.userInfo?.permanentAddress) && (
              <Col span={24}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <HomeOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontWeight: 500 }}>Địa chỉ:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {renterData.address || renterData.userInfo?.permanentAddress}
                </div>
              </Col>
            )}
          </Row>
        </Card>

        {/* Thông tin thuê phòng */}
        <Card 
          title="Thông tin thuê phòng" 
          size="small" 
          style={{ marginBottom: 16 }}
          headStyle={{ backgroundColor: "#fafafa", fontWeight: 600 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <HomeOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Phòng hiện tại:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.room || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CalendarOutlined style={{ color: "#1890ff" }} />
                <span style={{ fontWeight: 500 }}>Ngày nhận phòng:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.checkInDate || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>Trạng thái thuê:</span>
              </div>
              <div style={{ marginLeft: 24 }}>
                <Tag color={renterData.status === "Đang thuê" ? "green" : "red"}>
                  {renterData.status || "N/A"}
                </Tag>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>Trạng thái tài khoản:</span>
              </div>
              <div style={{ marginLeft: 24 }}>
                <Tag color={renterData.isActive ? "green" : "red"}>
                  {renterData.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Thông tin hệ thống */}
        <Card 
          title="Thông tin hệ thống" 
          size="small"
          headStyle={{ backgroundColor: "#fafafa", fontWeight: 600 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>ID người dùng:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {renterData.id || "N/A"}
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>Ngày tạo:</span>
              </div>
              <div style={{ marginLeft: 24, color: "#262626" }}>
                {formatDateTime(renterData.createdDate)}
              </div>
            </Col>
            {renterData.updatedDate && (
              <Col span={12}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>Ngày cập nhật:</span>
                </div>
                <div style={{ marginLeft: 24, color: "#262626" }}>
                  {formatDateTime(renterData.updatedDate)}
                </div>
              </Col>
            )}
          </Row>
        </Card>
      </div>
    </Modal>
  );
} 