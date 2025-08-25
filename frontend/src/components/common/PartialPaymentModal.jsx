import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Button, message, Alert, Space, Typography } from 'antd';
import { createPartialPaymentVnPayUrl, getPaymentCount } from '../../services/billApi';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
const { Text } = Typography;

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
      
      // Set giá trị mặc định là tối thiểu (50% số tiền còn nợ) để đồng bộ với tiền mặt
      const minAmount = getOutstandingAmount() * 0.5;
      setPaymentAmount(minAmount);
      form.setFieldsValue({ paymentAmount: minAmount });
      // Đồng bộ tính phí/lãi và tổng tiền như logic tiền mặt
      setTimeout(() => {
        try { handleAmountChange(minAmount); } catch (_) {}
      }, 0);
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

  // 🆕 Tính số ngày từ lần thanh toán cuối cùng
  const getDaysSinceLastPayment = () => {
    if (!bill || !bill.lastPaymentDate) return null;
    try {
      // Parse theo định dạng từ backend và fallback ISO
      const parsed = dayjs(bill.lastPaymentDate, 'YYYY-MM-DD HH:mm:ss A', true);
      const lastPaymentDate = parsed.isValid() ? parsed : dayjs(bill.lastPaymentDate);
      if (!lastPaymentDate.isValid()) return null;
      const currentDate = dayjs();
      const daysDiff = currentDate.diff(lastPaymentDate, 'day');
      return Math.max(0, daysDiff);
    } catch (error) {
      console.error('Error calculating days since last payment:', error);
      return null;
    }
  };

  // 🆕 Kiểm tra có thể thanh toán từng phần không
  const canMakePartialPayment = () => {
    if (!bill || !bill.isPartiallyPaid || !bill.lastPaymentDate) return true;
    
    const daysSinceLastPayment = getDaysSinceLastPayment();
    if (daysSinceLastPayment === null) return true;
    
    return daysSinceLastPayment >= 30;
  };

  // 🆕 Lấy số ngày còn lại cần đợi
  const getRemainingDays = () => {
    const daysSinceLastPayment = getDaysSinceLastPayment();
    if (daysSinceLastPayment === null) return 0;
    
    return Math.max(0, 30 - daysSinceLastPayment);
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

      // 🆕 Kiểm tra khoảng thời gian 30 ngày
      if (!canMakePartialPayment()) {
        const remainingDays = getRemainingDays();
        message.error(`Bạn phải đợi thêm ${remainingDays} ngày nữa mới được thanh toán từng phần tiếp theo. Khoảng thời gian tối thiểu giữa các lần thanh toán từng phần là 30 ngày.`);
        setLoading(false);
        return;
      }

      // Tính tổng số tiền cần thanh toán (bao gồm cả phí)
      const totalAmountToPay = paymentAmount + partialPaymentFee + overdueInterest;
      
      const request = {
        billId: bill.id,
        paymentAmount: totalAmountToPay, // Gửi tổng số tiền bao gồm cả phí
        paymentMethod: 'VNPAY',
        notes: 'Thanh toán từng phần qua VNPAY',
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
        // 🆕 Trigger refresh notifications ngay lập tức
        window.dispatchEvent(new Event('refresh-notifications'));
        // 🆕 Hiện notification toast
        window.dispatchEvent(new CustomEvent('show-notification-toast', {
          detail: { message: `Yêu cầu thanh toán ${formatCurrency(totalAmountToPay)} đã được tạo`, type: 'success' }
        }));
        window.location.href = vnpayResponse.paymentUrl;
      } else {
        message.error(vnpayResponse.message || 'Có lỗi xảy ra khi tạo link thanh toán');
      }
    } catch (error) {
      console.error('Lỗi thanh toán từng phần:', error);
      
      // 🆕 Xử lý lỗi bảo vệ từ backend
      let errorMessage = 'Có lỗi xảy ra khi thanh toán';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 🆕 Hiển thị thông báo lỗi cụ thể cho các trường hợp bảo vệ (giống như trong CashFullPaymentModal)
      if (errorMessage.includes("đã có yêu cầu thanh toán tiền mặt đang chờ xử lý")) {
        message.error(errorMessage, 8); // Hiển thị lâu hơn để user đọc
      } else {
        message.error(errorMessage);
      }
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
    const outstanding = getOutstandingAmount();
    // Tính số tiền tối đa dựa trên số lần thanh toán
    if (paymentCount === 0) {
      // Lần thanh toán đầu tiên: tối đa 80%
      return outstanding * 0.8;
    } else {
      // Lần thứ 2 trở đi: tối đa 100%
      return outstanding;
    }
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

  // Handle cancel
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Thanh toán từng phần"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Alert
          message="Thông tin hóa đơn"
          description={
            <div>
              <p><strong>Hóa đơn #:</strong> {bill.id || 'N/A'}</p>
              <p><strong>Phòng:</strong> {bill.roomNumber || 'N/A'}</p>
              <p><strong>Tổng tiền:</strong> {formatCurrency(bill.totalAmount)}</p>
              <p><strong>Đã thanh toán:</strong> {formatCurrency(bill.paidAmount || 0)}</p>
              <p><strong>Còn nợ:</strong> {formatCurrency(getOutstandingAmount())}</p>
              <p><strong>Tối thiểu thanh toán (50%):</strong> <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(minPayment)}</span></p>
              <p><strong>Tối đa thanh toán:</strong> 
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(maxPayment)}</span>
                <span style={{ color: '#52c41a', fontSize: '12px', marginLeft: '8px' }}>
                  ({paymentCount === 0 ? '80%' : '100%'} số tiền còn nợ)
                </span>
              </p>
              <p><strong>Lần thanh toán thứ:</strong> {paymentCount + 1}</p>
              
              {/* 🆕 Hiển thị thông tin về khoảng thời gian 30 ngày */}
              {bill.isPartiallyPaid && bill.lastPaymentDate && (
                <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fff2e8', border: '1px solid #ffbb96', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#d46b08' }}>
                    <strong>⚠️ Lưu ý:</strong> Khoảng thời gian tối thiểu giữa các lần thanh toán từng phần là 30 ngày.
                  </p>
                  {!canMakePartialPayment() && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cf1322', fontWeight: 'bold' }}>
                      Bạn cần đợi thêm {getRemainingDays()} ngày nữa mới được thanh toán từng phần tiếp theo.
                    </p>
                  )}
                </div>
              )}
            </div>
          }
          type="info"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />

        {/* Thông tin phí thanh toán từng phần */}
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
                  <em> Phí này sẽ được tính bất kể số tiền thanh toán (từ 50% đến 100%)</em>
                </p>
                {paymentCount === 0 && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#1890ff' }}>
                    <em> Lần đầu: Thanh toán từ 50% đến 80% số tiền còn nợ. Từ lần thứ 2 có thể thanh toán tối đa 100%.</em>
                  </p>
                )}
              </div>
            </div>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />

        {/* Thông tin lãi suất quá hạn */}
        {monthsOverdue > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Lãi suất quá hạn"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>Lãi suất quá hạn:</strong> 2% mỗi tháng (tối đa 5% số tiền còn nợ)
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>Số tháng quá hạn: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{monthsOverdue} tháng</span></li>
                    <li>Lãi suất lần này: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatCurrency(overdueInterest)}</span></li>
                  </ul>
                  <div style={{ 
                    marginTop: 12, 
                    padding: '12px', 
                    backgroundColor: '#fff2f0', 
                    border: '1px solid #ffccc7', 
                    borderRadius: '6px' 
                  }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#cf1322' }}>
                      <em>⚠️ Lãi suất sẽ được tính cho số tiền còn lại sau khi thanh toán từng phần</em>
                    </p>
                  </div>
                </div>
              }
              type="error"
              showIcon={false}
              style={{ marginBottom: 16 }}
            />
          </div>
        )}

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
                  const maxMessage = paymentCount === 0 ? "80%" : "100%";
                  return Promise.reject(`Số tiền thanh toán không được vượt quá ${maxMessage} giá trị hóa đơn (${formatCurrency(maxPayment)})`);
                }
                return Promise.resolve();
              }
            }
          ]}
          style={{ marginBottom: '16px' }}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`Từ ${formatCurrency(minPayment)} đến ${formatCurrency(maxPayment)}`}
            min={0}
            precision={2}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            onChange={handleAmountChange}
            addonAfter={
              <Space>
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    const minAmount = minPayment;
                    form.setFieldsValue({ paymentAmount: minAmount });
                    handleAmountChange(minAmount);
                  }}
                >
                  50%
                </Button>
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    form.setFieldsValue({ paymentAmount: maxPayment });
                    handleAmountChange(maxPayment);
                  }}
                >
                  {paymentCount === 0 ? '80%' : 'Tối đa'}
                </Button>
              </Space>
            }
          />
        </Form.Item>

        <Alert
          message={`Tổng cộng: ${totalWithFees.toLocaleString()} ₫`}
          description={
            <div>
              <Text>Số tiền gốc: {paymentAmount.toLocaleString()} ₫</Text><br />
              <Text>Phí thanh toán: {partialPaymentFee.toLocaleString()} ₫</Text><br />
              <Text>Lãi suất: {overdueInterest.toLocaleString()} ₫</Text>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />



        <Alert
          message="Lưu ý"
          description="Sau khi xác nhận, bạn sẽ được chuyển hướng đến VNPAY để hoàn tất thanh toán."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={!canMakePartialPayment()}
            >
              {!canMakePartialPayment() 
                ? `Đợi thêm ${getRemainingDays()} ngày nữa` 
                : 'Thanh toán qua VNPAY'
              }
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PartialPaymentModal;
