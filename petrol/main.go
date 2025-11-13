package main

import (
	"fmt"
	"image/color"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin 17 for button (BCM numbering)
	buttonPin = 17

	// Pump settings
	minPricePerLitre = 1.40                 // Minimum currency per litre
	maxPricePerLitre = 1.60                 // Maximum currency per litre
	incrementRate    = 0.0015               // Litres added per increment
	updateInterval   = 3 * time.Millisecond // How often to check button and update display

	// Splash screen settings
	splashDuration = 3 * time.Second // How long to show splash screen
	logoPath       = "images/logo.png"

	// Digital font paths (will try in order)
	digitalFontPath1 = "fonts/digital.ttf"
	digitalFontPath2 = "/usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf"
	digitalFontPath3 = "/usr/local/share/fonts/DSEG7Classic-Bold.ttf"

	// Base font path
	baseFontPath = "fonts/modern-vision.ttf"
)

var (
	debugMode        = false
	keyPressed       = false
	lastKeyPressTime = time.Time{}
	keyPressTimeout  = 150 * time.Millisecond // If no key press in this time, assume key is released

	// Colors for petrol pump display
	displayBg       = color.RGBA{R: 20, G: 20, B: 20, A: 255}
	displayAmber    = color.RGBA{R: 255, G: 200, B: 0, A: 255}
	displayWhite    = color.RGBA{R: 240, G: 240, B: 240, A: 255}
	displayRed      = color.RGBA{R: 255, G: 50, B: 50, A: 255}
	displayDarkGrey = color.RGBA{R: 40, G: 40, B: 40, A: 255} // For leading zeros

	// Font resources
	digitalFontResource fyne.Resource // DSEG7 for numbers
	baseFontResource    fyne.Resource // Modern Vision for interface
)

// customTheme wraps the default dark theme but uses our custom digital font
type customTheme struct {
	fyne.Theme
}

func newCustomTheme() fyne.Theme {
	return &customTheme{Theme: theme.DarkTheme()}
}

func (ct *customTheme) Font(style fyne.TextStyle) fyne.Resource {
	// Use system default font for symbol text (basic font request, non-italic)
	if style.Symbol {
		return ct.Theme.Font(fyne.TextStyle{}) // Return default sans-serif
	}
	// Use digital font for monospace text (our numbers)
	if style.Monospace && digitalFontResource != nil {
		return digitalFontResource
	}
	// Use Modern Vision for all other text
	if baseFontResource != nil {
		return baseFontResource
	}
	// Fall back to default if fonts not loaded
	return ct.Theme.Font(style)
}

// RFIDReader is an interface for RFID card readers
type RFIDReader interface {
	IsCardPresent() (bool, error)
	ReadCardID() (string, error)
}

type PetrolPump struct {
	litres           float64
	amount           float64
	pricePerLitre    float64
	button           rpio.Pin
	litresContainer  *fyne.Container
	amountContainer  *fyne.Container
	litresDigitTexts []*canvas.Text
	amountDigitTexts []*canvas.Text
	payButton        *PayButton
	rateLabel        *canvas.Text
	rfidReader       RFIDReader
	rfidCheckTicker  *time.Ticker
	onPaymentScreen  bool
	isPumping        bool
	window           fyne.Window
	mainContent      *fyne.Container
}

// PayButton is a custom Bootstrap-style button widget for the touchscreen
type PayButton struct {
	background *canvas.Rectangle
	shadow     *canvas.Rectangle
	text       *canvas.Text
	enabled    bool
	onTapped   func()
}

// generateRandomPrice returns a random price between min and max
func generateRandomPrice() float64 {
	// Generate random price between minPricePerLitre and maxPricePerLitre
	// Round to 2 decimal places
	randomPrice := minPricePerLitre + rand.Float64()*(maxPricePerLitre-minPricePerLitre)
	return float64(int(randomPrice*100)) / 100
}

func NewPetrolPump() *PetrolPump {
	return &PetrolPump{
		litres:        0.0,
		amount:        0.0,
		pricePerLitre: generateRandomPrice(),
	}
}

func (p *PetrolPump) increment() {
	p.litres += incrementRate
	p.amount = p.litres * p.pricePerLitre
	p.isPumping = true
	p.updateGUIDisplay()
}

func (p *PetrolPump) reset() {
	p.litres = 0.0
	p.amount = 0.0
	p.isPumping = false
	// Generate new random price on reset
	p.pricePerLitre = generateRandomPrice()
	// Update rate label if it exists
	if p.rateLabel != nil {
		p.rateLabel.Text = fmt.Sprintf("£%.2f/L", p.pricePerLitre)
		p.rateLabel.Refresh()
	}
	p.updateGUIDisplay()
}

func (p *PetrolPump) stopPumping() {
	p.isPumping = false
	p.updatePayButton()
}

func (p *PetrolPump) updateGUIDisplay() {
	// Update multi-color digit displays
	if p.litresDigitTexts != nil {
		litresText := fmt.Sprintf("%06.2f", p.litres)
		updateMultiColorDigitDisplay(litresText, displayWhite, 120, p.litresDigitTexts)
	}
	if p.amountDigitTexts != nil {
		amountText := fmt.Sprintf("%06.2f", p.amount)
		updateMultiColorDigitDisplay(amountText, displayWhite, 120, p.amountDigitTexts)
	}
	p.updatePayButton()
}

func (p *PetrolPump) updatePayButton() {
	if p.payButton != nil {
		// Enable button only if not pumping and there's an amount to pay
		shouldEnable := !p.isPumping && p.amount > 0
		p.payButton.SetEnabled(shouldEnable)
	}
}

func (p *PetrolPump) showPaymentScreen() {
	// Set flag that we're on payment screen
	p.onPaymentScreen = true

	// Create payment screen background
	bg := canvas.NewRectangle(displayBg)

	// Header with white background (same style as main screen)
	headerBg := canvas.NewRectangle(color.White)
	petrolLabel := canvas.NewText("PETROL", color.Black)
	petrolLabel.TextSize = 50
	petrolLabel.Alignment = fyne.TextAlignCenter

	headerContent := container.NewCenter(petrolLabel)
	header := container.NewStack(headerBg, container.NewPadded(headerContent))

	// Payment instruction text
	paymentText := canvas.NewText("Tap the contactless", displayWhite)
	paymentText.TextSize = 60
	paymentText.Alignment = fyne.TextAlignCenter
	paymentText.TextStyle = fyne.TextStyle{Bold: false}

	rfidText := canvas.NewText("RFID reader to pay", displayWhite)
	rfidText.TextSize = 60
	rfidText.Alignment = fyne.TextAlignCenter
	rfidText.TextStyle = fyne.TextStyle{Bold: false}

	// Amount to pay
	amountText := canvas.NewText(fmt.Sprintf("£%.2f", p.amount), displayWhite)
	amountText.TextSize = 100
	amountText.Alignment = fyne.TextAlignCenter
	amountText.TextStyle = fyne.TextStyle{Bold: true}

	// Cancel button
	cancelButton := widget.NewButton("Cancel", func() {
		// Stop checking for RFID
		p.onPaymentScreen = false
		// Go back to main screen
		mainBg := canvas.NewRectangle(displayBg)
		p.window.SetContent(container.NewStack(mainBg, p.mainContent))
		// Reset the pump after a short delay to allow transition
		go func() {
			time.Sleep(100 * time.Millisecond)
			p.reset()
		}()
	})
	cancelButton.Importance = widget.HighImportance

	// Layout
	content := container.NewBorder(
		header, // Top
		container.NewPadded(container.NewCenter(cancelButton)), // Bottom
		nil, // Left
		nil, // Right
		// Center
		container.NewVBox(
			layout.NewSpacer(),
			container.NewCenter(paymentText),
			container.NewCenter(rfidText),
			layout.NewSpacer(),
			container.NewCenter(amountText),
			layout.NewSpacer(),
			layout.NewSpacer(),
		),
	)

	p.window.SetContent(container.NewStack(bg, content))
}

// handlePaymentSuccess shows a success screen and resets the pump
func (p *PetrolPump) handlePaymentSuccess(cardUID string) {
	// Stop checking for RFID
	p.onPaymentScreen = false

	// Create success screen
	bg := canvas.NewRectangle(displayBg)

	// Header with white background
	headerBg := canvas.NewRectangle(color.White)
	petrolLabel := canvas.NewText("PETROL", color.Black)
	petrolLabel.TextSize = 50
	petrolLabel.Alignment = fyne.TextAlignCenter

	headerContent := container.NewCenter(petrolLabel)
	header := container.NewStack(headerBg, container.NewPadded(headerContent))

	// Success message
	successText := canvas.NewText("✓ Payment Successful!", color.RGBA{R: 40, G: 200, B: 80, A: 255})
	successText.TextSize = 70
	successText.Alignment = fyne.TextAlignCenter
	successText.TextStyle = fyne.TextStyle{Bold: true}

	// Card info (optional)
	cardText := canvas.NewText(fmt.Sprintf("Card: %s", cardUID), displayWhite)
	cardText.TextSize = 30
	cardText.Alignment = fyne.TextAlignCenter

	// Amount paid
	amountText := canvas.NewText(fmt.Sprintf("£%.2f", p.amount), displayWhite)
	amountText.TextSize = 80
	amountText.Alignment = fyne.TextAlignCenter

	// Layout
	content := container.NewBorder(
		header, // Top
		nil,    // Bottom
		nil,    // Left
		nil,    // Right
		// Center
		container.NewVBox(
			layout.NewSpacer(),
			container.NewCenter(successText),
			layout.NewSpacer(),
			container.NewCenter(amountText),
			layout.NewSpacer(),
			container.NewCenter(cardText),
			layout.NewSpacer(),
		),
	)

	p.window.SetContent(container.NewStack(bg, content))

	// Return to main screen after 3 seconds and reset
	go func() {
		time.Sleep(3 * time.Second)
		mainBg := canvas.NewRectangle(displayBg)
		p.window.SetContent(container.NewStack(mainBg, p.mainContent))
		time.Sleep(100 * time.Millisecond)
		p.reset()
	}()
}

// startRFIDMonitoring starts checking for RFID cards when on payment screen
func (p *PetrolPump) startRFIDMonitoring() {
	if p.rfidReader == nil {
		fmt.Println("ℹ RFID reader not available - payments will be manual only")
		return
	}

	// Check for RFID cards every 500ms
	p.rfidCheckTicker = time.NewTicker(500 * time.Millisecond)
	go func() {
		for range p.rfidCheckTicker.C {
			// Only check if we're on the payment screen
			if !p.onPaymentScreen {
				continue
			}

			// Check if a card is present
			present, err := p.rfidReader.IsCardPresent()
			if err != nil || !present {
				continue
			}

			fmt.Println("✓ RFID card detected! Processing payment...")

			// Read card ID
			cardID := ""
			if id, err := p.rfidReader.ReadCardID(); err == nil {
				cardID = id
			} else {
				cardID = "Unknown"
			}

			fmt.Printf("  Card ID: %s\n", cardID)
			fmt.Printf("  Amount: £%.2f\n", p.amount)
			fmt.Printf("  Fuel: %.2f L @ £%.2f/L\n", p.litres, p.pricePerLitre)

			// Handle payment success
			p.handlePaymentSuccess(cardID)

			// Small delay to prevent multiple reads
			time.Sleep(2 * time.Second)
		}
	}()
}

// NewPayButton creates a new Bootstrap-style touchscreen-friendly pay button
func NewPayButton(text string, onTapped func()) *PayButton {
	pb := &PayButton{
		background: canvas.NewRectangle(displayWhite),
		shadow:     canvas.NewRectangle(color.RGBA{R: 0, G: 0, B: 0, A: 80}),
		text:       canvas.NewText(text, color.White),
		enabled:    false,
		onTapped:   onTapped,
	}

	pb.text.TextSize = 36
	pb.text.Alignment = fyne.TextAlignCenter
	pb.text.TextStyle = fyne.TextStyle{Bold: true}

	// Start disabled
	pb.SetEnabled(false)

	return pb
}

func (pb *PayButton) SetEnabled(enabled bool) {
	pb.enabled = enabled
	if enabled {
		// Enabled state - bright green like Bootstrap success button
		pb.background.FillColor = color.RGBA{R: 40, G: 200, B: 80, A: 255}
		pb.text.Color = color.White
		pb.shadow.FillColor = color.RGBA{R: 0, G: 0, B: 0, A: 80}
	} else {
		// Disabled state - gray like Bootstrap disabled
		pb.background.FillColor = color.RGBA{R: 108, G: 117, B: 125, A: 255}
		pb.text.Color = color.RGBA{R: 200, G: 200, B: 200, A: 255}
		pb.shadow.FillColor = color.RGBA{R: 0, G: 0, B: 0, A: 30}
	}
	pb.background.Refresh()
	pb.text.Refresh()
	pb.shadow.Refresh()
}

func (pb *PayButton) Tapped(pe *fyne.PointEvent) {
	if pb.enabled && pb.onTapped != nil {
		// Visual feedback - darken button briefly
		originalColor := pb.background.FillColor
		pb.background.FillColor = color.RGBA{R: 30, G: 160, B: 60, A: 255}
		pb.background.Refresh()

		// Execute callback
		pb.onTapped()

		// Restore color after a brief moment
		go func() {
			time.Sleep(100 * time.Millisecond)
			pb.background.FillColor = originalColor
			pb.background.Refresh()
		}()
	}
}

func (pb *PayButton) TappedSecondary(*fyne.PointEvent) {}

func (pb *PayButton) CreateRenderer() fyne.WidgetRenderer {
	return &payButtonRenderer{button: pb}
}

// Implement fyne.Widget interface methods
func (pb *PayButton) Size() fyne.Size {
	return fyne.NewSize(480, 90)
}

func (pb *PayButton) Resize(size fyne.Size) {}

func (pb *PayButton) Position() fyne.Position {
	return fyne.NewPos(0, 0)
}

func (pb *PayButton) Move(pos fyne.Position) {}

func (pb *PayButton) MinSize() fyne.Size {
	return fyne.NewSize(360, 70)
}

func (pb *PayButton) Visible() bool {
	return true
}

func (pb *PayButton) Show() {}

func (pb *PayButton) Hide() {}

func (pb *PayButton) Refresh() {
	pb.background.Refresh()
	pb.text.Refresh()
	pb.shadow.Refresh()
}

type payButtonRenderer struct {
	button *PayButton
}

func (r *payButtonRenderer) Layout(size fyne.Size) {
	// Shadow offset (bottom-right for depth effect)
	shadowOffset := float32(4)

	// Position shadow slightly offset
	r.button.shadow.Move(fyne.NewPos(shadowOffset, shadowOffset))
	r.button.shadow.Resize(fyne.NewSize(size.Width, size.Height))

	// Position main button
	r.button.background.Move(fyne.NewPos(0, 0))
	r.button.background.Resize(size)

	// Center text
	r.button.text.Move(fyne.NewPos(0, 0))
	r.button.text.Resize(size)
}

func (r *payButtonRenderer) MinSize() fyne.Size {
	// Bootstrap-like button size - larger for touchscreen
	return fyne.NewSize(480, 90)
}

func (r *payButtonRenderer) Refresh() {
	r.button.background.Refresh()
	r.button.text.Refresh()
	r.button.shadow.Refresh()
}

func (r *payButtonRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.button.shadow, r.button.background, r.button.text}
}

func (r *payButtonRenderer) Destroy() {}

func (p *PetrolPump) createGUIDisplay(a fyne.App) fyne.Window {
	w := a.NewWindow("Petrol Pump Display")
	w.SetFullScreen(true)

	// Create background
	bg := canvas.NewRectangle(displayBg)

	// Header labels (black text for white header background)
	petrolLabel := canvas.NewText("PETROL", color.Black)
	petrolLabel.TextSize = 50
	petrolLabel.Alignment = fyne.TextAlignCenter
	petrolLabel.TextStyle = fyne.TextStyle{Bold: false}

	// Rate label for header (black text)
	p.rateLabel = canvas.NewText(fmt.Sprintf("£%.2f/L", p.pricePerLitre), color.Black)
	p.rateLabel.TextSize = 30
	p.rateLabel.Alignment = fyne.TextAlignCenter
	p.rateLabel.TextStyle = fyne.TextStyle{Bold: false}

	// Debug mode indicator (if in debug mode)
	var modeIndicator *canvas.Text
	if debugMode {
		modeIndicator = canvas.NewText("🔧 DEBUG MODE 🔧", color.Black)
		modeIndicator.TextSize = 18
		modeIndicator.Alignment = fyne.TextAlignCenter
		modeIndicator.TextStyle = fyne.TextStyle{Bold: true}
	}

	// Create header with white background
	headerBg := canvas.NewRectangle(color.White)
	var headerContent fyne.CanvasObject
	if debugMode {
		// Header with PETROL (left), DEBUG MODE (center), rate (right)
		headerContent = container.NewBorder(
			nil, nil,
			petrolLabel,                        // Left
			p.rateLabel,                        // Right
			container.NewCenter(modeIndicator), // Center
		)
	} else {
		// Header with PETROL (left), rate (right)
		headerContent = container.NewBorder(
			nil, nil,
			petrolLabel, // Left
			p.rateLabel, // Right
			nil,         // Center (empty)
		)
	}
	// Stack header background and content with padding
	header := container.NewStack(headerBg, container.NewPadded(headerContent))

	// LITRES display - value and unit on same line (with multi-color support)
	p.litresContainer, p.litresDigitTexts = createMultiColorDigitDisplay("000.00", displayWhite, 120)

	thisSaleTextSize := float32(60)

	thisSale := canvas.NewText("this", displayWhite)
	thisSale.TextSize = thisSaleTextSize
	thisSale.Alignment = fyne.TextAlignCenter
	thisSale.TextStyle = fyne.TextStyle{Bold: false}

	saleThis := canvas.NewText("sale", displayWhite)
	saleThis.TextSize = thisSaleTextSize
	saleThis.Alignment = fyne.TextAlignCenter
	saleThis.TextStyle = fyne.TextStyle{Bold: false}

	litresCurrencyUnit := canvas.NewText(" litres", displayWhite)
	litresCurrencyUnit.TextSize = 78
	litresCurrencyUnit.Alignment = fyne.TextAlignCenter
	litresCurrencyUnit.TextStyle = fyne.TextStyle{Bold: true}

	// AMOUNT display - currency and value on same line (using basic system font)
	currencySymbol := createBasicText("£", displayWhite, 96)

	p.amountContainer, p.amountDigitTexts = createMultiColorDigitDisplay("000.00", displayWhite, 120)

	// Pay button (touchscreen) - optimized for 1024x600
	p.payButton = NewPayButton("PAY", func() {
		p.showPaymentScreen()
	})

	// Load logo for footer
	var logoWidget fyne.CanvasObject
	if _, err := os.Stat(logoPath); err == nil {
		// Logo file exists
		img := canvas.NewImageFromFile(logoPath)
		img.FillMode = canvas.ImageFillContain
		img.SetMinSize(fyne.NewSize(60, 60))
		// Add padding around logo
		logoWidget = container.NewPadded(img)
	} else {
		// Placeholder if logo not found (empty spacer)
		logoWidget = layout.NewSpacer()
	}

	// Create footer with white background, logo on left, button on right
	footerBg := canvas.NewRectangle(color.White)

	// Footer content: logo left, spacer middle, button right
	footerContent := container.NewBorder(
		nil, nil,
		container.NewPadded(logoWidget),  // Left (with padding)
		container.NewPadded(p.payButton), // Right (with padding)
		nil,                              // Center (empty)
	)

	// Stack footer background and content with additional internal padding
	footer := container.NewStack(footerBg, container.NewPadded(footerContent))

	// Decorative separator line - full width, thick, darker
	lineDarkerGray := color.RGBA{R: 120, G: 120, B: 120, A: 255} // 50% darker than displayWhite
	line1 := canvas.NewRectangle(lineDarkerGray)
	line1.SetMinSize(fyne.NewSize(1024, 15))

	// Fixed horizontal spacer for "this sale" layout
	horizontalSpacer := canvas.NewRectangle(color.Transparent)
	horizontalSpacer.SetMinSize(fyne.NewSize(36, 1))

	// Build layout
	var content *fyne.Container
	if debugMode {
		// Debug mode: show control instructions
		statusLabel := canvas.NewText("Hold SPACE to pump • Press R to reset • ESC to exit", displayWhite)
		statusLabel.TextSize = 14
		statusLabel.Alignment = fyne.TextAlignCenter

		content = container.NewBorder(
			header, // Top - header with PETROL and DEBUG MODE
			footer, // Bottom - footer with button and logo
			nil,    // Left
			nil,    // Right
			// Center content
			container.New(layout.NewVBoxLayout(),
				layout.NewSpacer(),
				// Litres with unit on same line
				container.NewCenter(
					container.NewHBox(
						p.litresContainer,
						litresCurrencyUnit,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(line1),
				layout.NewSpacer(),
				// Amount with currency on same line
				container.NewCenter(
					container.NewHBox(
						container.NewVBox(
							layout.NewSpacer(),
							thisSale,
							saleThis,
							layout.NewSpacer(),
						),
						horizontalSpacer,
						currencySymbol,
						p.amountContainer,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(statusLabel),
				layout.NewSpacer(),
			),
		)
	} else {
		// Normal mode: clean display without instructions
		content = container.NewBorder(
			header, // Top - header with PETROL
			footer, // Bottom - footer with button and logo
			nil,    // Left
			nil,    // Right
			// Center content
			container.New(layout.NewVBoxLayout(),
				layout.NewSpacer(),
				// Litres with unit on same line
				container.NewCenter(
					container.NewHBox(
						p.litresContainer,
						litresCurrencyUnit,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(line1),
				layout.NewSpacer(),
				// Amount with currency on same line
				container.NewCenter(
					container.NewHBox(
						container.NewVBox(
							layout.NewSpacer(),
							thisSale,
							saleThis,
							layout.NewSpacer(),
						),
						horizontalSpacer,
						currencySymbol,
						p.amountContainer,
					),
				),
				layout.NewSpacer(),
			),
		)
	}

	// Stack background and content
	p.mainContent = content
	p.window = w
	w.SetContent(container.NewStack(bg, content))

	// Handle keyboard - ESC and R work in both modes, SPACE only in debug mode
	w.Canvas().SetOnTypedKey(func(key *fyne.KeyEvent) {
		switch key.Name {
		case fyne.KeySpace:
			// Only allow SPACE to pump in debug mode
			if debugMode {
				keyPressed = true
				lastKeyPressTime = time.Now()
			}
		case fyne.KeyR:
			// Reset works in both modes
			p.reset()
			if debugMode {
				keyPressed = false
			}
		case fyne.KeyEscape:
			// ESC to exit works in both modes
			fmt.Printf("\nFinal totals:\n")
			fmt.Printf("  Litres: %.2f L\n", p.litres)
			fmt.Printf("  Amount: £%.2f\n", p.amount)
			a.Quit()
		}
	})

	return w
}

func createSplashScreen(a fyne.App) fyne.Window {
	w := a.NewWindow("Petrol Pump")
	w.SetFullScreen(true)

	// White background
	bg := canvas.NewRectangle(color.White)

	// Try to load logo image - optimized for 1024x600
	var logoWidget fyne.CanvasObject
	if _, err := os.Stat(logoPath); err == nil {
		// Logo file exists
		img := canvas.NewImageFromFile(logoPath)
		img.FillMode = canvas.ImageFillContain
		img.SetMinSize(fyne.NewSize(350, 350))
		logoWidget = img
	} else {
		// Logo file doesn't exist, show placeholder text
		placeholder := canvas.NewText("PETROL PUMP", displayBg)
		placeholder.TextSize = 60
		placeholder.Alignment = fyne.TextAlignCenter
		placeholder.TextStyle = fyne.TextStyle{Bold: true}
		logoWidget = placeholder
	}

	// Loading text - optimized for 1024x600
	loadingText := canvas.NewText("Loading...", color.RGBA{R: 100, G: 100, B: 100, A: 255})
	loadingText.TextSize = 20
	loadingText.Alignment = fyne.TextAlignCenter

	// Layout
	content := container.New(layout.NewVBoxLayout(),
		layout.NewSpacer(),
		container.NewCenter(logoWidget),
		layout.NewSpacer(),
		container.NewCenter(loadingText),
		layout.NewSpacer(),
	)

	w.SetContent(container.NewStack(bg, content))
	return w
}

// createMultiColorDigitDisplay creates a container with individual digit texts
// that can have different colors (for leading zeros in dark grey)
// Leading zeros are displayed as eights, but the first integer zero stays as 0
func createMultiColorDigitDisplay(text string, mainColor color.Color, size float32) (*fyne.Container, []*canvas.Text) {
	// Find the decimal point position
	decimalIdx := -1
	for i, ch := range text {
		if ch == '.' {
			decimalIdx = i
			break
		}
	}

	// Find the first non-zero digit (excluding decimal point)
	firstNonZeroIdx := -1
	for i, ch := range text {
		if ch != '0' && ch != '.' {
			firstNonZeroIdx = i
			break
		}
	}

	// Build display text - convert leading zeros to '8', but keep first integer zero as '0'
	displayText := ""
	for i, ch := range text {
		if ch == '0' {
			// Check if this is the first integer zero (position just before decimal)
			if decimalIdx != -1 && i == decimalIdx-1 {
				// This is the first integer position - keep as '0'
				displayText += "0"
			} else if decimalIdx != -1 && i < decimalIdx-1 {
				// It's a leading zero before the first integer - convert to '8'
				displayText += "8"
			} else {
				// After decimal point - keep as '0'
				displayText += "0"
			}
		} else {
			displayText += string(ch)
		}
	}

	// Create individual text widgets for each character
	var digitTexts []*canvas.Text
	var objects []fyne.CanvasObject

	for i, ch := range displayText {
		// Determine if this is a leading zero that should be dark grey
		isLeadingZero := false
		if i < len(text) && text[i] == '0' {
			// It's a zero
			if decimalIdx != -1 && i < decimalIdx-1 {
				// It's before the first integer digit (the one just before decimal)
				// Check if it's a leading zero (before first non-zero digit)
				if firstNonZeroIdx == -1 || i < firstNonZeroIdx {
					isLeadingZero = true
				}
			}
		}

		// Choose color
		col := mainColor
		if isLeadingZero {
			col = displayDarkGrey
		}

		// Create text widget
		txt := canvas.NewText(string(ch), col)

		// Special handling for decimal point to make it more visible
		if ch == '.' {
			// Make decimal point slightly larger and use non-monospace
			txt.TextSize = size * 1.2
			txt.TextStyle = fyne.TextStyle{Bold: true, Monospace: false}
			txt.Alignment = fyne.TextAlignCenter
		} else {
			txt.TextSize = size
			txt.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}
		}

		digitTexts = append(digitTexts, txt)
		objects = append(objects, txt)
	}

	// Return horizontal box container with all digits
	return container.NewHBox(objects...), digitTexts
}

// updateMultiColorDigitDisplay updates an existing multi-color digit display
func updateMultiColorDigitDisplay(text string, mainColor color.Color, size float32, digitTexts []*canvas.Text) {
	// Find the decimal point position
	decimalIdx := -1
	for i, ch := range text {
		if ch == '.' {
			decimalIdx = i
			break
		}
	}

	// Find the first non-zero digit (excluding decimal point)
	firstNonZeroIdx := -1
	for i, ch := range text {
		if ch != '0' && ch != '.' {
			firstNonZeroIdx = i
			break
		}
	}

	// Build display text - convert leading zeros to '8', but keep first integer zero as '0'
	displayText := ""
	for i, ch := range text {
		if ch == '0' {
			// Check if this is the first integer zero (position just before decimal)
			if decimalIdx != -1 && i == decimalIdx-1 {
				// This is the first integer position - keep as '0'
				displayText += "0"
			} else if decimalIdx != -1 && i < decimalIdx-1 {
				// It's a leading zero before the first integer - convert to '8'
				displayText += "8"
			} else {
				// After decimal point - keep as '0'
				displayText += "0"
			}
		} else {
			displayText += string(ch)
		}
	}

	// Update each digit text
	for i := 0; i < len(digitTexts) && i < len(displayText); i++ {
		// Determine if this is a leading zero that should be dark grey
		isLeadingZero := false
		if i < len(text) && text[i] == '0' {
			// It's a zero
			if decimalIdx != -1 && i < decimalIdx-1 {
				// It's before the first integer digit (the one just before decimal)
				// Check if it's a leading zero (before first non-zero digit)
				if firstNonZeroIdx == -1 || i < firstNonZeroIdx {
					isLeadingZero = true
				}
			}
		}

		// Choose color
		col := mainColor
		if isLeadingZero {
			col = displayDarkGrey
		}

		// Update text and color
		digitTexts[i].Text = string(displayText[i])
		digitTexts[i].Color = col

		// Special handling for decimal point to make it more visible
		if displayText[i] == '.' {
			digitTexts[i].TextSize = size * 1.2
		} else {
			digitTexts[i].TextSize = size
		}

		digitTexts[i].Refresh()
	}
}

// createDigitalText creates a text widget with digital font if available
func createDigitalText(text string, col color.Color, size float32) *canvas.Text {
	txt := canvas.NewText(text, col)
	txt.TextSize = size
	txt.Alignment = fyne.TextAlignCenter

	if digitalFontResource != nil {
		// Use custom digital font
		txt.TextStyle = fyne.TextStyle{}

		// Create custom text with font
		customTxt := &canvas.Text{
			Text:      text,
			Color:     col,
			TextSize:  size,
			Alignment: fyne.TextAlignCenter,
			TextStyle: fyne.TextStyle{},
		}

		// Set custom font - this requires using widget.NewRichTextFromMarkdown approach
		// For now, using monospace as fallback since Fyne's canvas.Text doesn't support custom fonts directly
		customTxt.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}
		return customTxt
	}

	// Fallback to monospace
	txt.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}
	return txt
}

func createBasicText(text string, col color.Color, size float32) *canvas.Text {
	txt := canvas.NewText(text, col)
	txt.TextSize = size
	txt.Alignment = fyne.TextAlignCenter
	// Use Symbol flag to signal the theme to use system default font (non-italic)
	txt.TextStyle = fyne.TextStyle{Symbol: true}
	return txt
}

// loadDigitalFont tries to load digital display font from various locations
func loadDigitalFont() {
	fontPaths := []string{
		digitalFontPath1,
		digitalFontPath2,
		digitalFontPath3,
		"fonts/DSEG7Classic-Bold.ttf",
		"/usr/share/fonts/truetype/DSEG7Classic-Bold.ttf",
	}

	for _, path := range fontPaths {
		if data, err := os.ReadFile(path); err == nil {
			digitalFontResource = fyne.NewStaticResource("digital", data)
			fmt.Printf("✓ Loaded digital font from: %s\n", path)
			return
		}
	}

	fmt.Println("ℹ Digital font (DSEG7) not found")
	fmt.Println("  Using monospace font as fallback")
	fmt.Println("  To use DSEG7, install it to one of:")
	fmt.Println("    - fonts/DSEG7Classic-Bold.ttf")
	fmt.Println("    - /usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf")
}

// loadBaseFont tries to load the Modern Vision base font
func loadBaseFont() {
	if data, err := os.ReadFile(baseFontPath); err == nil {
		baseFontResource = fyne.NewStaticResource("modernvision", data)
		fmt.Printf("✓ Loaded base font from: %s\n", baseFontPath)
	} else {
		fmt.Printf("ℹ Base font (Modern Vision) not found at: %s\n", baseFontPath)
		fmt.Println("  Using default font as fallback")
	}
}

func main() {
	var button rpio.Pin
	var rfidReader RFIDReader

	// Seed random number generator for price randomization
	rand.Seed(time.Now().UnixNano())

	// Load fonts if available
	loadDigitalFont()
	loadBaseFont()

	// Try to initialize GPIO
	err := rpio.Open()
	if err != nil {
		// GPIO not available - enter debug mode with GRAPHICAL display
		debugMode = true
		fmt.Println("╔════════════════════════════════════╗")
		fmt.Println("║   🔧 DEBUG MODE ACTIVATED 🔧      ║")
		fmt.Println("╠════════════════════════════════════╣")
		fmt.Println("║  GPIO not available - using        ║")
		fmt.Println("║  GRAPHICAL display with keyboard   ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Hold SPACE to pump petrol         ║")
		fmt.Println("║  Press R to reset                  ║")
		fmt.Println("║  Press ESC to exit                 ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Starting in 2 seconds...          ║")
		fmt.Println("╚════════════════════════════════════╝")
		time.Sleep(2 * time.Second)
	} else {
		// GPIO available - normal mode with graphical display
		defer rpio.Close()
		button = rpio.Pin(buttonPin)
		button.Input()
		button.PullUp()
		fmt.Println("✓ GPIO initialized - Running in normal mode")
		fmt.Println("  Press and hold the button to pump")
		time.Sleep(1 * time.Second)
	}

	// Try to initialize RFID reader
	rfidReader = initRFIDReader()

	// Run graphical mode
	runGraphicalMode(button, rfidReader)
}

// initRFIDReader tries to initialize the MFRC522 RFID reader
// Returns nil if reader cannot be initialized
func initRFIDReader() RFIDReader {
	fmt.Println("\nInitializing RFID reader...")

	// TODO: Implement actual RFID reader initialization
	// This is a placeholder that you can replace with actual MFRC522 code
	// Example implementation would go here using SPI communication

	fmt.Println("⚠ RFID reader initialization not yet implemented")
	fmt.Println("  To add RFID support, implement the RFIDReader interface")
	fmt.Println("  Payment screen will still work in manual mode")

	return nil
}

func runGraphicalMode(button rpio.Pin, rfidReader RFIDReader) {
	pump := NewPetrolPump()
	pump.button = button
	pump.rfidReader = rfidReader

	// Create GUI application
	myApp := app.New()

	// Set custom theme to use digital font
	myApp.Settings().SetTheme(newCustomTheme())

	// Show splash screen first
	splashWindow := createSplashScreen(myApp)
	splashWindow.Show()

	// After splash duration, switch to main pump display
	go func() {
		time.Sleep(splashDuration)
		splashWindow.Hide()

		// Create and show main window
		mainWindow := pump.createGUIDisplay(myApp)
		mainWindow.Show()

		// Setup signal handling after main window is shown
		setupSignalHandling(myApp, pump)

		// Start pump monitoring
		startPumpMonitoring(pump, button)

		// Start RFID monitoring if reader is available
		pump.startRFIDMonitoring()
	}()

	myApp.Run()
}

func setupSignalHandling(myApp fyne.App, pump *PetrolPump) {

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Printf("\nFinal totals:\n")
		fmt.Printf("  Litres: %.2f L\n", pump.litres)
		fmt.Printf("  Amount: £%.2f\n", pump.amount)
		myApp.Quit()
	}()
}

func startPumpMonitoring(pump *PetrolPump, button rpio.Pin) {
	go func() {
		ticker := time.NewTicker(updateInterval)
		defer ticker.Stop()

		lastButtonState := false

		for {
			<-ticker.C
			var buttonPressed bool

			if debugMode {
				// Debug mode: use keyboard (handled by Fyne event handlers)
				// Check if key press has timed out (key was released)
				if keyPressed && time.Since(lastKeyPressTime) > keyPressTimeout {
					keyPressed = false
				}
				buttonPressed = keyPressed
			} else {
				// Normal mode: use GPIO
				buttonPressed = button.Read() == rpio.Low
			}

			if buttonPressed {
				pump.increment()
				lastButtonState = true
			} else if lastButtonState {
				// Button was just released
				pump.stopPumping()
				lastButtonState = false
			}
		}
	}()
}
