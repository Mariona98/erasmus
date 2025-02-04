const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");

function initialize(passport) {
  const authenticateUser = (email, password, done) => {
    console.log("Attempting to authenticate user with email:", email);

    pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return done(err);
        }

        // Log the results from the query to see what's fetched

        if (results.rows.length > 0) {
          const user = results.rows[0]; // Get the user from the results

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
          return done(null, false, {
            message: "No user with that email address",
          });
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



  

}

module.exports = initialize;
