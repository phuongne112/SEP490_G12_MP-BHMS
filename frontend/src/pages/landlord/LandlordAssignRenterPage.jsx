import React, { useState, useEffect } from "react";
import { Layout, Form, Button, Select, DatePicker, InputNumber, message, Card, Space, Typography, List, Avatar, Tag, Divider, ConfigProvider } from "antd";
import { ArrowLeftOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { getAllRooms, getRoomById } from "../../services/roomService";
import { getRentersForAssign } from "../../services/renterApi";
import axiosClient from "../../services/axiosClient";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import dayjs from "dayjs";
import locale from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

const { Sider, Content } = Layout;
const { Option } = Select;
const { Text, Title } = Typography;

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
  const [depositAmount, setDepositAmount] = useState(0);

  // Đặt locale cho dayjs
  dayjs.locale('vi');

  const paymentCycleOptions = [
    { value: 'MONTHLY', label: 'Hàng tháng' },
    { value: 'QUARTERLY', label: 'Hàng quý' },
    { value: 'YEARLY', label: 'Hàng năm' },
  ];

  // Hàm để lấy trạng thái phòng bằng tiếng Việt
  const getRoomStatusText = (status) => {
    switch (status) {
      case 'Available':
        return 'Còn trống';
      case 'Occupied':
        return 'Đã thuê';
      case 'Maintenance':
        return 'Bảo trì';
      case 'Inactive':
        return 'Ngừng hoạt động';
      default:
        return status;
    }
  };

  // Hàm để format ngày hiển thị
  const formatDate = (dateString) => {
    if (!dateString) return 'Không xác định';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Hàm tính tỷ lệ tiền cọc
  const getDepositRatio = (deposit, monthlyPrice) => {
    if (!deposit || !monthlyPrice || monthlyPrice === 0) return null;
    return (deposit / monthlyPrice).toFixed(1);
  };

  // Hàm hiển thị trạng thái tiền cọc
  const getDepositStatus = (deposit, monthlyPrice) => {
    const ratio = getDepositRatio(deposit, monthlyPrice);
    if (!ratio) return null;
    
    if (ratio == 0) return { text: 'Không cọc', color: 'blue' };
    if (ratio <= 1) return { text: 'Thấp', color: 'green' };
    if (ratio <= 3) return { text: 'Bình thường', color: 'blue' };
    if (ratio <= 6) return { text: 'Cao', color: 'orange' };
    return { text: 'Rất cao', color: 'red' };
  };

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
    // eslint-disable-next-line
  }, [roomId]);

  // Effect để set deposit amount ban đầu
  useEffect(() => {
    if (room?.pricePerMonth) {
      setDepositAmount(room.pricePerMonth);
    }
  }, [room?.pricePerMonth]);



  // Effect riêng để xử lý auto-calculate end date
  useEffect(() => {
    if (startDate && cycle && !isCustomEndDate) {
      let months = 1;
      if (cycle === 'MONTHLY') months = 1;
      if (cycle === 'QUARTERLY') months = 3;
      if (cycle === 'YEARLY') months = 12;
      const date = dayjs(startDate).add(months, 'month');
      setEndDate(date);
      form.setFieldsValue({ contractEndDate: date.toISOString() });
    }
    // eslint-disable-next-line
  }, [startDate, cycle]);

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
    
    // Lấy ngày kết thúc từ form hoặc custom date
    let endDateToUse;
    if (isCustomEndDate) {
      endDateToUse = customEndDate;
    } else {
      endDateToUse = values.contractEndDate ? dayjs(values.contractEndDate) : null;
    }
    
    if (!endDateToUse) {
      message.error("Vui lòng chọn ngày kết thúc hợp lệ!");
      return;
    }
    
    if (endDateToUse.isBefore(dayjs(values.contractStartDate), 'day')) {
      message.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }
    
    // Validate đúng chu kỳ (chỉ khi không phải custom date)
    if (!isCustomEndDate) {
      const diffMonth = endDateToUse.diff(dayjs(values.contractStartDate), 'month');
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
    }

    // Kiểm tra số lượng người cho thuê có vượt quá giới hạn phòng không
    const currentOccupants = room.roomUsers ? room.roomUsers.filter(u => u.isActive).length : 0;
    const newRentersCount = values.renterEmails.length;
    const totalAfter = currentOccupants + newRentersCount;
    
    if (room.maxOccupants && totalAfter > room.maxOccupants) {
      message.error(`Không thể gán thêm người thuê. Phòng chỉ cho phép tối đa ${room.maxOccupants} người. Hiện tại có ${currentOccupants} người, bạn đang thêm ${newRentersCount} người.`);
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
        contractEndDate: endDateToUse.toISOString(),
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
      <ConfigProvider locale={locale}>
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
              <div style={{ fontSize: '16px', color: '#666' }}>Đang tải thông tin phòng...</div>
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  }

  if (!room) {
    return (
      <ConfigProvider locale={locale}>
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
              <div style={{ fontSize: '16px', color: '#ff4d4f' }}>Không tìm thấy thông tin phòng</div>
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  }

  // Nếu phòng đang bảo trì hoặc ngừng hoạt động, không cho gán người thuê
  const isRoomInactive = room.roomStatus === 'Maintenance' || room.roomStatus === 'Inactive';
  
  // Lấy danh sách người đang ở trong phòng
  const currentRoomUsers = room.roomUsers ? room.roomUsers.filter(u => u.isActive) : [];

  return (
    <ConfigProvider locale={locale}>
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
                navigate("/landlord/rooms");
              }}
              style={{ marginBottom: 16 }}
            >
              Quay lại danh sách phòng
            </Button>
            <PageHeader title={`Gán người thuê - Phòng ${room.roomNumber}`} />
          </div>
          
          <div style={{ display: "flex", gap: 24, flexWrap: 'wrap' }}>
            {/* Card thông tin phòng */}
            <Card title="Thông tin phòng" style={{ flex: 1, minWidth: '300px' }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div>
                  <Text strong>Số phòng:</Text> {room.roomNumber}
                </div>
                <div>
                  <Text strong>Diện tích:</Text> {room.area} m²
                </div>
                <div>
                  <Text strong>Giá thuê:</Text> {room.pricePerMonth?.toLocaleString()} VND/tháng
                </div>
                <div>
                  <Text strong>Trạng thái:</Text> <Tag color={room.roomStatus === 'Available' ? 'green' : room.roomStatus === 'Occupied' ? 'red' : 'orange'}>{getRoomStatusText(room.roomStatus)}</Tag>
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
                  <Text strong>Số người đang ở:</Text> <Tag color="blue">{currentRoomUsers.length}</Tag>
                </div>
                
                {/* Danh sách người đang ở */}
                {currentRoomUsers.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Text strong style={{ color: '#1890ff', marginBottom: 8, display: 'block' }}>
                        <UserOutlined style={{ marginRight: 6 }} />
                        Danh sách người đang ở:
                      </Text>
                      <List
                        size="small"
                        dataSource={currentRoomUsers}
                        renderItem={(roomUser, index) => (
                          <List.Item style={{ padding: '6px 0', border: 'none' }}>
                            <List.Item.Meta
                              avatar={<Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: '13px' }}>{roomUser.fullName || 'Không có tên'}</Text>
                                  {roomUser.isActive && <Tag color="green" size="small">Hoạt động</Tag>}
                                </div>
                              }
                              description={
                                <div style={{ fontSize: '12px' }}>
                                  <div><Text type="secondary">ID: {roomUser.userId}</Text></div>
                                  {roomUser.phoneNumber && (
                                    <div><Text type="secondary">SĐT: {roomUser.phoneNumber}</Text></div>
                                  )}
                                  {roomUser.joinedAt && (
                                    <div><Text type="secondary">Ngày vào: {formatDate(roomUser.joinedAt)}</Text></div>
                                  )}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  </>
                )}
              </Space>
            </Card>

            {/* Card gán người thuê */}
            <Card title="Gán người thuê mới" style={{ flex: 2, minWidth: '400px' }}>
              {isRoomInactive && (
                <div style={{ 
                  color: '#ff4d4f', 
                  marginBottom: 16, 
                  padding: '12px', 
                  backgroundColor: '#fff2f0', 
                  border: '1px solid #ffccc7', 
                  borderRadius: '6px' 
                }}>
                  ⚠️ Không thể gán người thuê vào phòng này vì phòng đang ở trạng thái "<strong>{getRoomStatusText(room.roomStatus)}</strong>".
                </div>
              )}
              
              {room.maxOccupants && currentRoomUsers.length >= room.maxOccupants && (
                <div style={{ 
                  color: '#faad14', 
                  marginBottom: 16, 
                  padding: '12px', 
                  backgroundColor: '#fffbe6', 
                  border: '1px solid #ffe58f', 
                  borderRadius: '6px' 
                }}>
                  ⚠️ Phòng đã đạt số lượng người tối đa ({room.maxOccupants} người). Không thể gán thêm người thuê.
                </div>
              )}

                             <Form
                 form={form}
                 layout="vertical"
                 onFinish={onFinish}
                 initialValues={{
                   paymentCycle: "MONTHLY",
                   depositAmount: room?.pricePerMonth || 0
                 }}
                 disabled={isRoomInactive || (room.maxOccupants && currentRoomUsers.length >= room.maxOccupants)}
               >
                <Form.Item
                  label="Chọn người thuê"
                  name="renterEmails"
                  rules={[
                    { required: true, message: "Vui lòng chọn ít nhất một người thuê" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        if (Array.isArray(value) && value.length > 3) {
                          return Promise.reject(new Error("Bạn chỉ có thể chọn tối đa 3 người"));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Tìm theo tên, email hoặc số điện thoại (tối đa 3 người)"
                    showSearch
                    onSearch={fetchRenters}
                    filterOption={false}
                    notFoundContent="Không tìm thấy người thuê nào"
                    maxTagCount="responsive"
                    onChange={(values) => {
                      if (Array.isArray(values) && values.length > 3) {
                        message.warning("Chỉ chọn tối đa 3 người");
                        form.setFieldsValue({ renterEmails: values.slice(0, 3) });
                      }
                    }}
                  >
                    {renters.map(renter => (
                      <Option key={renter.email} value={renter.email}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{renter.fullName || renter.username}</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{renter.email}</span>
                        </div>
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
                    format="DD/MM/YYYY"
                    value={startDate}
                    onChange={d => {
                      setStartDate(d);
                      // Reset custom date khi thay đổi ngày bắt đầu
                      setIsCustomEndDate(false);
                      setCustomEndDate(null);
                      setEndDate(null);
                      form.setFieldsValue({ contractEndDate: undefined });
                    }}
                                         disabledDate={d => d && (d < dayjs().subtract(1, 'year').startOf('day') || d > dayjs().endOf('year'))}
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
                  {!isCustomEndDate ? (
                    <Select
                      placeholder="Chọn ngày kết thúc"
                      value={endDate ? endDate.toISOString() : undefined}
                      onChange={v => {
                        if (v === 'custom') {
                          setIsCustomEndDate(true);
                          setEndDate(null);
                          setCustomEndDate(null);
                          form.setFieldsValue({ contractEndDate: undefined });
                        } else {
                          const selectedDate = dayjs(v);
                          setEndDate(selectedDate);
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
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <DatePicker
                        style={{ flex: 1 }}
                        format="DD/MM/YYYY"
                        value={customEndDate}
                        onChange={d => {
                          setCustomEndDate(d);
                          form.setFieldsValue({ contractEndDate: d ? d.toISOString() : undefined });
                        }}
                        disabledDate={d => d && (!startDate || d <= startDate)}
                        placeholder="Chọn ngày kết thúc"
                      />
                      <Button 
                        onClick={() => {
                          setIsCustomEndDate(false);
                          setCustomEndDate(null);
                          form.setFieldsValue({ contractEndDate: undefined });
                        }}
                        type="link"
                        style={{ padding: 0 }}
                      >
                        Quay lại
                      </Button>
                    </div>
                  )}
                </Form.Item>
                
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
                      setIsCustomEndDate(false);
                      setCustomEndDate(null);
                      form.setFieldsValue({ contractEndDate: undefined });
                    }}
                  >
                    {paymentCycleOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Tiền đặt cọc (VND)</span>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Giá phòng: {room.pricePerMonth?.toLocaleString()} VND/tháng
                      </div>
                    </div>
                  }
                  name="depositAmount"
                  rules={[
                    { required: true, message: "Vui lòng nhập số tiền đặt cọc" },
                    { 
                      validator: (_, value) => {
                        if (value && value < 0) {
                          return Promise.reject('Tiền cọc phải lớn hơn 0');
                        }
                        if (value && room.pricePerMonth && value > room.pricePerMonth * 6) {
                          return Promise.reject('Tiền cọc không nên vượt quá 6 tháng tiền phòng');
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <div>
                                         {/* Preset buttons */}
                     <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                               <Button 
                          size="small" 
                          type="default"
                          onClick={() => {
                            const amount = room.pricePerMonth;
                            form.setFieldsValue({ depositAmount: amount });
                          }}
                        >
                          1 tháng ({room.pricePerMonth?.toLocaleString()})
                        </Button>
                        <Button 
                          size="small" 
                          type="default"
                          onClick={() => {
                            const amount = room.pricePerMonth * 2;
                            form.setFieldsValue({ depositAmount: amount });
                          }}
                        >
                          2 tháng ({(room.pricePerMonth * 2)?.toLocaleString()})
                        </Button>
                        <Button 
                          size="small" 
                          type="default"
                          onClick={() => {
                            const amount = room.pricePerMonth * 3;
                            form.setFieldsValue({ depositAmount: amount });
                          }}
                        >
                          3 tháng ({(room.pricePerMonth * 3)?.toLocaleString()})
                        </Button>
                        <Button 
                          size="small" 
                          type="default"
                          onClick={() => {
                            form.setFieldsValue({ depositAmount: 0 });
                          }}
                        >
                          Không cọc
                        </Button>
                     </div>
                    
                                         {/* Input field */}
                     <InputNumber
                       style={{ width: "100%" }}
                       formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                       parser={value => value.replace(/\$\s?|(,*)/g, '')}
                       min={0}
                       max={room.pricePerMonth * 12} // Tối đa 12 tháng
                       placeholder="Nhập số tiền đặt cọc hoặc chọn preset"
                       addonAfter="VND"
                     />
                    
                                         {/* Thông tin tỷ lệ tiền cọc */}
                     {form.getFieldValue('depositAmount') > 0 && (
                       <div style={{ 
                         marginTop: 8, 
                         padding: '8px 12px', 
                         backgroundColor: '#f6f6f6', 
                         borderRadius: '6px',
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'center'
                       }}>
                         <div style={{ fontSize: '13px' }}>
                           <span style={{ color: '#666' }}>Tương đương: </span>
                           <span style={{ fontWeight: 'bold' }}>
                             {getDepositRatio(form.getFieldValue('depositAmount'), room.pricePerMonth)} tháng tiền phòng
                           </span>
                         </div>
                         {getDepositStatus(form.getFieldValue('depositAmount'), room.pricePerMonth) && (
                           <Tag color={getDepositStatus(form.getFieldValue('depositAmount'), room.pricePerMonth).color} size="small">
                             {getDepositStatus(form.getFieldValue('depositAmount'), room.pricePerMonth).text}
                           </Tag>
                         )}
                       </div>
                     )}
                    
                    {/* Helper text */}
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      💡 Thông thường: 1-3 tháng tiền phòng. Tối đa khuyến nghị: 6 tháng.
                    </div>
                  </div>
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<UserAddOutlined />}
                    >
                      Gán người thuê
                    </Button>
                    <Button onClick={() => {
                        navigate("/landlord/rooms");
                    }}>
                      Hủy bỏ
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
} 