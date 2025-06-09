import React from "react";

export default function RoomCard({ room }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        maxWidth: 280,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <img src={room.images[0]} alt="room" style={{ width: "100%" }} />
        <img src={room.images[1]} alt="room" style={{ width: "100%" }} />
      </div>
      <div style={{ padding: 12 }}>
        <h3 style={{ marginBottom: 8 }}>{room.name}</h3>
        <p style={{ fontWeight: "bold", fontSize: 16 }}>
          VND/month : {room.price.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
