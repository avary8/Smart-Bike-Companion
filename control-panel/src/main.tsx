import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import SignIn from './signin/SignIn'

const rootel = document.getElementById('root');
if (rootel){
  const root = ReactDOM.createRoot(rootel);

root.render(
  <Router>
  <Routes>
    <Route path="/" element={<App/>}></Route>
    <Route path="/signin" element={<SignIn/>}></Route>
  </Routes>
  </Router>
  // <BrowserRouter>
  //   <Routes>
  //       <Route path="*"  element={<App/>} />
  //       <Route path="/signin"  element={<SignIn/>} />
  //   </Routes>
    
  // </BrowserRouter>
);
}
