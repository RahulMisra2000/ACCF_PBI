import db from '../connection.js';
import utilities from '../utilities.js';
import state from '../state.js';
import LogService from '../LogService.js';


const createRec = (tblName, firestoreRec) => {
    const con = db.getConnection();
    
    const rec = { FirestoreId: firestoreRec.id,
                  CreatedAt: new Date(firestoreRec.createdAt),
                  Role: firestoreRec.role,
                  RecStatus:firestoreRec.recStatus
                };
    
    return new Promise((resolve, reject) => {
        con.query(`INSERT INTO ${tblName} SET ?`, rec, async (err, res) => {                
            if (err) {                                
                utilities.showMessage({type: 'ERROR', msg: `Processing firestore rec id: ${firestoreRec.id}`, obj:err});            
                reject();
            } else {
                utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (${tblName}) for Firestore Id ${firestoreRec.id}`});                
                state.totalUsersWrittenInMySql++;
                resolve();
            }
        });       
    });
};



// new Date().toISOString().slice(0, 19).replace('T', ' ')

// This will be called to update the Firestore information in the mysql record
const updateRec = (tblName, firestoreRec) => {
    const con = db.getConnection();

    return new Promise((resolve, reject) => {
        con.query(`UPDATE ${tblName} SET 
                                        BatchTime = ?,                                        
                                        Role = ?,
                                        RecStatus = ?,
                                        ModifiedDate = ?,
                                        NumTimesTouchedByFirestore = NumTimesTouchedByFirestore + 1
                                     WHERE FirestoreId = ?`, 
                                    [
                                        state.batchTime,                                        
                                        firestoreRec.role,
                                        firestoreRec.recStatus,
                                        new Date(),
                                        firestoreRec.id
                                    ], 
            function (err, results, fields) {
                if (err) {
                    utilities.showMessage({type: 'ERROR', msg: `Processing`, obj:err});
                    reject();
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully updated a mysql record for Firestore Id ${firestoreRec['id']}`});
                    resolve();
                }
            }
        );
    });
};

const writeSummary = async () => {   
    try {        
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Read from ${state.firestoreCollectionName} : ${state.totalRecsReadFromFirestore}`, other: 'SUMMARY'});    
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Written to ${state.sqlTableName} : ${state.totalUsersWrittenInMySql}`, other: 'SUMMARY'});    
    } finally {
        return Promise.resolve();
    }
};


const usersLogic = {    
    createRec,
    updateRec,
    writeSummary
};

export default usersLogic;