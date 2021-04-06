import crypto from 'crypto';

const utilities = {
    csvFileName : 'data.csv',
    sqlTableName : 'parent',
    firestoreCollectionName : 'parent',
    isAlphaNumeric : (data) => {
        return /[a-z0-9]+/i.test(data);        
    },
    isNumeric: (data) => {
        return /^[0-9]+$/.test(data);        
    },    
    sqlErrorsArray: [],
    getHash: (data) => {
        // data is a javascript object
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    },
    batchTime: Date.now(),
    closeMySqlDatabaseConnection : false,
    showMessage: ({type, msg, obj}) => {
        console.log(`${Date.now()}: ${type}: ${msg}`);
        if (obj) {
            console.log(obj);
        }
    }
};

export default utilities;