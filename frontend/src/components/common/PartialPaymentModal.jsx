import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Button, message, Alert, Divider, Card, Statistic } from 'antd';
import { createPartialPaymentVnPayUrl, getPaymentCount } from '../../services/billApi';
import dayjs from 'dayjs';
const { TextArea } = Input;

const PartialPaymentModal = ({ visible, onCancel, onSuccess, bill }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [partialPaymentFee, setPartialPaymentFee] = useState(0);
  const [overdueInterest, setOverdueInterest] = useState(0);
  const [totalWithFees, setTotalWithFees] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [loadingPaymentCount, setLoadingPaymentCount] = useState(false);

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
        width={600}
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

  // Lấy số lần thanh toán đã thực hiện và set giá trị mặc định
  useEffect(() => {
    if (visible && bill?.id) {
      fetchPaymentCount();
      
      // Set giá trị mặc định là tối đa (100% số tiền còn nợ)
      const maxAmount = getOutstandingAmount();
      setPaymentAmount(maxAmount);
      form.setFieldsValue({ paymentAmount: maxAmount });
    }
  }, [visible, bill?.id]);

  const fetchPaymentCount = async () => {
    setLoadingPaymentCount(true);
    try {
      const response = await getPaymentCount(bill.id);
      setPaymentCount(response.paymentCount || 0);
    } catch (error) {
      console.error('Error fetching payment count:', error);
      setPaymentCount(0);
    } finally {
      setLoadingPaymentCount(false);
    }
  };

  // Tính phí thanh toán từng phần dựa trên số lần thanh toán
  const calculatePartialPaymentFee = (paymentCount) => {
    switch (paymentCount) {
      case 0:
        return 200000; // 200.000 VNĐ cho lần thanh toán đầu tiên
      case 1:
        return 500000; // 500.000 VNĐ cho lần thanh toán thứ 2
      case 2:
        return 1000000; // 1.000.000 VNĐ cho lần thanh toán thứ 3
      default:
        return 1000000; // Tối đa 1.000.000 VNĐ cho các lần sau
    }
  };

  // Tính lãi suất quá hạn dựa trên thời gian quá hạn
  const calculateOverdueInterest = (amount, monthsOverdue) => {
    if (monthsOverdue <= 0) return 0;
    
    // Lãi suất theo tháng: 2% mỗi tháng
    const monthlyRate = 0.02;
    const interest = amount * monthlyRate * monthsOverdue;
    
    // Giới hạn lãi suất tối đa: 5% của số tiền nợ
    const maxInterest = Math.min(interest, amount * 0.05);
    
    return Math.round(maxInterest);
  };

  // Tính số tháng quá hạn
  const calculateMonthsOverdue = () => {
    if (!bill.dueDate) return 0;
    
    try {
      const dueDate = dayjs(bill.dueDate);
      const currentDate = dayjs();
      
      if (currentDate.isBefore(dueDate)) return 0;
      
      const diffMonths = currentDate.diff(dueDate, 'month', true);
      return Math.max(0, Math.ceil(diffMonths));
    } catch (error) {
      console.error('Error calculating months overdue:', error);
      return 0;
    }
  };

  // Tính toán phí và lãi suất khi số tiền thanh toán thay đổi
  useEffect(() => {
    const outstandingAmount = getOutstandingAmount();
    const remainingAmount = outstandingAmount - paymentAmount;
    const monthsOverdue = calculateMonthsOverdue();
    
    // Tính phí thanh toán từng phần (dựa trên số lần thanh toán đã thực hiện)
    const partialFee = calculatePartialPaymentFee(paymentCount);
    
    // Tính lãi suất quá hạn cho số tiền còn lại
    const overdueInt = calculateOverdueInterest(remainingAmount, monthsOverdue);
    
    console.log('Payment calculation:', {
      paymentAmount,
      paymentCount,
      partialFee,
      overdueInt,
      outstandingAmount,
      remainingAmount,
      monthsOverdue
    });
    
    setPartialPaymentFee(partialFee);
    setOverdueInterest(overdueInt);
    setTotalWithFees(paymentAmount + partialFee + overdueInt);
  }, [paymentAmount, bill, paymentCount]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Đảm bảo số tiền là số hợp lệ
      const paymentAmount = Number(values.paymentAmount) || 0;
      
      if (paymentAmount <= 0) {
        message.error('Số tiền thanh toán không hợp lệ');
        setLoading(false);
        return;
      }

      // Tính tổng số tiền cần thanh toán (bao gồm cả phí)
      const totalAmountToPay = paymentAmount + partialPaymentFee + overdueInterest;
      
      const request = {
        billId: bill.id,
        paymentAmount: totalAmountToPay, // Gửi tổng số tiền bao gồm cả phí
        paymentMethod: 'VNPAY',
        notes: values.notes || '',
        partialPaymentFee: partialPaymentFee, // Phí thanh toán từng phần
        overdueInterest: overdueInterest, // Lãi suất quá hạn
        totalWithFees: totalAmountToPay, // Tổng bao gồm cả phí
        originalPaymentAmount: paymentAmount // Lưu số tiền gốc để backend xử lý
      };

      console.log('Payment request:', request);
      console.log('Original amount:', paymentAmount, 'Total with fees:', totalAmountToPay);

      // Tạo URL thanh toán VNPAY
      const vnpayResponse = await createPartialPaymentVnPayUrl(request);
      if (vnpayResponse.success) {
        message.success(`Đang chuyển hướng đến VNPAY... Tổng thanh toán: ${formatCurrency(totalAmountToPay)}`);
        window.location.href = vnpayResponse.paymentUrl;
      } else {
        message.error(vnpayResponse.message || 'Có lỗi xảy ra khi tạo link thanh toán');
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

  const getMaxPaymentAmount = () => {
    return getOutstandingAmount(); // Tối đa là số tiền còn nợ (100%)
  };

  const handleAmountChange = (value) => {
    // Đảm bảo giá trị là số
    const numericValue = Number(value) || 0;
    setPaymentAmount(numericValue);
    console.log('Amount changed:', { original: value, processed: numericValue });
  };

  const monthsOverdue = calculateMonthsOverdue();
  const outstandingAmount = getOutstandingAmount();
  const minPayment = getMinPaymentAmount();
  const maxPayment = getMaxPaymentAmount();

  return (
    <Modal
      title="Thanh toán từng phần"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Thông tin hóa đơn"
          description={
            <div>
              <p><strong>Hóa đơn #:</strong> {bill.id || 'N/A'}</p>
              <p><strong>Phòng:</strong> {bill.roomNumber || 'N/A'}</p>
              <p><strong>Tổng tiền:</strong> {formatCurrency(bill.totalAmount)}</p>
              <p><strong>Đã thanh toán (gốc):</strong> {formatCurrency(bill.paidAmount || 0)}</p>
              {(bill.partialPaymentFeesCollected || 0) > 0 && (
                <p><strong>Phí thanh toán từng phần đã thu:</strong> {formatCurrency(bill.partialPaymentFeesCollected || 0)}</p>
              )}
              <p><strong>Còn nợ:</strong> {formatCurrency(outstandingAmount)}</p>
              <p><strong>Tối thiểu thanh toán (50%):</strong> <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(minPayment)}</span></p>
              <p><strong>Tối đa thanh toán:</strong> 
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(maxPayment)}</span>
                <span style={{ color: '#52c41a', fontSize: '12px', marginLeft: '8px' }}>(100% số tiền còn nợ)</span>
              </p>
            </div>
          }
          type="info"
          showIcon={false}
        />
      </div>

      {/* Thông tin phí thanh toán từng phần */}
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Phí thanh toán từng phần"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                <strong>Phí cố định theo số lần thanh toán:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Lần 1: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>200.000 ₫</span></li>
                <li>Lần 2: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>500.000 ₫</span></li>
                <li>Lần 3+: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>1.000.000 ₫</span></li>
              </ul>
              
              <div style={{ 
                marginTop: 12, 
                padding: '12px', 
                backgroundColor: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px' 
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#cf1322' }}>
                  <strong>Phí lần này:</strong> {formatCurrency(partialPaymentFee)} 
                  {paymentCount > 0 && ` (lần thanh toán thứ ${paymentCount + 1})`}
                  {loadingPaymentCount && ' (đang tải...)'}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                  <em>⚠️ Phí này sẽ được tính bất kể số tiền thanh toán (từ 50% đến 100%)</em>
                </p>
                {paymentCount === 0 && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#1890ff' }}>
                    <em>💡 Lần đầu: Thanh toán từ 50% đến 100% số tiền còn nợ. Nút "Tối đa" sẽ xuất hiện từ lần thứ 2.</em>
                  </p>
                )}
              </div>
            </div>
          }
          type="warning"
          showIcon={false}
        />
      </div>

      {/* Thông tin lãi suất quá hạn */}
      {monthsOverdue > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Lãi suất quá hạn"
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong>Lãi suất quá hạn:</strong> 2% mỗi tháng
                </p>
                <div style={{ 
                  marginTop: 12, 
                  padding: '12px', 
                  backgroundColor: '#fff2f0', 
                  border: '1px solid #ffccc7', 
                  borderRadius: '6px' 
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#cf1322' }}>
                    <strong>⚠️ Hóa đơn đã quá hạn {monthsOverdue} tháng</strong>
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                    Lãi suất sẽ được tính cho số tiền còn lại sau khi thanh toán từng phần
                  </p>
                </div>
              </div>
            }
            type="error"
            showIcon={false}
          />
        </div>
      )}

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
                  // Kiểm tra số tiền có phải là số không
                  if (value && isNaN(Number(value))) {
                    return Promise.reject('Số tiền thanh toán phải là số');
                  }
                  
                  if (value && value <= 0) {
                    return Promise.reject('Số tiền thanh toán phải lớn hơn 0');
                  }
                  if (value && value < minPayment) {
                    return Promise.reject(`Số tiền thanh toán phải tối thiểu 50% (${formatCurrency(minPayment)})`);
                  }
                  if (value && value > maxPayment) {
                    return Promise.reject(`Số tiền thanh toán không được vượt quá số tiền còn nợ (${formatCurrency(maxPayment)})`);
                  }
                  return Promise.resolve();
                }
              }
            ]}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <InputNumber
              style={{ flex: 1 }}
              placeholder={`Tối thiểu ${formatCurrency(minPayment)} - Tối đa ${formatCurrency(maxPayment)} (100%)`}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => {
                const parsed = value.replace(/\$\s?|(,*)/g, '');
                return Number(parsed) || 0;
              }}
              min={0} // Cho phép nhập từ 0, validation sẽ kiểm tra minPayment
              max={maxPayment}
              precision={2} // Cho phép số thập phân đến 2 chữ số
              onChange={handleAmountChange}
            />
            {paymentCount > 0 && (
              <Button 
                type="default" 
                size="small"
                onClick={() => {
                  form.setFieldsValue({ paymentAmount: maxPayment });
                  handleAmountChange(maxPayment);
                }}
              >
                Tối đa
              </Button>
            )}
            <Button 
              type="default" 
              size="small"
              onClick={() => {
                form.setFieldsValue({ paymentAmount: minPayment });
                handleAmountChange(minPayment);
              }}
            >
              50%
            </Button>
          </div>
        </Form.Item>

        {/* Hiển thị thông tin tính toán */}
        {paymentAmount > 0 && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <Statistic
                title="Số tiền thanh toán"
                value={paymentAmount}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#1890ff' }}
              />
              <Statistic
                title="Phí thanh toán từng phần"
                value={partialPaymentFee}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#faad14' }}
              />
              {overdueInterest > 0 && (
                <Statistic
                  title="Lãi suất quá hạn"
                  value={overdueInterest}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: '#cf1322' }}
                />
              )}
              <Statistic
                title="Tổng thanh toán"
                value={totalWithFees}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </div>
            
            <div style={{ 
              marginTop: 12, 
              padding: '8px 12px', 
              backgroundColor: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#cf1322'
            }}>
              <strong>Chi tiết:</strong> {formatCurrency(paymentAmount)} (thanh toán) + {formatCurrency(partialPaymentFee)} (phí từng phần)
              {overdueInterest > 0 && ` + ${formatCurrency(overdueInterest)} (lãi suất quá hạn)`} = {formatCurrency(totalWithFees)}
            </div>
            {paymentAmount === maxPayment && (
              <div style={{ 
                marginTop: 8, 
                padding: '8px 12px', 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#52c41a'
              }}>
                <strong>✅ Thanh toán tối đa:</strong> 100% số tiền còn nợ - Phí từng phần vẫn được tính theo quy định
              </div>
            )}
          </Card>
        )}

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
            <div>
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
                borderColor: '#1890ff'
              }}
            >
              Thanh toán {paymentAmount > 0 ? formatCurrency(totalWithFees) : ''} qua VNPAY
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PartialPaymentModal;
