import 'tailwindcss/tailwind.css';
import { useState, useEffect, useRef } from "react";
import "./App.css";
import useWebSocket from "react-use-websocket";
import { Switch } from '@mui/base/Switch';
import ParkingIcon from '@mui/icons-material/LocalParking';
import AutoLightIcon from '@mui/icons-material/BrightnessAuto';
import LightsOffIcon from '@mui/icons-material/Brightness1';
import LightsOnIcon from '@mui/icons-material/LightMode';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MapComponent from './components/Map';
import AreaCharter from './components/AreaChart';
import ThermoIcon from '@mui/icons-material/Thermostat';
import WaterIcon from '@mui/icons-material/Water';
import AltitudeIcon from '@mui/icons-material/Terrain';
import SpeedIcon from '@mui/icons-material/Speed';
import InfoIcon from '@mui/icons-material/Info';
import MapIcon from '@mui/icons-material/Map';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ReloadIcon from '@mui/icons-material/Cached';
import { light } from '@mui/material/styles/createPalette';
import React from 'react';
import Backdrop from '@mui/material/Backdrop';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { AutoMode } from '@mui/icons-material';
import Alert from '@mui/material/Alert';
import { Area } from 'recharts';
import BikeIcon from '@mui/icons-material/PedalBike';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
const textDecoder = new TextDecoder();

type MessageBody = {
    action: string
    type: string
    connectionID: string,
    deviceID: string,
    messageID: string,
    body: any
};

const tempID = '189922615539556';
const Route = "http://localhost:3500"

function App() {
  const { readyState, lastMessage, sendMessage, sendJsonMessage } = useWebSocket(import.meta.env.VITE_WEBSOCKET_ADDRESS);

  const [tempReading, setTempReading] = useState({ temp: "nan", humidity: "nan", heatIndex: "nan" });
  const [GPSReading, setGPSReading] = useState({ lat: "nan", long: "nan", alt: 'nan', speed: 'nan' });

  const [parkMode, setParkMode] = useState(true);
  const [autoLightMode, setAutoLightMode] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [warning, setWarning] = useState(false);
  const [alert, setAlert] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [info1, setInfo1] = useState(false);
  const [info2, setInfo2] = useState(false);

  const [graphDisplay, setGraphDisplay] = useState(0);
  const handleChange = (event: SelectChangeEvent) => {
    setGraphDisplay(event.target.value);
  };

  
  const graph = useRef('');
  const history = useRef('');

  const [userLoc, setUserLoc] = useState({});
  const [parkedLocation, setParkedLocation] = useState({ lat: "nan", long: "nan" });



  /* parsed message: 
  Object {
    action: "msg"
    connectionID: ""
    deviceID: "189922615539556"
    messageID: "1"
    type: "output"
​    body: { 
      output: {
        gpsReading: { 
        alt: "nan"
        lat: "nan"
        long: "nan"
        speed: "nan"
      }
      ​light: { 
        val: "1232" 
      }
      tempReading: {
        heat_index: "67"
        humidity: "59"
        temp: "68"
      }
    }
  }
*/

  useEffect(() => {
    if (lastMessage === null || !lastMessage?.data){
      return;
    }
    var parsedMsg;
    try {
      parsedMsg = JSON.parse(lastMessage.data) as MessageBody;
      console.log(parsedMsg);
      // console.log('body: ')
      // console.log(parsedMsg?.body)
      // console.log('output: ')
      // console.log(parsedMsg?.body?.output)
      // console.log('temp: ')
      // console.log(parsedMsg?.body?.output?.tempReading)

    } catch (error){
      console.error(`Error Parsing JSON: ${error}`);
    }
    const type = parsedMsg?.type;
    const body = parsedMsg?.body;
    switch (type){
      case 'output':
        if (body?.output?.gpsReading){
          setSensorReading('gpsReading', body?.output?.gpsReading);
        }
        if (body?.output?.tempReading){
          setSensorReading('tempReading', body?.output?.tempReading);
        }
        break;
      case 'status':
        break;
      case 'set':
      case 'get':
        setSensorReading(body?.req, body?.value);
        break;
    }
    
  }, [lastMessage]);



  useEffect (() => {
    //const intervalId = setInterval(async() => { 
      // const userloc = await Map.GetUserLoc();
      // setUserLoc(userloc);
  
    const intervalId = setInterval(() => { 
      if (navigator.geolocation){
        try {
          var userloc;
          navigator.geolocation.getCurrentPosition(
            position => {
              setUserLoc ({'lat': position.coords.latitude, 'long': position.coords.longitude});
            }
          )
        } catch (error){
          console.log(`unable to get user location. error: ${error} `);
        }
      } else {
        console.log(`geolocation is not supported`);
      }
    }, 10000)
    return () => clearInterval(intervalId);
  }, [])

  // get all values when init
  useEffect(() => {
    getSensorReading('getAll');
  }, []);


  const getSensorReading = async (route: string) => {
    try {
      sendJsonMessage({
        action: 'msg',
        id: tempID,
        type: 'get',
        body: {
          req: route
        }
      });
    } catch (error: any){
      console.error(`Error getting database data: `, error?.response?.data?.errMsg || error.message);
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
        if (payload?.temp === 'nan') payload.temp = tempReading.temp;
        if (payload?.humidity === 'nan') payload.humidity = tempReading.humidity;
        if (payload?.heatIndex === 'nan') payload.heatIndex = tempReading.heatIndex;
        setTempReading(payload);
        break;
      case 'gpsReading':
        if (payload?.lat === 'nan') payload.lat = GPSReading.lat;
        if (payload?.long === 'nan') payload.long = GPSReading.long;
        if (payload?.alt === 'nan') payload.alt = GPSReading.alt;
        if (payload?.speed === 'nan') payload.speed = GPSReading.speed;
        setGPSReading(payload);
        checkPos();
        break;
      case 'parkedLocation':
        if (parkMode === false){
          if (payload?.lat === 'nan') payload.lat = parkedLocation.lat;
          if (payload?.long === 'nan') payload.long = parkedLocation.long;
          setParkedLocation(payload);
        }
        break;
      case 'history': 
        history.current = payload;
        break;
      case 'getAll':
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'parkedLocation'){
            if (value?.lat === 'nan') value.lat = parkedLocation.lat;
            if (value?.long === 'nan') value.long = parkedLocation.long;
            setParkedLocation(value);
          }
          setSensorReading(key, value);
        });
        break;
    }
  });

  const checkPos = (() =>{
    if (parkMode === false || Math.abs(parseFloat(userLoc?.lat) - parseFloat(parkedLocation?.lat)) < 0.000137 || Math.abs(parseFloat(userLoc?.long) - parseFloat(parkedLocation?.long)) < 0.000137 ){
      return;
    } 

    if (Math.abs(parseFloat(GPSReading?.lat) - parseFloat(parkedLocation?.lat)) > 0.000137 || Math.abs(parseFloat(GPSReading?.long) - parseFloat(parkedLocation?.long)) > 0.000137 ){
      setWarning(false);
      setAlert(true);
    } else if (Math.abs(parseFloat(GPSReading?.lat) - parseFloat(parkedLocation?.lat)) > 0.0000824 || Math.abs(parseFloat(GPSReading?.long) - parseFloat(parkedLocation?.long)) > 0.0000824){
      setAlert(false);
      setWarning(true);
    } else {
      setAlert(false);
      setWarning(false);
    }
  });

  const handleModeUpdate = (async (route: string) => {
    try {
      var mode;
      if (route === 'autoMode' || route === 'lightMode' || route === 'parkMode'){
        if (route ==='autoMode') mode = !autoLightMode;
        if (route ==='lightMode') mode = !lightMode;
        if (route ==='parkMode') mode = !parkMode;
        //const response = await axios.put(`${Route}/data/${route}/${tempID}`);
        sendJsonMessage({
          action: 'msg',
          id: tempID,
          type: 'set',
          body: {
            req: route,
            val: mode
          }
        });
        setSensorReading(route, mode);
      } 
    } catch (error: any){
      console.error(`Error updating sensor data: ${error}`);
    }
  });


  const handleClick = (route: string) => async() => {
    await handleModeUpdate(route);
  };

  const handleInfoOpen = (num: number) => async(event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    if (num == 1){
      setInfo1(true);
    } else if (num == 2){
      setInfo2(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setInfo1(false);
    setInfo2(false);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;


  const handleDivClick = (route: string) => async() => {
    if (route === 'Temperature' || route === 'Humidity' || route === 'Heat Index' || route === 'Altitude' || route === 'Speed'){
      graph.current = route;
      setShowGraph(true);
    }  
  };

  const handleCloseGraph = async() => {
    graph.current = '';
    setShowGraph(false);
  };


  // // manual testing
  // const change = (val: any) => {
  //   setGPSReading({
  //     lat: `${parseFloat(GPSReading.lat) + val}`,
  //     long: GPSReading.long,
  //     alt: GPSReading.alt,
  //     speed: GPSReading.speed
  //   });
  //   checkPos();
  // }

  return (
    // orig gradient scheme: 'linear-gradient(to bottom, #3b1f5b, #192841)'
    <body className="App" style={{background: 'linear-gradient(to bottom, #3d0e73, #160e73)', color: 'rgb(230, 230, 230)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

      <Dialog open={showGraph} onClose={handleCloseGraph}
        slotProps={{ backdrop: { style: { backgroundColor: 'transparent' } } }} 
        PaperProps={{ style:{ margin: '0', maxWidth: 'none', width: '80vw', height: '40vh', minHeight: '200px', backgroundColor: 'rgba(39, 39, 41, 0.99)', zIndex: '999' }, }} className='blur-background'>
         <DialogTitle style={{ fontSize: '5vw', color: 'rgb(230, 230, 230)' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>

            <span style={{ fontSize: '5vw', marginLeft: '6vw' }}>
              {`${graph.current}`} History
            </span>

            <FormControl style={{ minWidth: '80px', height: '3vw', width: '10vw', padding: '0px', borderWidth: '0px', margin: '0px', minHeight: 'unset', marginLeft: '3.5vw', color: 'rgb(230, 230, 230)', borderColor: 'rgb(230, 230, 230)' }}>
            <InputLabel id="demo-simple-select-autowidth-label" style={{ color: 'rgb(230, 230, 230)' }}>Set Interval</InputLabel>
            <Select
              labelId="select-filter-by-field-labe;"
              id="select-filter-by-field"
              value={graphDisplay}
              onChange={handleChange}
              autoWidth
              label="Interval"
              sx={{
                color: 'rgb(230, 230, 230)',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(230, 230, 230, 0.25)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#8b5cf6',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#8b5cf6',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                }
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    backgroundColor: 'rgb(39, 39, 41)',
                    color: 'rgb(230, 230, 230)',
                  },
                },
              }}
            >

              <MenuItem value={0}>
                <em>All</em>
              </MenuItem>
              <MenuItem value={1}>Last 24 Hours</MenuItem>
              <MenuItem value={2}>Last Week</MenuItem>
              <MenuItem value={3}>Last Month</MenuItem>
              <MenuItem value={4}>Last 6 Months</MenuItem>
              <MenuItem value={5}>Last Year</MenuItem>
            </Select>
            </FormControl>
          </div>
        </DialogTitle> 
        <DialogContent  style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AreaCharter data={{ graph: graph.current, history: history.current, graphInterval: graphDisplay }}/>
        </DialogContent>
      </Dialog>

      

      <BikeIcon sx={{ 
        fontSize: '20vw', 
        color: 'rgb(176, 176, 176)' }} className='moving-icon'/>

    {/* MANUAL TESTING */}

      {/* <Button onClick={() => change(0.00004)}>up</Button>
      <Button onClick={() => change(-0.01004)}>down</Button>

      lat: {GPSReading.lat} long: {GPSReading.long}
      <br/>
      orig: lat: 29.650789 long: -82.346568

      <br/>

      {JSON.stringify(userLoc)} */}

    {/* end of testing code */}

      {/* fix this and add alert box too*/}
      {warning && 
        <Alert severity="warning" 
          style={{ backgroundColor: 'rgba(252, 229, 204, .93)', position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: '1000', width: '100%', height: '15%', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          icon={<WarningIcon sx={{ fontSize: '8vw' }} />} 
        >
          <span style={{ fontSize: '3vw' }}>It appears your vehicle may be moving (threshold 30ft)</span>
        </Alert> 
      }

      {alert && 
        <Alert severity="error" 
          style={{ backgroundColor: 'rgba(252, 204, 204, .93)', position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', zIndex: '1000', width: '100%', height: '15%', minHeight: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          icon={<ErrorIcon sx={{ fontSize: '8vw', color: 'rgb(156, 0, 0)' }} />} 
        >
          <span style={{ fontSize: '3vw' }}>It appears your vehicle is moving (threshold 50ft)</span>
        </Alert> 
      }

    
    

        {/* <div className="py-2">
        <label className="relative inline-flex items-center mb-5 cursor-pointer">
          Lights 
          <Switch/>
        </label>
        </div> */}

        <div style={{ borderRadius: '10px', width: '60vw', height: '10vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)', display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', textAlign: 'center', alignItems: 'center' }}
          onClick={handleDivClick('Heat Index')}
        >
          <span style={{ fontSize: '5vw' }}>
            Feels like {tempReading?.heatIndex}&deg;F
          </span>
        </div>


        <div style={{
          marginTop: '1vw',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          width: '100%'
        }}>
          
          <div style={{ borderRadius: '10px', width: '40vw', height: '32vw', backgroundColor: 'rgba(161, 128, 196, 0.2)'}}
            onClick={handleDivClick('Temperature')}
          >
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
              <ThermoIcon sx={{ fontSize: '8vw', color: 'primary', marginTop: '.2vw', marginRight: '-1.6vw', marginLeft: '-1vw' }} />
              <span style={{ marginLeft: '-2.2vw', fontSize: '5vw' }}>Temperature<br/></span>
            </div>
            
            <span style={{ fontSize: '8vw' }}><br/>{tempReading?.temp}&deg;F</span>
          </div>
          
          <div style={{ borderRadius: '10px', width: '40vw', height: '32vw',   backgroundColor: 'rgba(161, 128, 196, 0.2)' }} 
            onClick={handleDivClick('Humidity')}
          >
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

        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw', backgroundColor: 'rgba(161, 128, 196, 0.2)' }}
          onClick={handleDivClick('Altitude')}
        >
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
          
        <div style={{ borderRadius: '10px', width: '40vw', height: '32vw',  backgroundColor: 'rgba(161, 128, 196, 0.2)' }}
          onClick={handleDivClick('Speed')}
        >
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
              <Button aria-describedby={id} onClick={handleInfoOpen(1)}
                style={{ height: '3vw', width: '3vw', padding: '0px', borderWidth: '0px', margin: '0px', minWidth: 'unset', minHeight: 'unset', marginLeft: '3.5vw', color: 'rgb(230, 230, 230)' }}>
                <InfoIcon sx={{ fontSize: '4vw', color: 'primary', marginTop: '-1.4vw' }}/>
              </Button>
              <Popover
                id={id}
                open={info1}
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

            <Button onClick={handleClick("autoMode")} style={{ backgroundColor: 'transparent', outline: 'none' }}>
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
            <Button onClick={handleClick("lightMode")} style={{ backgroundColor: 'transparent', outline: 'none' }}>
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
          <Button aria-describedby={id} onClick={handleInfoOpen(2)}
                  style={{ height: '3vw', width: '3vw', padding: '0px', borderWidth: '0px', margin: '0px', minWidth: 'unset', minHeight: 'unset', marginLeft: '3.5vw', color: 'rgb(230, 230, 230)' }}>
            <InfoIcon sx={{ fontSize: '4vw', color: 'primary', marginTop: '-2.2vw' }}/>
          </Button>
          <Popover
            id={id}
            open={info2}
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

        <Button onClick={handleClick("parkMode")} style={{ backgroundColor: 'transparent', outline: 'none' }}>
            {parkMode ? (
              <ParkingIcon sx={{ fontSize: '20vw', color: 'primary' }} />
            ) : (
              <ParkingIcon sx={{ fontSize: '20vw', color: 'rgb(176, 176, 176)' }} />
            )}
          </Button>
          
          <div id="map-container" style={{width: '95%' }}>
              <MapComponent.Map vehicle={GPSReading} />
          </div>
      </div>
    </body>
  );
}


export default App;