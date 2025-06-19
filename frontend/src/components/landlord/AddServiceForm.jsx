import React from "react";
import { Button, Table, InputNumber, Checkbox, Space, Row } from "antd";

const serviceData = [
  { key: "1", name: "Water", price: 50000 },
  { key: "2", name: "Parking", price: 60000 },
  { key: "3", name: "Internet", price: 50000 },
  { key: "4", name: "Trash", price: 50000 },
];

export default function AddServiceForm({ data, onChange, onNext, onBack }) {
  const columns = [
    {
      title: "Pick",
      dataIndex: "pick",
      render: (_, record) => <Checkbox defaultChecked />,
    },
    {
      title: "Name service",
      dataIndex: "name",
    },
    {
      title: "Price",
      dataIndex: "price",
      render: (price) => `${price.toLocaleString()} VND`,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: () => <InputNumber min={1} defaultValue={1} />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>Add Service</h2>
      <Table
        bordered
        dataSource={serviceData}
        columns={columns}
        pagination={false}
      />
      <Row justify="end" style={{ marginTop: 24, marginRight: 20 }}>
        <Space>
          <Button onClick={onBack}>Back</Button>
          <Button type="primary" onClick={onNext}>
            Next
          </Button>
        </Space>
      </Row>
    </div>
  );
}
