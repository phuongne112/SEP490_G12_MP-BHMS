import React from "react";
import { Card, Row, Col, Button, Badge, Skeleton } from "antd";

const { Meta } = Card;

export default function RoomTable({ rooms, loading }) {
  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {[...Array(6)].map((_, idx) => (
          <Col key={idx} xs={24} sm={12} md={8}>
            <Card><Skeleton active /></Card>
          </Col>
        ))}
      </Row>
    );
  }
  return (
    <Row gutter={[16, 16]}>
      {rooms.map((room) => {
        const imageUrl = room.images && room.images.length > 0
          ? room.images[0].imageUrl
          : "/img/room-default.png"; // fallback ảnh mặc định
        return (
          <Col key={room.id} xs={24} sm={12} md={8}>
            <Card
              cover={
                <img
                  alt="room"
                  src={imageUrl}
                  style={{ height: 200, objectFit: "cover", width: "100%" }}
                />
              }
              actions={[
                <Button type="primary" disabled={room.roomStatus !== "Available"}>
                  Assign Renter
                </Button>,
                <Badge
                  status={room.roomStatus === "Available" ? "success" : "error"}
                  text={room.roomStatus}
                />,
              ]}
            >
              <Meta
                title={room.roomNumber}
                description={`Price: ${room.pricePerMonth?.toLocaleString("en-US")} VND/month`}
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
