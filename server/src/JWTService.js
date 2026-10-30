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
    const [, token] = req.headers.authorization?.split(" ") || ["", ""];
    if (!token) return resp.status(401).send("Entrada restrita");

    try {
      const conteudo = jwt.verify(token, this.chave);
      if (conteudo.id === undefined || conteudo.subject === undefined) {
        return resp.status(403).json({ message: "token invalido" });
      }

      req.user = conteudo;
      return next();
    } catch (err) {
      console.log(err);
      return resp.status(403).json({ message: "acesso negado", error: err.message });
    }
  }

  criarToken = (sujeito, id, role) => {
    const token = jwt.sign(
      {
        subject: sujeito,
        id: id,
        role: role,
      },
      this.chave,
      { expiresIn: this.tempoExpiracao }
    );

    return token;
  };

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