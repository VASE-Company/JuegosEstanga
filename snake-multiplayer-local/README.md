# Snake Multiplayer Local

Juego web de Snake para desarrollo local, con registro por email y cÃ³digo, rankings guardados en archivos y modo 2 jugadores competitivo por turnos con espectador en vivo.

## TecnologÃ­as

- Node.js
- Express
- Socket.IO
- fs/promises
- path
- crypto
- nodemailer y dotenv
- HTML5, CSS3 responsive y JavaScript vanilla
- Canvas para renderizar Snake

No usa base de datos, React, Next.js, MongoDB, MySQL, Firebase ni servicios externos obligatorios.

## Estructura

```txt
snake-multiplayer-local/
|-- servidor/
|   |-- server.js
|   |-- package.json
|   |-- .env.example
|   |-- data/
|   |   |-- users.json
|   |   |-- scores.json
|   |   |-- verificationCodes.json
|   |   `-- matches.txt
|   `-- scripts/
|       |-- app.js
|       |-- data/
|       |   |-- liveScores.json
|       |   |-- users.json
|       |   |-- scores.json
|       |   |-- verificationCodes.json
|       |   `-- matches.txt
|       |-- game/
|       |   `-- levels.js
|       `-- lib/
|           |-- storage.js
|           `-- validation.js
`-- cliente/
    |-- index.html
    |-- rankings/
    |   `-- index.html
    |-- scripts/
    |   |-- core/
    |   |   |-- auth.js
    |   |   |-- rankings.js
    |   |   `-- ui.js
    |   |-- game/
    |   |   `-- snake.js
    |   |-- network/
    |   |   |-- app.js
    |   |   `-- socket.js
    |   `-- pages/
    |       `-- rankings-page.js
    `-- styles/
        |-- base.css
        |-- game.css
        |-- layout.css
        |-- modals.css
        |-- rankings.css
        `-- responsive.css
```

## InstalaciÃ³n

Desde la carpeta del proyecto:

```bash
cd servidor
npm install
npm run dev
```

El servidor escucha en `0.0.0.0` y levanta el sitio en el puerto `3000`.

## Abrir el juego

Desde la PC que corre el servidor:

```txt
http://localhost:3000
```

Desde otro celular, tablet o PC en la misma red WiFi:

```txt
http://IP-DE-LA-PC:3000
```

En Windows, para obtener la IP local:

```bash
ipconfig
```

BuscÃ¡ `DirecciÃ³n IPv4`. Ejemplo:

```txt
http://192.168.1.45:3000
```

Si Windows Firewall pregunta, permitÃ­ Node.js en redes privadas para que otros dispositivos puedan entrar.

## SMTP

CopiÃ¡ `servidor/.env.example` a `servidor/.env` si querÃ©s enviar cÃ³digos reales por email:

```env
PORT=3000
SMTP_HOST=smtp.tuservidor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=clave
SMTP_FROM=Snake Local <usuario@tuservidor.com>
```

Si SMTP no estÃ¡ configurado, el sistema funciona igual en modo desarrollo: los cÃ³digos se muestran en la consola del servidor con una aclaraciÃ³n de desarrollo.

## Registro e inicio de sesiÃ³n

El acceso no usa contraseÃ±as.

1. El jugador ingresa su email.
2. El servidor genera un cÃ³digo numÃ©rico de 6 dÃ­gitos.
3. El cÃ³digo se guarda en `verificationCodes.json` y vence en 10 minutos.
4. Al verificarlo, se crea o inicia la sesiÃ³n.
5. El navegador guarda `{ id, email }` en `localStorage`.

Validaciones incluidas: formato bÃ¡sico de email, cÃ³digos de 6 dÃ­gitos, expiraciÃ³n, usuarios duplicados, login de usuarios inexistentes y juego bloqueado sin sesiÃ³n.

## Como jugar

- Objetivo: juntar trofeos, sumar puntos y esquivar paredes, muros y el propio cuerpo.
- En computadora: usar flechas o WASD para moverse. La tecla P pausa o reanuda.
- En celular: usar los botones de direccion que aparecen debajo del tablero.
- Cada trofeo suma 10 puntos. Cada 50 puntos se sube de nivel.
- El juego tiene 5 niveles. En cada nivel aumenta la velocidad y aparecen mas obstaculos.
- Si se completan todos los niveles, se gana la partida y el score se guarda.
- En multijugador, un jugador crea la sala y otro entra con codigo. Juegan por turnos y gana el mayor puntaje.
- Desde los botones superiores se puede cambiar claro/oscuro, activar o mutear musica y usar pantalla completa.

## Modo 1 jugador

El jugador entra desde el menÃº con `Jugar 1 jugador`. El Snake se renderiza en Canvas, acepta flechas, WASD y botones tÃ¡ctiles. Cada trofeo suma 10 puntos, cada 50 puntos sube el nivel y la velocidad aumenta hasta completar 5 niveles. Al perder contra pared, muro o contra sÃ­ misma, el score se guarda en `scores.json` y se actualizan los rankings.

## Modo 2 jugadores

El modo multiplayer es competitivo por turnos:

1. Jugador 1 crea una sala.
2. El servidor genera un cÃ³digo corto de 5 caracteres, como `K7A2P`.
3. Jugador 2 entra desde otro dispositivo o navegador con ese cÃ³digo.
4. Primero juega Jugador 1 y Jugador 2 mira como espectador en vivo.
5. Cuando Jugador 1 pierde, juega Jugador 2 y Jugador 1 pasa a espectador.
6. Al terminar Jugador 2, se comparan scores.
7. Se declara ganador o empate.
8. Se guardan ambos scores en `scores.json`.
9. Se registra la partida en `matches.txt`.

Las salas viven en memoria con `Map`, no en archivo. Si un jugador se desconecta o abandona antes de terminar, la sala se cancela, se avisa al rival y se registra la cancelaciÃ³n en `matches.txt`.

## Rankings

Los rankings salen de `servidor/scripts/data/scores.json`.

- `Top 3 personal`: mejores 3 scores del email logueado.
- `Top 10 general`: mejores 10 scores de todos los jugadores registrados en ese servidor local.

En desarrollo local, el `Top 10 general` corresponde Ãºnicamente a los jugadores y scores guardados en esa PC servidor.

## Persistencia

Archivos usados:

- `users.json`: usuarios verificados.
- `verificationCodes.json`: cÃ³digos temporales.
- `scores.json`: scores singleplayer y multiplayer.
- `matches.txt`: historial de partidas multiplayer finalizadas o canceladas.

El servidor crea automÃ¡ticamente la carpeta `data` y los archivos si no existen. Si un JSON estÃ¡ vacÃ­o o corrupto, el servidor lo reinicia con `[]` para no romper la ejecuciÃ³n.

## Limitaciones de archivos

Este proyecto usa archivos para simplificar el desarrollo local. Es suficiente para pruebas y trabajos prÃ¡cticos, pero no reemplaza una base de datos real para producciÃ³n. Con muchos jugadores simultÃ¡neos podrÃ­an aparecer lÃ­mites de concurrencia, historial grande y bÃºsquedas lentas. Para producciÃ³n convendrÃ­a migrar persistencia y sesiones a una soluciÃ³n mÃ¡s robusta.

## Endpoints principales

- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/rankings/snake?email=jugador@gmail.com`
- `GET /api/health`
- `POST /api/scores/snake`

Socket.IO maneja creaciÃ³n de salas, uniÃ³n por cÃ³digo, turnos, estado en vivo, desconexiones y finalizaciÃ³n multiplayer.
