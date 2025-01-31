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

#### create users table updated

-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL,
    admin boolean DEFAULT false,
    CONSTRAINT users_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to admin;

GRANT ALL ON TABLE public.users TO admin;
```

#### create the entries table 

```bash
#### create entries 
REATE SEQUENCE entries_id_seq  
    START WITH 1  
    INCREMENT BY 1  
    NO MINVALUE  
    NO MAXVALUE  
    CACHE 1;


CREATE TABLE IF NOT EXISTS public.entries  
(  
    id integer NOT NULL DEFAULT nextval('entries_id_seq'::regclass),  
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,  
    subheading character varying(255) COLLATE pg_catalog."default",  
    description text COLLATE pg_catalog."default",  
    entry_date date,  
    end_date date,  
    image_data bytea,  
    image_name character varying(255) COLLATE pg_catalog."default",  
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,  
    user_id integer,  
    country character varying(255) COLLATE pg_catalog."default" NOT NULL, 
    days integer,
    age_limit_up integer,  
    age_limit_down integer,  
    link text COLLATE pg_catalog."default",  
    CONSTRAINT entries_pkey PRIMARY KEY (id),  
    CONSTRAINT entries_user_id_fkey FOREIGN KEY (user_id)  
        REFERENCES public.users (id) MATCH SIMPLE  
        ON UPDATE NO ACTION  
        ON DELETE CASCADE  
)  
TABLESPACE pg_default;  

-- Change the owner of the entries table to 'admin'  
ALTER TABLE IF EXISTS public.entries  
    OWNER TO admin;  

-- Grant all privileges on the entries table to 'admin'  
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