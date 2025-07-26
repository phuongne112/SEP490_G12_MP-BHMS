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
} from "antd";
import { PlusOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import ServiceTable from "../../components/landlord/ServiceTable";
import { getAllServices, createService, updateService, deleteService } from "../../services/serviceApi";
import { debounce } from "lodash";
import ServiceFilterPopover from "../../components/landlord/ServiceFilterPopover";
import { useMediaQuery } from "react-responsive";

const { Sider, Content } = Layout;

export default function LandlordServiceListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: isMobile ? 3 : 5, total: 0 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [form] = Form.useForm();
  
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
        price: service.price,
        type: service.type,
        unit: service.unit,
      });
      setIsModalOpen(true);
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
      const serviceData = {
        serviceName: values.name,
        unitPrice: values.price,
        serviceType: values.type,
        unit: values.unit,
      };

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

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
      {!isMobile && (
        <Sider width={220}>
          <LandlordSidebar />
        </Sider>
      )}
      <Layout>
        <Content style={{ padding: isMobile ? 16 : 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
          <div style={{ 
            background: 'white', 
            padding: isMobile ? 16 : 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 20
          }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "stretch" : "center", 
              marginBottom: 12,
              gap: isMobile ? 12 : 0
            }}>
              <PageHeader title="Danh sách dịch vụ" style={{ margin: 0, padding: 0 }} />
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? "column" : "row",
                alignItems: 'center', 
                gap: 12,
                width: isMobile ? "100%" : "auto"
              }}>
                <Input
                  placeholder="Tìm tên dịch vụ"
                  prefix={<SearchOutlined />}
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  style={{ width: isMobile ? "100%" : 250 }}
                />
                <Popover
                  content={<ServiceFilterPopover onFilter={handleAdvancedFilterApply} onClose={() => setIsFilterOpen(false)} onReset={handleResetFilter} />}
                  trigger="click"
                  placement="bottomRight"
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                >
                  <Button 
                    icon={<FilterOutlined />} 
                    type="default"
                    style={{ width: isMobile ? "100%" : "auto" }}
                  >
                    Bộ lọc
                  </Button>
                </Popover>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsModalOpen(true)}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Thêm dịch vụ
                </Button>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: 'space-between', 
              alignItems: isMobile ? "stretch" : "center",
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              fontSize: isMobile ? 12 : 14,
              gap: isMobile ? 8 : 0
            }}>
              <div style={{ color: '#666' }}>
                Hiển thị
                <Select
                  style={{ width: isMobile ? 60 : 80, margin: "0 8px" }}
                  value={pagination.pageSize}
                  onChange={handlePageSizeChange}
                  options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
                  size={isMobile ? "small" : "middle"}
                />
                mục
              </div>
              <div style={{ fontWeight: 500, color: "#1890ff" }}>
                Tổng: {pagination.total} dịch vụ
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
            <ServiceTable
              services={services}
              pagination={pagination}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDeleteService}
              onTableChange={handleTableChange}
            />
          </div>

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
              <Form.Item label="Giá (VND/đơn vị)" name="price" rules={[{ required: true, message: "Vui lòng nhập giá" }]}>
                <InputNumber style={{ width: "100%" }} placeholder="Nhập giá" min={0} />
              </Form.Item>
              <Form.Item label="Loại dịch vụ" name="type" rules={[{ required: true, message: "Vui lòng chọn loại dịch vụ" }]}>
                <Select options={serviceTypeOptions} placeholder="Chọn loại dịch vụ" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
