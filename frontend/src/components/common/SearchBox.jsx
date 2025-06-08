import React from "react";
import { Input } from "antd";

export default function SearchBox({ onSearch }) {
  return (
    <Input.Search
      placeholder="Search"
      allowClear
      onSearch={onSearch}
      style={{ width: 200 }}
    />
  );
}
