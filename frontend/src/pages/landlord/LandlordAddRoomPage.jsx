import React, { useState } from "react";
import {
  Layout,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Upload,
  message,
  Row,
  Col,
  Switch,
} from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import axiosClient from "../../services/axiosClient";
import { useNavigate } from "react-router-dom";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

export default function LandlordAddRoomPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();

  const handleUploadChange = ({ fileList: newFileList }) => {
    if (newFileList.length <= 8) {
      setFileList(newFileList);
    } else {
      message.warning("Chỉ được upload tối đa 8 ảnh!");
    }
  };

  const handleFinish = async (values) => {
    setLoading(true);
    setFormError(null);
    try {
      // Chuẩn bị dữ liệu AddRoomDTO
      const roomDTO = {
        roomNumber: values.roomNumber,
        area: values.area,
        pricePerMonth: values.price,
        roomStatus: values.roomStatus,
        numberOfBedrooms: values.numberOfBedrooms,
        numberOfBathrooms: values.numberOfBathrooms,
        description: values.description || "",
        maxOccupants: values.maxOccupants,
        isActive: values.isActive,
      };
      const formData = new FormData();
      formData.append("room", JSON.stringify(roomDTO));
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });
      await axiosClient.post("/rooms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Room added successfully!");
      // Navigate back to room list page
      navigate("/landlord/rooms");
    } catch (err) {
      const res = err.response?.data;
      setFormError(null);
      if (res && typeof res === "object") {
        // Nếu backend trả về lỗi từng trường
        const fieldMap = {};
        const fieldErrors = Object.entries(res).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        setFormError(res?.message || "Failed to add room!");
      }
    }
    setLoading(false);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout style={{ marginTop: 20, marginLeft: 15 }}>
        <PageHeader title="Add Room" />
        <Content style={{ padding: "24px" }}>
          {formError && (
            <div style={{ color: "red", marginBottom: 16 }}>{formError}</div>
          )}
          <Form
            layout="vertical"
            form={form}
            onFinish={handleFinish}
            initialValues={{
              area: 20,
              price: 1000000,
              numberOfBedrooms: 1,
              numberOfBathrooms: 1,
              roomStatus: "Available",
              isActive: true,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="roomNumber"
                  label="Room Number"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="e.g. 203" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="area"
                  label="Area (m²)"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Cost (VND/Month)"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(val) =>
                      `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    }
                    parser={(val) => val.replace(/\./g, "")}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomStatus"
                  label="Room Status"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="Available">Available</Option>
                    <Option value="Occupied">Occupied</Option>
                    <Option value="Maintenance">Maintenance</Option>
                    <Option value="Inactive">Inactive</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="numberOfBedrooms"
                  label="Number of Bedrooms"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={10} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="numberOfBathrooms"
                  label="Number of Bathrooms"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={10} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="maxOccupants"
                  label="Maximum Occupants"
                  rules={[{ required: true, message: "Please enter max occupants" }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Active Status"
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="Active" 
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Description">
                  <TextArea rows={2} placeholder="Description..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Images">
                  <Upload
                    listType="picture-card"
                    fileList={fileList}
                    onChange={handleUploadChange}
                    beforeUpload={() => false}
                    multiple
                    maxCount={8}
                    accept="image/*"
                  >
                    {fileList.length < 8 && (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>Upload</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Room
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Layout>
  );
}
