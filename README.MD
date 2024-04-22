# Smart Bike Companion App

A fullstack IOT project utilizing an esp32, Amazon Web Services (AWS), and a Vite+React front-end.

## Contents

- [Project Description](#project-description)
- [List of Technologies Used](#list-of-technologies-used)
- [Technical Description](#technical-description)
- [Implemented Features](#implemented-features)
- [Example Run](#example-run)
- [Knowledge Gained](#new-knowledge-gained)
- [Possible Future Implementation](#possible-future-implementation)

# Project Description

This project was created in order to provide modern and convenient features to users of bikes, scooters, and other small transportation devices. A control panel was developed to display all recent sensor values, toggles for modes, and a map of current vehicle and user location. Users also are able to view old data by means of graphs. A description of features will be in the [Implemented Features Section](#implemented-features).

# List of Technologies Used

## Hardware

- ExpressIf ESP32
- Photoresistor (GM5539)
- Temperature sensor (DHT11)
- GPS (NEO-6M)
- wires, resistors, breadboard

## Software

- PlatformIO
- Vite + React
- Amazon Web Services (AWS)
  - DynamoDB
  - API Gateway
  - Lambda Functions
  - Amazon Location Map

# Technical Description

## ESP32

In order to properly test and develop the ESP32 and adjacent hardware, I used PlatformIO on VSCode. On startup, the ESP32 will try to connect to the campus wifi or if it is unable to, simply any wifi. Following that, it will attempt to connect to the websocket that I have set up. Lastly, the websocket connection will remain open in order to listen for commands from the backend, and to send sensor data from the esp32 which will collect and send it automatically.

## AWS - Websocket and Backend

The websocket is hosted on AWS API Gateway. I chose to use a websocket because having open communication seemed the simplest and most effective in this project. The backend is hosted on AWS as a Lambda function. I have this function set up in order to receive data from the backend and frontend and handle logic for each accordingly.

#### Handling Connections

When a new device joins the websocket connection, this function will take note of the new connection id and store it in a DynamoDB table. This is done to ensure some messages are not needlessly sent to the same connection id.

#### Database

The DynamoDB contains 2 tables: Connections and Vehicles. Connections are created and deleted at each connection and disconection and simply store the connection id. Vehicles is the table that will store all history about a particular ESP32. This table will contain fields to store sensor values, modes, and history to be used later by the frontend.

#### Handling Messages

On the first message that is sent, the Lambda function will check if a field 'devID' exists which indicates that an ESP32 sent the message, and see if that device exists in the database already. If it does not exist, a new Entry will be created for the corresponding 'devID'.

Regarding the handling of data, the data will have a certain 'type' depending on who sent it and what needs to be handled. For instance, the backend will always send data with types-- 'output' , 'status', or 'error' and the frontend will always send data with types -- 'get' or 'set'. All functionality revolves around either retrieving from the database or updating the database, and when we update the database, we always perform a check on the lights. In both cases (back and front end), whenever a Vehicle entry related to the functionality of lights is updated, a function to check if the lights should be on or off is performed.

## Frontend

The frontend was created using Vite+React. Whenever refreshed, the frontend will send a message requesting a full database retrieval. This is done in order to properly set the last recorded sensor and mode values. Additionally, whenever the ESP32 sends data through the websocket, that data is then automatically sent, parsed, and displayed by the frontend. I also implemented graphs that display previous data. These graphs have the ability to be filtered by time so that users can adjust the interval of data that they are seeing. I also implemented a map using Amazon's Location Map that is capable of marking the user and their vehicle's location. The frontend is also responsible for keeping track of a user's location and their vehicle. While both locations are stored in the database, the frontend will be doing checks to ensure that when Park mode is on, the vehicle does not leave a certain radius.

# Implemented Features

### Frontend

- A control panel was created to display all information to users
- A map indicating the user's location and vehicle's location
- Toggles to control different modes

### Modes

- Automatic Light Mode - when activated, lights will turn on automatically when it is dark outside or night time hours
- Manual Light Mode - when activated, lights will turn on no matter the time or brightness
- Parking Mode (GPS Monitoring) - when activated, the vehicle's gps location will be saved, the live monitoring will begin, and if the vehicle's newly recorded coordinates begin to move drastically, alerts will be issued for the user. If a user forgets to turn off this mode, this mode will automatically detect if a user is nearby and likely with the vehicle.

### Sensors and Graphs

- Sensors Recorded and all old values are available to view through graphs on the frontend
  - Temperature
  - Humidity
  - Heat Index
  - Altitude
  - Speed
- Graphs have capability of selecting pre-set intervals to display data (such as 'last 24 hours')

### Database and Websocket

- Due to the use of a database, all information persists regardless of whether the ESP32 or frontend are live. This means all mode values and sensor data (including parked location)
- The websocket connection allows for a quick always open line of communication betwee the frontend, backend, and esp32.

# Example Run

[Submission Video](https://www.youtube.com/watch?v=Nyj_7Zc9VhM)

# New Knowledge Gained

- Websocket connections using AWS API Gateway
- Uploading a server as an AWS Lambda Function
- Communication between hardware and software

# Possible Future Implementation

- Sign-in Pages
- Device Set-Up so that users may have multiple devices
- Invest in a better GPS modules :)
- Ways to add new Wifi connection and passwords from user
- Switch to React Native maybe ?
