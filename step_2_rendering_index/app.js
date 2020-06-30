const express = require('express')
const app = express()
const port = 80
const path = require('path');

app.get("/", function(req, res){
    res.sendFile(path.join(__dirname+'/index.html'))
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))