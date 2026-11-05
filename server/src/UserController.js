const express = require('express');

class UserController {
    constructor(UserService, JwtService) {
        this.UserService = UserService;
        this.JwtService = JwtService;
        this.router = express.Router();
        this.registrarRotas();
    }

    registrarRotas() {
        this.router.post("/register", this.registrar.bind(this));
        this.router.post("/login", this.login.bind(this));
        this.router.post("/google-login", this.googleLogin.bind(this));
        this.router.get("/validate", this.JwtService.validar.bind(this.JwtService), this.validarToken.bind(this));
    }

    async googleLogin(req, resp) {
        const email = req.body.email;
        if (!email) {
            return resp.status(400).json({ message: "E-mail do Google não informado" });
        }
        try {
            const token = this.JwtService.criarToken(email, req.body.googleId || 'google-user');
            return resp.status(200).json({
                email: email,
                token: token
            });
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao autenticar com Google: " + e.message });
        }
    }

    async registrar(req, resp) {
        const { email, password, senha } = req.body;
        const pass = password || senha;

        if (!email || !pass) {
            return resp.status(400).json({ message: "E-mail e senha são obrigatórios" });
        }
        try {
            const user = await this.UserService.save({ email, password: pass });
            const token = this.JwtService.criarToken(user.email, user._id);
            return resp.status(201).json({
                email: user.email,
                token: token
            });
        } catch (e) {
            if (e.message === "Email já cadastrado") {
                return resp.status(409).json({ message: e.message });
            }
            console.error("Erro ao tentar criar novo usuário: " + e.message);
            return resp.status(500).json({ message: "Erro ao criar usuário: " + e.message });
        }
    }

    async login(req, resp) {
        const { email, password, senha } = req.body;
        const pass = password || senha;

        if (!email || !pass) {
            return resp.status(400).json({ message: "E-mail e senha são obrigatórios" });
        }
        try {
            const user = await this.UserService.login(pass, email);
            const token = this.JwtService.criarToken(user.email, user._id);
            return resp.status(200).json({
                email: user.email,
                token: token
            });
        } catch (e) {
            return resp.status(401).json({ message: e.message });
        }
    }
    async validarToken(req, resp) {
        // Se chegou aqui, o middleware JwtService.validar já aprovou o token
        return resp.status(200).json({ valid: true, user: req.user });
    }
}

module.exports = UserController;