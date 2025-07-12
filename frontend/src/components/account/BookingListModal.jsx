import React, { useEffect, useState } from "react";
import { Modal, Table, Spin, Typography, Button, Popconfirm, Space, Form, Input, DatePicker } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import axiosClient from "../../services/axiosClient";
import scheduleApi from '../../services/scheduleApi';
import dayjs from "dayjs";
const { Title } = Typography;

export default function BookingListModal({ open, onClose, currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  // Đưa fetchBookings ra ngoài để có thể gọi lại sau khi update
  const fetchBookings = async () => {
    setLoading(true);
    try {
      let allBookings = [];
      if (currentUser?.role?.roleName === "RENTER" && currentUser?.id) {
        const byId = await axiosClient.get(`/schedules/my?renterId=${currentUser.id}`);
        allBookings = byId.data || [];
        if (currentUser?.email) {
          const byEmail = await axiosClient.get(`/schedules/my?email=${encodeURIComponent(currentUser.email)}`);
          // Gộp hai mảng, loại trùng id
          const ids = new Set(allBookings.map(b => b.id));
          allBookings = allBookings.concat((byEmail.data || []).filter(b => !ids.has(b.id)));
        }
      } else if (currentUser?.email) {
        const byEmail = await axiosClient.get(`/schedules/my?email=${encodeURIComponent(currentUser.email)}`);
        allBookings = byEmail.data || [];
      }
      setBookings(allBookings);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchBookings();
  }, [open, currentUser]);

  useEffect(() => {
    if (editingBooking && editModalOpen && editForm) {
      editForm.setFieldsValue({
        ...editingBooking,
        appointmentTime: editingBooking.appointmentTime ? dayjs(editingBooking.appointmentTime) : null,
      });
    } else if (!editModalOpen && editForm) {
      editForm.resetFields();
    }
  }, [editingBooking, editModalOpen, editForm]);

  const handleEdit = (record) => {
    setEditingBooking(record);
    setEditModalOpen(true);
  };
  const handleDelete = async (record) => {
    try {
      await scheduleApi.delete(record.id);
      setBookings((prev) => prev.filter((b) => b.id !== record.id));
      Modal.success({ content: 'Xóa lịch hẹn thành công!' });
    } catch (e) {
      Modal.error({ content: 'Xóa lịch hẹn thất bại: ' + (e.response?.data?.message || e.message) });
    }
  };

  const handleUpdateBooking = async (values) => {
    const data = {
      ...editingBooking, // giữ lại renterId, email, các trường backend cần
      ...values,
      appointmentTime: values.appointmentTime && typeof values.appointmentTime !== 'string'
        ? values.appointmentTime.toISOString()
        : values.appointmentTime,
    };
    try {
      await scheduleApi.update(editingBooking.id, data);
      // Sau khi update, fetch lại danh sách từ backend
      await fetchBookings();
      setEditModalOpen(false);
      setEditingBooking(null);
      Modal.success({ content: 'Cập nhật lịch hẹn thành công!' });
    } catch (e) {
      Modal.error({ content: 'Cập nhật lịch hẹn thất bại: ' + (e.response?.data?.message || e.message) });
    }
  };

  const bookingColumns = [
    { title: "Phòng", dataIndex: "roomId", key: "roomId" },
    { title: "Tên", dataIndex: "fullName", key: "fullName" },
    { title: "SĐT", dataIndex: "phone", key: "phone" },
    { title: "Thời gian", dataIndex: "appointmentTime", key: "appointmentTime" },
    { title: "Ghi chú", dataIndex: "note", key: "note" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa lịch hẹn này không?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="Lịch hẹn đã đặt của bạn"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Spin spinning={loading}>
        <Table
          columns={bookingColumns}
          dataSource={bookings}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "Chưa có lịch hẹn nào" }}
          style={{ marginTop: 8 }}
        />
      </Spin>
      <Modal
        open={editModalOpen}
        title="Chỉnh sửa lịch hẹn"
        onCancel={() => setEditModalOpen(false)}
        footer={null}
      >
        <Form
          form={editForm}
          id="edit-booking-form"
          layout="vertical"
          onFinish={handleUpdateBooking}
        >
          <Form.Item name="fullName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input readOnly />
          </Form.Item>
          <Form.Item name="phone" label="SĐT" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
            <Input readOnly />
          </Form.Item>
          <Form.Item
            label="Thời gian"
            name="appointmentTime"
            rules={[{ required: true, message: "Vui lòng chọn thời gian!" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginTop: 16 }}>
            <Button onClick={() => setEditModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Popconfirm
              title="Xác nhận lưu thay đổi?"
              okText="Lưu"
              cancelText="Hủy"
              onConfirm={() => editForm.submit()}
            >
              <Button type="primary">Lưu</Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
} 