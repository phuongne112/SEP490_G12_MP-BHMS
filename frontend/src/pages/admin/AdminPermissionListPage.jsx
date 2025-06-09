import React, { useState } from "react";
import {
  Layout,
  Button,
  Space,
  Popover,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
} from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import EntrySelect from "../../components/common/EntrySelect";
import SearchBox from "../../components/common/SearchBox";
import PermissionTable from "../../components/admin/PermissionTable";
import PermissionFilterPopover from "../../components/admin/PermissionFilterPopover";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";

const { Content } = Layout;
const { Option } = Select;

export default function AdminPermissionListPage() {
  const [pageSize, setPageSize] = useState(5);
  const [search, setSearch] = useState({ name: "", api: "" });
  const [filters, setFilters] = useState({ module: "All", method: "All" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

  const handleCreatePermission = (values) => {
    alert("New Permission:", values);
    setIsModalOpen(false);
    form.resetFields();
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
            <PageHeader title="List Permission" />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Add new Permission
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
            <Space direction="horizontal" style={{ gap: 30 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>Name</label>
                <SearchBox
                  placeholder="Enter name..."
                  onSearch={(val) =>
                    setSearch((prev) => ({ ...prev, name: val }))
                  }
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>API</label>
                <SearchBox
                  placeholder="Enter API..."
                  onSearch={(val) =>
                    setSearch((prev) => ({ ...prev, api: val }))
                  }
                />
              </div>
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <PermissionFilterPopover
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
                  style={{
                    backgroundColor: "#40a9ff",
                    color: "white",
                    marginTop: 25,
                  }}
                >
                  Filter
                </Button>
              </Popover>
            </Space>
          </div>
          <PermissionTable
            pageSize={pageSize}
            search={search}
            filters={filters}
          />

          <Modal
            title="Add new Permission"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreatePermission}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Permission name"
                    rules={[
                      {
                        required: true,
                        message: "Please enter permission name",
                      },
                    ]}
                  >
                    <Input placeholder="Enter here..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="api"
                    label="API Path"
                    rules={[
                      { required: true, message: "Please enter API path" },
                    ]}
                  >
                    <Input placeholder="Enter here..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="method"
                    label="Method"
                    rules={[
                      { required: true, message: "Please select method" },
                    ]}
                  >
                    <Select placeholder="Select a method...">
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="module"
                    label="Module"
                    rules={[
                      { required: true, message: "Please select module" },
                    ]}
                  >
                    <Select placeholder="Select a module...">
                      <Option value="User">User</Option>
                      <Option value="Renter">Renter</Option>
                      <Option value="Room">Room</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ textAlign: "right" }}>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Create new
                </Button>
              </div>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
