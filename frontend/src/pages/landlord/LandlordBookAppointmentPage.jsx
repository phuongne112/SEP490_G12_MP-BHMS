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

const { Title, Text } = Typography;

export default function LandlordBookAppointmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduxUser = useSelector((state) => state.account.user);
  const user = reduxUser || JSON.parse(localStorage.getItem("account"));
  const room = location.state?.room || {};

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

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
  }, [user, form]);

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

      message.success("Appointment booked successfully!");
      navigate(-1);
    } catch (err) {
      message.error("Failed to book appointment");
      console.error("[DEBUG] booking error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column"
      }}
    >
      <Button
        onClick={() => navigate(-1)}
        style={{
          alignSelf: "flex-start",
          margin: "24px 0 0 32px",
          fontWeight: 600,
          fontSize: 18,
          background: "#fff",
          border: "1.5px solid #e0e0e0",
          borderRadius: 12,
          color: "#1677ff",
          boxShadow: "0 2px 8px rgba(24,144,255,0.07)",
          padding: "6px 22px 6px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
        icon={<ArrowLeftOutlined style={{ fontSize: 20, marginRight: 4 }} />}
        type="default"
      >
        Quay lại
      </Button>
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
          You need to login to book an appointment.
          <br />
          Please login to continue.
        </div>
      </Modal>

      <Card
        style={{
          maxWidth: 950,
          width: "100%",
          borderRadius: 18,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          padding: 0,
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
            {room.images && room.images.length > 0 ? (
              <img
                src={room.images[0].imageUrl}
                alt="Room"
                style={{
                  width: 300,
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 18,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
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
                No image
              </div>
            )}
            <Title level={4} style={{ marginBottom: 8 }}>
              {room.name || room.roomNumber}
            </Title>
            <Text>
              <b>Area:</b> {room.area || "-"} m²
            </Text>
            <br />
            <Text>
              <b>Price:</b>{" "}
              {room.pricePerMonth
                ? room.pricePerMonth.toLocaleString()
                : room.price?.toLocaleString() || "-"}{" "}
              VND/month
            </Text>
            <br />
            <Text>
              <b>Amenities:</b> {room.amenities || room.description || "-"}
            </Text>
            <br />
            <Text>
              <b>Status:</b>{" "}
              <Tag
                color={
                  room.status === "Available"
                    ? "green"
                    : room.status === "Booked"
                    ? "red"
                    : "default"
                }
              >
                {room.status || room.roomStatus || "-"}
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
                  label="Your Name"
                  name="name"
                  rules={[
                    { required: true, message: "Please enter your name" },
                  ]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  label="Phone Number"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message: "Please enter your phone number",
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
                      message: "Please enter a valid email",
                    },
                  ]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  label="Ngày"
                  name="date"
                  rules={[{ required: true, message: "Please select a date" }]}
                >
                  <DatePicker
                    size="large"
                    style={{ width: "100%" }}
                    disabledDate={(d) => d && d < dayjs().startOf("day")}
                  />
                </Form.Item>

                <Form.Item
                  label="Giờ"
                  name="time"
                  rules={[{ required: true, message: "Please select a time" }]}
                >
                  <TimePicker
                    size="large"
                    style={{ width: "100%" }}
                    format="HH:mm"
                  />
                </Form.Item>

                <Form.Item label="Ghi chú" name="note">
                  <Input.TextArea
                    rows={3}
                    placeholder="Any note for landlord?"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitting}
                  disabled={isUnavailable || !user}
                  style={{ marginTop: 8 }}
                >
                  Đặt lịch
                </Button>

                {isUnavailable && (
                  <div style={{ color: "red", marginTop: 12 }}>
                    This room is not available for booking.
                  </div>
                )}
              </Form>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
