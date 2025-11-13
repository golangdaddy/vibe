# RFID Reader Integration Guide

This petrol pump application includes **full RFID reader support** for contactless payment using RFID cards.

## Current Status

✅ **RFID fully implemented and ready to use!**
✅ Real MFRC522 hardware support via periph.io
✅ Automatic hardware detection with mock fallback
✅ Works on Pi with hardware AND on dev machines for testing
✅ No code changes needed between environments

## Automatic Hardware Detection

The application **automatically detects** whether it's running with real RFID hardware or not:

### On Raspberry Pi with MFRC522 connected:
- Detects and initializes real hardware
- Uses actual RFID card reads
- Ready for production use

### On dev machine or Pi without RFID hardware:
- Automatically falls back to mock mode (in debug mode)
- Press **P** key to simulate card tap
- Perfect for testing without hardware

**You don't need to change ANY code** - it just works!

## How It Works

1. User pumps fuel
2. User taps "PAY" button  
3. Application shows "Tap the contactless RFID reader to pay" screen
4. When RFID card is detected (real or simulated), payment is processed
5. Success screen shows card ID for 3 seconds
6. **Pump automatically resets to 0.00**
7. **New random fuel price generated (£1.40-£1.60)**
8. Ready for next customer

## RFID Reader Interface

The application uses an interface-based approach for maximum flexibility:

```go
type RFIDReader interface {
    IsCardPresent() (bool, error)
    ReadCardID() (string, error)
}
```

## Implementation Details

The MFRC522 support is **already implemented** using periph.io. The code:

- Uses `periph.io/x/devices/v3/mfrc522` for hardware communication
- Implements proper SPI communication on Raspberry Pi
- Uses GPIO25 (Pin 22) for RST pin
- Reads card UID and formats as hex string (e.g., "A3:B2:C1:D0")
- Caches last read for 2 seconds to prevent duplicate reads
- Automatically detects hardware availability

### Key Implementation Classes:

**`MFRC522RFIDReader`** - Real hardware implementation
- Initializes SPI communication
- Configures antenna gain for optimal detection
- Reads 4-7 byte UIDs from cards
- Formats output as colon-separated hex

**`MockRFIDReader`** - Test/development implementation  
- Simulates card presence
- Generates random card IDs
- Responds to 'P' key in debug mode
- Auto-clears after 1 second

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

### On Raspberry Pi with RFID hardware:
```
✓ GPIO initialized - Running in normal mode
  Press and hold the button to pump

Initializing RFID reader...
✓ MFRC522 RFID reader initialized successfully
  Hardware ready - tap your card on the reader to pay

[User pumps fuel by holding button...]

✓ RFID card detected! Processing payment...
  Card ID: A3:B2:C1:D0
  Amount: £12.45
  Fuel: 8.30 L @ £1.50/L

[Success screen displays for 3 seconds]
[Pump resets to 0.00 with new price: £1.47/L]
```

### On dev machine (debug mode):
```
╔════════════════════════════════════╗
║   🔧 DEBUG MODE ACTIVATED 🔧      ║
╚════════════════════════════════════╝

Initializing RFID reader...
ℹ Real RFID hardware not detected: failed to open SPI
✓ Mock RFID reader initialized (test mode)
  Press P on payment screen to simulate card tap

[User pumps fuel by holding SPACE...]

🔧 DEBUG: Simulating RFID card tap...
✓ RFID card detected! Processing payment...
  Card ID: 7F:A2:3B:C9
  Amount: £12.45
  Fuel: 8.30 L @ £1.50/L

[Success screen displays, pump resets automatically]
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

