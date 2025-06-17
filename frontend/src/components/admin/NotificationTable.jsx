import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, Alert } from "antd";
import { getAllNotifications } from "../../services/notificationApi";
import Access from "../common/Access";
import { useSelector } from "react-redux";
// Hàm tạo filter DSL cho notification
const buildFilterDSL = (searchTerm, filters) => {
  const dsl = [];

  if (searchTerm?.trim()) {
    dsl.push(`title~'${searchTerm.trim()}'`);
  }

  if (filters.type && filters.type !== "All") {
    dsl.push(`type = '${filters.type}'`);
  }

  if (filters.status && filters.status !== "All") {
    dsl.push(`status = '${filters.status}'`);
  }

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
  userList,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // ✅ Lỗi bảng
  const user = useSelector((state) => state.account.user);
  const hasDeletePermission = user?.permissions?.includes(
    "Delete Notification"
  );
  const hasViewPermission = true;

  const fetchData = async (page = 1) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filterDSL = buildFilterDSL(searchTerm, filters);
      const res = await getAllNotifications(page - 1, pageSize, filterDSL);

      const result = res.result || [];
      const total = res.meta?.total || 0;

      setData(
        result.map((item, index) => {
          console.log(
            "🔍 recipientId:",
            item.recipientId,
            "userList:",
            userList
          );
          console.log("recipientId:", item.recipientId, "userList:", userList);
          const user = userList.find((u) => u.id === item.recipientId);
          return {
            key: item.id || index + 1 + (page - 1) * pageSize,
            ...item,
            createdAt: item.createdDate?.slice(0, 10),
            recipient: user?.fullName || user?.email || "Unknown",
          };
        })
      );

      setPagination({ current: page, total });
    } catch (err) {
      console.error("Notification fetch error:", err);
      setErrorMsg("❌ Failed to load notification data. Please try again.");
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
    // { title: "Message", dataIndex: "message" },
    {
      title: "Type",
      dataIndex: "type",
      render: (type) => {
        return type
          .toLowerCase()
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag
          color={
            status === "READ"
              ? "green"
              : status === "DELIVERED"
              ? "orange"
              : "blue"
          }
        >
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
    ...(hasDeletePermission || hasViewPermission
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => onView(record)}>
                  View
                </Button>
                {hasDeletePermission && (
                  <Access requiredPermissions={["Delete Notification"]}>
                    <Button
                      size="small"
                      danger
                      onClick={() => onDelete(record)}
                    >
                      Delete
                    </Button>
                  </Access>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* ✅ Hiển thị lỗi nếu có */}
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

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
        rowKey="id"
      />
    </>
  );
}
