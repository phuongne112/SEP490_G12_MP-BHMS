import React from "react";
import { Card, Row, Col, Button, Badge } from "antd";
import image1 from "../../assets/RoomImage/image1.png";
import image2 from "../../assets/RoomImage/image2.png";

const { Meta } = Card;

const mockRooms = [
  {
    id: 1,
    name: "Room 201 - Building B",
    price: 2300000,
    status: "Available",
    image: image1,
  },
  {
    id: 2,
    name: "Room 202 - Building B",
    price: 2300000,
    status: "Full",
    image: image2,
  },
  {
    id: 3,
    name: "Room 203 - Building B",
    price: 2300000,
    status: "Full",
    image: image1,
  },
  {
    id: 4,
    name: "Room 204 - Building B",
    price: 2300000,
    status: "Available",
    image: image2,
  },
];
export default function RoomTable({ rooms }) {
  return (
    <Row gutter={[16, 16]}>
      {rooms.map((room) => (
        <Col key={room.id} xs={24} sm={12} md={8}>
          <Card
            cover={
              <img
                alt="room"
                src={room.image}
                style={{
                  height: 200,
                  objectFit: "cover",
                  width: "100%",
                }}
              />
            }
            actions={[
              <Button type="primary" disabled={room.status !== "Available"}>
                Assign Renter
              </Button>,
              <Badge
                status={room.status === "Available" ? "success" : "error"}
                text={room.status}
              />,
            ]}
          >
            <Meta
              title={room.name}
              description={`Price: ${room.price.toLocaleString(
                "en-US"
              )} VND/month`}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
