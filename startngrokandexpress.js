// This must be the first one to get dotenv to work
// It does only side-effect
import './specialEnv.js';

import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';
import path from 'path';
import child_process from 'child_process';

import db from './connection.js';
import utilities from './utilities.js';
import downloadPBIData from './DownloadPBIdata.js';
import { SIGTERM } from 'constants';
import state from './state.js';


//#region MODULE-LEVEL VARIABLES
// Defined outside all functions
let connectionMadeInterval, connectionCloseInterval;
let downloadDataProcessingInProgress = false;

let app = express();
let httpServer = http.createServer(app);

// This program either needs to be run from the location where it will be saved on the hard drive
let privateKey = fs.readFileSync(path.join(path.resolve('./'), '/key.pem'), "utf8");
let certificate = fs.readFileSync(path.join(path.resolve('./'), '/cert.pem'), "utf8");
let credentials = { key: privateKey, cert: certificate };

let httpsServer = https.createServer(credentials, app);
//#endregion

//#region FUNCTONS
const shutdownServers = () => {
  httpServer?.close(() => {
    utilities.showMessage({type: '(interval)', msg: `HTTP server closed`});
  });

  httpsServer?.close(() => {
    utilities.showMessage({type: '(interval)', msg: `HTTPS server closed`});
  });

  state.closeMySqlDatabaseConnection = true;
};

process.on("uncaughtException", (err) => {
  utilities.showMessage({type: '(interval)', msg: `${err.message.substring(0,120)}`, other: `uncaughtException`});
  shutdownServers();
  }
);
process.on("unhandledRejection", (err) => {
  utilities.showMessage({type: '(interval)', msg: `${err.message.substring(0,120)}`, other: `unhandledRejection`});
  shutdownServers();
});

process.on('SIGTERM', () => {
  utilities.showMessage({type: '(interval)', msg: `Received SIGTERM`});
  shutdownServers();
})


// Check every 6 seconds if a Sql connection was made
const SeeIfConnectionWasMade = (startProgram) => {
  connectionMadeInterval = setInterval(() => {  
    if (state.dbConnectionMade) {      
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

// Check if we need to close the Sql database connection
const checkIfConnectionNeedsToBeClosed = () => {
  connectionCloseInterval = setInterval(() => {
    utilities.showMessage({type:'(interval)', msg:'Checking if MySql database connection needs to be closed ...'});
    if (state.closeMySqlDatabaseConnection) {
      db.closeConnection();          
      utilities.showMessage({type:'INFO', msg:'PROGRAM ENDING NOW'});
      clearAllIntevals(); // because the node app won't close if there are uncleared intervals
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
  utilities.showMessage({type: 'INFO', msg: `Starting ${process.argv[1]}`, other:`PID ${process.pid} - PPID ${process.ppid}`});

  app.get('/', function (req, res) {      
    return res.send(`Hi, My Process Id is ${process.pid}. Data Download in Progress (Flag): ${downloadDataProcessingInProgress}`);    
  });
  


  // This route has no real value .. just academic to see if state is saved across invocations
  app.get('/end/:pid', function (req, res) {
    
    if (req.params.pid) {
      process.kill(+req.params.pid, SIGTERM);
      utilities.showMessage({type: 'INFO', msg: `Just Killed PID: ${req.params.pid}`});
      return res.send(`Just killed PID: ${req.params.pid}`);
    }
    
    if (!downloadDataProcessingInProgress) {
      downloadDataProcessingInProgress = true;
      shutdownServers();
      return res.send('Shutting down the program');
    }
    
    if (downloadDataProcessingInProgress) {
      return res.send('PBI data download from Firestore into SQL is already in progress. Please wait ...');
    }
  });
  
  app.get('/end', function (req, res) {
    
    if (!downloadDataProcessingInProgress) {
      downloadDataProcessingInProgress = true;
      shutdownServers();
      return res.send('Shutting down the program');
    }
    
    if (downloadDataProcessingInProgress) {
      return res.send('PBI data download from Firestore into SQL is already in progress. Please wait ...');
    }
  });
  

  app.get('/pbi', function (req, res) {    
    if (!downloadDataProcessingInProgress) {
      downloadDataProcessingInProgress = true;
      
      downloadPBIData()
      .then((results) => {    
        utilities.showMessage({type:'INFO', msg:`${results}`});
      })
      .catch((e) => {
        utilities.showMessage({type:'ERROR', msg:'${e}'});
      })
      .finally(() => {
        state.closeMySqlDatabaseConnection = true;
        downloadDataProcessingInProgress = false;
      });

      return res.send('Will now download PBI data from Firestore into SQL');      
    }

    if (downloadDataProcessingInProgress) {
      return res.send('PBI data download from Firestore into SQL is already in progress. Please wait ...');
    }
  });
  
  app.get("/reboot", (req, res)=>{
    
    if (!downloadDataProcessingInProgress) {
      downloadDataProcessingInProgress = true;
    
      setTimeout(function () {
          // When NodeJS exits
          process.on("exit", function () {
              shutdownServers();
              child_process.spawn(process.argv.shift(), process.argv, {
                  cwd: process.cwd(),
                  detached : true,
                  stdio: "inherit"
              });
          });
          process.exit();
      }, 1000);
    }

    if (downloadDataProcessingInProgress) {
      return res.send('PBI data download from Firestore into SQL is already in progress. Please wait to reboot program ...');
    }
  })
  
  httpServer.listen(8080, () => {
    utilities.showMessage({type: 'INFO', msg: `Web Server (http) started at port: 8080`, other:`PID ${process.pid} - PPID ${process.ppid}`});
  });
  httpsServer.listen(8443, () => {
    utilities.showMessage({type: 'INFO', msg: `Web Server (https) started at port: 8443`, other:`PID ${process.pid} - PPID ${process.ppid}`});
  });  
};
//#endregion

//#region  MAIN
/* Execution starts from here because these lines of code are not in any function.
   These are executed during the import phase
*/
// It takes a while to make sql connection, so do this as the very first thing
db.getConnection();  

SeeIfConnectionWasMade(startProgram); // setInterval
checkIfConnectionNeedsToBeClosed();   // setInterval

//#endregion