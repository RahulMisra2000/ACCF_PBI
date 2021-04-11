import db from '../connection.js';
import utilities from '../utilities.js';
import state from '../state.js';
import LogService from '../LogService.js';


//#region "C of CUD"
const createRec = (tblName, firestoreRec) => {
    const con = db.getConnection();
    
    const rec = { FirestoreId: firestoreRec.id,
                  BatchTime: state.batchTime,
                  CreatedAt: new Date(firestoreRec.createdAt),
                  Crisis: firestoreRec.crisis,
                  Name: firestoreRec.name,
                  Email: firestoreRec.email,
                  Phone: firestoreRec.phone,
                  Rating: firestoreRec.rating,
                  Status: firestoreRec.status,
                  RecStatus:firestoreRec.recStatus,
                  ServiceCompletion: firestoreRec.serviceCompletion,
                  Uid: firestoreRec.uid,
                  UidEmail: firestoreRec.uidEmail
                };
    
    return new Promise((resolve, reject) => {
        con.query(`INSERT INTO ${tblName} SET ?`, rec, async (err, res) => {                
            if (err) {                                
                utilities.showMessage({type: 'ERROR', msg: `Processing firestore rec id: ${firestoreRec.id}`, obj:err});            
                reject();
            } else {
                utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (${tblName}) for Firestore Id ${firestoreRec.id}`});                
                state.totalCustomersWrittenInMySql++;  
                try {              
                    await _createChildrenTable(firestoreRec);
                    await _createPbisTable(firestoreRec);
                } catch (e) {
                    //
                }
                finally {
                    resolve();
                }
            }
        });       
    });
};


const _createChildrenTable = (firestoreRec) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        let rowsProcessed = 0;
        let rowsInError = 0;
        let rowsToProcess = firestoreRec.children.length;

        // Helper
        const _interval = setInterval(() => {
            if (rowsProcessed >= rowsToProcess) { 
                clearInterval(_interval);
                if (rowsInError) {
                    reject();
                } else {
                    resolve();               
                }
            }        
        }, 1000);
        

        firestoreRec.children.forEach((v, i, a) => {
            const rec = {
                Age: +v.age,
                Grade: v.grade,
                Name: v.name,
                School: v.school,
                CustomerFirestoreId: firestoreRec.id,
                BatchTime: new Date(state.batchTime),
                Uid : firestoreRec.uid,
                UidEmail : firestoreRec.uidEmail,
                Status : firestoreRec.status,
                RecStatus : firestoreRec.recStatus,
                ModifiedDate : new Date(),
                NumTimesTouchedByFirestore : 1
            };
            con.query(`INSERT INTO pbichildren SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbichildren while processing firestore rec id: ${firestoreRec.id}`, obj:err, other: err.message});                 
                    rowsInError++;
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pchildren) for Firestore Id ${firestoreRec.id}`});  
                    state.totalChildrenWrittenInMySql++; 
                }
                rowsProcessed++;                      
             });
        });
    });
};

const _createPbisTable = (firestoreRec) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        let rowsProcessed = 0;
        let rowsInError = 0;
        let rowsToProcess = firestoreRec.ss.length;

        // Helper
        const _interval = setInterval(() => {
            if (rowsProcessed >= rowsToProcess) { 
                clearInterval(_interval);
                if (rowsInError) {
                    reject();
                } else {
                    resolve();               
                }
            }        
        }, 1000);
    

        firestoreRec.ss.forEach((v, i, a) => {
            const rec = {
                CreatedAt: new Date(v.date),
                Strength: v.strength,
                Stressor: v.stressor,                
                CustomerFirestoreId: firestoreRec.id,
                BatchTime: new Date(state.batchTime),
                Uid : firestoreRec.uid,
                UidEmail : firestoreRec.uidEmail,
                Status : firestoreRec.status,
                RecStatus : firestoreRec.recStatus,
                ModifiedDate : new Date(),
                NumTimesTouchedByFirestore : 1
            };
            con.query(`INSERT INTO pbiss SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbiss while processing firestore rec id: ${firestoreRec.id}`, obj:err, other: err.message});                 
                    rowsInError++;
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pbiss) for Firestore Id ${firestoreRec.id}`});   
                    state.totalSSWrittenInMySql++;
                }
                rowsProcessed++;
             });
        });
    });
};

//#endregion


const _updateChildrenTable = (firestoreRec) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        let rowsProcessed = 0;
        let rowsInError = 0;
        let rowsToProcess = firestoreRec.children.length;

        // Helper
        const _interval = setInterval(() => {
            if (rowsProcessed >= rowsToProcess) { 
                clearInterval(_interval);
                if (rowsInError) {
                    reject();
                } else {
                    resolve();               
                }
            }        
        }, 1000);
        

        firestoreRec.children.forEach((v, i, a) => {
            con.query(`UPDATE pbichildren 
                SET 
                    Age = ?,
                    Grade = ?,
                    Name = ?,
                    School = ?,
                    CustomerFirestoreId = ?,
                    BatchTime = ?,
                    Uid = ?,
                    UidEmail = ?,
                    Status = ?,
                    RecStatus = ?,
                    ModifiedDate = ?,
                    NumTimesTouchedByFirestore = NumTimesTouchedByFirestore + 1
                WHERE FirestoreId = ?`, 
                    [
                    +v.age,
                    v.grade,
                    v.name,
                    v.school,
                    firestoreRec.id,
                    new Date(state.batchTime),
                    firestoreRec.uid,
                    firestoreRec.uidEmail,
                    firestoreRec.status,
                    firestoreRec.recStatus,
                    new Date(),
                    
                    firestoreRec.id
                 ], 
                (err, res) => {
                    if (err) {                                
                        utilities.showMessage({type: 'ERROR', msg: `Updating rec in pbichildren while processing firestore rec id: ${firestoreRec.id}`, obj:err, other: err.message});                 
                        rowsInError++;
                    } else {
                        utilities.showMessage({type: 'INFO', msg: `Successfully update a mysql record in (pchildren) for Firestore Id ${firestoreRec.id}`});  
                        state.totalChildrenWrittenInMySql++; 
                    }
                    rowsProcessed++;                      
                });
        });
    });
};


const _updatePbisTable = (firestoreRec) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        let rowsProcessed = 0;
        let rowsInError = 0;
        let rowsToProcess = firestoreRec.ss.length;

        
        if (!firestoreRec.ss.length) {
            return Promise.resolve()
        }

        // Helper
        const _interval = setInterval(() => {
            if (rowsProcessed >= rowsToProcess) { 
                clearInterval(_interval);
                if (rowsInError) {
                    reject();
                } else {
                    resolve();               
                }
            }        
        }, 1000);
        

        firestoreRec.ss.forEach((v, i, a) => {
            con.query(`UPDATE pbiss 
                SET 
                    CreatedAt = ?,
                    Strength = ?,
                    Stressor = ?,
                    CustomerFirestoreId = ?,
                    BatchTime = ?,
                    Uid = ?,
                    UidEmail = ?,
                    Status = ?,
                    RecStatus = ?,
                    ModifiedDate = ?,
                    NumTimesTouchedByFirestore = NumTimesTouchedByFirestore + 1
                WHERE FirestoreId = ?`, 
                    [
                    new Date(v.createdAt),
                    v.strength,
                    v.stressor,                    
                    firestoreRec.id,
                    new Date(state.batchTime),
                    firestoreRec.uid,
                    firestoreRec.uidEmail,
                    firestoreRec.status,
                    firestoreRec.recStatus,
                    new Date(),
                    
                    firestoreRec.id
                 ], 
                (err, res) => {
                    if (err) {                                
                        utilities.showMessage({type: 'ERROR', msg: `Updating rec in pbichildren while processing firestore rec id: ${firestoreRec.id}`, obj:err, other: err.message});                 
                        rowsInError++;
                    } else {
                        utilities.showMessage({type: 'INFO', msg: `Successfully update a mysql record in (pchildren) for Firestore Id ${firestoreRec.id}`});  
                        state.totalChildrenWrittenInMySql++; 
                    }
                    rowsProcessed++;                      
                });
        });
    });
};



//#region U of CUD
// This will be called to update the Firestore information in the mysql record
const updateRec = (tblName, firestoreRec) => {
    const con = db.getConnection();

    return new Promise((resolve, reject) => {
        con.query(`UPDATE ${tblName} SET 
                                        Status = ?,
                                        BatchTime = ?,
                                        CreatedAt = ?,
                                        Crisis = ?,
                                        Name = ?,
                                        Email = ?,
                                        Phone = ?,
                                        Rating = ?,
                                        Status = ?,
                                        RecStatus = ?,
                                        ServiceCompletion = ?,
                                        Uid = ?,
                                        UidEmail = ?,
                                        ModifiedDate = ?,
                                        NumTimesTouchedByFirestore = NumTimesTouchedByFirestore + 1
                                     WHERE FirestoreId = ?`, 
                                    [
                                        firestoreRec.status,
                                        state.batchTime,
                                        new Date(firestoreRec.createdAt),
                                        firestoreRec.crisis,
                                        firestoreRec.name,
                                        firestoreRec.email,
                                        firestoreRec.phone,
                                        firestoreRec.rating,
                                        firestoreRec.status,
                                        firestoreRec.recStatus,
                                        firestoreRec.serviceCompletion,
                                        firestoreRec.uid,
                                        firestoreRec.uidEmail,
                                        new Date(),
                                        firestoreRec.id
                                    ], 
            async (err, results, fields) => {
                if (err) {
                    utilities.showMessage({type: 'ERROR', msg: `Processing`, obj:err});
                    reject();
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully updated a mysql record for Firestore Id ${firestoreRec['id']}`});
                    
                    await _updateChildrenTable(firestoreRec);           // UPDATE pbichildren table
                    await _updatePbisTable(firestoreRec);               // UPDATE pbiss table
                    resolve();
                }
            }
        );
    });
};
//#endregion


const writeSummary = async () => {   
    try {        
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Read from ${state.firestoreCollectionName} : ${state.totalRecsReadFromFirestore}`, other: 'SUMMARY'});    
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Written to ${state.sqlTableName} : ${state.totalCustomersWrittenInMySql}`, other: 'SUMMARY'});    
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Written to pchildren : ${state.totalChildrenWrittenInMySql}`, other: 'SUMMARY'});    
        await LogService.createLogRec({type:'INFO', msg: ` Total Records Written to pbiss : ${state.totalSSWrittenInMySql}`, other: 'SUMMARY'});    
    } finally {
        return Promise.resolve();
    }
};


const customersLogic = {    
    createRec,
    updateRec,
    writeSummary
};

export default customersLogic;