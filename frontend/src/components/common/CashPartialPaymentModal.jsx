import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { Modal, Form, InputNumber, Button, Alert, Space, Typography } from 'antd';
import { getPaymentCount } from '../../services/billApi';
import { message } from 'antd'; // Added message import

const { Text } = Typography;

export default function CashPartialPaymentModal({ 
  visible, 
  onCancel, 
  onOk, 
  bill, 
  outstandingAmount 
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [paymentCount, setPaymentCount] = useState(0);
  const [partialPaymentFee, setPartialPaymentFee] = useState(0);
  const [overdueInterest, setOverdueInterest] = useState(0);
  const [totalWithFees, setTotalWithFees] = useState(0);
  const [minPayment, setMinPayment] = useState(0);
  const [maxPayment, setMaxPayment] = useState(0);

  useEffect(() => {
    if (visible && bill) {
      fetchPaymentCount();
      calculatePaymentLimits();
    }
  }, [visible, bill, outstandingAmount]);

  // Đồng bộ lại tổng tiền khi phí/lãi thay đổi (trường hợp phí trả về sau)
  useEffect(() => {
    const currentAmount = form.getFieldValue('paymentAmount') || 0;
    setTotalWithFees(Number(currentAmount) + Number(partialPaymentFee) + Number(overdueInterest));
  }, [partialPaymentFee, overdueInterest]);

  const fetchPaymentCount = async () => {
    try {
      const response = await getPaymentCount(bill.id);
      const count = response.paymentCount || 0;
      console.log('Payment count response:', response, 'count:', count);
      setPaymentCount(count);
      calculateFees(count);
    } catch (error) {
      console.error('Lỗi khi lấy số lần thanh toán:', error);
      setPaymentCount(0);
      calculateFees(0);
    }
  };

  // 🆕 Tính số ngày từ lần thanh toán cuối cùng
  const getDaysSinceLastPayment = () => {
    if (!bill || !bill.lastPaymentDate) return null;
    try {
      const parsed = dayjs(bill.lastPaymentDate, 'YYYY-MM-DD HH:mm:ss A', true);
      const lastPaymentDate = parsed.isValid() ? parsed : dayjs(bill.lastPaymentDate);
      if (!lastPaymentDate.isValid()) return null;
      const currentDate = dayjs();
      const diffDays = currentDate.diff(lastPaymentDate, 'day');
      return Math.max(0, diffDays);
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

  const calculatePaymentLimits = () => {
    const outstanding = Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
    const min = outstanding * 0.5; // 50% của số tiền còn nợ (không đổi)
    
    // Tính số tiền tối đa dựa trên số lần thanh toán
    let max;
    if (paymentCount === 0) {
      // Lần thanh toán đầu tiên: tối đa 80%
      max = outstanding * 0.8;
    } else {
      // Lần thứ 2 trở đi: tối đa 100%
      max = outstanding;
    }
    
    setMinPayment(min);
    setMaxPayment(max);
    
    // Set giá trị mặc định là 50%
    form.setFieldsValue({ paymentAmount: min });
    handleAmountChange(min);
  };

  const calculateFees = (count) => {
    console.log('=== TÍNH PHÍ THANH TOÁN ===');
    console.log('Payment count:', count, 'Type:', typeof count);
  
    // Tính phí thanh toán từng phần dựa trên số lần thanh toán (giống VNPAY)
    let fee = 0;
    switch (count) {
      case 0:
        fee = 200000; // 200.000 VNĐ cho lần thanh toán đầu tiên
        console.log('Case 0: Phí 200.000 ₫');
        break;
      case 1:
        fee = 500000; // 500.000 VNĐ cho lần thanh toán thứ 2
        console.log('Case 1: Phí 500.000 ₫');
        break;
      case 2:
        fee = 1000000; // 1.000.000 VNĐ cho lần thanh toán thứ 3
        console.log('Case 2: Phí 1.000.000 ₫');
        break;
      default:
        fee = 1000000; // Tối đa 1.000.000 VNĐ cho các lần sau
        console.log('Case default: Phí 1.000.000 ₫');
    }

    setPartialPaymentFee(fee);

    // Tính lãi suất quá hạn cho số tiền còn lại (giống VNPAY)
    const overdueMonths = calculateOverdueMonths();
    const outstanding = Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
    const remainingAmount = outstanding - (form.getFieldValue('paymentAmount') || 0);
    
    // Lãi suất theo tháng: 2% mỗi tháng
    const monthlyRate = 0.02;
    const interest = overdueMonths > 0 ? Math.min(remainingAmount * monthlyRate * overdueMonths, remainingAmount * 0.05) : 0;
    const roundedInterest = Math.round(interest);
    setOverdueInterest(roundedInterest);

    console.log('Tính toán phí thanh toán (giống VNPAY):', {
      paymentCount: count,
      partialPaymentFee: fee,
      overdueMonths,
      overdueInterest: roundedInterest,
      outstandingAmount: outstanding,
      remainingAmount,
      monthlyRate
    });
    console.log('=== KẾT THÚC TÍNH PHÍ ===');

    // Đồng bộ lại tổng tiền ngay sau khi tính được phí/lãi
    const currentAmount = form.getFieldValue('paymentAmount') || 0;
    setTotalWithFees(Number(currentAmount) + Number(fee) + Number(roundedInterest));
  };

  const calculateOverdueMonths = () => {
    if (!bill || !bill.dueDate) return 0;
    
    try {
      const dueDate = new Date(bill.dueDate);
      const currentDate = new Date();
      
      if (currentDate < dueDate) return 0;
      
      const diffTime = currentDate.getTime() - dueDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Sử dụng 30.44 ngày/tháng
      return Math.max(0, Math.ceil(diffMonths));
    } catch (error) {
      console.error('Error calculating months overdue:', error);
      return 0;
    }
  };

  const handleAmountChange = (value) => {
    if (!value || value <= 0) {
      setTotalWithFees(0);
      return;
    }

    // Cập nhật lại phí và lãi suất khi số tiền thay đổi (giống VNPAY)
    const outstanding = Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
    const remainingAmount = outstanding - value;
    const overdueMonths = calculateOverdueMonths();
    
    // Tính lại lãi suất quá hạn cho số tiền còn lại
    const monthlyRate = 0.02;
    const interest = overdueMonths > 0 ? Math.min(remainingAmount * monthlyRate * overdueMonths, remainingAmount * 0.05) : 0;
    setOverdueInterest(Math.round(interest));

    const total = Number(value) + Number(partialPaymentFee) + Math.round(interest);
    setTotalWithFees(total);

    console.log('Tính toán tổng tiền (giống VNPAY):', {
      originalAmount: value,
      partialPaymentFee,
      overdueInterest: Math.round(interest),
      totalWithFees: total,
      remainingAmount,
      overdueMonths
    });
  };

  const getMaxPaymentAmount = () => {
    return getOutstandingAmount(); // Tối đa là số tiền còn nợ (100%)
  };

  const getOutstandingAmount = () => {
    return Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
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
      
      // 🆕 Kiểm tra khoảng thời gian 30 ngày
      if (!canMakePartialPayment()) {
        const remainingDays = getRemainingDays();
        message.error(`Bạn phải đợi thêm ${remainingDays} ngày nữa mới được thanh toán từng phần tiếp theo. Khoảng thời gian tối thiểu giữa các lần thanh toán từng phần là 30 ngày.`);
        return;
      }
      
      setLoading(true);
      
      const computedTotal = Number(values.paymentAmount) + Number(partialPaymentFee) + Number(overdueInterest);
      const request = {
        billId: bill.id,
        originalPaymentAmount: values.paymentAmount,
        partialPaymentFee: partialPaymentFee,
        overdueInterest: overdueInterest,
        totalWithFees: computedTotal,
        paymentMethod: 'CASH',
        notes: 'Thanh toán tiền mặt'
      };
      
      console.log('Cash payment request:', request);
      
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
      title="Thanh toán từng phần bằng tiền mặt"
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
              <p><strong>Hóa đơn #:</strong> {bill.id || 'N/A'}</p>
              <p><strong>Phòng:</strong> {bill.roomNumber || 'N/A'}</p>
              <p><strong>Tổng tiền:</strong> {formatCurrency(bill.totalAmount)}</p>
              <p><strong>Đã thanh toán (gốc):</strong> {formatCurrency(bill.paidAmount || 0)}</p>
              {(bill.partialPaymentFeesCollected || 0) > 0 && (
                <p><strong>Phí thanh toán từng phần đã thu:</strong> {formatCurrency(bill.partialPaymentFeesCollected || 0)}</p>
              )}
              <p><strong>Còn nợ:</strong> {formatCurrency(getOutstandingAmount())}</p>
              <p><strong>Tối thiểu thanh toán (50%):</strong> <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(minPayment)}</span></p>
              <p><strong>Tối đa thanh toán: </strong> 
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

        <Form.Item
          label="Số tiền thanh toán"
          name="paymentAmount"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền thanh toán' },
            {
              validator: (_, value) => {
                if (value && value < minPayment) {
                  return Promise.reject(`Số tiền tối thiểu là ${minPayment.toLocaleString()} ₫`);
                }
                if (value && value > maxPayment) {
                  const maxMessage = paymentCount === 0 ? "80%" : "100%";
                  return Promise.reject(`Số tiền tối đa là ${formatCurrency(maxPayment)} (${maxMessage} số tiền còn nợ)`);
                }
                return Promise.resolve();
              }
            }
          ]}
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
          />
        </div>

        {/* Thông tin lãi suất quá hạn */}
        {calculateOverdueMonths() > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Lãi suất quá hạn"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>Lãi suất quá hạn:</strong> 2% mỗi tháng (tối đa 5% số tiền còn nợ)
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>Số tháng quá hạn: <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{calculateOverdueMonths()} tháng</span></li>
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
                      <em>⚠️ Lãi suất được tính trên số tiền còn nợ sau khi thanh toán</em>
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
          message={`Tổng cộng: ${totalWithFees.toLocaleString()} ₫`}
          description={
            <div>
              <Text>Số tiền gốc: {form.getFieldValue('paymentAmount')?.toLocaleString() || 0} ₫</Text><br />
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
          description="Sau khi xác nhận, chủ trọ sẽ được thông báo để kiểm tra và xác nhận thanh toán tiền mặt."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Form.Item style={{ marginTop: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleOk}
              loading={loading}
              disabled={!canMakePartialPayment()}
            >
              {!canMakePartialPayment() 
                ? `Đợi thêm ${getRemainingDays()} ngày nữa` 
                : 'Xác nhận thanh toán'
              }
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
