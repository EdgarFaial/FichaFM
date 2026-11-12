const User = require('./user');

class userService {
    constructor(BcriptService) {
        this.BcriptService = BcriptService;
    }

    async login(password, email) {
        const user = await User.findOne({ email: email });
        if (!user) throw new Error("Usuário ou senha inválidos");

        const isMatch = this.BcriptService.isEqual(password, user.password);
        if (!isMatch) {
            throw new Error("Usuário ou senha inválidos");
        }
        return user;
    }

    async save(userData) {
        const { email, password } = userData;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error("Email já cadastrado");
        }

        const hashedPassword = this.BcriptService.criptografar(password);
        const user = new User({
            email,
            password: hashedPassword
        });

        return await user.save();
    }

    async getById(id) {
        return await User.findOne({ _id: id });
    }
/** Retorna todas as fichas do usuário */
    async listarFichas(userId) {
        const user = await User.findById(userId).lean();
        if (!user) throw new Error("Usuário não encontrado");
        return user.fichas || [];
    }

    /** Busca uma ficha específica pelo id */
    async buscarFicha(userId, fichaId) {
        const user = await User.findById(userId).lean();
        if (!user) return null;
        return (user.fichas || []).find(f => f.id === fichaId) || null;
    }

    /** Adiciona uma nova ficha */
    async adicionarFicha(userId, ficha) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $push: { fichas: ficha } },
            { new: true }
        );
        if (!user) throw new Error("Usuário não encontrado");
        return ficha;
    }

    /** Atualiza uma ficha, preservando id/userId/createdAt */
    async atualizarFicha(userId, fichaId, dados) {
        const user = await User.findById(userId);
        if (!user) return null;

        const idx = (user.fichas || []).findIndex(f => f.id === fichaId);
        if (idx === -1) return null;

        const atual = user.fichas[idx];
        const atualizada = {
            ...atual,
            ...dados,
            id: fichaId,                 // id imutável
            userId: atual.userId,        // dono imutável
            createdAt: atual.createdAt,  // criação imutável
            updatedAt: new Date().toISOString()
        };

        user.fichas[idx] = atualizada;
        user.markModified('fichas'); // necessário por ser array de Object (Mixed)
        await user.save();
        return atualizada;
    }

    /** Remove uma ficha */
    async removerFicha(userId, fichaId) {
        const user = await User.findById(userId);
        if (!user) return null;

        const idx = (user.fichas || []).findIndex(f => f.id === fichaId);
        if (idx === -1) return null;

        user.fichas.splice(idx, 1);
        user.markModified('fichas');
        await user.save();
        return true;
    }
}

module.exports = userService;