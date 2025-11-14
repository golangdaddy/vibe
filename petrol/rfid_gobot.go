package main

import (
	"fmt"
	"reflect"
	"time"

	"gobot.io/x/gobot/v2"
	"gobot.io/x/gobot/v2/drivers/spi"
	"gobot.io/x/gobot/v2/platforms/raspi"
)

// GobotRFIDReader implements RFIDReader using gobot's MFRC522 driver
type GobotRFIDReader struct {
	adaptor    *raspi.Adaptor
	driver     *spi.MFRC522Driver
	robot      *gobot.Robot
	lastCardID string
	lastSeen   time.Time
}

// NewGobotRFIDReader creates a new RFID reader using gobot
func NewGobotRFIDReader() (*GobotRFIDReader, error) {
	// Create Raspberry Pi adaptor
	adaptor := raspi.NewAdaptor()
	
	// Create MFRC522 driver with SPI
	// Default SPI bus 0, chip select 0
	driver := spi.NewMFRC522Driver(adaptor)
	
	// Create robot to manage lifecycle
	robot := gobot.NewRobot("rfid",
		[]gobot.Connection{adaptor},
		[]gobot.Device{driver},
	)
	
	// Start the robot (initializes hardware)
	// This will call driver.initialize() via afterStart callback
	if err := robot.Start(); err != nil {
		return nil, fmt.Errorf("failed to start RFID reader: %w", err)
	}
	
	// Give the driver a moment to fully initialize
	// The afterStart callback sets up the connection wrapper
	time.Sleep(200 * time.Millisecond)
	
	reader := &GobotRFIDReader{
		adaptor: adaptor,
		driver:  driver,
		robot:   robot,
	}
	
	return reader, nil
}

// IsCardPresent checks if an RFID card is present
// Uses gobot's SPI polling of interrupt registers (no GPIO IRQ needed)
func (g *GobotRFIDReader) IsCardPresent() (bool, error) {
	// IsCardPresent returns error if no card is detected
	err := g.driver.IsCardPresent()
	if err != nil {
		// No card present - not a real error
		return false, nil
	}
	
	// Card detected - try to read UID to confirm
	uid, err := g.readUID()
	if err != nil {
		// Card might have moved away
		return false, nil
	}
	
	if len(uid) > 0 {
		g.lastCardID = formatUID(uid)
		g.lastSeen = time.Now()
		return true, nil
	}
	
	return false, nil
}

// ReadCardID reads the unique ID from an RFID card
func (g *GobotRFIDReader) ReadCardID() (string, error) {
	// Return cached UID if recent
	if time.Since(g.lastSeen) < 2*time.Second && g.lastCardID != "" {
		return g.lastCardID, nil
	}
	
	// Read UID directly
	uid, err := g.readUID()
	if err != nil {
		return "", fmt.Errorf("failed to read card: %w", err)
	}
	
	if len(uid) == 0 {
		return "", fmt.Errorf("no card present")
	}
	
	g.lastCardID = formatUID(uid)
	g.lastSeen = time.Now()
	return g.lastCardID, nil
}

// readUID uses reflection to call the unexported piccActivate() method
// This is necessary because gobot doesn't expose a direct UID reading method
// NOTE: gobot uses SPI polling of interrupt registers (no GPIO IRQ pin needed)
func (g *GobotRFIDReader) readUID() ([]byte, error) {
	// Use reflection to access the unexported piccActivate method
	// The MFRC522Common is embedded as a pointer in MFRC522Driver
	driverValue := reflect.ValueOf(g.driver).Elem()
	commonField := driverValue.FieldByName("MFRC522Common")
	if !commonField.IsValid() {
		return nil, fmt.Errorf("could not access MFRC522Common field")
	}
	
	// MFRC522Common is a pointer, so we need to get the value it points to
	var commonValue reflect.Value
	if commonField.Kind() == reflect.Ptr {
		if commonField.IsNil() {
			return nil, fmt.Errorf("MFRC522Common is nil - driver not initialized")
		}
		commonValue = commonField.Elem()
	} else {
		commonValue = commonField
	}
	
	// Get the piccActivate method (it's on the pointer receiver)
	// Try pointer method first
	method := reflect.ValueOf(g.driver.MFRC522Common).MethodByName("piccActivate")
	if !method.IsValid() {
		// Try on the value
		method = commonValue.MethodByName("piccActivate")
		if !method.IsValid() {
			return nil, fmt.Errorf("piccActivate method not found")
		}
	}
	
	// Call piccActivate() which returns ([]byte, error)
	results := method.Call(nil)
	if len(results) != 2 {
		return nil, fmt.Errorf("unexpected return values from piccActivate: got %d, expected 2", len(results))
	}
	
	// Check error first
	errValue := results[1]
	if !errValue.IsNil() {
		err := errValue.Interface().(error)
		return nil, err
	}
	
	// Extract UID bytes
	uidValue := results[0]
	if uidValue.IsNil() {
		return nil, fmt.Errorf("no UID returned (nil)")
	}
	
	uid := uidValue.Interface().([]byte)
	return uid, nil
}

// Close cleans up resources
func (g *GobotRFIDReader) Close() error {
	if g.robot != nil {
		return g.robot.Stop()
	}
	return nil
}

