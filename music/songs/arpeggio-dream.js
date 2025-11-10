// Arpeggiated Dream
// Dreamy arpeggiated melody with reverb

setcps(0.75)

n("0 2 4 7 9 12 9 7 4 2")
  .scale('C4:major')
  .s('triangle')
  .attack(0.1)
  .release(0.5)
  .room(1)
  .delay(0.5)
  .delaytime(0.25)
  .gain(0.5)
  .pan(sine.slow(4))



