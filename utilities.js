import crypto from 'crypto';
import state from './state.js';
import LogService from './LogService.js';

const utilities = {
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
            utilities.writeToLog({type, msg, collectionName: state.firestoreCollectionName, tableName: state.sqlTableName, other});
        } else if (process.env.writeOnlyErrorTypeToLogTable == 'yes'){            
            if (type == 'ERROR') {
                utilities.writeToLog({type, msg, collectionName: state.firestoreCollectionName, tableName: state.sqlTableName, other});
            }
        }
        
    },
    writeToLog: (obj) => {
        LogService.createLogRec(obj);
    }
};

export default utilities;