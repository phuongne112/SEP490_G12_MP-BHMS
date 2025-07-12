import React from "react";
import { FaFacebookF, FaYoutube, FaLinkedinIn } from "react-icons/fa";

export default function Footer() {
  return (
    <footer
      id="footer"
      style={{ background: "#fff", borderTop: "1px solid #eee", padding: 0 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: 32,
          gap: 32,
        }}
      >
        <div style={{ minWidth: 180 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <FaFacebookF size={24} />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <FaYoutube size={24} />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <FaLinkedinIn size={24} />
            </a>
            <a href="https://zalo.me" target="_blank" rel="noopener noreferrer">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                alt="Zalo"
                style={{ width: 24, height: 24 }}
              />
            </a>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 16 }}>
            Địa chỉ:
          </div>
          <div style={{ fontSize: 15, marginTop: 4 }}>
            Thôn 2 Thạch Hoà, Thạch Thất HN
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 320,
            height: 220,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <iframe
            title="map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.123456789!2d105.52000000000001!3d21.030000000000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab123456789%3A0x123456789abcdef!2zVGjDtG4gMiBUaOG6pWNoIEjhu5MsIFRo4bqhY2ggVGjhuqV0LCBIw6AgTuG7mWkgQ2jDrSBNaW5o!5e0!3m2!1svi!2s!4v1710000000000!5m2!1svi!2s"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </footer>
  );
}
