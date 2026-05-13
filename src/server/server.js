import { Server } from 'boardgame.io/server';
import path from 'path';
import serve from 'koa-static';
import { SanGuoSha } from '../lib/game';

const server = Server({ games: [SanGuoSha],
    origins: ['http://localhost:3000','http://localhost:8098'],
});
// const PORT = process.env.PORT;
const PORT = 25565;

// Build path relative to the server.js file
const frontEndAppBuildPath = path.resolve(__dirname, '../../build');
server.app.use(serve(frontEndAppBuildPath))

server.run(PORT, () => {
    server.app.use(
        async (ctx, next) => await serve(frontEndAppBuildPath)(
            Object.assign(ctx, { path: 'index.html' }),
            next
        )
    )
});
