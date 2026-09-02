# SKY RAID

SKY RAID is the hybrid mode between Turbo Hunt and Arcade Run.

- Keeps Turbo Hunt's seamless all-direction scrolling field, pursuit combat, dodge/counter pressure, Turbo Ram, hazards and free routing.
- Adds a fixed ~2 minute arcade dramatic curve: DAWN CITY -> RED CANYON -> CLOUD FLEET -> STORM CARRIER -> PRISM CITADEL.
- Each 24 second act has its own setpiece family, palette, timed Formation Rush windows and an ACT BREAK kill target.
- ACT BREAK restores GAS and one Turbo charge, so aggressive play directly funds survival and speed.
- Kills build a short score chain. Turbo kills score more and Formation Rush doubles kill score.
- The Prism Titan is forced into the field around 1:44, creating an arcade-style finale without removing free movement.

The implementation is deliberately a final decorator over the proven Turbo Hunt phase stack rather than a fork of the simulation. Turbo Hunt remains unchanged when `data-sky-dancer-mode` is not `sky-raid`.
