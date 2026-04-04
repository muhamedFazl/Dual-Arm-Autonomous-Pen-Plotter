String incomingString = "";

void setup() {
  // Initialize serial communication at 115200 bits per second
  Serial.begin(115200);
  
  // Print "Grbl" exactly once when the Arduino turns on
  Serial.println("Grbl");
}

void loop() {
  // Check if there is any data coming into the Serial buffer
  if (Serial.available() > 0) {
    
    // Read the incoming text until it sees a newline character
    incomingString = Serial.readStringUntil('\n');
    
    // Clean up the string by removing extra invisible spaces or carriage returns
    incomingString.trim(); 
    
    // Check if the cleaned-up string is exactly "hello"
    if (incomingString == "hello") {
      // Respond back
      Serial.println("hello there!");
    }
  }
}