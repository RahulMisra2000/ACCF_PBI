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
                host: 'localhost',
                user: 'root',
                password: '123saibaba',
                database: 'world'
            });
            con.connect((err) => {
                if (err) throw err;
                utilities.showMessage({type: 'INFO', msg: `Database connected established`});
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