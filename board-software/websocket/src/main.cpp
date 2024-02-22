#include <Arduino.h>
#include <WifiMulti.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <Adafruit_Sensor.h>
#include "DHT.h"
#include <string>
#define DHTTYPE DHT11
#define defaultTempPin 14
DHT dht(defaultTempPin, DHTTYPE);

#define GPS_BAUDRATE 9600
#define RXD2 16
#define TXD2 17

#define WIFI_SSID "ufdevice"
#define WIFI_PASSWORD "gogators"

#define WS_HOST "42lnjvrypg.execute-api.us-east-1.amazonaws.com" 
#define WS_PORT 443
#define WS_URL "/dev"

#define JSON_DOC_SIZE 2048
#define MSG_SIZE 256

WiFiMulti wifiMulti;
WebSocketsClient wsClient;

TinyGPSPlus gps;
uint64_t chipId = ESP.getEfuseMac();

char* uint64ToString(uint64_t value, char* buffer, int base) {
  static char numBuffer[21]; // Buffer for the maximum 64-bit value in base 2
  itoa(value, numBuffer, base);
  return numBuffer;
}

void sendErrorMsg(const char* error){
  char msg[MSG_SIZE];

  sprintf(msg, "{\"action\":\"msg\",\"type\":\"error\",\"device\":\"%llu\",\"body\":\"%s\"}", chipId, error);
  wsClient.sendTXT(msg);
}

void sendOkMsg(int pinNum){
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"status\",\"device\":\"%llu\",\"pin\":\"%d\",\"body\":\"ok\"}", chipId, pinNum);
  wsClient.sendTXT(msg);
}

void sendGPSData(float lat, float lon) {
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%llu\",\"body\":{\"lat\":\"%.6f\",\"long\":\"%6f\"}}", chipId, lat, lon);
  wsClient.sendTXT(msg);
}

void sendTempData(float temp, float humidity, float heatIndex) {
  char msg[MSG_SIZE];
  sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%llu\",\"body\":{\"temp\":\"%.6f\",\"humidity\":\"%6f\",\"heat index\":\"%6f\"}}", chipId, temp, humidity, heatIndex);
  wsClient.sendTXT(msg);
}

void handleMsg(uint8_t* payload){
  StaticJsonDocument<JSON_DOC_SIZE> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    sendErrorMsg(error.c_str());
    return;
  }

  // Log the received message
  Serial.print("Received message: ");
  serializeJson(doc, Serial);
  Serial.println(" : end of message");

  if (doc.containsKey("type")){  
    if (!doc["type"].is<const char*>()) {
      sendErrorMsg("invalid message type format");
      return;
    }

    if(strcmp(doc["type"], "cmd") == 0){
      if (!doc["body"].is<JsonObject>()){
        sendErrorMsg("invalid command body");
        return;
      }

      
      if(strcmp(doc["body"]["type"], "pinMode") == 0){
        if (!doc["body"]["pin"]){
          Serial.println("no pin provided");
          sendErrorMsg("No pin provided");
          return;
        } 
        if(strcmp(doc["body"]["type"], "OUTPUT") == 0 || strcmp(doc["body"]["type"], "output") == 0 || strcmp(doc["body"]["type"], "INPUT") == 0  || strcmp(doc["body"]["type"], "input") == 0 ){
          pinMode(std::atoi(doc["body"]["pin"]), doc["body"]["mode"]);
          sendOkMsg(std::atoi(doc["body"]["pin"]));
        } else {
          sendErrorMsg("incorrect mode value");
        }
        return;
      }

      if(strcmp(doc["body"]["type"], "digitalWrite") == 0){
        if (!doc["body"]["pin"]){
          sendErrorMsg("No pin provided");
          return;
        } 
        digitalWrite(std::atoi(doc["body"]["pin"]), doc["body"]["value"]);
        sendOkMsg(std::atoi(doc["body"]["pin"]));
        return;
      }

      if(strcmp(doc["body"]["type"], "digitalRead") == 0){
        if (!doc["body"]["pin"]){
          sendErrorMsg("No pin provided");
          return;
        } 
        auto value = digitalRead(std::atoi(doc["body"]["pin"]));

        char msg[MSG_SIZE];
        sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%llu\",\"pin\":\"%d\",\"body\":\"%d\"}", chipId, std::atoi(doc["body"]["pin"]), value);
        wsClient.sendTXT(msg);
        return;
      }

      if(strcmp(doc["body"]["type"], "analogRead") == 0){
        if (!doc["body"]["pin"]){
          sendErrorMsg("No pin provided");
          return;
        } 
        auto value = analogRead(std::atoi(doc["body"]["pin"]));

        char msg[MSG_SIZE];
        sprintf(msg, "{\"action\":\"msg\",\"type\":\"output\",\"device\":\"%llu\",\"pin\":\"%d\",\"body\":\"%d\"}", chipId, std::atoi(doc["body"]["pin"]), value);
        wsClient.sendTXT(msg);

        return;
      }

      // Get GPS
      if(strcmp(doc["body"]["type"], "getGPS") == 0){

        Serial.println("in getGps");

        if (Serial2.available()){

          Serial.println("before encode");

          gps.encode(Serial2.read());

          if (gps.location.isValid()){
            Serial.println("loc valid");
            Serial.print("Latitude= "); 
            Serial.print(gps.location.lat(), 6);
            Serial.print(" Longitude= "); 
            Serial.println(gps.location.lng(), 6);

            Serial.println("sending data");
            sendGPSData(gps.location.lat(), gps.location.lng());
          }
          if (gps.altitude.isValid()){
            Serial.print(F("- altitude: "));
            Serial.println(gps.altitude.meters());
          }
                  
          if (gps.speed.isValid()) {
            Serial.print(F("- speed: "));
            Serial.print(gps.speed.kmph());
            Serial.println(F(" km/h"));
          }

          // if (gps.date.isValid() && gps.time.isValid()) {
          //   setTime(gps.time.hour(), gps.time.minute(), gps.time.second(), gps.date.day(), gps.date.month(), gps.date.year());
          //   adjustTime(time_offset);
          //   Serial.println(timeStatus());
          //   Serial.println(now());
          // } 
          
        } else {
          Serial.println("unable to retrieve gps data");
          sendErrorMsg("Unable to retrieve GPS data");
        }
          return;
        }

        if(strcmp(doc["body"]["type"], "getTemp") == 0){
          if (doc["body"]["pin"] && std::atoi(doc["body"]["pin"]) != defaultTempPin){
            DHT dht(defaultTempPin, DHTTYPE);
          }
          
          float humidity = dht.readHumidity();

          // // Read temperature as Celsius (the default)
          // float celsius = dht.readTemperature();

          // Read temperature as Fahrenheit (isFahrenheit = true)
          float fahrenheit = dht.readTemperature(true);
          Serial.print("humidity: ");
          Serial.println(humidity);
          Serial.print("temp: ");
          Serial.println(fahrenheit);

          if (isnan(fahrenheit) && isnan(humidity)){
            sendErrorMsg("Unable to retrieve temperature data");
            return;
          } 
          float hif = dht.computeHeatIndex(fahrenheit, humidity);
          //   // Compute heat index in Celsius (isFahreheit = false)
          //   float hic = dht.computeHeatIndex(celsius, humidity, false);

          sendTempData(fahrenheit,  humidity,  hif);
          return;
        }
        
        // Get device id
        if(strcmp(doc["body"]["type"], "getDeviceId") == 0){
          char msg[MSG_SIZE];
          sprintf(msg, "{\"action\":\"msg\",\"type\":\"connection\",\"device\":\"%llu\"}", chipId);
          wsClient.sendTXT(msg);
          return;
        }


      sendErrorMsg("unsupported command type");
      return;
    }
  }

  sendErrorMsg("unsupported message type");
    return;
}

void onWSEvent(WStype_t type, uint8_t* payload, size_t length){
  switch(type){
    case WStype_CONNECTED:
      char msg[MSG_SIZE];
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
  }
}

void setup() {
  Serial.begin(921600);
  Serial2.begin(GPS_BAUDRATE, SERIAL_8N1, RXD2, TXD2);
  //pinMode(25, OUTPUT);

  //wifiMulti.addAP(WIFI_SSID);

  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);

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
  wsClient.loop();
}
