import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { addAsset, updateAsset, checkDuplicateAssetName } from "../../services/assetApi";

const { Option } = Select;

export default function LandlordAddAssetModal({ open, onClose, onSuccess, asset, mode = "add" }) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fill dữ liệu khi edit
  useEffect(() => {
    if (asset && open) {
      form.setFieldsValue({
        assetName: asset.assetName,
        quantity: asset.quantity,
        conditionNote: asset.conditionNote,
      });
      if (asset.assetImage) {
        setFileList([
          {
            uid: "-1",
            name: asset.assetImage.split("/").pop(),
            status: "done",
            url: asset.assetImage,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else if (!open) {
      form.resetFields();
      setFileList([]);
    }
  }, [asset, open, form]);

  const doUpdate = async (values) => {
    try {
      // Kiểm tra validation ở frontend trước khi gửi request
      if (!values.assetName || values.assetName.trim() === '') {
        message.error("Tên tài sản không được để trống hoặc chỉ chứa khoảng trắng");
        form.setFields([
          {
            name: 'assetName',
            errors: ['Tên tài sản không được để trống hoặc chỉ chứa khoảng trắng']
          }
        ]);
        setLoading(false);
        return;
      }
      
      if (!values.quantity || values.quantity <= 0) {
        message.error("Số lượng phải lớn hơn 0");
        form.setFields([
          {
            name: 'quantity',
            errors: ['Số lượng phải lớn hơn 0']
          }
        ]);
        setLoading(false);
        return;
      }

      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (key !== "assetImage") {
          // Trim khoảng trắng cho tên tài sản
          if (key === "assetName") {
            formData.append(key, value.trim());
          } else {
            formData.append(key, value);
          }
        }
      });
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("assetImage", fileList[0].originFileObj);
      }
      setLoading(true);
      let response;
      if (mode === "edit" && asset) {
        response = await updateAsset(asset.id, formData);
        message.success("Cập nhật tài sản thành công!");
      } else {
        response = await addAsset(formData);
        message.success("Thêm tài sản thành công!");
      }
      form.resetFields();
      setFileList([]);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error("[AssetModal] Error:", err);
      
      // Xử lý lỗi từ backend một cách chi tiết hơn
      if (err.response?.data) {
        const responseData = err.response.data;
        
        // Xử lý lỗi validation cụ thể từ backend
        if (responseData.message && responseData.message.includes('Validation failed')) {
          // Tìm lỗi validation trong constraint violations
          if (responseData.message.includes('assetName')) {
            message.error("Tên tài sản không hợp lệ. Vui lòng kiểm tra lại!");
            form.setFields([
              {
                name: 'assetName',
                errors: ['Tên tài sản không hợp lệ']
              }
            ]);
          } else if (responseData.message.includes('quantity')) {
            message.error("Số lượng không hợp lệ. Vui lòng kiểm tra lại!");
            form.setFields([
              {
                name: 'quantity',
                errors: ['Số lượng không hợp lệ']
              }
            ]);
          } else {
            message.error("Thông tin nhập vào không hợp lệ. Vui lòng kiểm tra lại!");
          }
        } else if (responseData.message) {
          // Hiển thị thông báo lỗi chính từ backend
          message.error(responseData.message);
        } else {
          message.error("Lưu tài sản thất bại! Vui lòng thử lại.");
        }
        
        // Xử lý lỗi validation cho từng trường
        if (responseData.data && typeof responseData.data === "object") {
          const fieldErrors = Object.entries(responseData.data).map(([field, errorMsg]) => ({
            name: field === "assetName" ? "assetName" : field === "quantity" ? "quantity" : field,
            errors: [errorMsg],
          }));
          
          if (fieldErrors.length > 0) {
            form.setFields(fieldErrors);
          }
        }
      } else {
        // Lỗi khác
        message.error(err.message || "Lưu tài sản thất bại! Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Kiểm tra validation bổ sung trước khi submit
      if (!values.assetName || values.assetName.trim() === '') {
        message.error("Tên tài sản không được để trống hoặc chỉ chứa khoảng trắng");
        form.setFields([
          {
            name: 'assetName',
            errors: ['Tên tài sản không được để trống hoặc chỉ chứa khoảng trắng']
          }
        ]);
        return;
      }
      
      if (!values.quantity || values.quantity <= 0) {
        message.error("Số lượng phải lớn hơn 0");
        form.setFields([
          {
            name: 'quantity',
            errors: ['Số lượng phải lớn hơn 0']
          }
        ]);
        return;
      }
      
      if (mode === "edit") {
        Modal.confirm({
          title: "Bạn có chắc muốn cập nhật tài sản này không?",
          okText: "Có",
          cancelText: "Không",
          onOk: async () => {
            await doUpdate(values);
          }
        });
      } else {
        await doUpdate(values);
      }
    } catch (err) {
      // Validation error từ form rules
      if (err?.errorFields) {
        console.log('Form validation failed:', err);
        message.error("Vui lòng kiểm tra lại thông tin nhập vào!");
      }
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Chỉnh sửa tài sản" : "Thêm tài sản"}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText={mode === "edit" ? "Cập nhật" : "Thêm"}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="assetName"
          label="Tên tài sản"
          rules={[
            { required: true, message: "Vui lòng nhập tên tài sản" },
            {
              validator: (_, value) => {
                if (!value || value.trim() === '') {
                  return Promise.reject(new Error('Tên tài sản không được để trống hoặc chỉ chứa khoảng trắng'));
                }
                if (value.trim().length < 2) {
                  return Promise.reject(new Error('Tên tài sản phải có ít nhất 2 ký tự'));
                }
                return Promise.resolve();
              },
              validateTrigger: ['onBlur', 'onChange']
            },
            {
              validator: async (_, value) => {
                if (!value || value.trim() === '') {
                  return Promise.resolve();
                }
                try {
                  const nameToCheck = value.trim();
                  const isDuplicate = await checkDuplicateAssetName(
                    nameToCheck,
                    mode === "edit" ? asset?.id : null
                  );
                  if (isDuplicate) {
                    return Promise.reject(new Error("Tên tài sản đã tồn tại (không phân biệt chữ hoa/thường). Vui lòng chọn tên khác."));
                  }
                  return Promise.resolve();
                } catch (error) {
                  console.error("Error checking duplicate asset name:", error);
                  return Promise.resolve();
                }
              },
              validateTrigger: ['onBlur', 'onChange']
            }
          ]}
        >
          <Input placeholder="Nhập tên tài sản" />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Số lượng"
          rules={[
            { required: true, message: "Vui lòng nhập số lượng" },
            {
              validator: (_, value) => {
                if (!value || value === null || value === undefined) {
                  return Promise.reject(new Error('Vui lòng nhập số lượng'));
                }
                if (value <= 0) {
                  return Promise.reject(new Error('Số lượng phải lớn hơn 0'));
                }
                if (!Number.isInteger(value)) {
                  return Promise.reject(new Error('Số lượng phải là số nguyên'));
                }
                return Promise.resolve();
              },
              validateTrigger: ['onBlur', 'onChange']
            }
          ]}
        >
          <InputNumber 
            min={1} 
            style={{ width: "100%" }} 
            placeholder="Nhập số lượng"
            step={1}
            precision={0}
          />
        </Form.Item>
        <Form.Item name="conditionNote" label="Ghi chú tình trạng">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="assetImage" label="Hình ảnh">
          <Upload
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Chỉ có thể tải lên file ảnh!');
                return false;
              }
              const isLt2M = file.size / 1024 / 1024 < 2;
              if (!isLt2M) {
                message.error('Ảnh phải nhỏ hơn 2MB!');
                return false;
              }
              return false; // Prevent auto upload
            }}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList.slice(-1))}
            listType="picture"
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
} 