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


void sendErrorMsg(const char* error, const char* messageID){
  char msg[MSG_SIZE];

  sprintf(msg, "{\"action\":\"msg\",\"type\":\"error\",\"device\":\" %" PRIu64 " \",\"messageID\":\"%s\",\"body\":{\"errMsg\":\"%s\"}}", chipId, messageID, error);
  wsClient.sendTXT(msg);
}

void sendSetMsg(const char* messageID, int val){
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"status\",\"device\":\"%" PRIu64 "\",\"messageID\":\"%s\",\"body\":{\"status\":{\"val\":\"%d\"}}}", chipId, messageID, val);
  wsClient.sendTXT(msg);
}

void sendGetMsg(const char* messageID, int val){
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%" PRIu64 "\",\"messageID\":\"%s\",\"body\":{\"output\":{\"val\":\"%d\"}}}", chipId, messageID, val);
  wsClient.sendTXT(msg);
}

void sendData(const char* messageID, const char* data, int more) {
  Serial.println("in send tempdata");
  char msg[MSG_SIZE*more];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%" PRIu64 "\",\"messageID\":\"%s\",\"body\":{\"output\":{%s}}}", chipId, messageID, data);
  Serial.println(msg);
  Serial.println(data);

  Serial.println("before send msg");
  wsClient.sendTXT(msg);
  Serial.println("after send msg");
  
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
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    sendErrorMsg(error.c_str(), "-1");
    return;
  }

  // if (!doc.containsKey("messageID")){
  //   sendErrorMsg("messageID missing", "-1");
  //   return;
  // }

  const char* messageID = "1";
  //doc["body"]["messageID"];

  Serial.println("before contains type");
  if (doc.containsKey("type")){
    if (!doc["type"].is<const char*>()) {
      sendErrorMsg("invalid message type format", messageID);
      return;
    }
    Serial.println("before cmd compare");
    if(strcmp(doc["type"], "cmd") == 0){
      if (!doc["body"].is<JsonObject>()){
        sendErrorMsg("invalid command body", messageID);
        return;
      }

      if (!doc["body"]["type"]){
        sendErrorMsg("No operation provided", messageID);
        return;
      } 

      const char* operation = doc["body"]["type"];

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

        std:: string tempVals = "\"tempReading\":{\"temp\":\"" + std::to_string(int(fahrenheit)) + "\",\"humidity\":\"" + std::to_string(int(humidity)) + "\",\"heat_index\":\"" + std::to_string(int(hif)) + "\"}";

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
        sendData(messageID, allVals.c_str(), 2);
        return;
      }

      // set lights
      if (strcmp(operation, "setLight") == 0){
        digitalWrite(LIGHT_BACK_PIN, doc["body"]["value"]);
        int val = digitalRead(LIGHT_BACK_PIN);
        sendSetMsg(messageID, val);
        return;
      }

      // get photo sensor value
      if (strcmp(operation, "getPhoto") == 0){
        auto val = analogRead(LIGHT_SENSOR_PIN);
        sendGetMsg(messageID, val);
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

        tempVals += "\"temp\":\"" + std::to_string(int(fahrenheit)) + "\",\"humidity\":\"" + std::to_string(int(humidity)) + "\",\"heat_index\":\"" + std::to_string(int(hif)) + "\"}";

       
        // // Read temperature as Celsius (the default)
        // float celsius = dht.readTemperature();
        //   // Compute heat index in Celsius (isFahreheit = false)
        //   float hic = dht.computeHeatIndex(celsius, humidity, false);

       
        Serial.println("before sendtempdate");
        sendData(messageID, tempVals.c_str(), 1);
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
          sendData(messageID, gpsVals.c_str(), 1);
        } else {
          sendErrorMsg("Unable to retrieve GPS data", messageID);
        }
        return;
      }
      
      // Get device id
      if (strcmp(operation, "getDeviceId") == 0){
        char msg[MSG_SIZE];
        Serial.println("before sprintf");
        sprintf(msg, "{\"action\":\"msg\",\"type\":\"connection\",\"messageID\":\"%s\",\"device\":\"%" PRIu64 "\"}", messageID, chipId);

        Serial.println("before sentTXT");
        wsClient.sendTXT(msg);
        return;
      }

      sendErrorMsg("unsupported command type", messageID);
      return;
    }
  }
  sendErrorMsg("unsupported message type", messageID);
  return;
}


void onWSEvent(WStype_t type, uint8_t* payload, size_t length){
  Serial.println("in switcher");
  switch(type){
    case WStype_CONNECTED:
      wsClient.sendPing(payload);
      // char msg[MSG_SIZE];
      // sprintf(msg, "{\"action\":\"msg\",\"type\":\"connection\",\"device\":\"%llu\"}", chipId);
      // wsClient.sendTXT(msg);
      Serial.println("WS Connected");
      break;

    case WStype_DISCONNECTED:
      Serial.println("WS Disconnected");
      break;

    case WStype_TEXT:
      Serial.printf("WS Message: %s\n", payload);
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

void setup() {
  Serial.begin(921600);
  Serial2.begin(GPS_BAUDRATE, SERIAL_8N1, RXD2, TXD2);
  //pinMode(25, OUTPUT);

  //wifiMulti.addAP(WIFI_SSID);

  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);

  pinMode(LIGHT_BACK_PIN, OUTPUT);

  while (wifiMulti.run() != WL_CONNECTED) {
    delay(100);
  }

  Serial.println("Connected");

  wsClient.beginSSL(WS_HOST, WS_PORT, WS_URL, "", "wss"); 
  wsClient.onEvent(onWSEvent);
}

void loop() {
  //digitalWrite(25, 1);
  //digitalWrite(25, WiFi.status() == WL_CONNECTED);

  auto val = analogRead(LIGHT_SENSOR_PIN);
  int led = digitalRead(LIGHT_BACK_PIN);
  if (val < 400 && lastVal != 0 && led == 0){
    lastVal = 0;
    char msg[96];
    sprintf(msg, "{\"action\":\"msg\",\"type\":\"dark\",\"device\":\"%" PRIu64 "\"}", chipId);
    wsClient.sendTXT(msg);
  } else if (val > 400 && lastVal != 100000 && led == 1) {
    lastVal = 100000;
    char msg[96];
    sprintf(msg, "{\"action\":\"msg\",\"type\":\"bright\",\"device\":\"%" PRIu64 "\"}", chipId);
    wsClient.sendTXT(msg);
  }


  wsClient.loop();
}