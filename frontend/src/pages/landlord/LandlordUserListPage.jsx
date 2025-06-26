import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Input,
  Space,
  Popover,
  Modal,
  Form,
  message,
} from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import UserTable from "../../components/landlord/UserTable";
import UserFilterPopover from "../../components/landlord/UserFilterPopover";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { getAllUsers, createUser, updateUser } from "../../services/userApi";
import { createRenter } from "../../services/renterApi";

const { Sider, Content } = Layout;

export default function LandlordUserListPage() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const pageSize = 6;
  const navigate = useNavigate();
  const [renterModalOpen, setRenterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [renterForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let filterDSL = "";
      if (searchText) {
        filterDSL += `(username~'*${searchText}*' or email~'*${searchText}*')`;
      }
      if (filter.isActive !== undefined) {
        if (filterDSL) filterDSL += " and ";
        filterDSL += `isActive=${filter.isActive}`;
      }
      // Chỉ lấy user chưa có role
      if (filterDSL) filterDSL += " and ";
      filterDSL += "(role is null or role.roleName is null)";
      const res = await getAllUsers(currentPage - 1, pageSize, filterDSL);
      setUsers(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [searchText, filter, currentPage]);

  const handleFilter = (filterValues) => {
    setFilter(filterValues);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchEnter = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleAddUser = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);
      await createUser(values);
      message.success("Add user successfully!");
      addForm.resetFields();
      setAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err?.errorFields) return;
      message.error("Failed to add user!");
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRenter = async (user) => {
    try {
      await updateUser({
        id: user.id,
        username: user.username,
        email: user.email,
        role: { roleId: 2 },
      });
      message.success("Changed to Renter!");
      fetchUsers();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to change role");
    }
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              paddingTop: 4,
            }}
          >
            <PageHeader title="List User" />
            <Space>
              <Input
                placeholder="Search username or email"
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={handleSearch}
                onPressEnter={handleSearchEnter}
              />
            </Space>
          </div>

          <UserTable
            users={users}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              onChange: (page) => setCurrentPage(page),
              showSizeChanger: false,
            }}
            onChangeRenter={handleChangeRenter}
          />
          <Modal
            open={addModalOpen}
            title="Add New User"
            onCancel={() => {
              addForm.resetFields();
              setAddModalOpen(false);
            }}
            onOk={handleAddUser}
            confirmLoading={addLoading}
            okText="Add"
          >
            <Form form={addForm} layout="vertical">
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Phone Number">
                <Input />
              </Form.Item>
              <Form.Item name="fullName" label="Full Name">
                <Input />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
