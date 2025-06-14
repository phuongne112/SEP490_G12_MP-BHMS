import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message } from "antd";
import { getAllNotifications } from "../../services/notificationApi";

// Build filter params from UI
// Hàm tạo filter DSL cho notification
const buildFilterDSL = (searchTerm, filters) => {
  const dsl = [];

  // Tìm theo tiêu đề
  if (searchTerm?.trim()) {
    dsl.push(`title~'${searchTerm.trim()}'`);
  }

  // Filter theo type (nếu không phải "All")
  if (filters.type && filters.type !== "All") {
    dsl.push(`type = '${filters.type}'`);
  }

  // Filter theo status (nếu không phải "All")
  if (filters.status && filters.status !== "All") {
    dsl.push(`status = '${filters.status}'`);
  }

  // Filter theo khoảng ngày tạo
  if (filters.dateRange?.length === 2) {
    const [start, end] = filters.dateRange;
    if (start && end) {
      dsl.push(`createdDate >: '${start.format("YYYY-MM-DD")}'`);
      dsl.push(`createdDate <: '${end.format("YYYY-MM-DD")}'`);
    }
  }

  return dsl.join(" and ");
};


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
    const filterDSL = buildFilterDSL(searchTerm, filters);
    const res = await getAllNotifications(page - 1, pageSize, filterDSL);

    const result = res.result || [];
    const total = res.meta?.total || 0;

    setData(
      result.map((item, index) => ({
        key: item.id || index + 1 + (page - 1) * pageSize,
        ...item,
        createdAt: item.createdDate?.slice(0, 10),
        recipient: item.recipient?.fullName || item.recipient?.email || "Unknown",
      }))
    );

    setPagination({ current: page, total });
  } catch (err) {
    message.error("Failed to load notification data");
    console.error("Notification fetch error:", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData(1);
  }, [searchTerm, filters, pageSize, refreshKey]);

  const columns = [
    {
      title: "No.",
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
      width: 60,
    },
    { title: "Title", dataIndex: "title" },
    { title: "Message", dataIndex: "message" },
    { title: "Type", dataIndex: "type" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={status === "READ" ? "green" : status === "DELIVERED" ? "orange" : "blue"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Recipient",
      dataIndex: "recipient",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
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
      bordered
    />
  );
}
