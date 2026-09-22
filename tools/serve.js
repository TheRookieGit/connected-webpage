#!/usr/bin/env node
// Zero-dependency local preview server: node tools/serve.js [port] [root-dir]
// Serves the repo root (or root-dir); /foo resolves to foo.html and /dir/ to dir/index.html,
// matching how pretty-URL static hosts behave.

const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon'
};

function serve(root, port, label = 'Preview') {
    root = path.resolve(root);
    const resolve = (urlPath) => {
        const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
        const base = path.join(root, clean);
        if (!base.startsWith(root)) return null;
        const candidates = [base, base + '.html', path.join(base, 'index.html')];
        return candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
    };

    return http.createServer((req, res) => {
        const file = resolve(new URL(req.url, 'http://localhost').pathname);
        if (!file) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    }).listen(port, () => console.log(`${label}: http://localhost:${port}`));
}

module.exports = serve;

if (require.main === module) {
    serve(process.argv[3] || path.join(__dirname, '..'), Number(process.argv[2] || process.env.PORT || 8000));
}
