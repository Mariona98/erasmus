// server.js
const express = require('express');
const path = require('path'); // to work with directories

const app = express();
const PORT = process.env.PORT || 4000;

// 1) Install EJS (npm install ejs)
// 2) Set the view engine to ejs
app.set('view engine', 'ejs');

// 3) Specify where your .ejs files are
app.set('views', path.join(__dirname, 'views'));

// 4) Serve static files (CSS, JS, images) from the "public" folder
app.use(express.static('public'));

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
