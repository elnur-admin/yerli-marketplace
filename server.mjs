import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.png':'image/png' };
http.createServer((req,res)=>{ const url = decodeURIComponent(req.url.split('?')[0]); const file = path.join(root, url === '/' ? 'index.html' : url.replace(/^\//,'')); if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; } fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404);res.end('Not found');return;} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data); }); }).listen(4173,'127.0.0.1',()=>console.log('Yerli preview: http://127.0.0.1:4173'));
