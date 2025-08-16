import React, { useState, useEffect, useCallback } from "react";
import { Layout, Pagination, Input, Button, Space, Popover, message, Form, InputNumber, Select, Upload, Switch, Modal, Card, Row, Col, Drawer, ConfigProvider } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  MenuOutlined,
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
import locale from "antd/es/locale/vi_VN";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  const [pageSize, setPageSize] = useState(isMobile ? 4 : 5);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.account.user);

  // Add room modal states
  const [addRoomModalVisible, setAddRoomModalVisible] = useState(false);
  const [addRoomForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [addRoomLoading, setAddRoomLoading] = useState(false);

  // Tạo filter DSL cho backend
  const buildFilterDSL = useCallback(() => {
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
  }, [search, filter]);

  const fetchRooms = useCallback(async () => {
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
  }, [currentPage, pageSize, buildFilterDSL]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Cập nhật pageSize khi isMobile thay đổi
  useEffect(() => {
    setPageSize(isMobile ? 4 : 5);
  }, [isMobile]);

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
    console.log('Form values:', values); // Debug log
    
    // Kiểm tra validation trước khi submit
    const maxOccupants = Number(values.maxOccupants);
    console.log('maxOccupants value:', maxOccupants, 'type:', typeof maxOccupants); // Debug log
    
    if (isNaN(maxOccupants) || maxOccupants < 1 || maxOccupants > 3) {
      message.error("Số người tối đa chỉ được từ 1-3 người");
      addRoomForm.setFields([
        {
          name: 'maxOccupants',
          errors: ['Số người tối đa chỉ được từ 1-3 người']
        }
      ]);
      return;
    }
    
    // Kiểm tra thêm một lần nữa trước khi gửi request
    if (maxOccupants < 1 || maxOccupants > 3) {
      message.error("Số người tối đa chỉ được từ 1-3 người. Vui lòng kiểm tra lại!");
      return;
    }
    
    // Kiểm tra cuối cùng trước khi tạo roomDTO
    if (values.maxOccupants < 1 || values.maxOccupants > 3) {
      message.error("Số người tối đa không hợp lệ!");
      return;
    }
    
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
    <ConfigProvider locale={locale}>
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
        {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
        {!isMobile && (
          <div
            style={{
              width: 220,
              background: "#001529",
              position: "fixed",
              height: "100vh",
              zIndex: 1000,
            }}
          >
            {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
              <AdminSidebar />
            ) : (
              <LandlordSidebar />
            )}
          </div>
        )}

        {/* Main Layout */}
        <div style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : 220,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Mobile Header - chỉ hiển thị trên mobile */}
          {isMobile && (
            <div style={{ 
              background: '#001529', 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%'
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
                    fontSize: '18px'
                  }}
                />
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 18,
                  color: 'white'
                }}>
                  MP-BHMS
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" 
                    ? "Xin chào Administrator" 
                    : "Xin chào Landlord"}
                </div>
              </div>
            </div>
          )}
          
          {/* Content Area */}
          <div         style={{
          flex: 1,
          padding: isMobile ? 16 : 24,
          backgroundColor: "#f5f5f5",
          minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
        }}>
            {/* Page Title - Only show on desktop */}
            {!isMobile && (
              <div style={{ 
                backgroundColor: "#fff", 
                borderRadius: "8px", 
                padding: "24px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <h1 style={{ 
                  fontSize: "22px", 
                  marginBottom: "20px",
                  fontWeight: "600",
                  color: "#1a1a1a"
                }}>
                  Danh sách phòng
                </h1>
              </div>
            )}

            {/* Header: Search + Filter + Add */}
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
              {isMobile && (
                <div style={{ 
                  backgroundColor: "#fff", 
                  borderRadius: "8px", 
                  padding: "16px",
                  marginBottom: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <h1 style={{ 
                    fontSize: "18px", 
                    marginBottom: "16px",
                    fontWeight: "600",
                    color: "#1a1a1a"
                  }}>
                    Danh sách phòng
                  </h1>
                </div>
              )}
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

            {/* Room cards */}
            <div         style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: isMobile ? "16px" : "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
              <RoomTable rooms={rooms} loading={loading} onRoomsUpdate={fetchRooms} />
            </div>

            {/* Pagination */}
            <div style={{ 
              marginTop: 24, 
              textAlign: "center",
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              minHeight: "80px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  if (size && size !== pageSize) {
                    setPageSize(size);
                  }
                }}
                onShowSizeChange={(current, size) => {
                  setPageSize(size);
                  setCurrentPage(1); // Reset về trang đầu khi thay đổi pageSize
                }}
                size={isMobile ? "small" : "default"}
                showSizeChanger={true}
                showQuickJumper={!isMobile}
                showTotal={(total, range) => `${range[0]}-${range[1]} trên tổng số ${total} phòng`}
                pageSizeOptions={['5', '10', '20', '50', '100']}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px"
                }}
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
                         onFinishFailed={(errorInfo) => {
                           console.log('Form validation failed:', errorInfo);
                         }}
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
                                 rules={[
                                   { required: true, message: "Vui lòng nhập số người tối đa" },
                                   { 
                                     validator: (_, value) => {
                                       if (value === undefined || value === null || value === "") {
                                         return Promise.resolve();
                                       }
                                       const numValue = Number(value);
                                       if (isNaN(numValue) || numValue < 1 || numValue > 3) {
                                         return Promise.reject(new Error("Số người tối đa chỉ được từ 1-3 người"));
                                       }
                                       return Promise.resolve();
                                     }
                                   }
                                 ]}
                                 validateTrigger={['onChange', 'onBlur', 'onSubmit']}
                               >
                                                                 <InputNumber 
                                   min={1} 
                                   style={{ width: "100%" }} 
                                   placeholder="Nhập số người (1-3)"
                                   step={1}
                                   precision={0}
                                   onChange={(value) => {
                                     console.log('InputNumber onChange - value:', value, 'type:', typeof value); // Debug log
                                     // Kiểm tra ngay khi thay đổi giá trị
                                     if (value !== null && value !== undefined) {
                                       const numValue = Number(value);
                                       console.log('InputNumber onChange - numValue:', numValue); // Debug log
                                       if (isNaN(numValue) || numValue < 1) {
                                         console.log('InputNumber onChange - validation failed (too small)'); // Debug log
                                         addRoomForm.setFields([
                                           {
                                             name: 'maxOccupants',
                                             errors: ['Số người tối đa phải lớn hơn 0']
                                           }
                                         ]);
                                       } else if (numValue > 3) {
                                         console.log('InputNumber onChange - validation failed (too large)'); // Debug log
                                         addRoomForm.setFields([
                                           {
                                             name: 'maxOccupants',
                                             errors: ['Số người tối đa chỉ được từ 1-3 người']
                                           }
                                         ]);
                                       } else {
                                         console.log('InputNumber onChange - validation passed'); // Debug log
                                         addRoomForm.setFields([
                                           {
                                             name: 'maxOccupants',
                                             errors: []
                                           }
                                         ]);
                                       }
                                     }
                                   }}
                                   onBlur={(e) => {
                                     const value = Number(e.target.value);
                                     if (value && value < 1) {
                                       addRoomForm.setFields([
                                         {
                                           name: 'maxOccupants',
                                           errors: ['Số người tối đa phải lớn hơn 0']
                                         }
                                       ]);
                                     } else if (value && value > 3) {
                                       addRoomForm.setFields([
                                         {
                                           name: 'maxOccupants',
                                           errors: ['Số người tối đa chỉ được từ 1-3 người']
                                         }
                                       ]);
                                     }
                                   }}
                                   onKeyPress={(e) => {
                                     // Cho phép nhập số từ 0-9
                                     const char = String.fromCharCode(e.which);
                                     if (!/[0-9]/.test(char)) {
                                       e.preventDefault();
                                     }
                                   }}
                                 />
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
                     onClick={async () => {
                       try {
                         const values = await addRoomForm.validateFields();
                         console.log('Button validation - values:', values); // Debug log
                         
                         // Kiểm tra thêm validation cho maxOccupants
                         const maxOccupants = Number(values.maxOccupants);
                         console.log('Button validation - maxOccupants:', maxOccupants); // Debug log
                         
                         if (isNaN(maxOccupants) || maxOccupants < 1 || maxOccupants > 3) {
                           message.error("Số người tối đa chỉ được từ 1-3 người");
                           addRoomForm.setFields([
                             {
                               name: 'maxOccupants',
                               errors: ['Số người tối đa chỉ được từ 1-3 người']
                             }
                           ]);
                           return;
                         }
                         
                         // Kiểm tra thêm một lần nữa
                         if (values.maxOccupants < 1 || values.maxOccupants > 3) {
                           message.error("Số người tối đa không hợp lệ!");
                           return;
                         }
                         
                         addRoomForm.submit();
                       } catch (error) {
                         console.log('Validation failed:', error);
                         message.error("Vui lòng kiểm tra lại thông tin!");
                       }
                     }}
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
          </div>
        </div>
      </div>

      {/* Mobile Drawer cho Sidebar */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
            <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
          ) : (
            <LandlordSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
          )}
        </Drawer>
      )}
      </div>
    </ConfigProvider>
  );
}
