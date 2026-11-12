const express = require('express');
const { randomUUID } = require('crypto');

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

        // ---------- CRUD de Fichas (CharacterSheet) ----------
        const auth = this.JwtService.validar.bind(this.JwtService);
        this.router.get   ("/fichas",              auth, this.listarFichas.bind(this));
        this.router.get   ("/fichas/:fichaId",     auth, this.buscarFicha.bind(this));
        this.router.post  ("/fichas",              auth, this.criarFicha.bind(this));
        this.router.put   ("/fichas/:fichaId",     auth, this.atualizarFicha.bind(this));
        this.router.delete("/fichas/:fichaId",     auth, this.removerFicha.bind(this));
    }

    // ---------- Auth (inalterado) ----------
    async googleLogin(req, resp) {
        const email = req.body.email;
        if (!email) return resp.status(400).json({ message: "E-mail do Google não informado" });
        try {
            const token = this.JwtService.criarToken(email, req.body.googleId || 'google-user');
            return resp.status(200).json({ email, token });
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao autenticar com Google: " + e.message });
        }
    }

    async registrar(req, resp) {
        const { email, password, senha } = req.body;
        const pass = password || senha;
        if (!email || !pass) return resp.status(400).json({ message: "E-mail e senha são obrigatórios" });

        try {
            const user = await this.UserService.save({ email, password: pass });
            const token = this.JwtService.criarToken(user.email, user._id);
            return resp.status(201).json({ email: user.email, token });
        } catch (e) {
            if (e.message === "Email já cadastrado")
                return resp.status(409).json({ message: e.message });
            console.error("Erro ao tentar criar novo usuário: " + e.message);
            return resp.status(500).json({ message: "Erro ao criar usuário: " + e.message });
        }
    }

    async login(req, resp) {
        const { email, password, senha } = req.body;
        const pass = password || senha;
        if (!email || !pass) return resp.status(400).json({ message: "E-mail e senha são obrigatórios" });

        try {
            const user = await this.UserService.login(pass, email);
            const token = this.JwtService.criarToken(user.email, user._id);
            return resp.status(200).json({ email: user.email, token });
        } catch (e) {
            return resp.status(401).json({ message: e.message });
        }
    }

    async validarToken(req, resp) {
        return resp.status(200).json({ valid: true, user: req.user });
    }

    // ---------- CRUD de Fichas ----------
    _getUserId(req) {
        return req.user?.id || req.user?._id || null;
    }

    _validarCorpoFicha(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
        // Campos mínimos obrigatórios pelo contrato do CharacterSheet
        if (!body.personal || typeof body.personal !== 'object') return false;
        if (!body.progression || typeof body.progression !== 'object') return false;
        return true;
    }

    /** GET /fichas -> lista todas as fichas do usuário autenticado */
    async listarFichas(req, resp) {
        const userId = this._getUserId(req);
        if (!userId) return resp.status(401).json({ message: "Usuário não autenticado" });

        try {
            const fichas = await this.UserService.listarFichas(userId);
            return resp.status(200).json(fichas);
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao listar fichas: " + e.message });
        }
    }

    /** GET /fichas/:fichaId -> busca uma ficha específica */
    async buscarFicha(req, resp) {
        const userId = this._getUserId(req);
        const { fichaId } = req.params;

        try {
            const ficha = await this.UserService.buscarFicha(userId, fichaId);
            if (!ficha) return resp.status(404).json({ message: "Ficha não encontrada" });
            return resp.status(200).json(ficha);
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao buscar ficha: " + e.message });
        }
    }

    /** POST /fichas -> cria uma nova ficha vinculada ao usuário logado */
    async criarFicha(req, resp) {
        const userId = this._getUserId(req);
        if (!userId) return resp.status(401).json({ message: "Usuário não autenticado" });

        if (!this._validarCorpoFicha(req.body)) {
            return resp.status(400).json({
                message: "Dados da ficha inválidos. Campos obrigatórios: personal, progression."
            });
        }

        const agora = new Date().toISOString();
        const novaFicha = {
            ...req.body,
            id: req.body.id || randomUUID(),
            userId,
            createdAt: req.body.createdAt || agora,
            updatedAt: agora
        };

        try {
            await this.UserService.adicionarFicha(userId, novaFicha);
            return resp.status(201).json(novaFicha);
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao criar ficha: " + e.message });
        }
    }

    /** PUT /fichas/:fichaId -> atualiza uma ficha existente */
    async atualizarFicha(req, resp) {
        const userId = this._getUserId(req);
        const { fichaId } = req.params;

        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return resp.status(400).json({ message: "Dados da ficha inválidos" });
        }

        try {
            const atualizada = await this.UserService.atualizarFicha(userId, fichaId, req.body);
            if (!atualizada) return resp.status(404).json({ message: "Ficha não encontrada" });
            return resp.status(200).json(atualizada);
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao atualizar ficha: " + e.message });
        }
    }

    /** DELETE /fichas/:fichaId -> remove uma ficha do usuário */
    async removerFicha(req, resp) {
        const userId = this._getUserId(req);
        const { fichaId } = req.params;

        try {
            const removida = await this.UserService.removerFicha(userId, fichaId);
            if (!removida) return resp.status(404).json({ message: "Ficha não encontrada" });
            return resp.status(204).send();
        } catch (e) {
            return resp.status(500).json({ message: "Erro ao remover ficha: " + e.message });
        }
    }
}

module.exports = UserController;