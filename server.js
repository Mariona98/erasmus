// server.js

require('dotenv').config();
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const flash = require("express-flash");
const path = require("path");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy; 
const session = require("express-session");
const multer = require("multer");
const nodemailer = require("nodemailer"); // Ensure nodemailer is installed
const { pool } = require("./dbConfig");
const { error } = require("console");
const mysql = require("mysql2");
const router = express.Router();
// PORT = process.env.PORT || 4000;
PORT = 5000;
const app = express();

// Setup multer for file uploads (images)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- MIDDLEWARE --------------------

// Parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Configure session once
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
  })
);
app.use(flash());

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());
const initializePassport = require("./passportConfig");
initializePassport(passport);

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the "public" folder
app.use(express.static("public"));

// Set res.locals.user for access in views
app.use((req, res, next) => {
  res.locals.user = req.user || "guest";
  next();
});

passport.use(new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  (email, password, done) => {
    pool.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return done(err);
      if (results.length === 0) {
        return done(null, false, { message: 'Invalid email or password.' });
      }
      const user = results[0];
      // Use bcrypt to compare hashed passwords
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return done(err);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password.' });
        }
        return done(null, user);
      });
    });
  }
));


// Serialize and Deserialize User  

// passport.serializeUser((user, done) => done(null, user.id));  
passport.serializeUser((user, done) => {
  if (!user || !user.id) {
    console.log(user.id);
      return done(new Error('User ID is not defined'));
  }
  done(null, user.id);
});

passport.deserializeUser((id, done) => {  
  pool.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {  
    if (err) {  
      return done(err);  
    }  
    if (results.length > 0) {  
      console.log(`User deserialized with ID: ${results[0].id}`);  
      return done(null, results[0]);  
    } else {  
      console.log('No user found for deserialization');  
      return done(null, false);  
    }  
  });  
});  


// -------------------- ROUTES --------------------

// Retrieve images from the database
app.get('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT image_data FROM d189015pit_.entries WHERE id = ?;";
    const result = await pool.query(query, [id]);

    if (result.rows.length > 0) {
      const img = result.rows[0].image_data;
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(img, "binary");
    } else {
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch image");
  }
});


// Homepage route (shows all entries, no filters)
app.get("/", async (req, res) => {
  try {
    let user_ = req.user ? req.user : "guest";
    const result = await pool.query("SELECT * FROM d189015pit_.entries ORDER BY entry_date DESC");
    res.render("homepage", { user_, entries: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading homepage");
  }
});

// Add Entry page (requires login)
app.get("/addpage", (req, res) => {
  let user_ = req.user ? req.user : "guest";
  if (user_ !== "guest") {
    res.render("addpage", { user_ });
  } else {
    res.redirect("/");
  }
});

// Logout route
app.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You have logged out.");
    res.redirect("/");
  });
});

// Login page
app.get("/login", (req, res) => {
  let user_= req.user ? req.user : "guest";
  if (user_ !== "guest") {
    res.redirect("/");
  } else {
    res.render("login", { user_ });
  }
});


// Registration page
app.get("/register", (req, res) => {
  let user_ = req.user ? req.user : "guest";
  if (user_ !== "guest") {
    res.redirect("/");
  } else {
    res.render("register", { user_ });
  }
});

// Posts page (with filters, if desired)
app.get("/posts", async (req, res) => {
  try {
    let user_ = req.user ? req.user : "guest";
    const { country, month, days } = req.query;
    let query = "SELECT * FROM d189015pit_.entries WHERE 1=1";
    const params = [];
    if (country) {
      params.push(country);
      query += ` AND country = $${params.length}`;
    }
    if (month) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM entry_date) = $${params.length}`;
    }
    if (days) {
      params.push(parseInt(days, 10));
      query += ` AND days = $${params.length}`;
    }
    query += " ORDER BY entry_date DESC";
    const result = await pool.query(query, params);
    res.render("posts", { user_, entries: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading posts");
  }
});

// Single Post page
app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let user_ = req.user ? req.user : "guest";
    const result = await pool.query("SELECT * FROM d189015pit_.entries WHERE id = ?", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Post not found");
    }
    const post = result.rows[0];
    res.render("post", { user_, post });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching the post.");
  }
});

// -------------------- POST REQUESTS --------------------


// Registration request  
app.post("/register", async (req, res) => {  
  let { username, email, password, confpassword } = req.body;  
  let errors = [];  

  if (!username || !email || !password || !confpassword) {  
    errors.push({ message: "Please enter all fields" });  
  }  
  if (password.length < 6) {  
    errors.push({ message: "Password must be at least 6 characters." });  
  }  
  if (password !== confpassword) {  
    errors.push({ message: "Passwords do not match." });  
  }  

  if (errors.length > 0) {  
    return res.render("register", { errors, user: "guest" });  
  }  

  // Hash the password  
  let hashedPassword = await bcrypt.hash(password, 10);  
  
  try {  
    // Check if the email is already registered  
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);  
    
    if (rows.length > 0) {  
      errors.push({ message: "Email already registered." });  
      return res.render("register", { errors, user: "guest" });  
    }  

    // Insert new user  
    const [newUser] = await pool.query(  
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",  
      [username, email, hashedPassword]  
    );  
 
    return res.redirect("/login"); 


  } catch (err) {  
    console.error(err);  
    return res.status(500).send("Internal Server Error");  
  }  
});  

// Login request  


// app.post("/login", (req, res, next) => {  
//   console.log("Incoming request body:", req.body);  
//   console.log('user :'+ user);
//   passport.authenticate("local", (err, user, info) => {  
  
//     if (err) {  
//       console.error("Login failed: ", err);  
//       return next(err);  
//     }  
//     if (!user) {  
//       console.log("User not found with the provided email.");  
//       req.flash("error_msg", info.message || "Invalid email or password.");  
//       return res.redirect("/login");  
//     }  
   
//     req.logIn(user, (err) => {  
//       if (err) {  
//         console.error("Login failed during req.login: ", err);  
//         return next(err);  
//       }  
//       console.log("User authenticated successfully:", user.email);  
//       return res.redirect("/addpage");  
//     });  
//   })(req, res, next);  
// });  
app.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Query to find the user by email
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );


    if (rows.length === 0) {
      // No user found with the provided email
      req.flash("error_msg", "Invalid email or password.");
      return res.redirect("/login");
    }

    const user = rows[0];

    // Here you would typically compare the password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);  
    if (!isMatch) {  
      req.flash("error_msg", "Invalid email or password.");  
      return res.redirect("/login");  
    }  

    // If authentication is successful, log in the user
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/addpage");
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal Server Error");
  }
});





// New post entry  
router.post('/addpage', upload.single('image'), async (req, res) => {  
  try {  
    const {  
      title,  
      subheading,  
      description,  
      entryDate,  
      endDate,  
      country,  
      otherCountry,  
      ageLimitDown,  
      ageLimitUp,  
      link  
    } = req.body;  

    const user_id = req.user.id; // Assuming the user is logged in  
    const imageName = req.file.originalname;  
    const imageData = req.file.buffer;  
    
    const days = Math.ceil((new Date(endDate) - new Date(entryDate)) / (1000 * 60 * 60 * 24));  
    const finalCountry = country === 'Other' ? otherCountry : country;  

    const query = `  
      INSERT INTO d189015pit_.entries (  
        title, subheading, description, entry_date, end_date, days,  
        country, age_limit_down, age_limit_up, image_name, image_data, link, user_id  
      )  
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  
    `;  

    const values = [  
      title,  
      subheading,  
      description,  
      entryDate,  
      endDate,  
      days,  
      finalCountry,  
      ageLimitDown || null,  
      ageLimitUp || null,  
      imageName,  
      imageData,  
      link || null,  
      user_id  
    ];  

    const [result] = await pool.query(query, values);  
    
    console.log(result);  
    res.status(201).json({ message: 'Entry created successfully', entry: { id: result.insertId, ...values } });  
  } catch (error) {  
    console.error(error);  
    res.status(500).json({ error: 'Failed to create entry' });  
  }  
});  

// // Export router if this is a separate module  
module.exports = router;  

// -------------------- CONTACT ROUTES --------------------

// GET route: Render the contact form
app.get("/contact", (req, res) => {
  let user_ = req.user ? req.user : "guest";
  res.render("contact", { user });
});

// POST route: Process the contact form and send email
app.post("/send", (req, res) => {
  const { email_contact, subject_contact, msg_contact } = req.body;
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_USER,     // Your Gmail address
      pass: process.env.GMAIL_PASSWORD    // Your Gmail App Password
    }
  });
  const mailOptions = {
    from: email_contact,
    to: "erasmusapp25@gmail.com",  // The recipient's address
    subject: subject_contact,
    text: `Message from ${email_contact}:\n\n${msg_contact}`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).send("Error sending email: " + error.message);
    }
    res.redirect("/contact?success=true");
  });
});
// // 404 page
app.use((req, res, next) => {  
  console.log(`Received request for: ${req.path}`);  
  next(); // Move to the next middleware or route  
});  

// Final error handling middleware for undefined routes (404)  
app.use((req, res) => {  
  console.log(`Route not found: ${req.path}`);  // Log for debugging purposes  
  res.status(404).render('404');                // Render the '404' view  
});
// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
