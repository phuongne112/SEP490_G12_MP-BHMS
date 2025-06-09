import React from "react";
import { Table, Button, Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const mockData = [
  {
    id: 1,
    name: "Create user",
    api: "/api/users",
    method: "GET",
    module: "User",
    updatedAt: "26/09/2024",
  },
  {
    id: 2,
    name: "Create user",
    api: "/api/users",
    method: "DELETE",
    module: "User",
    updatedAt: "29/09/2024",
  },
  {
    id: 3,
    name: "Create user",
    api: "/api/renters",
    method: "POST",
    module: "Renter",
    updatedAt: "28/09/2024",
  },
  {
    id: 4,
    name: "Create user",
    api: "/api/users",
    method: "DELETE",
    module: "User",
    updatedAt: "29/09/2024",
  },
];

export default function PermissionTable({
  pageSize,
  search,
  filters,
  onEditPermission,
  onDeletePermission,
}) {
  const filteredData = mockData
    .filter((item) =>
      item.name.toLowerCase().includes(search.name.toLowerCase())
    )
    .filter((item) => item.api.toLowerCase().includes(search.api.toLowerCase()))
    .filter((item) =>
      filters.module === "All" ? true : item.module === filters.module
    )
    .filter((item) =>
      filters.method === "All" ? true : item.method === filters.method
    );

  const columns = (onEditPermission) => [
    { title: "Id", dataIndex: "id", key: "id" },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "API", dataIndex: "api", key: "api" },
    { title: "Method", dataIndex: "method", key: "method" },
    { title: "Module", dataIndex: "module", key: "module" },
    { title: "UpdatedAt", dataIndex: "updatedAt", key: "updatedAt" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => onEditPermission(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeletePermission(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns(onEditPermission)}
      dataSource={filteredData}
      rowKey="id"
      pagination={{ pageSize }}
    />
  );
}
