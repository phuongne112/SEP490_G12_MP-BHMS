import React from "react";
import { Card, Typography, Space, Tag } from "antd";

import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";

const { Text, Title } = Typography;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const getStatusTag = (status) => {
  switch (status) {
    case "Available":
      return (
        <Tag
          color="green"
          style={{ 
            fontSize: 14, 
            padding: "4px 12px", 
            borderRadius: 6,
            fontWeight: 400
          }}
        >
          Có sẵn
        </Tag>
      );
    case "Occupied":
      return (
        <Tag
          color="red"
          style={{ 
            fontSize: 14, 
            padding: "4px 12px", 
            borderRadius: 6,
            fontWeight: 400
          }}
        >
          Đã thuê
        </Tag>
      );
    case "Maintenance":
      return (
        <Tag
          color="orange"
          style={{ 
            fontSize: 14, 
            padding: "4px 12px", 
            borderRadius: 6,
            fontWeight: 400
          }}
        >
          Bảo trì
        </Tag>
      );
    default:
      return (
        <Tag
          color="default"
          style={{ 
            fontSize: 14, 
            padding: "4px 12px", 
            borderRadius: 6,
            fontWeight: 400
          }}
        >
          Không xác định
        </Tag>
      );
  }
};

export default function RoomCard({ room, onClick }) {
  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === "string") {
      if (img.startsWith("http")) return img;
      if (img.startsWith("/uploads/")) return BACKEND_URL + img;
      return BACKEND_URL + "/uploads/" + img;
    }
    if (typeof img === "object" && img.imageUrl) {
      if (img.imageUrl.startsWith("http")) return img.imageUrl;
      if (img.imageUrl.startsWith("/uploads/")) return BACKEND_URL + img.imageUrl;
      return BACKEND_URL + "/uploads/" + img.imageUrl;
    }
    return null;
  };

  const img0 = getImageUrl(room.images?.[0]) || image1;
  const img1 = getImageUrl(room.images?.[1]) || image2;
  
  // Simple asset logic: if room has assets, then it has furniture
  const hasAssets = room.assets && room.assets.length > 0;

  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #f0f0f0"
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <img
              alt={room.roomNumber}
              src={img0}
              style={{ height: 150, objectFit: "cover", width: "100%" }}
            />
            <img
              alt={room.roomNumber}
              src={img1}
              style={{ height: 150, objectFit: "cover", width: "100%" }}
            />
          </div>
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            {getStatusTag(room.roomStatus)}
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          <Title
            level={4}
            style={{
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: 600
            }}
          >
            Phòng {room.roomNumber}
          </Title>
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#52c41a', 
              fontSize: 18, 
              marginBottom: 4 
            }}>
              {room.pricePerMonth?.toLocaleString()} VND/tháng
            </div>
            <div style={{ 
              color: '#666', 
              fontSize: 15, 
              fontWeight: 500 
            }}>
              {room.area} m²
            </div>
          </div>

          <Space direction="vertical" size="small" style={{ width: "100%", marginTop: 16 }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "8px 0",
              borderBottom: "1px solid #f5f5f5"
            }}>
              <Text style={{ fontWeight: 400 }}>Phòng ngủ:</Text>
              <Text style={{ fontWeight: 400 }}>{room.numberOfBedrooms}</Text>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "8px 0",
              borderBottom: "1px solid #f5f5f5"
            }}>
              <Text style={{ fontWeight: 400 }}>Phòng tắm:</Text>
              <Text style={{ fontWeight: 400 }}>{room.numberOfBathrooms}</Text>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "8px 0"
            }}>
              <Text style={{ fontWeight: 400 }}>Nội thất:</Text>
              <Text style={{ fontWeight: 400, color: hasAssets ? "#52c41a" : "#bfbfbf" }}>
                {hasAssets ? "Có" : "Không"}
              </Text>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
}
