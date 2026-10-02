const express = require("express");
const port = 8080
const app = express();
const path = require('path');
const cors = require("cors")

app.use(express.static(path.join(__dirname, '../client/dist')));
app.use(express.urlencoded({extended:true}));
app.use(cors());

app.listen(port, () => {
    console.log(`Rodando na porta ${port}`);
});