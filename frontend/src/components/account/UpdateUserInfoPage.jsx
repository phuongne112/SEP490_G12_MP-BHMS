import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  DatePicker,
  message,
  Spin,
  Select,
  Popconfirm,
  Upload,
  Row,
  Col,
} from "antd";
import dayjs from "dayjs";
import {
  createPersonalInfo,
  getPersonalInfo,
  updatePersonalInfo,
  ocrCccd,
} from "../../services/userApi";
import { InboxOutlined } from '@ant-design/icons';

export default function UpdateUserInfoModal({
  open,
  isCreate,
  onClose,
  onBackToInfoModal,
  ocrData,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (ocrData) {
      // Nếu có dữ liệu OCR, tự động điền vào form
      let birthDateValue = null;
      if (ocrData.birthDate) {
        let raw = ocrData.birthDate.replace(" PM", "").replace(" AM", "").replace(" ", "T");
        const tryFormats = [
          "YYYY-MM-DDTHH:mm:ss",
          "YYYY-MM-DD HH:mm:ss",
          "YYYY-MM-DD",
          "DD/MM/YYYY",
          "DD-MM-YYYY"
        ];
        for (const fmt of tryFormats) {
          const d = dayjs(raw, fmt, true);
          if (d.isValid()) {
            birthDateValue = d;
            break;
          }
        }
      }
      form.setFieldsValue({
        fullName: ocrData.fullName,
        nationalID: ocrData.nationalID,
        birthDate: birthDateValue,
        gender: ocrData.gender,
        birthPlace: ocrData.birthPlace,
        permanentAddress: ocrData.permanentAddress,
        nationalIDIssuePlace: ocrData.nationalIDIssuePlace,
      });
      setInitialLoading(false);
      return;
    }

    if (isCreate) {
      form.resetFields();
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
      getPersonalInfo()
        .then((res) => {
          const data = res?.data || res;
          form.setFieldsValue({
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            phoneNumber2: data.phoneNumber2 || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? dayjs(data.birthDate) : null,
            birthPlace: data.birthPlace || "",
            nationalID: data.nationalID || "",
            nationalIDIssuePlace: data.nationalIDIssuePlace || "",
            permanentAddress: data.permanentAddress || "",
          });
        })
        .catch(() => message.error("Không thể tải thông tin cá nhân."))
        .finally(() => setInitialLoading(false));
    }
  }, [open, isCreate, ocrData]);

  const onFinish = async (values) => {
    let birthDateInstant = null;
    console.log('Giá trị birthDate khi submit:', values.birthDate);
    if (values.birthDate) {
      let d = values.birthDate;
      // Nếu là object dayjs
      if (d && typeof d === 'object' && d.isValid && d.isValid()) {
        birthDateInstant = d.toISOString();
      } else if (typeof d === 'string') {
        // Nếu là string, thử parse lại
        let raw = d.trim().replace(/[^0-9/\-]/g, "");
        const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"];
        for (const fmt of tryFormats) {
          const parsed = dayjs(raw, fmt, true);
          if (parsed.isValid()) {
            birthDateInstant = parsed.toISOString();
            break;
          }
        }
      }
    }
    console.log('birthDateInstant gửi lên backend:', birthDateInstant);
    const payload = {
      ...values,
      birthDate: birthDateInstant,
    };

    try {
      setLoading(true);
      if (isCreate) {
        await createPersonalInfo(payload);
        message.success("Tạo thông tin cá nhân thành công!");
      } else {
        await updatePersonalInfo(payload);
        message.success("Cập nhật thông tin cá nhân thành công!");
      }
      onClose();
      onBackToInfoModal?.();
    } catch (err) {
      const fieldErrors = err.response?.data?.data;
      if (fieldErrors && typeof fieldErrors === "object") {
        form.setFields(
          Object.entries(fieldErrors).map(([field, message]) => ({
            name: field,
            errors: [message],
          }))
        );
      } else {
        message.error(
          isCreate
            ? "Tạo thông tin cá nhân thất bại."
            : "Cập nhật thông tin cá nhân thất bại."
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
      const data = res?.data || res;
      console.log('Kết quả OCR:', data);
      let genderValue = "Other";
      const genderText = (data.gender || "").toLowerCase().trim().normalize("NFC");
      if (genderText === "nam") genderValue = "Male";
      else if (genderText === "nữ" || genderText === "nu") genderValue = "Female";
      // Chuẩn hóa ngày sinh
      let birthDateValue = null;
      if (data.birthDate) {
        const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"];
        for (const fmt of tryFormats) {
          const d = dayjs(data.birthDate, fmt, true);
          if (d.isValid()) {
            birthDateValue = d;
            break;
          }
        }
      }
      console.log('birthDateValue sau OCR:', birthDateValue);
      form.setFieldsValue({
        fullName: data.fullName,
        nationalID: data.nationalID,
        birthDate: birthDateValue,
        gender: genderValue,
        birthPlace: data.birthPlace,
        permanentAddress: data.permanentAddress,
        nationalIDIssuePlace: data.nationalIDIssuePlace,
      });
      message.success("Nhận diện thành công! Đã tự động điền thông tin.");
    } catch (e) {
      console.error("Lỗi OCR CCCD:", e);
      message.error("Nhận diện thất bại. Vui lòng thử lại!");
    }
    setOcrLoading(false);
  };

  return (
    <Modal
      title="Cập nhật thông tin cá nhân"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {initialLoading ? (
        <Spin />
      ) : (
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Số điện thoại"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber2" label="Số điện thoại phụ"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại phụ" },
              {
                pattern: /^\d{9,11}$/,
                message: "Số điện thoại phụ phải là số và có 9-11 chữ số"
              }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính"
            rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
          >
            <Select placeholder="Chọn giới tính">
              <Select.Option value="Male">Nam</Select.Option>
              <Select.Option value="Female">Nữ</Select.Option>
              <Select.Option value="Other">Khác</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="birthDate" label="Ngày sinh"
            rules={[
              { required: true, message: "Vui lòng chọn ngày sinh" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (value.isAfter(dayjs(), 'day')) {
                    return Promise.reject(new Error('Ngày sinh không được lớn hơn ngày hiện tại'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="birthPlace" label="Nơi sinh"
            rules={[{ required: true, message: "Vui lòng nhập nơi sinh" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="nationalID" label="CMND/CCCD"
            rules={[{ required: true, message: "Vui lòng nhập CMND/CCCD" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="nationalIDIssuePlace" label="Nơi cấp"
            rules={[{ required: true, message: "Vui lòng nhập nơi cấp" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú"
            rules={[{ required: true, message: "Vui lòng nhập địa chỉ thường trú" }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={16} style={{ marginBottom: 0 }}>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Ảnh mặt trước CCCD</div>
              <Upload.Dragger
                accept="image/*"
                beforeUpload={handleFrontChange}
                fileList={frontFile ? [frontFile] : []}
                onRemove={() => { setFrontFile(null); setFrontPreview(null); }}
                maxCount={1}
                disabled={ocrLoading}
                style={{ background: "#fafafa" }}
              >
                {frontPreview ? (
                  <img src={frontPreview} alt="Ảnh mặt trước" style={{ width: 180, borderRadius: 8, objectFit: "cover" }} />
                ) : (
                  <>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p>Kéo thả hoặc bấm để chọn ảnh mặt trước</p>
                  </>
                )}
              </Upload.Dragger>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Ảnh mặt sau CCCD</div>
              <Upload.Dragger
                accept="image/*"
                beforeUpload={handleBackChange}
                fileList={backFile ? [backFile] : []}
                onRemove={() => { setBackFile(null); setBackPreview(null); }}
                maxCount={1}
                disabled={ocrLoading}
                style={{ background: "#fafafa" }}
              >
                {backPreview ? (
                  <img src={backPreview} alt="Ảnh mặt sau" style={{ width: 180, borderRadius: 8, objectFit: "cover" }} />
                ) : (
                  <>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p>Kéo thả hoặc bấm để chọn ảnh mặt sau</p>
                  </>
                )}
              </Upload.Dragger>
            </Col>
          </Row>
          {/* Tên file sẽ tự động hiển thị dưới vùng upload */}
          <div style={{ textAlign: "center", margin: "85px 0 0 0" }}>
            <Button
              type="primary"
              loading={ocrLoading}
              onClick={handleOcr}
              disabled={!frontFile || !backFile}
              style={{ minWidth: 180 }}
            >
              Quét CCCD
            </Button>
          </div>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={onClose}>Huỷ</Button>
              <Popconfirm
                title={isCreate ? "Xác nhận tạo mới" : "Xác nhận cập nhật"}
                description={
                  isCreate
                    ? "Bạn có chắc chắn muốn tạo thông tin cá nhân này không?"
                    : "Bạn có chắc chắn muốn cập nhật thông tin cá nhân này không?"
                }
                onConfirm={() => form.submit()}
                okText="Đồng ý"
                cancelText="Huỷ"
              >
                <Button type="primary" loading={loading}>
                  {isCreate ? "Tạo mới" : "Cập nhật"}
                </Button>
              </Popconfirm>
            </div>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
