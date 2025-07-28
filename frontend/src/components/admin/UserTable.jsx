import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Popconfirm, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { getAllUsers, updateUserStatus } from "../../services/userApi";
import Access from "../../components/common/Access";
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

// Hàm tạo DSL lọc dữ liệu người dùng
const buildFilterDSL = (searchTerm, filters) => {
  const dsl = [];

  if (searchTerm?.trim()) {
    const term = searchTerm.trim();
    dsl.push(
      `(email~'${term}' or username~'${term}' or role.roleName~'${term}')`
    );
  }

  if (filters.role !== undefined && filters.role !== "none") {
    if (filters.role === "null") {
      dsl.push("role IS NULL");
    } else {
      dsl.push(`role.id = ${filters.role}`);
    }
  }

  if (filters.dateRange && filters.dateRange.length === 2) {
    const [start, end] = filters.dateRange;
    if (start && end) {
      dsl.push(`createdDate >: '${start.format("YYYY-MM-DD")}'`);
      dsl.push(`createdDate <: '${end.format("YYYY-MM-DD")}'`);
    }
  }

  return dsl.join(" and ");
};

export default function UserTable({
  pageSize,
  searchTerm,
  filters,
  onEdit,
  refreshKey,
  onTotalChange,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const user = useSelector((state) => state.account.user);
  const hasUpdatePermission = user?.permissions?.includes("Update User");
  const hasStatusPermission = user?.permissions?.includes(
    "Active/ De-Active User"
  );

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL(searchTerm, filters);
      const res = await getAllUsers(page - 1, pageSize, filterDSL);

      const result = res.result || [];
      const total = res.meta?.total || 0;

      setData(
        result.map((item, index) => ({
          key: item.id || index + 1 + (page - 1) * pageSize,
          id: item.id,
          email: item.email,
          username: item.username,
          fullName: item.fullName,
          phoneNumber: item.phoneNumber,
          isActive: item.isActive,
          createdAt: item.createdDate ? formatDateToVietnamese(item.createdDate) : "",
          status: item.isActive ? "Đang hoạt động" : "Ngừng hoạt động",
          role: {
            roleName: item.role?.roleName || "USER",
            roleId: item.role?.roleId || null,
          },
        }))
      );

      setPagination({ current: page, total });
      if (onTotalChange) onTotalChange(total);
    } catch (err) {
      message.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, filters.role, filters.dateRange, pageSize, refreshKey]);

  const handleToggleStatus = async (user) => {
    try {
      await updateUserStatus(user.id, { active: !user.isActive });
      message.success("Cập nhật trạng thái thành công");

      setData((prevData) =>
        prevData.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive: !item.isActive,
                status: !item.isActive ? "Đang hoạt động" : "Ngừng hoạt động",
              }
            : item
        )
      );
    } catch (err) {
      message.error("Không thể cập nhật trạng thái");
    }
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "key",
      width: 60,
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      render: (text) => text || "---",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      render: (text) => text || "---",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
    },
    ...(hasStatusPermission
      ? [
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (_, record) => (
              <Popconfirm
                title={`Bạn có chắc muốn ${
                  record.isActive ? "ngừng hoạt động" : "kích hoạt"
                } người dùng này không?`}
                onConfirm={() => handleToggleStatus(record)}
                okText="Đồng ý"
                cancelText="Hủy"
                placement="top"
              >
                <Tag
                  color={record.status === "Đang hoạt động" ? "green" : "red"}
                  style={{ cursor: "pointer" }}
                >
                  {record.status}
                </Tag>
              </Popconfirm>
            ),
          },
        ]
      : []),
    {
      title: "Vai trò",
      dataIndex: "role",
      render: (role) => role?.roleName || "USER",
    },
    ...(hasUpdatePermission
      ? [
          {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => {
              const currentUser = JSON.parse(localStorage.getItem("user"));
              const currentRole = currentUser?.role?.roleName?.toUpperCase?.();
              const targetRole = record.role?.roleName?.toUpperCase?.();

              const shouldHideEditButton =
                (currentRole === "SUBADMIN" &&
                  (targetRole === "ADMIN" || targetRole === "SUBADMIN")) ||
                (currentRole === "ADMIN" && targetRole === "ADMIN");

              if (shouldHideEditButton) return null;

              return (
                <Space>
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => onEdit(record)}
                    />
                  </Tooltip>
                </Space>
              );
            },
          },
        ]
      : []),
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
