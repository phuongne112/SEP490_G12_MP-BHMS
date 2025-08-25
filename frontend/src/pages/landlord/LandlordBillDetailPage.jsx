import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Button, Spin, message, Tag, Layout, Popconfirm, Modal, Input } from "antd";
import { getBillDetail, exportBillPdf, createVnPayUrl, updateBillPaymentStatus, confirmCashPayment, rejectCashPayment } from "../../services/billApi";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import PaymentHistoryModal from "../../components/common/PaymentHistoryModal";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const { Sider } = Layout;
const { TextArea } = Input;

export default function LandlordBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [paymentHistoryVisible, setPaymentHistoryVisible] = useState(false);
  const [pendingCashPayments, setPendingCashPayments] = useState([]);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentPaymentToReject, setCurrentPaymentToReject] = useState(null);

  // Hàm kiểm tra hóa đơn có quá hạn không
  const checkOverdue = (bill) => {
    if (bill.status) return false; // Đã thanh toán thì không quá hạn
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Logic: toDate + 7 ngày là hạn thanh toán
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    return actualDueDate && today.isAfter(actualDueDate, 'day');
  };

  // Hàm tính số ngày quá hạn
  const getOverdueDays = (bill) => {
    if (bill.status) return 0;
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Logic: toDate + 7 ngày là hạn thanh toán
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    if (actualDueDate && today.isAfter(actualDueDate, 'day')) {
      return today.diff(actualDueDate, 'day');
    }
    
    return 0;
  };

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line
  }, [id]);

  const fetchBill = async () => {
    setLoading(true);
    try {
      const res = await getBillDetail(id);
      setBill(res);
      
      // Lấy danh sách thanh toán tiền mặt pending
      if (res.pendingCashPayments) {
        setPendingCashPayments(res.pendingCashPayments);
      }
    } catch {
      message.error("Không thể tải chi tiết hóa đơn");
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const data = await exportBillPdf(bill.id);
      
      // Generate professional filename with room name and bill date range
              const fromDate = bill.fromDate && dayjs(bill.fromDate, "YYYY-MM-DD HH:mm:ss A").isValid() 
          ? dayjs(bill.fromDate, "YYYY-MM-DD HH:mm:ss A").format('YYYY-MM-DD')
          : bill.fromDate && dayjs(bill.fromDate).isValid()
          ? dayjs(bill.fromDate).format('YYYY-MM-DD')
          : 'N/A';
      const toDate = bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() 
        ? dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format('YYYY-MM-DD')
        : getFallbackToDate(bill) 
        ? dayjs(getFallbackToDate(bill)).format('YYYY-MM-DD')
        : 'Unknown';
      const roomName = bill.roomNumber || 'Unknown';
      const filename = `HoaDon_${roomName}_${fromDate}_${toDate}.pdf`;
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error("Xuất hóa đơn thất bại");
    }
  };

  const handlePayVnPay = async () => {
    try {
      // Sử dụng outstandingAmount thay vì totalAmount để thanh toán đúng số tiền còn nợ
      const outstandingAmount = bill.outstandingAmount || bill.totalAmount || 0;
      const amount = Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
      
      console.log('Thanh toán VNPAY (Landlord):', {
        billId: bill.id,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        outstandingAmount: bill.outstandingAmount,
        amountToPay: amount
      });
      
      const paymentUrl = await createVnPayUrl({
        billId: bill.id,
        amount,
        orderInfo: `Thanh toán hóa đơn #${bill.id}`,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      // Xử lý lỗi từ API
      let errorMessage = "Không tạo được link thanh toán!";
      
      if (err.message) {
        // Lỗi từ billApi.js (sau khi được xử lý)
        errorMessage = err.message;
      } else if (err.response && err.response.data) {
        // Lỗi trực tiếp từ API
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      // 🆕 Hiển thị thông báo lỗi cụ thể cho các trường hợp bảo vệ
      if (errorMessage.includes("đã có yêu cầu thanh toán tiền mặt đang chờ xử lý")) {
        message.error(errorMessage, 8); // Hiển thị lâu hơn để user đọc
      } else {
        message.error(errorMessage);
      }
    }
  };

  const handleUpdatePaymentStatus = async () => {
    setUpdatingStatus(true);
    try {
      await updateBillPaymentStatus(bill.id, true);
      message.success("Đã cập nhật trạng thái thanh toán thành công!");
      // Refresh bill data
      await fetchBill();
    } catch (error) {
      message.error("Không thể cập nhật trạng thái thanh toán!");
      console.error("Error updating payment status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmCashPayment = async (paymentHistoryId) => {
    try {
      setConfirmingPayment(true);
      
      // Gọi API xác nhận thanh toán tiền mặt
      await confirmCashPayment(bill.id, paymentHistoryId);
      
      message.success("Đã xác nhận thanh toán tiền mặt thành công!");
      
      // Refresh lại thông tin hóa đơn
      await fetchBill();
    } catch (error) {
      message.error("Không thể xác nhận thanh toán tiền mặt!");
      console.error("Error confirming cash payment:", error);
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleRejectCashPayment = async (paymentHistoryId) => {
    try {
      setRejectingPayment(true);
      
      // Gọi API từ chối thanh toán tiền mặt
      await rejectCashPayment(bill.id, paymentHistoryId, rejectReason);
      
      message.success("Đã từ chối thanh toán tiền mặt thành công!");
      
      // Reset modal
      setRejectModalVisible(false);
      setRejectReason('');
      setCurrentPaymentToReject(null);
      
      // Refresh lại thông tin hóa đơn
      await fetchBill();
    } catch (error) {
      message.error("Không thể từ chối thanh toán tiền mặt!");
      console.error("Error rejecting cash payment:", error);
    } finally {
      setRejectingPayment(false);
    }
  };

  const showRejectModal = (payment) => {
    setCurrentPaymentToReject(payment);
    setRejectModalVisible(true);
  };

  const columns = [
    { title: "Mô tả", dataIndex: "description", render: (text) => {
      if (!text) return text;
      const input = String(text);
      const replaced = input.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m, y, mo, d) => {
        const iso = `${y}-${mo}-${d}`;
        return dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY") : m;
      });
      return replaced;
    } },
    { 
      title: "Loại", 
      dataIndex: "itemType",
      render: (type) => {
        if (!type) return <Tag>Không xác định</Tag>;
        if (
          type === 'REGULAR' ||
          type === 'ROOM_RENT' ||
          type === 'CONTRACT_ROOM_RENT' ||
          type.includes('ROOM_RENT')
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          type === 'SERVICE' ||
          type === 'CONTRACT_SERVICE' ||
          type.includes('SERVICE')
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (type === 'DEPOSIT' || type.includes('DEPOSIT')) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (type === 'CONTRACT_TOTAL') {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        if (type === 'LATE_PENALTY') {
          return <Tag color="volcano">Phạt quá hạn</Tag>;
        }
        return <Tag>{type}</Tag>;
      }
    },
    { title: "Dịch vụ", dataIndex: "serviceName", render: v => v || 'Không có' },
    {
      title: "Đơn giá",
      dataIndex: "unitPriceAtBill",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
    { title: "Số lượng", dataIndex: "consumedUnits", render: v => v || 'Không có' },
    {
      title: "Thành tiền",
      dataIndex: "itemAmount",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
  ];

  // Helper: Lấy ngày kết thúc từ bill.details nếu bill.toDate bị null hoặc không hợp lệ
  function getFallbackToDate(bill) {
    if (!bill || !bill.details || !Array.isArray(bill.details)) return null;
    // Ưu tiên dòng tiền phòng, sau đó đến dịch vụ
    const roomRent = bill.details.find(d => d.itemType === 'ROOM_RENT');
    const anyDetail = bill.details[0];
    const regex = /đến (\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
    let match = null;
    if (roomRent && roomRent.description) {
      match = roomRent.description.match(regex);
    }
    if (!match && anyDetail && anyDetail.description) {
      match = anyDetail.description.match(regex);
    }
    if (match && match[1]) {
      // Chuẩn hóa về định dạng YYYY-MM-DD nếu là DD/MM/YYYY
      let dateStr = match[1];
      if (/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/');
        dateStr = `${y}-${m}-${d}`;
      }
      return dateStr;
    }
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>
      <div style={{ flex: 1, padding: 24 }}>
        <PageHeader title="Chi tiết hóa đơn" />
        <Card style={{ marginTop: 20 }}>
          {loading ? (
            <Spin />
          ) : bill ? (
            <>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Mã hóa đơn">#{bill.id}</Descriptions.Item>
                <Descriptions.Item label="Phòng">{bill.roomNumber}</Descriptions.Item>
                <Descriptions.Item label="Mã hợp đồng">{bill.contractId ? `#${bill.contractId}` : "Không có"}</Descriptions.Item>
                <Descriptions.Item label="Loại hóa đơn">
                  <Tag
                    color={
                      bill.billType === "REGULAR" || bill.billType === "ROOM_RENT" || bill.billType === "CONTRACT_ROOM_RENT" || (bill.billType && bill.billType.includes('ROOM_RENT'))
                        ? "blue"
                        : bill.billType === "SERVICE" || bill.billType === "CONTRACT_SERVICE" || (bill.billType && bill.billType.includes('SERVICE'))
                        ? "green"
                        : bill.billType === "DEPOSIT" || (bill.billType && bill.billType.includes('DEPOSIT'))
                        ? "purple"
                        : bill.billType === "CONTRACT_TOTAL"
                        ? "geekblue"
                        : bill.billType === "CUSTOM"
                        ? "orange"
                        : bill.billType === "LATE_PENALTY"
                        ? "volcano"
                        : "default"
                    }
                  >
                    {bill.billType === "REGULAR" || bill.billType === "ROOM_RENT" || bill.billType === "CONTRACT_ROOM_RENT" || (bill.billType && bill.billType.includes('ROOM_RENT'))
                      ? "Tiền phòng"
                      : bill.billType === "SERVICE" || bill.billType === "CONTRACT_SERVICE" || (bill.billType && bill.billType.includes('SERVICE'))
                      ? "Dịch vụ"
                      : bill.billType === "DEPOSIT" || (bill.billType && bill.billType.includes('DEPOSIT'))
                      ? "Đặt cọc"
                      : bill.billType === "CONTRACT_TOTAL"
                      ? "Tổng hợp đồng"
                      : bill.billType === "CUSTOM"
                      ? "Tùy chỉnh"
                      : bill.billType === "LATE_PENALTY"
                      ? "Phạt quá hạn"
                      : bill.billType || 'Không xác định'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Từ ngày">
                  {bill.fromDate && dayjs(bill.fromDate, "YYYY-MM-DD HH:mm:ss A").isValid() ? (
                    dayjs(bill.fromDate, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY")
                  ) : bill.fromDate ? (
                    <span style={{ color: '#faad14', fontWeight: 500 }}>
                      {dayjs(bill.fromDate).isValid()
                        ? dayjs(bill.fromDate).format('DD/MM/YYYY')
                        : bill.fromDate}
                    </span>
                  ) : (
                    <span style={{ color: 'red', fontWeight: 500 }}>
                      Không xác định
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Đến ngày">
                  {bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() ? (
                    dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY")
                  ) : getFallbackToDate(bill) ? (
                    <span style={{ color: '#faad14', fontWeight: 500 }}>
                      {dayjs(getFallbackToDate(bill)).isValid()
                        ? dayjs(getFallbackToDate(bill)).format('DD/MM/YYYY')
                        : getFallbackToDate(bill)}
                      {" "}(Lấy từ chi tiết hóa đơn)
                    </span>
                  ) : (
                    <span style={{ color: 'red', fontWeight: 500 }}>
                      Không xác định (Dữ liệu hóa đơn thiếu ngày kết thúc)
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Hạn thanh toán">
                  {bill.dueDate ? (
                    dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY")
                  ) : (
                    <span style={{ color: '#faad14', fontStyle: 'italic' }}>
                      Chưa thiết lập
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng tiền">{bill.totalAmount?.toLocaleString()} ₫</Descriptions.Item>
                {(bill.paidAmount || 0) > 0 && (
                  <Descriptions.Item label="Đã thanh toán (gốc)">
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      {bill.paidAmount?.toLocaleString()} ₫
                    </span>
                  </Descriptions.Item>
                )}
                {(bill.partialPaymentFeesCollected || 0) > 0 && (
                  <Descriptions.Item label="Phí thanh toán từng phần">
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      {bill.partialPaymentFeesCollected?.toLocaleString()} ₫
                    </span>
                  </Descriptions.Item>
                )}
                {(bill.outstandingAmount || 0) > 0 && (
                  <Descriptions.Item label="Còn nợ">
                    <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      {bill.outstandingAmount?.toLocaleString()} ₫
                    </span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Trạng thái">
                  <Tag color={bill.status ? "green" : "red"}>
                    {bill.status ? "Đã thanh toán" : "Chưa thanh toán"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái quá hạn">
                  <Tag color={checkOverdue(bill) ? "red" : "green"}>
                    {checkOverdue(bill) ? `Quá hạn ${getOverdueDays(bill)} ngày` : "Chưa quá hạn"}
                  </Tag>
                </Descriptions.Item>
                {bill.billType === 'LATE_PENALTY' && (
                  <>
                    <Descriptions.Item label="Hóa đơn gốc">
                      <Button 
                        type="link" 
                        onClick={() => navigate(`/landlord/bills/${bill.originalBillId}`)}
                        style={{ padding: 0 }}
                      >
                        Xem hóa đơn #{bill.originalBillId}
                      </Button>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tỷ lệ phạt">
                      <Tag color="volcano">{bill.penaltyRate}%</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số ngày quá hạn">
                      <Tag color="red">{bill.overdueDays} ngày</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số tiền phạt">
                      <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
                        {bill.penaltyAmount?.toLocaleString()} ₫
                      </span>
                    </Descriptions.Item>
                    {bill.notes && (
                      <Descriptions.Item label="Ghi chú" span={2}>
                        <span style={{ color: '#666' }}>{bill.notes}</span>
                      </Descriptions.Item>
                    )}
                  </>
                )}
              </Descriptions>

              <h3 style={{ marginTop: 24 }}>Chi tiết các khoản</h3>
              <Table
                columns={columns}
                dataSource={bill.details}
                rowKey={(_, idx) => idx}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />

              <div style={{ marginTop: 24 }}>
                <Button onClick={handleExport} type="primary">Xuất PDF</Button>

                <Button 
                  type="default" 
                  style={{ marginLeft: 16 }}
                  onClick={() => setPaymentHistoryVisible(true)}
                >
                  Lịch sử thanh toán
                </Button>

                {!bill.status && (
                  <>
                    <Popconfirm
                      title="Xác nhận thanh toán"
                      description="Bạn có chắc muốn đánh dấu hóa đơn này đã được thanh toán?"
                      onConfirm={handleUpdatePaymentStatus}
                      okText="Xác nhận"
                      cancelText="Hủy"
                    >
                      <Button
                        type="default"
                        style={{ marginLeft: 16 }}
                        loading={updatingStatus}
                        title="Đánh dấu đã thanh toán (cho thanh toán tại văn phòng)"
                      >
                        Đã thanh toán
                      </Button>
                    </Popconfirm>
                    
                  </>
                )}

                {/* Danh sách thanh toán tiền mặt pending */}
                {pendingCashPayments && pendingCashPayments.length > 0 && (
                  <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <h4>Thanh toán tiền mặt chờ xác nhận:</h4>
                    {pendingCashPayments.map((payment, index) => (
                      <div key={payment.id} style={{ 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '6px', 
                        padding: '12px', 
                        marginBottom: '8px',
                        backgroundColor: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>
                              Thanh toán #{payment.paymentNumber} - {payment.paymentDate ? (dayjs(payment.paymentDate).isValid() ? dayjs(payment.paymentDate).format('DD/MM/YYYY HH:mm') : payment.paymentDate) : ''}
                            </p>
                            <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                              <Tag color="blue" size="small">{payment.paymentMethodDisplay || 'Tiền mặt'}</Tag>
                              <Tag color="warning" size="small" style={{ marginLeft: '4px' }}>{payment.statusDisplay || 'Đang xử lý'}</Tag>
                            </p>
                            <p style={{ margin: '4px 0', color: '#666' }}>
                              Số tiền: {payment.paymentAmount?.toLocaleString()} ₫
                              {payment.partialPaymentFee > 0 && (
                                <span style={{ marginLeft: '8px', color: '#ff4d4f' }}>
                                  + Phí: {payment.partialPaymentFee?.toLocaleString()} ₫
                                </span>
                              )}
                              {payment.overdueInterest > 0 && (
                                <span style={{ marginLeft: '8px', color: '#fa8c16' }}>
                                  + Lãi: {payment.overdueInterest?.toLocaleString()} ₫
                                </span>
                              )}
                            </p>
                            <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                              {(() => {
                                const base = Number(payment.paymentAmount || 0);
                                const fee = Number(payment.partialPaymentFee || 0);
                                const interest = Number(payment.overdueInterest || 0);
                                const calcTotal = base + fee + interest;
                                const total = Number(payment.totalAmount || 0);
                                const displayTotal = total > 0 ? Math.max(total, calcTotal) : calcTotal;
                                return (
                                  <span>
                                    Tổng cộng: {displayTotal.toLocaleString()} ₫
                                  </span>
                                );
                              })()}
                            </p>
                            {payment.notes && (
                              <p style={{ margin: '4px 0', color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                                Ghi chú: {payment.notes}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Popconfirm
                              title="Xác nhận thanh toán tiền mặt"
                              description={`Bạn có chắc muốn xác nhận thanh toán ${payment.totalAmount?.toLocaleString()} ₫?`}
                              onConfirm={() => handleConfirmCashPayment(payment.id)}
                              okText="Xác nhận"
                              cancelText="Hủy"
                            >
                              <Button
                                type="primary"
                                loading={confirmingPayment}
                                size="small"
                              >
                                Xác nhận
                              </Button>
                            </Popconfirm>
                            <Button
                              type="default"
                              danger
                              size="small"
                              onClick={() => showRejectModal(payment)}
                            >
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button style={{ marginLeft: 16 }} onClick={() => navigate(-1)}>
                  Quay lại
                </Button>
              </div>
            </>
          ) : (
            <div>Không tìm thấy hóa đơn</div>
          )}
        </Card>

        {/* Payment History Modal */}
        {bill && (
          <PaymentHistoryModal
            visible={paymentHistoryVisible}
            onCancel={() => setPaymentHistoryVisible(false)}
            billId={bill.id}
            billNumber={`HĐ#${bill.id}`}
            roomNumber={bill.roomNumber}
            roomAddress={bill.building}
          />
        )}

        {/* Reject Cash Payment Modal */}
        <Modal
          title="Từ chối thanh toán tiền mặt"
          open={rejectModalVisible}
          onCancel={() => {
            setRejectModalVisible(false);
            setRejectReason('');
            setCurrentPaymentToReject(null);
          }}
          onOk={() => handleRejectCashPayment(currentPaymentToReject?.id)}
          okText="Từ chối"
          cancelText="Hủy"
          confirmLoading={rejectingPayment}
          okButtonProps={{ danger: true }}
        >
          {currentPaymentToReject && (
            <div>
              <p><strong>Thanh toán:</strong> #{currentPaymentToReject.paymentNumber}</p>
              <p><strong>Số tiền:</strong> {currentPaymentToReject.totalAmount?.toLocaleString()} ₫</p>
              <p><strong>Ngày thanh toán:</strong> {currentPaymentToReject.paymentDate ? (dayjs(currentPaymentToReject.paymentDate).isValid() ? dayjs(currentPaymentToReject.paymentDate).format('DD/MM/YYYY HH:mm') : currentPaymentToReject.paymentDate) : ''}</p>
              
              <div style={{ marginTop: 16 }}>
                <label><strong>Lý do từ chối (tùy chọn):</strong></label>
                <TextArea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối thanh toán..."
                  rows={4}
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
