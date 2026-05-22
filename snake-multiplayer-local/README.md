# Snake Multiplayer Local

Juego web de Snake para desarrollo local, con registro por email y código, rankings guardados en archivos y modo 2 jugadores competitivo por turnos con espectador en vivo.

## Tecnologías

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
    ├── css/styles.css
    └── js/
        ├── app.js
        ├── auth.js
        ├── socket.js
        ├── snake.js
        ├── rankings.js
        └── ui.js
```

## Instalación

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

Buscá `Dirección IPv4`. Ejemplo:

```txt
http://192.168.1.45:3000
```

Si Windows Firewall pregunta, permití Node.js en redes privadas para que otros dispositivos puedan entrar.

## SMTP

Copiá `servidor/.env.example` a `servidor/.env` si querés enviar códigos reales por email:

```env
PORT=3000
SMTP_HOST=smtp.tuservidor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=clave
SMTP_FROM=Snake Local <usuario@tuservidor.com>
```

Si SMTP no está configurado, el sistema funciona igual en modo desarrollo: los códigos se muestran en la consola del servidor con una aclaración de desarrollo.

## Registro e inicio de sesión

El acceso no usa contraseñas.

1. El jugador ingresa su email.
2. El servidor genera un código numérico de 6 dígitos.
3. El código se guarda en `verificationCodes.json` y vence en 10 minutos.
4. Al verificarlo, se crea o inicia la sesión.
5. El navegador guarda `{ id, email }` en `localStorage`.

Validaciones incluidas: formato básico de email, códigos de 6 dígitos, expiración, usuarios duplicados, login de usuarios inexistentes y juego bloqueado sin sesión.

## Modo 1 jugador

El jugador entra desde el menú con `Jugar 1 jugador`. El Snake se renderiza en Canvas, acepta flechas, WASD y botones táctiles. Cada comida suma 10 puntos, la serpiente crece y la velocidad aumenta de forma leve. Al perder contra pared o contra sí misma, el score se guarda en `scores.json` y se actualizan los rankings.

## Modo 2 jugadores

El modo multiplayer es competitivo por turnos:

1. Jugador 1 crea una sala.
2. El servidor genera un código corto de 5 caracteres, como `K7A2P`.
3. Jugador 2 entra desde otro dispositivo o navegador con ese código.
4. Primero juega Jugador 1 y Jugador 2 mira como espectador en vivo.
5. Cuando Jugador 1 pierde, juega Jugador 2 y Jugador 1 pasa a espectador.
6. Al terminar Jugador 2, se comparan scores.
7. Se declara ganador o empate.
8. Se guardan ambos scores en `scores.json`.
9. Se registra la partida en `matches.txt`.

Las salas viven en memoria con `Map`, no en archivo. Si un jugador se desconecta o abandona antes de terminar, la sala se cancela, se avisa al rival y se registra la cancelación en `matches.txt`.

## Rankings

Los rankings salen de `servidor/data/scores.json`.

- `Top 3 personal`: mejores 3 scores del email logueado.
- `Top 10 general`: mejores 10 scores de todos los jugadores registrados en ese servidor local.

En desarrollo local, el `Top 10 general` corresponde únicamente a los jugadores y scores guardados en esa PC servidor.

## Persistencia

Archivos usados:

- `users.json`: usuarios verificados.
- `verificationCodes.json`: códigos temporales.
- `scores.json`: scores singleplayer y multiplayer.
- `matches.txt`: historial de partidas multiplayer finalizadas o canceladas.

El servidor crea automáticamente la carpeta `data` y los archivos si no existen. Si un JSON está vacío o corrupto, el servidor lo reinicia con `[]` para no romper la ejecución.

## Limitaciones de archivos

Este proyecto usa archivos para simplificar el desarrollo local. Es suficiente para pruebas y trabajos prácticos, pero no reemplaza una base de datos real para producción. Con muchos jugadores simultáneos podrían aparecer límites de concurrencia, historial grande y búsquedas lentas. Para producción convendría migrar persistencia y sesiones a una solución más robusta.

## Endpoints principales

- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/rankings/snake?email=jugador@gmail.com`
- `GET /api/health`
- `POST /api/scores/snake`

Socket.IO maneja creación de salas, unión por código, turnos, estado en vivo, desconexiones y finalización multiplayer.
