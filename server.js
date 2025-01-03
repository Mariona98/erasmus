// server.js

 // to work with directories

const bcrypt = require("bcrypt");
const bodyParser = require('body-parser');
const express = require("express");
const cors = require('cors');
const fs = require('fs');  
const flash = require("express-flash");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const multer = require('multer');  
const { pool } = require("./dbConfig");
const { error } = require("console");


// Adjust as necessary for your setup  
const app = express();
const storage = multer.memoryStorage(); // Store image in memory
const upload = multer({ storage });



// Middleware to parse incoming request bodies
app.use(express.urlencoded({ extended: true }));

// Add session and flash middleware
app.use(
  session({ secret: "your_secret_key", resave: false, saveUninitialized: true })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const initializePassport = require("./passportConfig");
initializePassport(passport);
app.use(bodyParser.json());
app.use(cors());
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
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "default_secret", // Use an environment variable for security
    resave: false, //no save if nothing is changed.
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);
app.use(flash());

//retrieve images 
app.get('/images/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const query = 'SELECT image_data FROM entries WHERE id = $1; ';
      const result = await pool.query(query, [id]);

      if (result.rows.length > 0) {
          const img = result.rows[0].image_data;
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(img, 'binary');
      } else {
          res.status(404).send('Image not found');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Failed to fetch image');
  }
});


// Routes
app.get("/", async(req, res) => {
  const user = req.user ? req.user : "guest"; // Use req.user if available, otherwise default to "guest"
  const result = await pool.query('SELECT * FROM entries ORDER BY entry_date DESC'); // Adjust table name 
  
  res.render("homepage", { user ,entries: result.rows});

});

app.get("/addpage", (req, res) => {
  const user = req.user ? req.user : "guest"; // Use req.user if available, otherwise default to "guest"
  if (user !== "guest") {
    // if not login redirect to login page else to home page.

    res.render("addpage", { user });
  } else {
    res.redirect("/");
  }
});
app.get("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success_msg',"You have logged out.")
    res.redirect("/"); // Redirect to home or another page after logout
  });
});
app.get("/login", (req, res) => {
  const user = req.user ? req.user : "guest";
  if (user !== "guest") {
    // if not login redirect to login page else to home page.
    res.redirect("/");
  } else {
    res.render("login", { user });
  }
});
app.get("/404", (req, res) => {
  res.render("404");
});

app.get("/register", (req, res) => {
  const user = req.user ? req.user : "guest";
  if (user !== "guest") {
    res.redirect("/");
  } else {
    res.render("register", { user });
  }
});

app.get("/posts", async(req, res) => {
  const user = req.user ? req.user : "guest";
  const result = await pool.query('SELECT * FROM entries ORDER BY entry_date DESC'); // Adjust table name  
console.log(result);


  res.render("posts", { user ,entries: result.rows});
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
        "SELECT * FROM public.users WHERE email = $1",
        [email]
      );

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

        req.flash("success_msg", "You are now registered.");
        res.redirect("/login"); // Redirect after successful registration
      }
    } catch (err) {
      console.error("Database query error:", err);
      res.status(500).send("Internal Server Error"); // Handle error
    }
  }
});

//login request

app.post("/login", (req, res, next) => {
  console.log("Incoming request body:", req.body); // Log incoming request data

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login failed: ", err);
      return next(err); // Passes the error to the error handler
    }
    if (!user) {
      // If user is not found
      console.log("User not found with the provided email.");
      req.flash("error_msg", info.message || "Invalid email or password."); // Flash error message
      return res.redirect("/login"); // Redirect back to login with message
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login failed during req.login: ", err);
        return next(err);
      }
      console.log("User authenticated successfully:", user.email);
      return res.redirect("/addpage"); // Redirect upon successful authentication
    });
  })(req, res, next); // Call the authenticate function
});

// new post entry
app.post('/addpage', upload.single('image'), async (req, res) => {
    try {
      const { title, subheading, description, entryDate, endDate } = req.body;
      const user_id = req.user.id;
      const imageName = req.file.originalname; // File name
      const imageData = req.file.buffer; // Image binary data
      console.log(req);
      const query = `
        INSERT INTO entries (title, subheading, description, entry_date, end_date, image_name, image_data, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [title, subheading, description, entryDate, endDate, imageName, imageData, user_id];
  
      const result = await pool.query(query, values);
  
      res.status(201).json({ message: 'Entry created successfully', entry: result.rows[0] });
     
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create entry' });
    }
  });



// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
