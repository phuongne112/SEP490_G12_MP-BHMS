import React, { useState } from "react";
import { Table, Input, Button, Space, Row } from "antd";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";

export default function AddRoommateForm({ data, onChange, onBack, onSave }) {
  const [roommates, setRoommates] = useState([
    { fullName: "", dob: "", phone: "", idNumber: "" },
  ]);

  const handleChange = (index, key, value) => {
    const updated = [...roommates];
    updated[index][key] = value;
    setRoommates(updated);
    onChange?.(updated);
  };

  const addRow = () => {
    setRoommates([
      ...roommates,
      { fullName: "", dob: "", phone: "", idNumber: "" },
    ]);
  };

  const removeRow = (index) => {
    const updated = [...roommates];
    updated.splice(index, 1);
    setRoommates(updated);
    onChange?.(updated);
  };

  const columns = [
    {
      title: "Full Name",
      dataIndex: "fullName",
      render: (_, __, index) => (
        <Input
          placeholder="..."
          value={roommates[index].fullName}
          onChange={(e) => handleChange(index, "fullName", e.target.value)}
        />
      ),
    },

    {
      title: "Date of Birth",
      dataIndex: "dob",
      render: (_, __, index) => (
        <Input
          placeholder="..."
          value={roommates[index].dob}
          onChange={(e) => handleChange(index, "dob", e.target.value)}
        />
      ),
    },

    {
      title: "Phone Number",
      dataIndex: "phone",
      render: (_, __, index) => (
        <Input
          placeholder="..."
          value={roommates[index].phone}
          onChange={(e) => handleChange(index, "phone", e.target.value)}
        />
      ),
    },

    {
      title: "Citizen identification number",
      dataIndex: "idNumber",
      render: (_, __, index) => (
        <Input
          placeholder="..."
          value={roommates[index].idNumber}
          onChange={(e) => handleChange(index, "idNumber", e.target.value)}
        />
      ),
    },

    {
      title: "",
      key: "action",
      render: (_, __, index) => (
        <Button
          danger
          icon={<MinusOutlined />}
          onClick={() => removeRow(index)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>Add Roommate</h2>

      <Table
        dataSource={roommates}
        columns={columns}
        pagination={false}
        bordered
        rowKey={(_, index) => index}
        scroll={{ x: 800 }}
      />
      <Row justify="end" style={{ marginTop: 16, marginRight: 54 }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={addRow} />
      </Row>

      <Row justify="end" style={{ marginTop: 24 }}>
        <Space>
          <Button danger onClick={onBack}>
            Back
          </Button>
          <Button type="primary" onClick={onSave}>
            Save
          </Button>
        </Space>
      </Row>
    </div>
  );
}
