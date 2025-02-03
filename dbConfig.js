require('dotenv').config();  
const mysql = require('mysql2/promise');  

const isProduction = process.env.NODE_ENV === 'production';  

const connectionConfig = {  
    host: process.env.DB_HOST,  
    user: process.env.DB_USER,  
    password: process.env.DB_PASSWORD,  
    database: process.env.DB_DATABASE,  
    port: process.env.DB_PORT,  
    // Commenting out allowPublicKeyRetrieval unless you confirm you need it  
    // allowPublicKeyRetrieval: true,  
    waitForConnections: true,  
    connectionLimit: 10,  
    queueLimit: 0  
};  

const pool = mysql.createPool(isProduction ? process.env.DB_DATABASE_URL : connectionConfig);  

module.exports = { pool };