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
}

module.exports = userService;