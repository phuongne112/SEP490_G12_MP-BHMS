import React from "react";
import { Table, Button, Space, Switch, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function ServiceTable({ services, pagination, loading, onEdit, onDelete, onTableChange }) {
  const columns = [
    {
      title: "Service Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: "Price (VND/unit)",
      dataIndex: "price",
      key: "price",
      render: (value) => value ? value.toLocaleString("vi-VN") : "0",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        const typeMap = {
          ELECTRICITY: "Electricity",
          WATER: "Water",
          OTHER: "Other",
        };
        return typeMap[type] || type;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => onEdit(record.id)}
            size="small"
          />
          <Popconfirm
            title="Delete the service"
            description="Are you sure you want to delete this service?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={services.map((s) => ({ ...s, key: s.id }))}
      columns={columns}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
      }}
      bordered
      rowKey="id"
      loading={loading}
      onChange={onTableChange}
    />
  );
}
