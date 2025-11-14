# MFRC522 RFID Reader Wiring Guide

## For gobot Library (Current Implementation)

**gobot uses SPI polling - NO IRQ PIN NEEDED!**

### Required Connections (6 wires):

| MFRC522 Pin | Raspberry Pi Pin | Physical Pin # | BCM GPIO | Notes |
|-------------|------------------|----------------|----------|-------|
| **SDA (SS/CS)** | **CE0** | **Pin 24** | **GPIO 8** | Chip Select (SPI0_CE0) |
| **SCK** | **SCLK** | **Pin 23** | **GPIO 11** | SPI Clock |
| **MOSI** | **MOSI** | **Pin 19** | **GPIO 10** | Master Out, Slave In |
| **MISO** | **MISO** | **Pin 21** | **GPIO 9** | Master In, Slave Out |
| **RST** | **Any GPIO** | **Pin 22** | **GPIO 25** | Reset (or GPIO22/Pin 15) |
| **IRQ** | **NOT CONNECTED** | **-** | **-** | **Not needed for gobot!** |
| **GND** | **GND** | **Pin 6** | **GND** | Ground |
| **3.3V** | **3.3V** | **Pin 1** | **3.3V** | Power (NOT 5V!) |

### Important Notes:

1. **SPI Bus**: gobot uses **SPI0** (the default SPI bus)
2. **Chip Select**: Uses **CE0** (Chip Enable 0) = GPIO8 = Physical Pin 24
3. **RST Pin**: Can be GPIO22 (Pin 15) or GPIO25 (Pin 22) - gobot doesn't specify, but periph.io tries both
4. **IRQ Pin**: **NOT NEEDED** - gobot polls registers via SPI instead
5. **Power**: **MUST be 3.3V** - 5V will damage the MFRC522!

### Physical Pin Layout (Raspberry Pi):

```
    3.3V  [1]  [2]  5V
   GPIO2  [3]  [4]  5V
   GPIO3  [5]  [6]  GND  ← MFRC522 GND
   GPIO4  [7]  [8]  GPIO14
     GND  [9] [10]  GPIO15
  GPIO17 [11] [12]  GPIO18
  GPIO27 [13] [14]  GND
  GPIO22 [15] [16]  GPIO23
    3.3V [17] [18]  GPIO24
  GPIO10 [19] [20]  GND  ← MFRC522 MOSI
   GPIO9 [21] [22]  GPIO25  ← MFRC522 RST (or use GPIO22/Pin 15)
  GPIO11 [23] [24]  GPIO8   ← MFRC522 SDA/SS/CS
     GND [25] [26]  GPIO7
```

### Visual Wiring:

```
MFRC522 Module          Raspberry Pi
─────────────────       ──────────────
SDA (SS/CS)      ──────→ Pin 24 (GPIO8/CE0)
SCK              ──────→ Pin 23 (GPIO11/SCLK)
MOSI             ──────→ Pin 19 (GPIO10/MOSI)
MISO             ──────→ Pin 21 (GPIO9/MISO)
RST              ──────→ Pin 22 (GPIO25) OR Pin 15 (GPIO22)
IRQ              ──────→ (NOT CONNECTED - gobot doesn't need it!)
GND              ──────→ Pin 6 (GND)
3.3V             ──────→ Pin 1 (3.3V)
```

---

## For periph.io Library (Fallback)

If gobot fails, periph.io will be tried. It requires **7 wires** (includes IRQ):

| MFRC522 Pin | Raspberry Pi Pin | Physical Pin # | BCM GPIO |
|-------------|------------------|----------------|----------|
| SDA (SS) | CE0 | Pin 24 | GPIO 8 |
| SCK | SCLK | Pin 23 | GPIO 11 |
| MOSI | MOSI | Pin 19 | GPIO 10 |
| MISO | MISO | Pin 21 | GPIO 9 |
| RST | GPIO22 or GPIO25 | Pin 15 or 22 | GPIO 22 or 25 |
| **IRQ** | **GPIO24** | **Pin 18** | **GPIO 24** ← Required for periph.io |
| GND | GND | Pin 6 | GND |
| 3.3V | 3.3V | Pin 1 | 3.3V |

---

## Verification Steps

### 1. Check SPI is Enabled

```bash
ls -l /dev/spidev*
# Should show:
# crw-rw---- 1 root spi 153, 0 ... /dev/spidev0.0
# crw-rw---- 1 root spi 153, 1 ... /dev/spidev0.1
```

### 2. Check SPI Permissions

```bash
groups
# Should include 'spi'

# If not:
sudo usermod -aG spi $USER
# Then logout/login or reboot
```

### 3. Verify Wiring

Use a multimeter to check:
- **3.3V on Pin 1** (NOT 5V!)
- **GND continuity** between Pi and MFRC522
- **All SPI connections** are secure

### 4. Test with Application

```bash
cd /home/alex/code/vibe/petrol
./petrol-pump
```

Look for:
```
✓ Gobot MFRC522 RFID reader initialized successfully!
  ✓ Using gobot library with SPI interrupt register polling
  ✓ No GPIO IRQ pin required - more reliable than periph.io!
  ✓ Hardware ready - tap your card on the reader to pay
```

---

## Troubleshooting

### Cards Not Detected

1. **Check power**: MFRC522 LED should be on (if your module has one)
2. **Check distance**: Cards must be within 4-5cm of antenna
3. **Check card type**: Must be 13.56MHz (MIFARE, ISO 14443A)
4. **Check antenna**: Some modules have adjustable antenna coils
5. **Check SPI connection**: Verify all 4 SPI wires are connected
6. **Check RST pin**: Try GPIO22 (Pin 15) if GPIO25 doesn't work

### Common Issues

**"SPI not available"**
- Enable SPI: `sudo raspi-config` → Interface Options → SPI → Enable
- Reboot after enabling

**"Permission denied"**
- Add user to spi group: `sudo usermod -aG spi $USER`
- Logout/login or reboot

**"No SPI devices found"**
- SPI not enabled or module not connected
- Check: `ls /dev/spidev*`

**"Card detected but payment doesn't complete"**
- Check console output for errors
- Verify `IsCardPresent()` is being called (check debug logs)

---

## Default gobot Configuration

gobot's MFRC522 driver uses:
- **SPI Bus**: 0 (default)
- **Chip Select**: 0 (CE0 = GPIO8)
- **SPI Mode**: 0
- **Speed**: Default (usually 1MHz for MFRC522)

These are hardcoded in gobot and cannot be changed without modifying the library.

---

## Summary

**For gobot (recommended):**
- ✅ 6 wires needed (SPI: 4 wires + RST + Power: 2 wires)
- ✅ NO IRQ pin needed
- ✅ More reliable (SPI polling)
- ✅ Works without kernel IRQ support

**Minimum wiring for gobot:**
1. SDA → Pin 24 (GPIO8)
2. SCK → Pin 23 (GPIO11)
3. MOSI → Pin 19 (GPIO10)
4. MISO → Pin 21 (GPIO9)
5. RST → Pin 22 (GPIO25) or Pin 15 (GPIO22)
6. GND → Pin 6
7. 3.3V → Pin 1

**That's it!** No IRQ wire needed for gobot! 🎉

