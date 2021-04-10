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
    showMessage: ({type, msg, obj, other}) => {
        if (process.env.showConsoleMessage == 'yes'){
            console.log(`${Date.now()}: ${type}: ${msg}`);
            if (obj) {
                console.log(obj);
            }
        }        
        if (process.env.writeAllMessagesToLogTable == 'yes'){
            utilities.writeToLog({type, msg, collectionName: utilities.firestoreCollectionName, tableName: utilities.sqlTableName, other});
        } else if (process.env.writeOnlyErrorTypeToLogTable == 'yes'){            
            if (type == 'ERROR') {
                utilities.writeToLog({type, msg, collectionName: utilities.firestoreCollectionName, tableName: utilities.sqlTableName, other});
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
    dbConnectionWaitMaxCount: 5,

    numberOfDaysBeforeTodayToGetRecordsFrom: 15,
    lastRec: null,

    allClearToGetMoreFirestoreRecords: 'yes',

    totalRecsReadFromFirestore: 0,
    totalCustomersWrittenInMySql: 0,
    totalChildrenWrittenInMySql: 0,
    totalSSWrittenInMySql: 0
};

export default utilities;