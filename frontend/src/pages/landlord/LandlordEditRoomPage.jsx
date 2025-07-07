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
  const [initialValues, setInitialValues] = useState(null);
  const [keepImageIds, setKeepImageIds] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await axiosClient.get(`/rooms/${id}`);
        const room = res.data;
        if (!room) throw new Error("Không tìm thấy phòng");

        const building = room.building || "";
        const roomNumberSuffix = room.roomNumber?.replace(building, "") || "";

        const initVals = {
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
        };
        setInitialValues(initVals);
        form.setFieldsValue(initVals);

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
  }, [id, form, navigate]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    // Chỉ giữ lại những ảnh cũ (có id) và không bị xóa (status !== 'removed')
    setKeepImageIds(newFileList.filter((f) => f.id && f.status !== 'removed').map((f) => f.id));
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
      // Luôn gửi keepImageIds, có thể là mảng rỗng nếu xóa hết ảnh
      formData.append("keepImageIds", JSON.stringify(keepImageIds || []));

      fileList.forEach((file) => {
        if (!file.id && file.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });

      await axiosClient.post(`/rooms/${id}`, formData);

      message.success("Cập nhật phòng thành công!");
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

        const fieldErrors = Object.entries(res).map(([field, msg]) => ({
          name: field,
          errors: [msg],
        }));
        form.setFields(fieldErrors);
      } else {
        message.error("Cập nhật phòng thất bại!");
      }
    }
    setLoading(false);
  };

  if (!initialValues) {
    return <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>;
  }

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
        <PageHeader title="Chỉnh sửa phòng" />
        <Button
          icon={<ArrowLeftOutlined />}
          style={{ marginBottom: 16 }}
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
          Quay lại danh sách phòng
        </Button>
        <Content style={{ padding: "24px" }}>
          <Form layout="vertical" form={form} onFinish={handleFinish}>
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
                  <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Giá (VND/tháng)"
                  rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
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
                    onRemove={(file) => {
                      // Logic xóa ảnh đã được xử lý trong handleUploadChange
                      // Không cần làm gì thêm ở đây
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
