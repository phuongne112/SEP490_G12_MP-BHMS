import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Alert, Button, Upload, message, Row, Col } from "antd";
import { getPersonalInfo } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";
import BookingListModal from "./BookingListModal";
import { InboxOutlined } from '@ant-design/icons';
import { ocrCccd } from "../../services/userApi";
import dayjs from "dayjs";

export default function UserInfoModal({ open, onClose, onShowUpdateModal }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

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

  const handleFrontChange = (file) => {
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
    return false;
  };
  const handleBackChange = (file) => {
    setBackFile(file);
    setBackPreview(URL.createObjectURL(file));
    return false;
  };
  const handleOcr = async () => {
    if (!frontFile || !backFile) {
      message.error("Vui lòng chọn đủ 2 ảnh mặt trước và mặt sau CCCD!");
      return;
    }
    setOcrLoading(true);
    try {
      const res = await ocrCccd(frontFile, backFile);
      const data = res?.data || res; // fix nếu axiosClient trả về .data
      setInfo((prev) => ({ ...prev, ...data }));
      message.success("Nhận diện thành công! Đã tự động điền thông tin.");
    } catch (e) {
      console.error("Lỗi OCR CCCD:", e);
      message.error("Nhận diện thất bại. Vui lòng thử lại!");
    }
    setOcrLoading(false);
  };

  return (
    <Modal
      title="Thông tin cá nhân"
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
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
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
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
              {(() => {
                if (!info?.birthDate) return "-";
                let raw = info.birthDate.replace(" ", "T");
                const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ss.SSS"];
                let d = null;
                for (const fmt of tryFormats) {
                  const tryDate = dayjs(raw, fmt, true);
                  if (tryDate.isValid()) {
                    d = tryDate;
                    break;
                  }
                }
                return d ? d.format("DD/MM/YYYY") : "-";
              })()}
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
            <Descriptions.Item label="Ngày cấp">
              {(() => {
                if (!info?.nationalIDIssueDate) return "-";
                let raw = info.nationalIDIssueDate.replace(" ", "T");
                const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ss.SSS"];
                let d = null;
                for (const fmt of tryFormats) {
                  const tryDate = dayjs(raw, fmt, true);
                  if (tryDate.isValid()) {
                    d = tryDate;
                    break;
                  }
                }
                return d ? d.format("DD/MM/YYYY") : "-";
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ thường trú">
              {info?.permanentAddress || "-"}
            </Descriptions.Item>
          </Descriptions>
          <div
            style={{
              textAlign: "right",
              marginTop: 8,
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
