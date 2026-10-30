const User = require('./user');

class userService {
    constructor(BcriptService) {
        this.BcriptService = BcriptService;
    }

    async login(senha, email) {
        const user = await User.findOne({ email: email });
        if (!user) throw new Error("user invalido");

        const storedPassword = user.password || user.senha;
        if (!this.BcriptService.isEqual(senha, storedPassword)) {
            throw Error("user invalido");
        }
        return user;
    }

    async save(body) {
        const rawPassword = body.password || body.senha;
        body['password'] = this.BcriptService.criptografar(rawPassword);

        const user = new User(body);
        console.log("user: ", user);

        return await user.save();
    }

    async getById(id) {
        return await User.findOne({ _id: id });
    }
}

module.exports = userService;