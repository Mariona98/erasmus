# ErasmusHolidayApp

guidance for set up.

## clone the repo 

If you haven't cloned the repository yet, run the following command to clone it to your local machine:

```bash
git clone https://github.com/Mariona98/erasmus.git
```
#### create the users table 
#### enter the db server 

```bash
-- Create a new user
CREATE TABLE IF NOT EXISTS users (  
    id INT NOT NULL AUTO_INCREMENT,  
    username VARCHAR(50) NOT NULL,  
    email VARCHAR(100) NOT NULL,  
    password VARCHAR(255) NOT NULL,  
    admin BOOLEAN DEFAULT false,  
    PRIMARY KEY (id)  
);
```

#### create the entries table 

```bash
CREATE TABLE IF NOT EXISTS entries (  
    id INT NOT NULL AUTO_INCREMENT,  
    title VARCHAR(255) NOT NULL,  
    subheading VARCHAR(255),  
    description TEXT,  
    entry_date DATE,  
    end_date DATE,  
    image_data LONGBLOB,  -- Χρησιμοποιούμε LONGBLOB για αποθήκευση δυαδικών δεδομένων  
    image_name VARCHAR(255),  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  
    user_id INT,  
    country VARCHAR(255) NOT NULL,  
    days INT,  
    age_limit_up INT,  
    age_limit_down INT,  
    link TEXT,  
    PRIMARY KEY (id),  
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE  
);
```

##  Create the `.env` File

The `.env` file holds the environment variables required for your application to run. These variables include your database credentials and a session secret. 

Create a file named `.env` in the root of your project and add the following properties:

```env
DB_USER=admin
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=postgres
SESSION_SECRET=secret
GMAIL_USER=erasmusapp25@gmail.com
GMAIL_PASSWORD=alyy pzko zdsu vaop

```
### tip!
I already have a dbConfig.js so no need to make it. 
Enjoy! 

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)