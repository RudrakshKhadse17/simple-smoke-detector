/*
 * ===================================================================================
 *  PROJECT: Simple Smoke Detector - IoT MQ-2 Smoke and Gas Detection System
 *  ORGANIZATION: ONE PIECE, Dept of ETC, SB Jain, Nagpur
 *  TARGET BOARD: NodeMCU ESP8266 CP2102
 * ===================================================================================
 * 
 *  PIN CONNECTIONS:
 *  ----------------------------------------------------------------------------------
 *  Component           ESP8266 NodeMCU Pin      Notes
 *  ----------------------------------------------------------------------------------
 *  MQ-2 Sensor (AO)    A0 (ADC0)                Analog Output (0 - 1023)
 *  16x2 I2C LCD (SCL)  D1 (GPIO 5)              I2C Clock
 *  16x2 I2C LCD (SDA)  D2 (GPIO 4)              I2C Data
 *  Alert LED (+)       D3 (GPIO 0)              Actuator (Connect via 220-330 ohm resistor)
 *  LED (-)             GND                      Common Ground
 *  LCD VCC             VIN (5V) or 3V3          5V recommended for bright backlight
 *  LCD GND             GND                      Common Ground
 *  MQ-2 VCC            VIN (5V)                 MQ-2 heater requires 5V
 *  MQ-2 GND            GND                      Common Ground
 * ===================================================================================
 * 
 *  REQUIRED ARDUINO LIBRARIES:
 *  1. LiquidCrystal_I2C (by Frank de Brabander)
 *  2. ArduinoJson (v6.x or v7.x by Benoit Blanchon)
 *  3. ESP8266WiFi & ESP8266HTTPClient (built into ESP8266 Core)
 * ===================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define MQ2_PIN   A0        // Analog input from MQ-2
#define LED_PIN   D3        // Alert Actuator LED (GPIO 0)
#define LCD_SCL   D1        // I2C SCL (GPIO 5)
#define LCD_SDA   D2        // I2C SDA (GPIO 4)

// 16x2 I2C LCD display at address 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ==========================================
// 2. NETWORK & SERVER CONFIGURATION
// ==========================================
// WiFi Credentials as specified
const char* ssid     = "ESP8266";
const char* password = "12345678";

// RENDER / SERVER URL:
// Leave blank initially as requested.
// Once deployed on Render, paste your live URL here:
// Example: "https://simple-smoke-detector.onrender.com"
// Or for local testing on same WiFi: "http://192.168.1.100:3000"
String serverUrl = ""; 

// ==========================================
// 3. CONFIGURABLE THRESHOLD VALUES
// ==========================================
// Easy to modify analog threshold levels (0 - 1023)
int warningThreshold = 350;    // WARNING level
int dangerThreshold  = 650;    // DANGER level (triggers LED Actuator)

// ==========================================
// 4. SYSTEM STATE VARIABLES
// ==========================================
int rawSensorValue = 0;
String currentStatus = "SAFE";
String ledServerStatus = "OFF";
String smartDisplayLine1 = "SMOKE ALERT";
String smartDisplayLine2 = "CHECK AREA";

unsigned long lastServerPostTime = 0;
const unsigned long SERVER_POST_INTERVAL = 10000; // Send data every 10 seconds

// Helper function to print centered or clean 16-char lines on LCD
void displayLcd(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  // Pad or trim to 16 characters
  while (line1.length() < 16) line1 += " ";
  lcd.print(line1.substring(0, 16));

  lcd.setCursor(0, 1);
  while (line2.length() < 16) line2 += " ";
  lcd.print(line2.substring(0, 16));
}

// ===================================================================================
// SETUP ROUTINE (LCD Sequence as specified)
// ===================================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- Simple Smoke Detector System Starting ---");

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize I2C communication and LCD
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // ----------------------------------------------------
  // SETUP LCD SEQUENCE (MANDATORY REQUIREMENT):
  // R1: MyProject
  // R2: WELCOME
  // delay(3S)
  // ----------------------------------------------------
  displayLcd("MyProject", "WELCOME");
  Serial.println("LCD: MyProject / WELCOME");
  delay(3000);

  // ----------------------------------------------------
  // R1: CONNECTING TO
  // R2: WiFi.........
  // ----------------------------------------------------
  displayLcd("CONNECTING TO", "WiFi.........");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  Serial.println();

  // ----------------------------------------------------
  // After successful WiFi connection:
  // R1: CONNECTED TO
  // R2: WiFi...SUCCESS
  // ----------------------------------------------------
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi Connected successfully!");
    Serial.print("ESP8266 IP Address: ");
    Serial.println(WiFi.localIP());
    displayLcd("CONNECTED TO", "WiFi...SUCCESS");
  } else {
    Serial.println("WiFi Connection Failed or Timed out. Continuing in Offline Fallback Mode.");
    displayLcd("WiFi FAILED", "OFFLINE MODE");
  }
  delay(2000);
}

// ===================================================================================
// HTTP SERVER COMMUNICATION FUNCTION
// Sends sensor reading to server & receives LCD text + LED control status
// ===================================================================================
void syncWithServer(int sensorVal) {
  // If serverUrl is not set or WiFi is not connected, safely continue local operation
  if (serverUrl == "" || WiFi.status() != WL_CONNECTED) {
    return;
  }

  Serial.println("\n[HTTP] Syncing data with server...");

  WiFiClientSecure clientSecure;
  WiFiClient clientPlain;
  HTTPClient http;

  String endpoint = serverUrl;
  if (!endpoint.endsWith("/")) endpoint += "/";
  endpoint += "api/iot/update";

  bool isHttps = serverUrl.startsWith("https://");
  bool httpBeginSuccess = false;

  if (isHttps) {
    // For cloud hosts like Render, bypass SSL fingerprint checking for stability
    clientSecure.setInsecure();
    clientSecure.setTimeout(5000);
    httpBeginSuccess = http.begin(clientSecure, endpoint);
  } else {
    clientPlain.setTimeout(5000);
    httpBeginSuccess = http.begin(clientPlain, endpoint);
  }

  if (!httpBeginSuccess) {
    Serial.println("[HTTP] Failed to initialize connection to server.");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  // Uses compact JSON structure
  StaticJsonDocument<200> sendDoc;
  sendDoc["sensorValue"] = sensorVal;

  String requestBody;
  serializeJson(sendDoc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
    String response = http.getString();
    Serial.print("[HTTP] Response received: ");
    Serial.println(response);

    // Parse server response
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      // 1. Get LED status from server ("ON" or "OFF")
      if (responseDoc.containsKey("ledStatus")) {
        ledServerStatus = responseDoc["ledStatus"].as<String>();
      }

      // 2. Get Smart Display details from server
      if (responseDoc.containsKey("lcdLine1")) {
        smartDisplayLine1 = responseDoc["lcdLine1"].as<String>();
      }
      if (responseDoc.containsKey("lcdLine2")) {
        smartDisplayLine2 = responseDoc["lcdLine2"].as<String>();
      }

      // 3. Update thresholds if synced from server
      if (responseDoc.containsKey("warningThreshold")) {
        warningThreshold = responseDoc["warningThreshold"].as<int>();
      }
      if (responseDoc.containsKey("dangerThreshold")) {
        dangerThreshold = responseDoc["dangerThreshold"].as<int>();
      }

      Serial.println("[HTTP] Server state updated successfully.");
    } else {
      Serial.print("[JSON] Deserialization failed: ");
      Serial.println(error.f_str());
    }
  } else {
    Serial.printf("[HTTP] POST failed, error code: %d - %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ===================================================================================
// MAIN LOOP ROUTINE (Loop LCD Sequence as specified)
// ===================================================================================
void loop() {
  // ----------------------------------------------------
  // Step 1: Read the MQ-2 sensor from pin A0
  // ----------------------------------------------------
  rawSensorValue = analogRead(MQ2_PIN);
  Serial.printf("\n[MQ-2] Analog Sensor Value: %d\n", rawSensorValue);

  // ----------------------------------------------------
  // MQ-2 Alert Logic: Check thresholds
  // ----------------------------------------------------
  if (rawSensorValue >= dangerThreshold) {
    currentStatus = "DANGER";
  } else if (rawSensorValue >= warningThreshold) {
    currentStatus = "WARNING";
  } else {
    currentStatus = "SAFE";
  }

  // ----------------------------------------------------
  // Actuator LED Control Logic:
  // - If DANGER is detected, LED automatically turns ON
  // - If server requested LED ON (manual override), turn ON
  // - Otherwise turn OFF
  // ----------------------------------------------------
  if (currentStatus == "DANGER" || ledServerStatus == "ON") {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  // ----------------------------------------------------
  // Periodic Server Transmission (Every 10 Seconds)
  // ----------------------------------------------------
  if (millis() - lastServerPostTime >= SERVER_POST_INTERVAL) {
    syncWithServer(rawSensorValue);
    lastServerPostTime = millis();
  }

  // ----------------------------------------------------
  // LOOP LCD SEQUENCE (MANDATORY REQUIREMENT):
  // ----------------------------------------------------

  // 1. Then display:
  // R1: SMOKE/GAS
  // R2: 350 (sensor value)
  // delay(2s)
  displayLcd("SMOKE/GAS", String(rawSensorValue));
  delay(2000);

  // 2. Then display:
  // R1: STATUS
  // R2: SAFE (or WARNING / DANGER)
  // delay(2s)
  displayLcd("STATUS", currentStatus);
  delay(2000);

  // 3. Get the Smart Display details from the server:
  // R1: SMART DISPLAY
  // R2: MyData (e.g. customized text or lcdLine2)
  // delay(2s)
  displayLcd("SMART DISPLAY", smartDisplayLine2 != "" ? smartDisplayLine2 : "MyData");
  delay(2000);

  // 4. Get LED status from the server:
  // R1: LED STATUS
  // R2: ON/OFF
  // delay(2s)
  bool isLedActive = (digitalRead(LED_PIN) == HIGH);
  displayLcd("LED STATUS", isLedActive ? "ON" : "OFF");
  delay(2000);

  // Repeat sequence smoothly
}
