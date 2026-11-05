const jwt = require("jsonwebtoken");

class JwtService {
  constructor(AlunoService, ServidorService, BcriptService) {
    this.AlunoService = AlunoService;
    this.ServidorService = ServidorService;
    this.BcriptService = BcriptService;

    this.tempoExpiracao = 60 * 60 * 24;
    this.chave = process.env.SECRET_KEY || "senha";
  }

  async validar(req, resp, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return resp.status(401).json({ message: "Token não fornecido" });

    const [, token] = authHeader.split(" ");
    if (!token) return resp.status(401).json({ message: "Formato de token inválido" });

    try {
      const conteudo = jwt.verify(token, this.chave);
      req.user = conteudo;
      return next();
    } catch (err) {
      console.error("Erro na validação do token:", err.message);
      return resp.status(403).json({ message: "Token inválido ou expirado" });
    }
  }

  criarToken(sujeito, id, role) {
    return jwt.sign(
      {
        subject: sujeito,
        id: id,
        role: role,
      },
      this.chave,
      { expiresIn: this.tempoExpiracao }
    );
  }

  async findSujeito(conteudo) {
    try {
      if (this.AlunoService && typeof this.AlunoService.getById === 'function') {
        const sujeito = await this.AlunoService.getById(conteudo.id);
        if (sujeito) return sujeito;
      }
      if (this.ServidorService && typeof this.ServidorService.getById === 'function') {
        return await this.ServidorService.getById(conteudo.id);
      }
      return null;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

module.exports = JwtService;