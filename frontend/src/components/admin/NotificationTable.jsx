import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, Alert, Tooltip } from "antd";
import { EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllNotifications } from "../../services/notificationApi";
import Access from "../common/Access";
import { useSelector } from "react-redux";

// Hàm chuyển đổi ngày sang định dạng Việt Nam chuẩn (dd/mm/yyyy)
const formatDateToVietnamese = (dateString) => {
  if (!dateString) return "";
  
  // Xử lý format "2025-07-28 16:11:04 PM" từ API
  let date;
  
  // Thử parse trực tiếp
  date = new Date(dateString);
  
  // Nếu không hợp lệ, thử xử lý format đặc biệt
  if (isNaN(date.getTime())) {
    // Tách phần ngày từ "2025-07-28 16:11:04 PM"
    const datePart = dateString.split(' ')[0];
    if (datePart) {
      date = new Date(datePart);
    }
  }
  
  // Kiểm tra xem ngày có hợp lệ không
  if (isNaN(date.getTime())) {
    return "";
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Hàm tạo DSL filter
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
  onTotalChange,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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
          const user = userList.find((u) => u.id === item.recipientId);
          return {
            key: item.id || index + 1 + (page - 1) * pageSize,
            ...item,
                         createdAt: item.createdDate ? formatDateToVietnamese(item.createdDate) : "",
            recipient: user?.fullName || user?.email || "Không xác định",
          };
        })
      );

      setPagination({ current: page, total });
      if (onTotalChange) onTotalChange(total);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setErrorMsg("❌ Không thể tải dữ liệu thông báo. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, filters, pageSize, refreshKey]);

  const columns = [
    {
      title: "STT",
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
      width: 60,
    },
    { title: "Tiêu đề", dataIndex: "title" },
    {
      title: "Loại",
      dataIndex: "type",
      render: (type) => {
        const label = type
          .toLowerCase()
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        // Có thể dịch thêm nếu muốn
        return label;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status) => {
        const color =
          status === "READ"
            ? "green"
            : status === "DELIVERED"
            ? "orange"
            : "blue";

        const viStatus =
          status === "READ"
            ? "Đã đọc"
            : status === "DELIVERED"
            ? "Đã gửi"
            : "Chưa đọc";

        return <Tag color={color}>{viStatus}</Tag>;
      },
    },
    {
      title: "Người nhận",
      dataIndex: "recipient",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
    },
    ...(hasDeletePermission || hasViewPermission
      ? [
          {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => (
              <Space>
                <Tooltip title="Xem chi tiết">
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => onView(record)}
                  />
                </Tooltip>
                {hasDeletePermission && (
                  <Access requiredPermissions={["Delete Notification"]}>
                    <Tooltip title="Xóa">
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(record)}
                      />
                    </Tooltip>
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
