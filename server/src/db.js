const mongoose = require('mongoose');

// CRITICAL: fail fast, don't hang when MongoDB is not running locally
mongoose.set('bufferCommands', false);

const conexao = async (uri) => {
    try {
        console.log("Iniciando conexao com o banco...");
        const targetUri = uri || process.env.MONGODB_URI;
        if (!targetUri) {
            console.warn("MONGODB_URI nao configurada — operando em modo offline.");
            return false;
        }
        await mongoose.connect(targetUri, {
            serverSelectionTimeoutMS: 2000
        });
        console.log("Conexao com o MongoDB estabelecida");
        return true;
    } catch (err) {
        console.warn("MongoDB nao conectado — algumas funcionalidades de persistencia nao estarao disponiveis:", err.message);
        return false;
    }
};

module.exports = conexao;