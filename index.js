// This must be the first one to get dotenv to work
// It does only side-effect
import './specialEnv.js';

import db from './connection.js';
import csvService from './csvService.js';
import utilities from './utilities.js';
import firestoreProcessing from './firestoreProcessing.js';

const driver = () => {
  console.log(process.env.X);
  csvService.validateCsvFile(utilities.csvFileName)
  .then((results) => {
    if (!results.isValid) {
      utilities.showMessage({type:'ERROR', msg:'CSV Validation Failed', obj:results});
      return;                 // Make sure that the data in all the .csv records is valid. If not, stop the run
    }
    utilities.showMessage({type:'INFO', msg:'CSV Validation Passed', obj:results});
    return csvService.CsvFileToMySql(utilities.csvFileName); // returns a promise
  })
  .then((results) => {
    utilities.showMessage({type:'INFO', msg:'', obj:utilities.sqlErrorsArray});
    return firestoreProcessing.sqlToFirestore();
  })
  .then((info) => {
    utilities.showMessage({type:'INFO', msg:info});
  })
  .catch((e) => {
    // One or more sql errors were encountered -- details are in utilities.sqlErrorsArray    
    utilities.showMessage({type:'ERROR', msg:'', obj:e});
  })
  .finally(() => {
  
  });

  const dbProcessing = () => {
    const con = db.getConnection();

    // R of CRUD - For SMALL data set
    con.query('SELECT * FROM city', (err,rows) => {
        if(err) throw err;
      
        console.log('Data received from Db:');
        rows.forEach( (row) => {
            // console.log(`${row.Name} population is ${row.Population}`);
        });
      });
    
    
      // R of CRUD - For LARGE data set
    const processRow = (row, cb) => {
        console.log(`Population of ${row.Name} is ${row.Population} and modified date is ${row.Modified} ... ${new Date(row.Modified).getTime()}`);
        cb();
    };
    https://github.com/mysqljs/mysql#streaming-query-rows
    var query = con.query('SELECT * FROM city');
    query
      .on('error', function(err) {
        // Handle error, an 'end' event will be emitted after this as well
        console.log(err);
      })
      .on('fields', function(fields) {
        // the field packets for the rows to follow
        console.log(fields);
      })
      .on('result', function(row) {
        // Pausing the connnection is useful if your processing involves I/O
        con.pause();
    
        processRow(row, function() {      
          con.resume();
        });
      })
      .on('end', function() {
        // all rows have been received
        console.log("all have been read");
      });
    
    
    // C of CRUD
    let insertedId;
    const rec = { Name: 'Boca Raton', CountryCode: 'USA', District: 'Palm Beach', Population: 100000 };
    con.query('INSERT INTO city SET ?', rec, (err, res) => {
      if(err) throw err;
      insertedId = res.insertId;  
      console.log('Last insert Id:', insertedId);
    });
    
    // U of CRUD
    let CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };
    //let sql = mysql.format('UPDATE city SET Modified = ? WHERE id = ?', [CURRENT_TIMESTAMP, insertedId]);
    let sql = `UPDATE city SET Modified = CURRENT_TIMESTAMP() WHERE Id = 4094`;
    console.log("***********************************************");
    console.log(sql);
    
    con.query(sql, function (error, results, fields) {
        if (error) throw error;
        console.log('changed ' + results.changedRows + ' rows');
    })
    
    // D of CRUD
    /* con.query('DELETE FROM city WHERE Name = "Boca Raton"', function (error, results, fields) {
        if (error) throw error;
        console.log('deleted ' + results.affectedRows + ' rows');
    })
    */
    
    db.closeConnection();
    
    
    
    
    
    // csv parser https://www.npmjs.com/package/csv-parser
    
    
  };
};

// MAIN
// Housekeeping
utilities.showMessage({type:'INFO', msg:'Waiting for database connection ...'});
db.getConnection();  // It takes a while to get the connection so do this as the very first thing

// Give enough time for the db connecition to be made before we start the app
setTimeout(() => {
  utilities.showMessage({type:'INFO', msg:'Starting Driver'});
  driver();
}, 6000);

// Check if we need to close the mysql database connection
const _interval = setInterval(() => {
  utilities.showMessage({type:'INFO', msg:'Checking if MySql database connection needs to be closed'});
  if (utilities.closeMySqlDatabaseConnection) {
    db.closeConnection();    
    clearInterval(_interval);
    utilities.showMessage({type:'INFO', msg:'PROGRAM ENDING NOW'});
  }
}, 15000);