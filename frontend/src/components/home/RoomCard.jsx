import React from "react";
import { Card, Typography, Space, Tag } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RestOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";
import { Link } from "react-router-dom";

const { Text, Title } = Typography;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const getStatusTag = (status) => {
  switch (status) {
    case "Available":
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Available
        </Tag>
      );
    case "Occupied":
      return (
        <Tag icon={<RestOutlined />} color="error">
          Occupied
        </Tag>
      );
    case "Maintenance":
      return (
        <Tag icon={<ThunderboltOutlined />} color="warning">
          Maintenance
        </Tag>
      );
    default:
      return (
        <Tag icon={<ExclamationCircleOutlined />} color="default">
          Unknown
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
  const hasAssets = room.assets && room.assets.length > 0;

  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
            }}
          >
            {room.roomNumber}
          </Title>
          {room.building && (
            <div style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>
              <span role="img" aria-label="building">🏢</span> Tòa: <b>{room.building}</b>
            </div>
          )}

          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            <span role="img" aria-label="area">📏</span> {room.area} m²
          </Text>

          <div style={{ fontWeight: 700, color: '#d4380d', fontSize: 20, marginBottom: 8 }}>
            <span role="img" aria-label="money">💰</span> {room.pricePerMonth?.toLocaleString("vi-VN")} <span style={{ fontWeight: 400, fontSize: 15 }}>VND/tháng</span>
          </div>

          <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
            <Space size="large">
              <Text type="secondary">🛏️ {room.numberOfBedrooms} Bedrooms</Text>
              <Text type="secondary">
                🛁 {room.numberOfBathrooms} Bathrooms
              </Text>
            </Space>
            <Text type="secondary">
              🛋️ Furnished:{" "}
              <Text strong style={{ color: hasAssets ? "#52c41a" : "#bfbfbf" }}>
                {hasAssets ? "Yes" : "No"}
              </Text>
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
}
