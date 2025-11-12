.PHONY: all build run install-base-font install-font setup-fontconfig clean help test-font

# Default target
all: install-base-font install-font build

# Build the petrol pump program
build:
	@echo "Building petrol pump..."
	go build -o petrol-pump
	@echo "✓ Build complete"

# Run the program
run: build
	@echo "Starting petrol pump display..."
	./petrol-pump

# Install Modern Vision base font
install-base-font:
	@echo "Installing Modern Vision font..."
	@mkdir -p fonts
	@if [ -f fonts/modern-vision.ttf ]; then \
		echo "✓ fonts/modern-vision.ttf already exists"; \
	else \
		echo "Downloading Modern Vision font..."; \
		curl -L "https://dl.dafont.com/dl/?f=modern_vision" -o fonts/modern-vision.zip && \
		cd fonts && unzip -o modern-vision.zip modern-vision.ttf && rm modern-vision.zip && \
		echo "✓ Downloaded and installed Modern Vision font"; \
	fi
	@ls -lh fonts/modern-vision.ttf 2>/dev/null || true

# Install DSEG7 digital font to project directory
install-font:
	@echo "Installing DSEG7 Classic Bold font..."
	@mkdir -p fonts
	@if [ -f /usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf ]; then \
		cp /usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf fonts/digital.ttf && \
		echo "✓ Copied DSEG7Classic-Bold.ttf to fonts/digital.ttf"; \
	elif [ -f fonts/digital.ttf ]; then \
		echo "✓ fonts/digital.ttf already exists"; \
	else \
		echo "✗ DSEG7 font not found!"; \
		echo "  Install with: sudo apt-get install fonts-dseg"; \
		echo "  Or download from: https://github.com/keshikan/DSEG/releases"; \
		exit 1; \
	fi
	@ls -lh fonts/digital.ttf 2>/dev/null || true

# Setup fontconfig to make DSEG7 the default monospace font
setup-fontconfig:
	@./setup-font.sh

# Full setup: install fonts, configure system, and build
setup: install-base-font install-font setup-fontconfig build
	@echo ""
	@echo "==================================="
	@echo "✓ Setup complete!"
	@echo "==================================="
	@echo ""
	@echo "Run the petrol pump with: make run"
	@echo "Or directly with:         ./petrol-pump"

# Test if DSEG font is properly configured
test-font:
	@echo "=== DSEG7 Font Configuration Test ==="
	@echo ""
	@echo "1. Project font file:"
	@[ -f fonts/digital.ttf ] && \
		echo "   ✓ fonts/digital.ttf exists" || \
		echo "   ✗ fonts/digital.ttf NOT found"
	@echo ""
	@echo "2. System DSEG7 fonts:"
	@fc-list | grep -i "DSEG7 Classic" | head -3 || echo "   ✗ Not found"
	@echo ""
	@echo "3. Fontconfig file:"
	@[ -f $(HOME)/.config/fontconfig/fonts.conf ] && \
		echo "   ✓ ~/.config/fontconfig/fonts.conf exists" || \
		echo "   ✗ ~/.config/fontconfig/fonts.conf NOT found"
	@echo ""
	@echo "4. Current monospace font:"
	@fc-match monospace
	@echo ""
	@echo "5. Current bold monospace:"
	@fc-match "monospace:weight=bold"
	@echo ""
	@echo "=== Summary ==="
	@fc-match monospace | grep -q "DSEG7" && \
		echo "✓ DSEG7 is configured correctly!" || \
		echo "✗ DSEG7 not configured - run: make setup"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -f petrol-pump
	@echo "✓ Clean complete"

# Clean everything including fonts
clean-all: clean
	@echo "Removing installed fonts..."
	@rm -f fonts/digital.ttf fonts/modern-vision.ttf
	@echo "✓ All clean"

# Help target
help:
	@echo "Petrol Pump Display - Makefile Commands"
	@echo ""
	@echo "Usage:"
	@echo "  make              - Install fonts and build program"
	@echo "  make setup        - Full setup (fonts + fontconfig + build)"
	@echo "  make build        - Build the program"
	@echo "  make run          - Build and run the program"
	@echo "  make install-base-font - Install Modern Vision font"
	@echo "  make install-font - Install DSEG7 font to project"
	@echo "  make setup-fontconfig - Configure system to use DSEG7"
	@echo "  make test-font    - Test font configuration"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make clean-all    - Remove build artifacts and fonts"
	@echo "  make help         - Show this help message"
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup        - One-time setup"
	@echo "  make run          - Run the program"

