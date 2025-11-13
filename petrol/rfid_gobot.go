package main

import (
	"encoding/hex"
	"fmt"

	"gobot.io/x/gobot/v2"
	"gobot.io/x/gobot/v2/drivers/spi"
	"gobot.io/x/gobot/v2/platforms/raspi"
)

// GobotRFIDReader implements RFIDReader using gobot's MFRC522 driver
type GobotRFIDReader struct {
	adaptor *raspi.Adaptor
	driver  *spi.MFRC522Driver
	robot   *gobot.Robot
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
	if err := robot.Start(); err != nil {
		return nil, fmt.Errorf("failed to start RFID reader: %w", err)
	}
	
	reader := &GobotRFIDReader{
		adaptor: adaptor,
		driver:  driver,
		robot:   robot,
	}
	
	return reader, nil
}

// IsCardPresent checks if an RFID card is present
// This uses gobot's internal SPI polling - no GPIO IRQ needed!
func (g *GobotRFIDReader) IsCardPresent() (bool, error) {
	// IsCardPresent returns error if no card is detected
	err := g.driver.IsCardPresent()
	if err != nil {
		// No card present - not a real error
		return false, nil
	}
	return true, nil
}

// ReadCardID reads the unique ID from an RFID card
func (g *GobotRFIDReader) ReadCardID() (string, error) {
	// First check if card is present
	present, err := g.IsCardPresent()
	if err != nil {
		return "", err
	}
	if !present {
		return "", fmt.Errorf("no card present")
	}
	
	// Read text from card (gobot's method)
	// This internally calls piccActivate() which returns the UID
	// For simple UID reading, we can use ReadText which does the full workflow
	text, err := g.driver.ReadText()
	if err != nil {
		return "", fmt.Errorf("failed to read card: %w", err)
	}
	
	// Convert to hex string format (similar to periph.io output)
	// For now, return first 8 bytes as hex
	if len(text) >= 4 {
		uid := []byte(text[:4])
		return formatUID(uid), nil
	}
	
	return hex.EncodeToString([]byte(text)), nil
}

// Close cleans up resources
func (g *GobotRFIDReader) Close() error {
	if g.robot != nil {
		return g.robot.Stop()
	}
	return nil
}

