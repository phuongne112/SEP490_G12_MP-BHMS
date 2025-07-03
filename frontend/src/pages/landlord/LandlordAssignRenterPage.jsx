import React, { useState, useEffect } from "react";
import {
  Layout,
  Form,
  Button,
  Select,
  DatePicker,
  InputNumber,
  message,
  Card,
  Space,
  Typography,
} from "antd";
import { ArrowLeftOutlined, UserAddOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { getAllRooms } from "../../services/roomService";
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

  useEffect(() => {
    fetchRoomDetails();
    fetchRenters();
    // eslint-disable-next-line
  }, [roomId]);

  const fetchRoomDetails = async () => {
    try {
      const res = await getAllRooms(0, 1000, `id=${roomId}`);
      if (res.result && res.result.length > 0) {
        setRoom(res.result[0]);
      }
    } catch (err) {
      message.error("Failed to load room details");
    } finally {
      setRoomLoading(false);
    }
  };

  const fetchRenters = async (keyword = "") => {
    try {
      const res = await getRentersForAssign(keyword);
      setRenters(res.data || []);
    } catch (err) {
      message.error("Failed to load renters");
    }
  };

  const onFinish = async (values) => {
    // Validate ngày bắt đầu/kết thúc phải ở tương lai
    if (dayjs(values.contractStartDate).isBefore(dayjs(), "day")) {
      message.error("Ngày bắt đầu phải ở tương lai!");
      return;
    }
    if (dayjs(values.contractEndDate).isBefore(dayjs(), "day")) {
      message.error("Ngày kết thúc phải ở tương lai!");
      return;
    }
    if (
      dayjs(values.contractEndDate).isBefore(
        dayjs(values.contractStartDate),
        "day"
      )
    ) {
      message.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }
    // Validate đúng chu kỳ
    const diffMonth = dayjs(values.contractEndDate).diff(
      dayjs(values.contractStartDate),
      "month"
    );
    let valid = false;
    let errorMsg = "";
    if (values.paymentCycle === "MONTHLY") {
      valid = diffMonth > 0 && diffMonth % 1 === 0;
      if (!valid)
        errorMsg =
          "Thời gian hợp đồng phải là bội số của 1 tháng cho chu kỳ thanh toán hàng tháng.";
    }
    if (values.paymentCycle === "QUARTERLY") {
      valid = diffMonth > 0 && diffMonth % 3 === 0;
      if (!valid)
        errorMsg =
          "Thời gian hợp đồng phải là bội số của 3 tháng cho chu kỳ thanh toán hàng quý.";
    }
    if (values.paymentCycle === "SEMI_ANNUALLY") {
      valid = diffMonth > 0 && diffMonth % 6 === 0;
      if (!valid)
        errorMsg =
          "Thời gian hợp đồng phải là bội số của 6 tháng cho chu kỳ thanh toán nửa năm.";
    }
    if (values.paymentCycle === "ANNUALLY") {
      valid = diffMonth > 0 && diffMonth % 12 === 0;
      if (!valid)
        errorMsg =
          "Thời gian hợp đồng phải là bội số của 12 tháng cho chu kỳ thanh toán hàng năm.";
    }
    if (!valid) {
      message.error(errorMsg);
      return;
    }
    setLoading(true);
    try {
      const requestData = {
        roomId: parseInt(roomId),
        userIds: values.renterEmails.map((email) => {
          const renter = renters.find((r) => r.email === email);
          return renter.id;
        }),
        contractStartDate: values.contractStartDate.toISOString(),
        contractEndDate: values.contractEndDate.toISOString(),
        depositAmount: values.depositAmount,
        paymentCycle: values.paymentCycle,
      };

      await axiosClient.post("/room-users/add-many", requestData);
      message.success("Đã gán người thuê vào phòng thành công!");
      navigate("/landlord/rooms");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to assign renters to room";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (roomLoading) {
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
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" ||
          user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
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
              Back to Rooms
            </Button>
            <PageHeader title="Assign Renters to Room" />
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <Card title="Room Information" style={{ flex: 1 }}>
              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <div>
                  <Text strong>Room Number:</Text> {room.roomNumber}
                </div>
                <div>
                  <Text strong>Area:</Text> {room.area} m²
                </div>
                <div>
                  <Text strong>Price:</Text>{" "}
                  {room.pricePerMonth?.toLocaleString()} VND/month
                </div>
                <div>
                  <Text strong>Status:</Text> {room.roomStatus}
                </div>
                <div>
                  <Text strong>Max Occupants:</Text>{" "}
                  {room.maxOccupants ?? "N/A"}
                </div>
                <div>
                  <Text strong>Bedrooms:</Text> {room.numberOfBedrooms}
                </div>
                <div>
                  <Text strong>Bathrooms:</Text> {room.numberOfBathrooms}
                </div>
              </Space>
            </Card>
            <Card title="Assign Renters" style={{ flex: 2 }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  paymentCycle: "MONTHLY",
                  depositAmount: room.pricePerMonth || 0,
                }}
              >
                <Form.Item
                  label="Select Renters"
                  name="renterEmails"
                  rules={[
                    {
                      required: true,
                      message: "Please select at least one renter",
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select renters by email"
                    showSearch
                    onSearch={fetchRenters}
                    filterOption={false}
                  >
                    {renters.map((renter) => (
                      <Option key={renter.email} value={renter.email}>
                        {renter.email} - {renter.username}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Contract Start Date"
                  name="contractStartDate"
                  rules={[
                    {
                      required: true,
                      message: "Please select contract start date",
                    },
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    placeholder="Select start date"
                    value={startDate}
                    onChange={(d) => {
                      setStartDate(d);
                      // Nếu đã có chu kỳ, tự động gợi ý ngày kết thúc
                      if (d && cycle) {
                        let months = 1;
                        if (cycle === "MONTHLY") months = 1;
                        if (cycle === "QUARTERLY") months = 3;
                        if (cycle === "SEMI_ANNUALLY") months = 6;
                        if (cycle === "ANNUALLY") months = 12;
                        setEndDate(dayjs(d).add(months, "month"));
                        form.setFieldsValue({
                          contractEndDate: dayjs(d).add(months, "month"),
                        });
                      }
                    }}
                    disabledDate={(d) => d && d < dayjs().startOf("day")}
                  />
                </Form.Item>
                <div style={{ margin: "8px 0" }}>
                  <Button
                    onClick={() => {
                      if (startDate) {
                        setEndDate(dayjs(startDate).add(3, "month"));
                        form.setFieldsValue({
                          contractEndDate: dayjs(startDate).add(3, "month"),
                        });
                      }
                    }}
                  >
                    +3 tháng
                  </Button>
                  <Button
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      if (startDate) {
                        setEndDate(dayjs(startDate).add(6, "month"));
                        form.setFieldsValue({
                          contractEndDate: dayjs(startDate).add(6, "month"),
                        });
                      }
                    }}
                  >
                    +6 tháng
                  </Button>
                  <Button
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      if (startDate) {
                        setEndDate(dayjs(startDate).add(12, "month"));
                        form.setFieldsValue({
                          contractEndDate: dayjs(startDate).add(12, "month"),
                        });
                      }
                    }}
                  >
                    +12 tháng
                  </Button>
                </div>
                <Form.Item
                  label="Contract End Date"
                  name="contractEndDate"
                  rules={[
                    {
                      required: true,
                      message: "Please select contract end date",
                    },
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    placeholder="Select end date"
                    value={endDate}
                    onChange={(d) => setEndDate(d)}
                    disabledDate={(d) =>
                      d &&
                      (d < dayjs().startOf("day") ||
                        (startDate && d < startDate))
                    }
                  />
                </Form.Item>
                <Form.Item
                  label="Payment Cycle"
                  name="paymentCycle"
                  rules={[
                    { required: true, message: "Please select payment cycle" },
                  ]}
                >
                  <Select
                    placeholder="Select payment cycle"
                    value={cycle}
                    onChange={(v) => setCycle(v)}
                  >
                    <Option value="MONTHLY">Monthly</Option>
                    <Option value="QUARTERLY">Quarterly</Option>
                    <Option value="SEMI_ANNUALLY">Semi-annually</Option>
                    <Option value="ANNUALLY">Annually</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Deposit Amount (VND)"
                  name="depositAmount"
                  rules={[
                    { required: true, message: "Please enter deposit amount" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                    min={0}
                    placeholder="Enter deposit amount"
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
                      Assign Renters
                    </Button>
                    <Button
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
                      Cancel
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
