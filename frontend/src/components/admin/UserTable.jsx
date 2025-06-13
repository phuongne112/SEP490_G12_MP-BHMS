import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Modal, Popconfirm } from "antd";
import { getAllUsers, updateUserStatus } from "../../services/userApi";

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

  const fetchData = async (page = 1, size = 5) => {
    setLoading(true);
    try {
      // Gọi API truyền tham số
      const res = await getAllUsers({
        page: page - 1,
        size: pageSize,
        search: searchTerm || "",
        role: filters.role !== "All" ? filters.role : undefined,
        startDate: filters.dateRange
          ? filters.dateRange[0].format("YYYY-MM-DD")
          : undefined,
        endDate: filters.dateRange
          ? filters.dateRange[1].format("YYYY-MM-DD")
          : undefined,
      });

      console.log("Gọi API: page =", page, ", size =", size);
      console.log("Kết quả trả về:", res.data?.result);

      const result = res.data?.result || [];
      const total = res.data?.meta?.total || 0;

      // Duyet du lieu tra ve va day len bang
      setData(
        result.map((item, index) => ({
          key: item.id || index + 1 + (page - 1) * pageSize,
          id: item.id,
          email: item.email,
          isActive: item.isActive, // 🆕 Lưu lại isActive để biết trạng thái hiện tại
          createdAt: item.createdDate?.slice(0, 10),
          status: item.isActive ? "Active" : "Deactivate",
          role: item.role?.roleName || "USER",
        }))
      );
      // Hien thi phan tu
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

  // ✅ Sửa: cập nhật trực tiếp state thay vì fetch lại
  const handleToggleStatus = async (user) => {
    try {
      await updateUserStatus(user.id, { active: !user.isActive }); // ✅ sửa lại key cho đúng
      message.success("Status updated successfully");

      setData((prevData) =>
        prevData.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive: !item.isActive,
                status: !item.isActive ? "Active" : "Deactivate", // ✅ cập nhật lại status hiển thị
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
      title: "Created Date",
      dataIndex: "createdAt",
    },
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
    {
      title: "Role",
      dataIndex: "role",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="medium" onClick={() => onEdit(record.email)}>
            Edit
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
