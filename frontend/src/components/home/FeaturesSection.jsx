import React from "react";
import { FaInfoCircle } from "react-icons/fa";

const items = new Array(6).fill({
  title: "Title",
  desc: "Body text for whatever you'd like to say. Add main takeaway points, quotes, anecdotes, or even a very very short story.",
});

export default function FeaturesSection() {
  return (
    <section style={{ padding: "60px 20px" }}>
      <h2 style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>
        Heading
      </h2>
      <p style={{ textAlign: "center", color: "#555", marginBottom: 40 }}>
        Subheading
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 100,
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {items.map((item, idx) => (
          <div key={idx}>
            <div
              style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
            >
              <FaInfoCircle style={{ marginRight: 8 }} />
              <strong>{item.title}</strong>
            </div>
            <p style={{ fontSize: 14, color: "#333" }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
