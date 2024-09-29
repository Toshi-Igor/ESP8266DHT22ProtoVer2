#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>

// Replace with your network credentials
const char* ssid = "GlobeAtHome_f6ba8";  // Your WiFi SSID
const char* password = "StS3fcy2";   // Your WiFi Password

#define DHTPIN 4      // Digital pin connected to the DHT sensor
#define DHTTYPE DHT22 // DHT 22 (AM2302)

DHT dht(DHTPIN, DHTTYPE);

float t = 0.0;  // Temperature
float h = 0.0;  // Humidity
float n = 0.0;  // Heat Index

unsigned long previousMillis = 0;
const long interval = 5000; // Update every 5 seconds

WiFiClient client;  // Create a WiFiClient object

void sendDataToServer(float temperature, float humidity, float heatIndex) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Use the updated API with WiFiClient and URL
    http.begin(client, "http://192.168.254.109:3000/log_dht");  // Server's IP address and port

    // Prepare POST data
    String postData = "temperature=" + String(temperature) + "&humidity=" + String(humidity) + "&heat_index=" + String(heatIndex);

    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    int httpResponseCode = http.POST(postData);  // Send POST request

    if (httpResponseCode > 0) {
      String response = http.getString();  // Get the response
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }

    http.end();  // Close connection
  } else {
    Serial.println("Error in WiFi connection");
  }
}

void setup() {
  // Start serial communication for debugging
  Serial.begin(115200);
  
  // Initialize the DHT sensor
  dht.begin();
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("Connected to WiFi");
  Serial.println(WiFi.localIP());  // Print the IP address
}

void loop() {
  unsigned long currentMillis = millis();

  // Update sensor values every 5 seconds
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Read temperature and humidity from DHT sensor
    float newT = dht.readTemperature();
    float newH = dht.readHumidity();
    float newHI = dht.computeHeatIndex(newT, newH, false);  // Calculate heat index

    // Check if the readings are valid
    if (!isnan(newT) && !isnan(newH)) {
      t = newT;
      h = newH;
      n = newHI;

      // Send data to the server
      sendDataToServer(t, h, n);
      
      // Print sensor readings for debugging
      Serial.print("Temperature: ");
      Serial.println(t);
      Serial.print("Humidity: ");
      Serial.println(h);
      Serial.print("Heat Index: ");
      Serial.println(n);
    } else {
      Serial.println("Failed to read from DHT sensor!");
    }
  }
}
