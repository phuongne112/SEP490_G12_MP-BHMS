import React, { useState, useEffect } from "react";
import { Layout, Form, Button, Select, DatePicker, InputNumber, message, Card, Space, Typography } from "antd";
import { ArrowLeftOutlined, UserAddOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { getAllRooms, getRoomById } from "../../services/roomService";
import { getRentersForAssign } from "../../services/renterApi";
import axiosClient from "../../services/axiosClient";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import dayjs from "dayjs";

const { Sider, Content } = Layout;
const { Option } = Select;
const { Text } = Typography;

export default function LandlordAssignRenterPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);
  const user = useSelector((state) => state.account.user);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [cycle, setCycle] = useState("MONTHLY");
  const [isCustomEndDate, setIsCustomEndDate] = useState(false);
  const [customEndDate, setCustomEndDate] = useState(null);

  const paymentCycleOptions = [
    { value: 'MONTHLY', label: 'Hàng tháng' },
    { value: 'QUARTERLY', label: 'Quý' },
    { value: 'YEARLY', label: 'Năm' },
  ];

  const getValidEndDates = (start, cycle) => {
    if (!start) return [];
    let months = 1;
    if (cycle === 'MONTHLY') months = 1;
    if (cycle === 'QUARTERLY') months = 3;
    if (cycle === 'YEARLY') months = 12;
    return Array.from({ length: 24 }, (_, i) => dayjs(start).add(months * (i + 1), 'month'));
  };

  useEffect(() => {
    fetchRoomDetails();
    fetchRenters();
    if (startDate && cycle) {
      let months = 1;
      if (cycle === 'MONTHLY') months = 1;
      if (cycle === 'QUARTERLY') months = 3;
      if (cycle === 'YEARLY') months = 12;
      const date = dayjs(startDate).add(months, 'month');
      setEndDate(date);
      form.setFieldsValue({ contractEndDate: date.toISOString() });
    } else {
      setEndDate(null);
      form.setFieldsValue({ contractEndDate: null });
    }
    // eslint-disable-next-line
  }, [roomId, startDate, cycle]);

  const fetchRoomDetails = async () => {
    try {
      const res = await getRoomById(roomId);
      console.log("Chi tiết phòng:", res); // Log dữ liệu phòng để debug
      setRoom(res);
    } catch (err) {
      message.error("Không thể tải chi tiết phòng");
    } finally {
      setRoomLoading(false);
    }
  };

  const fetchRenters = async (keyword = "") => {
    try {
      const res = await getRentersForAssign(keyword);
      setRenters(res.data || []);
    } catch (err) {
      message.error("Không thể tải danh sách người thuê");
    }
  };

  const onFinish = async (values) => {
    // Validate ngày bắt đầu/kết thúc phải ở tương lai
    if (dayjs(values.contractStartDate).isBefore(dayjs(), 'day')) {
      message.error("Ngày bắt đầu phải ở tương lai!");
      return;
    }
    let end = isCustomEndDate ? customEndDate : endDate;
    if (!end) {
      message.error("Vui lòng chọn ngày kết thúc hợp lệ!");
      return;
    }
    if (end.isBefore(dayjs(values.contractStartDate), 'day')) {
      message.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }
    // Validate đúng chu kỳ
    const diffMonth = end.diff(dayjs(values.contractStartDate), 'month');
    let valid = false;
    let errorMsg = '';
    if (cycle === 'MONTHLY') {
      valid = diffMonth > 0 && diffMonth % 1 === 0;
      if (!valid) errorMsg = 'Thời gian hợp đồng phải là bội số của 1 tháng cho chu kỳ thanh toán hàng tháng.';
    }
    if (cycle === 'QUARTERLY') {
      valid = diffMonth > 0 && diffMonth % 3 === 0;
      if (!valid) errorMsg = 'Thời gian hợp đồng phải là bội số của 3 tháng cho chu kỳ thanh toán hàng quý.';
    }
    if (cycle === 'YEARLY') {
      valid = diffMonth > 0 && diffMonth % 12 === 0;
      if (!valid) errorMsg = 'Thời gian hợp đồng phải là bội số của 12 tháng cho chu kỳ thanh toán hàng năm.';
    }
    if (!valid) {
      message.error(errorMsg);
      return;
    }
    setLoading(true);
    try {
      const requestData = {
        roomId: parseInt(roomId),
        userIds: values.renterEmails.map(email => {
          const renter = renters.find(r => r.email === email);
          return renter.id;
        }),
        contractStartDate: values.contractStartDate.toISOString(),
        contractEndDate: dayjs(values.contractEndDate).toISOString(),
        depositAmount: values.depositAmount,
        paymentCycle: values.paymentCycle
      };
      await axiosClient.post("/room-users/add-many", requestData);
      message.success("Đã gán người thuê vào phòng thành công!");
      navigate("/landlord/rooms");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || "Gán người thuê vào phòng thất bại";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (roomLoading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={220}>
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
            <AdminSidebar />
          ) : (
            <LandlordSidebar />
          )}
        </Sider>
        <Layout>
          <Content style={{ padding: "24px", textAlign: "center" }}>
            Loading...
          </Content>
        </Layout>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={220}>
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
            <AdminSidebar />
          ) : (
            <LandlordSidebar />
          )}
        </Sider>
        <Layout>
          <Content style={{ padding: "24px", textAlign: "center" }}>
            Room not found
          </Content>
        </Layout>
      </Layout>
    );
  }

  // Nếu phòng đang bảo trì hoặc ngừng hoạt động, không cho gán người thuê
  const isRoomInactive = room.roomStatus === 'Maintenance' || room.roomStatus === 'Inactive';

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
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
                if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
                  navigate("/admin/rooms");
                } else {
                  navigate("/landlord/rooms");
                }
              }}
              style={{ marginBottom: 16 }}
            >
              Quay lại danh sách phòng
            </Button>
            <PageHeader title="Gán người thuê" />
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <Card title="Thông tin phòng" style={{ flex: 1 }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div>
                  <Text strong>Số phòng:</Text> {room.roomNumber}
                </div>
                <div>
                  <Text strong>Diện tích:</Text> {room.area} m²
                </div>
                <div>
                  <Text strong>Giá:</Text> {room.pricePerMonth?.toLocaleString()} VND/tháng
                </div>
                <div>
                  <Text strong>Trạng thái:</Text> {room.roomStatus}
                </div>
                <div>
                  <Text strong>Số người tối đa:</Text> {room.maxOccupants ?? "Không xác định"}
                </div>
                <div>
                  <Text strong>Phòng ngủ:</Text> {room.numberOfBedrooms}
                </div>
                <div>
                  <Text strong>Phòng tắm:</Text> {room.numberOfBathrooms}
                </div>
                <div>
                  <Text strong>Số người đang ở:</Text> {room.roomUsers ? room.roomUsers.filter(u => u.isActive).length : 0}
                </div>
              </Space>
            </Card>
            <Card title="Gán người thuê" style={{ flex: 2 }}>
              {isRoomInactive && (
                <div style={{ color: 'red', marginBottom: 16 }}>
                  Không thể gán người thuê vào phòng này vì phòng đang ở trạng thái "{room.roomStatus === 'Maintenance' ? 'Bảo trì' : 'Ngừng hoạt động'}".
                </div>
              )}
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  paymentCycle: "MONTHLY",
                  depositAmount: room.pricePerMonth || 0
                }}
                disabled={isRoomInactive}
              >
                <Form.Item
                  label="Chọn người thuê"
                  name="renterEmails"
                  rules={[
                    { required: true, message: "Please select at least one renter" }
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn người thuê theo email"
                    showSearch
                    onSearch={fetchRenters}
                    filterOption={false}
                  >
                    {renters.map(renter => (
                      <Option key={renter.email} value={renter.email}>
                        {renter.email} - {renter.username}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Ngày bắt đầu hợp đồng"
                  name="contractStartDate"
                  rules={[
                    { required: true, message: "Vui lòng chọn ngày bắt đầu hợp đồng" }
                  ]}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    placeholder="Chọn ngày bắt đầu"
                    value={startDate}
                    onChange={d => {
                      setStartDate(d);
                    }}
                    disabledDate={d => d && d < dayjs().startOf('day')}
                  />
                </Form.Item>
                {startDate && cycle === 'QUARTERLY' && (
                  <div style={{ margin: '8px 0' }}>
                    <Button onClick={() => {
                      const base = endDate || startDate;
                      const date = dayjs(base).add(3, 'month');
                      setEndDate(date);
                      form.setFieldsValue({ contractEndDate: date.toISOString() });
                    }}>+3 tháng</Button>
                  </div>
                )}
                {startDate && cycle === 'YEARLY' && (
                  <div style={{ margin: '8px 0' }}>
                    <Button onClick={() => {
                      const base = endDate || startDate;
                      const date = dayjs(base).add(12, 'month');
                      setEndDate(date);
                      form.setFieldsValue({ contractEndDate: date.toISOString() });
                    }}>+12 tháng</Button>
                  </div>
                )}
                <Form.Item
                  label="Ngày kết thúc hợp đồng"
                  name="contractEndDate"
                  rules={[
                    { required: true, message: "Vui lòng chọn ngày kết thúc hợp đồng" }
                  ]}
                >
                  <Select
                    placeholder="Chọn ngày kết thúc"
                    value={isCustomEndDate ? 'custom' : (endDate ? endDate.toISOString() : undefined)}
                    onChange={v => {
                      if (v === 'custom') {
                        setIsCustomEndDate(true);
                        setCustomEndDate(null);
                        form.setFieldsValue({ contractEndDate: 'custom' });
                      } else {
                        setIsCustomEndDate(false);
                        setEndDate(dayjs(v));
                        form.setFieldsValue({ contractEndDate: v });
                      }
                    }}
                    disabled={!startDate}
                    showSearch={false}
                  >
                    {getValidEndDates(startDate, cycle).map(date => (
                      <Option key={date.toISOString()} value={date.toISOString()}>
                        {date.format("DD/MM/YYYY")}
                      </Option>
                    ))}
                    <Option value="custom">Chọn ngày khác...</Option>
                  </Select>
                </Form.Item>
                {isCustomEndDate && (
                  <Form.Item label="Chọn ngày kết thúc tuỳ ý">
                    <DatePicker
                      style={{ width: '100%' }}
                      value={customEndDate}
                      onChange={d => {
                        setCustomEndDate(d);
                        form.setFieldsValue({ contractEndDate: d ? d.toISOString() : undefined });
                      }}
                      disabledDate={d => d && (!startDate || d <= startDate)}
                      placeholder="Chọn ngày kết thúc"
                    />
                  </Form.Item>
                )}
                <Form.Item
                  label="Chu kỳ thanh toán"
                  name="paymentCycle"
                  rules={[
                    { required: true, message: "Vui lòng chọn chu kỳ thanh toán" }
                  ]}
                >
                  <Select
                    placeholder="Chọn chu kỳ thanh toán"
                    value={cycle}
                    onChange={v => {
                      setCycle(v);
                      setEndDate(null);
                      form.setFieldsValue({ contractEndDate: null });
                    }}
                  >
                    {paymentCycleOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Tiền đặt cọc (VND)"
                  name="depositAmount"
                  rules={[
                    { required: true, message: "Vui lòng nhập số tiền đặt cọc" }
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    min={0}
                    placeholder="Nhập số tiền đặt cọc"
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<UserAddOutlined />}
                    >
                      Gán
                    </Button>
                    <Button onClick={() => {
                      if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
                        navigate("/admin/rooms");
                      } else {
                        navigate("/landlord/rooms");
                      }
                    }}>
                      Hủy
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
} 