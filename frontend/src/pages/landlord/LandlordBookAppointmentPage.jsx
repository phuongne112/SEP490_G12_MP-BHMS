import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  DatePicker,
  TimePicker,
  Form,
  message,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Modal,
} from "antd";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import axiosClient from "../../services/axiosClient";
import { getPersonalInfo } from "../../services/userApi";
import { ArrowLeftOutlined } from "@ant-design/icons";
import image1 from '../../assets/RoomImage/image1.png';

const { Title, Text } = Typography;

export default function LandlordBookAppointmentPage(props) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduxUser = useSelector((state) => state.account.user);
  // Ưu tiên props.room, props.user nếu có
  const user = props.user || reduxUser || JSON.parse(localStorage.getItem("account"));
  const room = props.room || location.state?.room || {};
  const isPopup = !!props.isPopup;
  const onCancel = props.onCancel;
  const onSuccess = props.onSuccess;

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!user && !isPopup) {
      setLoginModalOpen(true);
      return;
    }
    if (!user) return;
    const email = user.email || "";
    getPersonalInfo()
      .then((info) => {
        const name = info.fullName || info.name || "";
        const phone = info.phone || info.phoneNumber || "";
        form.setFields([
          { name: "name", value: name },
          { name: "phone", value: phone },
          { name: "email", value: email },
        ]);
      })
      .catch(() => {
        form.setFields([
          { name: "name", value: "" },
          { name: "phone", value: "" },
          { name: "email", value: user.email || "" },
        ]);
      });
  }, [user, form, isPopup]);

  const handleLoginConfirm = () => {
    setLoginModalOpen(false);
    navigate("/login");
  };

  const isUnavailable =
    room.status === "Booked" || room.status === "Unavailable";

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const appointmentDate = values.date;
      const appointmentTime = values.time;
      let appointmentDateTime = null;

      if (appointmentDate && appointmentTime) {
        appointmentDateTime = appointmentDate
          .hour(appointmentTime.hour())
          .minute(appointmentTime.minute())
          .second(0)
          .millisecond(0);
      }

      await axiosClient.post("/schedules", {
        roomId: room.id,
        fullName: values.name,
        phone: values.phone,
        email: values.email,
        appointmentTime: appointmentDateTime
          ? appointmentDateTime.toISOString()
          : null,
        note: values.note,
      });

      message.success("Đặt lịch hẹn thành công!");
      if (onSuccess) onSuccess();
      else navigate(-1);
    } catch (err) {
      message.error("Đặt lịch hẹn thất bại!");
      console.error("[DEBUG] booking error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === "string") {
      if (img.startsWith("http")) return img;
      if (img.startsWith("/uploads/")) return BACKEND_URL + img;
      return BACKEND_URL + "/uploads/" + img;
    }
    if (typeof img === "object" && img.imageUrl) {
      if (img.imageUrl.startsWith("http")) return img.imageUrl;
      if (img.imageUrl.startsWith("/uploads/")) return BACKEND_URL + img.imageUrl;
      return BACKEND_URL + "/uploads/" + img.imageUrl;
    }
    return null;
  };

  // Nếu là popup chỉ render Card nội dung, không bọc div minHeight 100vh...
  if (isPopup) {
  return (
      <Card
        style={{
          maxWidth: 950,
          width: '100%',
          borderRadius: 18,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: 0,
          margin: '0 auto',
          marginTop: 0
        }}
      >
        <Row gutter={[0, 0]} style={{ minHeight: 520 }}>
          <Col
            xs={24}
            md={11}
            style={{
              background: "#f0f2f5",
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Hiển thị ảnh phòng */}
            {room.images && Array.isArray(room.images) && room.images.length > 0 && getImageUrl(room.images[0]) ? (
              <img
                src={getImageUrl(room.images[0])}
                alt="Room"
                style={{
                  width: 300,
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 18,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                onError={e => { e.target.onerror = null; e.target.src = image1; }}
              />
            ) : room.image ? (
              <img
                src={getImageUrl(room.image)}
                alt="Room"
                style={{
                  width: 300,
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 18,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                onError={e => { e.target.onerror = null; e.target.src = image1; }}
              />
            ) : room.imageUrl ? (
              <img
                src={getImageUrl(room.imageUrl)}
                alt="Room"
                style={{
                  width: 300,
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 18,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                onError={e => { e.target.onerror = null; e.target.src = image1; }}
              />
            ) : (
              <div
                style={{
                  width: 300,
                  height: 200,
                  background: "#e0e0e0",
                  borderRadius: 12,
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#888",
                }}
              >
                Không có ảnh
              </div>
            )}
            <Title level={4} style={{ marginBottom: 8 }}>
              {room.name || room.roomNumber}
            </Title>
            <Text>
              <b>Diện tích:</b> {room.area || "-"} m²
            </Text>
            <br />
            <Text>
              <b>Giá:</b>{" "}
              {room.pricePerMonth
                ? room.pricePerMonth.toLocaleString()
                : room.price?.toLocaleString() || "-"}{" "}
              VND/tháng
            </Text>
            <br />
            <Text>
              <b>Tiện ích:</b> {room.amenities || room.description || "-"}
            </Text>
            <br />
            <Text>
              <b>Trạng thái:</b>{" "}
              <Tag
                color={
                  ((room.roomStatus || room.status || "").toUpperCase()) === "AVAILABLE"
                    ? "green"
                    : ["OCCUPIED", "BOOKED", "FULL"].includes((room.roomStatus || room.status || "").toUpperCase())
                    ? "red"
                    : ["UNAVAILABLE", "INACTIVE", "MAINTENANCE"].includes((room.roomStatus || room.status || "").toUpperCase())
                    ? "default"
                    : "default"
                }
              >
                {getRoomStatusVN(room.roomStatus || room.status)}
              </Tag>
            </Text>
          </Col>

          <Col
            xs={24}
            md={13}
            style={{
              padding: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "100%", maxWidth: 370 }}>
              <Title level={4} style={{ marginBottom: 18 }}>
                Đặt lịch hẹn
              </Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={isUnavailable || !user}
              >
                <Form.Item
                  label="Họ và tên"
                  name="name"
                  rules={[
                    { required: true, message: "Vui lòng nhập họ và tên" },
                  ]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  label="Số điện thoại"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập số điện thoại",
                    },
                  ]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    {
                      required: true,
                      type: "email",
                      message: "Vui lòng nhập đúng định dạng email",
                    },
                  ]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  label="Ngày"
                  name="date"
                  rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
                >
                  <DatePicker
                    size="large"
                    style={{ width: "100%" }}
                    disabledDate={(d) => d && d < dayjs().startOf("day")}
                    placeholder="Chọn ngày"
                  />
                </Form.Item>

                <Form.Item
                  label="Giờ"
                  name="time"
                  rules={[{ required: true, message: "Vui lòng chọn giờ" }]}
                >
                  <TimePicker
                    size="large"
                    style={{ width: "100%" }}
                    format="HH:mm"
                    placeholder="Chọn giờ"
                  />
                </Form.Item>

                <Form.Item label="Ghi chú" name="note">
                  <Input.TextArea
                    rows={3}
                    placeholder="Ghi chú cho chủ nhà (nếu có)"
                  />
                </Form.Item>

                <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={submitting}
                  disabled={isUnavailable || !user}
                    style={{ marginTop: 8, marginRight: 8, width: 140, display: 'inline-block' }}
                >
                  Đặt lịch
                </Button>
                  <Button
                    onClick={onCancel}
                    size="large"
                    style={{ width: 140, display: 'inline-block' }}
                  >
                    Hủy
                  </Button>
                </Form.Item>

                {isUnavailable && (
                  <div style={{ color: "red", marginTop: 12 }}>
                    Phòng này hiện không thể đặt lịch hẹn.
                  </div>
                )}
              </Form>
            </div>
          </Col>
        </Row>
      </Card>
    );
  }

  // Nếu không phải popup, render layout cũ
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, width: '100%', background: '#f5f6fa' }}>
        <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', position: 'relative', marginTop: 0 }}>
          <Card
            style={{
              maxWidth: 950,
              width: '100%',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              padding: 0,
              margin: '0 auto',
              marginTop: 32
            }}
          >
            <Row gutter={[0, 0]} style={{ minHeight: 520 }}>
              <Col
                xs={24}
                md={11}
                style={{
                  background: "#f0f2f5",
                  borderTopLeftRadius: 18,
                  borderBottomLeftRadius: 18,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {room.images && Array.isArray(room.images) && room.images.length > 0 && getImageUrl(room.images[0]) ? (
                  <img
                    src={getImageUrl(room.images[0])}
                    alt="Room"
                    style={{
                      width: 300,
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 12,
                      marginBottom: 18,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                    onError={e => { e.target.onerror = null; e.target.src = image1; }}
                  />
                ) : room.image ? (
                  <img
                    src={getImageUrl(room.image)}
                    alt="Room"
                    style={{
                      width: 300,
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 12,
                      marginBottom: 18,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                    onError={e => { e.target.onerror = null; e.target.src = image1; }}
                  />
                ) : room.imageUrl ? (
                  <img
                    src={getImageUrl(room.imageUrl)}
                    alt="Room"
                    style={{
                      width: 300,
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 12,
                      marginBottom: 18,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                    onError={e => { e.target.onerror = null; e.target.src = image1; }}
                  />
                ) : (
                  <div
                    style={{
                      width: 300,
                      height: 200,
                      background: "#e0e0e0",
                      borderRadius: 12,
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#888",
                    }}
                  >
                    Không có ảnh
                  </div>
                )}
                <Title level={4} style={{ marginBottom: 8 }}>
                  {room.name || room.roomNumber}
                </Title>
                <Text>
                  <b>Diện tích:</b> {room.area || "-"} m²
                </Text>
                <br />
                <Text>
                  <b>Giá:</b>{" "}
                  {room.pricePerMonth
                    ? room.pricePerMonth.toLocaleString()
                    : room.price?.toLocaleString() || "-"}{" "}
                  VND/tháng
                </Text>
                <br />
                <Text>
                  <b>Tiện ích:</b> {room.amenities || room.description || "-"}
                </Text>
                <br />
                <Text>
                  <b>Trạng thái:</b>{" "}
                  <Tag
                    color={
                      ((room.roomStatus || room.status || "").toUpperCase()) === "AVAILABLE"
                        ? "green"
                        : ["OCCUPIED", "BOOKED", "FULL"].includes((room.roomStatus || room.status || "").toUpperCase())
                        ? "red"
                        : ["UNAVAILABLE", "INACTIVE", "MAINTENANCE"].includes((room.roomStatus || room.status || "").toUpperCase())
                        ? "default"
                        : "default"
                    }
                  >
                    {getRoomStatusVN(room.roomStatus || room.status)}
                  </Tag>
                </Text>
              </Col>

              <Col
                xs={24}
                md={13}
                style={{
                  padding: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: "100%", maxWidth: 370 }}>
                  <Title level={4} style={{ marginBottom: 18 }}>
                    Đặt lịch hẹn
                  </Title>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    disabled={isUnavailable || !user}
                  >
                    <Form.Item
                      label="Họ và tên"
                      name="name"
                      rules={[
                        { required: true, message: "Vui lòng nhập họ và tên" },
                      ]}
                    >
                      <Input size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Số điện thoại"
                      name="phone"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập số điện thoại",
                        },
                      ]}
                    >
                      <Input size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        {
                          required: true,
                          type: "email",
                          message: "Vui lòng nhập đúng định dạng email",
                        },
                      ]}
                    >
                      <Input size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Ngày"
                      name="date"
                      rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
                    >
                      <DatePicker
                        size="large"
                        style={{ width: "100%" }}
                        disabledDate={(d) => d && d < dayjs().startOf("day")}
                        placeholder="Chọn ngày"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Giờ"
                      name="time"
                      rules={[{ required: true, message: "Vui lòng chọn giờ" }]}
                    >
                      <TimePicker
                        size="large"
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="Chọn giờ"
                      />
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="note">
                      <Input.TextArea
                        rows={3}
                        placeholder="Ghi chú cho chủ nhà (nếu có)"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block={!isPopup}
                        size="large"
                        loading={submitting}
                        disabled={isUnavailable || !user}
                        style={{ marginTop: 8, marginRight: isPopup ? 8 : 0, width: isPopup ? 140 : undefined, display: isPopup ? 'inline-block' : undefined }}
                      >
                        Đặt lịch
                      </Button>
                      {isPopup && (
                        <Button
                          onClick={onCancel}
                          size="large"
                          style={{ width: 140, display: 'inline-block' }}
                        >
                          Hủy
                        </Button>
                      )}
                    </Form.Item>

                    {isUnavailable && (
                      <div style={{ color: "red", marginTop: 12 }}>
                        Phòng này hiện không thể đặt lịch hẹn.
                      </div>
                    )}
                  </Form>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
        <Modal
          open={loginModalOpen}
          onCancel={() => setLoginModalOpen(false)}
          onOk={handleLoginConfirm}
          okText="Đăng nhập"
          cancelText="Hủy"
          closable={false}
          maskClosable={false}
          centered
        >
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 500 }}>
            Bạn cần đăng nhập để đặt lịch hẹn.
            <br />
            Vui lòng đăng nhập để tiếp tục.
          </div>
        </Modal>
      </div>
    </div>
  );
}

// Mapping trạng thái phòng sang tiếng Việt
const getRoomStatusVN = (status) => {
  switch ((status || "").toUpperCase()) {
    case "AVAILABLE":
      return "Còn trống";
    case "OCCUPIED":
      return "Đã thuê";
    case "BOOKED":
      return "Đã đặt trước";
    case "UNAVAILABLE":
      return "Không khả dụng";
    case "INACTIVE":
      return "Ngừng hoạt động";
    case "MAINTENANCE":
      return "Bảo trì";
    case "FULL":
      return "Đã đầy";
    default:
      return "Không xác định";
  }
};
