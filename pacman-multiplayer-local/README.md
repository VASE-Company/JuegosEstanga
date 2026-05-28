# Laberinto Arcade / Pac-Man Web

Proyecto web local inspirado en los juegos clasicos de laberinto. No usa sprites, logos, sonidos ni assets originales con copyright: todo se dibuja con Canvas y estilos propios.

## Tecnologias

- JavaScript
- Node.js
- Express
- Socket.IO
- HTML
- CSS
- Canvas
- `fs` / `fs.promises`
- `dotenv`
- `nodemailer` opcional para SMTP

No usa base de datos, React, Next.js, MongoDB, MySQL, Firebase ni frameworks frontend pesados.

## Instalacion

Desde la carpeta del proyecto:

```bash
cd servidor
npm install
npm run dev
```

El servidor queda escuchando en `0.0.0.0:3000`.

Desde la PC servidor:

```text
http://localhost:3000
```

Desde otro dispositivo en la misma red WiFi:

```text
http://IP-DE-LA-PC:3000
```

## Obtener la IP local en Windows

Abrir una terminal y ejecutar:

```bash
ipconfig
```

Buscar el adaptador WiFi y copiar la direccion `IPv4`, por ejemplo `192.168.1.34`. En el celular o tablet abrir:

```text
http://192.168.1.34:3000
```

## SMTP y codigos de acceso

Copiar `.env.example` como `.env` dentro de `servidor/` si se quiere configurar envio real de emails:

```env
PORT=3000
SMTP_HOST=smtp.tuservidor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=clave
SMTP_FROM=Laberinto Arcade <usuario@tuservidor.com>
```

Si SMTP no esta configurado, el servidor imprime el codigo en consola:

```text
[DEV] Codigo register para jugador@gmail.com: 123456
```

## Login y registro

El usuario debe estar registrado e iniciado sesion para jugar, crear salas o unirse a salas.

Flujo:

1. Ingresar email.
2. Pedir codigo de registro o login.
3. Revisar email o consola del servidor.
4. Ingresar codigo de 6 digitos.
5. El navegador guarda `id` y `email` en `localStorage`.

No se usan contrasenas.

## Modos de juego

### 1 jugador como Pac-Man

El jugador controla el personaje circular con flechas, WASD o botones tactiles. Los fantasmas son bots que persiguen, evitan paredes y se alejan cuando estan vulnerables. El objetivo es comer todos los puntos, sobrevivir y completar los 5 niveles.

### 1 jugador como Fantasma

El jugador controla un fantasma. El Pac-Man es bot: busca puntos cercanos e intenta evitar fantasmas peligrosos. El objetivo es atraparlo antes de que limpie el nivel.

### Multijugador local simultaneo

Una PC corre el servidor y los jugadores entran desde navegadores conectados a la misma red.

- Minimo 2 jugadores: 1 Pac-Man y 1 fantasma.
- Maximo 6 jugadores: 1 Pac-Man y hasta 5 fantasmas.
- Las salas usan codigo corto tipo `K7A2P`.
- El creador elige nivel inicial, rol, maximo de fantasmas humanos y si se permiten bots.
- La partida no empieza hasta que haya Pac-Man y al menos un fantasma humano.

## Servidor autoritativo

En multiplayer el cliente solo envia intencion de movimiento:

```js
{ codigo: "K7A2P", direction: "up" }
```

El servidor calcula posiciones, paredes, colisiones, puntos, poderes, vidas, cambio de nivel, ganador y scores. Todos los clientes reciben el mismo `gameState`.

## Lobby

El lobby muestra:

- Codigo de sala.
- Jugador Pac-Man.
- Lista de fantasmas.
- Nivel inicial.
- Maximo de fantasmas humanos.
- Estado de preparacion.
- Boton iniciar solo para el host.

Mensajes posibles:

- `Falta un Pac-Man.`
- `Falta al menos un fantasma.`
- `La partida ya puede iniciar.`

## Niveles

Hay 5 mapas reales en `cliente/js/levels.js` y una copia en el servidor para multiplayer:

1. Inicio: mapa simple, baja velocidad.
2. Cruces: mas intersecciones y fantasmas algo mas rapidos.
3. Tuneles: mas pasillos y rutas de escape ajustadas.
4. Presion: mapa complejo, menos poderes.
5. Final: mayor velocidad y hasta 5 fantasmas.

Caracteres de mapa:

- `#`: pared
- `.`: punto chico
- `o`: poder especial
- `P`: inicio de Pac-Man
- `G`: inicio de fantasma
- espacio: camino vacio

## Rankings

Los scores se guardan en `servidor/data/scores.json`.

La pantalla principal muestra:

- Top 3 personal: mejores scores del email logueado.
- Top 10 general: mejores scores de todos los usuarios registrados en ese servidor local.

En desarrollo local, el Top 10 general corresponde solamente a los datos de esa PC servidor.

## Archivos de datos

El servidor crea automaticamente estos archivos si no existen:

- `servidor/data/users.json`
- `servidor/data/scores.json`
- `servidor/data/verificationCodes.json`
- `servidor/data/matches.txt`

Si un JSON esta vacio o corrupto, el servidor lo reinicia como `[]` para no romper el arranque.

## Limitaciones de usar archivos

Este proyecto esta pensado para desarrollo local y entrega escolar. Guardar datos en JSON es simple y transparente, pero no tiene las garantias de una base de datos real para alta concurrencia, consultas complejas o despliegues en produccion.

## Estructura

```text
pacman-multiplayer-local/
├── servidor/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── data/
│       ├── users.json
│       ├── scores.json
│       ├── verificationCodes.json
│       └── matches.txt
└── cliente/
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js
        ├── auth.js
        ├── socket.js
        ├── pacman.js
        ├── levels.js
        ├── bots.js
        ├── rankings.js
        └── ui.js
```

## Endpoints

- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/rankings/pacman?email=jugador@gmail.com`
- `GET /api/health`
- `POST /api/scores/pacman`

## Eventos Socket.IO

Cliente a servidor:

- `crear-partida-pacman`
- `unirse-partida-pacman`
- `salir-lobby-pacman`
- `iniciar-partida-pacman`
- `input-pacman`
- `abandonar-partida-pacman`
- `pedir-rankings`

Servidor a cliente:

- `partida-creada-pacman`
- `lobby-actualizado-pacman`
- `jugador-unido-pacman`
- `partida-iniciada-pacman`
- `game-state-pacman`
- `nivel-completado-pacman`
- `partida-finalizada-pacman`
- `rival-desconectado-pacman`
- `error-partida`
- `rankings-actualizados`
