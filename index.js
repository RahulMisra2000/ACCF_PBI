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