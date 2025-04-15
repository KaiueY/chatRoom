import { login,register } from "../api";
import { get, post, put, del } from '@/utils/http/axios/axios';


export const loginApi = (data) => {
  const res =  post(login,data)
  return res;
};

export const registerApi = (data) => {
  const res =  post(register,data)
  return res;
};

export const loginOutApi = (data) => {
  const res =  put(login,data)
  return res;
};