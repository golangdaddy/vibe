# Setting Up on Raspberry Pi

## Current Status

You're currently running on **Ubuntu x86_64** (desktop/laptop), not a Raspberry Pi.

**This is why:**
- ✅ Debug mode is active (no GPIO hardware)
- ✅ Keyboard simulation works (press P to simulate RFID)
- ❌ SPI devices don't exist (SPI is Pi-specific)
- ❌ GPIO access fails (GPIO is Pi-specific)

**This is normal!** The app correctly falls back to keyboard mode.

---

## When You Move to Raspberry Pi

When you run this on an actual Raspberry Pi, follow these steps:

### 1. Enable SPI

```bash
sudo raspi-config
```

Navigate to:
- **Interface Options** → **SPI** → **Enable** → **Finish**

Or manually:
```bash
# Find config file
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
    CONFIG_FILE="/boot/config.txt"
fi

# Enable SPI
echo "dtparam=spi=on" | sudo tee -a "$CONFIG_FILE"
sudo reboot
```

### 2. Add User to Groups

```bash
# Add to spi group (for SPI access)
sudo usermod -aG spi $USER

# Add to gpio group (for GPIO access)
sudo usermod -aG gpio $USER

# Logout and login again (or reboot)
```

### 3. Quick Setup (All at Once)

```bash
cd /home/alex/code/vibe/petrol
make setup-spi
# OR
./fix_spi.sh
```

Then **reboot**:
```bash
sudo reboot
```

### 4. Verify After Reboot

```bash
# Check SPI devices exist
ls -l /dev/spidev*
# Should show:
# crw-rw---- 1 root spi 153, 0 ... /dev/spidev0.0
# crw-rw---- 1 root spi 153, 1 ... /dev/spidev0.1

# Check you're in groups
groups
# Should show: ... spi gpio ...

# Test the app
cd /home/alex/code/vibe/petrol
./petrol-pump
```

---

## Expected Behavior

### On Raspberry Pi (with hardware):
1. ✅ Tries gobot MFRC522 (SPI polling)
2. ✅ Falls back to periph.io (GPIO IRQ) if gobot fails
3. ✅ Falls back to keyboard mode if both fail

### On Ubuntu/Desktop (no hardware):
1. ⏭️ Skips gobot (no SPI devices)
2. ⏭️ Skips periph.io (no GPIO)
3. ✅ Uses keyboard mode (press P to simulate RFID)

---

## Troubleshooting on Pi

### SPI devices not found after reboot:
```bash
# Check if SPI is enabled
cat /boot/firmware/config.txt | grep spi
# OR
cat /boot/config.txt | grep spi
# Should show: dtparam=spi=on

# Check kernel messages
dmesg | grep -i spi

# Manually load module (if needed)
sudo modprobe spi_bcm2835
```

### Permission denied errors:
```bash
# Verify groups
groups
# Should include: spi gpio

# If not, add them:
sudo usermod -aG spi,gpio $USER
# Then logout/login or reboot
```

### Still not working:
```bash
# Check SPI device permissions
ls -l /dev/spidev*
# Should show: crw-rw---- 1 root spi

# If permissions are wrong:
sudo chmod 660 /dev/spidev*
sudo chgrp spi /dev/spidev*
```

---

## Summary

**Current setup (Ubuntu desktop):**
- ✅ Works perfectly in keyboard simulation mode
- ✅ Press **P** to simulate RFID card tap
- ✅ All features work except real RFID hardware

**On Raspberry Pi:**
- Run `make setup-spi` or `./fix_spi.sh`
- Reboot
- Hardware RFID will work automatically!

