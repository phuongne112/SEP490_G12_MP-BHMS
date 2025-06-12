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
  Select,
  DatePicker,
} from "antd";
import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import NotificationTable from "../../components/admin/NotificationTable";
import SearchBox from "../../components/common/SearchBox";
import EntrySelect from "../../components/common/EntrySelect";
import NotificationFilterPopover from "../../components/admin/NotificationFilterPopover";
import { FaBell } from "react-icons/fa";
import { Badge, Tooltip } from "antd";
import { sendNotification } from "../../services/notificationApi";

const { Content } = Layout;
const { Option } = Select;

export default function AdminNotificationPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    role: "All",
    event: "All",
    dateRange: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [createForm] = Form.useForm();

  const handleApplyFilter = (values) => {
    setFilters(values);
  };

  const handleView = (record) => {
    setSelectedNotification(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = (record) => {
    setSelectedNotification(record);
    setIsDeleteModalOpen(true);
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
            <PageHeader title="List Notification" />
            <Space style={{ gap: 20 }}>
              <Badge count={3} offset={[-2, 2]} size="small">
                <FaBell
                  size={20}
                  style={{ color: "#555", cursor: "pointer" }}
                  title="New notifications"
                />
              </Badge>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add New
              </Button>
            </Space>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <EntrySelect value={pageSize} onChange={setPageSize} />
            <Space style={{ gap: 100 }}>
              <SearchBox onSearch={setSearchTerm} />
              <Popover
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                content={
                  <NotificationFilterPopover
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

          <NotificationTable
            pageSize={pageSize}
            searchTerm={searchTerm}
            filters={filters}
            onView={handleView}
            onDelete={handleDelete}
          />

          {/* Create Notification Modal */}
          <Modal
            title="Create Notification"
            open={isCreateModalOpen}
            onCancel={() => setIsCreateModalOpen(false)}
            footer={null}
            width={600}
          >
            <Form
              layout="vertical"
              form={createForm}
              onFinish={async (values) => {
                try {
                  const payload = {
                    title: values.label,
                    message: values.label,
                    type: values.type,
                    role: values.role,
                    recipientId: 1,
                    sendDate: values.date.format("YYYY-MM-DD"), // hoặc createdDate nếu backend yêu cầu
                  };

                  await sendNotification(payload); // ✅ gọi API gửi luôn
                  message.success("Notification sent successfully!");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();

                  // Optional: nếu muốn reload bảng notification ngay
                  // setRefreshKey((prev) => prev + 1); // cần thêm state refreshKey nếu dùng
                } catch (err) {
                  console.error("Send notification failed:", err);
                  message.error("Failed to send notification");
                }
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Send to Role"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="Renter">Renter</Option>
                      <Option value="Landlord">Landlord</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="date"
                    label="Send date"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="type"
                    label="Type notification"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="Bill">Bill</Option>
                      <Option value="Reminder">Reminder</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="label"
                    label="Label"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" block>
                Create and send
              </Button>
            </Form>
          </Modal>

          {/* View Notification Detail Modal */}
          <Modal
            title="🔔 Notification Detail"
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                Done
              </Button>,
            ]}
          >
            {selectedNotification && (
              <div>
                <p>
                  <strong>Title:</strong> {selectedNotification.title}
                </p>
                <p>
                  <strong>Message:</strong> {selectedNotification.message}
                </p>
                <p>
                  <strong>Type:</strong> {selectedNotification.type}
                </p>
                <p>
                  <strong>Status:</strong> {selectedNotification.status}
                </p>
                <p>
                  <strong>Created Date:</strong> {selectedNotification.date}
                </p>
              </div>
            )}
          </Modal>

          {/* Confirm Delete Notification */}
          <Modal
            title="Are you sure you want to delete this notification?"
            open={isDeleteModalOpen}
            onOk={() => {
              console.log("Deleting:", selectedNotification);
              setIsDeleteModalOpen(false);
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="Yes"
            cancelText="Cancel"
          />
        </Content>
      </Layout>
    </Layout>
  );
}
