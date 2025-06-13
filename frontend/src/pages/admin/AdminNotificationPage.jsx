import React, { useState, useEffect } from "react";
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
import {
  sendNotification,
  deleteNotification,
} from "../../services/notificationApi";
import { getAllUsers } from "../../services/userApi"; // ✅ Thêm API lấy danh sách user
import { message } from "antd";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [sendMode, setSendMode] = useState("role");
  const [userList, setUserList] = useState([]); // ✅ Danh sách user

  useEffect(() => {
    if (isCreateModalOpen) {
      getAllUsers({ page: 0, size: 1000 })
        .then((res) => {
          setUserList(res.data.result || []);
        })
        .catch(() => {
          message.error("Failed to load user list");
        });
    }
  }, [isCreateModalOpen]);

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
            refreshKey={refreshKey}
          />

          {/* Create Notification Modal */}
          <Modal
            title="Create Notification"
            open={isCreateModalOpen}
            onCancel={() => {
              setIsCreateModalOpen(false);
              createForm.resetFields();
              setSendMode("role"); // Reset lại mode
            }}
            footer={null}
            width={600}
          >
            <Form
              layout="vertical"
              form={createForm}
              initialValues={{ mode: "role" }}
              onFinish={async (values) => {
                try {
                  const payloadBase = {
                    title: values.label,
                    message: values.label,
                    type: values.type,
                    sendDate: values.date.format("YYYY-MM-DD"),
                    metadata: null,
                  };

                  if (values.mode === "individual") {
                    // Gửi cho 1 người
                    const payload = {
                      ...payloadBase,
                      recipientId: values.recipientId,
                    };
                    await sendNotification(payload);
                  } else {
                    // Gửi cho tất cả user
                    const promises = userList.map((user) => {
                      const payload = { ...payloadBase, recipientId: user.id };
                      return sendNotification(payload);
                    });

                    await Promise.all(promises);
                  }

                  message.success("Notification(s) sent successfully!");
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                  setSendMode("role");
                  setRefreshKey((prev) => prev + 1);
                } catch (err) {
                  console.error("Send notification failed:", err);
                  message.error("Failed to send notification");
                }
              }}
            >
              <Row gutter={16}>
                {/* Send Mode */}
                <Col span={24}>
                  <Form.Item
                    name="mode"
                    label="Send Mode"
                    rules={[{ required: true }]}
                  >
                    <Select
                      onChange={(value) => {
                        setSendMode(value);
                        createForm.setFieldsValue({
                          recipientId: undefined,
                        });
                      }}
                    >
                      <Option value="role">To Role (All Users)</Option>
                      <Option value="individual">To Individual</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {/* Only show when mode is individual */}
                {sendMode === "individual" && (
                  <Col span={24}>
                    <Form.Item
                      name="recipientId"
                      label="Send to User"
                      rules={[
                        { required: true, message: "Please select a user" },
                      ]}
                    >
                      <Select placeholder="Select a user">
                        {userList.map((user) => (
                          <Option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}

                {/* Send Date */}
                <Col span={12}>
                  <Form.Item
                    name="date"
                    label="Send date"
                    rules={[
                      { required: true, message: "Please select a date" },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                {/* Type */}
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="Type notification"
                    rules={[
                      { required: true, message: "Please select a type" },
                    ]}
                  >
                    <Select placeholder="Select a type">
                      <Option value="RENT_REMINDER">Rent Reminder</Option>
                      <Option value="MAINTENANCE">Maintenance</Option>
                      <Option value="BOOKING_STATUS">Booking Status</Option>
                      <Option value="ANNOUNCEMENT">Announcement</Option>
                      <Option value="PAYMENT_SUCCESS">Payment Success</Option>
                      <Option value="PAYMENT_FAILED">Payment Failed</Option>
                      <Option value="CUSTOM">Custom</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {/* Label */}
                <Col span={24}>
                  <Form.Item
                    name="label"
                    label="Label"
                    rules={[{ required: true, message: "Please enter label" }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Enter notification content"
                    />
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
            onOk={async () => {
              try {
                await deleteNotification(selectedNotification.id);
                message.success("Notification deleted successfully");
                setIsDeleteModalOpen(false);
                setSelectedNotification(null);
                setRefreshKey((prev) => prev + 1);
              } catch (error) {
                console.error("Delete failed:", error);
                message.error("Failed to delete notification");
              }
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
