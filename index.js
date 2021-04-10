// This must be the first one to get dotenv to work
// It does only side-effect
import './specialEnv.js';

import db from './connection.js';
import utilities from './utilities.js';
import state from './state.js';
import downloadPBIData from './DownloadPBIdata.js';
import sqlService from './sqlService.js';

//#region MODULE-LEVEL VARIABLES and HANDLERS 
// Defined outside all functions
let connectionMadeInterval, connectionCloseInterval;
//#endregion

//#region FUNCTONS
// Check every 6 seconds if Sql connection was made so we can start the core of our program
const SeeIfConnectionWasMade = (startProgram) => {
  connectionMadeInterval = setInterval(() => {  
    if (state.dbConnectionMade) {
      utilities.showMessage({type:'INFO', msg:'Starting Program'});
      clearInterval(connectionMadeInterval);      
      
      startProgram();
    }

    state.dbConnectionWaitCount++;
    utilities.showMessage({type: '(interval)', msg: `Waiting for Sql DB connection ${state.dbConnectionWaitCount} of ${state.dbConnectionWaitMaxCount}`});
    if (state.dbConnectionWaitCount >= state.dbConnectionWaitMaxCount) {
      clearAllIntevals();
      utilities.showMessage({type: '(interval)', msg: `Could not connect to Sql DB in ${state.dbConnectionWaitCount * 4} seconds`});
      process.exit(1);
    }
  }, 4000);  
};

const finalHouseKeeping = () => {
  return new Promise((res, rej) => {
    sqlService.writeSummary()
    .finally(() => {
      res();
    });
  });

};

// Check if we need to close the Sql database connection
const checkIfConnectionNeedsToBeClosed = () => {
  connectionCloseInterval = setInterval(async () => {
    utilities.showMessage({type:'(interval)', msg:'Checking if MySql database connection needs to be closed ...'});
    if (state.closeMySqlDatabaseConnection) {
      try {
        // Final housekeeping
        await finalHouseKeeping();
      } catch(e) {

      } finally {
        db.closeConnection();          
        utilities.showMessage({type:'INFO', msg:'PROGRAM ENDING NOW'});
        clearAllIntevals(); // because the node app won't close if there are uncleared intervals
      }      
    }
  }, 10000);  
};

const clearAllIntevals = () => {
  if (connectionMadeInterval) {
    clearInterval(connectionMadeInterval);
  }

  if (connectionCloseInterval){
    clearInterval(connectionCloseInterval);
  }
};

// 
const startProgram = () => { 
  downloadPBIData()
  .then((results) => {    
    utilities.showMessage({type:'INFO', msg:`${results}`});
  })
  .catch((e) => {
    utilities.showMessage({type:'ERROR', msg:'${e}'});
  })
  .finally(() => {
    state.closeMySqlDatabaseConnection = true;
  });;
};
//#endregion

//#region  MAIN
/* Execution starts from here because these lines of code are not in any function. They are free standing
   These are executed during the import phase
*/

// It takes a while to make sql connection, so do this as the very first thing
db.getConnection();  

SeeIfConnectionWasMade(startProgram); // setInterval
checkIfConnectionNeedsToBeClosed();   // setInterval
//#endregion
