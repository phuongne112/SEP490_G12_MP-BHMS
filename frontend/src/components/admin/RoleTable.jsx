import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllRoles } from "../../services/roleApi";

export default function RoleTable({
  pageSize,
  searchTerm,
  filters,
  onEditRole,
  onDeleteRole,
  refreshKey,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAllRoles({
        page: 0,
        size: pageSize,
        name: searchTerm || undefined,
        status: filters.status !== "All" ? filters.status : undefined,
        startDate: filters.dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: filters.dateRange?.[1]?.format("YYYY-MM-DD"),
      });

      setData(res.data?.result || []);
    } catch (err) {
      message.error("Failed to fetch role data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, filters, pageSize, refreshKey]);

  const columns = [
    { title: "Id", dataIndex: "roleId", key: "roleId" },
    { title: "Name", dataIndex: "roleName", key: "roleName" },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      render: (value) => (value ? "Active" : "Inactive"),
    },
    { title: "Created At", dataIndex: "createdDate", key: "createdDate" },
    { title: "Updated At", dataIndex: "updatedDate", key: "updatedDate" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => onEditRole(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRole(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="roleId"
      pagination={{ pageSize }}
      loading={loading}
    />
  );
}
