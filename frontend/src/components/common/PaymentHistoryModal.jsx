import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Card, Row, Col, Statistic, Spin, Empty, Pagination } from 'antd';
import { DollarOutlined, CalendarOutlined, CreditCardOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import paymentHistoryApi from '../../services/paymentHistoryApi';

// Extend dayjs with customParseFormat plugin
dayjs.extend(customParseFormat);

const PaymentHistoryModal = ({ visible, onCancel, billId, billNumber }) => {
    const [loading, setLoading] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    useEffect(() => {
        if (visible && billId) {
            fetchPaymentHistory();
            fetchStatistics();
        }
    }, [visible, billId, pagination.current]);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const response = await paymentHistoryApi.getPaymentHistoryByBillIdWithPagination(
                billId, 
                pagination.current - 1, 
                pagination.pageSize
            );
            
            if (response.data.success) {
                console.log('Payment history data:', response.data.data);
                setPaymentHistory(response.data.data);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.total
                }));
            }
        } catch (error) {
            console.error('Lỗi khi lấy lịch sử thanh toán:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await paymentHistoryApi.getPaymentStatistics(billId);
            if (response.data.success) {
                setStatistics(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi khi lấy thống kê thanh toán:', error);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return 'Chưa có';
        try {
            // Handle different date formats and timezone
            console.log('Formatting date:', date, typeof date);
            
            let dayjsDate;
            // Try parsing with specific format first (backend format)
            if (typeof date === 'string' && date.includes('AM') || date.includes('PM')) {
                dayjsDate = dayjs(date, "YYYY-MM-DD HH:mm:ss A");
            } else {
                dayjsDate = dayjs(date);
            }
            
            if (!dayjsDate.isValid()) {
                console.error('Invalid date:', date);
                return 'Ngày không hợp lệ';
            }
            const formatted = dayjsDate.format('DD/MM/YYYY HH:mm');
            console.log('Formatted date:', formatted);
            return formatted;
        } catch (error) {
            console.error('Error formatting date:', date, error);
            return 'Ngày không hợp lệ';
        }
    };

    const getStatusColor = (status) => {
        // Handle both Vietnamese and English statuses
        const statusLower = status?.toLowerCase();
        if (statusLower === 'thành công' || statusLower === 'success' || statusLower === 'completed') {
            return 'success';
        } else if (statusLower === 'thất bại' || statusLower === 'failed') {
            return 'error';
        } else if (statusLower === 'đang xử lý' || statusLower === 'pending') {
            return 'warning';
        } else if (statusLower === 'từ chối' || statusLower === 'rejected') {
            return 'error';
        } else {
            return 'default';
        }
    };

    const getStatusDisplay = (status) => {
        if (!status) return 'Không xác định';
        
        // Handle both Vietnamese and English statuses
        const statusLower = status.toLowerCase();
        if (statusLower === 'success' || statusLower === 'completed') {
            return 'Thành công';
        } else if (statusLower === 'failed') {
            return 'Thất bại';
        } else if (statusLower === 'pending') {
            return 'Đang xử lý';
        } else if (statusLower === 'rejected') {
            return 'Từ chối';
        } else if (statusLower === 'thành công' || statusLower === 'thất bại' || statusLower === 'đang xử lý' || statusLower === 'từ chối') {
            return status; // Already in Vietnamese
        } else {
            return status; // Return as is if unknown
        }
    };

    const getPaymentTypeColor = (isPartial) => {
        return isPartial ? 'orange' : 'green';
    };

    const columns = [
        {
            title: 'Lần thanh toán',
            dataIndex: 'paymentNumber',
            key: 'paymentNumber',
            width: 100,
            render: (number) => `Lần ${number}`
        },
        {
            title: 'Ngày thanh toán',
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 150,
            render: (date) => formatDate(date)
        },
        {
            title: 'Số tiền gốc',
            dataIndex: 'paymentAmount',
            key: 'paymentAmount',
            width: 120,
            render: (amount) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {formatCurrency(amount)}
                </span>
            )
        },
        {
            title: 'Phí thanh toán',
            dataIndex: 'totalFees',
            key: 'totalFees',
            width: 120,
            render: (fees) => {
                if (!fees || fees === 0) return '-';
                return (
                    <span style={{ color: '#ff4d4f' }}>
                        {formatCurrency(fees)}
                    </span>
                );
            }
        },
        {
            title: 'Tổng thanh toán',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 130,
            render: (amount) => (
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                    {formatCurrency(amount)}
                </span>
            )
        },
        {
            title: 'Loại thanh toán',
            dataIndex: 'isPartialPayment',
            key: 'isPartialPayment',
            width: 120,
            render: (isPartial) => (
                <Tag color={getPaymentTypeColor(isPartial)}>
                    {isPartial ? 'Từng phần' : 'Đầy đủ'}
                </Tag>
            )
        },
        {
            title: 'Phương thức',
            dataIndex: 'paymentMethodDisplay',
            key: 'paymentMethodDisplay',
            width: 100,
            render: (method) => (
                <Tag color="blue">
                    {method}
                </Tag>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'statusDisplay',
            key: 'statusDisplay',
            width: 100,
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusDisplay(status)}
                </Tag>
            )
        },
        {
            title: 'Số tiền nợ sau',
            dataIndex: 'outstandingAfter',
            key: 'outstandingAfter',
            width: 120,
            render: (amount, record) => {
                // Tính số tiền nợ thực tế = outstandingBefore - paymentAmount
                const actualOutstanding = (record.outstandingBefore || 0) - (record.paymentAmount || 0);
                
                // Debug log
                console.log('Payment Record:', {
                    id: record.id,
                    isPartialPayment: record.isPartialPayment,
                    outstandingBefore: record.outstandingBefore,
                    paymentAmount: record.paymentAmount,
                    outstandingAfter: amount,
                    actualOutstanding: actualOutstanding
                });
                
                // Luôn hiển thị số tiền nợ thực tế (outstandingBefore - paymentAmount)
                // vì outstandingAfter từ database có thể bị sai
                return (
                    <span style={{ color: actualOutstanding > 0 ? '#ff4d4f' : '#52c41a' }}>
                        {formatCurrency(actualOutstanding)}
                    </span>
                );
            }
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            width: 200,
            render: (notes) => {
                if (!notes || notes.trim() === '') {
                    return <span style={{ color: '#999', fontStyle: 'italic' }}>Không có ghi chú</span>;
                }
                
                // Nếu notes quá dài, hiển thị tooltip
                const isLongNote = notes.length > 50;
                const displayText = isLongNote ? notes.substring(0, 50) + '...' : notes;
                
                return (
                    <div style={{ 
                        maxWidth: '180px',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        cursor: isLongNote ? 'help' : 'default'
                    }}
                    title={isLongNote ? notes : undefined}
                    >
                        {displayText}
                    </div>
                );
            }
        }
    ];

    const handlePageChange = (page, pageSize) => {
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize: pageSize
        }));
    };

    return (
        <Modal
            title={
                <div>
                    <CreditCardOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Lịch Sử Thanh Toán - {billNumber || `Hóa đơn #${billId}`}
                </div>
            }
            open={visible}
            onCancel={onCancel}
            width={1400}
            footer={null}
            destroyOnClose
        >
            <Spin spinning={loading}>
                {/* Thống kê tổng quan */}
                {statistics && (
                    <Card style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng lần thanh toán"
                                    value={statistics.totalPayments}
                                    prefix={<CreditCardOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng tiền đã trả"
                                    value={formatCurrency(statistics.totalPaidAmount)}
                                    prefix={<DollarOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Tổng phí thanh toán"
                                    value={formatCurrency(statistics.totalFees)}
                                    prefix={<DollarOutlined />}
                                    valueStyle={{ color: '#ff4d4f' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Lần thanh toán cuối"
                                    value={statistics.latestPayment?.paymentDate ? formatDate(statistics.latestPayment.paymentDate) : 'Chưa có'}
                                    prefix={<CalendarOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* Bảng lịch sử thanh toán */}
                <Card title="Chi tiết các lần thanh toán">
                    {paymentHistory.length > 0 ? (
                        <>
                            <Table
                                columns={columns}
                                dataSource={paymentHistory}
                                rowKey="id"
                                pagination={false}
                                scroll={{ x: 1000 }}
                                size="small"
                            />
                            
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Pagination
                                    current={pagination.current}
                                    pageSize={pagination.pageSize}
                                    total={pagination.total}
                                    onChange={handlePageChange}
                                    showSizeChanger
                                    showQuickJumper
                                    showTotal={(total, range) => 
                                        `${range[0]}-${range[1]} của ${total} lần thanh toán`
                                    }
                                />
                            </div>
                        </>
                    ) : (
                        <Empty
                            description="Chưa có lịch sử thanh toán"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Card>
            </Spin>
        </Modal>
    );
};

export default PaymentHistoryModal;


