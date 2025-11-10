// Simple Drums
// Basic drum pattern with kick, snare, and hi-hats

setcps(1)

stack(
  s("bd ~ sd ~").gain(0.8),
  s("hh*8").gain(0.3),
  s("~ cp ~ cp").gain(0.4)
)



