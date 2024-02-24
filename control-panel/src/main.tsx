import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App'
import './index.css'
import SignIn from './signin/SignIn'

ReactDOM.render(
  <BrowserRouter>
    <Routes>
        <Route path="/"  element={<App/>} />
        <Route path="/signin"  element={<SignIn/>} />
    </Routes>
    
  </BrowserRouter>,
  document.getElementById('root')
);
