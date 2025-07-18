import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Spin, Alert, Button, Upload, Modal as AntdModal, Form, Input, message } from "antd";
import { getPersonalInfo } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";
import BookingListModal from "./BookingListModal";
import { InboxOutlined } from '@ant-design/icons';

export default function UserInfoModal({ open, onClose, onShowUpdateModal }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [form] = Form.useForm();

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

  useEffect(() => {
    if (info) {
      form.setFieldsValue({
        fullName: info.fullName,
        phoneNumber: info.phoneNumber,
        phoneNumber2: info.phoneNumber2,
        gender: info.gender,
        birthDate: info.birthDate ? new Date(info.birthDate).toISOString().slice(0,10) : undefined,
        birthPlace: info.birthPlace,
        nationalID: info.nationalID,
        nationalIDIssuePlace: info.nationalIDIssuePlace,
        permanentAddress: info.permanentAddress,
      });
    }
  }, [info, form]);

  const handleOcr = async () => {
    if (!frontFile || !backFile) {
      message.error("Vui lòng chọn đủ 2 ảnh mặt trước và mặt sau CCCD!");
      return;
    }
    setOcrLoading(true);
    try {
      const res = await ocrCccd(frontFile, backFile);
      setOcrResult(res);
      // Tự động điền vào form
      form.setFieldsValue({
        fullName: res.fullName,
        nationalID: res.nationalID,
        birthDate: res.birthDate,
        nationalIDIssuePlace: res.nationalIDIssuePlace,
        permanentAddress: res.permanentAddress,
      });
      message.success("Nhận diện thành công! Đã tự động điền thông tin.");
      setOcrModalOpen(false);
    } catch {
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
              {info?.birthDate ? (new Date(info.birthDate).toLocaleDateString("vi-VN")) : "-"}
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
            <Button onClick={() => setOcrModalOpen(true)}>
              OCR CCCD
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
          <AntdModal
            open={ocrModalOpen}
            onCancel={() => setOcrModalOpen(false)}
            title="Nhận diện CCCD bằng ảnh"
            footer={null}
          >
            <Form layout="vertical">
              <Form.Item label="Ảnh mặt trước CCCD">
                <Upload.Dragger
                  accept="image/*"
                  beforeUpload={file => { setFrontFile(file); return false; }}
                  fileList={frontFile ? [frontFile] : []}
                  onRemove={() => setFrontFile(null)}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p>Kéo thả hoặc bấm để chọn ảnh mặt trước</p>
                </Upload.Dragger>
              </Form.Item>
              <Form.Item label="Ảnh mặt sau CCCD">
                <Upload.Dragger
                  accept="image/*"
                  beforeUpload={file => { setBackFile(file); return false; }}
                  fileList={backFile ? [backFile] : []}
                  onRemove={() => setBackFile(null)}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p>Kéo thả hoặc bấm để chọn ảnh mặt sau</p>
                </Upload.Dragger>
              </Form.Item>
              <Form.Item>
                <Button type="primary" loading={ocrLoading} onClick={handleOcr} block>
                  Nhận diện và điền thông tin
                </Button>
              </Form.Item>
            </Form>
          </AntdModal>
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
