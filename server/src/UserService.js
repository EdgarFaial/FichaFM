const User = require('../models/user');

class userService {
    constructor(BcriptService) {
        this.BcriptService = BcriptService;
    }

    async login(senha, email) {
        const user = await User.findOne({email: email});
        if(!user) throw new Error("user invalido")

        if(!this.BcriptService.isEqual(senha, user.senha)) {
            throw Error("user invalido");
        }
        return user;
    }
    async save(body) {
        body['senha'] = this.BcriptService.criptografar(body.senha);

        const user = new User(body);
        console.log("user: ", user);  
        
        return await user.create(user); 
    }

    async getById (id) {
        return await User.findOne({_id: id});
    }
} 

module.exports = userService