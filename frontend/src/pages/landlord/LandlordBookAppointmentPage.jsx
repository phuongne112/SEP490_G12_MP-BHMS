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
import UserInfoModal from "../../components/account/UserInfoModal";
import UpdateUserInfoPage from "../../components/account/UpdateUserInfoPage";

const { Title, Text } = Typography;

// Thêm hàm getImageUrl giống RoomDetailPage.jsx
const isDev = import.meta.env.DEV;
const BACKEND_URL = isDev
  ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:8080")
  : (typeof window !== "undefined" ? window.location.origin : "");
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
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [checkingPersonalInfo, setCheckingPersonalInfo] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showUpdateInfoModal, setShowUpdateInfoModal] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  // Thêm hàm kiểm tra thông tin cá nhân
  const checkPersonalInfo = async () => {
    if (!user) return false;
    
    setCheckingPersonalInfo(true);
    try {
      const personalInfo = await getPersonalInfo();
      // Kiểm tra các trường bắt buộc
      const hasRequiredInfo = personalInfo && 
        personalInfo.fullName && 
        personalInfo.phoneNumber && 
        personalInfo.phoneNumber2 && 
        personalInfo.gender && 
        personalInfo.birthDate && 
        personalInfo.birthPlace && 
        personalInfo.nationalID && 
        personalInfo.nationalIDIssuePlace && 
        personalInfo.permanentAddress;
      
      return !!hasRequiredInfo;
    } catch (error) {
      // Nếu không có thông tin cá nhân hoặc lỗi, trả về false
      return false;
    } finally {
      setCheckingPersonalInfo(false);
    }
  };

  useEffect(() => {
    if (!user && !isPopup) {
      setLoginModalOpen(true);
      return;
    }
    if (!user) return;

    // Kiểm tra thông tin cá nhân khi component mount
    const checkInfo = async () => {
      const hasPersonalInfo = await checkPersonalInfo();
      if (!hasPersonalInfo) {
        setPersonalInfoModalOpen(true);
        return;
      }

      // Nếu có thông tin cá nhân, tiếp tục load form
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
    };

    checkInfo();
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
      const errorMessage = err.response?.data?.message || err.message || "Đặt lịch hẹn thất bại";
      message.error(errorMessage);
      console.error("[DEBUG] booking error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Nếu là popup chỉ render Card nội dung, không bọc div minHeight 100vh...
  if (isPopup) {
    return (
      <>
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
              {room.images && room.images.length > 0 ? (
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
                <b>Diện tích:</b> {room.area || "-"} m²
              </Text>
              <br />
              <Text>
                <b>Giá:</b> {room.pricePerMonth ? room.pricePerMonth.toLocaleString() : room.price?.toLocaleString() || "-"} VND/tháng
              </Text>
              <br />
              <Text>
                <b>Số phòng ngủ:</b> {room.numberOfBedrooms || "-"}
              </Text>
              <br />
              <Text>
                <b>Số phòng tắm:</b> {room.numberOfBathrooms || "-"}
              </Text>
              <br />
              <Text>
                <b>Trạng thái:</b>{" "}
                <Tag
                  color={(() => {
                    const status = room.roomStatus || room.status;
                    if (status === "Available") return "green";
                    if (status === "Occupied") return "red";
                    if (status === "Maintenance") return "orange";
                    if (status === "Inactive") return "default";
                    return "default";
                  })()}
                  style={{ fontWeight: 600, fontSize: 15 }}
                >
                  {(() => {
                    const status = room.roomStatus || room.status;
                    if (status === "Available") return "Còn trống";
                    if (status === "Occupied") return "Đã thuê";
                    if (status === "Maintenance") return "Bảo trì";
                    if (status === "Inactive") return "Không hoạt động";
                    return "Không xác định";
                  })()}
                </Tag>
              </Text>
              <br />
              <Text>
                <b>Mô tả:</b> {room.description || "—"}
              </Text>
              <br />
              <Text>
                <b>Hoạt động:</b> {room.isActive ? "Có" : "Không"}
              </Text>
              <br />
              <Text>
                <b>Chủ nhà:</b> {room.landlordName || "Không có"} | {room.landlordPhone || "Không có số điện thoại"}
              </Text>
              <br />
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
                    <Input size="large" placeholder="Nhập họ và tên" />
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
                    <Input size="large" placeholder="Nhập số điện thoại" />
                  </Form.Item>

                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Vui lòng nhập email hợp lệ",
                      },
                    ]}
                  >
                    <Input size="large" placeholder="Nhập email" />
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
                      disabledTime={() => ({
                        disabledHours: () => [...Array(8).keys(), ...Array(4).keys().map(i => i + 20)], // Disable 0-7 and 20-23
                      })}
                    />
                  </Form.Item>

                  <div style={{ 
                    background: "#f6ffed", 
                    border: "1px solid #b7eb8f", 
                    borderRadius: 6, 
                    padding: 12, 
                    marginBottom: 16,
                    fontSize: 13
                  }}>
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>📋 Lưu ý khi đặt lịch:</div>
                    <div>• Có thể cùng xem phòng với người khác (tối đa 4 người cùng lúc)</div>
                    <div>• Không thể đặt lịch trùng thời gian với lịch hẹn khác của bạn</div>
                    <div>• Tối đa 3 lịch hẹn tổng cộng cho mỗi người dùng</div>
                    <div>• Các lịch hẹn phải cách nhau ít nhất 30 phút</div>
                    <div>• Chỉ có thể đặt lịch từ 8:00 sáng đến 20:00 tối</div>
                  </div>

                  <Form.Item label="Ghi chú" name="note">
                    <Input.TextArea
                      rows={3}
                      placeholder="Ghi chú cho chủ nhà (nếu có)" />
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
                      Phòng này hiện không khả dụng để đặt lịch.
                    </div>
                  )}
                </Form>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Modal yêu cầu điền thông tin cá nhân */}
        <Modal
          open={personalInfoModalOpen}
          onCancel={() => setPersonalInfoModalOpen(false)}
          footer={null}
          centered
          closable={false}
          maskClosable={false}
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <Title level={4} style={{ fontWeight: 500 }}>Cần điền thông tin cá nhân</Title>
            <Text type="secondary" style={{ fontWeight: 400, display: "block", marginBottom: 24 }}>
              Để đặt lịch xem phòng, bạn cần điền đầy đủ thông tin cá nhân trước.
            </Text>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button 
                onClick={() => {
                  setPersonalInfoModalOpen(false);
                  onCancel?.();
                }}
                size="large"
              >
                Hủy
              </Button>
              <Button 
                type="primary" 
                size="large"
                onClick={() => {
                  setPersonalInfoModalOpen(false);
                  setIsCreate(true);
                  setShowUpdateInfoModal(true);
                }}
              >
                Điền thông tin ngay
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modals cho thông tin cá nhân */}
        <UserInfoModal
          open={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          onShowUpdateModal={(create = false, ocrData = null) => {
            setIsInfoModalOpen(false);
            setIsCreate(create);
            setShowUpdateInfoModal(true);
            setOcrData(ocrData);
          }}
        />
        <UpdateUserInfoPage
          open={showUpdateInfoModal}
          isCreate={isCreate}
          onClose={() => setShowUpdateInfoModal(false)}
          onBackToInfoModal={() => setIsInfoModalOpen(true)}
          ocrData={ocrData}
        />
      </>
    );
  }

  // Nếu không phải popup, render layout cũ
  return (
    <>
      <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
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
                  {room.images && room.images.length > 0 ? (
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
                    <b>Tiện nghi:</b> {room.amenities || room.description || "-"}
                  </Text>
                  <br />
                  <Text>
                    <b>Trạng thái:</b>{" "}
                    <Tag
                      color={
                        (() => {
                          const status = room.roomStatus || room.status;
                          if (status === "Available") return "green";
                          if (status === "Occupied") return "red";
                          if (status === "Maintenance") return "orange";
                          if (status === "Inactive") return "default";
                          return "default";
                        })()
                      }
                      style={{ fontWeight: 600, fontSize: 15 }}
                    >
                      {(() => {
                        const status = room.roomStatus || room.status;
                        if (status === "Available") return "Còn trống";
                        if (status === "Occupied") return "Đã thuê";
                        if (status === "Maintenance") return "Bảo trì";
                        if (status === "Inactive") return "Không hoạt động";
                        return "Không xác định";
                      })()}
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
                        <Input size="large" placeholder="Nhập họ và tên" />
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
                        <Input size="large" placeholder="Nhập số điện thoại" />
                      </Form.Item>

                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          {
                            required: true,
                            type: "email",
                            message: "Vui lòng nhập email hợp lệ",
                          },
                        ]}
                      >
                        <Input size="large" placeholder="Nhập email" />
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
                          disabledTime={() => ({
                            disabledHours: () => [...Array(8).keys(), ...Array(4).keys().map(i => i + 20)], // Disable 0-7 and 20-23
                          })}
                        />
                      </Form.Item>

                      <div style={{ 
                        background: "#f6ffed", 
                        border: "1px solid #b7eb8f", 
                        borderRadius: 6, 
                        padding: 12, 
                        marginBottom: 16,
                        fontSize: 13
                      }}>
                        <div style={{ fontWeight: "bold", marginBottom: 4 }}>📋 Lưu ý khi đặt lịch:</div>
                        <div>• Có thể cùng xem phòng với người khác (tối đa 4 người cùng lúc)</div>
                        <div>• Không thể đặt lịch trùng thời gian với lịch hẹn khác của bạn</div>
                        <div>• Tối đa 3 lịch hẹn tổng cộng cho mỗi người dùng</div>
                        <div>• Các lịch hẹn phải cách nhau ít nhất 30 phút</div>
                        <div>• Chỉ có thể đặt lịch từ 8:00 sáng đến 20:00 tối</div>
                      </div>

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
                          Phòng này hiện không khả dụng để đặt lịch.
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

      {/* Modal yêu cầu điền thông tin cá nhân */}
      <Modal
        open={personalInfoModalOpen}
        onCancel={() => setPersonalInfoModalOpen(false)}
        footer={null}
        centered
        closable={false}
        maskClosable={false}
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <Title level={4} style={{ fontWeight: 500 }}>Cần điền thông tin cá nhân</Title>
          <Text type="secondary" style={{ fontWeight: 400, display: "block", marginBottom: 24 }}>
            Để đặt lịch xem phòng, bạn cần điền đầy đủ thông tin cá nhân trước.
          </Text>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button 
              onClick={() => {
                setPersonalInfoModalOpen(false);
                navigate(-1);
              }}
              size="large"
            >
              Hủy
            </Button>
            <Button 
              type="primary" 
              size="large"
              onClick={() => {
                setPersonalInfoModalOpen(false);
                setIsCreate(true);
                setShowUpdateInfoModal(true);
              }}
            >
              Điền thông tin ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modals cho thông tin cá nhân */}
      <UserInfoModal
        open={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onShowUpdateModal={(create = false, ocrData = null) => {
          setIsInfoModalOpen(false);
          setIsCreate(create);
          setShowUpdateInfoModal(true);
          setOcrData(ocrData);
        }}
      />
      <UpdateUserInfoPage
        open={showUpdateInfoModal}
        isCreate={isCreate}
        onClose={() => setShowUpdateInfoModal(false)}
        onBackToInfoModal={() => setIsInfoModalOpen(true)}
        ocrData={ocrData}
      />
    </>
  );
}
