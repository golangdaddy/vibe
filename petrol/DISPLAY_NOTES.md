# Display Optimization Notes

## Target Display: 1024x600 Touchscreen

The interface has been optimized for **1024x600 resolution touchscreens**, which are commonly available as:
- 7" HDMI touchscreens
- 10" HDMI/DSI touchscreens
- Official Raspberry Pi touchscreen (though that's 800x480)

## Font Sizes (Optimized for 1024x600)

| Element | Font Size | Notes |
|---------|-----------|-------|
| Main numbers (litres/amount) | 100pt | Large, easy to read from distance |
| Title "PETROL" | 48pt | Prominent but not overwhelming |
| Section headers (LITRES/AMOUNT) | 32pt | Clear section identification |
| Currency symbol | 65pt | Proportional to numbers |
| Unit labels (L) | 36pt | Clearly visible |
| Price info | 24pt | Readable but secondary |
| Status text | 18pt | Smaller, informational |
| Pay button text | 38pt | Large for touchscreen usability |
| Debug indicator | 22pt | Noticeable but not intrusive |

## Button Sizing

**Pay Button:** 350x70 pixels
- Width: About 1/3 of screen width
- Height: Comfortable for finger tapping (minimum 44pt iOS guideline)
- Text: 38pt bold - very readable
- Touch target meets accessibility guidelines

## Layout Spacing

The vertical layout uses spacers to distribute elements evenly across the 600px height:
- Title area: ~50px
- Litres section: ~180px
- Amount section: ~180px
- Pay button + info: ~120px
- Status: ~70px

## Color Contrast

All text meets WCAG AA standards for contrast:
- Green numbers on black: High contrast ratio
- White text on black: Excellent readability
- Pay button states clearly distinguishable

## Touchscreen Considerations

1. **Button size:** 350x70px exceeds minimum touch target (44x44pt)
2. **Spacing:** Adequate spacing between interactive elements
3. **Visual feedback:** Button changes color when disabled/enabled
4. **No accidental taps:** Button disabled during pumping

## Testing on Different Resolutions

While optimized for 1024x600, the display will adapt to:
- **Larger screens:** Elements stay centered with proportional spacing
- **Smaller screens:** May need manual adjustment of font sizes
- **Different aspect ratios:** Layout remains functional

## Recommendations

For best results:
- Use a 7" or 10" 1024x600 touchscreen
- Enable touch calibration in Raspberry Pi settings
- Run in fullscreen mode (automatic)
- Ensure proper screen brightness for indoor/outdoor use

