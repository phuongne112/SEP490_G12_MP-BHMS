import React, { useState, useEffect } from "react";
import { Layout, Pagination, Input, Button, Space, Popover, message, Form, InputNumber, Select, Upload, Switch, Modal, Card, Row, Col } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RoomTable from "../../components/landlord/RoomTable";
import RoomFilterPopover from "../../components/landlord/RoomFilterPopover";
import PageHeader from "../../components/common/PageHeader"; // ✅ Dùng PageHeader
import { useNavigate } from "react-router-dom"; 
import { getAllRooms } from "../../services/roomService";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { useMediaQuery } from "react-responsive";
import axiosClient from "../../services/axiosClient";

import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

const mockRooms = [
  {
    id: 1,
    name: "Room 201 - Building B",
    price: 2300000,
    status: "Available",
    image: image1,
  },
  {
    id: 2,
    name: "Room 202 - Building B",
    price: 2000000,
    status: "Full",
    image: image2,
  },
  {
    id: 3,
    name: "Room 203 - Building B",
    price: 2500000,
    status: "Full",
    image: image1,
  },
  {
    id: 4,
    name: "Room 204 - Building B",
    price: 2100000,
    status: "Available",
    image: image2,
  },
  {
    id: 5,
    name: "Room 205 - Building B",
    price: 2600000,
    status: "Available",
    image: image1,
  },
];

export default function LandlordRoomListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({
    status: null,
    priceRange: [null, null],
    areaRange: [null, null],
    bedroomsRange: [null, null],
    bathroomsRange: [null, null],
    hasAsset: null,
    isActive: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);
  const pageSize = isMobile ? 4 : 6;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.account.user);

  // Add room modal states
  const [addRoomModalVisible, setAddRoomModalVisible] = useState(false);
  const [addRoomForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [addRoomLoading, setAddRoomLoading] = useState(false);

  // Tạo filter DSL cho backend
  const buildFilterDSL = () => {
    let filters = [];
    if (search) filters.push(`roomNumber~'*${search}*'`);
    if (filter.status) filters.push(`roomStatus='${filter.status}'`);
    if (filter.priceRange?.[0] != null) filters.push(`pricePerMonth>=${filter.priceRange[0]}`);
    if (filter.priceRange?.[1] != null) filters.push(`pricePerMonth<=${filter.priceRange[1]}`);
    
    if (filter.areaRange?.[0] != null) filters.push(`area>=${filter.areaRange[0]}`);
    if (filter.areaRange?.[1] != null) filters.push(`area<=${filter.areaRange[1]}`);

    if (filter.bedroomsRange?.[0] != null) filters.push(`numberOfBedrooms>=${filter.bedroomsRange[0]}`);
    if (filter.bedroomsRange?.[1] != null) filters.push(`numberOfBedrooms<=${filter.bedroomsRange[1]}`);

    if (filter.bathroomsRange?.[0] != null) filters.push(`numberOfBathrooms>=${filter.bathroomsRange[0]}`);
    if (filter.bathroomsRange?.[1] != null) filters.push(`numberOfBathrooms<=${filter.bathroomsRange[1]}`);
    
    if (filter.hasAsset === "true") {
      filters.push("assets IS NOT EMPTY");
    } else if (filter.hasAsset === "false") {
      filters.push("assets IS EMPTY");
    }

    if (filter.isActive != null) filters.push(`isActive=${filter.isActive}`);
    
    return filters.join(" and ");
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL();
      const res = await getAllRooms(currentPage - 1, pageSize, filterDSL);
      setRooms(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Không thể tải danh sách phòng");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line
  }, [search, filter, currentPage]);

  const handleSearch = () => setCurrentPage(1);
  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  // Add room modal functions
  const handleUploadChange = ({ fileList: newFileList }) => {
    if (newFileList.length <= 8) {
      setFileList(newFileList);
    } else {
      message.warning("Chỉ được upload tối đa 8 ảnh!");
    }
  };

  const handleAddRoomModalOpen = () => {
    setAddRoomModalVisible(true);
    addRoomForm.resetFields();
    setFileList([]);
  };

  const handleAddRoomModalClose = () => {
    setAddRoomModalVisible(false);
    addRoomForm.resetFields();
    setFileList([]);
  };

  const handleAddRoomFinish = async (values) => {
    setAddRoomLoading(true);
    try {
      const roomNumber = values.building + values.roomNumberSuffix;
      const roomDTO = {
        roomNumber,
        area: values.area,
        pricePerMonth: values.price,
        roomStatus: values.roomStatus,
        numberOfBedrooms: values.numberOfBedrooms,
        numberOfBathrooms: values.numberOfBathrooms,
        description: values.description || "",
        maxOccupants: values.maxOccupants,
        isActive: values.isActive,
        building: values.building,
      };

      const formData = new FormData();
      formData.append("room", JSON.stringify(roomDTO));
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append("images", file.originFileObj);
        }
      });

      await axiosClient.post("/rooms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("Thêm phòng thành công!");
      handleAddRoomModalClose();
      fetchRooms(); // Refresh the room list
    } catch (err) {
      const res = err.response?.data;
      if (res && typeof res === "object" && res.message && res.roomId) {
        Modal.confirm({
          title: "Phòng đã bị xóa",
          content: res.message,
          okText: "Có, khôi phục",
          cancelText: "Không",
          onOk: async () => {
            try {
              await axiosClient.patch(`/rooms/${res.roomId}/restore`);
              message.success("Khôi phục phòng thành công!");
              handleAddRoomModalClose();
              fetchRooms();
            } catch (e) {
              message.error("Khôi phục phòng thất bại!");
            }
          },
          onCancel: () => {
            message.info("Bạn đã hủy khôi phục phòng.");
          },
        });
      } else if (res && typeof res === "object") {
        if (res.message) {
          message.error(res.message);
        } else {
          const firstError = Object.values(res)[0];
          message.error(firstError || "Vui lòng kiểm tra lại các trường thông tin!");
        }

        const fieldMap = {};
        const fieldErrors = Object.entries(res).map(([field, msg]) => ({
          name: fieldMap[field] || field,
          errors: [msg],
        }));
        addRoomForm.setFields(fieldErrors);
      } else {
        message.error("Thêm phòng thất bại!");
      }
    }
    setAddRoomLoading(false);
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
      {!isMobile && (
        <Sider width={220}>
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
            <AdminSidebar />
          ) : (
            <LandlordSidebar />
          )}
        </Sider>
      )}

      <Layout>
        <Content
          style={{
            padding: isMobile ? "16px" : "24px",
            paddingTop: isMobile ? "16px" : "32px",
            background: "#fff",
            borderRadius: 8,
          }}
        >
          {/* ✅ Header: Page Title + Search + Filter + Add */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? 12 : 0,
            }}
          >
            <PageHeader title="Danh sách phòng" style={{ marginBottom: isMobile ? 0 : 0 }} />
            <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? "100%" : "auto" }}>
              <Input
                placeholder="Tìm phòng..."
                allowClear
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: isMobile ? "100%" : 200 }}
              />
              <Popover
                content={<RoomFilterPopover onFilter={handleFilter} />}
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />} style={{ width: isMobile ? "100%" : "auto" }}>
                  Bộ lọc
                </Button>
              </Popover>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddRoomModalOpen}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                Thêm phòng
              </Button>
            </Space>
          </div>

          {/* ✅ Room cards */}
          <RoomTable rooms={rooms} loading={loading} onRoomsUpdate={fetchRooms} />

          {/* ✅ Pagination */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={(page) => setCurrentPage(page)}
              size={isMobile ? "small" : "default"}
              showSizeChanger={!isMobile}
              showQuickJumper={!isMobile}
            />
          </div>

          {/* Add Room Modal */}
          <Modal
            title="Thêm phòng mới"
            open={addRoomModalVisible}
            onCancel={handleAddRoomModalClose}
            footer={null}
            width={1000}
            destroyOnClose
          >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: "flex", gap: 24, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center' }}>
                <Card title="Thông tin phòng" style={{ flex: 1, minWidth: '500px', textAlign: 'left', minHeight: '450px' }}>
                  <div style={{ padding: '8px 0' }}>
                    <Form
                      layout="vertical"
                      form={addRoomForm}
                      onFinish={handleAddRoomFinish}
                      initialValues={{
                        area: 20,
                        price: 1000000,
                        numberOfBedrooms: 1,
                        numberOfBathrooms: 1,
                        roomStatus: "Available",
                        isActive: true,
                      }}
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="building"
                            label="Tòa"
                            rules={[{ required: true, message: "Vui lòng nhập tên tòa" }]}
                          >
                            <Select placeholder="Chọn tòa">
                              <Option value="A">A</Option>
                              <Option value="B">B</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="roomNumberSuffix"
                            label="Số phòng"
                            rules={[
                              { required: true, message: "Vui lòng nhập số phòng (chỉ gồm số)" },
                              { pattern: /^\d+$/, message: "Số phòng chỉ được phép là số" }
                            ]}
                          >
                            <InputNumber placeholder="Ví dụ: 101" style={{ width: '100%' }} min={1} step={1} stringMode={false} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="area"
                            label="Diện tích (m²)"
                            rules={[{ required: true, message: "Vui lòng nhập diện tích" }]}
                          >
                            <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="price"
                            label="Giá (VND/tháng)"
                            rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                          >
                            <InputNumber
                              min={0}
                              style={{ width: "100%" }}
                              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                              parser={(val) => val.replace(/\./g, "")}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="roomStatus"
                            label="Trạng thái phòng"
                            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
                          >
                            <Select>
                              <Option value="Available">Còn trống</Option>
                              <Option value="Inactive">Ngừng hoạt động</Option>
                              <Option value="Occupied">Đã thuê</Option>
                              <Option value="Maintenance">Bảo trì</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="numberOfBedrooms"
                            label="Số phòng ngủ"
                            rules={[{ required: true, message: "Vui lòng nhập số phòng ngủ" }]}
                          >
                            <InputNumber min={1} max={10} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="numberOfBathrooms"
                            label="Số phòng tắm"
                            rules={[{ required: true, message: "Vui lòng nhập số phòng tắm" }]}
                          >
                            <InputNumber min={1} max={10} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="maxOccupants"
                            label="Số người tối đa"
                            rules={[{ required: true, message: "Vui lòng nhập số người tối đa" }]}
                          >
                            <InputNumber min={1} max={20} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="isActive"
                            label="Trạng thái hoạt động"
                            valuePropName="checked"
                          >
                            <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </div>
                </Card>

                <Card title="Mô tả & Hình ảnh" style={{ flex: 1, minWidth: '400px', textAlign: 'left', minHeight: '450px' }}>
                  <div style={{ padding: '8px 0' }}>
                    <Form.Item name="description" label="Mô tả phòng">
                      <TextArea rows={3} placeholder="Nhập mô tả chi tiết về phòng..." />
                    </Form.Item>
                    
                    <div style={{ marginTop: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        Hình ảnh phòng (tối đa 8 ảnh):
                      </label>
                      <Upload
                        listType="picture-card"
                        fileList={fileList}
                        onChange={handleUploadChange}
                        beforeUpload={() => false}
                        multiple
                        maxCount={8}
                        accept="image/*"
                      >
                        {fileList.length < 8 && (
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Tải lên</div>
                          </div>
                        )}
                      </Upload>
                    </div>
                  </div>
                </Card>
              </div>

              <Card style={{ marginTop: 24, textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  loading={addRoomLoading} 
                  size="large"
                  style={{ marginRight: 16 }}
                  onClick={() => addRoomForm.submit()}
                >
                  Thêm phòng
                </Button>
                <Button 
                  size="large"
                  onClick={handleAddRoomModalClose}
                >
                  Hủy bỏ
                </Button>
              </Card>
            </div>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
