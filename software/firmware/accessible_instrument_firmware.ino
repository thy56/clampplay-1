#include <Arduino.h>

// Fixed protocol: magic, payload length, version, channel, action, actuator,
// velocity, timestamp_ms, duration_ms, checksum.
static const uint8_t MAGIC = 0xAA;
static const uint8_t VERSION = 1;
static const uint8_t ACTION_NOTE_ON = 1;
static const uint8_t ACTION_NOTE_OFF = 2;
static const uint8_t ACTION_HIT = 4;
static const uint8_t ACTION_STOP = 5;
static const uint32_t LINK_TIMEOUT_MS = 1000;

struct Event {
  uint8_t channel;
  uint8_t action;
  uint8_t actuator;
  uint8_t velocity;
  uint32_t timestampMs;
  uint16_t durationMs;
};

static uint8_t actuatorPins[] = {5, 6, 9, 10, 11, 12};
static uint32_t lastFrameMs = 0;

uint8_t checksum(const uint8_t *data, size_t length) {
  uint16_t total = 0;
  for (size_t i = 0; i < length; ++i) {
    total += data[i];
  }
  return static_cast<uint8_t>(total & 0xFF);
}

void allStop() {
  for (size_t i = 0; i < sizeof(actuatorPins); ++i) {
    digitalWrite(actuatorPins[i], LOW);
  }
}

bool readFrame(Event &event) {
  if (Serial.available() < 2) {
    return false;
  }
  if (Serial.read() != MAGIC) {
    return false;
  }
  uint8_t length = static_cast<uint8_t>(Serial.read());
  if (length != 12 || Serial.available() < length) {
    return false;
  }
  uint8_t body[11];
  for (size_t i = 0; i < sizeof(body); ++i) {
    body[i] = static_cast<uint8_t>(Serial.read());
  }
  uint8_t receivedChecksum = static_cast<uint8_t>(Serial.read());
  if (checksum(body, sizeof(body)) != receivedChecksum || body[0] != VERSION) {
    return false;
  }
  event.channel = body[1];
  event.action = body[2];
  event.actuator = body[3];
  event.velocity = body[4];
  event.timestampMs = static_cast<uint32_t>(body[5]) |
                      (static_cast<uint32_t>(body[6]) << 8) |
                      (static_cast<uint32_t>(body[7]) << 16) |
                      (static_cast<uint32_t>(body[8]) << 24);
  event.durationMs = static_cast<uint16_t>(body[9]) |
                     (static_cast<uint16_t>(body[10]) << 8);
  return true;
}

void execute(const Event &event) {
  lastFrameMs = millis();
  if (event.action == ACTION_STOP) {
    allStop();
    return;
  }
  if (event.actuator >= sizeof(actuatorPins)) {
    return;
  }
  uint8_t pin = actuatorPins[event.actuator];
  if (event.action == ACTION_NOTE_ON || event.action == ACTION_HIT) {
    analogWrite(pin, event.velocity);
  } else if (event.action == ACTION_NOTE_OFF) {
    digitalWrite(pin, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < sizeof(actuatorPins); ++i) {
    pinMode(actuatorPins[i], OUTPUT);
  }
  allStop();
  lastFrameMs = millis();
}

void loop() {
  Event event;
  if (readFrame(event)) {
    execute(event);
  }
  if (millis() - lastFrameMs > LINK_TIMEOUT_MS) {
    allStop();
  }
}
