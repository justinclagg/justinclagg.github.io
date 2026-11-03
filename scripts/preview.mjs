import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/website/browser', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const notFound = await readFile(resolve(root, '404.html'));

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const path = resolve(root, '.' + pathname);

    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(404, { 'Content-Type': contentTypes['.html'] }).end(notFound);
      return;
    }

    const info = await stat(path);
    if (info.isDirectory() && !url.pathname.endsWith('/')) {
      response.writeHead(301, { Location: '/' + url.pathname.replace(/^\/+/, '') + '/' + url.search }).end();
      return;
    }

    const file = info.isDirectory() ? resolve(path, 'index.html') : path;
    const contents = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
    }).end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    if (error instanceof URIError || error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      response.writeHead(404, { 'Content-Type': contentTypes['.html'] }).end(notFound);
      return;
    }

    console.error(error);
    response.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving the static build at http://127.0.0.1:${port}/`);
});
