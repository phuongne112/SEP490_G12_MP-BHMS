import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tag, Drawer } from 'antd';
import {
  getTemplates,
  createOrUpdateTemplate,
  deleteTemplate,
  setDefaultTemplate,
} from '../../services/contractTemplateApi';
import { useSelector } from 'react-redux';
import Handlebars from 'handlebars';

export default function LandlordContractTemplateManager() {
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
    { title: 'Tên mẫu', dataIndex: 'name', key: 'name' },
    {
      title: 'Mặc định',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (val) => val ? <Tag color="green">Mặc định</Tag> : null,
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => setEditing(record)} style={{ marginRight: 8 }}>
            Sửa
          </Button>
          <Popconfirm title="Xóa mẫu này?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger style={{ marginRight: 8 }}>Xóa</Button>
          </Popconfirm>
          {!record.isDefault && (
            <Button size="small" onClick={() => handleSetDefault(record.id)} style={{ marginRight: 8 }}>
              Đặt mặc định
            </Button>
          )}
          <Button size="small" onClick={() => handlePreview(record)}>
            Preview
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2>Quản lý mẫu hợp đồng</h2>
      <Button type="primary" onClick={() => setEditing({})} style={{ marginBottom: 16 }}>
        Thêm mẫu hợp đồng
      </Button>
      <Table columns={columns} dataSource={templates} rowKey="id" loading={loading} pagination={false} />
      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        title={editing?.id ? 'Chỉnh sửa mẫu hợp đồng' : 'Tạo mẫu hợp đồng mới'}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        width={800}
      >
        <Form
          form={form}
          initialValues={editing}
          onFinish={handleSave}
          layout="vertical"
          id="template-form"
        >
          <Form.Item name="name" label="Tên mẫu">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Nội dung mẫu (HTML, hỗ trợ biến Handlebars)">
            <Input.TextArea rows={12} />
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
          <b>Biến có thể sử dụng:</b> <br />
          <code>{'{{landlord.userInfo.fullName}}, {{room.roomNumber}}, {{contract.rentAmount}}, {{startDate}}, {{endDate}}, {{#each renters}}...{{/each}}'}</code>
        </div>
      </Modal>
      <Drawer
        open={!!previewing}
        onClose={() => setPreviewing(null)}
        title={`Preview: ${previewing?.name}`}
        width={700}
      >
        <div style={{ background: '#fff', padding: 24, minHeight: 400 }}>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </Drawer>
    </div>
  );
} 