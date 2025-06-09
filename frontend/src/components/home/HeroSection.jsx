import React from "react";
import banner1 from "../../assets/RoomImage/image1.png";
import banner2 from "../../assets/RoomImage/image2.png";

export default function HeroSection() {
  return (
    <section style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: 8 }}>
        Tittle
      </h1>
      <p style={{ fontSize: "20px", color: "#555", marginBottom: 24 }}>
        Subtitle
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        <button
          style={{
            padding: "10px 20px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          Button
        </button>
        <button
          style={{
            padding: "10px 20px",
            border: "none",
            backgroundColor: "#000",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Button
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 50,
          flexWrap: "wrap",
          marginTop: 30,
        }}
      >
        <img src={banner1} alt="Banner 1" style={{ width: 500, height: 400 }} />
        <img src={banner2} alt="Banner 2" style={{ width: 500, height: 400 }} />
      </div>
    </section>
  );
}
