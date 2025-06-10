import React from "react";
import { FaFacebookF, FaYoutube, FaLinkedinIn } from "react-icons/fa";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#fff",
        padding: "40px 20px",
        borderTop: "1px solid #eee",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 40,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <a href="#">
            <FaFacebookF size={20} />
          </a>
          <a href="#">
            <FaYoutube size={20} />
          </a>
          <a href="#">
            <FaLinkedinIn size={20} />
          </a>
        </div>

        <div>
          <h4 style={{ fontweight: "bold" }}>Use cases</h4>
          <ul style={{ padding: 0, margin: 8, listStyle: "none" }}>
            {[
              "Design",
              "Prototyping",
              "Development features",
              "Design systems",
              "Collaboration features",
              "Design process",
              "FigJam",
            ].map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontWeight: "bold" }}>Explore</h4>
          <ul style={{ padding: 0, margin: 8, listStyle: "none" }}>
            {[
              "Design",
              "Prototyping",
              "Development features",
              "Design systems",
              "Collaboration features",
              "Design process",
              "FigJam",
            ].map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontWeight: "bold" }}>Resources</h4>
          <ul style={{ padding: 0, margin: 8, listStyle: "none" }}>
            {[
              "Blog",
              "Best practices",
              "Colors",
              "Color wheel",
              "Support",
              "Developers",
              "Resource library",
            ].map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
