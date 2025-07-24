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
      let cleanFilter = { ...filter };
      if (cleanFilter.checkInDateRange) {
        if (cleanFilter.checkInDateRange[0]) {
          cleanFilter.checkInDateFrom = cleanFilter.checkInDateRange[0].format
            ? cleanFilter.checkInDateRange[0].format("YYYY-MM-DD")
            : cleanFilter.checkInDateRange[0];
        }
        if (cleanFilter.checkInDateRange[1]) {
          cleanFilter.checkInDateTo = cleanFilter.checkInDateRange[1].format
            ? cleanFilter.checkInDateRange[1].format("YYYY-MM-DD")
            : cleanFilter.checkInDateRange[1];
        }
        delete cleanFilter.checkInDateRange;
      }
      Object.keys(cleanFilter).forEach(
        (key) => (cleanFilter[key] == null || cleanFilter[key] === "") && delete cleanFilter[key]
      );
      const res = await getAllRenters(page - 1, size, cleanFilter);
      setRenters(res.result || res.data || []);
      setTotal(res.meta?.total ?? res.total ?? (res.result?.length ?? res.data?.length ?? 0));
    } catch (err) {
      message.error("Không thể tải danh sách người thuê");
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
    console.log('Filter applied:', filterValues);
    setFilter({ ...filterValues }); // clone object để luôn trigger re-render
  };

  const handleAddRenter = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);
      await createRenter(values);
      message.success("Thêm người thuê thành công!");
      addForm.resetFields();
      setAddModalOpen(false);
      setFilter({ ...filter }); // reload bảng
    } catch (err) {
      // Nếu backend trả về lỗi dạng data object, set lỗi cho từng trường
      const fieldErrors = err.response?.data?.data;
      if (fieldErrors && typeof fieldErrors === "object") {
        addForm.setFields(
          Object.entries(fieldErrors).map(([field, message]) => ({
            name: field,
            errors: [message],
          }))
        );
        return;
      }
      if (err?.errorFields) return;
      message.error("Thêm người thuê thất bại!");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
          <div style={{ 
            background: 'white', 
            padding: 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 20
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <PageHeader title="Danh sách người thuê" style={{ margin: 0, padding: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Input
                  placeholder="Tìm tên người thuê hoặc phòng"
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
                  <Button icon={<FilterOutlined />} type="default">Bộ lọc</Button>
                </Popover>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/landlord/renters/add")}
                >
                  Thêm người thuê
                </Button>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              fontSize: 14
            }}>
              <div style={{ color: '#666' }}>
                Hiển thị
                <Select
                  style={{ width: 120, margin: "0 8px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={pageSizeOptions.map((v) => ({ value: v, label: `${v} / trang` }))}
                />
                mục
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontWeight: 500, color: "#1890ff" }}>
                  Tổng: {total} người thuê
                </span>
              </div>
            </div>
          </div>
          
          {/* Main Table Section */}
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <RenterTable search={searchText} filter={filter} />
          </div>

          <Modal
            open={addModalOpen}
            title="Thêm người thuê mới"
            onCancel={() => {
              addForm.resetFields();
              setAddModalOpen(false);
            }}
            onOk={handleAddRenter}
            confirmLoading={addLoading}
            okText="Thêm"
          >
            <Form form={addForm} layout="vertical">
              <Form.Item
                name="fullName"
                label="Họ và tên"
                rules={[{ required: true }]}
              >
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item
                name="phoneNumber"
                label="Số điện thoại"
                rules={[{ required: true }]}
              >
                {" "}
                <Input />{" "}
              </Form.Item>
              <Form.Item name="citizenId" label="Số CCCD">
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
