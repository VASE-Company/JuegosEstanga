# Gameplay y Socket.IO en Pac-Man y Snake

Este documento explica cómo funciona la jugabilidad y cómo viajan los datos entre cliente y servidor en ambos juegos.

## 1. Pac-Man

### Flujo de juego

1. El usuario inicia sesión.
2. Elige modo individual o multijugador.
3. El juego carga nivel, mapa, HUD, audio y sprites.
4. Pac-Man y los fantasmas se mueven sobre la grilla.
5. El servidor o el motor local calculan colisiones, puntaje, vidas y cambio de nivel.
6. Al terminar la partida, el score se guarda y se actualiza el ranking.

### Qué ve el jugador

- Puntaje.
- Vidas.
- Nivel actual.
- Mensajes de pausa, victoria o derrota.
- Menú in-game con ayuda, configuración, pausa y salida.
- Controles táctiles en celular.

### Cómo se mueve Pac-Man

- En desktop se usan flechas o WASD.
- En celular se usan botones táctiles.
- La lógica de teclado evita interferir cuando el usuario está escribiendo en inputs.

### Cómo se comportan los fantasmas

- Los fantasmas persiguen a Pac-Man con IA simple.
- Tienen salida escalonada.
- Cuando Pac-Man usa poder, pasan a modo vulnerable.
- Al volver a aparecer después de una pérdida de vida, también salen escalonados.

### Pac-Man y Socket.IO

El juego usa Socket.IO para el modo multijugador local. El flujo principal es:

- `crear-partida-pacman`: crea una sala.
- `unirse-partida-pacman`: entra a una sala existente.
- `iniciar-partida-pacman`: arranca la partida.
- `input-pacman`: manda la dirección del jugador al servidor.
- `partida-iniciada-pacman`: avisa al cliente que ya puede jugar.
- `game-state-pacman`: sincroniza el estado vivo.
- `nivel-completado-pacman`: anuncia el cambio de nivel.
- `partida-finalizada-pacman`: cierra la partida y actualiza rankings.

### Qué hace el servidor en Pac-Man

- Valida usuarios y salas.
- Decide quién es host.
- Calcula colisiones y puntos.
- Controla vidas y resultados.
- Guarda scores en `scores.json`.
- Publica snapshots vivos de la partida.

### Guardado de puntaje

- En singleplayer se guarda el resultado final.
- En multiplayer se registran ambos jugadores.
- El score queda en archivos del servidor local.

## 2. Snake

### Flujo de juego

1. El usuario inicia sesión.
2. Entra a Snake individual o a una sala multijugador.
3. Se carga el tablero, el jugador, el rival y el HUD.
4. El Snake avanza, come trofeos, gana puntos y sube de nivel.
5. En multijugador, cada jugador juega su turno y el servidor compara resultados.
6. El puntaje se guarda al final.

### Qué ve el jugador

- Score.
- Nivel.
- Mensajes de estado.
- Botones de pausa, música, pantalla completa y navegación.
- Rankings y perfil.

### Movimiento y jugabilidad

- Flechas o WASD en desktop.
- Botones táctiles en celular.
- Pausa con botón o teclado.
- Música on/off.
- Cambio de nivel por score.

### Snake y Socket.IO

Socket.IO se usa como transporte de salas y turnos. Los eventos principales son:

- `crear-partida-snake`
- `unirse-partida-snake`
- `estado-snake`
- `finalizar-turno-snake`
- `partida-finalizada-snake`
- `pedir-rankings-snake`

### Qué hace el servidor en Snake

- Verifica sesión y usuario.
- Crea salas.
- Decide quién juega primero.
- Recibe el estado del turno.
- Guarda el score del turno.
- Pasa el control al siguiente jugador.
- Cierra la partida cuando ambos terminaron.

### Diferencia importante con Pac-Man

- **Pac-Man** es de estado vivo continuo: el servidor va sincronizando una partida en curso.
- **Snake** es más de turnos: un jugador juega, luego el otro, y al final se comparan resultados.

## 3. Tecnología compartida

Ambos juegos comparten ideas parecidas:

- Login por email y código.
- Persistencia local en archivos.
- Rankings por usuario y general.
- Tema claro/oscuro.
- Música controlable.
- Responsive para compu y celu.
- Comentarios humanos en partes clave del código.

## 4. Qué contar si te lo preguntan en clase

### Pac-Man

- “El cliente solo manda intención de movimiento; el servidor decide el estado real.”
- “Los fantasmas salen escalonados y el HUD muestra vidas, score y nivel.”
- “El multijugador local funciona con Socket.IO y salas por código.”

### Snake

- “Cada turno se sincroniza por Socket.IO.”
- “El servidor guarda el puntaje y después compara a los jugadores.”
- “Hay soporte para teclado, celular, música y pausa.”

## 5. Archivos clave para ubicar rápido

### Pac-Man

- `pacman-multiplayer-local/cliente/index.html`
- `pacman-multiplayer-local/cliente/scripts/game/pacman-core.js`
- `pacman-multiplayer-local/cliente/scripts/game/pacman-flow.js`
- `pacman-multiplayer-local/cliente/scripts/network/socket.js`
- `pacman-multiplayer-local/servidor/scripts/app.js`

### Snake

- `snake-multiplayer-local/cliente/index.html`
- `snake-multiplayer-local/cliente/scripts/network/app.js`
- `snake-multiplayer-local/cliente/scripts/network/socket.js`
- `snake-multiplayer-local/cliente/scripts/game/snake.js`
- `snake-multiplayer-local/servidor/scripts/app.js`

## 6. Cierre

La idea central de ambos juegos es la misma: una interfaz clara en el cliente, una lógica confiable en el servidor y Socket.IO para mantener sincronizada la partida o el turno.
Eso hace que se puedan jugar en compu o celu, en local o en red, con puntaje guardado y una estructura fácil de explicar.
