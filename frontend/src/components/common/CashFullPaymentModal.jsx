import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { Modal, Form, Button, Alert, Space, Typography } from 'antd';
import { message } from 'antd';

const { Text } = Typography;

export default function CashFullPaymentModal({ 
  visible, 
  onCancel, 
  onOk, 
  bill, 
  outstandingAmount 
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [overdueInterest, setOverdueInterest] = useState(0);
  const [totalWithInterest, setTotalWithInterest] = useState(0);

  useEffect(() => {
    if (visible && bill) {
      calculateInterest();
    }
  }, [visible, bill, outstandingAmount]);

  // Đồng bộ lại tổng tiền khi lãi thay đổi
  useEffect(() => {
    setTotalWithInterest(Number(outstandingAmount) + Number(overdueInterest));
  }, [outstandingAmount, overdueInterest]);

  const calculateInterest = () => {
    // Tính lãi suất quá hạn (nếu có)
    if (bill.dueDate) {
      const dueDate = dayjs(bill.dueDate);
      const currentDate = dayjs();
      const monthsOverdue = currentDate.diff(dueDate, 'month');
      
      if (monthsOverdue > 0) {
        const interestRate = 0.005; // 0.5% mỗi tháng
        const interest = Number(outstandingAmount) * interestRate * monthsOverdue;
        setOverdueInterest(Math.max(0, interest));
      } else {
        setOverdueInterest(0);
      }
    } else {
      setOverdueInterest(0);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      setLoading(true);
      
      const computedTotal = Number(outstandingAmount) + Number(overdueInterest);
      const request = {
        billId: bill.id,
        originalPaymentAmount: Number(outstandingAmount), // Luôn là số tiền còn nợ
        partialPaymentFee: 0, // Không có phí thanh toán từng phần
        overdueInterest: overdueInterest,
        totalWithFees: computedTotal,
        paymentMethod: 'CASH',
        notes: 'Thanh toán toàn phần tiền mặt'
      };
      
      console.log('Cash full payment request:', request);
      
      onOk(request);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Thanh toán toàn phần tiền mặt"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Alert
          message="Thông tin hóa đơn"
          description={
            <div>
              <p><strong>Hóa đơn #:</strong> {bill?.id || 'N/A'}</p>
              <p><strong>Phòng:</strong> {bill?.room?.roomNumber || 'N/A'}</p>
              <p><strong>Tổng tiền:</strong> {formatCurrency(bill?.totalAmount)}</p>
              <p><strong>Đã thanh toán:</strong> {formatCurrency(bill?.paidAmount || 0)}</p>
              <p><strong>Còn nợ:</strong> {formatCurrency(outstandingAmount)}</p>
              <p><strong>Lần thanh toán:</strong> <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Toàn phần</span></p>
            </div>
          }
          type="info"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />

        <Alert
          message="Thông tin thanh toán toàn phần"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                <strong>Phí cố định:</strong> Không có phí thanh toán từng phần
              </p>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#fff2e8', 
                border: '1px solid #ffbb96', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#d46b08'
              }}>
                <div>✅ Thanh toán toàn phần: Số tiền còn nợ sẽ được thanh toán hoàn toàn</div>
                <div>✅ Không có phí thanh toán từng phần</div>
              </div>
            </div>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label="Số tiền thanh toán"
          style={{ marginBottom: '16px' }}
        >
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            color: '#52c41a',
            fontWeight: '500',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            {formatCurrency(outstandingAmount)}
          </div>
        </Form.Item>

        {/* Thông tin lãi suất quá hạn */}
        {overdueInterest > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Lãi suất quá hạn"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>Lãi suất quá hạn:</strong> 0.5% mỗi tháng
                  </p>
                  <div style={{ 
                    marginTop: 12, 
                    padding: '12px', 
                    backgroundColor: '#fff2f0', 
                    border: '1px solid #ffccc7', 
                    borderRadius: '6px' 
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#cf1322' }}>
                      <strong>Lãi suất lần này:</strong> {formatCurrency(overdueInterest)}
                    </p>
                  </div>
                </div>
              }
              type="error"
              showIcon={false}
            />
          </div>
        )}

        <Alert
          message={`Tổng cộng: ${totalWithInterest.toLocaleString()} ₫`}
          description={
            <div>
              <Text>Số tiền gốc: {Number(outstandingAmount).toLocaleString()} ₫</Text><br />
              <Text>Phí thanh toán: 0 ₫</Text><br />
              <Text>Lãi suất: {overdueInterest.toLocaleString()} ₫</Text>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Alert
          message="Lưu ý"
          description="Sau khi xác nhận, chủ trọ sẽ được thông báo để kiểm tra và xác nhận thanh toán tiền mặt."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleOk}
              loading={loading}
            >
              Xác nhận thanh toán
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
