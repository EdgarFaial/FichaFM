require('dotenv').config({
    path: '.env'
});

const express = require("express");
const path = require('path');
const fs = require('fs');
const cors = require("cors");

const conexao = require('./src/db');
const BcriptService = require('./src/BcriptService');
const JWTService = require('./src/JWTService');
const UserService = require('./src/UserService');
const UserController = require('./src/UserControler');

const port = process.env.PORT || 3000;
const host = '0.0.0.0';
const app = express();

// Initialize database connection
conexao(process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Services and controllers
const bcriptService = new BcriptService();
const jwtService = new JWTService(null, null, bcriptService);
const userService = new UserService(bcriptService);
const userController = new UserController(userService, jwtService);

// API routes
app.use('/api', userController.router);

// Google OAuth URL generation endpoint
app.get('/api/auth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.json({
            configured: false,
            message: 'GOOGLE_CLIENT_ID ainda não foi configurado nas variáveis de ambiente'
        });
    }

    const redirectUri = req.query.redirectUri || `${req.protocol}://${req.get('host')}/auth/callback`;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: String(redirectUri),
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.json({ configured: true, url });
});

// OAuth Popup callback route
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
        return res.send(`
            <!DOCTYPE html>
            <html><body><script>
            if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error || 'Nenhum código de autorização recebido'}' }, '*');
                window.close();
            } else { window.location.href = '/'; }
            </script><p>Erro na autenticação com Google. Fechando janela...</p></body></html>
        `);
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;

        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId || '',
                client_secret: clientSecret || '',
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResp.json();
        if (!tokenResp.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Falha ao trocar código do Google por token');
        }

        const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const googleUser = await userResp.json();

        const userEmail = googleUser.email || 'usuario-google@exemplo.com';
        const userId = googleUser.id || 'google-' + Date.now();
        const appToken = jwtService.criarToken(userEmail, userId);

        return res.send(`
            <!DOCTYPE html>
            <html><body><script>
            if (window.opener) {
                window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    token: '${appToken}',
                    email: '${userEmail}'
                }, '*');
                window.close();
            } else {
                localStorage.setItem('ficha_token', '${appToken}');
                localStorage.setItem('ficha_user_email', '${userEmail}');
                window.location.href = '/';
            }
            </script><p>Autenticação com Google realizada com sucesso! Fechando...</p></body></html>
        `);
    } catch (err) {
        console.error('Erro no callback do Google:', err);
        return res.send(`
            <!DOCTYPE html>
            <html><body><script>
            if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${encodeURIComponent(err.message)}' }, '*');
                window.close();
            } else { window.location.href = '/'; }
            </script><p>Erro ao autenticar com Google: ${err.message}</p></body></html>
        `);
    }
});

// Serve static frontend assets
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Mongoose / MongoDB offline graceful fallback middleware
app.use((err, req, res, next) => {
    if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
        console.warn('[AI Studio] Database offline — returning fallback');
        if (req.method === 'GET') {
            return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
        }
        return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
});

// SPA fallback
app.get('*', (req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Ficha FM - Client build in progress or not found. Please run build.');
    }
});

app.listen(port, host, () => {
    console.log(`Rodando em http://${host}:${port}`);
});