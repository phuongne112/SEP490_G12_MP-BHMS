import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, Typography, Space, Alert } from 'antd';
import { QrcodeOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const QRCodePayment = ({ billData, size = 200 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (billData && canvasRef.current) {
      const qrData = JSON.stringify(billData);
      
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
        }
      });
    }
  }, [billData, size]);

  if (!billData) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Text type="secondary">Không có dữ liệu để tạo mã QR</Text>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <Card 
        style={{ 
          display: 'inline-block', 
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              <QrcodeOutlined style={{ marginRight: 8 }} />
              Mã QR Thanh Toán
            </Title>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fafafa', 
            borderRadius: '8px',
            border: '2px dashed #d9d9d9'
          }}>
            <canvas ref={canvasRef} />
          </div>

          <div style={{ textAlign: 'left' }}>
            <Text strong>Thông tin thanh toán:</Text>
            <div style={{ marginTop: 8 }}>
              <Text>Mã hóa đơn: #{billData.billId}</Text><br/>
              <Text>Số tiền: {billData.amount?.toLocaleString()} ₫</Text><br/>
              <Text>Phòng: {billData.roomNumber}</Text><br/>
              <Text>Ngày hết hạn: {new Date(billData.dueDate).toLocaleDateString('vi-VN')}</Text>
            </div>
          </div>

          <Alert
            message="Hướng dẫn thanh toán"
            description={
              <div>
                <p>1. Mở ứng dụng ngân hàng trên điện thoại</p>
                <p>2. Chọn tính năng quét mã QR</p>
                <p>3. Quét mã QR bên trên</p>
                <p>4. Xác nhận thông tin và hoàn tất thanh toán</p>
              </div>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        </Space>
      </Card>
    </div>
  );
};

export default QRCodePayment; 