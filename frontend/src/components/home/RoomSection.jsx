import React from "react";
import RoomCard from "./RoomCard";
import roomImg1 from "../../assets/RoomImage/image1.png";
import roomImg2 from "../../assets/RoomImage/image2.png";

const mockRooms = [
  { id: 1, name: "Room 101", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 2, name: "Room 102", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 3, name: "Room 103", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 4, name: "Room 104", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 5, name: "Room 105", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 6, name: "Room 106", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 7, name: "Room 107", price: 2300000, images: [roomImg1, roomImg2] },
  { id: 8, name: "Room 108", price: 2300000, images: [roomImg1, roomImg2] },
];

export default function RoomSection() {
  return (
    <section style={{ padding: "60px 20px", backgroundColor: "#fafafa" }}>
      <h2 style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>
        Our Available Rooms
      </h2>
      <p style={{ textAlign: "center", color: "#555", marginBottom: 40 }}>
        Choose the perfect room for your stay
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {mockRooms.map((room) => {
          console.log("room.images:", room.images);
          return <RoomCard key={room.id} room={room} />;
        })}
      </div>
    </section>
  );
}
