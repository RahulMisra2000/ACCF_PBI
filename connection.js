// Documentation for mysql npm package - https://github.com/mysqljs/mysql
// const mysql = require('mysql');
import mysql from 'mysql';
import utilities from './utilities.js';

let con = null;

const db = {
    getConnection : () => {
        if (!con) {
            // Create the connection
            con = mysql.createConnection({
                host: process.env.host,
                user: process.env.dbUser,
                password: process.env.dbPassword,
                database: process.env.dbDatabase
            });
            con.connect((err) => {
                if (err) throw err;
                utilities.showMessage({type: 'INFO', msg: `Database connected established`});
                utilities.dbConnectionMade = true;
            });  
        }
        return con;
    },
    closeConnection : () => {
        if (con) {
            con.end();
            utilities.showMessage({type: 'INFO', msg: `Database connected closed`});
        }
    }
}


export default db;