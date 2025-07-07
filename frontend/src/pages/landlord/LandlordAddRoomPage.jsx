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
import { PlusOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import axiosClient from "../../services/axiosClient";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

export default function LandlordAddRoomPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = useSelector((state) => state.account.user);

  const handleUploadChange = ({ fileList: newFileList }) => {
    if (newFileList.length <= 8) {
      setFileList(newFileList);
    } else {
      message.warning("Chỉ được upload tối đa 8 ảnh!");
    }
  };

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const roomNumber = values.building + values.roomNumberSuffix;
      const roomDTO = {
        roomNumber,
        area: values.area,
        pricePerMonth: values.price,
        roomStatus: values.roomStatus,
        numberOfBedrooms: values.numberOfBedrooms,
        numberOfBathrooms: values.numberOfBathrooms,
        description: values.description || "",
        maxOccupants: values.maxOccupants,
        isActive: values.isActive,
        building: values.building,
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

      message.success("Thêm phòng thành công!");
      if (
        user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
        user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
      ) {
        navigate("/admin/rooms");
      } else {
        navigate("/landlord/rooms");
      }
    } catch (err) {
      const res = err.response?.data;
      if (res && typeof res === "object") {
        if (res.message) {
          message.error(res.message);
        } else {
          const firstError = Object.values(res)[0];
          message.error(firstError || "Vui lòng kiểm tra lại các trường thông tin!");
        }

        const fieldMap = {};
        const fieldErrors = Object.entries(res).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        message.error("Thêm phòng thất bại!");
      }
    }
    setLoading(false);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        {user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
        user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
          <AdminSidebar />
        ) : (
          <LandlordSidebar />
        )}
      </Sider>
      <Layout style={{ marginTop: 20, marginLeft: 15 }}>
        <PageHeader title="Thêm phòng" />
        <Content style={{ padding: "24px" }}>
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
                  name="building"
                  label="Tòa nhà"
                  rules={[{ required: true, message: "Vui lòng nhập tên tòa nhà" }]}
                >
                  <Input placeholder="e.g. A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomNumberSuffix"
                  label="Số phòng (Suffix)"
                  rules={[
                    { required: true, message: "Vui lòng nhập số phòng" },
                    { pattern: /^\d+$/, message: "Số phòng chỉ được phép là số" }
                  ]}
                >
                  <Input placeholder="e.g. 101" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="area"
                  label="Diện tích (m²)"
                  rules={[{ required: true, message: "Vui lòng nhập diện tích phòng" }]}
                >
                  <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Giá (VND/Month)"
                  rules={[{ required: true, message: "Vui lòng nhập giá thuê mỗi tháng" }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(val) => val.replace(/\./g, "")}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomStatus"
                  label="Trạng thái phòng"
                  rules={[{ required: true, message: "Vui lòng chọn trạng thái phòng" }]}
                >
                  <Select>
                    <Option value="Available">Còn trống</Option>
                    <Option value="Occupied">Đã thuê</Option>
                    <Option value="Maintenance">Bảo trì</Option>
                    <Option value="Inactive">Ngừng hoạt động</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="numberOfBedrooms"
                  label="Số phòng ngủ"
                  rules={[{ required: true, message: "Vui lòng nhập số phòng ngủ" }]}
                >
                  <InputNumber min={1} max={10} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="numberOfBathrooms"
                  label="Số phòng tắm"
                  rules={[{ required: true, message: "Vui lòng nhập số phòng tắm" }]}
                >
                  <InputNumber min={1} max={10} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="maxOccupants"
                  label="Số người tối đa"
                  rules={[{ required: true, message: "Vui lòng nhập số người tối đa" }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Trạng thái hoạt động"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={2} placeholder="Nhập mô tả..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Hình ảnh">
                  <Upload.Dragger
                    fileList={fileList}
                    onChange={handleUploadChange}
                    beforeUpload={() => false}
                    multiple
                    maxCount={8}
                    accept="image/*"
                  >
                    <p className="ant-upload-drag-icon">
                      <PlusOutlined />
                    </p>
                    <p className="ant-upload-text">Tải lên</p>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Thêm
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Layout>
  );
}
