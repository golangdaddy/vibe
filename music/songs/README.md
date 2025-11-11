# Strudel Songs Library

This folder contains example Strudel songs that can be loaded and played in the main player.

## Song List

1. **electronic-journey.js** - Atmospheric electronic with drums, bass, and melody
2. **simple-drums.js** - Basic drum pattern with kick, snare, and hi-hats
3. **funky-bass.js** - Groovy bass line with drums
4. **arpeggio-dream.js** - Dreamy arpeggiated melody with reverb
5. **ambient-space.js** - Spacey ambient soundscape
6. **techno-beat.js** - Hard-hitting techno drums
7. **jazz-chords.js** - Smooth jazz chord progression
8. **minimal-techno.js** - Hypnotic minimal techno groove
9. **breakbeat.js** - Energetic breakbeat rhythm

## How to Add Your Own Songs

1. Create a new `.js` file in this folder
2. Write your Strudel code (see examples above)
3. Load it in the main player using the "LOAD CUSTOM SONG" button

## Strudel Syntax Tips

- `setcps(1)` - Set cycles per second (tempo)
- `s("bd sd")` - Play samples (bd = kick, sd = snare, hh = hihat)
- `note("c4 e4 g4")` - Play notes
- `.gain(0.5)` - Set volume
- `.room(0.5)` - Add reverb
- `.lpf(800)` - Low pass filter
- `stack()` - Layer multiple patterns
- `.sometimes()` - Randomly apply effects

For more info, visit: https://strudel.cc/





