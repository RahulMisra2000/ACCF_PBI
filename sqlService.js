import db from './connection.js';
import utilities from './utilities.js';

const CUDfirestoreRecIntoMySQL = (tblName, firestoreRec) => {
    const con = db.getConnection();
    let results;

    // Check if Id from firestore rec matches FirestoreId in mysql table
    return new Promise(async (resolve, reject) => {

        try {
            await readRecByFirestoreId(tblName, firestoreRec['id']);
            try {
                await updateRec(tblName, firestoreRec, true);         
                resolve();
            }
            catch (e){    
                reject();            
            }
        } catch (e) {
            try {
                await createRec(tblName, firestoreRec);                
                resolve();
            } catch (e) {
                reject();
            }            
        }                
    });
};

const createRec = (tblName, firestoreRec) => {
    const con = db.getConnection();
    
    const rec = { FirestoreId: firestoreRec.id,
                  BatchTime: utilities.batchTime,
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
                utilities.totalCustomersWrittenInMySql++;

                // Add children and ss data which are arrays in the firestore record, to the children and ss tables in SQL
                if (firestoreRec.children.length) {
                    await createChildrenTable(firestoreRec.id, firestoreRec.children);
                }                
                
                // Add ss to another table
                if (firestoreRec.ss.length) {
                    await createPbisTable(firestoreRec.id, firestoreRec.ss);
                }
                resolve();
            }
        });       
    });
};


const createChildrenTable = (id, children) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        children.forEach((v, i, a) => {
            const rec = {
                Age: +v.age,
                Grade: v.grade,
                Name: v.name,
                School: v.school,
                CustomerId: id,
                BatchTime: new Date(utilities.batchTime)
            };
            con.query(`INSERT INTO pbichildren SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbichildren while processing firestore rec id: ${id}`, obj:err, other: err.message});                 
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pchildren) for Firestore Id ${id}`});  
                    utilities.totalChildrenWrittenInMySql++; 
                }
             });
        });

        setTimeout(() => {
            resolve();       
        }, 1000);        
    });
};

const createPbisTable = (id, ss) => {
    const con = db.getConnection();

    return new Promise(async (resolve, reject) => {
        ss.forEach((v, i, a) => {
            const rec = {
                Date: v.date,
                Strength: v.strength,
                Stressor: v.stressor,                
                CustomerId: id,
                BatchTime: new Date(utilities.batchTime)
            };
            con.query(`INSERT INTO pbiss SET ?`, rec, (err, res) => {
                if (err) {                                
                    utilities.showMessage({type: 'ERROR', msg: `Creating rec in pbiss while processing firestore rec id: ${id}`, obj:err, other: err.message});                 
                } else {
                    utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record in (pbiss) for Firestore Id ${id}`});   
                    utilities.totalSSWrittenInMySql++;
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
                                        NumTimesTouchedByFirestore = NumTimesTouchedByFirestore + 1
                                     WHERE FirestoreId = ?`, 
                                    [
                                        firestoreRec.status,
                                        utilities.batchTime,
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


const createLogRec = ( {type, msg, collectionName, tableName, other}) => {
    const con = db.getConnection();
    
    return new Promise((resolve, reject) => {
        const rec = { 
                        Type: type,
                        CreatedAt: new Date(Date.now()),
                        Batch: new Date(utilities.batchTime),
                        Msg: msg,
                        CollectionName: collectionName,
                        TableName: tableName,
                        Other: other,
                        Pid: process.pid
                    };
        
        con.query(`INSERT INTO pbilog SET ?`, rec, (err, res) => {
            resolve();
        });       
    });
};


const writeSummary = async () => {    
    try {
        await createLogRec({type:'INFO', msg: ` Total Records Read from ${utilities.firestoreCollectionName} : ${utilities.totalRecsReadFromFirestore}`, other: 'SUMMARY'});    
        await createLogRec({type:'INFO', msg: ` Total Records Written to ${utilities.sqlTableName} : ${utilities.totalCustomersWrittenInMySql}`, other: 'SUMMARY'});    
        await createLogRec({type:'INFO', msg: ` Total Records Written to pchildren : ${utilities.totalChildrenWrittenInMySql}`, other: 'SUMMARY'});    
        await createLogRec({type:'INFO', msg: ` Total Records Written to pbiss : ${utilities.totalSSWrittenInMySql}`, other: 'SUMMARY'});    
    } finally {
        return Promise.resolve();
    }
};

const endConnection = () => {
    utilities.writeToLog({info:'INFO', msg:'Closing Connection Now', collectionName: utilities.firestoreCollectionName, tableName: utilities.sqlTableName});
    db.closeConnection();
};

const sqlService = {
    CUDfirestoreRecIntoMySQL,
    createRec,
    updateRec,
    createLogRec,
    writeSummary,
    endConnection
};

export default sqlService;