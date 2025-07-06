import React from "react";
import { Input, Tooltip } from "antd";

/**
 * SearchBox component
 *
 * @param {Function} onSearch - Hàm gọi khi người dùng tìm kiếm
 * @param {string} placeholder - Placeholder trong input
 * @param {string} label - Nhãn hiển thị trên input (tuỳ chọn)
 * @param {string} tooltip - Tooltip khi hover vào input
 * @param {object} style - Custom style (tuỳ chọn)
 */
export default function SearchBox({
  onSearch,
  placeholder = "Tìm số phòng, giá, trạng thái ...",
  label,
  tooltip,
  style = {},
}) {
  const input = (
    <Input.Search
      allowClear
      placeholder={placeholder}
      onSearch={onSearch}
      style={{ width: 250, ...style }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <span style={{ fontSize: 13, color: "#666" }}>
          {label}
        </span>
      )}
      {tooltip ? (
        <Tooltip title={tooltip}>
          <div>{input}</div>
        </Tooltip>
      ) : (
        input
      )}
    </div>
  );
}
