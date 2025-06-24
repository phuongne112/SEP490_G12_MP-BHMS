import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, DatePicker, TimePicker, Form, message, Card, Row, Col, Typography, Tag } from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function LandlordBookAppointmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Giả sử truyền room info qua location.state
  const room = location.state?.room || {};
  // Giả sử có user info từ localStorage hoặc redux
  const user = JSON.parse(localStorage.getItem("account"));

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Nếu chưa đăng nhập, chuyển về login
  useEffect(() => {
    if (!user) {
      message.info("Please login to book an appointment.");
      navigate("/login");
    }
  }, [user, navigate]);

  // Nếu phòng đã booked hoặc unavailable thì không cho đặt
  const isUnavailable = room.status === "Booked" || room.status === "Unavailable";

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Gửi API đặt lịch hẹn ở đây
      // await bookAppointment({ ...values, roomId: room.id });
      message.success("Appointment booked successfully!");
      navigate(-1);
    } catch {
      message.error("Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ maxWidth: 950, width: '100%', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 0 }}>
        <Row gutter={[0, 0]} style={{ minHeight: 520 }}>
          {/* Info left */}
          <Col xs={24} md={11} style={{ background: '#f0f2f5', borderTopLeftRadius: 18, borderBottomLeftRadius: 18, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {room.images && room.images.length > 0 ? (
              <img src={room.images[0].imageUrl} alt="Room" style={{ width: 300, height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            ) : (
              <div style={{ width: 300, height: 200, background: '#e0e0e0', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No image</div>
            )}
            <Title level={4} style={{ marginBottom: 8 }}>{room.name || room.roomNumber}</Title>
            <Text><b>Area:</b> {room.area || "-"} m²</Text><br />
            <Text><b>Price:</b> {room.pricePerMonth ? room.pricePerMonth.toLocaleString() : room.price?.toLocaleString() || "-"} VND/month</Text><br />
            <Text><b>Amenities:</b> {room.amenities || room.description || "-"}</Text><br />
            <Text><b>Status:</b> <Tag color={room.status === "Available" ? "green" : room.status === "Booked" ? "red" : "default"}>{room.status || room.roomStatus || "-"}</Tag></Text>
          </Col>
          {/* Form right */}
          <Col xs={24} md={13} style={{ padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 370 }}>
              <Title level={4} style={{ marginBottom: 18 }}>Book Appointment</Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  name: user?.fullName || user?.name || "",
                  phone: user?.phone || "",
                  email: user?.email || "",
                }}
                disabled={isUnavailable}
              >
                <Form.Item label="Your Name" name="name" rules={[{ required: true, message: "Please enter your name" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: "Please enter your phone number" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Date" name="date" rules={[{ required: true, message: "Please select a date" }]}> <DatePicker size="large" style={{ width: "100%" }} disabledDate={d => d && d < dayjs().startOf('day')} /> </Form.Item>
                <Form.Item label="Time" name="time" rules={[{ required: true, message: "Please select a time" }]}> <TimePicker size="large" style={{ width: "100%" }} format="HH:mm" /> </Form.Item>
                <Form.Item label="Note" name="note"> <Input.TextArea rows={3} placeholder="Any note for landlord?" /> </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={submitting} disabled={isUnavailable} style={{ marginTop: 8 }}>Confirm Appointment</Button>
                {isUnavailable && <div style={{ color: "red", marginTop: 12 }}>This room is not available for booking.</div>}
              </Form>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
} 