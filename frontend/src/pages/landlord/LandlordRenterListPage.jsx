import React, { useState, useEffect } from "react";
import { Layout, Button, Input, Space, Popover, Modal, Form, message, Select, Pagination } from "antd";
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
import { getAllRenters } from "../../services/renterApi";

const { Sider, Content } = Layout;

export default function LandlordRenterListPage() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});
  const [roomOptions, setRoomOptions] = useState([]);
  const [renters, setRenters] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 20, 50];
  const [loading, setLoading] = useState(false);
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

  const fetchRenters = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getAllRenters(page - 1, size, filter);
      setRenters(res.result || res.data || []);
      setTotal(res.meta?.total ?? res.total ?? (res.result?.length ?? res.data?.length ?? 0));
    } catch (err) {
      message.error("Failed to load renters");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRenters(currentPage, pageSize);
    // eslint-disable-next-line
  }, [searchText, filter, currentPage, pageSize]);

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchRenters(1, value);
  };

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
            </Space>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              Show
              <Select
                style={{ width: 80, margin: "0 8px" }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              entries
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Total: {total} renters
            </div>
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
