import { createSlice } from "@reduxjs/toolkit";

const accountSlice = createSlice({
  name: "account",
  initialState: {
    user: null, // { id, fullName, role, permissions: [] }
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem("account", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      localStorage.removeItem("account");
    },
  },
});

export const { setUser, logout } = accountSlice.actions;
export default accountSlice.reducer;
