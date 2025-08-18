import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store"; // 🔸 store bạn tạo ở store/index.js
import { setUser } from "./store/accountSlice"; // 🔸 action để set user
import "antd/dist/reset.css";
import { message, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'

// Configure global message settings
message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
  rtl: false,
});

// Thiết lập locale mặc định cho Day.js
dayjs.locale('vi');

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
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </Provider>
);
