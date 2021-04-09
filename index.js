// This must be the first one to get dotenv to work
// It does only side-effect
import './specialEnv.js';

import db from './connection.js';
import utilities from './utilities.js';
import firestoreProcessing from './firestoreProcessing.js';

//#region Here only after a sql db connection was made
const driver = () => {
  
  firestoreProcessing.firestoreToSql()
  .then((results) => {    
    utilities.showMessage({type:'INFO', msg:`${results}`});
  })
  .catch((e) => {
    utilities.showMessage({type:'ERROR', msg:'${e}'});
  })
  .finally(() => {
    utilities.closeMySqlDatabaseConnection = true;
  });

};
//#endregion


//#region  MAIN
// Housekeeping

utilities.writeToLog({type: 'INFO', msg: `Running ${process.argv}`, collectionName: utilities.firestoreCollectionName });
utilities.showMessage({type:'INFO', msg:'Waiting for Sql database connection ...'});
db.getConnection();  // It takes a while to get the connection so do this as the very first thing

// Check every 6 seconds if a Sql db connection was made
const dbCheckInterval = setInterval(() => {  
  if (utilities.dbConnectionMade) {
    utilities.showMessage({type:'INFO', msg:'Starting Driver'});
    clearInterval(dbCheckInterval);
    driver();
  }
  utilities.dbConnectionWaitCount++;
  if (utilities.dbConnectionWaitCount > utilities.dbConnectionWaitMaxCount) {
    clearAllIntevals();
    utilities.showMessage(`ERROR: Could not connect to Sql database in ${utilities.dbConnectionWaitCount * 6} seconds`);
    process.exit(1);
  }
}, 6000);

// Check if we need to close the Sql database connection
const _interval = setInterval(() => {
  utilities.showMessage({type:'INFO', msg:'Checking if MySql database connection needs to be closed'});
  if (utilities.closeMySqlDatabaseConnection) {
    db.closeConnection();    
    clearAllIntevals();
    utilities.showMessage({type:'INFO', msg:'PROGRAM ENDING NOW'});
  }
}, 5000);


const clearAllIntevals = () => {
  if (_interval) {
    clearInterval(_interval);
  }

  if (dbCheckInterval){
    clearInterval(dbCheckInterval);
  }
};
//#endregion