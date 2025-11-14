# Fix SPI Permissions for RFID Reader

## Problem
The gobot library is timing out because SPI devices are not available or you don't have permissions.

## Solution Steps

### Step 1: Enable SPI (if not already enabled)

Run this command to open the Raspberry Pi configuration:

```bash
sudo raspi-config
```

Then:
1. Navigate to **"Interface Options"** (or **"Advanced Options"** on older versions)
2. Select **"SPI"**
3. Select **"Yes"** to enable SPI
4. Select **"Finish"** and reboot when prompted

**OR** manually enable it:

```bash
# Check which config file exists
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
    CONFIG_FILE="/boot/config.txt"
else
    echo "Config file not found!"
    exit 1
fi

# Add SPI enable line if not present
if ! grep -q "^dtparam=spi=on" "$CONFIG_FILE"; then
    echo "dtparam=spi=on" | sudo tee -a "$CONFIG_FILE"
    echo "SPI enabled in $CONFIG_FILE - REBOOT REQUIRED"
else
    echo "SPI already enabled in $CONFIG_FILE"
fi
```

### Step 2: Add Your User to the SPI Group

```bash
# Add your user to the spi group
sudo usermod -aG spi $USER

# Verify it was added (will show after logout/login)
groups $USER
```

**Important:** You need to **log out and log back in** (or reboot) for group changes to take effect!

### Step 3: Verify SPI is Working

After rebooting, check:

```bash
# Check if SPI devices exist
ls -l /dev/spidev*

# Should show something like:
# crw-rw---- 1 root spi 153, 0 Nov 14 13:00 /dev/spidev0.0
# crw-rw---- 1 root spi 153, 1 Nov 14 13:00 /dev/spidev0.1

# Check if you're in spi group
groups

# Check if SPI kernel module is loaded
lsmod | grep spi_bcm
```

### Step 4: Test Your Application

```bash
cd /home/alex/code/vibe/petrol
./petrol-pump
```

## Quick Fix (All Steps at Once)

Run these commands:

```bash
# 1. Enable SPI in config
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
    CONFIG_FILE="/boot/config.txt"
fi

if ! grep -q "^dtparam=spi=on" "$CONFIG_FILE"; then
    echo "dtparam=spi=on" | sudo tee -a "$CONFIG_FILE"
    echo "✓ SPI enabled - REBOOT REQUIRED"
fi

# 2. Add user to spi group
sudo usermod -aG spi $USER
echo "✓ Added $USER to spi group - LOGOUT/LOGIN REQUIRED"

# 3. Show status
echo ""
echo "Current status:"
echo "  SPI devices: $(ls /dev/spidev* 2>/dev/null | wc -l) found"
echo "  User groups: $(groups $USER | grep -o spi || echo 'NOT IN SPI GROUP')"
echo ""
echo "⚠ ACTION REQUIRED:"
echo "  1. If SPI was just enabled: REBOOT"
echo "  2. If user was just added to spi group: LOGOUT and LOGIN"
echo "  3. Then run: ./petrol-pump"
```

## Troubleshooting

### SPI devices still not found after reboot

1. **Check if SPI is enabled:**
   ```bash
   cat /boot/firmware/config.txt | grep spi
   # OR
   cat /boot/config.txt | grep spi
   ```
   Should show: `dtparam=spi=on`

2. **Check kernel messages:**
   ```bash
   dmesg | grep -i spi
   ```

3. **Manually load SPI module (if needed):**
   ```bash
   sudo modprobe spi_bcm2835
   ```

### Still getting permission errors

1. **Verify you're in spi group:**
   ```bash
   groups
   # Should show 'spi' in the list
   ```

2. **Check device permissions:**
   ```bash
   ls -l /dev/spidev*
   # Should show: crw-rw---- 1 root spi
   ```

3. **If still not working, try:**
   ```bash
   # Log out completely and log back in
   # OR reboot
   ```

### Alternative: Run with sudo (NOT RECOMMENDED for production)

```bash
sudo ./petrol-pump
```

**Warning:** Running with sudo works but is not secure. Fix permissions instead!

## Verification Script

Run this to check everything:

```bash
#!/bin/bash
echo "=== SPI Configuration Check ==="
echo ""

# Check config file
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
    CONFIG_FILE="/boot/config.txt"
else
    echo "❌ Config file not found!"
    exit 1
fi

# Check if SPI enabled
if grep -q "^dtparam=spi=on" "$CONFIG_FILE"; then
    echo "✓ SPI enabled in $CONFIG_FILE"
else
    echo "❌ SPI NOT enabled in $CONFIG_FILE"
fi

# Check SPI devices
SPI_COUNT=$(ls /dev/spidev* 2>/dev/null | wc -l)
if [ "$SPI_COUNT" -gt 0 ]; then
    echo "✓ SPI devices found: $SPI_COUNT"
    ls -l /dev/spidev*
else
    echo "❌ No SPI devices found (may need reboot)"
fi

# Check user groups
if groups $USER | grep -q spi; then
    echo "✓ User $USER is in spi group"
else
    echo "❌ User $USER is NOT in spi group"
    echo "   Run: sudo usermod -aG spi $USER"
    echo "   Then: logout and login again"
fi

# Check kernel module
if lsmod | grep -q spi_bcm; then
    echo "✓ SPI kernel module loaded"
else
    echo "⚠ SPI kernel module not loaded (may load on first use)"
fi

echo ""
echo "=== Summary ==="
if [ "$SPI_COUNT" -gt 0 ] && groups $USER | grep -q spi; then
    echo "✓ Everything looks good! Try running ./petrol-pump"
else
    echo "⚠ Some issues found - see above"
fi
```

Save as `check_spi.sh`, make executable, and run:
```bash
chmod +x check_spi.sh
./check_spi.sh
```

