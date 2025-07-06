import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Alert, Button } from "antd";
import { getPersonalInfo } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";
import BookingListModal from "./BookingListModal";

export default function UserInfoModal({ open, onClose, onShowUpdateModal }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();
        setCurrentUser(user);

        const data = await getPersonalInfo();
        setInfo(data);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 404 || status === 500) {
          setInfo(null);
        } else {
          setError("Không thể tải thông tin cá nhân.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open]);

  return (
    <Modal
      title="Thông tin cá nhân"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {loading ? (
        <Spin />
      ) : info === null ? (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <p>{error || "Không có thông tin cá nhân."}</p>
          <Button
            type="primary"
            onClick={() => {
              onClose();
              onShowUpdateModal?.(true); // chế độ tạo mới
            }}
          >
            Thêm thông tin
          </Button>
        </div>
      ) : (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Họ và tên">
              {info?.fullName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {info?.phoneNumber || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại phụ">
              {info?.phoneNumber2 || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Giới tính">
              {info?.gender || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {info?.birthDate || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nơi sinh">
              {info?.birthPlace || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="CMND/CCCD">
              {info?.nationalID || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nơi cấp">
              {info?.nationalIDIssuePlace || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ thường trú">
              {info?.permanentAddress || "-"}
            </Descriptions.Item>
          </Descriptions>
          <div
            style={{
              textAlign: "right",
              marginTop: 16,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <Button onClick={() => setShowBookingModal(true)}>
              Xem lịch hẹn
            </Button>
            <Button
              type="primary"
              onClick={() => {
                onClose();
                onShowUpdateModal?.(false); // chế độ cập nhật
              }}
            >
              Cập nhật
            </Button>
          </div>
          <BookingListModal
            open={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            currentUser={currentUser}
          />
        </>
      )}
    </Modal>
  );
}
