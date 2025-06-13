import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message } from "antd";
import { getAllNotifications } from "../../services/notificationApi";

export default function NotificationTable({
  pageSize,
  searchTerm,
  filters,
  onView,
  onDelete,
  refreshKey,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAllNotifications({
        page: page - 1,
        size: pageSize,
        search: searchTerm || "",
      });

      const result = res.data || [];

      setData(
        result.map((item) => ({
          key: item.id,
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          status: item.status,
          date: item.createdDate,
          readAt: item.readAt,
        }))
      );

      setPagination({
        current: page,
        total: result.length, // Hoặc sửa nếu BE trả meta
      });
    } catch (err) {
      message.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, filters, pageSize, refreshKey]);

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Message", dataIndex: "message", key: "message" },
    { title: "Type", dataIndex: "type", key: "type" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "READ" ? "green" : "blue"}>{status}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => onView(record)}>
            View
          </Button>
          <Button size="small" danger onClick={() => onDelete(record)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.current,
        total: pagination.total,
        pageSize,
        onChange: (page) => fetchData(page),
      }}
    />
  );
}
