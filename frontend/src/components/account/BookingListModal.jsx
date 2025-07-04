import React, { useEffect, useState } from "react";
import { Modal, Table, Spin, Typography } from "antd";
import axiosClient from "../../services/axiosClient";
const { Title } = Typography;

export default function BookingListModal({ open, onClose, currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
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
    fetchBookings();
  }, [open, currentUser]);

  const bookingColumns = [
    { title: "Phòng", dataIndex: "roomId", key: "roomId" },
    { title: "Tên", dataIndex: "fullName", key: "fullName" },
    { title: "SĐT", dataIndex: "phone", key: "phone" },
    { title: "Thời gian", dataIndex: "appointmentTime", key: "appointmentTime" },
    { title: "Ghi chú", dataIndex: "note", key: "note" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
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
    </Modal>
  );
} 