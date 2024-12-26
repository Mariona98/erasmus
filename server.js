// server.js
const express = require('express');
const path = require("path"); // to work with directories
const app = express();
const { pool } = require("./dbConfig");
const { error } = require("console");
const bcrypt = require("bcrypt");
const session = require('express-session');  
const flash = require('express-flash'); 
const passport = require('passport');  

// Middleware to parse incoming request bodies  
app.use(express.urlencoded({ extended: true }));  

// Add session and flash middleware  
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));  
app.use(flash());  
app.use(passport.initialize());  
app.use(passport.session());  

const initializePassport = require('./passportConfig');
initializePassport(passport);

const PORT = process.env.PORT || 4000;

// 1) Install EJS (npm install ejs)
// 2) Set the view engine to ejs
app.set("view engine", "ejs");

// 3) Specify where your .ejs files are
app.set("views", path.join(__dirname, "views"));

// 4) Serve static files (CSS, JS, images) from the "public" folder
app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    //security key about session.
  saveUninitialized:false,
    secret: process.env.SESSION_SECRET || 'default_secret', // Use an environment variable for security  
    resave: false, //no save if nothing is changed.
    saveUninitialized: true,  
    cookie: { secure: false } // Set to true if using HTTPS  

  })
);
app.use(flash());

// Routes
app.get("/", (req, res) => {
  // "homepage.ejs" in "views" folder
  const user = req.user ? req.user : "guest"; // Use req.user if available, otherwise default to "guest"  
  res.render("homepage", { user });
  // Render the "addpage.ejs" view and pass the user variable  
});


app.get("/addpage", (req, res) => {  
  // Determine the user  
  const user = req.user ? req.user : "guest"; // Use req.user if available, otherwise default to "guest"  
  
  // Render the "addpage.ejs" view and pass the user variable  
  res.render("addpage", { user });  
});
app.post('/logout', (req, res) => {  
  req.logout((err) => {  
      if (err) { return next(err); }  
      res.redirect('/'); // Redirect to home or another page after logout  
  });  
});
app.get("/login", (req, res) => {
  const user = req.user ? req.user : "guest";
  res.render("login", { user });
});
app.get("/404", (req, res) => {
  res.render("404");
});

app.get("/register", (req, res) => {
  const user = req.user ? req.user : "guest";
  res.render("register", { user });
});

app.get("/posts", (req, res) => {
  const user = req.user ? req.user : "guest";
  res.render("posts",{ user });
});

////post request

app.post("/register", async (req, res) => {
  let { username, email, password, confpassword, isAuthor } = req.body;

  //validation
  // console.log({ username, email, password, confpassword, isAuthor });

  let errors = [];

  if (!username || !email | !password || !confpassword || !isAuthor) {
    errors.push({ message: "Please enter all fields" });
  }
  if (password.length < 6) {
    errors.push({ message: "Password must be at least 6 characters." });
  }
  if (password != confpassword) {
    errors.push({ message: "Passwords do not match." });
  }

  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    // Form validation has passed
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    try {
      const results = await pool.query(
        "SELECT * FROM public.users WHERE email = $1",[email]);

      if (results.rows.length > 0) {
        // User already exists, handle accordingly (e.g., send an error response)
        errors.push({ message: "Email already register." });
        res.render("register", { errors });
      } else {
        // Proceed to register the user (insert user in DB, etc.)
        await pool.query(
          `INSERT INTO users (username,email, password,admin) VALUES ($1, $2, $3, $4)RETURNING id , password`,
          [username, email, hashedPassword, isAuthor]
        );

        app.use(passport.initialize());
        app.use(passport.session());

        req.flash('success_msg',"You are now registered.")
        res.redirect("/login"); // Redirect after successful registration
      }
    } catch (err) {
      console.error("Database query error:", err); 
      res.status(500).send("Internal Server Error"); // Handle error
    }
  }
});

//login request 

app.post('/login', (req, res, next) => {  
  console.log("Incoming request body:", req.body); // Log incoming request data  
  
  passport.authenticate('local', (err, user, info) => {  
    if (err) {  
      console.error("Login failed: ", err);  
      return next(err); // Passes the error to the error handler  
    }  
    if (!user) {  
      // If user is not found  
      console.log("User not found with the provided email.");  
      req.flash('error_msg', info.message || "Invalid email or password."); // Flash error message  
      return res.redirect('/login'); // Redirect back to login with message  
    }  

    req.logIn(user, (err) => {  
      if (err) {  
        console.error("Login failed during req.login: ", err);  
        return next(err);  
      }  
      console.log("User authenticated successfully:", user.email);  
      return res.redirect('/addpage'); // Redirect upon successful authentication  
    });  
  })(req, res, next); // Call the authenticate function  
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
