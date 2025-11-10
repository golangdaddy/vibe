#!/bin/bash

# Script to check if all dependencies for the petrol pump GUI are installed

echo "Checking dependencies for Petrol Pump GUI..."
echo "============================================"
echo ""

# Check for Go
echo -n "Go compiler: "
if command -v go &> /dev/null; then
    echo "✓ Found ($(go version))"
else
    echo "✗ Not found - Install Go from https://go.dev/dl/"
    exit 1
fi

# Check for GCC (needed for CGO)
echo -n "GCC compiler: "
if command -v gcc &> /dev/null; then
    echo "✓ Found ($(gcc --version | head -1))"
else
    echo "✗ Not found - Install with: sudo apt-get install build-essential"
    exit 1
fi

# Check for pkg-config
echo -n "pkg-config: "
if command -v pkg-config &> /dev/null; then
    echo "✓ Found"
else
    echo "✗ Not found - Install with: sudo apt-get install pkg-config"
    exit 1
fi

# Check for required libraries
echo ""
echo "Checking required libraries:"

check_lib() {
    echo -n "  $1: "
    if pkg-config --exists $2 2>/dev/null; then
        echo "✓ Found"
        return 0
    else
        echo "✗ Not found"
        return 1
    fi
}

MISSING=0

check_lib "OpenGL" gl || MISSING=1
check_lib "X11" x11 || MISSING=1
check_lib "Xrandr" xrandr || MISSING=1
check_lib "Xinerama" xinerama || MISSING=1
check_lib "Xi" xi || MISSING=1
check_lib "Xcursor" xcursor || MISSING=1
check_lib "Xxf86vm" xxf86vm || MISSING=1

echo ""
if [ $MISSING -eq 1 ]; then
    echo "Some libraries are missing. Install with:"
    echo "  sudo apt-get install libgl1-mesa-dev xorg-dev"
    exit 1
fi

echo "✓ All dependencies are installed!"
echo ""
echo "You can now build the program with:"
echo "  go build -o petrol-pump"
echo ""

