import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Popconfirm } from "antd";
import { getAllUsers, updateUserStatus } from "../../services/userApi";
import Access from "../../components/common/Access";
import { useSelector } from "react-redux";

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
          isActive: item.isActive,
          createdAt: item.createdDate?.slice(0, 10),
          status: item.isActive ? "Đang hoạt động" : "Ngừng hoạt động",
          role: {
            roleName: item.role?.roleName || "USER",
            roleId: item.role?.roleId || null,
          },
        }))
      );

      setPagination({ current: page, total });
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
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
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
                  <Button size="middle" onClick={() => onEdit(record)}>
                    Sửa
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
