import db from './connection.js';
import state from './state.js';
import LogService from './LogService.js';

let mod;

// Dynamic import
// Make sure for every Firestore collection that you want to download that you have a namesake.js file
// in the moduleLogic folder
import(`./moduleLogic/${state.firestoreCollectionName}.js`).then((module) => {
    mod = module.default;
});

const CUDfirestoreRecIntoMySQL = (tblName, firestoreRec) => {
    const con = db.getConnection(); 

    // Check if Id from firestore rec matches FirestoreId in mysql table
    return new Promise(async (resolve, reject) => {

        try {
            await readRecByFirestoreId(tblName, firestoreRec.id);
            await mod.updateRec(tblName, firestoreRec, true);
        } catch (e) {
            await mod.createRec(tblName, firestoreRec);                
        }  finally {
            resolve();
        }             
    });
};

// Returns promise
const readRecByFirestoreId = (tblName, id) => {
    const con = db.getConnection();
    
    return new Promise((resolve, reject) => {
        con.query({
            sql: `SELECT * FROM ${tblName} WHERE FirestoreId = ?`,
            timeout: 10000, // 10s
            values: [id]
          }, function (err, rows, fields) {
                if(!rows.length) {                             
                    reject();  // Record not found in mysql
                } else {                
                    resolve(); // Record found in mysql
                }
            });
    });    
};

const writeSummary = async () => {   
    try {
        mod.writeSummary();        
    } finally {
        return Promise.resolve();
    }
};

const endConnection = () => {
    LogService.createLogRec({info:'INFO', msg:'Closing Connection Now', collectionName: state.firestoreCollectionName, tableName: state.sqlTableName});
    db.closeConnection();
};

const sqlService = {
    CUDfirestoreRecIntoMySQL,
    writeSummary,
    endConnection
};

export default sqlService;