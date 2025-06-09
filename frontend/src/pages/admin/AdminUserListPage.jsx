import React, { useState } from "react";
import {
  Layout,
  Button,
  Space,
  Popover,
  Modal,
  Form,
  Input,
  Row,
  Col,
} from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import UserTable from "../../components/admin/UserTable";
import SearchBox from "../../components/common/SearchBox";
import EntrySelect from "../../components/common/EntrySelect";
import { FilterOutlined } from "@ant-design/icons";
import UserFilterPopover from "../../components/admin/UserFilterPopover";

const { Content } = Layout;

export default function AdminUserListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ role: "All", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateEmail, setUpdateEmail] = useState("nguyenvana02@gmail.com");

  const [createForm] = Form.useForm();
  const [updateForm] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values); // { role: 'Landlord', dateRange: [start, end] }
  };
  const handleEditUser = (email) => {
    setUpdateEmail(email); // gán email cho ô Old Email
    setIsUpdateModalOpen(true); // mở modal
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AdminSidebar />
      <Layout style={{ marginLeft: 220 }}>
        <Content style={{ padding: "32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <PageHeader title="📋 List User Account" />
            <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
              Add User
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              marginTop: 30,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox onSearch={setSearchTerm} />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <UserFilterPopover
                    onApply={(values) => {
                      handleApplyFilter(values);
                      setIsFilterOpen(false);
                    }}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button
                  icon={<FilterOutlined />}
                  style={{ backgroundColor: "#40a9ff", color: "white" }}
                >
                  Filter
                </Button>
              </Popover>
            </Space>
          </div>
          <UserTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            onEdit={handleEditUser}
          />

          <Modal
            title="Create User Account"
            open={isCreateModalOpen}
            onCancel={() => setIsCreateModalOpen(false)}
            footer={null}
            width={700}
          >
            <Form
              layout="vertical"
              form={createForm}
              onFinish={(values) => console.log("Create:", values)}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="username" label="Username">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fullName" label="Full Name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true }]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Re-enter Password"
                    dependencies={["password"]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return value === getFieldValue("password")
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error("Passwords do not match")
                              );
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" block>
                Create User
              </Button>
            </Form>
          </Modal>

          <Modal
            title="Update User Account"
            open={isUpdateModalOpen}
            onCancel={() => setIsUpdateModalOpen(false)}
            footer={null}
            width={700}
          >
            <Form
              layout="vertical"
              form={updateForm}
              onFinish={(values) => console.log("Update:", values)}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Old Email">
                    <Input value={updateEmail} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="newEmail"
                    label="New Email"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true }]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Re-enter Password"
                    dependencies={["password"]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return value === getFieldValue("password")
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error("Passwords do not match")
                              );
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" block>
                Update User
              </Button>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
