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
        this.router.get("/validate", this.validarToken.bind(this));
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
        const email = req.body.email;
        const password = req.body.password || req.body.senha;
        if (!email || !password) {
            return resp.status(400).json({ message: "Informações faltando na requisição" });
        }
        try {
            const user = await this.UserService.save({ email, password });
            const token = this.JwtService.criarToken(email, user._id || user.id);
            return resp.status(201).json({
                email: user.email,
                token: token
            });
        } catch (e) {
            if (e.code == 11000) {
                console.error("EMAIL JA REGISTRADO");
                return resp.status(409).json({ message: "Erro ao fazer o registro" });
            }
            console.error("erro ao tentar criar novo user: " + e.message);
            return resp.status(500).json({ message: "Erro ao criar usuário: " + e.message });
        }
    }

    validarToken(req, resp) {
        return resp.status(200).json({ message: "Token valido" });
    }

    async login(req, resp) {
        const email = req.body.email;
        const password = req.body.password || req.body.senha;
        if (!email || !password) {
            return resp.status(400).json({ message: "Informações requeridas não foram enviadas" });
        }
        try {
            const user = await this.UserService.login(password, email);
            const token = this.JwtService.criarToken(user.email, user._id || user.id);
            return resp.status(200).json({
                email: user.email,
                token: token
            });
        } catch (e) {
            console.log(e);
            return resp.status(401).json({ message: e.message });
        }
    }
}

module.exports = UserController;