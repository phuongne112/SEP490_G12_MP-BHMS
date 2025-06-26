import React, { useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { addAsset } from "../../services/assetApi";

const { Option } = Select;

export default function LandlordAddAssetModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (key !== "assetImage") {
          formData.append(key, value);
        }
      });
      if (fileList.length > 0) {
        formData.append("assetImage", fileList[0].originFileObj);
      }
      // Log FormData các trường gửi lên
      for (let pair of formData.entries()) {
        console.log("[AddAsset] FormData:", pair[0], pair[1]);
      }
      setLoading(true);
      await addAsset(formData);
      message.success("Asset added successfully!");
      form.resetFields();
      setFileList([]);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      message.error("Failed to add asset");
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      title="Add Asset"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Add"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="assetName"
          label="Asset Name"
          rules={[{ required: true, message: "Please enter asset name" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[{ required: true, message: "Please enter quantity" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="assetStatus"
          label="Status"
          rules={[{ required: true, message: "Please select status" }]}
        >
          <Select>
            <Option value="Good">Good</Option>
            <Option value="Damaged">Damaged</Option>
            <Option value="Lost">Lost</Option>
            <Option value="Maintenance">Maintenance</Option>
          </Select>
        </Form.Item>
        <Form.Item name="conditionNote" label="Condition Note">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="assetImage" label="Image">
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList.slice(-1))}
            listType="picture"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select Image</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
} 