import React, { useState, useEffect, useCallback } from "react";
import { Modal, Form, Button, Select, DatePicker, InputNumber, message, Card, Space, Typography, List, Avatar, Tag, Divider, ConfigProvider, Popconfirm } from "antd";
import { UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { getRentersForAssign } from "../../services/renterApi";
import axiosClient from "../../services/axiosClient";
import dayjs from "dayjs";
import locale from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

const { Option } = Select;
const { Text, Title } = Typography;

export default function AssignRenterModal({ visible, onCancel, room, onSuccess }) {
  const [form] = Form.useForm();
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [cycle, setCycle] = useState("MONTHLY");
  const [isCustomEndDate, setIsCustomEndDate] = useState(false);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [shouldClose, setShouldClose] = useState(false);
  const [selectedRenters, setSelectedRenters] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Đặt locale cho dayjs
  dayjs.locale('vi');

  // useEffect để đóng modal khi shouldClose = true
  useEffect(() => {
    console.log("useEffect shouldClose:", shouldClose);
    if (shouldClose) {
      console.log("Gọi onCancel từ useEffect");
      onCancel();
      setShouldClose(false);
    }
  }, [shouldClose, onCancel]);

  // Reset isClosing khi modal đóng
  useEffect(() => {
    if (!visible) {
      setIsClosing(false);
      setSuccess(false);
    }
  }, [visible]);

  // Đóng modal khi success = true
  useEffect(() => {
    if (success) {
      console.log("useEffect success: đóng modal");
      onCancel();
      setSuccess(false);
    }
  }, [success, onCancel]);

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
    if (visible && room) {
      console.log("Room data received:", room);
      console.log("Room users:", room.roomUsers);
      fetchRenters();
      // Set deposit amount ban đầu
      setDepositAmount(room.pricePerMonth || 0);
    } else if (!visible) {
      // Reset form khi modal đóng
      form.resetFields();
      setStartDate(null);
      setEndDate(null);
      setCustomEndDate(null);
      setDepositAmount(0);
      setCycle("MONTHLY");
      setIsCustomEndDate(false);
    }
  }, [visible, room]);

  const fetchRenters = async (keyword = "") => {
    try {
      const response = await getRentersForAssign(keyword);
      setRenters(response.data || []);
    } catch (error) {
      console.error("Error fetching renters:", error);
      message.error("Không thể tải danh sách người thuê");
    }
  };

  const onFinish = async (values) => {
    if (!room) return;
    if (loading) return;

    // Validate số người không vượt quá giới hạn phòng
    const currentOccupants = room.roomUsers ? room.roomUsers.filter(u => u.isActive).length : 0;
    const toAdd = (values.userIds || []).length;
    if (room.maxOccupants && currentOccupants + toAdd > room.maxOccupants) {
      message.error(`Không thể gán thêm người thuê. Tối đa ${room.maxOccupants} người.`);
      return;
    }

    setLoading(true);
    try {
      const endDateToUse = isCustomEndDate
        ? customEndDate?.toISOString()
        : (endDate ? endDate.toISOString() : null);

      const requestData = {
        roomId: room.id,
        userIds: values.userIds,
        contractStartDate: startDate?.toISOString(),
        contractEndDate: endDateToUse,
        paymentCycle: cycle,
        depositAmount: depositAmount
      };

      await axiosClient.post("/room-users/add-many", requestData);

      message.success("Đã gán người thuê vào phòng thành công!");

      // Reset form và state
      form.resetFields();
      setStartDate(null);
      setEndDate(null);
      setCustomEndDate(null);
      setDepositAmount(room.pricePerMonth || 0);
      setCycle("MONTHLY");
      setIsCustomEndDate(false);
      setSelectedRenters([]);

      onSuccess?.();
      setLoading(false);
      setSuccess(true);
      return;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || "Gán người thuê vào phòng thất bại";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDateChange = (date) => {
    setStartDate(date);
    setEndDate(null);
    setCustomEndDate(null);
  };

  const handleCycleChange = (value) => {
    setCycle(value);
    setEndDate(null);
    setCustomEndDate(null);
  };

  const handleEndDateChange = (value) => {
    // Convert string back to dayjs object if needed
    if (typeof value === 'string') {
      setEndDate(dayjs(value));
    } else {
      setEndDate(value);
    }
  };

  const handleDepositPreset = (amount) => {
    setDepositAmount(amount);
  };

  const handleCustomDepositChange = (value) => {
    setDepositAmount(value || 0);
  };

  const handleRenterSelect = (values) => {
    const selected = renters.filter(r => values.includes(r.id));
    setSelectedRenters(selected);
  };

  const handleCloseModal = useCallback(() => {
    console.log("handleCloseModal được gọi");
    if (!isClosing) {
      setIsClosing(true);
      onCancel();
    }
  }, [isClosing, onCancel]);

  // Kiểm tra xem có thể gán người thuê không
  const canAssignRenter = room && (room.roomStatus === 'Available' || room.roomStatus === 'Occupied') && room.isActive;

  return (
    <Modal
      title={`Gán người thuê - Phòng ${room?.roomNumber}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <ConfigProvider locale={locale}>
        <div style={{ display: 'flex', gap: 24, minHeight: 600 }}>
          {/* Thông tin phòng */}
          <Card title="Thông tin phòng" style={{ flex: 1, minWidth: '300px' }}>
            {room && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Số phòng: {room.roomNumber}</div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Diện tích: {room.area} m²</div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Giá thuê: {room.pricePerMonth?.toLocaleString()} VND/tháng</div>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={room.isActive ? "green" : "red"}>
                      {getRoomStatusText(room.roomStatus)}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Số người tối đa: {room.maxOccupants || 3}</div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Phòng ngủ: {room.numberOfBedrooms || 1}</div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Phòng tắm: {room.numberOfBathrooms || 1}</div>
                </div>

                {/* Danh sách người đang ở */}
                {room.roomUsers && room.roomUsers.filter(u => u.isActive).length > 0 && (
                  <div>
                    <Divider />
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Danh sách người đang ở:</div>
                    {console.log("Room users:", room.roomUsers)}
                    <List
                      dataSource={room.roomUsers.filter(u => u.isActive)}
                      renderItem={(user) => {
                        console.log("User data:", user);
                        return (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<Avatar icon={<UserOutlined />} />}
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600 }}>
                                    {user.fullName || user.user?.fullName || user.user?.name || user.name || 'Không có tên'}
                                  </span>
                                  <Tag color="green" size="small">Hoạt động</Tag>
                                </div>
                              }
                                                             description={
                                 <div style={{ fontSize: 12, color: '#666' }}>
                                   <div>ID: {user.userId || user.user?.id || user.id || 'Không có ID'}</div>
                                   <div>SĐT: {user.phoneNumber || user.user?.phoneNumber || user.user?.userInfo?.phoneNumber || 'Không có SĐT'}</div>
                                   <div>Ngày vào: {formatDate(user.joinedAt)}</div>
                                 </div>
                               }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Form gán người thuê */}
          <Card title="Gán người thuê mới" style={{ flex: 2, minWidth: '400px' }}>
            {!canAssignRenter ? (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: '#ff4d4f',
                fontSize: 16,
                fontWeight: 500 
              }}>
                ⚠️ Không thể gán người thuê vào phòng này vì phòng đang ở trạng thái "<strong>{getRoomStatusText(room?.roomStatus)}</strong>".
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={loading ? undefined : onFinish}
                style={{ maxWidth: '100%' }}
              >
                <Form.Item
                  label="Chọn người thuê"
                  name="userIds"
                  rules={[{ required: true, message: 'Vui lòng chọn ít nhất một người thuê!' }]}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Tìm theo tên, email hoặc số điện thoại"
                    optionFilterProp="children"
                    onSearch={fetchRenters}
                    filterOption={false}
                    onChange={handleRenterSelect}
                    style={{ width: '100%' }}
                  >
                    {renters.map((renter) => (
                      <Option key={renter.id} value={renter.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{renter.fullName || renter.name}</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{renter.email}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Ngày bắt đầu hợp đồng"
                  required
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder="Chọn ngày bắt đầu"
                    value={startDate}
                    onChange={handleStartDateChange}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>

                <Form.Item
                  label="Ngày kết thúc hợp đồng"
                  required
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Select
                      value={cycle}
                      onChange={handleCycleChange}
                      style={{ width: 120 }}
                    >
                      {paymentCycleOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                    <span>hoặc</span>
                    <Button
                      type={isCustomEndDate ? "primary" : "default"}
                      size="small"
                      onClick={() => setIsCustomEndDate(!isCustomEndDate)}
                    >
                      Tùy chỉnh
                    </Button>
                  </div>

                  {isCustomEndDate ? (
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày kết thúc"
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      format="DD/MM/YYYY"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  ) : (
                    <Select
                      placeholder="Chọn ngày kết thúc"
                      value={endDate ? endDate.format('YYYY-MM-DD') : undefined}
                      onChange={handleEndDateChange}
                      style={{ width: '100%' }}
                      disabled={!startDate}
                    >
                      {getValidEndDates(startDate, cycle).map((date) => (
                        <Option key={date.format('YYYY-MM-DD')} value={date.format('YYYY-MM-DD')}>
                          {date.format('DD/MM/YYYY')}
                        </Option>
                      ))}
                    </Select>
                  )}
                </Form.Item>

                <Form.Item
                  label="Chu kỳ thanh toán"
                  required
                >
                  <Select
                    value={cycle}
                    onChange={handleCycleChange}
                    style={{ width: '100%' }}
                  >
                    {paymentCycleOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Tiền đặt cọc (VND)"
                  required
                >
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">Giá phòng: {room?.pricePerMonth?.toLocaleString()} VND/tháng</Text>
                  </div>
                  
                  <Space wrap style={{ marginBottom: 12 }}>
                    <Button
                      type={depositAmount === room?.pricePerMonth ? "primary" : "default"}
                      onClick={() => handleDepositPreset(room?.pricePerMonth || 0)}
                    >
                      1 tháng ({room?.pricePerMonth?.toLocaleString()})
                    </Button>
                    <Button
                      type={depositAmount === (room?.pricePerMonth || 0) * 2 ? "primary" : "default"}
                      onClick={() => handleDepositPreset((room?.pricePerMonth || 0) * 2)}
                    >
                      2 tháng ({(room?.pricePerMonth || 0) * 2?.toLocaleString()})
                    </Button>
                    <Button
                      type={depositAmount === (room?.pricePerMonth || 0) * 3 ? "primary" : "default"}
                      onClick={() => handleDepositPreset((room?.pricePerMonth || 0) * 3)}
                    >
                      3 tháng ({(room?.pricePerMonth || 0) * 3?.toLocaleString()})
                    </Button>
                    <Button
                      type={depositAmount === 0 ? "primary" : "default"}
                      onClick={() => handleDepositPreset(0)}
                    >
                      Không cọc
                    </Button>
                  </Space>

                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập số tiền đặt cọc hoặc chọn preset"
                    value={depositAmount}
                    onChange={handleCustomDepositChange}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    addonAfter="VND"
                  />

                  {depositAmount > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong>
                        Tương đương: {getDepositRatio(depositAmount, room?.pricePerMonth)} tháng tiền phòng
                      </Text>
                      {getDepositStatus(depositAmount, room?.pricePerMonth) && (
                        <Tag 
                          color={getDepositStatus(depositAmount, room?.pricePerMonth).color}
                          style={{ marginLeft: 8 }}
                        >
                          {getDepositStatus(depositAmount, room?.pricePerMonth).text}
                        </Tag>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    💡 Thông thường: 1-3 tháng tiền phòng. Tối đa khuyến nghị: 6 tháng.
                  </div>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={onCancel}>
                      Hủy
                    </Button>
                    <Popconfirm
                      title="Xác nhận gán người thuê"
                      description={
                        <div>
                          <div>Bạn có chắc chắn muốn gán người thuê vào phòng <strong>{room?.roomNumber}</strong> không?</div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                            <div>• Người thuê: <strong>{selectedRenters.length > 0 ? selectedRenters.map(r => r.fullName || r.name).join(', ') : 'Chưa chọn'}</strong></div>
                            <div>• Ngày bắt đầu: {startDate ? startDate.format('DD/MM/YYYY') : 'Chưa chọn'}</div>
                            <div>• Chu kỳ thanh toán: {paymentCycleOptions.find(opt => opt.value === cycle)?.label || cycle}</div>
                            <div>• Tiền cọc: {depositAmount?.toLocaleString()} VND</div>
                          </div>
                        </div>
                      }
                      onConfirm={() => {
                        setShowConfirm(false);
                        // Trigger form submit
                        form.submit();
                      }}
                      onCancel={() => setShowConfirm(false)}
                      okText="Đồng ý"
                      cancelText="Hủy"
                      placement="topRight"
                      open={showConfirm}
                      disabled={selectedRenters.length === 0 || !startDate}
                    >
                      <Button 
                        type="primary" 
                        loading={loading}
                        disabled={loading || selectedRenters.length === 0 || !startDate}
                        icon={<UserAddOutlined />}
                        title={selectedRenters.length === 0 || !startDate ? "Vui lòng chọn đầy đủ thông tin người thuê và ngày bắt đầu" : ""}
                        onClick={() => setShowConfirm(true)}
                      >
                        Gán người thuê
                      </Button>
                    </Popconfirm>
                  </Space>
                </Form.Item>
              </Form>
            )}
          </Card>
        </div>
      </ConfigProvider>
    </Modal>
  );
}

