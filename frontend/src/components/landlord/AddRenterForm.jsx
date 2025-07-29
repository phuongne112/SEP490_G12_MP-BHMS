import React, { useState } from "react";
import {
  Button,
  Form,
  Input,
  DatePicker,
  Row,
  Col,
  message,
  Switch,
  ConfigProvider,
} from "antd";
import { addRenter } from "../../services/renterApi";
import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import { ocrCccd } from '../../services/userApi';
import dayjs from "dayjs";
import { ArrowLeftOutlined } from '@ant-design/icons';
import locale from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

// Đặt locale cho dayjs
dayjs.locale('vi');

export default function AddRenterForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

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
      message.error('Vui lòng chọn đủ 2 ảnh mặt trước và mặt sau CCCD!');
      return;
    }
    setOcrLoading(true);
    try {
      const res = await ocrCccd(frontFile, backFile);
      const data = res?.data || res;
      console.log('Kết quả OCR CCCD:', data);
      
      // Chuẩn hóa ngày sinh
      let birthDateValue = null;
      if (data.birthDate) {
        const tryFormats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
        for (const fmt of tryFormats) {
          const d = dayjs(data.birthDate, fmt, true);
          if (d.isValid()) {
            birthDateValue = d;
            break;
          }
        }
      }
      
      // Chuẩn hóa ngày cấp (nếu có)
      let issueDateValue = null;
      if (data.issueDate) {
        const tryFormats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
        for (const fmt of tryFormats) {
          const d = dayjs(data.issueDate, fmt, true);
          if (d.isValid()) {
            issueDateValue = d;
            break;
          }
        }
      }
      
      form.setFieldsValue({
        fullName: data.fullName,
        citizenId: data.nationalID,
        dateOfBirth: birthDateValue,
        address: data.permanentAddress,
        // Thêm ngày cấp nếu form có trường này
        ...(issueDateValue && { issueDate: issueDateValue }),
      });
      message.success('Nhận diện thành công! Đã tự động điền thông tin.');
    } catch (e) {
      console.error('Lỗi OCR CCCD:', e);
      message.error('Nhận diện thất bại. Vui lòng thử lại!');
    }
    setOcrLoading(false);
  };

  const handleFinish = async (values) => {
    // Chỉ lấy các trường backend yêu cầu
    const data = {
      username: values.username,
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      phone: values.phoneNumber,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
      citizenId: values.citizenId,
      address: values.address,
      isActive: values.isActive,
    };
    console.log("[DEBUG] Data gửi backend:", data);
    setLoading(true);
    try {
      const result = await addRenter(data);
      console.log("[DEBUG] Kết quả trả về:", result);
      message.success("Tạo tài khoản người thuê thành công!");
      form.resetFields();
      // Không gọi lại onSubmit để tránh double submit
    } catch (error) {
      const res = error.response?.data;
      if (res && res.data) {
        const errors = res.data;
        Object.entries(errors).forEach(([field, msg]) => {
          form.setFields([
            { name: field === "phone" ? "phoneNumber" : field, errors: [msg] },
          ]);
        });
        message.error("Vui lòng kiểm tra lại thông tin!");
      } else {
        message.error(res?.message || "Có lỗi xảy ra, vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => window.history.back()}
          style={{ paddingLeft: 0, fontWeight: 500 }}
        >
          Trở lại
        </Button>
      </div>
      <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ isActive: true }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Tên đăng nhập" name="username" rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập" },
              { min: 3, max: 50, message: "Tên đăng nhập phải từ 3-50 ký tự" },
              { pattern: /^[^@\s]+$/, message: "Tên đăng nhập không được là email." }
            ]}>
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Họ và tên" name="fullName" rules={[
              { required: true, message: "Vui lòng nhập họ và tên" },
              { min: 2, max: 100, message: "Họ và tên phải từ 2-100 ký tự" }
            ]}>
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
              { max: 100, message: "Email tối đa 100 ký tự" }
            ]}>
              <Input type="email" placeholder="Nhập email" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mật khẩu" name="password" rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, max: 32, message: "Mật khẩu phải từ 6-32 ký tự" }
            ]}>
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Số điện thoại" name="phoneNumber" rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              { message: "Số điện thoại không hợp lệ. Bắt đầu bằng 0, 10 số, đúng đầu số Việt Nam." }
            ]}>
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Ngày sinh" name="dateOfBirth" rules={[
              { required: true, message: "Vui lòng chọn ngày sinh" },
              { validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (value.isAfter && value.isAfter(new Date(), 'day')) {
                    return Promise.reject(new Error("Ngày sinh không hợp lệ"));
                  }
                  return Promise.resolve();
                }
              }
            ]}>
              <ConfigProvider locale={locale}>
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="Chọn ngày sinh" 
                  format="DD/MM/YYYY"
                />
              </ConfigProvider>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="CCCD/CMND" name="citizenId" rules={[
              { required: true, message: "Vui lòng nhập CCCD/CMND" },
              { pattern: /^\d{9,12}$/, message: "CCCD/CMND phải từ 9-12 số" }
            ]}>
              <Input placeholder="Nhập số CCCD/CMND" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Địa chỉ thường trú" name="address" rules={[
              { required: true, message: "Vui lòng nhập địa chỉ thường trú" }
            ]}>
              <Input placeholder="Nhập địa chỉ thường trú" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Trạng thái hoạt động" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
            </Form.Item>
          </Col>
        </Row>
        {/* Thêm vùng upload ảnh CCCD và nút quét */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Ảnh mặt trước CCCD</div>
            <Upload.Dragger
              accept="image/*"
              beforeUpload={file => { handleFrontChange(file); return false; }}
              fileList={frontFile ? [frontFile] : []}
              onRemove={() => { setFrontFile(null); setFrontPreview(null); }}
              maxCount={1}
              disabled={ocrLoading}
              style={{ background: '#fafafa' }}
            >
              {frontPreview ? (
                <img src={frontPreview} alt="Ảnh mặt trước" style={{ width: 180, borderRadius: 8, objectFit: 'cover' }} />
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
              beforeUpload={file => { handleBackChange(file); return false; }}
              fileList={backFile ? [backFile] : []}
              onRemove={() => { setBackFile(null); setBackPreview(null); }}
              maxCount={1}
              disabled={ocrLoading}
              style={{ background: '#fafafa' }}
            >
              {backPreview ? (
                <img src={backPreview} alt="Ảnh mặt sau" style={{ width: 180, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <>
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p>Kéo thả hoặc bấm để chọn ảnh mặt sau</p>
                </>
              )}
            </Upload.Dragger>
          </Col>
        </Row>
        {/* Nút quét CCCD đặt ra giữa, bên dưới 2 vùng upload, không bị đè lên tên file */}
        <div style={{ textAlign: 'center', margin: '64px 0 16px 0' }}>
          <Button
            type="primary"
            loading={ocrLoading}
            onClick={handleOcr}
            disabled={!frontFile || !backFile}
            style={{ minWidth: 140, borderRadius: 8, fontWeight: 600, fontSize: 15, height: 36 }}
          >
            Quét CCCD
          </Button>
        </div>
        <Form.Item style={{ textAlign: "right" }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo tài khoản
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
