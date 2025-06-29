import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, DatePicker, TimePicker, Form, message, Card, Row, Col, Typography, Tag, Modal } from "antd";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import axiosClient from "../../services/axiosClient";
import { getPersonalInfo } from "../../services/userApi";

const { Title, Text } = Typography;

export default function LandlordBookAppointmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduxUser = useSelector((state) => state.account.user);
  // Ưu tiên lấy user từ redux, fallback localStorage
  const user = reduxUser || JSON.parse(localStorage.getItem("account"));
  const room = location.state?.room || {};

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoginModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    async function fetchAndSetUserInfo() {
      if (!user) return;

      try {
        const info = await getPersonalInfo();
        console.log("[DEBUG] getPersonalInfo response:", info);

        // Ưu tiên thông tin chi tiết từ API
        const name = info.fullName || user.fullName || user.name || user.username || "";
        const email = info.email || user.email || "";
        const phone = info.phoneNumber || user.phone || user.phoneNumber || "";

        form.setFieldsValue({
          name,
          email,
          phone,
          date: dayjs(),           // preset hôm nay
          time: dayjs("08:00", "HH:mm") // preset 08:00
        });
        console.log("[DEBUG] Form values sau setFieldsValue:", form.getFieldsValue());
      } catch (e) {
        console.error("[DEBUG] getPersonalInfo error:", e);
        // fallback nếu lỗi API
        const name = user.fullName || user.name || user.username || "";
        const email = user.email || "";
        const phone = user.phone || user.phoneNumber || "";

        form.setFieldsValue({ name, email, phone });
      }
    }

    fetchAndSetUserInfo();
  }, [user, form]);

  const handleLoginConfirm = () => {
    setLoginModalOpen(false);
    navigate("/login");
  };

  const isUnavailable = room.status === "Booked" || room.status === "Unavailable";

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      console.log('[DEBUG] onFinish values:', values);
      console.log('[DEBUG] typeof date:', typeof values.date, values.date);
      console.log('[DEBUG] typeof time:', typeof values.time, values.time);
      // Gộp date và time thành 1 dayjs object
      const appointmentDate = values.date; // dayjs object
      const appointmentTime = values.time; // dayjs object
      let appointmentDateTime = null;
      if (appointmentDate && appointmentTime) {
        appointmentDateTime = appointmentDate
          .hour(appointmentTime.hour())
          .minute(appointmentTime.minute())
          .second(0)
          .millisecond(0);
      }
      console.log('[DEBUG] appointmentDateTime:', appointmentDateTime);
      await axiosClient.post("/schedules", {
        roomId: room.id,
        fullName: values.name,
        phone: values.phone,
        email: values.email,
        appointmentTime: appointmentDateTime ? appointmentDateTime.toISOString() : null,
        note: values.note,
      });
      message.success("Appointment booked successfully!");
      navigate(-1);
    } catch (err) {
      message.error("Failed to book appointment");
      console.error('[DEBUG] booking error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Modal
        open={loginModalOpen}
        onCancel={() => setLoginModalOpen(false)}
        onOk={handleLoginConfirm}
        okText="Login"
        cancelText="Cancel"
        closable={false}
        maskClosable={false}
        centered
      >
        <div style={{ textAlign: "center", fontSize: 16, fontWeight: 500 }}>
          You need to login to book an appointment.<br />
          Please login to continue.
        </div>
      </Modal>
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
                disabled={isUnavailable || !user}
              >
                <Form.Item label="Your Name" name="name" rules={[{ required: true, message: "Please enter your name" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: "Please enter your phone number" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}> <Input size="large" /> </Form.Item>
                <Form.Item label="Date" name="date" rules={[{ required: true, message: "Please select a date" }]}> <DatePicker size="large" style={{ width: "100%" }} disabledDate={d => d && d < dayjs().startOf('day')} /> </Form.Item>
                <Form.Item label="Time" name="time" rules={[{ required: true, message: "Please select a time" }]}> <TimePicker size="large" style={{ width: "100%" }} format="HH:mm" /> </Form.Item>
                <Form.Item label="Note" name="note"> <Input.TextArea rows={3} placeholder="Any note for landlord?" /> </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={submitting} disabled={isUnavailable || !user} style={{ marginTop: 8 }}>Confirm Appointment</Button>
                {isUnavailable && <div style={{ color: "red", marginTop: 12 }}>This room is not available for booking.</div>}
              </Form>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
} 