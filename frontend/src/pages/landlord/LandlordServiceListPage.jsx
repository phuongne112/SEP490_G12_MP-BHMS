// src/pages/landlord/LandlordServiceListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Popconfirm,
  Space,
  Popover,
  Pagination,
  DatePicker,
  Table,
  Tag,
  Tooltip,
  Drawer,
} from "antd";
import { PlusOutlined, SearchOutlined, FilterOutlined, HistoryOutlined, EditOutlined, DeleteOutlined, MenuOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import ServiceTable from "../../components/landlord/ServiceTable";
import { getAllServices, createService, updateService, deleteService, updateServicePrice, getServicePriceHistory, deleteServicePriceHistory } from "../../services/serviceApi";
import { debounce } from "lodash";
import ServiceFilterPopover from "../../components/landlord/ServiceFilterPopover";
import { useMediaQuery } from "react-responsive";
import dayjs from "dayjs";

const { Sider, Content } = Layout;

export default function LandlordServiceListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: isMobile ? 3 : 5, total: 0 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [form] = Form.useForm();
  
  // Thêm state cho modal cập nhật giá
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceForm] = Form.useForm();
  const [selectedServiceForPrice, setSelectedServiceForPrice] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // STEP 1: Refactor state management
  // Central state for all active filters being sent to the API
  const [activeFilters, setActiveFilters] = useState({});
  // Separate state for the search input field to keep UI responsive
  const [searchInput, setSearchInput] = useState('');

  const serviceTypeOptions = [
    { label: "Điện", value: "ELECTRICITY" },
    { label: "Nước", value: "WATER" },
    { label: "Khác", value: "OTHER" },
  ];

  const pageSizeOptions = isMobile ? [3, 5, 10] : [5, 10, 20, 50];

  const fetchServices = useCallback(async (page, size, filters) => {
    setLoading(true);
    try {
      const response = await getAllServices(page - 1, size, filters);
      if (response && response.data && response.data.result) {
        const transformedServices = response.data.result.map(service => ({
          id: service.id,
          name: service.serviceName,
          price: service.unitPrice,
          type: service.serviceType,
          unit: service.unit,
          status: true,
        }));
        setServices(transformedServices);
        setPagination(prev => ({ ...prev, total: response.data.meta.total, current: page, pageSize: size }));
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      message.error("Không thể tải danh sách dịch vụ");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // STEP 2: Define new handlers and debounced function
  const debouncedApplySearch = useCallback(
    debounce((filters) => setActiveFilters(filters), 500),
    []
  );

  useEffect(() => {
    fetchServices(pagination.current, pagination.pageSize, activeFilters);
  }, [activeFilters, pagination.current, pagination.pageSize, fetchServices]);

  const handleSearchInputChange = (e) => {
    const { value } = e.target;
    setSearchInput(value);
    // We update a temporary filter object to avoid re-rendering on every keystroke
    // The actual state update is debounced
    const newFilters = { ...activeFilters, serviceName: value };
    debouncedApplySearch(newFilters);
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleAdvancedFilterApply = (advancedFilters) => {
    // Gộp với searchInput nếu có, nhưng KHÔNG merge với activeFilters cũ
    const newFilters = { ...advancedFilters };
    if (searchInput) newFilters.serviceName = searchInput;
    setActiveFilters(newFilters);
    setPagination(p => ({ ...p, current: 1 }));
    setIsFilterOpen(false);
  };
  
     const handleEdit = (id) => {
     const service = services.find(s => s.id === id);
     if (service) {
       setEditingService(service);
       form.setFieldsValue({
         name: service.name,
         type: service.type,
         unit: service.unit,
       });
       setIsModalOpen(true);
     }
   };

  // Thêm handler cho cập nhật giá
  const handleUpdatePrice = (id) => {
    const service = services.find(s => s.id === id);
    if (service) {
      setSelectedServiceForPrice(service);
      // Thay đổi: set ngày mặc định là 5 ngày từ hiện tại thay vì tháng tiếp theo
      const fiveDaysFromNow = dayjs().add(5, 'day');
      priceForm.setFieldsValue({
        newUnitPrice: service.price,
        effectiveDate: fiveDaysFromNow,
        reason: '',
      });
      setIsPriceModalOpen(true);
    }
  };

  // Thêm handler cho xem lịch sử giá
  const handleViewPriceHistory = async (id) => {
    try {
      const service = services.find(s => s.id === id);
      if (!service) {
        message.error("Không tìm thấy dịch vụ");
        return;
      }
      
      setSelectedServiceForPrice(service);
      const response = await getServicePriceHistory(id);
      setPriceHistory(response.data || []);
      setIsHistoryModalOpen(true);
    } catch (error) {
      message.error("Không thể tải lịch sử giá");
    }
  };

  // Thêm handler cho xóa lịch sử giá
  const handleDeletePriceHistory = async (historyId) => {
    try {
      await deleteServicePriceHistory(historyId);
      message.success("Xóa lịch sử giá thành công");
      // Refresh lịch sử giá
      if (selectedServiceForPrice) {
        const response = await getServicePriceHistory(selectedServiceForPrice.id);
        setPriceHistory(response.data || []);
      }
    } catch (error) {
      message.error("Không thể xóa lịch sử giá");
    }
  };
  
  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
        ...prev,
        current: newPagination.current,
        pageSize: newPagination.pageSize
    }));
  };

     const handleAddService = async (values) => {
     setIsSubmitting(true);
     try {
       let serviceData;

       if (editingService) {
         // Kiểm tra xem có thay đổi nào không
         const hasChanges = 
           values.name !== editingService.name ||
           values.type !== editingService.type ||
           values.unit !== editingService.unit;
         
         if (!hasChanges) {
           message.info("Không có thay đổi nào được phát hiện.");
           setIsSubmitting(false);
           return;
         }
         
         // Kiểm tra tên dịch vụ trùng lặp khi sửa (trừ chính nó)
         if (values.name !== editingService.name) {
           const existingService = services.find(s => s.name === values.name && s.id !== editingService.id);
           if (existingService) {
             message.error(`Tên dịch vụ "${values.name}" đã tồn tại. Vui lòng chọn tên khác.`);
             setIsSubmitting(false);
             return;
           }
         }
         
         // Khi chỉnh sửa: chỉ gửi thông tin dịch vụ (không bao gồm giá)
         serviceData = {
           serviceName: values.name,
           serviceType: values.type,
           unit: values.unit,
         };
       } else {
         // Kiểm tra tên dịch vụ trùng lặp khi tạo mới
         const existingService = services.find(s => s.name === values.name);
         if (existingService) {
           message.error(`Tên dịch vụ "${values.name}" đã tồn tại. Vui lòng chọn tên khác.`);
           setIsSubmitting(false);
           return;
         }
         
         // Khi tạo mới: gửi đầy đủ thông tin bao gồm giá
         serviceData = {
           serviceName: values.name,
           serviceType: values.type,
           unit: values.unit,
           unitPrice: values.price,
         };
       }

       const response = editingService
         ? await updateService(editingService.id, serviceData)
         : await createService(serviceData);

       if (response && response.data) {
         message.success(editingService ? "Cập nhật dịch vụ thành công" : "Thêm dịch vụ thành công");
         form.resetFields();
         setIsModalOpen(false);
         setEditingService(null);
         // STEP 2: Refresh with the correct active filters
         fetchServices(1, pagination.pageSize, activeFilters);
       } else {
         throw new Error(response.error || "Lưu dịch vụ thất bại");
       }
     } catch (error) {
       console.error("Error saving service:", error);
       message.error(error.message || "Lưu dịch vụ thất bại");
     } finally {
       setIsSubmitting(false);
     }
   };

  // Thêm handler cho cập nhật giá
  const handleUpdatePriceSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      // Kiểm tra xem có thay đổi giá không
      if (values.newUnitPrice === selectedServiceForPrice.price) {
        message.info("Giá mới giống với giá hiện tại. Không cần cập nhật.");
        setIsSubmitting(false);
        return;
      }
      
      const priceData = {
        newUnitPrice: values.newUnitPrice,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        reason: values.reason,
      };

      const response = await updateServicePrice(selectedServiceForPrice.id, priceData);

      if (response && response.data) {
        message.success("Đã lưu giá mới vào lịch sử. Giá sẽ được áp dụng từ ngày hiệu lực.");
        priceForm.resetFields();
        setIsPriceModalOpen(false);
        setSelectedServiceForPrice(null);
        // Refresh danh sách dịch vụ
        fetchServices(pagination.current, pagination.pageSize, activeFilters);
      } else {
        throw new Error(response.error || "Cập nhật giá thất bại");
      }
    } catch (error) {
      console.error("Error updating price:", error);
      // Hiển thị thông báo lỗi từ backend nếu có
      const errorMessage = error.response?.data?.message || error.message || "Cập nhật giá thất bại";
      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id) => {
    try {
        await deleteService(id);
        message.success("Xóa dịch vụ thành công");
        // STEP 2: Refresh with the correct active filters
        fetchServices(pagination.current, pagination.pageSize, activeFilters);
    } catch (error) {
        console.error("Error deleting service:", error);
        message.error("Xóa dịch vụ thất bại");
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingService(null);
    form.resetFields();
  };

  const handlePriceModalCancel = () => {
    setIsPriceModalOpen(false);
    setSelectedServiceForPrice(null);
    priceForm.resetFields();
  };

  const handlePageSizeChange = (value) => {
    setPagination(p => ({ ...p, pageSize: value, current: 1 }));
    fetchServices(1, value, activeFilters);
  };

  // Thêm hàm reset filter
  const handleResetFilter = () => {
    setActiveFilters({});
    setSearchInput("");
    setPagination(p => ({ ...p, current: 1 }));
    fetchServices(1, pagination.pageSize, {});
  };

  // Cập nhật columns cho ServiceTable để thêm các action mới
  const columns = [
    {
      title: "Tên dịch vụ",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: "Giá (VND/đơn vị)",
      dataIndex: "price",
      key: "price",
      render: (value) => value ? value.toLocaleString("vi-VN") : "0",
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        const typeMap = {
          ELECTRICITY: "Điện",
          WATER: "Nước",
          OTHER: "Khác",
        };
        return typeMap[type] || type;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: isMobile ? 200 : 450,
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'nowrap',
          width: '100%',
          minWidth: isMobile ? '180px' : '430px'
        }}>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record.id)}
            size="small"
          />
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => handleUpdatePrice(record.id)}
            size="small"
            title="Cập nhật giá"
          >
            Giá
          </Button>
          <Button
            type="default"
            icon={<HistoryOutlined />}
            onClick={() => handleViewPriceHistory(record.id)}
            size="small"
            title="Xem lịch sử giá"
          >
            Lịch sử
          </Button>
          <Popconfirm
            title="Xóa dịch vụ"
            description="Bạn có chắc muốn xóa dịch vụ này?"
            onConfirm={() => handleDeleteService(record.id)}
            okText="Xóa"
            cancelText="Không"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

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
                  Danh sách dịch vụ
                </div>
              </div>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarDrawerOpen(true)}
                style={{ 
                  color: 'white',
                  fontSize: '18px'
                }}
              />
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
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 600,
                  marginBottom: 16,
                  color: '#1a1a1a'
                }}>
                  Danh sách dịch vụ
                </div>
                
                {/* Search and Filter Controls */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 16
                }}>
                  <Input
                    placeholder="Tìm tên dịch vụ"
                    prefix={<SearchOutlined />}
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    style={{ width: "100%" }}
                    size="large"
                  />
                  <div style={{ 
                    display: 'flex', 
                    gap: 8
                  }}>
                    <Popover
                      content={<ServiceFilterPopover onFilter={handleAdvancedFilterApply} onClose={() => setIsFilterOpen(false)} onReset={handleResetFilter} />}
                      trigger="click"
                      placement="bottom"
                      open={isFilterOpen}
                      onOpenChange={setIsFilterOpen}
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
                      onClick={() => setIsModalOpen(true)}
                      style={{ flex: 1 }}
                      size="large"
                    >
                      Thêm dịch vụ
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
                      value={pagination.pageSize}
                      onChange={handlePageSizeChange}
                      style={{ width: 80 }}
                      size="small"
                      options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                    />
                    <span>mục</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 500, color: "#1890ff", fontSize: '12px' }}>
                      Tổng: {pagination.total} dịch vụ
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
                  <PageHeader title="Danh sách dịch vụ" style={{ margin: 0, padding: 0 }} />
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12
                  }}>
                    <Input
                      placeholder="Tìm tên dịch vụ"
                      prefix={<SearchOutlined />}
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      style={{ width: 250 }}
                    />
                    <Popover
                      content={<ServiceFilterPopover onFilter={handleAdvancedFilterApply} onClose={() => setIsFilterOpen(false)} onReset={handleResetFilter} />}
                      trigger="click"
                      placement="bottomRight"
                      open={isFilterOpen}
                      onOpenChange={setIsFilterOpen}
                    >
                      <Button icon={<FilterOutlined />} type="default">
                        Bộ lọc
                      </Button>
                    </Popover>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsModalOpen(true)}
                    >
                      Thêm dịch vụ
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
                      value={pagination.pageSize}
                      onChange={handlePageSizeChange}
                      style={{ width: 100 }}
                      options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                    />
                    <span>mục</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 500, color: "#1890ff" }}>
                      Tổng: {pagination.total} dịch vụ
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
              <ServiceTable
                services={services}
                pagination={pagination}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDeleteService}
                onTableChange={handleTableChange}
                onUpdatePrice={handleUpdatePrice}
                onViewPriceHistory={handleViewPriceHistory}
              />
            </div>

            {/* Modal thêm/sửa dịch vụ */}
            <Modal
              title={editingService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
              open={isModalOpen}
              onCancel={handleModalCancel}
              width={isMobile ? '95%' : 600}
              style={{ top: isMobile ? 20 : 100 }}
              footer={
                editingService ? (
                  [
                    <Button key="back" onClick={handleModalCancel}>Hủy</Button>,
                    <Popconfirm
                      key="submit"
                      title="Cập nhật dịch vụ"
                      description="Bạn có chắc chắn muốn lưu thay đổi này không?"
                      onConfirm={() => form.submit()}
                      okText="Cập nhật"
                      cancelText="Hủy"
                    >
                      <Button type="primary" loading={isSubmitting}>Cập nhật</Button>
                    </Popconfirm>
                  ]
                ) : (
                  [
                    <Button key="back" onClick={handleModalCancel}>Hủy</Button>,
                    <Button key="submit" type="primary" loading={isSubmitting} onClick={() => form.submit()}>Lưu</Button>
                  ]
                )
              }
            >
                         <Form layout="vertical" form={form} onFinish={handleAddService}>
               <Form.Item label="Tên dịch vụ" name="name" rules={[{ required: true, message: "Vui lòng nhập tên dịch vụ" }]}>
                 <Input placeholder="Nhập tên dịch vụ" />
               </Form.Item>
               <Form.Item label="Đơn vị" name="unit" rules={[{ required: true, message: "Vui lòng nhập đơn vị" }]}>
                 <Input placeholder="VD: kWh, m³, ..." />
               </Form.Item>
               {!editingService && (
                 <Form.Item label="Giá (VND/đơn vị)" name="price" rules={[{ required: true, message: "Vui lòng nhập giá" }]}>
                   <InputNumber style={{ width: "100%" }} placeholder="Nhập giá" min={0} />
                 </Form.Item>
               )}
               <Form.Item label="Loại dịch vụ" name="type" rules={[{ required: true, message: "Vui lòng chọn loại dịch vụ" }]}>
                 <Select options={serviceTypeOptions} placeholder="Chọn loại dịch vụ" />
               </Form.Item>
             </Form>
            </Modal>

            {/* Modal cập nhật giá */}
            <Modal
              title={`Cập nhật giá dịch vụ: ${selectedServiceForPrice?.name}`}
              open={isPriceModalOpen}
              onCancel={handlePriceModalCancel}
              footer={[
                <Button key="back" onClick={handlePriceModalCancel}>Hủy</Button>,
                <Button key="submit" type="primary" loading={isSubmitting} onClick={() => priceForm.submit()}>
                  Cập nhật giá
                </Button>
              ]}
            >
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <div style={{ color: '#52c41a', fontWeight: 500, marginBottom: 4 }}>ℹ️ Lưu ý:</div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  • Giá mới sẽ được lưu vào lịch sử và chỉ áp dụng từ ngày hiệu lực<br/>
                  • Giá hiện tại vẫn được sử dụng cho đến ngày hiệu lực<br/>
                  • Ngày hiệu lực phải cách ngày hiện tại ít nhất 5 ngày (để đảm bảo người thuê có đủ thời gian chuẩn bị)<br/>
                  • Bạn có thể xem trạng thái trong "Lịch sử giá"
                </div>
              </div>
              <Form layout="vertical" form={priceForm} onFinish={handleUpdatePriceSubmit}>
                <Form.Item label="Giá mới (VND/đơn vị)" name="newUnitPrice" rules={[{ required: true, message: "Vui lòng nhập giá mới" }]}>
                  <InputNumber style={{ width: "100%" }} placeholder="Nhập giá mới" min={0} />
                </Form.Item>
                <Form.Item 
                  label="Ngày hiệu lực" 
                  name="effectiveDate" 
                  rules={[{ required: true, message: "Vui lòng chọn ngày hiệu lực" }]}
                  extra="Ngày hiệu lực phải cách ngày hiện tại ít nhất 5 ngày"
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    placeholder="Chọn ngày hiệu lực" 
                    disabledDate={(current) => {
                      // Không cho chọn ngày trong quá khứ và chỉ cho chọn từ 5 ngày trở đi
                      const today = dayjs().startOf('day');
                      const fiveDaysFromNow = dayjs().add(5, 'day').startOf('day');
                      return current && (current.isBefore(today) || current.isBefore(fiveDaysFromNow));
                    }}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
                <Form.Item label="Lý do thay đổi" name="reason">
                  <Input.TextArea placeholder="Nhập lý do thay đổi giá (tùy chọn)" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Modal lịch sử giá */}
            <Modal
              title={`Lịch sử giá dịch vụ: ${selectedServiceForPrice?.name}`}
              open={isHistoryModalOpen}
              onCancel={() => setIsHistoryModalOpen(false)}
              footer={null}
              width={isMobile ? '95%' : 800}
              style={{ top: isMobile ? 20 : 100 }}
            >

                         <Table
               dataSource={priceHistory}
               rowKey="id"
               columns={[
                 {
                   title: "Giá (VND)",
                   dataIndex: "unitPrice",
                   key: "unitPrice",
                   render: (value) => value ? value.toLocaleString("vi-VN") : "0",
                 },
                 {
                   title: "Ngày hiệu lực",
                   dataIndex: "effectiveDate",
                   key: "effectiveDate",
                   render: (date) => date ? new Date(date).toLocaleDateString("vi-VN") : "-",
                 },
                 {
                   title: "Ngày kết thúc",
                   dataIndex: "endDate",
                   key: "endDate",
                   render: (date) => date ? new Date(date).toLocaleDateString("vi-VN") : "Hiện tại",
                 },
                 {
                   title: "Lý do",
                   dataIndex: "reason",
                   key: "reason",
                   render: (reason) => reason || "-",
                 },
                 {
                   title: "Trạng thái",
                   dataIndex: "isActive",
                   key: "isActive",
                                       render: (isActive, record, index) => {
                      const today = new Date();
                      const effectiveDate = record.effectiveDate ? new Date(record.effectiveDate) : null;
                      
                      if (isActive) {
                        return <Tag color="green">Đang áp dụng</Tag>;
                      } else {
                        // Tìm mục không active có ngày hiệu lực mới nhất từ priceHistory state
                        const nonActiveRecords = priceHistory.filter(item => !item.isActive);
                        const latestNonActive = nonActiveRecords.length > 0 ? nonActiveRecords[0] : null;
                        
                        if (latestNonActive && record.id === latestNonActive.id && effectiveDate && effectiveDate > today) {
                          // Mới nhất thay đổi và chưa đến ngày hiệu lực
                          return <Tag color="orange">Chờ áp dụng</Tag>;
                        } else {
                          // Các thay đổi giá trước đó
                          return <Tag color="red">Đã hủy</Tag>;
                        }
                      }
                    },
                 },
                 {
                   title: "Thao tác",
                   key: "actions",
                   render: (_, record) => (
                     <Space>
                       {!record.isActive && (
                         <Popconfirm
                           title="Xóa lịch sử giá"
                           description="Bạn có chắc muốn xóa lịch sử giá này?"
                           onConfirm={() => handleDeletePriceHistory(record.id)}
                           okText="Xóa"
                           cancelText="Không"
                         >
                           <Button
                             icon={<DeleteOutlined />}
                             danger
                             size="small"
                             title="Xóa lịch sử giá"
                           />
                         </Popconfirm>
                       )}
                     </Space>
                   ),
                 },
               ]}
               pagination={false}
               size="small"
               scroll={{ x: isMobile ? 600 : 'auto' }}
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
