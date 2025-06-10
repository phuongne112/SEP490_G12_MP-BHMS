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
  const response = await axiosClient.post("/auth/register", formData);
  return response.data;
};

export const resetPassword = async ({ oldPassword, newPassword }) => {
  const res = await axiosClient.post("/auth/reset-password", {
    oldPassword,
    newPassword,
  });
  return res.data;
};
