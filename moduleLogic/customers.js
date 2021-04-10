import db from '../connection.js';
import utilities from '../utilities.js';
import state from '../state.js';
import LogService from '../LogService.js';


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

                // Add children and ss data which are arrays in the firestore record, to the children and ss tables in SQL
                if (firestoreRec.children.length) {
                    await _createChildrenTable(firestoreRec.id, firestoreRec.children);
                }                
                
                // Add ss to another table
                if (firestoreRec.ss.length) {
                    await _createPbisTable(firestoreRec.id, firestoreRec.ss);
                }
                resolve();
            }
        });       
    });
};


const _createChildrenTable = (id, children) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        children.forEach((v, i, a) => {
            const rec = {
                Age: +v.age,
                Grade: v.grade,
                Name: v.name,
                School: v.school,
                CustomerId: id,
                BatchTime: new Date(state.batchTime)
            };
            con.query(`INSERT INTO pbichildren SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbichildren while processing firestore rec id: ${id}`, obj:err, other: err.message});                 
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pchildren) for Firestore Id ${id}`});  
                    state.totalChildrenWrittenInMySql++; 
                }
             });
        });

        setTimeout(() => {
            resolve();       
        }, 1000);        
    });
};

const _createPbisTable = (id, ss) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        ss.forEach((v, i, a) => {
            const rec = {
                Date: v.date,
                Strength: v.strength,
                Stressor: v.stressor,                
                CustomerId: id,
                BatchTime: new Date(state.batchTime)
            };
            con.query(`INSERT INTO pbiss SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbiss while processing firestore rec id: ${id}`, obj:err, other: err.message});                 
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pbiss) for Firestore Id ${id}`});   
                    state.totalSSWrittenInMySql++;
                }
             });
        });

        setTimeout(() => {
            resolve();       
        }, 1000);        
    });
};





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
            function (err, results, fields) {
                if (err) {
                    utilities.showMessage({type: 'ERROR', msg: `Processing`, obj:err});
                    reject();
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully updated a mysql record for Firestore Id ${firestoreRec['id']}`});
                    // TODO  Will need to update the pbichildren and pbiss tables as well from data in the two arrays children and ss
                    resolve();
                }
            }
        );
    });
};

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