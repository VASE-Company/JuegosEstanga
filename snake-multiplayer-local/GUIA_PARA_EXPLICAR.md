# Guia para explicar Snake Multiplayer Local

Esta guia es para estudiar el proyecto y ubicar rapido cada parte del codigo. Si el profesor pregunta "donde esta tal cosa", busca el nombre de archivo y la funcion indicada con `Ctrl+F`.

## 1. Entrada del proyecto

- `servidor/server.js`: arranca el servidor importando la app real.
- `servidor/scripts/app.js`: servidor Express + Socket.IO. Sirve el cliente, guarda usuarios, codigos, puntajes y coordina el multijugador.
- `cliente/index.html`: estructura visual del juego: login, inicio, tablero, paneles, botones, modales, audio y scripts.
- `cliente/scripts/network/app.js`: controlador principal del navegador. Une botones, usuario, musica, fullscreen, SnakeGame y sockets.
- `cliente/scripts/game/snake.js`: motor del Snake. Calcula movimiento, choques, niveles, muros, score y dibujo en canvas.

## 2. Login por email y codigo

- Cliente:
  - `cliente/scripts/core/auth.js`
  - `requestCode(email, type)`: pide el codigo al servidor.
  - `verifyCode(email, code, type)`: verifica el codigo y guarda sesion.
  - `setCurrentUser(user)`: guarda usuario en `localStorage`.
  - `getCurrentUser()`: recupera el usuario cuando se recarga la pagina.
- Servidor:
  - `servidor/scripts/app.js`
  - Ruta `POST /api/auth/request-code`: crea codigo de 6 digitos.
  - Ruta `POST /api/auth/verify-code`: valida codigo y crea usuario si era registro.
  - `sendVerificationCode(...)`: manda mail si hay SMTP; si no, muestra el codigo por consola.

## 3. Modo claro y oscuro

- HTML: boton `themeToggle` en `cliente/index.html`.
- JS:
  - `cliente/scripts/network/app.js`: listener del boton de tema.
  - `cliente/scripts/core/ui.js`: `applyTheme(theme)`.
- CSS:
  - `cliente/styles/base.css`: variables en `:root` y cambios en `body.dark`.
- Persistencia:
  - Se guarda en `localStorage` con la clave `snakeTheme`.

## 4. Musica

- HTML:
  - `cliente/index.html`: `<audio id="gameMusic" ... game-theme.mp3>`.
- Asset:
  - `cliente/assets/julian-trophy-hunter/audio/game-theme.mp3`.
- JS:
  - `cliente/scripts/network/app.js`: `toggleMusic()`.
  - `cliente/scripts/core/ui.js`: `setMusicState(isPlaying)`.
- Explicacion:
  - El boton "Escuchar" llama `gameMusic.play()`.
  - El boton "Mutear" llama `gameMusic.pause()`.
  - Hay `try/catch` porque algunos navegadores bloquean audio hasta que el usuario toca un boton.

## 5. Pantalla completa

- HTML:
  - Boton global `fullscreenToggle`.
  - Boton dentro del juego `gameFullscreenBtn`.
- JS:
  - `cliente/scripts/network/app.js`: `toggleFullscreen()` entra o sale de fullscreen.
  - `updateFullscreenButton()` sincroniza textos si el usuario sale con `Esc`.
  - `cliente/scripts/core/ui.js`: `setFullscreenState(isFullscreen)`.
- CSS:
  - `cliente/styles/base.css`: reglas `.app-shell:fullscreen` y `:-webkit-full-screen`.

## 6. Pantalla de inicio

- HTML:
  - `cliente/index.html`, seccion `dashboardView`.
  - Botones: `singleBtn`, `createRoomBtn`, `joinRoomBtn`, `howToPlayBtn`.
  - Imagen principal: `home_player_reference.png`.
- CSS:
  - `cliente/styles/base.css`, bloque `dashboard-home`, `home-stage`, `home-player-art`, `home-rankings`, `home-banner`.
- JS:
  - `cliente/scripts/network/app.js`: `showDashboard()`, `startSingleplayer()`, crear/unirse a sala e instrucciones.

## 7. Motor de la serpiente

- Archivo principal: `cliente/scripts/game/snake.js`.
- Constantes importantes:
  - `BASE_TICK_MS`: velocidad inicial lenta.
  - `MIN_TICK_MS`: limite maximo de velocidad.
  - `LEVEL_SCORE_STEP`: cada 50 puntos sube nivel.
  - `MAX_LEVEL`: maximo 5 niveles.
  - `COMPLETION_SCORE`: score para completar todos los niveles.
  - `HEAD_SCALE_INSET`: hace mas grande la cabeza de Julian.
  - `TROPHY_GROWTH`: controla cuanto se alarga al agarrar un trofeo.
- Clase principal:
  - `SnakeGame`.
- Funciones clave:
  - `reset()`: reinicia partida.
  - `start()`: arranca el juego.
  - `setDirection(direction)`: cambia direccion.
  - `step()`: ejecuta un movimiento completo.
  - `hitWall`, `hitSelf`, `hitObstacle`: choques.
  - `createFood()`: crea trofeos.
  - `createObstacles()`: crea muros.
  - `draw()`: dibuja todo.
  - `drawHead()`: dibuja la cabeza de Julian.
  - `drawSmoothScarf()`: dibuja el cuerpo como bufanda.
  - `getRenderSnake()`: suaviza el movimiento interpolando posiciones.

## 8. Niveles y muros

- Archivo: `cliente/scripts/game/snake.js`.
- `levelFromScore(score)`: calcula nivel segun puntaje.
- `tickMsForLevel(level)`: hace mas rapido cada nivel.
- `updateObstacles()`: recalcula muros al subir de nivel.
- `createObstacles(count)`: ubica muros aleatorios sin tapar serpiente, trofeo ni zona inicial.
- En `step()`:
  - Si come trofeo, suma 10 puntos.
  - Si cruza un multiple de 50, sube nivel.
  - Si llega al score de 5 niveles, llama `onGameComplete`.

## 9. Score, rankings y guardado

- Cliente:
  - `cliente/scripts/core/rankings.js`
  - `fetchRankings(email)`: trae Top 3 personal y Top 10 general.
  - `saveSingleplayerScore(email, score)`: guarda partida individual.
  - `renderRanking(list, scores, emptyText)`: pinta rankings en pantalla.
- Servidor:
  - `servidor/scripts/app.js`
  - `saveScore(scoreData)`: guarda en `scores.json`.
  - `getTop3UserScores(email)`.
  - `getTop10GeneralScores()`.
- Datos:
  - `servidor/scripts/data/scores.json`.
  - `servidor/scripts/data/users.json`.
  - `servidor/scripts/data/matches.txt`.

## 10. Multijugador local

- Cliente:
  - `cliente/scripts/network/socket.js`: wrappers de Socket.IO.
  - `createRoom(user)`: crea sala.
  - `joinRoom(user, codigo)`: se une a sala.
  - `sendSnakeState(codigo, state)`: manda estado del jugador activo.
  - `finishTurn(codigo, score)`: cierra turno.
- Controlador:
  - `cliente/scripts/network/app.js`
  - `startActiveMultiplayerTurn(room)`: juega el usuario.
  - `startSpectator(room, message)`: mira el turno del rival.
  - `updatePlayerPanel(room)`: muestra "Vos" y "Jugador".
- Servidor:
  - `servidor/scripts/app.js`
  - Evento `crear-partida-snake`.
  - Evento `unirse-partida-snake`.
  - Evento `estado-snake`.
  - Evento `finalizar-turno-snake`.
  - Evento `partida-finalizada-snake`.
- Explicacion:
  - Juega primero `jugador1`.
  - `jugador2` ve el estado en vivo.
  - Cuando termina `jugador1`, juega `jugador2`.
  - Al final se comparan scores y se guardan ambos.

## 11. Controles de PC y celular

- PC:
  - `cliente/scripts/network/app.js`: `keydown`.
  - Flechas, WASD y tecla `P` para pausa.
- Celular:
  - `cliente/index.html`: botones con `data-direction`.
  - `cliente/scripts/network/app.js`: listener de `pointerdown`, `touchstart` y `click`.
  - `cliente/styles/base.css`: `.game-controls`, `.control` y media queries.
- Celular horizontal:
  - `cliente/styles/base.css`: media query `(orientation: landscape)`.

## 12. Pausa y mensajes temporales

- `cliente/scripts/network/app.js`:
  - `togglePause()`: pausa o reanuda.
  - `setPauseButton(...)`: cambia texto del boton.
  - `showTemporaryStatus(...)`: mensajes que duran 2 segundos.
  - `setPersistentStatus(...)`: mensaje fijo, usado para pausa.
- `cliente/scripts/core/ui.js`:
  - `setGameStatus(text)`: muestra u oculta el texto sobre el mapa.

## 13. Imagenes y sprites

- Atlas:
  - `cliente/assets/julian-trophy-hunter/sprites.json`.
- En el motor:
  - `loadSprites()`: precarga todas las imagenes.
  - `getImage(path)`: obtiene una imagen por ruta del atlas.
- Imagenes principales:
  - Cabezas: `assets/julian-trophy-hunter/heads/head_*.png`.
  - Trofeos: `assets/julian-trophy-hunter/trophies/*.png`.
  - Mapa: `assets/julian-trophy-hunter/map/field.png`.
  - Inicio: `assets/julian-trophy-hunter/branding/home_player_reference.png`.
  - Flechas: `assets/julian-trophy-hunter/ui/dpad_*.png`.

## 14. Como explicarlo rapido

1. "El HTML define las pantallas y botones."
2. "app.js escucha esos botones y decide si mostrar login, menu o juego."
3. "SnakeGame en snake.js es el motor: mueve, choca, suma score y dibuja."
4. "El servidor guarda usuarios y puntajes en archivos JSON."
5. "Socket.IO permite que dos jugadores compartan sala y se vean por turnos."
6. "El modo oscuro es una clase en body; la musica es un audio HTML controlado por JS."
7. "El responsive esta en CSS con media queries para celular vertical y horizontal."
