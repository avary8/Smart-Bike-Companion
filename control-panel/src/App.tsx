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

import { axios } from '../api/backend';

type MessageBody = {
  action: string
  type: string
  pin: string
  body: unknown
};

const lightSensor = 34 as number;
const tempSensor = 35 as number;
const outputPins = [32];//, 33, 25, 26];
const defaultOutputPin = outputPins[0];

function App() {
  const { readyState, lastMessage, sendMessage, sendJsonMessage } = useWebSocket(import.meta.env.VITE_WEBSOCKET_ADDRESS);


  const [selectedPin, setSelectedPin] = useState(defaultOutputPin);
  const [pinVal, setPinVal] = useState(false);
  const [lightReading, setLightReading] = useState(0);
  const [tempReading, setTempReading] = useState(0.0);
  const [GPSReading, setGPSReading] = useState({});
  const [parkVal, setparkVal] = useState(false);
  const [autoLightVal, setAutoLightVal] = useState(false);
  const [lightVal, setLightVal] = useState(false);

  useEffect(() => {
    if (lastMessage === null){
      return;
    }

    const parsedMsg = JSON.parse(lastMessage.data) as MessageBody;

    console.log(parsedMsg);

    if (parsedMsg.action !== "msg"){
      return
    }

    if (parsedMsg.type === "error"){
      console.log(parsedMsg.body);
      setGPSReading(parsedMsg);
    }

    if (parsedMsg.type === "output") {
      const body = parsedMsg.body as number;
      const pin = parseInt(parsedMsg.pin, 10);

      if (pin === lightSensor){
        setLightReading(body);
      } else if (pin === tempSensor){
        setTempReading((body*3300.0 / 1024.0 - 500) / 10.0);
      } else {
        setPinVal(body === 0 ? false : true);
      }
    }
  }, [lastMessage, setPinVal])


  useEffect(() => {
    outputPins.forEach((pin) => {
      sendJsonMessage({
        action: "msg",
        type: "cmd",
        body: {
          type: "pinMode",
          pin,
          mode: "output"
        }
      });

      console.log (JSON.stringify({
        action: "msg",
        type: "cmd",
        body: {
          type: "pinMode",
          pin,
          mode: "output"
        }
      }))

    });

    // sendJsonMessage({
    //   action: "msg",
    //   type: "cmd",
    //   body: {
    //     type: "digitalRead",
    //     pin: defaultOutputPin
    //   }
    // });
  }, []);


  //uncomment when needed. this updates the light sensor value every x seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     sendJsonMessage({
  //       action: "msg", 
  //       type: "cmd",
  //       body: {
  //         type: "analogRead",
  //         pin: lightSensor,
  //       }
  //     });

  //     sendJsonMessage({
  //       action: "msg", 
  //       type: "cmd",
  //       body: {
  //         type: "analogRead",
  //         pin: tempSensor,
  //       }
  //     });

  //     sendJsonMessage({
  //       action: "msg", 
  //       type: "cmd",
  //       body: {
  //         type: "getGPS"
  //       }
  //     });


  //   }, 30000); // every 30 seconds
  //   return () => clearInterval(interval);
  // }, []);



  const handleParkClick = () => {
    // save current vehicle lat and long
    // turn on/off monitoring 
    console.log("location saved (hypothetically");
    setparkVal(!parkVal);
  }

  const handleAutoLightClick = () => {
    // change auto light val
    console.log("auto lights (hypothetically");
    setAutoLightVal(!autoLightVal);
  }

  const handleLightClick = () => {
    // turn lights on/off 
    console.log("lights (hypothetically");
    setLightVal(!lightVal);
  }


  return (
    <body className="App">
      <h1>ESP32 Control Panel</h1>
      {/* <div className="py-2">
        <label className="relative inline-flex items-center mb-5 cursor-pointer">
          Lights 
          <Switch/>
        </label>
      </div> */}

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select a pin</label>
        <select 
          value={selectedPin}
          onChange={(e) => {
            const newPin = parseInt(e.target.value, 10);
            setSelectedPin(newPin);
            sendJsonMessage({
              action: "msg",
              type: "cmd",
              body: {
                type: "digitalRead",
                pin: newPin
              }
            });
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
          {outputPins.map((pin) => <option value={pin}>GPIO{pin}</option>)}
        </select>
      </div>
      <div className="py-2">
        <label className="relative inline-flex items-center mb-5 cursor-pointer">
          <input type="checkbox" 
            checked={pinVal}
            onChange={() => {
              const newVal = !pinVal;
              setPinVal(newVal);
              sendJsonMessage({
                action: "msg", 
                type: "cmd",
                body: {
                  type: "digitalWrite",
                  pin: selectedPin,
                  value: newVal ? 1 : 0
                }
              })
            }}
            className="sr-only peer"/>
          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-8 rtl:peer-checked:after:-translate-x-7 peer-checked:after:border-white after:content-[''] after:left-0 after:absolute after:top-0.5 after:start-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
              {pinVal ? "on" : "off"}
          </span>
        </label>
      </div>


      <h2>Light Sensor Reading</h2>
      <div>
        {lightReading}
      </div>

      <h2>Temperature Sensor Reading</h2>
      <div>
        {tempReading}
      </div>

      <h2>GPS Reading</h2>
      <div>
        {JSON.stringify(GPSReading)}
      </div>



      <h2>Light Control</h2>
      <div style={{
        'display': 'flex',
        'flexDirection': 'row',
        'justifyContent': 'space-evenly',
        'width': '100%'
      }}>

        <div style={{
          'display': 'flex',
          'flexDirection': 'column'
        }}>
          <div>Auto Light</div>
          <Button onClick={handleAutoLightClick}>
          {autoLightVal ? (
            <AutoLightIcon fontSize='large' sx={{ color: 'primary' }} />
          ) : (
            <AutoLightIcon fontSize='large' sx={{ color: 'gray' }} />
          )}
          </Button>
        </div>

        <div style={{
          'display': 'flex',
          'flexDirection': 'column'
        }}>
          <div>Lights</div>
          <Button onClick={handleLightClick}>
          {lightVal ? (
            <LightsOnIcon fontSize='large' sx={{ color: 'yellow' }} />
          ) : (
            <LightsOffIcon fontSize='large' sx={{ color: 'gray' }} />
          )}
          </Button>
        </div>

      </div>


      <h2>Vehicle Location</h2>
      <div>Park vehicle and start location monitoring</div>
      <Button onClick={handleParkClick}>
      {parkVal ? (
        <ParkingIcon fontSize='large' sx={{ color: 'primary' }} />
      ) : (
        <ParkingIcon fontSize='large' sx={{ color: 'gray' }} />
      )}
      </Button>

      <Map lat={0.0} long={0.0}/>

    </body>
  );
}

export default App;
