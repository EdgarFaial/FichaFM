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
const UserController = require('./src/UserController');

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

app.listen(port, host, () => {
    console.log(`Rodando em http://${host}:${port}`);
});