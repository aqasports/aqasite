/**
 * Simple Deploy Server
 * Handles deployment requests from AQA Manager
 * Run: node deploy-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const HOST = '0.0.0.0';
const PROJECT_DIR = __dirname;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/deploy' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                if (!data.groupes || !data.inscrip) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Missing files data' 
                    }));
                    return;
                }

                // Write groupes.html
                fs.writeFileSync(
                    path.join(PROJECT_DIR, 'groupes.html'),
                    data.groupes,
                    'utf8'
                );

                // Write inscription.html
                fs.writeFileSync(
                    path.join(PROJECT_DIR, 'inscription.html'),
                    data.inscrip,
                    'utf8'
                );

                // Execute auto_git.py
                exec(`cd "${PROJECT_DIR}" && python auto_git.py`, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Git error:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            message: 'Git operation failed: ' + stderr
                        }));
                        return;
                    }

                    console.log('✅ Deployment successful!');
                    console.log(stdout);
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Deployment successful',
                        timestamp: new Date().toISOString()
                    }));
                });

            } catch (e) {
                console.error('Error:', e.message);
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    message: e.message
                }));
            }
        });
        return;
    }

        // Health endpoint for quick checks
        if (req.url === '/' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'deploy-server OK' }));
            return;
        }

        // Default response
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'Not found' }));
});

server.listen(PORT, HOST, () => {
    console.log(`✅ Deploy Server running on http://${HOST}:${PORT}`);
    console.log(`📍 Endpoint: POST http://${HOST}:${PORT}/deploy`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Heartbeat so we can see the process is alive in logs
setInterval(() => {
    console.log(new Date().toISOString() + ' - deploy-server heartbeat');
}, 15000);
