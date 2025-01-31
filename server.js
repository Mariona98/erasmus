// server.js

 // to work with directories
 require('dotenv').config(); 
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
const nodemailer = require('nodemailer'); 
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

app.use((req, res, next) => {
  res.locals.user = req.user || "guest";
  next();
});


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


//--------- Routes

app.get("/", async (req, res) => {
  try {
    const user = req.user ? req.user : "guest";

    // Get filters from query parameters
    const { country, month, days } = req.query; // Include `days` as a query parameter

    let query = "SELECT * FROM entries WHERE 1=1"; // Base query
    const params = [];

    // Add country filter if specified
    if (country) {
      params.push(country);
      query += ` AND country = $${params.length}`;
    }

    // Add month filter if specified
    if (month) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM entry_date) = $${params.length}`;
    }

    // Add days filter if specified
    if (days) {
      params.push(parseInt(days, 10)); // Parse days as an integer
      query += ` AND days = $${params.length}`; // Filter entries matching the exact number of days
    }

    query += " ORDER BY entry_date DESC"; // Add ordering clause

    // Execute the query
    const result = await pool.query(query, params);

    res.render("homepage", { user, entries: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading homepage");
  }
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
app.get("/contact", (req, res) => {
  const user = req.user ? req.user : "guest";

    res.render("contact", { user });
 
});

app.get("/posts", async(req, res) => {
  const user = req.user ? req.user : "guest";
  const result = await pool.query('SELECT * FROM entries ORDER BY entry_date DESC'); // Adjust table name  
  res.render("posts", { user ,entries: result.rows});
});


// go to post page.
app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params; 
    const user = req.user ? req.user : "guest";  
    const result = await pool.query('SELECT * FROM entries WHERE id = $1', [id]); 


    if (result.rows.length === 0) {
      return res.status(404).send("Post not found"); 
    }

    const post = result.rows[0]; 
    res.render("./post", { user,post });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching the post.");
  }
});





////---------------- post requests 

//register request
app.post("/register", async (req, res) => {
  let { username, email, password, confpassword, isAuthor } = req.body;
  let errors = [];

  // Validation
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
    res.render("register", { errors, user: "guest" });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    try {
      const results = await pool.query(
        "SELECT * FROM public.users WHERE email = $1",
        [email]
      );
      if (results.rows.length > 0) {
        errors.push({ message: "Email already registered." });
        res.render("register", { errors, user: "guest" });
      } else {
        const newUser = await pool.query(
          `INSERT INTO users (username, email, password, admin) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, username, email`,
          [username, email, hashedPassword, isAuthor]
        );

        // Log in the new user automatically
        req.login(newUser.rows[0], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error logging in after registration");
          }
          req.flash("success_msg", "You are now registered and logged in.");
          res.redirect("/"); // Redirect to homepage
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
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
    const {
      title,
      subheading,
      description,
      entryDate, // Match the name attributes in the form
      endDate,
      country,
      otherCountry,
      ageLimitDown,
      ageLimitUp,
      link // New field
    } = req.body;

    const user_id = req.user.id;
    const imageName = req.file.originalname; // File name
    const imageData = req.file.buffer; // Image binary data

    // Calculate the number of days (difference between endDate and entryDate)
    const days = Math.ceil((new Date(endDate) - new Date(entryDate)) / (1000 * 60 * 60 * 24));

    // Determine the actual country value
    const finalCountry = country === 'Other' ? otherCountry : country;

    // Updated query to include the `days` column
    const query = `
      INSERT INTO entries (
        title, subheading, description, entry_date, end_date, days,
        country, age_limit_down, age_limit_up, image_name, image_data, link, user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      title,
      subheading,
      description,
      entryDate,
      endDate,
      days, // Include the calculated days value
      finalCountry,
      ageLimitDown || null, // Use null if no value provided
      ageLimitUp || null,   // Use null if no value provided
      imageName,
      imageData,
      link || null,         // Use null if no value provided
      user_id
    ];

    const result = await pool.query(query, values);

    console.log(result);

    res.status(201).json({ message: 'Entry created successfully', entry: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});
// Handle form submissions  
app.post('/send', (req, res) => {  
  const { email_contact, subject_contact, msg_contact } = req.body; 

  const transporter = nodemailer.createTransport({  
    // service: 'Yahoo', // or another email service  
    // auth: {  
    //   user: process.env.YAHOO_EMAIL, // Use email from .env file  
    //         pass: process.env.YAHOO_PASSWORD, // Use password from .env file  
      
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "c6e670b1be4238",
      pass: "38e16320ee79f2"
    },  
}); 
const mailOptions = {  
  from: email_contact, // Email of the user  
  to: process.env.YAHOO_EMAIL, // The recipient's email address  
  subject: subject_contact, // The subject of the email
  text: `Message from ${email_contact}: ${msg_contact}`, // Include the user's email in the message  
}; 

// Send the email  
transporter.sendMail(mailOptions, (error, info) => {  
  if (error) {  
      return res.status(500).send('Error sending email: ' + error.message);  
  }  
  res.redirect('/contact?success=true');
});  

});



// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
