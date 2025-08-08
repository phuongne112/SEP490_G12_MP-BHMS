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
  message,
  Alert,
  Drawer,
} from "antd";
import { FilterOutlined, PlusOutlined, MenuOutlined } from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";
import AdminSidebar from "../../components/layout/AdminSidebar";
import PageHeader from "../../components/common/PageHeader";
import NotificationTable from "../../components/admin/NotificationTable";
import SearchBox from "../../components/common/SearchBox";
import EntrySelect from "../../components/common/EntrySelect";
import NotificationFilterPopover from "../../components/admin/NotificationFilterPopover";
import Access from "../../components/common/Access";
import {
  sendNotification,
  sendMultipleNotifications,
  deleteNotification,
} from "../../services/notificationApi";
import { getAllUsers } from "../../services/userApi";
import { getCurrentUser } from "../../services/authService";
import { useDispatch } from "react-redux";
import { setUser } from "../../store/accountSlice";
import { useSelector } from "react-redux";

// Hàm chuyển đổi ngày sang định dạng Việt Nam chuẩn (dd/mm/yyyy)
const formatDateToVietnamese = (dateString) => {
  if (!dateString) return "";
  
  // Xử lý format "2025-07-28 16:11:04 PM" từ API
  let date;
  
  // Thử parse trực tiếp
  date = new Date(dateString);
  
  // Nếu không hợp lệ, thử xử lý format đặc biệt
  if (isNaN(date.getTime())) {
    // Tách phần ngày từ "2025-07-28 16:11:04 PM"
    const datePart = dateString.split(' ')[0];
    if (datePart) {
      date = new Date(datePart);
    }
  }
  
  // Kiểm tra xem ngày có hợp lệ không
  if (isNaN(date.getTime())) {
    return "";
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Hàm dịch loại thông báo
const translateNotificationType = (type) => {
  const typeMap = {
    'RENT_REMINDER': 'Nhắc nhở tiền phòng',
    'MAINTENANCE': 'Bảo trì',
    'BOOKING_STATUS': 'Trạng thái đặt phòng',
    'ANNOUNCEMENT': 'Thông báo chung',
    'SERVICE_UPDATE': 'Cập nhật dịch vụ',
    'USER_UPDATE': 'Cập nhật người dùng',
    'SYSTEM_MAINTENANCE': 'Bảo trì hệ thống',
    'CUSTOM': 'Tùy chỉnh'
  };
  return typeMap[type] || type;
};

// Hàm dịch trạng thái thông báo
const translateNotificationStatus = (status) => {
  const statusMap = {
    'SENT': 'Đã gửi',
    'DELIVERED': 'Đã gửi',
    'READ': 'Đã đọc',
    'UNREAD': 'Chưa đọc'
  };
  return statusMap[status] || status;
};

const { Content } = Layout;
const { Option } = Select;

export default function AdminNotificationPage() {
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "All",
    status: "All",
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
  const [userList, setUserList] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Thêm state cho danh sách người được chọn
  const [userSearchTerm, setUserSearchTerm] = useState(""); // Thêm state cho search user
  const [isSubmitting, setIsSubmitting] = useState(false); // Thêm state cho loading
  const [total, setTotal] = useState(0);
  const user = useSelector((state) => state.account.user);
  let currentUserId = Number(localStorage.getItem("userId"));
  if (!currentUserId || isNaN(currentUserId)) {
    currentUserId = user?.id;
  }
  const dispatch = useDispatch();
  const [userListLoaded, setUserListLoaded] = useState(false);

  // Mobile responsiveness states
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const updatedUser = await getCurrentUser();
        dispatch(
          setUser({
            id: updatedUser.id,
            fullName: updatedUser.name,
            role: updatedUser.role,
            permissions:
              updatedUser.role?.permissionEntities?.map((p) => p.name) || [],
          })
        );
      } catch (err) {
        console.error("Failed to refresh user permissions:", err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getAllUsers(0, 1000);
        const allUsers = res.result || [];
        const filtered = allUsers.filter((u) => Number(u.id) !== Number(currentUserId));
        setUserList(filtered);
        setUserListLoaded(true);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setUserList([]);
        setUserListLoaded(true);
      }
    };

    fetchUsers();
  }, [refreshKey]);

  const handleApplyFilter = (values) => {
    setFilters({
      type: values.type || "All",
      status: values.status || "All",
      dateRange: values.dateRange || null,
    });
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
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <style>
        {`
          @media (max-width: 768px) {
            .ant-layout-sider {
              display: none !important;
            }
          }
        `}
      </style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {!isMobile && (
          <div style={{ width: 220, background: "#001529", position: "fixed", height: "100vh", zIndex: 1000 }}>
            <AdminSidebar />
          </div>
        )}
        <div style={{ flex: 1, marginLeft: isMobile ? 0 : 220, display: "flex", flexDirection: "column" }}>
          {isMobile && (
            <div style={{
              background: "#001529",
              color: "white",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: 'white'
              }}>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  style={{ 
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
                <div style={{ fontSize: "18px", fontWeight: "600" }}>
                  Quản lý thông báo
                </div>
              </div>
            </div>
          )}
          <div style={{ flex: 1, padding: isMobile ? 16 : 24, backgroundColor: "#f5f5f5", minHeight: isMobile ? "calc(100vh - 60px)" : "100vh" }}>
            {/* Header Section */}
            <div style={{ 
              background: "white", 
              padding: isMobile ? "16px" : "20px", 
              borderRadius: "8px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)", 
              marginBottom: "20px" 
            }}>
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                marginBottom: "12px",
                gap: isMobile ? "12px" : 0
              }}>
                <PageHeader title="Danh sách thông báo" style={{ margin: 0, padding: 0 }} />
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  flexDirection: isMobile ? "column" : "row",
                  width: isMobile ? "100%" : "auto"
                }}>
                  <SearchBox onSearch={setSearchTerm} placeholder="Tìm thông báo..." style={{ width: isMobile ? "100%" : "auto" }} />
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
                      type="default"
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Bộ lọc
                    </Button>
                  </Popover>

                  <Access requiredPermissions={["Create Notification Send"]}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Thêm thông báo
                    </Button>
                  </Access>
                </div>
              </div>
              
              {/* Status bar */}
              <div style={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between", 
                alignItems: isMobile ? "stretch" : "center",
                borderTop: "1px solid #f0f0f0",
                paddingTop: "12px",
                fontSize: "14px",
                gap: isMobile ? "8px" : 0
              }}>
                <div style={{ color: "#666" }}>
                  Hiển thị
                  <Select
                    style={{ width: isMobile ? "100%" : 120, margin: "0 8px" }}
                    value={pageSize}
                    onChange={(value) => setPageSize(value)}
                    options={[5, 10, 20, 50].map((v) => ({ value: v, label: `${v} / trang` }))}
                  />
                  mục
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontWeight: 500, color: "#1890ff" }}>
                    Tổng: {total} thông báo
                  </span>
                </div>
              </div>
            </div>

            {/* Main Table Section */}
            {userListLoaded && (
              <div style={{ 
                background: "white", 
                borderRadius: "8px", 
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <NotificationTable
                  pageSize={pageSize}
                  searchTerm={searchTerm}
                  filters={filters}
                  onView={handleView}
                  onDelete={handleDelete}
                  refreshKey={refreshKey}
                  userList={userList}
                  onTotalChange={setTotal}
                />
              </div>
            )}

            {/* Create Notification Modal */}
            <Modal
              title="Tạo thông báo"
              open={isCreateModalOpen}
              onCancel={() => {
                setIsCreateModalOpen(false);
                createForm.resetFields();
                setSendMode("role");
                setSelectedUsers([]); // Reset selected users when closing modal
              }}
              footer={null}
              width={isMobile ? "95%" : 600}
            >
              <Form
                layout="vertical"
                form={createForm}
                initialValues={{ mode: "role" }}
                onFinish={async (values) => {
                  setIsSubmitting(true);
                  try {
                    const payloadBase = {
                      title: values.label,
                      message: values.content,
                      type: values.type,
                      // sendDate: values.date.format("YYYY-MM-DD"),
                      metadata: null,
                    };

                    if (values.mode === "individual") {
                      // Gửi cho nhiều người dùng được chọn
                      const recipientIds = values.recipientIds || [];
                      if (recipientIds.length === 0) {
                        message.error("Vui lòng chọn ít nhất một người dùng!");
                        setIsSubmitting(false);
                        return;
                      }
                      
                      // Sử dụng API mới để gửi cho nhiều người dùng
                      const payload = {
                        ...payloadBase,
                        recipientIds: recipientIds,
                      };
                      await sendMultipleNotifications(payload);
                    } else {
                      const filteredUserList = userList.filter(user => Number(user.id) !== Number(currentUserId));
                      console.log("currentUserId:", currentUserId);
                      console.log("userList:", userList.map(u => u.id));
                      console.log("filteredUserList:", filteredUserList.map(u => u.id));
                      const promises = filteredUserList.map((user) => {
                        const payload = {
                          ...payloadBase,
                          recipientId: user.id,
                        };
                        console.log("Sending to:", user.id);
                        return sendNotification(payload);
                      });
                      await Promise.all(promises);
                    }

                    message.success("Thông báo đã được gửi thành công!");
                    setIsCreateModalOpen(false);
                    createForm.resetFields();
                    setSendMode("role");
                    setSelectedUsers([]); // Reset selected users
                    setRefreshKey((prev) => prev + 1);
                  } catch (err) {
                    console.error("Send notification failed:", err);
                    message.error("Gửi thông báo thất bại");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="mode"
                      label="Chế độ gửi"
                      rules={[{ required: true }]}
                    >
                      <Select
                        onChange={(value) => {
                          setSendMode(value);
                          createForm.setFieldsValue({ recipientIds: undefined });
                          setSelectedUsers([]); // Reset selected users when changing mode
                        }}
                      >
                        <Option value="role">Theo vai trò (Tất cả người dùng)</Option>
                        <Option value="individual">Chọn người dùng cụ thể</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  {sendMode === "individual" && (
                    <Col span={24}>
                      <Form.Item
                        name="recipientIds"
                        label="Gửi đến người dùng"
                        rules={[{ required: true, message: "Vui lòng chọn ít nhất một người dùng!" }]}
                        extra="Bạn có thể tìm kiếm theo tên, email hoặc username. Chọn nhiều người dùng bằng cách click vào từng người."
                      >
                        <Select
                          mode="multiple"
                          placeholder="Tìm kiếm và chọn người dùng..."
                          showSearch
                          filterOption={(input, option) => {
                            const user = userList.find(u => u.id === option.value);
                            if (!user) return false;
                            const searchText = input.toLowerCase();
                            return (
                              (user.fullName && user.fullName.toLowerCase().includes(searchText)) ||
                              (user.email && user.email.toLowerCase().includes(searchText)) ||
                              (user.username && user.username.toLowerCase().includes(searchText))
                            );
                          }}
                          optionFilterProp="children"
                          onChange={(values) => {
                            const selectedUserObjects = values.map(id => 
                              userList.find(user => user.id === id)
                            ).filter(Boolean);
                            setSelectedUsers(selectedUserObjects);
                          }}
                          style={{ width: '100%' }}
                        >
                          {userList.map((user) => (
                            <Option key={user.id} value={user.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: '500' }}>
                                    {user.fullName || 'Chưa có tên'}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {user.email}
                                  </div>
                                </div>
                                {user.role && (
                                  <span style={{ fontSize: '11px', color: '#999', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>
                                    {user.role.name}
                                  </span>
                                )}
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      {/* Hiển thị danh sách người được chọn */}
                      {selectedUsers.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#1890ff' }}>
                            Đã chọn {selectedUsers.length} người dùng:
                          </div>
                          <div style={{ 
                            maxHeight: '120px', 
                            overflowY: 'auto', 
                            border: '1px solid #d9d9d9', 
                            borderRadius: '6px', 
                            padding: '8px',
                            backgroundColor: '#fafafa'
                          }}>
                            {selectedUsers.map((user, index) => (
                              <div key={user.id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '4px 0',
                                borderBottom: index < selectedUsers.length - 1 ? '1px solid #f0f0f0' : 'none'
                              }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                    {user.fullName || 'Chưa có tên'}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#666' }}>
                                    {user.email}
                                  </div>
                                </div>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  onClick={() => {
                                    const newSelectedUsers = selectedUsers.filter(u => u.id !== user.id);
                                    setSelectedUsers(newSelectedUsers);
                                    const newValues = newSelectedUsers.map(u => u.id);
                                    createForm.setFieldsValue({ recipientIds: newValues });
                                  }}
                                  style={{ padding: '0 4px' }}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Col>
                  )}

                  <Col span={24}>
                    <Form.Item
                      name="type"
                      label="Loại thông báo"
                      rules={[{ required: true }]}
                    >
                      <Select placeholder="Chọn loại">
                        <Option value="RENT_REMINDER">Nhắc nhở tiền phòng</Option>
                        <Option value="MAINTENANCE">Bảo trì</Option>
                        <Option value="BOOKING_STATUS">Trạng thái đặt phòng</Option>
                        <Option value="ANNOUNCEMENT">Thông báo chung</Option>
                        <Option value="SERVICE_UPDATE">Cập nhật dịch vụ</Option>
                        <Option value="USER_UPDATE">Cập nhật người dùng</Option>
                        <Option value="SYSTEM_MAINTENANCE">Bảo trì hệ thống</Option>
                        <Option value="CUSTOM">Tùy chỉnh</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item
                      name="label"
                      label="Tiêu đề"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="Nhập tiêu đề thông báo" />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item
                      name="content"
                      label="Nội dung"
                      rules={[
                        { required: true, message: "Please enter content!" },
                      ]}
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Nhập nội dung thông báo"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Button type="primary" htmlType="submit" block loading={isSubmitting}>
                  Tạo và gửi
                </Button>
              </Form>
            </Modal>

            {/* View Notification Detail Modal */}
            <Modal
              title="🔔 Chi Tiết Thông Báo"
              open={isViewModalOpen}
              onCancel={() => setIsViewModalOpen(false)}
              footer={[
                <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                  Xong
                </Button>,
              ]}
              width={isMobile ? "95%" : 520}
            >
              {selectedNotification && (
                <div>
                  <p>
                    <strong>Tiêu đề:</strong> {selectedNotification.title}
                  </p>
                  <p>
                    <strong>Nội dung:</strong> {selectedNotification.message}
                  </p>
                  <p>
                    <strong>Loại:</strong> {selectedNotification.displayType || translateNotificationType(selectedNotification.type)}
                  </p>
                  <p>
                    <strong>Trạng thái:</strong> {selectedNotification.displayStatus || translateNotificationStatus(selectedNotification.status)}
                  </p>
                  <p>
                    <strong>Ngày tạo:</strong>{" "}
                    {selectedNotification.createdDate ? formatDateToVietnamese(selectedNotification.createdDate) : ""}
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
                  message.success("Xóa thông báo thành công!");
                  setRefreshKey((prev) => prev + 1);
                } catch (error) {
                  console.error("Delete failed:", error);
                  message.error("Xóa thông báo thất bại!");
                } finally {
                  setIsDeleteModalOpen(false);
                  setSelectedNotification(null);
                }
              }}
              onCancel={() => setIsDeleteModalOpen(false)}
              okText="Có"
              cancelText="Hủy"
              width={isMobile ? "95%" : 520}
            />
          </div>
        </div>
      </div>
      {isMobile && (
        <Drawer title="Menu" placement="left" onClose={() => setMobileMenuOpen(false)} open={mobileMenuOpen} width={280} bodyStyle={{ padding: 0 }}>
          <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}
