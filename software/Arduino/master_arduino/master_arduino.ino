// A simple array to store G-code commands
// In a real project, you might read this from an SD card.
const char* gcodeCommands[] = {
  "G21",       // Set units to millimeters
  "G90",       // Use absolute positioning
  "G01 X10 F300", // Move to X=10 at a feed rate of 100
  "G01 Y10 F300",      // Move to Y=10
  "G01 X0 Y0 F300",     // Move back to origin
  "M5",
  "M3 s100"
};

// Calculate the number of commands in the array
int commandCount = sizeof(gcodeCommands) / sizeof(gcodeCommands[0]);

void setup() {
  // Start serial communication with the PC for debugging
  Serial.begin(115200); 
  
  // Start serial communication with the Slave Arduino (running GRBL)
  // GRBL's default baud rate is 115200
  Serial1.begin(115200); 

  // Wait for GRBL to initialize and send its welcome message.
  // This delay is important for a clean start.
  delay(2000); 
  
  // Clear any data from GRBL's startup message in the buffer
  while (Serial1.available()) {
    Serial1.read();
  }

  Serial.println("--- Starting G-code Stream ---");

  // Send all commands from the array
  for (int i = 0; i < commandCount; i++) {
    sendCommand(gcodeCommands[i]);
  }

  Serial.println("--- G-code Stream Finished ---");
}

void loop() {
  // Nothing to do here, all work is done in setup()
}

// Function to send a command and wait for GRBL's "ok" response
void sendCommand(const char* command) {
  Serial.print("Sending: ");
  Serial.println(command);
  // Serial.println("g0 x10 y10");

  // Send the command to the slave Arduino
  Serial1.println(command);
  // Serial1.println("g0 x10 y10");

  // Wait for the "ok" response from GRBL
  while (true) {
    if (Serial1.available() > 0) {
      String response = Serial1.readStringUntil('\n');
      response.trim(); // Remove any whitespace
      
      Serial.print("Received: ");
      Serial.println(response);

      if (response.startsWith("ok")) {
        break; // Exit the loop and send the next command
      }
      
      if (response.startsWith("error")) {
        Serial.println("GRBL reported an error. Halting.");
        while(true); // Stop execution on error
      }
    }
  }
}