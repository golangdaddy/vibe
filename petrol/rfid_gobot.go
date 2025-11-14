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
	
	// Start the robot (initializes hardware) with timeout and panic recovery
	// This will call driver.initialize() via afterStart callback
	// The robot.Start() will:
	// 1. Start connections (adaptor)
	// 2. Start devices (driver) - which calls driver.Start()
	// 3. Driver.Start() calls GetSpiConnection() which needs the adaptor to be connected
	// 
	// Use timeout + panic recovery - gobot can panic or hang if SPI is not available
	startDone := make(chan error, 1)
	panicOccurred := make(chan bool, 1)
	
	go func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("⚠ PANIC in gobot robot.Start(): %v\n", r)
				panicOccurred <- true
			}
		}()
		startDone <- robot.Start()
	}()
	
	select {
	case err := <-startDone:
		if err != nil {
			return nil, fmt.Errorf("failed to start RFID reader: %w", err)
		}
	case <-panicOccurred:
		// Panic occurred - gobot's system layer not initialized properly
		// This happens when gobot can't access SPI or system resources
		go func() {
			robot.Stop()
		}()
		return nil, fmt.Errorf("panic in gobot initialization (system layer not available - will try periph.io)")
	case <-time.After(5 * time.Second):
		// Timeout - robot.Start() is hanging, likely SPI connection issue
		// This happens when:
		// - SPI is not enabled (run: sudo raspi-config)
		// - SPI permissions issue (run: sudo usermod -aG spi $USER)
		// - SPI device not available (/dev/spidev0.0 missing)
		// - Hardware not connected
		// Try to stop what we can (may not work if it's stuck)
		go func() {
			robot.Stop()
		}()
		return nil, fmt.Errorf("timeout: gobot robot.Start() hung (SPI not available/permissions issue - will try periph.io)")
	}
	
	// Give the driver a moment to fully initialize
	// The afterStart callback sets up the connection wrapper
	time.Sleep(300 * time.Millisecond)
	
	// Verify the driver is actually working by trying a simple operation
	// This will catch any initialization issues early
	// Use panic recovery to catch SPI connection issues
	initOK := true
	func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("⚠ Gobot SPI connection panic during init: %v\n", r)
				initOK = false
			}
		}()
		// Try to check for card - this will trigger SPI connection setup
		_ = driver.IsCardPresent()
	}()
	
	if !initOK {
		robot.Stop()
		return nil, fmt.Errorf("SPI connection failed - gobot adaptor not properly initialized")
	}
	
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
	// Safety check - ensure driver is initialized
	if g.driver == nil {
		return false, fmt.Errorf("driver not initialized")
	}
	
	// IsCardPresent returns error if no card is detected
	err := g.driver.IsCardPresent()
	if err != nil {
		// No card present - not a real error
		return false, nil
	}
	
	// Card detected - try to read UID to confirm
	// But don't fail if UID read fails - card might have moved
	uid, err := g.readUID()
	if err != nil {
		// Card might have moved away or read failed
		// Return false but don't treat as error
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
	// Safety check
	if g.driver == nil {
		return nil, fmt.Errorf("driver is nil")
	}
	if g.driver.MFRC522Common == nil {
		return nil, fmt.Errorf("MFRC522Common is nil - driver not initialized")
	}
	
	// Use reflection to access the unexported piccActivate method
	// The MFRC522Common is embedded as a pointer in MFRC522Driver
	// Get the method directly from the embedded pointer
	method := reflect.ValueOf(g.driver.MFRC522Common).MethodByName("piccActivate")
	if !method.IsValid() {
		return nil, fmt.Errorf("piccActivate method not found - driver may not be initialized")
	}
	
	// Call piccActivate() which returns ([]byte, error)
	// Use defer/recover to catch any panics from SPI access
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("PANIC in readUID: %v\n", r)
		}
	}()
	
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

