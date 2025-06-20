import React from "react";
import { Table, Button, Space, Switch } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function ServiceTable({ services, onEdit, onDelete }) {
  const columns = [
    {
      title: "Name Service",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Price (VND/person)",
      dataIndex: "price",
      key: "price",
      render: (value) => value.toLocaleString("vi-VN"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Switch checked={status} disabled />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(record.id)} />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => onDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={services.map((s) => ({ ...s, key: s.id }))}
      columns={columns}
      pagination={{ pageSize: 5 }}
      bordered
    />
  );
}
