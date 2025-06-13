import { configureStore } from "@reduxjs/toolkit";

import accountReducer from "./accountSlice";

// ✅ Tạo Redux store – nơi lưu trữ toàn bộ state của ứng dụng
const store = configureStore({
  reducer: {
    // ✅ Đăng ký reducer "account" – bạn có thể truy cập qua state.account trong component
    account: accountReducer,
  },
});

export default store;
