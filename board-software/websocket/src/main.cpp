#include <Arduino.h>
#include <WifiMulti.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <Adafruit_Sensor.h>
#include "DHT.h"
#include <string>
#include <cmath>
#include <inttypes.h>

// define temp
#define DHTTYPE DHT11
#define TEMP_SENSOR_PIN 14
DHT dht(TEMP_SENSOR_PIN, DHTTYPE);

// define other light and sensor pins
#define LIGHT_SENSOR_PIN 34
#define LIGHT_BACK_PIN 32
#define LIGHT_FRONT_PIN 33

// define gps
#define GPS_BAUDRATE 9600
#define RXD2 16
#define TXD2 17

// define wifi
#define WIFI_SSID "ufdevice"
#define WIFI_PASSWORD "gogators"

// define websocket
#define WS_HOST "42lnjvrypg.execute-api.us-east-1.amazonaws.com" 
#define WS_PORT 443
#define WS_URL "/dev"

#define JSON_DOC_SIZE 2048
#define MSG_SIZE 256

WiFiMulti wifiMulti;
WebSocketsClient wsClient;

TinyGPSPlus gps;
uint64_t chipId = ESP.getEfuseMac();

int lastVal = 100000;


void sendErrorMsg(const char* error){
  char msg[MSG_SIZE];

  sprintf(msg, "{\"action\":\"msg\",\"type\":\"error\", \"deviceID\":\" %" PRIu64 " \", \"body\":{\"errMsg\":\"%s\"}}", chipId, error);
  wsClient.sendTXT(msg);
}

void sendSetMsg(int val, int val2){
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"status\", \"deviceID\":\"%" PRIu64 "\", \"body\":{\"status\":{\"val\":\"%d\", \"val2\":\"%d\"}}}",  chipId, val, val2);
  wsClient.sendTXT(msg);
}

void sendGetMsg(int val){
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\", \"deviceID\":\"%" PRIu64 "\", \"body\":{\"output\":{\"val\":\"%d\"}}}", chipId, val);
  wsClient.sendTXT(msg);
}

void sendData(const char* data, int more) {
  Serial.println("in send tempdata");
  char msg[MSG_SIZE*more];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\", \"deviceID\":\"%" PRIu64 "\", \"body\":{\"output\":{%s}}}", chipId, data);
  Serial.println(msg);
  wsClient.sendTXT(msg);
}


/* type: something
      body: {
        something: {
          actual values: 3
          another value: 2
        }
}
*/

void handleMsg(uint8_t* payload){
  StaticJsonDocument<JSON_DOC_SIZE> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    //Serial.print(F("deserializeJson() failed: "));
    //Serial.println(error.f_str());
    //const char*   = "-1";
    //sendErrorMsg(error.c_str(),  );
    return;
  }

  // if (!doc.containsKey(" ")){
  //   sendErrorMsg("  missing", "-1");
  //   return;
  // }

  //doc["body"][" "];

  char id[MSG_SIZE];
  sprintf(id, "%" PRIu64 "", chipId);

  Serial.println("before contains type");
  if (doc.containsKey("type") && doc.containsKey("deviceID") && strcmp(doc["deviceID"], id) == 0){
    if (!doc["type"].is<const char*>()) {
      //sendErrorMsg("invalid message type format",  );
      return;
    }

    if (!doc["body"].is<JsonObject>()){
      //sendErrorMsg("invalid command body",  );
      return;
    }

    const char* operation = doc["type"];

    if (strcmp(operation, "getAll") == 0){
      // get photo sensor val
      auto val = analogRead(LIGHT_SENSOR_PIN);
      std:: string photoVal = "\"light\":{\"val\":\"" + std::to_string(int(val)) + "\"}";
    
      // get temp vals
      float humidity = dht.readHumidity();

      // // Read temperature as Celsius (the default)
      // float celsius = dht.readTemperature();

      // Read temperature as Fahrenheit (isFahrenheit = true)
      float fahrenheit = dht.readTemperature(true);

      float hif = dht.computeHeatIndex(fahrenheit, humidity);

      std:: string tempVals = "\"tempReading\":{\"temp\":\"" + std::to_string(int(fahrenheit)) + "\",\"humidity\":\"" + std::to_string(int(humidity)) + "\",\"heatIndex\":\"" + std::to_string(int(hif)) + "\"}";

      // get gps vals
      std:: string gpsVals = "\"gpsReading\":{";

      if (Serial2.available()){
        gps.encode(Serial2.read());
        if (gps.location.isValid()){
          gpsVals += "\"lat\":\"" + std::to_string(gps.location.lat()) + "\",\"long\":\"" + std::to_string(gps.location.lng()) + "\",";
        } else {
          gpsVals += "\"lat\":\"nan\",\"long\":\"nan\",";
        }
        if (gps.altitude.isValid()){
          gpsVals += "\"alt\":\"" + std::to_string(gps.altitude.feet()) + "\",";
        } else {
          gpsVals += "\"alt\":\"nan\",";
        }
                
        if (gps.speed.isValid()) {
          gpsVals += "\"speed\":\"" + std::to_string(int(gps.speed.mph())) + "\"}";
        } else {
          gpsVals += "\"speed\":\"nan\"}";
        }
      } 

      std::string allVals = photoVal + "," + tempVals + "," + gpsVals;
      sendData(allVals.c_str(), 2);
      return;
    }

    // set lights
    if (strcmp(operation, "setLight") == 0){
      digitalWrite(LIGHT_BACK_PIN, doc["body"]["value"]);
      digitalWrite(LIGHT_FRONT_PIN, doc["body"]["value"]);
      int val = digitalRead(LIGHT_BACK_PIN);
      int val2 = digitalRead(LIGHT_FRONT_PIN);
      sendSetMsg(val, val2);
      return;
    }

    // get photo sensor value
    if (strcmp(operation, "getPhoto") == 0){
      auto val = analogRead(LIGHT_SENSOR_PIN);
      sendGetMsg(val);
      return;
    }

    Serial.println("before temp");
    // get temp
    if (strcmp(operation, "getTemp") == 0){
      std:: string tempVals = "\"tempReading\":{";

      Serial.println("in temp");
      float humidity = dht.readHumidity();
      float fahrenheit = dht.readTemperature(true);
      float hif = NAN;

      Serial.println("before chcking nan");

      if (!isnan(humidity) && !isnan(fahrenheit)) {
        hif = dht.computeHeatIndex(fahrenheit, humidity);
      }

      Serial.println("before stringing temp");

      tempVals += "\"temp\":\"" + std::to_string(int(fahrenheit)) + "\",\"humidity\":\"" + std::to_string(int(humidity)) + "\",\"heatIndex\":\"" + std::to_string(int(hif)) + "\"}";

      
      // // Read temperature as Celsius (the default)
      // float celsius = dht.readTemperature();
      //   // Compute heat index in Celsius (isFahreheit = false)
      //   float hic = dht.computeHeatIndex(celsius, humidity, false);

      
      Serial.println("before sendtempdate");
      sendData(tempVals.c_str(), 1);
      return;
    }

    // Get GPS
    if (strcmp(operation, "getGPS") == 0){
      std:: string gpsVals = "\"gpsReading\":{";

      if (Serial2.available()){
        gps.encode(Serial2.read());

        if (gps.location.isValid()){
          gpsVals += "\"lat\":\"" + std::to_string(gps.location.lat()) + "\",\"long\":\"" + std::to_string(gps.location.lng()) + "\",";
        } else {
          gpsVals += "\"lat\":\"nan\",\"long\":\"nan\",";
        }

        if (gps.altitude.isValid()){
          gpsVals += "\"alt\":\"" + std::to_string(gps.altitude.feet()) + "\",";
        } else {
          gpsVals += "\"alt\":\"nan\",";
        }
                
        if (gps.speed.isValid()) {
          gpsVals += "\"speed\":\"" + std::to_string(int(gps.speed.mph())) + "\"}";
        } else {
          gpsVals += "\"speed\":\"nan\"}";
        }
        sendData(gpsVals.c_str(), 1);
      } else {
        sendErrorMsg("Unable to retrieve GPS data");
      }
      return;
    }
    
    // Get device id
    if (strcmp(operation, "getDeviceId") == 0){
      char msg[MSG_SIZE];
      Serial.println("before sprintf");
      sprintf(msg, "{\"action\":\"msg\",\"type\":\"connection\", \"id\":\"%" PRIu64 "\"}",  chipId);

      Serial.println("before sentTXT");
      wsClient.sendTXT(msg);
      return;
    }

    //Serial.println("unsupported type request");
    //sendErrorMsg("unsupported type request",  );
    return;
  }
  //Serial.println("unsupported message type (! have type)");
  //sendErrorMsg("unsupported message type (! have type)",  );
  return;
}



void onWSEvent(WStype_t type, uint8_t* payload, size_t length){
  switch(type){
    case WStype_CONNECTED:
      Serial.printf("connected: %s\n", payload);
      // wsClient.sendPing(payload);
      // char msg[MSG_SIZE];
      // sprintf(msg, "{\"action\":\"msg\",\"type\":\"connection\",\"device\":\"%llu\"}", chipId);
      // wsClient.sendTXT(msg);
      //Serial.println("WS Connected");
      break;

    case WStype_DISCONNECTED:
      Serial.println("WS Disconnected");
      break;

    case WStype_TEXT:
      //Serial.printf("WS Message: %s\n", payload);
      handleMsg(payload);
      break;

    case WStype_ERROR:
      Serial.printf("WS Error");
      break;

    case WStype_PING:
      Serial.println("Received ping from Node.js");
      wsClient.sendPing(payload);
      break;
  }
  
}


void connectToWiFi();
void getAll();
unsigned long lastGetAllTime = 0; 

void setup() {
  Serial.begin(921600);
  Serial2.begin(GPS_BAUDRATE, SERIAL_8N1, RXD2, TXD2);
  //pinMode(25, OUTPUT);

  //wifiMulti.addAP(WIFI_SSID);

  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);

  pinMode(LIGHT_BACK_PIN, OUTPUT);
  pinMode(LIGHT_FRONT_PIN, OUTPUT);

  while (wifiMulti.run() != WL_CONNECTED) {
    connectToWiFi();
    delay(100);
  }

  Serial.println("Connected");
  wsClient.beginSSL(WS_HOST, WS_PORT, WS_URL, "", "wss"); 
  wsClient.onEvent(onWSEvent);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  unsigned long currentTime = millis();  // Get the current time

  if (currentTime - lastGetAllTime >= 2000) { // 15000 = 15 seconds
      getAll();
      lastGetAllTime = currentTime;  
  }

  wsClient.loop();
}


void connectToWiFi() {
  WiFi.disconnect(true); // Disconnect from any previous connections
  int numNetworks = WiFi.scanNetworks(); 
  if (numNetworks == 0) {
    return;
  }

  for (int i = 0; i < numNetworks; i++) {
    if (WiFi.begin(WiFi.SSID(i).c_str(), "") == WL_CONNECTED) {
      return;
    }
  }
}

void getAll(){
  // get photo sensor val
  auto val = analogRead(LIGHT_SENSOR_PIN);
  std:: string photoVal = "\"light\":{\"val\":\"" + std::to_string(int(val)) + "\"}";

  // get temp vals
  float humidity = dht.readHumidity();

  // // Read temperature as Celsius (the default)
  // float celsius = dht.readTemperature();

  // Read temperature as Fahrenheit (isFahrenheit = true)
  float fahrenheit = dht.readTemperature(true);

  float hif = dht.computeHeatIndex(fahrenheit, humidity);

  std:: string tempVals = "\"tempReading\":{\"temp\":\"" + std::to_string(int(fahrenheit)) + "\",\"humidity\":\"" + std::to_string(int(humidity)) + "\",\"heatIndex\":\"" + std::to_string(int(hif)) + "\"}";

  // get gps vals
  std:: string gpsVals = "\"gpsReading\":{";

  if (Serial2.available()){
    gps.encode(Serial2.read());
    if (gps.location.isValid()){
      gpsVals += "\"lat\":\"" + std::to_string(gps.location.lat()) + "\",\"long\":\"" + std::to_string(gps.location.lng()) + "\",";
    } else {
      gpsVals += "\"lat\":\"nan\",\"long\":\"nan\",";
    }
    if (gps.altitude.isValid()){
      gpsVals += "\"alt\":\"" + std::to_string(gps.altitude.feet()) + "\",";
    } else {
      gpsVals += "\"alt\":\"nan\",";
    }
            
    if (gps.speed.isValid()) {
      gpsVals += "\"speed\":\"" + std::to_string(int(gps.speed.mph())) + "\"}";
    } else {
      gpsVals += "\"speed\":\"nan\"}";
    }
  } 
  std::string allVals = photoVal + "," + tempVals + "," + gpsVals;
  sendData(allVals.c_str(), 2);
  return;
}
