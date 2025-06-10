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

  return user;
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "login";
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
