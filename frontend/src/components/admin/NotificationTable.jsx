import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, Alert, Tooltip, Popconfirm } from "antd";
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
      align: "center",
      width: 60,
    },
    { 
      title: "Tiêu đề", 
      dataIndex: "title",
      align: "center",
      width: 200,
    },
    {
      title: "Loại",
      dataIndex: "displayType", // Use displayType from backend instead of type
      align: "center",
      width: 120,
      render: (displayType, record) => {
        // Use displayType from backend if available, otherwise fallback to type
        if (displayType) {
          return displayType;
        }
        
        // Fallback: format the original type if no displayType is available
        const type = record.type;
        if (!type) return "";
        
        const label = type
          .toLowerCase()
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return label;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "displayStatus", // Use displayStatus from backend instead of status
      align: "center",
      width: 120,
      render: (displayStatus, record) => {
        // Use displayStatus from backend if available, otherwise fallback to status
        if (displayStatus) {
          const status = record.status;
          const color =
            status === "READ"
              ? "green"
              : status === "DELIVERED"
              ? "orange"
              : "blue";
          return <Tag color={color}>{displayStatus}</Tag>;
        }
        
        // Fallback: use original status logic
        const status = record.status;
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
      align: "center",
      width: 150,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      align: "center",
      width: 120,
    },
    ...(hasDeletePermission || hasViewPermission
      ? [
          {
            title: "Thao tác",
            key: "actions",
            align: "center",
            width: 200,
            render: (_, record) => (
              <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => onView(record)}
                  title="Xem chi tiết thông báo"
                >
                  Xem
                </Button>
                {hasDeletePermission && (
                  <Access requiredPermissions={["Delete Notification"]}>
                    <Popconfirm
                      title="Xóa thông báo"
                      description="Bạn có chắc muốn xóa thông báo này?"
                      onConfirm={() => onDelete(record)}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <Button
                        icon={<DeleteOutlined />}
                        type="primary"
                        danger
                        size="small"
                        title="Xóa thông báo"
                      />
                    </Popconfirm>
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
          showSizeChanger: false,
          showQuickJumper: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} thông báo`,
          pageSizeOptions: ['5', '10', '20', '50'],
          onChange: (page) => fetchData(page)
        }}
        style={{ background: "#fff", borderRadius: 8 }}
        scroll={{ x: 800 }}
        bordered
        rowKey="id"
        size="middle"
      />
    </>
  );
}
