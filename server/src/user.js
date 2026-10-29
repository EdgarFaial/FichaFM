const schema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    email: {
        type:String,
        required:false,
        
    }
}, {id:true, timestamps:true});
const entity = mongoose.model("User", schema);