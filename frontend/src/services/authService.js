import axiosClient from "./axiosClient";

export const login = async (email, password) => {
  const res = await axiosClient.post("auth/login", {
    username: email,
    password,
  });
  console.log("Login API response:", res);

  const accessToken = res.data.access_token;
  const user = res.data.user;

  localStorage.setItem("token", accessToken);
  localStorage.setItem("user", JSON.stringify(user));
  console.log("🔥 User from API:", res.data.user);

  return user;
};

export const logout = async (dispatch) => {
  try {
    // Gọi API backend để xóa cookie refresh token
    await axiosClient.post("/auth/logout");
  } catch (err) {
    console.warn("Logout API failed (but continuing locally)", err);
  }

  // Dọn localStorage + Redux + redirect
  localStorage.clear();
  dispatch({ type: "account/logout" });
  window.location.href = "/login";
};


export const register = async (formData) => {
  const response = await axiosClient.post("/auth/signup", formData);
  return response.data;
};

export const resetPassword = async ({ token, newPassword }) => {
  const res = await axiosClient.post("/auth/reset-password", {
    token,
    newPassword,
  });
  return res.data;
};

export const sendResetEmail = async (email) => {
  const res = await axiosClient.post("/auth/request-reset", { email });
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await axiosClient.get("/auth/account");
  console.log("🔥 getCurrentUser response:", res.data);
  return res.data?.user;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  return axiosClient.put("/auth/change-password", {
    currentPassword,
    newPassword,
  });
};

export const updateUserAccount = async (payload) => {
  return axiosClient.put("/users/me/account", payload);
};
