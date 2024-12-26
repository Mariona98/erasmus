const LocalStrategy = require("passport-local").Strategy;  
const { pool } = require("./dbConfig");  
const bcrypt = require("bcrypt");  

function initialize(passport) {  
  console.log("Start to Initialized");  

  const authenticateUser = (email, password, done) => {  
    console.log("Attempting to authenticate user with email:", email);  

    pool.query(  
      `SELECT * FROM users WHERE email = $1`,  
      [email],  
      (err, results) => {  
        if (err) {  
          console.error("Database query error:", err);  
          return done(err);  
        }  

        // Log the results from the query to see what's fetched  
        console.log(`Results retrieved:`, results.rows);  
        
        if (results.rows.length > 0) {  
          const user = results.rows[0]; // Get the user from the results  
          console.log("User found:", user.email);  

          // Compare the provided password with the stored hash  
          bcrypt.compare(password, user.password, (err, isMatch) => {  
            if (err) {  
              console.error("Error comparing passwords:", err);  
              return done(err);  
            }  
            if (isMatch) {  
              // Password is correct, authenticate user  
              console.log("Password is correct for user:", email);  
              return done(null, user); // Pass user to the next middleware  
            } else {  
              // Password is incorrect  
              console.log("Incorrect password for user:", email);  
              return done(null, false, { message: "Password is incorrect" });  
            }  
          });  
        } else {  
          // No user found with that email  
          console.log("No user found with that email:", email);  
          return done(null, false, { message: "No user with that email address" });  
        }  
      }  
    );  
    console.log("Initialized");  
  };  

  passport.use(  
    new LocalStrategy(  
      { usernameField: "email", passwordField: "password" }, // Clear mapping  
      authenticateUser // Use the authenticate function  
    )  
  );  

  passport.serializeUser((user, done) => done(null, user.id));  

  passport.deserializeUser((id, done) => {  
    pool.query(`SELECT * FROM users WHERE id = $1`, [id], (err, results) => {  
      if (err) {  
        return done(err);  
      }  
      if (results.rows.length > 0) {  
        console.log(`User deserialized with ID: ${results.rows[0].id}`);  
        return done(null, results.rows[0]);  
      } else {  
        console.log("No user found for deserialization");  
        return done(null, false); // Handle no user  
      }  
    });  
  });  
}  

module.exports = initialize;