import React, { useState, useEffect } from "react";
import { Layout, Button, Input, Popover, Modal, Form, message, Select, Row, Col, Switch, ConfigProvider, DatePicker, Tabs, Table, Drawer } from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  InboxOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import RenterTable from "../../components/landlord/RenterTable";
import RenterFilterPopover from "../../components/landlord/RenterFilterPopover";
import PageHeader from "../../components/common/PageHeader";

import { getRoomsWithRenter } from "../../services/roomService";
import { addRenter } from "../../services/renterApi";
import { getAllRenters } from "../../services/renterApi";
import { useMediaQuery } from "react-responsive";
import { Upload } from 'antd';
import { ocrCccd, getAllUsers, updateUser } from '../../services/userApi';
import dayjs from "dayjs";
import locale from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

// Đặt locale cho dayjs
dayjs.locale('vi');

const { Sider, Content } = Layout;

export default function LandlordRenterListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState({});
  const [roomOptions, setRoomOptions] = useState([]);
  const [renters, setRenters] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 3 : 5);
  const pageSizeOptions = isMobile ? [3, 5, 10] : [5, 10, 20, 50];
  const [loading, setLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [forceUpdate, setForceUpdate] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ocrDateOfBirth, setOcrDateOfBirth] = useState(null);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [ocrIssueDate, setOcrIssueDate] = useState(null);

  // Pagination states for user list
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [userTotal, setUserTotal] = useState(0);
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

  // useEffect để theo dõi khi ocrDateOfBirth thay đổi
  useEffect(() => {
    if (ocrDateOfBirth) {
      console.log('ocrDateOfBirth changed, setting to form:', ocrDateOfBirth.format('DD/MM/YYYY'));
      addForm.setFieldsValue({ dateOfBirth: ocrDateOfBirth });
      setForceUpdate(prev => prev + 1);
    }
  }, [ocrDateOfBirth, addForm]);

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchRenters(1, value);
  };

  const handleFilter = (filterValues) => {
    console.log('Filter applied:', filterValues);
    setFilter({ ...filterValues }); // clone object để luôn trigger re-render
  };

  const fetchUsersWithoutRole = async (page = userCurrentPage, size = userPageSize) => {
    setUserLoading(true);
    try {
      // Chỉ lấy các tài khoản USER và áp dụng search theo username/email nếu có
      let filterStr = "role.id = 5";
      if (userSearch && userSearch.trim()) {
        const q = userSearch.trim();
        filterStr += ` and (username~'*${q}*' or email~'*${q}*')`;
      }
      const res = await getAllUsers(page - 1, size, filterStr);
      setUserList(res.result || []);
      setUserTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Không lấy được danh sách user!");
    }
    setUserLoading(false);
  };

  // Tự động tìm khi thay đổi chuỗi tìm kiếm
  useEffect(() => {
    // Debounce nhẹ 300ms
    const t = setTimeout(() => {
      fetchUsersWithoutRole();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [userSearch]);

  // Tự động tải lại khi thay đổi pagination
  useEffect(() => {
    fetchUsersWithoutRole();
    // eslint-disable-next-line
  }, [userCurrentPage, userPageSize]);

  const handleGrantRenter = async (user) => {
    // Hiển thị popup confirm trước khi cấp quyền
    Modal.confirm({
      title: 'Xác nhận cấp quyền',
      content: `Bạn có chắc chắn muốn cấp quyền người thuê cho tài khoản "${user.username}" (${user.email}) không?`,
      okText: 'Cấp quyền',
      cancelText: 'Hủy',
      okType: 'primary',
      onOk: async () => {
        setGrantLoading(true);
        try {
          await updateUser({
            id: user.id,
            email: user.email,
            username: user.username,
            role: { roleId: 2 }
          });
          message.success("Đã cấp quyền người thuê thành công!");
          fetchUsersWithoutRole();
          // Cập nhật danh sách người thuê sau khi cấp quyền
          setRefreshKey(prev => prev + 1);
        } catch (err) {
          message.error("Cấp quyền người thuê thất bại!");
        }
        setGrantLoading(false);
      },
    });
  };

  const handleFrontChange = (file) => {
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
    return false;
  };

  const handleBackChange = (file) => {
    setBackFile(file);
    setBackPreview(URL.createObjectURL(file));
    return false;
  };

  const handleOcr = async () => {
    if (!frontFile || !backFile) {
      message.error('Vui lòng chọn đủ 2 ảnh mặt trước và mặt sau CCCD!');
      return;
    }
    setOcrLoading(true);
    try {
      console.log('Đang gửi file OCR:', { 
        frontFile: frontFile.name, 
        backFile: backFile.name,
        frontSize: frontFile.size,
        backSize: backFile.size
      });
      
      const response = await ocrCccd(frontFile, backFile);
      console.log('Kết quả OCR CCCD:', response);
      
      // Debug: In ra tất cả các key có trong response
      console.log('Các key có trong response:', Object.keys(response));
      console.log('Response chi tiết:', JSON.stringify(response, null, 2));
      
      // Lấy data từ response.data (vì response có cấu trúc {status, error, message, data})
      const ocrData = response.data;
      console.log('OCR Data chi tiết:', JSON.stringify(ocrData, null, 2));
      
      // Chuẩn hóa ngày sinh
      let birthDateValue = null;
      if (ocrData.birthDate) {
        console.log('Raw birthDate from OCR:', ocrData.birthDate);
        const tryFormats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
        for (const fmt of tryFormats) {
          const d = dayjs(ocrData.birthDate, fmt, true);
          if (d.isValid()) {
            birthDateValue = d;
            console.log('Parsed birthDate successfully:', d.format('DD/MM/YYYY'));
            break;
          }
        }
        if (!birthDateValue) {
          console.log('Failed to parse birthDate with standard formats, trying direct parse');
          birthDateValue = dayjs(ocrData.birthDate);
          if (birthDateValue.isValid()) {
            console.log('Parsed birthDate with direct parse:', birthDateValue.format('DD/MM/YYYY'));
          }
        }
      }
      
      // Chuẩn hóa ngày cấp (nếu có)
      let issueDateValue = null;
      if (ocrData.issueDate) {
        const tryFormats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
        for (const fmt of tryFormats) {
          const d = dayjs(ocrData.issueDate, fmt, true);
          if (d.isValid()) {
            issueDateValue = d;
            break;
          }
        }
      }
      
      // Xử lý giới tính từ OCR
      let genderValue = "Khác";
      if (ocrData.gender) {
        const genderText = ocrData.gender.toLowerCase().trim();
        if (genderText === "nam") {
          genderValue = "Nam";
        } else if (genderText === "nữ" || genderText === "nu") {
          genderValue = "Nữ";
        }
      }
      
      // Tạo object để set vào form với debug
      const formData = {
        fullName: ocrData.fullName || ocrData.fullNameMRZ,
        citizenId: ocrData.nationalID,
        dateOfBirth: birthDateValue,
        address: ocrData.permanentAddress,
        birthPlace: ocrData.birthPlace,
        nationalIDIssuePlace: ocrData.nationalIDIssuePlace,
        nationalIDIssueDate: issueDateValue,
        permanentAddress: ocrData.permanentAddress,
        gender: genderValue,
      };
      
      // Set state để force update DatePicker
      setOcrDateOfBirth(birthDateValue);
      setOcrIssueDate(issueDateValue);
      
      console.log('Dữ liệu sẽ set vào form:', formData);
      
      addForm.setFieldsValue(formData);
      // Set riêng ngày cấp để đảm bảo DatePicker nhận
      addForm.setFieldsValue({ nationalIDIssueDate: issueDateValue });
      
      // Kiểm tra xem form có được set thành công không
      const currentValues = addForm.getFieldsValue();
      console.log('Giá trị hiện tại của form sau khi set:', currentValues);
      
      // Debug: Kiểm tra riêng trường dateOfBirth
      const dateOfBirthValue = addForm.getFieldValue('dateOfBirth');
      console.log('dateOfBirth field value:', dateOfBirthValue);
      console.log('dateOfBirth is dayjs object:', dayjs.isDayjs(dateOfBirthValue));
      if (dayjs.isDayjs(dateOfBirthValue)) {
        console.log('dateOfBirth format DD/MM/YYYY:', dateOfBirthValue.format('DD/MM/YYYY'));
      }
      
      // Force update DatePicker bằng nhiều cách
      setTimeout(() => {
        addForm.setFieldsValue({ dateOfBirth: birthDateValue, nationalIDIssueDate: issueDateValue });
        console.log('Force updated DoB/IssueDate - attempt 1');
      }, 100);
      
      setTimeout(() => {
        addForm.setFieldsValue({ dateOfBirth: birthDateValue, nationalIDIssueDate: issueDateValue });
        console.log('Force updated DoB/IssueDate - attempt 2');
      }, 300);
      
      // Thử cách khác: reset form và set lại
      setTimeout(() => {
        const currentFormData = addForm.getFieldsValue();
        addForm.resetFields();
        setTimeout(() => {
          addForm.setFieldsValue({
            ...currentFormData,
            dateOfBirth: birthDateValue,
            nationalIDIssueDate: issueDateValue
          });
          console.log('Reset and set DoB/IssueDate fields');
        }, 50);
      }, 500);
      
      // Force re-render DatePicker
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
        console.log('Force re-render DatePicker');
      }, 600);
      
      message.success('Nhận diện thành công! Đã tự động điền thông tin.');
    } catch (e) {
      console.error('Lỗi OCR CCCD:', e);
      
      // Xử lý lỗi chi tiết từ backend
      let errorMessage = 'Nhận diện thất bại. Vui lòng thử lại!';
      
      if (e.response?.data) {
        // Lỗi từ backend
        const backendError = e.response.data;
        if (backendError.message) {
          errorMessage = backendError.message;
        } else if (typeof backendError === 'string') {
          errorMessage = backendError;
        }
      } else if (e.message) {
        // Lỗi từ JavaScript
        errorMessage = e.message;
      }
      
      // Hiển thị thông báo lỗi chi tiết
      message.error(errorMessage);
    }
    setOcrLoading(false);
  };

  const handleAddRenter = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);
      
      // Chỉ lấy các trường backend yêu cầu
      const data = {
        username: values.username,
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phoneNumber,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
        citizenId: values.citizenId,
        birthPlace: values.birthPlace,
        nationalIDIssuePlace: values.nationalIDIssuePlace,
        nationalIDIssueDate: values.nationalIDIssueDate ? values.nationalIDIssueDate.format("YYYY-MM-DD") : undefined,
        permanentAddress: values.permanentAddress,
        gender: values.gender,
        isActive: values.isActive,
      };
      
      await addRenter(data);
      message.success("Thêm người thuê thành công!");
      addForm.resetFields();
      setFrontFile(null);
      setBackFile(null);
      setFrontPreview(null);
      setBackPreview(null);
      setAddModalOpen(false);
      
      // Cập nhật danh sách người thuê ngay lập tức
      setRefreshKey(prev => prev + 1); // Trigger refresh RenterTable
    } catch (err) {
      console.error('Error adding renter:', err);
      
      // Xử lý lỗi từ backend
      if (err.response?.data) {
        const responseData = err.response.data;
        
        // Xử lý lỗi validation cụ thể
        if (responseData.message && responseData.message.includes('Validation failed')) {
          // Tìm lỗi validation trong constraint violations
          if (responseData.message.includes('Số CMND phải có 9 hoặc 12 chữ số')) {
            message.error("Số CCCD/CMND phải có đúng 9 hoặc 12 chữ số. Vui lòng kiểm tra lại!");
            addForm.setFields([
              {
                name: 'citizenId',
                errors: ['Số CCCD/CMND phải có đúng 9 hoặc 12 chữ số']
              }
            ]);
            return;
          }
          
          // Xử lý các lỗi validation khác
          message.error("Thông tin nhập vào không hợp lệ. Vui lòng kiểm tra lại!");
        } else {
          // Hiển thị thông báo lỗi chính
          if (responseData.message) {
            message.error(responseData.message);
          }
        }
        
        // Xử lý lỗi validation cho từng trường
        if (responseData.data && typeof responseData.data === "object") {
          const fieldErrors = Object.entries(responseData.data).map(([field, errorMsg]) => ({
            name: field === "phone" ? "phoneNumber" : field,
            errors: [errorMsg],
          }));
          
          if (fieldErrors.length > 0) {
            addForm.setFields(fieldErrors);
          }
        }
        
        return;
      }
      
      // Xử lý lỗi validation của form (frontend)
      if (err?.errorFields) return;
      
      // Lỗi khác
      message.error("Thêm người thuê thất bại! Vui lòng thử lại.");
    } finally {
      setAddLoading(false);
    }
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
      <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
      {!isMobile && (
        <Sider width={220} style={{ position: 'fixed', height: '100vh', zIndex: 1000 }}>
          <LandlordSidebar />
        </Sider>
      )}
      
      {/* Main Layout */}
      <Layout style={{ marginLeft: isMobile ? 0 : 220 }}>
        {/* Mobile Header - chỉ hiển thị trên mobile */}
        {isMobile && (
          <div style={{ 
            background: '#001529', 
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
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
                onClick={() => setSidebarDrawerOpen(true)}
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
                Xin chào Landlord
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <Content style={{ 
          padding: isMobile ? 16 : 24, 
          backgroundColor: '#f5f5f5', 
          minHeight: '100vh',
          width: '100%'
        }}>

          
          {/* Controls Section cho cả mobile và desktop */}
          {isMobile ? (
            <div style={{ 
              background: 'white', 
              padding: 16, 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 16
            }}>
              <PageHeader title="Danh sách người thuê" style={{ margin: 0, padding: 0, marginBottom: 16 }} />
              
              {/* Search and Filter Controls */}
              <div style={{ 
                display: 'flex', 
                flexDirection: "column",
                gap: 12,
                marginBottom: 16
              }}>
                <Input
                  placeholder="Tìm tên người thuê hoặc phòng"
                  style={{ width: "100%" }}
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={() => {}}
                  size="large"
                />
                <div style={{ 
                  display: 'flex', 
                  gap: 8
                }}>
                  <Popover
                    content={
                      <RenterFilterPopover
                        onFilter={handleFilter}
                        roomOptions={roomOptions}
                      />
                    }
                    trigger="click"
                    placement="bottom"
                  >
                    <Button 
                      icon={<FilterOutlined />} 
                      type="default"
                      style={{ flex: 1 }}
                      size="large"
                    >
                      Bộ lọc
                    </Button>
                  </Popover>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalOpen(true)}
                    style={{ flex: 1 }}
                    size="large"
                  >
                    Thêm người thuê
                  </Button>
                </div>
              </div>
              
              {/* Mobile Status bar */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: "center",
                borderTop: '1px solid #f0f0f0',
                paddingTop: 12,
                fontSize: 12
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: '#666'
                }}>
                  <span>Hiển thị</span>
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    style={{ width: 80 }}
                    size="small"
                    options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                  />
                  <span>mục</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontWeight: 500, color: "#1890ff", fontSize: '12px' }}>
                    Tổng: {total} người thuê
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              padding: 20, 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 20
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: 12
              }}>
                <PageHeader title="Danh sách người thuê" style={{ margin: 0, padding: 0 }} />
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12
                }}>
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
                    <Button icon={<FilterOutlined />} type="default">
                      Bộ lọc
                    </Button>
                  </Popover>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalOpen(true)}
                  >
                    Thêm người thuê
                  </Button>
                </div>
              </div>
              
              {/* Status bar */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: "center",
                borderTop: '1px solid #f0f0f0',
                paddingTop: 12,
                fontSize: 14
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: '#666'
                }}>
                  <span>Hiển thị</span>
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    style={{ width: 100 }}
                    options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                  />
                  <span>mục</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontWeight: 500, color: "#1890ff" }}>
                    Tổng: {total} người thuê
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Table Section */}
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <RenterTable search={searchText} filter={filter} refreshKey={refreshKey} />
          </div>

          <Modal
            open={addModalOpen}
            title="Thêm người thuê mới"
            onCancel={() => {
              addForm.resetFields();
              setFrontFile(null);
              setBackFile(null);
              setFrontPreview(null);
              setBackPreview(null);
              setAddModalOpen(false);
            }}
            footer={null}
            width={1000}
            style={{ top: 20 }}
          >
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: '1',
                  label: 'Tạo tài khoản mới',
                  children: (
                    <div>
                      <Form form={addForm} layout="vertical" initialValues={{ isActive: true }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="Tên người dùng" name="username" rules={[
                              { required: true, message: "Vui lòng nhập tên người dùng" },
                              { min: 3, max: 50, message: "Tên người dùng phải từ 3-50 ký tự" },
                              { pattern: /^[^@\s]+$/, message: "Tên người dùng không được là email." }
                            ]}>
                              <Input placeholder="Nhập tên người dùng" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Họ và tên" name="fullName" rules={[
                              { required: true, message: "Vui lòng nhập họ và tên" },
                              { min: 2, max: 100, message: "Họ và tên phải từ 2-100 ký tự" }
                            ]}>
                              <Input placeholder="Nhập họ và tên" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Email" name="email" rules={[
                              { required: true, message: "Vui lòng nhập email" },
                              { type: "email", message: "Email không hợp lệ" },
                              { max: 100, message: "Email tối đa 100 ký tự" }
                            ]}>
                              <Input type="email" placeholder="Nhập email" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Mật khẩu" name="password" rules={[
                              { required: true, message: "Vui lòng nhập mật khẩu" },
                              { min: 6, max: 32, message: "Mật khẩu phải từ 6-32 ký tự" },
                              { pattern: /^\S+$/, message: "Mật khẩu không được chứa khoảng trắng" }
                            ]}>
                              <Input.Password placeholder="Nhập mật khẩu" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Số điện thoại" name="phoneNumber" rules={[
                              { required: true, message: "Vui lòng nhập số điện thoại" },
                              { message: "Số điện thoại không hợp lệ. Bắt đầu bằng 0, 10 số, đúng đầu số Việt Nam." }
                            ]}>
                              <Input placeholder="Nhập số điện thoại" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Ngày sinh" name="dateOfBirth" rules={[
                              { required: true, message: "Vui lòng chọn ngày sinh" },
                              { validator: (_, value) => {
                                  if (!value) return Promise.resolve();
                                  if (value.isAfter && value.isAfter(dayjs(), 'day')) {
                                    return Promise.reject(new Error("Ngày sinh không được lớn hơn ngày hiện tại"));
                                  }
                                  // Kiểm tra tuổi tối thiểu (16 tuổi)
                                  const minAge = dayjs().subtract(16, 'year');
                                  if (value.isAfter(minAge)) {
                                    return Promise.reject(new Error('Bạn phải ít nhất 16 tuổi'));
                                  }
                                  // Kiểm tra tuổi tối đa (100 tuổi)
                                  const maxAge = dayjs().subtract(100, 'year');
                                  if (value.isBefore(maxAge)) {
                                    return Promise.reject(new Error('Ngày sinh không hợp lệ'));
                                  }
                                  return Promise.resolve();
                                }
                              }
                            ]}>
                              <ConfigProvider locale={locale}>
                                <DatePicker 
                                  key={`dateOfBirth-${forceUpdate}`}
                                  defaultValue={ocrDateOfBirth}
                                  style={{ width: '100%' }} 
                                  placeholder="Chọn ngày sinh" 
                                  format="DD/MM/YYYY"
                                  inputReadOnly
                                  defaultPickerValue={dayjs().subtract(20, 'year')}
                                  disabledDate={(current) => {
                                    const today = dayjs();
                                    const minAge = today.subtract(16, 'year');
                                    const maxAge = today.subtract(100, 'year');
                                    return current && (current.isAfter(today) || current.isAfter(minAge) || current.isBefore(maxAge));
                                  }}
                                  onChange={(date) => {
                                    addForm.setFieldsValue({ dateOfBirth: date });
                                    setOcrDateOfBirth(date);
                                  }}
                                />
                              </ConfigProvider>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="CCCD/CMND" name="citizenId" rules={[
                              { required: true, message: "Vui lòng nhập CCCD/CMND" }
                            ]}>
                              <Input 
                                placeholder="Nhập số CCCD/CMND" 
                                maxLength={12}
                                onKeyPress={(e) => {
                                  // Chỉ cho phép nhập số
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Nơi sinh" name="birthPlace">
                              <Input placeholder="Nhập nơi sinh" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Nơi cấp CCCD" name="nationalIDIssuePlace">
                              <Input placeholder="Nhập nơi cấp CCCD" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Ngày cấp CCCD" name="nationalIDIssueDate" rules={[
                              { required: true, message: "Vui lòng chọn ngày cấp CCCD" },
                              { validator: (_, value) => {
                                  if (!value) return Promise.resolve();
                                  const birthDate = addForm.getFieldValue('dateOfBirth');
                                  if (birthDate && value.isBefore(birthDate)) {
                                    return Promise.reject(new Error('Ngày cấp không được trước ngày sinh'));
                                  }
                                  if (value.isAfter(dayjs(), 'day')) {
                                    return Promise.reject(new Error('Ngày cấp không được lớn hơn ngày hiện tại'));
                                  }
                                  return Promise.resolve();
                                }
                              }
                            ]}>
                              <ConfigProvider locale={locale}>
                                <DatePicker 
                                  placeholder="Chọn ngày cấp CCCD" 
                                  format="DD/MM/YYYY"
                                  style={{ width: '100%' }}
                                  key={`issueDate-${forceUpdate}`}
                                  defaultValue={ocrIssueDate}
                                  defaultPickerValue={dayjs()}
                                  inputReadOnly={false}
                                  allowClear
                                  onChange={(date) => {
                                    addForm.setFieldsValue({ nationalIDIssueDate: date });
                                  }}
                                  disabledDate={(current) => {
                                    const birthDate = addForm.getFieldValue('dateOfBirth');
                                    const today = dayjs();
                                    if (!birthDate) {
                                      return current && current.isAfter(today);
                                    }
                                    return current && (current.isBefore(birthDate) || current.isAfter(today));
                                  }}
                                />
                              </ConfigProvider>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Giới tính" name="gender">
                              <Select placeholder="Chọn giới tính">
                                <Select.Option value="Nam">Nam</Select.Option>
                                <Select.Option value="Nữ">Nữ</Select.Option>
                                <Select.Option value="Khác">Khác</Select.Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item label="Địa chỉ thường trú" name="permanentAddress" rules={[
                              { required: true, message: "Vui lòng nhập địa chỉ thường trú" }
                            ]}>
                              <Input placeholder="Nhập địa chỉ thường trú" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Trạng thái hoạt động" name="isActive" valuePropName="checked">
                              <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng hoạt động" />
                            </Form.Item>
                          </Col>
                        </Row>
                        
                                                 {/* Thêm vùng upload ảnh CCCD và nút quét */}
                         <div style={{ 
                           marginBottom: 16, 
                           padding: 8, 
                           backgroundColor: '#f6ffed', 
                           border: '1px solid #b7eb8f', 
                           borderRadius: 6,
                           fontSize: 12,
                           color: '#52c41a'
                         }}>
                           💡 <strong>Lưu ý:</strong> Upload ảnh CCCD là tùy chọn. Bạn có thể nhập thông tin bằng tay hoặc upload ảnh CCCD để quét tự động thông tin.<br/>
                           Việc quét CCCD chỉ nhằm mục đích giúp tạo tài khoản chính xác, nhanh chóng và bảo mật. Chúng tôi không lưu trữ thông tin người thuê trọ cho mục đích riêng tư.
                         </div>
                         <Row gutter={16} style={{ marginBottom: 16 }}>
                          <Col span={12}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>Ảnh mặt trước CCCD</div>
                            <Upload.Dragger
                              accept="image/*"
                              beforeUpload={file => { handleFrontChange(file); return false; }}
                              fileList={frontFile ? [frontFile] : []}
                              onRemove={() => { setFrontFile(null); setFrontPreview(null); }}
                              maxCount={1}
                              disabled={ocrLoading}
                              style={{ background: '#fafafa' }}
                            >
                              {frontPreview ? (
                                <img src={frontPreview} alt="Ảnh mặt trước" style={{ width: 180, borderRadius: 8, objectFit: 'cover' }} />
                              ) : (
                                <>
                                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                  <p>Kéo thả hoặc bấm để chọn ảnh mặt trước</p>
                                </>
                              )}
                            </Upload.Dragger>
                          </Col>
                          <Col span={12}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>Ảnh mặt sau CCCD</div>
                            <Upload.Dragger
                              accept="image/*"
                              beforeUpload={file => { handleBackChange(file); return false; }}
                              fileList={backFile ? [backFile] : []}
                              onRemove={() => { setBackFile(null); setBackPreview(null); }}
                              maxCount={1}
                              disabled={ocrLoading}
                              style={{ background: '#fafafa' }}
                            >
                              {backPreview ? (
                                <img src={backPreview} alt="Ảnh mặt sau" style={{ width: 180, borderRadius: 8, objectFit: 'cover' }} />
                              ) : (
                                <>
                                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                  <p>Kéo thả hoặc bấm để chọn ảnh mặt sau</p>
                                </>
                              )}
                            </Upload.Dragger>
                          </Col>
                        </Row>
                        
                        {/* Nút quét CCCD đặt ra giữa */}
                        <div style={{ textAlign: 'center', margin: '80px 0 16px 0' }}>
                          <Button
                            type="primary"
                            loading={ocrLoading}
                            onClick={handleOcr}
                            disabled={!frontFile || !backFile}
                            style={{ minWidth: 140, borderRadius: 8, fontWeight: 600, fontSize: 15, height: 36 }}
                          >
                            Quét CCCD
                          </Button>
                        </div>
                        
                        {/* Nút tạo tài khoản */}
                        <div style={{ textAlign: 'right', marginTop: 16 }}>
                          <Button
                            type="primary"
                            onClick={handleAddRenter}
                            loading={addLoading}
                            style={{ minWidth: 140, borderRadius: 8, fontWeight: 600, fontSize: 15, height: 36 }}
                          >
                            Tạo tài khoản
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )
                },
                {
                  key: '2',
                  label: 'Cấp quyền người thuê cho tài khoản người dùng',
                  children: (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          onClick={fetchUsersWithoutRole}
                          loading={userLoading}
                          style={{ marginBottom: 16 }}
                        >
                          Tải danh sách tài khoản người dùng
                        </Button>
                        <Input
                          placeholder="Tìm theo tên đăng nhập hoặc email"
                          value={userSearch}
                          allowClear
                          prefix={<SearchOutlined />}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onPressEnter={() => fetchUsersWithoutRole()}
                          style={{ width: 360, marginLeft: 12 }}
                        />
                        <Table
                          dataSource={userList}
                          loading={userLoading}
                          rowKey="id"
                          pagination={{
                            current: userCurrentPage,
                            pageSize: userPageSize,
                            total: userTotal,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} tài khoản`,
                            pageSizeOptions: ['5', '10', '20', '50'],
                            onChange: (page, size) => {
                              setUserCurrentPage(page);
                              setUserPageSize(size);
                            },
                            onShowSizeChange: (current, size) => {
                              setUserCurrentPage(1);
                              setUserPageSize(size);
                            }
                          }}
                                                     columns={[
                             {
                               title: 'Tên người dùng',
                               dataIndex: 'username',
                               key: 'username',
                             },
                            {
                              title: 'Email',
                              dataIndex: 'email',
                              key: 'email',
                            },
                            {
                              title: 'Trạng thái',
                              dataIndex: 'isActive',
                              key: 'isActive',
                              render: (isActive) => (
                                <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>
                                  {isActive ? 'Hoạt động' : 'Không hoạt động'}
                                </span>
                              ),
                            },
                            {
                              title: 'Thao tác',
                              key: 'action',
                              render: (_, record) => (
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => handleGrantRenter(record)}
                                  loading={grantLoading}
                                  disabled={!record.isActive}
                                >
                                  Cấp quyền người thuê
                                </Button>
                              ),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </Modal>
        </Content>
      </Layout>
      
             {/* Mobile Drawer cho Sidebar */}
       {isMobile && (
         <Drawer
           title="Menu"
           placement="left"
           onClose={() => setSidebarDrawerOpen(false)}
           open={sidebarDrawerOpen}
           width={280}
           bodyStyle={{ padding: 0 }}
         >
           <LandlordSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
         </Drawer>
       )}
     </Layout>
   </div>
 );
 }
