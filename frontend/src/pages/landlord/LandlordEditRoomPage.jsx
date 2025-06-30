import React, { useEffect, useState } from "react";
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
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import axiosClient from "../../services/axiosClient";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

export default function LandlordEditRoomPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const [keepImageIds, setKeepImageIds] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    // Fetch room data by id
    const fetchRoom = async () => {
      try {
        const res = await axiosClient.get(`/rooms/${id}`);
        const room = res.data;
        if (!room) throw new Error("Room not found");
        // Parse building + suffix
        let building = room.building || "";
        let roomNumberSuffix = room.roomNumber?.replace(building, "") || "";
        setInitialValues({
          building,
          roomNumberSuffix,
          area: room.area,
          price: room.pricePerMonth,
          roomStatus: room.roomStatus,
          numberOfBedrooms: room.numberOfBedrooms,
          numberOfBathrooms: room.numberOfBathrooms,
          description: room.description,
          maxOccupants: room.maxOccupants,
          isActive: room.isActive,
        });
        form.setFieldsValue({
          building,
          roomNumberSuffix,
          area: room.area,
          price: room.pricePerMonth,
          roomStatus: room.roomStatus,
          numberOfBedrooms: room.numberOfBedrooms,
          numberOfBathrooms: room.numberOfBathrooms,
          description: room.description,
          maxOccupants: room.maxOccupants,
          isActive: room.isActive,
        });
        // Prepare fileList for Upload
        setFileList(
          (room.images || []).map((img) => ({
            uid: String(img.id),
            name: img.imageUrl.split("/").pop(),
            status: "done",
            url: img.imageUrl,
            id: img.id,
          }))
        );
        setKeepImageIds((room.images || []).map((img) => img.id));
      } catch (e) {
        message.error("Failed to load room data");
        navigate("/landlord/rooms");
      }
    };
    fetchRoom();
    // eslint-disable-next-line
  }, [id]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    // Keep only new files and those with id (old images)
    setFileList(newFileList);
    setKeepImageIds(newFileList.filter(f => f.id).map(f => f.id));
  };

  const handleFinish = async (values) => {
    setLoading(true);
    setFormError(null);
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
      if (keepImageIds.length > 0) {
        keepImageIds.forEach((id) => formData.append("keepImageIds", id));
      }
      fileList.forEach((file) => {
        if (!file.id && file.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });
      await axiosClient.post(`/rooms/${id}`, formData);
      message.success("Room updated successfully!");
      if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
        navigate("/admin/rooms");
      } else {
        navigate("/landlord/rooms");
      }
    } catch (err) {
      const res = err.response?.data;
      setFormError(null);
      if (res && typeof res === "object") {
        const fieldMap = {};
        const fieldErrors = Object.entries(res).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        setFormError(res?.message || "Failed to update room!");
      }
    }
    setLoading(false);
  };

  if (!initialValues) {
    return <div style={{ textAlign: "center", padding: 60 }}><span>Loading...</span></div>;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
          <AdminSidebar />
        ) : (
          <LandlordSidebar />
        )}
      </Sider>
      <Layout style={{ marginTop: 20, marginLeft: 15 }}>
        <PageHeader title="Edit Room" />
        <Button
          icon={<ArrowLeftOutlined />}
          style={{ marginBottom: 16 }}
          onClick={() => {
            if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
              navigate("/admin/rooms");
            } else {
              navigate("/landlord/rooms");
            }
          }}
        >
          Back to Room
        </Button>
        <Content style={{ padding: "24px" }}>
          {formError && (
            <div style={{ color: "red", marginBottom: 16 }}>{formError}</div>
          )}
          <Form
            layout="vertical"
            form={form}
            onFinish={handleFinish}
            initialValues={initialValues}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="building"
                  label="Building"
                  rules={[{ required: true, message: "Please enter building name" }]}
                >
                  <Input placeholder="e.g. A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomNumberSuffix"
                  label="Room Number (Suffix)"
                  rules={[{ required: true, message: "Please enter room number (suffix)" }]}
                >
                  <Input placeholder="e.g. 101" />
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
                    onRemove={file => {
                      setKeepImageIds(prev => prev.filter(id => id !== file.id));
                    }}
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
                Update Room
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Layout>
  );
} 