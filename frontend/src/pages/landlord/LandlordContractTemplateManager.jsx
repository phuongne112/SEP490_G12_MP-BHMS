import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tag, Drawer, Space } from 'antd';
import { MenuOutlined, DeleteOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import {
  getTemplates,
  createOrUpdateTemplate,
  deleteTemplate,
  setDefaultTemplate,
} from '../../services/contractTemplateApi';
import { useSelector } from 'react-redux';
import Handlebars from 'handlebars';
import { useMediaQuery } from 'react-responsive';

export default function LandlordContractTemplateManager() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [form] = Form.useForm();
  const user = useSelector((state) => state.account.user);
  const landlordId = user?.id;
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const [sampleData, setSampleData] = useState({
    landlord: { userInfo: { fullName: 'Nguyễn Văn A', phone: '0123456789', address: '123 Đường ABC' } },
    room: { roomNumber: '101', address: '123 Đường ABC' },
    contract: { rentAmount: 3000000, contractNumber: 'HD001' },
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    renters: [
      { fullName: 'Trần Thị B', phone: '0987654321', identityNumber: '123456789' },
      { fullName: 'Lê Văn C', phone: '0911222333', identityNumber: '987654321' },
    ],
  });
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue(editing);
    } else {
      form.resetFields();
    }
  }, [editing, form]);

  const fetchTemplates = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const res = await getTemplates(landlordId);
      setTemplates(res.data);
    } catch (e) {
      message.error('Không thể tải danh sách mẫu hợp đồng');
    }
    setLoading(false);
  };

  const handleSave = async (values) => {
    try {
      await createOrUpdateTemplate({ ...editing, ...values, landlordId });
      message.success(editing?.id ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      setEditing(null);
      fetchTemplates();
    } catch (e) {
      message.error('Lưu mẫu hợp đồng thất bại!');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTemplate(id);
      message.success('Đã xóa mẫu hợp đồng!');
      fetchTemplates();
    } catch (e) {
      message.error('Xóa thất bại!');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultTemplate(id, landlordId);
      message.success('Đã đặt làm mẫu mặc định!');
      fetchTemplates();
    } catch (e) {
      message.error('Cập nhật thất bại!');
    }
  };

  const handlePreview = (template) => {
    setPreviewing(template);
    try {
      const compiled = Handlebars.compile(template.content || '');
      setPreviewHtml(compiled(sampleData));
    } catch (e) {
      setPreviewHtml('<div style="color:red">Lỗi khi render template!</div>');
    }
  };

  const columns = [
    { 
      title: 'Tên mẫu', 
      dataIndex: 'name', 
      key: 'name',
      width: isMobile ? 120 : 200
    },
    {
      title: 'Mặc định',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: isMobile ? 80 : 100,
      render: (val) => val ? <Tag color="green">Mặc định</Tag> : null,
    },
    {
      title: 'Hành động',
      key: 'action',
      align: "center",
      width: isMobile ? 150 : 200,
      render: (_, record) => (
        <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
          <Button 
            type="default"
            size="small" 
            style={{ color: "#faad14", borderColor: "#faad14" }}
            onClick={() => setEditing(record)}
          >
            Sửa
          </Button>
          <Button 
            type="dashed"
            size="small" 
            onClick={() => handlePreview(record)}
          >
            Preview
          </Button>
          {!record.isDefault && (
            <Button 
              type="default"
              size="small" 
              onClick={() => handleSetDefault(record.id)}
            >
              Đặt mặc định
            </Button>
          )}
          <Popconfirm title="Xóa mẫu này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Không">
            <Button 
              icon={<DeleteOutlined />}
              type="primary"
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Mobile Header */}
      {isMobile && (
        <div style={{
          background: "#001529",
          color: "white",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              style={{ color: "white", marginRight: "12px" }}
            />
            <span style={{ fontSize: "18px", fontWeight: "600" }}>MP-BHMS</span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: "500" }}>Mẫu hợp đồng</span>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          <LandlordSidebar />
        </Drawer>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, flexDirection: isMobile ? "column" : "row" }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            style={{
              minWidth: 220,
              background: "#fff",
              borderRight: "1px solid #eee",
            }}
          >
            <LandlordSidebar />
          </div>
        )}
        
        {/* Content Area */}
        <div style={{ 
          flex: 1, 
          padding: isMobile ? "16px" : 24,
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
                fontSize: "32px", 
                marginBottom: "20px",
                fontWeight: "600",
                color: "#1a1a1a"
              }}>
                Mẫu hợp đồng
              </h1>
            </div>
          )}

          {/* Main Content Card */}
          <div style={{ 
            backgroundColor: "#fff", 
            borderRadius: "8px", 
            padding: isMobile ? "16px" : "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <Button 
              type="primary" 
              onClick={() => setEditing({})} 
              style={{ 
                marginBottom: 16, 
                width: isMobile ? '100%' : 'auto',
                height: isMobile ? '40px' : 'auto'
              }}
            >
              Thêm mẫu hợp đồng
            </Button>
            
            <Table 
              columns={columns} 
              dataSource={templates} 
              rowKey="id" 
              loading={loading} 
              pagination={false}
              scroll={{ x: isMobile ? 400 : 'auto' }}
              size={isMobile ? "small" : "middle"}
              style={{ fontSize: isMobile ? "12px" : "14px" }}
              bordered
            />
          </div>

          {/* Edit Modal */}
          <Modal
            open={!!editing}
            onCancel={() => setEditing(null)}
            title={editing?.id ? 'Chỉnh sửa mẫu hợp đồng' : 'Tạo mẫu hợp đồng mới'}
            onOk={() => form.submit()}
            okText="Lưu"
            cancelText="Hủy"
            width={isMobile ? '95%' : 800}
            style={{ top: isMobile ? 20 : 100 }}
          >
            <Form
              form={form}
              initialValues={editing}
              onFinish={handleSave}
              layout="vertical"
              id="template-form"
            >
              <Form.Item name="name" label="Tên mẫu" rules={[{ required: true, message: 'Vui lòng nhập tên mẫu!' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="content" label="Nội dung mẫu (HTML, hỗ trợ biến Handlebars)" rules={[{ required: true, message: 'Vui lòng nhập nội dung mẫu!' }]}>
                <Input.TextArea rows={isMobile ? 8 : 12} />
              </Form.Item>
            </Form>
            <div style={{ marginTop: 16, fontSize: isMobile ? 11 : 13, color: '#888' }}>
              <b>Biến có thể sử dụng:</b> <br />
              <code style={{ fontSize: isMobile ? 10 : 12 }}>
                {'{{landlord.userInfo.fullName}}, {{room.roomNumber}}, {{contract.rentAmount}}, {{startDate}}, {{endDate}}, {{#each renters}}...{{/each}}'}
              </code>
            </div>
          </Modal>

          {/* Preview Drawer */}
          <Drawer
            open={!!previewing}
            onClose={() => setPreviewing(null)}
            title={`Preview: ${previewing?.name}`}
            width={isMobile ? '100%' : 700}
            placement={isMobile ? "bottom" : "right"}
            height={isMobile ? "80%" : undefined}
          >
            <div style={{ 
              background: '#fff', 
              padding: isMobile ? 16 : 24, 
              minHeight: isMobile ? 300 : 400 
            }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </Drawer>
        </div>
      </div>
    </div>
  );
} 