# RFID Reader Integration Guide

This petrol pump application includes infrastructure for RFID reader support, allowing contactless payment using RFID cards.

## Current Status

✅ RFID infrastructure implemented
✅ Payment flow with RFID detection ready
⚠️ MFRC522 driver needs to be implemented

## How It Works

1. User pumps fuel
2. User taps "PAY" button
3. Application shows "Tap the contactless RFID reader to pay" screen
4. When RFID card is detected, payment is processed automatically
5. Success screen shows for 3 seconds
6. Pump resets with new random fuel price

## RFID Reader Interface

The application uses an interface-based approach for maximum flexibility:

```go
type RFIDReader interface {
    IsCardPresent() (bool, error)
    ReadCardID() (string, error)
}
```

## Implementing MFRC522 Support

### Option 1: Using the provided example code

See `rfid_mfrc522.go` for a template implementation. You'll need to:

1. Install gobot dependencies:
```bash
go get gobot.io/x/gobot
go get gobot.io/x/gobot/drivers/spi
go get gobot.io/x/gobot/platforms/raspi
```

2. Implement the actual MFRC522 communication protocol
3. Uncomment the code in `rfid_mfrc522.go`
4. Update `initRFIDReader()` in `main.go` to use your implementation

### Option 2: Using your existing code

Your existing RFID code can be adapted to implement the `RFIDReader` interface:

```go
type MyRFIDReader struct {
    reader *mfrc522.MFRC522Common
    // ... other fields
}

func (m *MyRFIDReader) IsCardPresent() (bool, error) {
    return m.reader.IsCardPresent()
}

func (m *MyRFIDReader) ReadCardID() (string, error) {
    text, err := m.reader.ReadText()
    if err != nil {
        return "", err
    }
    return text, nil
}
```

Then in `main.go`, replace the `initRFIDReader()` function:

```go
func initRFIDReader() RFIDReader {
    fmt.Println("\nInitializing RFID reader...")
    
    // Create Raspberry Pi adaptor
    r := raspi.NewAdaptor()
    if err := r.Connect(); err != nil {
        fmt.Printf("⚠ Could not connect: %v\n", err)
        return nil
    }

    // Create SPI connection (bus 0, chip 0 for CE0)
    conn := spi.NewSPIConnection(r, 0, 0)

    // Create MFRC522 driver
    reader := mfrc522.NewMFRC522Common()

    // Initialize the reader
    if err := reader.Initialize(conn); err != nil {
        fmt.Printf("⚠ Could not initialize MFRC522: %v\n", err)
        return nil
    }

    // Check version
    version, err := reader.GetVersion()
    if err != nil {
        fmt.Printf("⚠ Could not get version: %v\n", err)
        return nil
    }

    fmt.Printf("✓ MFRC522 initialized (Version: 0x%x)\n", version)
    
    // Return your implementation
    return &MyRFIDReader{reader: reader}
}
```

## Hardware Setup

### MFRC522 Wiring (SPI)

Connect your MFRC522 module to the Raspberry Pi:

| MFRC522 Pin | Raspberry Pi Pin | BCM GPIO |
|-------------|------------------|----------|
| SDA (SS)    | Pin 24           | GPIO 8   |
| SCK         | Pin 23           | GPIO 11  |
| MOSI        | Pin 19           | GPIO 10  |
| MISO        | Pin 21           | GPIO 9   |
| IRQ         | Not connected    | -        |
| GND         | Pin 6            | GND      |
| RST         | Pin 22           | GPIO 25  |
| 3.3V        | Pin 1            | 3.3V     |

### Enable SPI

```bash
sudo raspi-config
# Navigate to: Interfacing Options > SPI > Enable
```

## Testing

### Manual Testing Mode

The application works without an RFID reader - it will print a message and continue in manual mode. You can still access the payment screen, but you'll need to use the "Cancel" button to return.

### With RFID Reader

Once implemented, the application will:
1. Automatically detect cards every 500ms when on the payment screen
2. Process payment immediately when a card is detected
3. Show the card ID on the success screen
4. Log transaction details to console

## Features

- **Random Pricing**: Each reset generates a new price between $1.40-$1.60
- **Leading Zero Display**: Dark grey '8's for ghost digits
- **Payment Success Screen**: Shows for 3 seconds with card info
- **Transaction Logging**: Console output includes card ID, amount, and fuel details
- **Graceful Fallback**: Works without RFID reader in manual mode

## Troubleshooting

### RFID Reader Not Detected
- Check SPI is enabled: `ls /dev/spi*` should show `/dev/spidev0.0`
- Verify wiring connections
- Check MFRC522 version register reads 0x91 or 0x92

### Card Not Detected
- Ensure card is within 4cm of reader antenna
- Check card frequency is 13.56MHz (MFRC522 compatible)
- Verify antenna connections on MFRC522 module

### Multiple Readings
- The code includes a 2-second delay after successful read
- Adjust the delay in `startRFIDMonitoring()` if needed

## Example Output

```
✓ GPIO initialized - Running in normal mode
  Press and hold the button to pump

Initializing RFID reader...
✓ MFRC522 RFID reader initialized (Version: 0x92)

[User pumps fuel...]

✓ RFID card detected! Processing payment...
  Card ID: A3:B2:C1:D0
  Amount: £12.45
  Fuel: 8.30 L @ £1.50/L

[Success screen displays, then resets with new price]
```

## Security Considerations

This is a demonstration application. For production use, you should:
- Validate card IDs against a database
- Implement proper authentication
- Add transaction logging to file/database
- Encrypt sensitive card data
- Add fraud detection
- Implement transaction reversal capability

## Support

For RFID-specific issues, refer to:
- MFRC522 datasheet
- Your RFID library documentation
- Raspberry Pi SPI documentation

