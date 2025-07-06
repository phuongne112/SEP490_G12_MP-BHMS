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
        if (!room) throw new Error("Không tìm thấy phòng");
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
        message.error("Tải dữ liệu phòng thất bại!");
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
      message.success("Cập nhật phòng thành công!");
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
        setFormError(res?.message || "Cập nhật phòng thất bại!");
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
        <PageHeader title="Chỉnh sửa phòng" />
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
          Quay lại danh sách phòng
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
                  label="Tòa"
                  rules={[{ required: true, message: "Vui lòng nhập tên tòa" }]}
                >
                  <Input placeholder="Ví dụ: A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="roomNumberSuffix"
                  label="Số phòng"
                  rules={[{ required: true, message: "Vui lòng nhập số phòng" }]}
                >
                  <Input placeholder="Ví dụ: 101" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="area"
                  label="Diện tích (m²)"
                  rules={[{ required: true, message: "Vui lòng nhập diện tích" }]}
                >
                  <InputNumber min={1} max={1000} style={{ width: "100%" }} placeholder="Nhập diện tích" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Giá (VND/tháng)"
                  rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="Nhập giá" />
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
                  <InputNumber min={1} max={10} style={{ width: "100%" }} placeholder="Nhập số phòng ngủ" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="numberOfBathrooms"
                  label="Số phòng tắm"
                  rules={[{ required: true, message: "Vui lòng nhập số phòng tắm" }]}
                >
                  <InputNumber min={1} max={10} style={{ width: "100%" }} placeholder="Nhập số phòng tắm" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="maxOccupants"
                  label="Số người tối đa"
                  rules={[{ required: true, message: "Vui lòng nhập số người tối đa" }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} placeholder="Nhập số người tối đa" />
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
                        <div style={{ marginTop: 8 }}>Tải lên</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Cập nhật phòng
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Layout>
  );
} 