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
        this.router.get("/validate", this.validarToken.bind(this));
    }


    async registrar(req, resp) {
        if (!req.body.email || !req.body.password) {
            return resp.status(400).json({ message: "Informações faltando na requisição" });
        }
        try {
            const user = await this.UserService.save(req.body);
            const token = this.JwtService.criarToken(req.body.email, user.id);
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
            return resp.status(404).json({ message: "Erro ao criar usuário" });
        }
    }

    validarToken(req, resp) {
        return resp.status(200).json({ message: "Token valido" });
    }

    async login(req, resp) {
        if (!req.body.email || !req.body.password){
            return resp.status(400).json({ message: "Informações requeridas não foram enviadas" });
        }
        try {
            const user = await this.UserService.login(req.body.password, req.body.email);
            const token = this.JwtService.criarToken(user.email, user.id, );
            return resp.status(200).json({
                email: user.email,
                token: token
            });
        } catch (e) {
            console.log(e);
            return resp.status(404).json({ message: e.message });
        }
    }
}

module.exports = UserController;