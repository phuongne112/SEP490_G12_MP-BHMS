import React from "react";
import { Table, Button, Space, Switch, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function ServiceTable({ services, pagination, loading, onEdit, onDelete, onTableChange }) {
  const columns = [
    {
      title: "Tên dịch vụ",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: "Giá (VND/đơn vị)",
      dataIndex: "price",
      key: "price",
      render: (value) => value ? value.toLocaleString("vi-VN") : "0",
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        const typeMap = {
          ELECTRICITY: "Điện",
          WATER: "Nước",
          OTHER: "Khác",
        };
        return typeMap[type] || type;
      },
    },
    {
      title: "Thao tác",
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
            title="Xóa dịch vụ"
            description="Bạn có chắc muốn xóa dịch vụ này?"
            onConfirm={() => onDelete(record.id)}
            okText="Xóa"
            cancelText="Không"
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
        showSizeChanger: false,
        showQuickJumper: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} mục`,
      }}
      bordered
      rowKey="id"
      loading={loading}
      onChange={onTableChange}
    />
  );
}
