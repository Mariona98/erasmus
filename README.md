# ErasmusHolidayApp

guidance for set up.

## clone the repo 

If you haven't cloned the repository yet, run the following command to clone it to your local machine:

```bash
git clone https://github.com/Mariona98/erasmus.git
```
## set up database and a new user 
#### enter the db server 

```bash
-- Create a new user
CREATE USER admin WITH PASSWORD 'password';
```
```bash
-- Create a new database
CREATE DATABASE postgres;
```
```bash
-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE postgres TO admin;

-- Exit PostgreSQL
\q
```
#### create the users table 
```bash
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin BOOLEAN DEFAULT FALSE
);
```
#### create the entries table 
```bash
CREATE TABLE entries (  
    id SERIAL PRIMARY KEY,  
    title VARCHAR(255) NOT NULL,  
    subheading VARCHAR(255),  
    description TEXT,  
    entry_date DATE,  
    end_date DATE,  
    image_data BYTEA,  -- to store the image as binary data ,
 image_name VARCHAR(255)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  
    user_id INT REFERENCES users(id) ON DELETE CASCADE  -- Foreign key referencing the users table  
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