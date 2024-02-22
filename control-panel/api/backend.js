import axios from 'axios';

export default axios.create({
  baseURL: import.meta.env.BACKEND_SERVER_HOST + import.meta.env.env.BACKEND_SERVER_API_PATH
});

// export const axiosPrivate = axios.create({
//     baseURL: process.env.REACT_APP_SERVER_HOST + process.env.REACT_APP_SERVER_API_PATH,
//     headers: { FCI_app: process.env.REACT_APP_APP_NAME, 'Content-Type': 'application/json' },
//     withCredentials: true
//   });