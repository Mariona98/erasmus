// script.js

document.addEventListener("DOMContentLoaded", () => {
  // Example: handle search button click
  // const searchBtn = document.getElementById("searchBtn");
  // if (searchBtn) {
  //   searchBtn.addEventListener("click", () => {
  //     const category = document.getElementById("category").value;
  //     const startDate = document.getElementById("startDate").value;
  //     const endDate = document.getElementById("endDate").value;
  //     // Do something with these values, e.g. fetch data from an API, or redirect.
  //     console.log("Search for:", category, startDate, endDate);
  //   });
  // }
  const date = new Date().toISOString().slice(0, 10); // Current date in YYYY-MM-DD format

  const endDate = document.getElementById("endDate");
  const entryDate = document.getElementById("entryDate");
  entryDate.addEventListener("input", (e) => {
    console.log(e.target.value < date);
    if (e.target.value < date) {
      document.getElementById("message").innerText =
        "Παρακαλώ εισάγεται μια έγκυρη ημερομηνία."; // Message in Greek
      document.getElementById("message").style.display = "block"; // Show the message
      entryDate.value = date; // Reset endDate to current date
    } else {
      document.getElementById("message").style.display = "none"; // Hide message if valid
    }
  });
  endDate.addEventListener("input", (e) => { 

    // Check if the end date is earlier than the entry date
    if (e.target.value < entryDate.value) {
      document.getElementById("message").innerText =
        "Η ημερομηνία επιστροφής πρέπει να είναι μεγαλύτερη της ημερομηνίας αναχώρησης."; // Message in Greek
      document.getElementById("message").style.display = "block"; // Show the message
      endDate.value = ''; // Reset endDate to current date
    } else {
      document.getElementById("message").style.display = "none"; // Hide message if valid
    }
  });

  // Example: handle create form submit
  const createForm = document.getElementById("createForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Collect form data

      const date = new Date().toISOString().slice(0, 10); // Gets current date in YYYY-MM-DD format

      const title = document.getElementById("title").value;
      const subheading = document.getElementById("subheading").value;
      const description = document.getElementById("description").value;
      entryDate = !entryDate.value ? date : entryDate.value;
      endDate = endDate.value;
      const image = document.getElementById("image").files[0].name;
      // Send to server via fetch or Axios, etc.
      const formData = new FormData(e.target);

      console.log(document.getElementById("image").files[0]);
      console.log("Creating entry:", {
        title,
        subheading,
        description,
        entryDate,
        endDate,
        image,
      });

      try {
        const response = await fetch("/addpage", {
          method: "POST",
          body: formData, // Send the FormData object
        });

        if (response.ok) {
          const result = await response.text(); // Or handle response as needed

          alert(`Upload successfuly`);
          window.location.replace("/posts");
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  // Example: handle login form submit
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      console.log("Logging in:", { email, password });
      // Perform fetch/axios call to your server or auth API
    });
  }
});
