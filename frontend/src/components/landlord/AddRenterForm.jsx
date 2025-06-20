import React from "react";
import {
  Button,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Row,
  Col,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

export default function AddRenterForm({ data, onChange, onNext }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Assign Renter to Room</h2>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Full Name">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Phone Number">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Citizen ID Number">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Date of Birth">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Permanent Address">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Issuing Authority">
              <Select defaultValue="Ha Noi">
                <Select.Option value="Ha Noi">Ha Noi</Select.Option>
                <Select.Option value="TP HCM">TP HCM</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Number of Room">
              <Select defaultValue="201">
                <Select.Option value="201">201</Select.Option>
                <Select.Option value="202">202</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Price (VND/Month)">
              <Input value="2.300.000" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Check-in Day">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="User Name">
              <Select>
                <Select.Option value="user1">user1</Select.Option>
                <Select.Option value="user2">user2</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Deposit">
              <Input value="2.300.000" disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Cycle">
              <Select defaultValue="3 months">
                <Select.Option value="1 month">1 month</Select.Option>
                <Select.Option value="3 months">3 months</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Upload Bill">
              <Upload>
                <Button icon={<UploadOutlined />}>Upload</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ textAlign: "right" }}>
          <Button type="primary" onClick={onNext}>
            Next
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
