import React from "react";
import { Table, Button, Space, Switch, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, HistoryOutlined, DollarOutlined } from "@ant-design/icons";

export default function ServiceTable({ services, pagination, loading, onEdit, onDelete, onTableChange, onUpdatePrice, onViewPriceHistory }) {
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
            type="default"
            icon={<EditOutlined />}
            onClick={() => onEdit && onEdit(record.id)}
            size="small"
            title="Chỉnh sửa thông tin dịch vụ"
          >
            Sửa
          </Button>
          <Button
            type="default"
            icon={<DollarOutlined />}
            onClick={() => onUpdatePrice && onUpdatePrice(record.id)}
            size="small"
            title="Cập nhật giá"
          >
            Giá
          </Button>
          <Button
            type="default"
            icon={<HistoryOutlined />}
            onClick={() => onViewPriceHistory && onViewPriceHistory(record.id)}
            size="small"
            title="Xem lịch sử giá"
          >
            Lịch sử
          </Button>
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
