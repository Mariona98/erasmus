// server.js

require("dotenv").config();
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const flash = require("connect-flash");
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Configure session once
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Set to true if using HTTPS
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

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    (email, password, done) => {
      pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, results) => {
          if (err) return done(err);
          if (results.length === 0) {
            return done(null, false, { message: "Invalid email or password." });
          }
          const user = results[0];
          // Use bcrypt to compare hashed passwords
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return done(err);
            if (!isMatch) {
              return done(null, false, {
                message: "Invalid email or password.",
              });
            }
            return done(null, user);
          });
        }
      );
    }
  )
);

// Serialize and Deserialize User

// passport.serializeUser((user, done) => done(null, user.id));
passport.serializeUser((user, done) => {
  if (!user || !user.id) {
    console.log(user.id);
    return done(new Error("User ID is not defined"));
  }
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  pool.execute("SELECT * FROM users WHERE id = ?", [id])
    .then(([results]) => {
      if (results.length > 0) {
        console.log(`User deserialized with ID: ${results[0].id}`);
        return done(null, results[0]); // Pass user object to done
      } else {
        console.log("No user found for deserialization");
        return done(null, false); // No user found
      }
    })
    .catch(err => {
      console.error("Error during deserialization:", err);
      return done(err); // Handle error
    });
});


// -------------------- ROUTES --------------------

// Retrieve images from the database
app.get("/images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT image_data FROM entries WHERE id = ?"; // Adjusted table name
    const [result] = await pool.execute(query, [id]); // Use execute for MySQL

    if (result.length > 0) {
      // Adjusted to check the length of result
      const img = result[0].image_data;
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
    const user = req.user ? req.user : "guest";

    const query = "SELECT * FROM entries ORDER BY entry_date DESC";
    const [result] = await pool.execute(query); // Use execute for MySQL

    console.log(result);
    res.render("homepage", { user, entries: result });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading homepage");
  }
});

// Logout route
app.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You have logged out.");
    res.render("homepage");
  });
});

// Registration page
app.get("/register", (req, res) => {
  const user = req.user ? req.user : "guest";
  if (user !== "guest") {
    res.redirect("homepage");
  } else {
    res.render("register", { user });
  }
});

// Login page
app.get("/login", (req, res) => {
  const user = req.user ? req.user : "guest";

  if (user !== "guest") {
    res.render("homepage");
  } else {
    res.render("login", { user });
  }
});
// Add Entry page (requires login)
app.get("/addpage", async (req, res) => {
  const user = req.user ? req.user : "guest";
  // if (user !== "guest") {
    
  res.render("addpage",{ user,messages:'ola ok' } );

  // } else {
  //   res.render("homepage");
  // }
});

// Posts page (with filters, if desired)
app.get("/posts", async (req, res) => {
  try {
    const user = req.user ? req.user : "guest";
    const { country, month, days } = req.query;
    let query = "SELECT * FROM entries WHERE 1=1"; // Start with a base condition
    const params = [];

    if (country) {
      params.push(country);
      query += ` AND country = ?`;
    }
    if (month) {
      params.push(month);
      query += ` AND MONTH(entry_date) = ?`; // Use MONTH() for MySQL
    }
    if (days) {
      params.push(parseInt(days, 10));
      query += ` AND days = ?`;
    }
    query += " ORDER BY entry_date DESC";

    const [result] = await pool.execute(query, params); // Use execute for MySQL
    

    res.render("posts", { user, entries: result });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading posts");
  }
});

// Single Post page

app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user ? req.user : "guest";
    const [result] = await pool.execute("SELECT * FROM entries WHERE id = ?", [
      id,
    ]); // Adjusted table name

    if (result.length === 0) {
      return res.status(404).send("Post not found");
    }

    const post = result[0]; // Access the post correctly
    res.render("post", { user, post });
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
    return res.render("register", { errors, user });
  }

  // Hash the password
  let hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if the email is already registered
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length > 0) {
      errors.push({ message: "Email already registered." });
      return res.render("register", { errors, user });
    }

    // Insert new user
    const [newUser] = await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    return res.render("login", { user });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

// Login request

app.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      req.flash("error_msg", "Invalid email or password.");
      return res.redirect("login");
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
      req.flash("error_msg", "Invalid email or password.");
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      // Access user from session

      return res.redirect("/addpage");
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/addpage", upload.single("image"), async (req, res) => {
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
      link,
    } = req.body;

    const user_id = req.user.id; //req.user.id; // Assuming the user is logged in
    const imageName = req.file.originalname;
    const imageData = req.file.buffer;

    const days = Math.ceil(
      (new Date(endDate) - new Date(entryDate)) / (1000 * 60 * 60 * 24)
    );
    const finalCountry = country === "Other" ? otherCountry : country;

    const query = `  
      INSERT INTO entries (  
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
      user_id,
    ];

    const [result] = await pool.execute(query, values);

    res.status(201).json({
      message: "Entry created successfully",
      entry: { id: result.insertId, ...values },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create entry" });
  }
});
module.exports = router;

// -------------------- CONTACT ROUTES --------------------

// GET route: Render the contact form
app.get("/contact", (req, res) => {
  const user = req.user ? req.user : "guest";
  res.render("contact", { user });
});

// POST route: Process the contact form and send email
app.post("/send", (req, res) => {
  const { email_contact, subject_contact, msg_contact } = req.body;
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_PASSWORD, // Your Gmail App Password
    },
  });
  const mailOptions = {
    from: email_contact,
    to: "erasmusapp25@gmail.com", // The recipient's address
    subject: subject_contact,
    text: `Message from ${email_contact}:\n\n${msg_contact}`,
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
  console.log(`Route not found: ${req.path}`); // Log for debugging purposes
  res.status(404).render("404"); // Render the '404' view
});
// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
