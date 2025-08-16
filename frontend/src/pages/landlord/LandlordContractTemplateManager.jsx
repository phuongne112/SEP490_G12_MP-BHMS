import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tag, Drawer, Space, Layout } from 'antd';
import { MenuOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
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

const { Sider, Content } = Layout;

export default function LandlordContractTemplateManager() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  
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
          <div
            style={{
              width: 220,
              background: '#001529',
              position: 'fixed',
              height: '100vh',
              zIndex: 1000,
              left: 0,
              top: 0,
            }}
          >
            <LandlordSidebar />
          </div>
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
                  Mẫu hợp đồng
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
                  fontSize: 18, 
                  fontWeight: 600,
                  marginBottom: 16,
                  color: '#1a1a1a'
                }}>
                  Mẫu hợp đồng
                </div>
                
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setEditing({})} 
                  size="middle"
                  style={{ 
                    width: '100%',
                    height: '40px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    marginBottom: 16
                  }}
                >
                  Thêm mẫu hợp đồng
                </Button>
                
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
                    <span style={{ fontWeight: 500, color: "#1890ff" }}>
                      {templates.length} mẫu
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 500, color: "#1890ff", fontSize: '12px' }}>
                      Tổng: {templates.length} mẫu hợp đồng
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
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: 600,
                    color: '#1a1a1a'
                  }}>
                    Mẫu hợp đồng
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setEditing({})} 
                    size="middle"
                    style={{ 
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: '500',
                      borderRadius: '8px'
                    }}
                  >
                    Thêm mẫu hợp đồng
                  </Button>
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
                    <span style={{ fontWeight: 500, color: "#1890ff" }}>
                      {templates.length} mẫu
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 500, color: "#1890ff" }}>
                      Tổng: {templates.length} mẫu hợp đồng
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