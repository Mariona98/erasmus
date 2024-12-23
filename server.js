// server.js
const express = require('express');
const path = require('path'); // to work with directories
const app = express();
const { pool } = require("./dbConfig");
const { error } = require('console');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 4000;

// 1) Install EJS (npm install ejs)
// 2) Set the view engine to ejs
app.set('view engine', 'ejs');

// 3) Specify where your .ejs files are
app.set('views', path.join(__dirname, 'views'));

// 4) Serve static files (CSS, JS, images) from the "public" folder
app.use(express.static('public'));

app.use(express.urlencoded({extended:false}));

// Routes
app.get('/', (req, res) => {
  // "homepage.ejs" in "views" folder
  res.render('homepage',{user:"kate"});
});

app.get('/addpage', (req, res) => {
  // "addpage.ejs" in "views" folder
  res.render('addpage',{user:"kate"});
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/posts', (req, res) => {
  res.render('posts');
});

////post request 

app.post('/register', async(req, res) => {
 let {username,email,password,confpassword,isAuthor} = req.body

 //validation 
 console.log(
  {username,email,password,confpassword,isAuthor}
 )
 let errors= [];

 if(!username ||!email |!password || !confpassword || !isAuthor){
  errors.push({message:"Please enter all fields"});
  
  if(password.length < 6){
    errors.push({message: "Password must be at least 6 characters."});

  }
  if(password != confpassword){
    errors.push({message: "Passwords do not match."});

  }
  if(errors.length > 0){
    res.render('register',{errors})
  }else{
    //form validation has passed
console.log('form validation pass.')
    let hashedPassword = await bcrypt.hash(password,10);
    console.log(hashedPassword);
    pool.query(
      `SELECT * FROM users  
      WHERE email = $1`,[email],(err, results)=>{
        if(err){
          throw err;
        }
        console.log("results: ")
        console.log(results.rows)
      }
    );
  }
  
 }

});


// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
