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
                // This is an async callback by mysql software
                if (!err) {
                    utilities.showMessage({type: 'INFO', msg: `(((Database connected established)))`});
                    utilities.dbConnectionMade = true;
                }
                // We are not ignoring the error. We are working off utilities.dbConnectionMade and so that is the same thing
            });  
        }
        return con;
    },
    closeConnection : () => {
        if (con) {            
            utilities.showMessage({type: 'INFO', msg: `Database connected closed`});
            setTimeout(() => {
                // The timeout gives other messages elsewhere in the application a possible chance to be written to the log table
                con.end();
            }, 1000);            
        }
    }
}


export default db;