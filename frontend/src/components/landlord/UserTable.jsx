import React from "react";
import { Table, Button, Space, Popconfirm } from "antd";

export default function UserTable({ users, loading, pagination, onChangeRenter }) {
  const columns = [
    {
      title: "No.",
      dataIndex: "no",
      align: "center",
      render: (_, __, index) => (pagination && pagination.current ? (pagination.current - 1) * (pagination.pageSize || 10) + index + 1 : index + 1),
      width: 60,
    },
    {
      title: "Username",
      dataIndex: "username",
      align: "center",
    },
    {
      title: "Full Name",
      align: "center",
      render: (_, record) => record.userInfo?.fullName || record.fullName || "---",
    },
    {
      title: "Email",
      dataIndex: "email",
      align: "center",
    },
    {
      title: "Phone",
      align: "center",
      render: (_, record) => record.userInfo?.phoneNumber || record.phoneNumber || "---",
    },
    {
      title: "Actions",
      align: "center",
      render: (_, record) => (
        <Space>
          {(!record.role || !record.role.roleName) && onChangeRenter && (
            <Popconfirm
              title="Are you sure you want to change this user to renter?"
              onConfirm={() => onChangeRenter(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="primary">Change Renter</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={users}
      loading={loading}
      rowKey="id"
      pagination={pagination}
    />
  );
} 