import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, Button, message, Alert, Divider } from 'antd';
import { createPartialPaymentVnPayUrl } from '../../services/billApi';
const { TextArea } = Input;

const PartialPaymentModal = ({ visible, onCancel, onSuccess, bill }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Debug logs
  console.log('PartialPaymentModal render:', { visible, bill });

  // Kiểm tra bill có tồn tại không
  if (!bill) {
    console.log('Bill is null/undefined, showing error modal');
    return (
      <Modal
        title="Thanh toán từng phần"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Alert
            message="Lỗi"
            description="Không tìm thấy thông tin hóa đơn"
            type="error"
            showIcon
          />
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const request = {
        billId: bill.id,
        paymentAmount: values.paymentAmount,
        paymentMethod: 'VNPAY', // Chỉ sử dụng VNPAY cho thanh toán từng phần
        notes: values.notes || ''
      };

      // Tạo URL thanh toán VNPAY
      const vnpayResponse = await createPartialPaymentVnPayUrl(request);
      if (vnpayResponse.success) {
        message.success('Đang chuyển hướng đến VNPAY...');
        window.location.href = vnpayResponse.paymentUrl;
      } else {
        message.error(vnpayResponse.message);
      }
    } catch (error) {
      console.error('Lỗi thanh toán từng phần:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getOutstandingAmount = () => {
    return bill.outstandingAmount || bill.totalAmount || 0;
  };

  const getMinPaymentAmount = () => {
    const outstanding = getOutstandingAmount();
    return outstanding * 0.5; // 50% của số tiền còn nợ
  };

  return (
    <Modal
      title="Thanh toán từng phần"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Thông tin hóa đơn"
          description={
            <div>
              <p><strong>Hóa đơn #:</strong> {bill.id || 'N/A'}</p>
              <p><strong>Phòng:</strong> {bill.roomNumber || 'N/A'}</p>
              <p><strong>Tổng tiền:</strong> {formatCurrency(bill.totalAmount)}</p>
              <p><strong>Đã thanh toán:</strong> {formatCurrency(bill.paidAmount || 0)}</p>
              <p><strong>Còn nợ:</strong> {formatCurrency(getOutstandingAmount())}</p>
              <p><strong>Tối thiểu thanh toán (50%):</strong> <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(getMinPaymentAmount())}</span></p>
            </div>
          }
          type="info"
          showIcon
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Số tiền thanh toán"
          name="paymentAmount"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền thanh toán' },
            {
              validator: (_, value) => {
                if (value && value > getOutstandingAmount()) {
                  return Promise.reject('Số tiền thanh toán không được vượt quá số tiền còn nợ');
                }
                if (value && value <= 0) {
                  return Promise.reject('Số tiền thanh toán phải lớn hơn 0');
                }
                if (value && value < getMinPaymentAmount()) {
                  return Promise.reject(`Số tiền thanh toán phải tối thiểu 50% (${formatCurrency(getMinPaymentAmount())})`);
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`Tối thiểu ${formatCurrency(getMinPaymentAmount())}`}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            min={getMinPaymentAmount()}
            max={getOutstandingAmount()}
          />
        </Form.Item>

        <Form.Item
          label="Phương thức thanh toán"
        >
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            color: '#52c41a',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '16px' }}>💳</span>
              <span>Thanh toán qua VNPAY</span>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              An toàn và nhanh chóng với cổng thanh toán VNPAY
            </div>
          </div>
        </Form.Item>

        <Form.Item
          label="Ghi chú"
          name="notes"
        >
          <TextArea
            rows={3}
            placeholder="Ghi chú về khoản thanh toán (tùy chọn)"
          />
        </Form.Item>

        <Divider />

        <Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ 
                backgroundColor: '#1890ff',
                borderColor: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>💳</span>
              Thanh toán qua VNPAY
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PartialPaymentModal;
