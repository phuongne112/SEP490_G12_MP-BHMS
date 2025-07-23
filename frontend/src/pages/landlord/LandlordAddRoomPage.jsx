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
  Modal,
  Card,
} from "antd";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
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
      if (res && typeof res === "object" && res.message && res.roomId) {
        Modal.confirm({
          title: "Phòng đã bị xóa",
          content: res.message,
          okText: "Có, khôi phục",
          cancelText: "Không",
          onOk: async () => {
            try {
              await axiosClient.patch(`/rooms/${res.roomId}/restore`);
              message.success("Khôi phục phòng thành công!");
              if (
                user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
                user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
              ) {
                navigate("/admin/rooms");
              } else {
                navigate("/landlord/rooms");
              }
            } catch (e) {
              message.error("Khôi phục phòng thất bại!");
            }
          },
          onCancel: () => {
            message.info("Bạn đã hủy khôi phục phòng.");
          },
        });
      } else if (res && typeof res === "object") {
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
      <Layout>
        <Content
          style={{
            padding: "24px",
            paddingTop: "32px",
            background: "#fff",
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                if (
                  user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
                  user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
                ) {
                  navigate("/admin/rooms");
                } else {
                  navigate("/landlord/rooms");
                }
              }}
              style={{ marginBottom: 16 }}
            >
              Quay lại danh sách phòng
            </Button>
            <PageHeader title="Thêm phòng" />
          </div>
          
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: "flex", gap: 24, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center' }}>
                            <Card title="Thông tin phòng" style={{ flex: 1, minWidth: '500px', textAlign: 'left', minHeight: '450px' }}>
                <div style={{ padding: '8px 0' }}>
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
                      label="Tòa"
                      rules={[{ required: true, message: "Vui lòng nhập tên tòa" }]}
                    >
                      <Select placeholder="Chọn tòa">
                        <Option value="A">A</Option>
                        <Option value="B">B</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="roomNumberSuffix"
                      label="Số phòng"
                      rules={[
                        { required: true, message: "Vui lòng nhập số phòng (chỉ gồm số)" },
                        { pattern: /^\d+$/, message: "Số phòng chỉ được phép là số" }
                      ]}
                    >
                      <InputNumber placeholder="Ví dụ: 101" style={{ width: '100%' }} min={1} step={1} stringMode={false} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="area"
                      label="Diện tích (m²)"
                      rules={[{ required: true, message: "Vui lòng nhập diện tích" }]}
                    >
                      <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="price"
                      label="Giá (VND/tháng)"
                      rules={[{ required: true, message: "Vui lòng nhập giá" }]}
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
                      rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
                    >
                      <Select>
                        <Option value="Available">Còn trống</Option>
                        <Option value="Inactive">Ngừng hoạt động</Option>
                        <Option value="Occupied">Đã thuê</Option>
                        <Option value="Maintenance">Bảo trì</Option>
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
                                </Row>
                  </Form>
                </div>
              </Card>

            <Card title="Mô tả & Hình ảnh" style={{ flex: 1, minWidth: '400px', textAlign: 'left', minHeight: '450px' }}>
              <div style={{ padding: '8px 0' }}>
                <Form.Item name="description" label="Mô tả phòng">
                  <TextArea rows={3} placeholder="Nhập mô tả chi tiết về phòng..." />
                </Form.Item>
                
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Hình ảnh phòng (tối đa 8 ảnh):
                  </label>
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
                        <div style={{ marginTop: 8 }}>Tải lên</div>
                      </div>
                    )}
                  </Upload>
                </div>
              </div>
            </Card>
          </div>

          <Card style={{ marginTop: 24, textAlign: 'center' }}>
            <Button 
              type="primary" 
              loading={loading} 
              size="large"
              style={{ marginRight: 16 }}
              onClick={() => form.submit()}
            >
              Thêm phòng
            </Button>
            <Button 
              size="large"
              onClick={() => {
                if (
                  user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
                  user?.role?.roleName?.toUpperCase?.() === "SUBADMIN"
                ) {
                  navigate("/admin/rooms");
                } else {
                  navigate("/landlord/rooms");
                }
              }}
            >
              Hủy bỏ
            </Button>
          </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
