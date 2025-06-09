import React, { useState } from "react";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import RoleTable from "../../components/admin/RoleTable";
import RoleFilterPopover from "../../components/admin/RoleFilterPopover";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Button,
  Space,
  Popover,
  Modal,
  Form,
  Input,
  Switch,
  Row,
  Col,
} from "antd";

const { Content } = Layout;

export default function AdminRoleListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "All", dateRange: null });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

  const handleCreateRole = (values) => {
    console.log("New role", values);
    setIsModalOpen(false);
    form.resetFields();
    // Gửi dữ liệu role lên backend tại đây
  };

  return (
    <Layout>
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
            <PageHeader title="- List Role -" />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Add new role
            </Button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox
                onSearch={setSearchTerm}
                placeholder="Enter role name..."
              />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <RoleFilterPopover
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
          <RoleTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
          />
          <Modal
            title="Add new Role"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={null}
            width={600}
            centered
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateRole}
              initialValues={{
                status: true,
                labels: { USERS: true, RENTER: false },
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Role Name"
                    rules={[
                      { required: true, message: "Please enter role name" },
                    ]}
                  >
                    <Input placeholder="Enter name" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="Active"
                      unCheckedChildren="Deactivate"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="Role Description">
                <Input.TextArea
                  rows={3}
                  placeholder="Enter role description..."
                />
              </Form.Item>

              <Form.Item label="Label" required>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {["USERS", "RENTER"].map((labelKey) => (
                    <div
                      key={labelKey}
                      style={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                        padding: "10px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{labelKey}</span>
                      <Form.Item
                        name={["labels", labelKey]}
                        valuePropName="checked"
                        noStyle
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <Switch />
                          <span style={{ fontSize: 18, color: "#555" }}>
                            {">"}
                          </span>
                        </div>
                      </Form.Item>
                    </div>
                  ))}
                </div>
              </Form.Item>

              <div style={{ textAlign: "right" }}>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Add
                </Button>
              </div>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
