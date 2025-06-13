import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store"; // 🔸 store bạn tạo ở store/index.js
import { setUser } from "./store/accountSlice"; // 🔸 action để set user
import "antd/dist/reset.css";

// 🔹 Nếu user đã login trước đó → load từ localStorage
const storedAccount = localStorage.getItem("account");
if (storedAccount) {
  try {
    const user = JSON.parse(storedAccount);
    store.dispatch(setUser(user));
  } catch (err) {
    console.error("Lỗi parse account từ localStorage:", err);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
