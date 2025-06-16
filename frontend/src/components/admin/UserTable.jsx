import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Popconfirm } from "antd";
import { getAllUsers, updateUserStatus } from "../../services/userApi";
import Access from "../../components/common/Access";
import { useSelector } from "react-redux";
// Hàm tạo filter DSL
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
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
  });
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

      // ✅ Fix chỗ lấy dữ liệu
      const result = res.result || [];
      const total = res.meta?.total || 0;

      setData(
        result.map((item, index) => ({
          key: item.id || index + 1 + (page - 1) * pageSize,
          id: item.id,
          email: item.email,
          username: item.username,
          isActive: item.isActive,
          createdAt: item.createdDate?.slice(0, 10),
          status: item.isActive ? "Active" : "Deactivate",
          role: {
            roleName: item.role?.roleName || "USER",
            roleId: item.role?.roleId || null,
          },
        }))
      );

      setPagination({
        current: page,
        total: total,
      });
    } catch (err) {
      message.error("Failed to load user data");
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
      message.success("Status updated successfully");

      setData((prevData) =>
        prevData.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive: !item.isActive,
                status: !item.isActive ? "Active" : "Deactivate",
              }
            : item
        )
      );
    } catch (err) {
      message.error("Failed to update status");
    }
  };

  const columns = [
    {
      title: "No.",
      dataIndex: "key",
      width: 60,
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Account(Email)",
      dataIndex: "email",
    },
    {
      title: "Username",
      dataIndex: "username",
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
    },
    // ✅ Chỉ hiển thị cột "Status" nếu có quyền
    ...(hasStatusPermission
      ? [
          {
            title: "Status",
            dataIndex: "status",
            render: (_, record) => (
              <Popconfirm
                title={`Do you want to ${
                  record.isActive ? "deactivate" : "activate"
                } this user?`}
                onConfirm={() => handleToggleStatus(record)}
                okText="Yes"
                cancelText="No"
                placement="top"
              >
                <Tag
                  color={record.status === "Active" ? "green" : "red"}
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
      title: "Role",
      dataIndex: "role",
      render: (role) => role?.roleName || "USER",
    },
    // ✅ Thêm cột Actions nếu có quyền
    ...(hasUpdatePermission
      ? [
          {
            title: "Actions",
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
                  <Button size="medium" onClick={() => onEdit(record)}>
                    Edit
                  </Button>
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
