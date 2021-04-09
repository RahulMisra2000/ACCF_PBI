import crypto from 'crypto';
import sqlService from './sqlService.js';

// I AM KEEPING SOME STATE INFO HERE AS WELL
const utilities = {
    sqlTableName : 'pbicustomer',
    firestoreCollectionName : 'customers',
    isAlphaNumeric : (data) => {
        return /[a-z0-9]+/i.test(data);        
    },
    isNumeric: (data) => {
        return /^[0-9]+$/.test(data);        
    },    
    getHash: (data) => {
        // data is a javascript object
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    },
    showMessage: ({type, msg, obj}) => {
        if (process.env.showConsoleMessage == 'yes'){
            console.log(`${Date.now()}: ${type}: ${msg}`);
            if (obj) {
                console.log(obj);
            }
        }
    },
    writeToLog: (obj) => {
        sqlService.createLogRec(obj);
    },

    batchTime: Date.now(),
    closeMySqlDatabaseConnection : false,
    sqlErrorsArray: [],
    dbConnectionMade: false,
    dbConnectionWaitCount: 0,
    dbConnectionWaitMaxCount: 4,

    numberOfDaysBeforeTodayToGetRecordsFrom: 15,
    lastRec: null,

    allClearToGetMoreFirestoreRecords: 'yes'
};

export default utilities;