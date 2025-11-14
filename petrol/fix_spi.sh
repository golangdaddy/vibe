#!/bin/bash
# Quick script to fix SPI permissions for RFID reader

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         Fixing SPI Permissions for RFID Reader          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Find config file
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
elif [ -f /boot/config.txt ]; then
    CONFIG_FILE="/boot/config.txt"
else
    echo "❌ ERROR: Config file not found!"
    echo "   Expected: /boot/firmware/config.txt or /boot/config.txt"
    exit 1
fi

echo "Using config file: $CONFIG_FILE"
echo ""

# Step 1: Enable SPI
echo "Step 1: Enabling SPI..."
if grep -q "^dtparam=spi=on" "$CONFIG_FILE"; then
    echo "  ✓ SPI already enabled"
else
    echo "  → Adding SPI enable line..."
    echo "dtparam=spi=on" | sudo tee -a "$CONFIG_FILE" > /dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ SPI enabled in $CONFIG_FILE"
        REBOOT_NEEDED=1
    else
        echo "  ❌ Failed to enable SPI"
        exit 1
    fi
fi

echo ""

# Step 2: Add user to spi and gpio groups
echo "Step 2: Adding user to required groups..."

# Check and add to spi group
if groups $USER | grep -q spi; then
    echo "  ✓ User $USER already in spi group"
else
    echo "  → Adding $USER to spi group..."
    sudo usermod -aG spi $USER
    if [ $? -eq 0 ]; then
        echo "  ✓ User $USER added to spi group"
        LOGIN_NEEDED=1
    else
        echo "  ❌ Failed to add user to spi group"
        exit 1
    fi
fi

# Check and add to gpio group (for periph.io GPIO access)
if groups $USER | grep -q gpio; then
    echo "  ✓ User $USER already in gpio group"
else
    echo "  → Adding $USER to gpio group..."
    sudo usermod -aG gpio $USER
    if [ $? -eq 0 ]; then
        echo "  ✓ User $USER added to gpio group"
        LOGIN_NEEDED=1
    else
        echo "  ⚠ Failed to add user to gpio group (may not exist on this system)"
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

if [ "$REBOOT_NEEDED" = "1" ]; then
    echo "⚠ REBOOT REQUIRED:"
    echo "   SPI was just enabled - you must reboot for it to take effect"
    echo ""
    echo "   Run: sudo reboot"
    echo ""
fi

if [ "$LOGIN_NEEDED" = "1" ]; then
    echo "⚠ LOGOUT/LOGIN REQUIRED:"
    echo "   You were just added to the spi group"
    echo "   You need to log out and log back in (or reboot)"
    echo ""
fi

if [ "$REBOOT_NEEDED" = "1" ] || [ "$LOGIN_NEEDED" = "1" ]; then
    echo "After rebooting/logging in, verify with:"
    echo "  ls -l /dev/spidev*"
    echo "  groups"
    echo ""
    echo "Expected output:"
    echo "  crw-rw---- 1 root spi ... /dev/spidev0.0"
    echo "  crw-rw---- 1 root spi ... /dev/spidev0.1"
    echo "  ... spi gpio ... (should include 'spi' and 'gpio')"
    echo ""
    echo "Then run: ./petrol-pump"
else
    echo "✓ Everything is already configured!"
    echo ""
    echo "Verify SPI is working:"
    echo "  ls -l /dev/spidev*"
    echo ""
    echo "If SPI devices exist, you can run:"
    echo "  ./petrol-pump"
fi

