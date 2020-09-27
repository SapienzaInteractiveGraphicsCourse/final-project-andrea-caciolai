# Link's Training - Final Project for the Interactive Graphics course
 
_Made by Andrea Caciolai, Student ID 172906_.
 
## Theme
 
**Link's training** is an archery game realized as the final project for the course of Interactive Graphics, A.Y. 2019-2020, held by Professor Schaerf.
 
The player embodies Link, the main character of _The Legend of Zelda_ franchise. 

The goal of the game is to help Link master his archery skill.

His arrows are magical, so each time he hits the target, a new arrow respawns in his quiver. 
However, each time he misses the target, the arrow does not respawn, so you have at most three chances to miss, after which it is game over!

You cannot go too close to the target, so position yourself in a good spot, aim, and shoot. 

Remember, gravity matters!
 
## Instructions
 
- You can move with `WASD`, meaning
  - `W`: Forward.
  - `A`: Left.
  - `S`: Backward.
  - `D`: Right.
- You can control the camera with the mouse:
    - While in third person, you can orbit the camera around Link
    - You can switch to first person camera (and back) by pressing and releasing `Mouse2` (right click on mouse).
    - While in first person (aiming), you move the camera horizontally (and rotate Link in-place).
    - While in first perosn (aiming), you move the camera (and the bow) vertically.
- You can shoot with `Mouse1` (left click on mouse), specifically:
    - Press `Mouse1` and keep pressed to continue charging the shot.
    - Release `Mouse1` to shoot the charged arrow.
- You can pause the game with `ESC`, and resume by clicking anywhere on the screen.

## Documentation
Read the project's documentation and report [here](docs/report.pdf)


## Game link
Try the game on [GitHub Pages](https://sapienzainteractivegraphicscourse.github.io/final-project-andrea-caciolai/index.html).


## Known issue
- The pointer lock API does not handle smoothly pausing the game, it can happen that it will not let you pause and unpause right after. Just retry waiting a second or two.
- For the reason above, the game could be tricked into believing that it is not paused, and move Link around (usually to one of the corners of the map) without the player control.
- The arrow collision detection with the target is not perfect, it often happens that the arrow collides when in the vicinity of the target (while the reverse never happens).
- While in first person, if the camera is moved up by much, after a certain angle Link's right arm disappears. I believe this is a camera fov problem, but I were not able to find a good compromise.
- Others... The game was not tested extensively, please be patient if any other minor (or major...) issue or bug comes up!