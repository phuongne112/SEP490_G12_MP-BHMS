import React from "react";
import { Form, Select, DatePicker, Button } from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function NotificationFilterPopover({ onApply }) {
  const [form] = Form.useForm();

  const handleApply = () => {
    form.validateFields().then((values) => {
      onApply(values);
    });
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item label="Trạng thái" name="status" initialValue="All">
        <Select>
          <Option value="All">Tất cả</Option>
          <Option value="SENT">Chưa đọc</Option>
          <Option value="DELIVERED">Đã gửi</Option>
          <Option value="READ">Đã đọc</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Loại thông báo" name="type" initialValue="All">
        <Select>
          <Option value="All">Tất cả</Option>
          <Option value="RENT_REMINDER">Nhắc nhở tiền phòng</Option>
          <Option value="MAINTENANCE">Bảo trì</Option>
          <Option value="BOOKING_STATUS">Trạng thái đặt phòng</Option>
          <Option value="SCHEDULE">Lịch hẹn</Option>
          <Option value="ANNOUNCEMENT">Thông báo chung</Option>
          <Option value="PAYMENT_SUCCESS">Thanh toán thành công</Option>
          <Option value="PAYMENT_FAILED">Thanh toán thất bại</Option>
          <Option value="CONTRACT_EXPIRED">Hợp đồng hết hạn</Option>
          <Option value="CONTRACT_RENEWED">Hợp đồng gia hạn</Option>
          <Option value="BILL_CREATED">Hóa đơn mới</Option>
          <Option value="BILL_PAID">Hóa đơn đã thanh toán</Option>
          <Option value="BILL_OVERDUE">Hóa đơn quá hạn</Option>
          <Option value="CONTRACT_AMENDMENT">Sửa đổi hợp đồng</Option>
          <Option value="CONTRACT_TERMINATED">Hợp đồng chấm dứt</Option>
          <Option value="ROOM_BOOKING">Đặt phòng</Option>
          <Option value="ROOM_BOOKING_ACCEPTED">Đặt phòng được chấp nhận</Option>
          <Option value="ROOM_BOOKING_REJECTED">Đặt phòng bị từ chối</Option>
          <Option value="ROOM_BOOKING_CANCELLED">Đặt phòng bị hủy</Option>
          <Option value="SERVICE_UPDATE">Cập nhật dịch vụ</Option>
          <Option value="USER_UPDATE">Cập nhật người dùng</Option>
          <Option value="SYSTEM_MAINTENANCE">Bảo trì hệ thống</Option>
          <Option value="CUSTOM">Tùy chỉnh</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Khoảng ngày" name="dateRange">
        <RangePicker />
      </Form.Item>

      <Form.Item>
        <Button type="primary" block onClick={handleApply}>
          Áp dụng bộ lọc
        </Button>
      </Form.Item>
    </Form>
  );
}
