import React from "react";
import { Table, Button, Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const columns = [
  { title: "Id", dataIndex: "id", key: "id" },
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Status", dataIndex: "status", key: "status" },
  { title: "CreatedAt", dataIndex: "createdAt", key: "createdAt" },
  { title: "UpdateAt", dataIndex: "updateAt", key: "updateAt" },
  {
    title: "Actions",
    key: "actions",
    render: (_, record) => (
      <Space>
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} />
        </Tooltip>
        <Tooltip title="Delete">
          <Button danger icon={<DeleteOutlined />} />
        </Tooltip>
      </Space>
    ),
  },
];

const mockData = [
  {
    id: 1,
    name: "Landlord",
    status: "Active",
    createdAt: "26/01/2024",
    updatedAt: "---",
  },
  {
    id: 2,
    name: "Renter",
    status: "Inactive",
    createdAt: "26/03/2024",
    updatedAt: "---",
  },
  {
    id: 3,
    name: "User",
    status: "Active",
    createdAt: "26/01/2024",
    updatedAt: "---",
  },
];

export default function RoleTable({ pageSize, searchTerm, filters }) {
  const filteredData = mockData
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((item) =>
      filters.status === "All" ? true : item.status === filters.status
    )
    .filter((item) => {
      if (!filters.dateRange) return true;
      const created = new Date(item.createdAt);
      return (
        created >= filters.dateRange[0].toDate() &&
        created <= filters.dateRange[1].toDate()
      );
    });

  return (
    <Table
      columns={columns}
      dataSource={filteredData}
      rowKey="id"
      pagination={{ pageSize }}
    />
  );
}
