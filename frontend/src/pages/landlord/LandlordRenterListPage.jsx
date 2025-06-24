import React, { useState, useEffect } from "react";
import { Layout, Button, Input, Space, Popover, Modal, Form } from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RenterTable from "../../components/landlord/RenterTable";
import RenterFilterPopover from "../../components/landlord/RenterFilterPopover";
import PageHeader from "../../components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { getRoomsWithRenter } from "../../services/roomService";
import { createRenter } from "../../services/renterApi";
import { message } from "antd";

const { Sider, Content } = Layout;

export default function LandlordRenterListPage() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});
  const [roomOptions, setRoomOptions] = useState([]);
  const navigate = useNavigate();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await getRoomsWithRenter();
        setRoomOptions(
          res.result?.map((r) => r.roomNumber || r.roomName) || []
        );
      } catch (err) {
        setRoomOptions([]);
      }
    }
    fetchRooms();
  }, []);

  const handleFilter = (filterValues) => {
    setFilter(filterValues);
  };

  const handleAddRenter = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);
      await createRenter(values);
      message.success("Add renter successfully!");
      addForm.resetFields();
      setAddModalOpen(false);
      setFilter({ ...filter }); // reload bảng
    } catch (err) {
      if (err?.errorFields) return;
      message.error("Failed to add renter!");
    } finally {
      setAddLoading(false);
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
            <PageHeader title="List Renter" />
            <Space>
              <Input
                placeholder="Search renter name or room"
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => {}}
              />
              <Popover
                content={
                  <RenterFilterPopover
                    onFilter={handleFilter}
                    roomOptions={roomOptions}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Popover>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/landlord/renters/add")}
              >
                Add Renter
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setAddModalOpen(true)}
              >
                Add New Renter
              </Button>
            </Space>
          </div>

          <RenterTable search={searchText} filter={filter} />
          <Modal
            open={addModalOpen}
            title="Add New Renter"
            onCancel={() => {
              addForm.resetFields();
              setAddModalOpen(false);
            }}
            onOk={handleAddRenter}
            confirmLoading={addLoading}
            okText="Add"
          >
            <Form form={addForm} layout="vertical">
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[{ required: true }]}
              >
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[{ required: true }]}
              >
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item name="citizenId" label="Citizen ID Number">
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item name="address" label="Address">
                {" "}
                <Input />{" "}
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
