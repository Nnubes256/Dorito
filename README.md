# Dorito
A modloader for CrossCode(and maybe other JS games).

--------

## Installation
#### CrossCode
This tutorial requires you to extract the game. Search the CrossCode forum for more details.

1. Replace the node-webkit.html file with `dist/node-webkit-dorito.html`(be sure to rename the replacement file back to `node-webkit.html`!!!).
2. Run the game. Dorito will create the addon folder at the NW.js dataPath(varies with OS, see [here](https://github.com/nwjs/nw.js/wiki/App#datapath)), and ask you to restart the game.
3. Place addons at *dataPath*/addons .
4. Have fun.

TODO: write more

## Library requirements
* A ES6-compilant environment **OR** a ES6 Promises polyfill(the one used in the distribution is `calvinmetcalf/lie`).
* `millermedeiros/js-signals`

## License
Licensed under the MIT license. See `LICENSE` for more details.
