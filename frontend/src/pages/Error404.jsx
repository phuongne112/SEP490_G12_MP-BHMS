import React from "react";
import { Button, Typography, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const Error404 = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <Card 
        style={{ 
          maxWidth: 500, 
          textAlign: "center",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
        }}
        bodyStyle={{ padding: "40px" }}
      >
        {/* Icon 404 */}
        <div style={{ 
          fontSize: 120, 
          fontWeight: "bold", 
          color: "#667eea",
          marginBottom: 20,
          textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
        }}>
          404
        </div>

        {/* Title */}
        <Title level={2} style={{ marginBottom: 16, color: "#333" }}>
          Trang không tồn tại
        </Title>

        {/* Description */}
        <Paragraph style={{ 
          fontSize: 16, 
          color: "#666", 
          marginBottom: 32,
          lineHeight: 1.6
        }}>
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. 
          Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.
        </Paragraph>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button 
            type="primary" 
            size="large"
            icon={<HomeOutlined />}
            onClick={() => navigate("/home")}
            style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: 8
            }}
          >
            Về trang chủ
          </Button>
          
          <Button 
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ 
              borderRadius: 8,
              border: "1px solid #d9d9d9"
            }}
          >
            Quay lại
          </Button>
        </div>

        {/* Additional help */}
        <div style={{ 
          marginTop: 32, 
          padding: "20px", 
          background: "#f8f9fa", 
          borderRadius: 8,
          border: "1px solid #e9ecef"
        }}>
          <Paragraph style={{ margin: 0, color: "#6c757d", fontSize: 14 }}>
            <strong>Gợi ý:</strong> Bạn có thể thử:
          </Paragraph>
          <ul style={{ 
            textAlign: "left", 
            color: "#6c757d", 
            fontSize: 14,
            margin: "8px 0 0 0",
            paddingLeft: 20
          }}>
            <li>Kiểm tra lại URL trong thanh địa chỉ</li>
            <li>Sử dụng menu điều hướng để tìm trang mong muốn</li>
            <li>Liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default Error404; 