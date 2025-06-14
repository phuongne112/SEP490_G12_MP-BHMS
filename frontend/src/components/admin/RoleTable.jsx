import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllRoles } from "../../services/roleApi";

// ✅ Tạo filter DSL chuẩn
const buildFilterDSL = (searchTerm, filters) => {
  const dsl = [];
  if (searchTerm?.trim()) {
    dsl.push(`roleName~'${searchTerm.trim()}'`);
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

export default function RoleTable({
  pageSize,
  searchTerm,
  onEditRole,
  onDeleteRole,
  refreshKey,
  filters
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL(searchTerm, filters);
      const res = await getAllRoles(page - 1, pageSize, filterDSL);

      const result = res.result || [];
      const total = res.meta?.total || 0;

      setData(
        result.map((item, index) => ({
          key: item.id || index + 1 + (page - 1) * pageSize,
          ...item,
          createdAt: item.createdDate?.slice(0, 10),
        }))
      );

      setPagination({ current: page, total });
    } catch (err) {
      message.error("Failed to load role data");
      console.error("Role fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [searchTerm,filters.dateRange, pageSize, refreshKey]);

  const columns = [
    {
      title: "No.",
      dataIndex: "key",
      align: "center",
      width: 80,
      render: (_, __, index) =>
        (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Role Name",
      dataIndex: "roleName",
      width: "60%",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
      {
      title: "Created At",
      dataIndex: "createdAt",
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 120,
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
  );
}
