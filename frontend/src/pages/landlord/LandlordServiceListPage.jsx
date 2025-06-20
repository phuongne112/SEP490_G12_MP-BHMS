// src/pages/landlord/LandlordServiceListPage.jsx
import React, { useState } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  DatePicker,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import ServiceTable from "../../components/landlord/ServiceTable";

const { Sider, Content } = Layout;

export default function LandlordServiceListPage() {
  const [services, setServices] = useState([
    {
      id: 1,
      name: "Water",
      price: 50000,
      status: true,
      startTime: "2024-01-01",
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleEdit = (id) => {
    console.log("Edit service with id:", id);
  };

  const handleDelete = (id) => {
    setServices(services.filter((item) => item.id !== id));
    message.success("Service deleted successfully");
  };

  const handleAddService = (values) => {
    const newService = {
      id: Date.now(),
      ...values,
    };
    setServices([...services, newService]);
    message.success("Service added successfully");
    form.resetFields();
    setIsModalOpen(false);
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ padding: 24 }}>
        <Content
          style={{
            background: "#fff",
            padding: 24,
            borderRadius: 8,
            minHeight: "100%",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <PageHeader title="List Service" />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Add Service
            </Button>
          </div>

          <div style={{ marginTop: 24 }}>
            <ServiceTable
              services={services}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <Modal
            title="Add New Service"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            onOk={() => form.submit()}
            okText="Save"
          >
            <Form layout="vertical" form={form} onFinish={handleAddService}>
              <Form.Item
                label="Service Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter service name" },
                ]}
              >
                <Input placeholder="Enter service name" />
              </Form.Item>

              <Form.Item
                label="Price (VND/person)"
                name="price"
                rules={[{ required: true, message: "Please enter price" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="Enter price"
                />
              </Form.Item>

              <Form.Item label="Status" name="status" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item label="Start Time" name="startTime">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
