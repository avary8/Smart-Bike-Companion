import 'tailwindcss/tailwind.css';
import { useState, useEffect } from "react";
import "./App.css";
import useWebSocket from "react-use-websocket";
import { Switch } from '@mui/base/Switch';
import ParkingIcon from '@mui/icons-material/LocalParking';
import AutoLightIcon from '@mui/icons-material/BrightnessAuto';
import LightsOffIcon from '@mui/icons-material/Brightness1';
import LightsOnIcon from '@mui/icons-material/LightMode';
import Button from '@mui/material/Button';
import Map from "./Map";
import ThermoIcon from '@mui/icons-material/Thermostat';
import WaterIcon from '@mui/icons-material/Water';
import AltitudeIcon from '@mui/icons-material/Terrain';
import SpeedIcon from '@mui/icons-material/Speed';
import InfoIcon from '@mui/icons-material/Info';
import MapIcon from '@mui/icons-material/Map';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ReloadIcon from '@mui/icons-material/Cached';

// import axios from '../api/backend.js';
import axios from 'axios';
import { light } from '@mui/material/styles/createPalette';
import React from 'react';

type MessageBody = {
  action: string
  type: string
  pin: string
  body: unknown
};

const tempID = '189922615539556';
const Route = "http://localhost:3500"

function App() {
  // const { readyState, lastMessage, sendMessage, sendJsonMessage } = useWebSocket(import.meta.env.VITE_WEBSOCKET_ADDRESS);

  const [tempReading, setTempReading] = useState({ temp: "67", humidity: "57", heat_index: "66" });
  const [GPSReading, setGPSReading] = useState({ lat: "29.650789", long: "-82.346568", alt: "nan", speed: "nan" });

  const [parkMode, setParkMode] = useState(false);
  const [autoLightMode, setAutoLightMode] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const [userLoc, setUserLoc] = useState<{ lat: number; long: number } | null>(null);

  useEffect (() => {
    const intervalId = setInterval(() => { 
      setUserLoc(Map.getUserLoc());
    // const intervalId = setInterval(() => { 
    //   if (navigator.geolocation){
    //     try {
    //       navigator.geolocation.getCurrentPosition(
    //         position => {
    //           setUserLoc({'lat': position.coords.latitude, 'long': position.coords.longitude});
    //         }
    //       )
    //     } catch (error){
    //       console.log(`unable to get user location. error: ${error} `);
    //     }
    //   } else {
    //     console.log(`geolocation is not supported`);
    //   }
    }, 10000)
    return () => clearInterval(intervalId);
  }, [])

  // // get all values when init
  // useEffect(() => {
  //   getSensorReading('getAll');
  // }, []);


  // uncomment when needed. this updates the light sensor value every x seconds
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     getSensorReading('TempReading');
  //   }, 1800000); // every 30 minutes
  //   return () => clearInterval(interval);
  // }, []);

  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     getSensorReading('gpsReading');
  //   }, 180000); // every 3 minutes
  //   return () => clearInterval(interval);
  // }, []);


  const getSensorReading = async (route: string) => {
    try {
      const response = await axios.get(`${Route}/data/${route}/${tempID}`);
      if (response?.data?.payload !== undefined){
        setSensorReading(route, response.data.payload);
      }
    } catch (error: any){
      console.error(`Error getting ${Route}/${route}/${tempID} sensor data: `, error?.response?.data?.errMsg || error.message);
    }
  }

  const setSensorReading = (async (path: string, payload: any) => {
    switch(path){
      case 'autoMode':
        setAutoLightMode(payload);
        break;
      case 'lightMode':
        setLightMode(payload);
        break;
      case 'parkMode':
        setParkMode(payload);
        break;
      case 'tempReading':
        setTempReading(payload);
        break;
      case 'gpsReading':
        setGPSReading(payload);
        break;
      case 'getAll':
        Object.entries(payload).forEach(([key, value]) => {
          console.log(key, value);
          setSensorReading(key, value);
        });
        break;
    }
  });


  const handleModeUpdate = (async (route: string) => {
    try {
      if (route === 'autoMode' || route === 'lightMode' || route === 'parkMode'){
        const response = await axios.put(`${Route}/data/${route}/${tempID}`);
        console.log(response.data);
        if (response?.data?.payload !== true || response?.data?.payload !== false){
          console.log("in payload check")
          await setSensorReading(route, response.data.payload);
        }
      } 
    } catch (error: any){
      console.error(`Error updating ${Route}/${route}/${tempID} sensor data: `, error?.response?.data?.errMsg || error.message);
    }
  });


  const handleClick = (route: string) => async() => {
    await handleModeUpdate(route);
  };

  const handleInfoOpen = ((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  });

  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;


  return (
    <body className="App" style={{background: 'linear-gradient(to bottom, #3b1f5b, #192841)', color: 'rgb(230, 230, 230)'}}>
      <h2>hamburger menu maybe</h2>

      {JSON.stringify(userLoc)}

        {/* <div className="py-2">
        <label className="relative inline-flex items-center mb-5 cursor-pointer">
          Lights 
          <Switch/>
        </label>
        </div> */}


        <div style={{ borderRadius: '10px', width: '60vw', height: '10vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)', display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', textAlign: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: '5vw' }}>
            Feels like {tempReading?.heat_index}&deg;F
          </span>
        </div>


        <div style={{
          marginTop: '1vw',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          width: '100%'
        }}>
          <div style={{ borderRadius: '10px', width: '40vw', height: '32vw', backgroundColor: 'rgba(161, 128, 196, 0.2)'}}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
              <ThermoIcon sx={{ fontSize: '8vw', color: 'primary', marginTop: '.2vw', marginRight: '-1.6vw', marginLeft: '-1vw' }} />
              <span style={{ marginLeft: '-2.2vw', fontSize: '5vw' }}>Temperature<br/></span>
            </div>
            
            <span style={{ fontSize: '8vw' }}><br/>{tempReading?.temp}&deg;F</span>
          </div>
          
          <div style={{ borderRadius: '10px', width: '40vw', height: '32vw',   backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                <WaterIcon sx={{ fontSize: '8vw', color: 'primary', marginRight: '-1.6vw', marginLeft: '-1.6vw' }} />
                <span style={{ fontSize: '5vw', marginLeft: '-2.2vw' }}>Humidity<br/></span>
            </div>
            <span style={{ fontSize: '8vw' }}><br/>{tempReading?.humidity}%</span>
          </div>
        </div>
    

      <div style={{
          marginTop: '1vw',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          width: '100%'
        }}>

        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw', backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            <AltitudeIcon sx={{ fontSize: '8vw', color: 'primary' }} />
            <span style={{ fontSize: '5vw', marginRight: '6vw' }}>Altitude</span>
          </div>
          {GPSReading?.alt ==='nan' ? 
              (
                <span style={{ fontSize: '4vw' }}><br/>Not available at the moment</span>
              ) : (
                <span style={{ fontSize: '8vw' }}><br/>GPSReading?.alt </span>
              )} 
        </div>
          
        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            <SpeedIcon sx={{ fontSize: '8vw', color: 'primary' }} />
            <span style={{ fontSize: '5vw', marginRight: '6.4vw' }}>Speed</span>
          </div>
            {GPSReading?.speed ==='nan' ? 
              (
                <span style={{ fontSize: '4vw' }}><br/>Not available at the moment</span>
              ) : (
                <span style={{ fontSize: '8vw' }}><br/>GPSReading?.speed </span>
              )} 
        </div>
      </div>
      
      <div style={{
          marginTop: '1vw',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          width: '100%'
      }}>

        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw', backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>
          {/* this div (below) lets us align vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', textAlign: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
              <span style={{ fontSize: '5vw', marginLeft: '6vw' }}>Auto Lights</span>
              <Button aria-describedby={id} onClick={handleInfoOpen}
                style={{ height: '3vw', width: '3vw', padding: '0px', borderWidth: '0px', margin: '0px', minWidth: 'unset', minHeight: 'unset', marginLeft: '3.5vw', color: 'rgb(230, 230, 230)' }}>
                <InfoIcon sx={{ fontSize: '4vw', color: 'primary', marginTop: '-1.4vw' }}/>
              </Button>
              <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <Typography sx={{ p: 2, backgroundColor: 'rgba(33, 31, 91, 0.5)', color: 'rgb(30, 30, 30)', fontSize: '4vw' }}>Automatically detects when to turn lights on</Typography>
              </Popover>
            </div>

            <Button onClick={handleClick("autoMode")}>
              {autoLightMode ? (
                <AutoLightIcon sx={{ fontSize: '20vw', color: 'primary' }} />
              ) : (
                <AutoLightIcon sx={{ fontSize: '20vw', color: 'rgb(176, 176, 176)' }} />
              )}
            </Button>
          </div>
        </div>
        
        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', textAlign: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}><span style={{ fontSize: '5vw' }}>Manual Lights</span></div>
            <Button onClick={handleClick("lightMode")}>
              {lightMode ? (
                <LightsOnIcon sx={{ fontSize: '20vw', color: 'yellow' }} />
              ) : (
                <LightsOffIcon sx={{ fontSize: '20vw', color: 'rgb(176, 176, 176)' }} />
              )}
            </Button>
          </div>
        </div>
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', marginTop: '1vw', borderRadius: '10px', width: '86.1vw', height: '120vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)' }}>


        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}>
        
          <span style={{ fontSize: '5vw' }}>Vehicle Location</span>
          <Button aria-describedby={id} onClick={handleInfoOpen}
                  style={{ height: '3vw', width: '3vw', padding: '0px', borderWidth: '0px', margin: '0px', minWidth: 'unset', minHeight: 'unset', marginLeft: '3.5vw', color: 'rgb(230, 230, 230)' }}>
            <InfoIcon sx={{ fontSize: '4vw', color: 'primary', marginTop: '-2.2vw' }}/>
          </Button>
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Typography sx={{ p: 2, backgroundColor: 'rgba(33, 31, 91, 0.5)', color: 'rgb(30, 30, 30)', fontSize: '4vw' }}>Press park button {'<P>'} to park vehicle and start location monitoring</Typography>
          </Popover>
        </div>

        <Button onClick={handleClick("parkMode")}>
            {parkMode ? (
              <ParkingIcon sx={{ fontSize: '20vw', color: 'primary' }} />
            ) : (
              <ParkingIcon sx={{ fontSize: '20vw', color: 'rgb(176, 176, 176)' }} />
            )}
          </Button>
          
          <div style={{width: '95%' }}>
            <Map.Map vehicle={GPSReading} />
          </div>
      </div>
    </body>
  );
}



export default App;
