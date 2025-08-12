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
      // Nếu có dữ liệu OCR, lấy thông tin hiện tại từ database trước
      setInitialLoading(true);
      getPersonalInfo()
        .then((res) => {
          const existingData = res?.data || res;
          
          // Xử lý ngày sinh từ OCR
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
          
          // Xử lý ngày cấp từ OCR
          let issueDateValue = null;
          if (ocrData.issueDate) {
            let raw = ocrData.issueDate.replace(" PM", "").replace(" AM", "").replace(" ", "T");
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
                issueDateValue = d;
                break;
              }
            }
          }
          
          // Kết hợp thông tin từ OCR và database, ưu tiên OCR nếu có
          form.setFieldsValue({
            fullName: ocrData.fullName || existingData.fullName || "",
            phoneNumber: existingData.phoneNumber || "",
            phoneNumber2: existingData.phoneNumber2 || "",
            nationalID: ocrData.nationalID || existingData.nationalID || "",
            birthDate: birthDateValue || (existingData.birthDate ? dayjs(existingData.birthDate) : null),
            gender: ocrData.gender || existingData.gender || "",
            birthPlace: ocrData.birthPlace || existingData.birthPlace || "",
            permanentAddress: ocrData.permanentAddress || existingData.permanentAddress || "",
            nationalIDIssuePlace: ocrData.nationalIDIssuePlace || existingData.nationalIDIssuePlace || "",
            nationalIDIssueDate: issueDateValue || (existingData.nationalIDIssueDate ? dayjs(existingData.nationalIDIssueDate) : null),
          });
        })
        .catch(() => {
          // Nếu không lấy được thông tin từ database, chỉ điền OCR
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
          
          let issueDateValue = null;
          if (ocrData.issueDate) {
            let raw = ocrData.issueDate.replace(" PM", "").replace(" AM", "").replace(" ", "T");
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
                issueDateValue = d;
                break;
              }
            }
          }
          
          form.setFieldsValue({
            fullName: ocrData.fullName || "",
            phoneNumber: "",
            phoneNumber2: "",
            nationalID: ocrData.nationalID || "",
            birthDate: birthDateValue,
            gender: ocrData.gender || "",
            birthPlace: ocrData.birthPlace || "",
            permanentAddress: ocrData.permanentAddress || "",
            nationalIDIssuePlace: ocrData.nationalIDIssuePlace || "",
            nationalIDIssueDate: issueDateValue,
          });
        })
        .finally(() => setInitialLoading(false));
      return;
    }

    if (isCreate) {
      // Khi tạo mới, vẫn thử lấy thông tin hiện tại để điền sẵn
      setInitialLoading(true);
      getPersonalInfo()
        .then((res) => {
          const data = res?.data || res;
          // Điền thông tin đã có sẵn, để trống các trường chưa có
          form.setFieldsValue({
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            phoneNumber2: data.phoneNumber2 || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? dayjs(data.birthDate) : null,
            birthPlace: data.birthPlace || "",
            nationalID: data.nationalID || "",
            nationalIDIssuePlace: data.nationalIDIssuePlace || "",
            nationalIDIssueDate: data.nationalIDIssueDate ? dayjs(data.nationalIDIssueDate) : null,
            permanentAddress: data.permanentAddress || "",
          });
        })
        .catch(() => {
          // Nếu không có thông tin, để form trống
          form.resetFields();
        })
        .finally(() => setInitialLoading(false));
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
            nationalIDIssueDate: data.nationalIDIssueDate ? dayjs(data.nationalIDIssueDate) : null,
            permanentAddress: data.permanentAddress || "",
          });
        })
        .catch(() => message.error("Không thể tải thông tin cá nhân."))
        .finally(() => setInitialLoading(false));
    }
  }, [open, isCreate, ocrData]);

  const onFinish = async (values) => {
    // Không bắt buộc upload ảnh CCCD nữa, người dùng có thể nhập tay hoặc quét CCCD
    // Chỉ kiểm tra nếu người dùng đã upload ảnh thì phải upload đủ 2 ảnh
    if (frontFile && !backFile) {
      message.error("Vui lòng upload đủ ảnh mặt trước và mặt sau CCCD");
      return;
    }
    if (!frontFile && backFile) {
      message.error("Vui lòng upload đủ ảnh mặt trước và mặt sau CCCD");
      return;
    }

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
    
    // Chuẩn hóa ngày cấp
    let issueDateInstant = null;
    if (values.nationalIDIssueDate) {
      let d = values.nationalIDIssueDate;
      // Nếu là object dayjs
      if (d && typeof d === 'object' && d.isValid && d.isValid()) {
        issueDateInstant = d.toISOString();
      } else if (typeof d === 'string') {
        // Nếu là string, thử parse lại
        let raw = d.trim().replace(/[^0-9/\-]/g, "");
        const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"];
        for (const fmt of tryFormats) {
          const parsed = dayjs(raw, fmt, true);
          if (parsed.isValid()) {
            issueDateInstant = parsed.toISOString();
            break;
          }
        }
      }
    }
    
    const payload = {
      ...values,
      birthDate: birthDateInstant,
      nationalIDIssueDate: issueDateInstant,
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
    // Kiểm tra loại file
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được upload file ảnh!');
      return false;
    }
    
    // Kiểm tra kích thước file (tối đa 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB!');
      return false;
    }
    
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
    return false;
  };
  
  const handleBackChange = (file) => {
    // Kiểm tra loại file
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được upload file ảnh!');
      return false;
    }
    
    // Kiểm tra kích thước file (tối đa 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải nhỏ hơn 5MB!');
      return false;
    }
    
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
      
      // Chuẩn hóa ngày cấp
      let issueDateValue = null;
      if (data.issueDate) {
        const tryFormats = ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"];
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
        nationalID: data.nationalID,
        birthDate: birthDateValue,
        gender: genderValue,
        birthPlace: data.birthPlace,
        permanentAddress: data.permanentAddress,
        nationalIDIssuePlace: data.nationalIDIssuePlace,
        nationalIDIssueDate: issueDateValue,
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
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên" },
              { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự" },
              { max: 100, message: "Họ và tên không được quá 100 ký tự" },
              {
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Họ và tên chỉ được chứa chữ cái và khoảng trắng"
              }
            ]}
          >
            <Input placeholder="Nhập họ và tên đầy đủ" />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Số điện thoại"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại" },
              {
                pattern: /^0\d{9}$/,
                message: "Số điện thoại phải có 10 số và bắt đầu bằng 0"
              }
            ]}
          >
            <Input placeholder="Nhập số điện thoại chính" />
          </Form.Item>
          <Form.Item name="phoneNumber2" label="Số điện thoại phụ"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại phụ" },
              {
                pattern: /^0\d{9}$/,
                message: "Số điện thoại phụ phải có 10 số và bắt đầu bằng 0"
              },
              {
                validator: (_, value) => {
                  const phone1 = form.getFieldValue('phoneNumber');
                  if (value && phone1 && value === phone1) {
                    return Promise.reject(new Error('Số điện thoại phụ không được trùng với số điện thoại chính'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input placeholder="Nhập số điện thoại phụ" />
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
                  // Kiểm tra tuổi tối thiểu (16 tuổi)
                  const minAge = dayjs().subtract(16, 'year');
                  if (value.isAfter(minAge)) {
                    return Promise.reject(new Error('Bạn phải ít nhất 16 tuổi'));
                  }
                  // Kiểm tra tuổi tối đa (100 tuổi)
                  const maxAge = dayjs().subtract(100, 'year');
                  if (value.isBefore(maxAge)) {
                    return Promise.reject(new Error('Ngày sinh không hợp lệ'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="DD/MM/YYYY" 
              placeholder="Chọn ngày sinh"
              disabledDate={(current) => {
                const today = dayjs();
                const minAge = today.subtract(16, 'year');
                const maxAge = today.subtract(100, 'year');
                return current && (current.isAfter(today) || current.isAfter(minAge) || current.isBefore(maxAge));
              }}
            />
          </Form.Item>
          <Form.Item name="birthPlace" label="Nơi sinh"
            rules={[
              { required: true, message: "Vui lòng nhập nơi sinh" },
              { min: 2, message: "Nơi sinh phải có ít nhất 2 ký tự" }
            ]}
          >
            <Input placeholder="Nhập nơi sinh" />
          </Form.Item>
          <Form.Item name="nationalID" label="CMND/CCCD"
            rules={[
              { required: true, message: "Vui lòng nhập CMND/CCCD" },
              {
                pattern: /^[0-9]{9}$|^[0-9]{12}$/,
                message: "CMND/CCCD phải có 9 hoặc 12 chữ số"
              }
            ]}
          >
            <Input placeholder="Nhập số CMND hoặc CCCD" />
          </Form.Item>
          <Form.Item name="nationalIDIssuePlace" label="Nơi cấp"
            rules={[
              { required: true, message: "Vui lòng nhập nơi cấp" },
              { min: 2, message: "Nơi cấp phải có ít nhất 2 ký tự" }
            ]}
          >
            <Input placeholder="Nhập nơi cấp CMND/CCCD" />
          </Form.Item>
          <Form.Item name="nationalIDIssueDate" label="Ngày cấp"
            rules={[
              { required: true, message: "Vui lòng chọn ngày cấp" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const birthDate = form.getFieldValue('birthDate');
                  if (value.isBefore(birthDate)) {
                    return Promise.reject(new Error('Ngày cấp không được trước ngày sinh'));
                  }
                  if (value.isAfter(dayjs(), 'day')) {
                    return Promise.reject(new Error('Ngày cấp không được lớn hơn ngày hiện tại'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="DD/MM/YYYY" 
              placeholder="Chọn ngày cấp"
              disabledDate={(current) => {
                const birthDate = form.getFieldValue('birthDate');
                const today = dayjs();
                return current && (current.isBefore(birthDate) || current.isAfter(today));
              }}
            />
          </Form.Item>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú"
            rules={[
              { required: true, message: "Vui lòng nhập địa chỉ thường trú" },
              { min: 10, message: "Địa chỉ thường trú phải có ít nhất 10 ký tự" }
            ]}
          >
            <Input.TextArea 
              placeholder="Nhập địa chỉ thường trú đầy đủ" 
              rows={3}
            />
          </Form.Item>
                     <div style={{ 
             marginBottom: 16, 
             padding: 8, 
             backgroundColor: '#f6ffed', 
             border: '1px solid #b7eb8f', 
             borderRadius: 6,
             fontSize: 12,
             color: '#52c41a'
           }}>
             💡 <strong>Lưu ý:</strong> Upload ảnh CCCD là tùy chọn. Bạn có thể nhập thông tin bằng tay hoặc upload ảnh CCCD để quét tự động thông tin.
           </div>
          <Row gutter={16} style={{ marginBottom: 0 }}>
            <Col span={12}>
                             <div style={{ marginBottom: 8, fontWeight: 500 }}>
                 Ảnh mặt trước CCCD
               </div>
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
                             <div style={{ marginBottom: 8, fontWeight: 500 }}>
                 Ảnh mặt sau CCCD
               </div>
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
              <Button onClick={onClose}>Hủy</Button>
              <Popconfirm
                title={isCreate ? "Xác nhận tạo mới" : "Xác nhận cập nhật"}
                description={
                  isCreate
                    ? "Bạn có chắc chắn muốn tạo thông tin cá nhân này không?"
                    : "Bạn có chắc chắn muốn cập nhật thông tin cá nhân này không?"
                }
                onConfirm={() => {
                  // Kiểm tra lại validation trước khi submit
                  form.validateFields().then(() => {
                    form.submit();
                  }).catch(() => {
                    message.error("Vui lòng kiểm tra lại thông tin đã nhập");
                  });
                }}
                okText="Đồng ý"
                cancelText="Hủy"
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
