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
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (key !== "assetImage") {
          formData.append(key, value);
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
      message.error(err.response?.data?.message || "Lưu tài sản thất bại");
    }
    setLoading(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
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
      // validation error
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
               validator: async (_, value) => {
                 if (!value || value.trim() === '') {
                   return Promise.resolve();
                 }
                 
                 try {
                   // Kiểm tra cả chữ hoa và chữ thường
                   const normalizedValue = value.trim().toLowerCase();
                   const isDuplicate = await checkDuplicateAssetName(
                     normalizedValue, 
                     mode === "edit" ? asset?.id : null
                   );
                   
                   if (isDuplicate) {
                     return Promise.reject(new Error("Tên tài sản đã tồn tại (không phân biệt chữ hoa/thường). Vui lòng chọn tên khác."));
                   }
                   
                   return Promise.resolve();
                 } catch (error) {
                   console.error("Error checking duplicate asset name:", error);
                   return Promise.resolve(); // Nếu lỗi API thì cho phép tiếp tục
                 }
               },
               validateTrigger: ['onBlur', 'onChange']
             }
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Số lượng"
          rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="conditionNote" label="Ghi chú tình trạng">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="assetImage" label="Hình ảnh">
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList.slice(-1))}
            listType="picture"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
} 