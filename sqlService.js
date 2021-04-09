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
                utilities.showMessage({type: 'INFO', msg: `Successfully created a mysql record for Firestore Id ${firestoreRec['id']}`});                
                // Add children and ss records to the children and ss tables
                console.log(firestoreRec.children.length);
                if (firestoreRec.children.length) {
                    await createChildren(firestoreRec.id, firestoreRec.children);
                }                
                // TODO 
                // Add ss to another table
                resolve();
            }
        });       
    });
};


const createChildren = (id, children) => {
    console.log(children);
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
            con.query(`INSERT INTO pbichildren SET ?`, rec, (err, res) => { });
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


const createLogRec = ( {type, msg, collectionName, tableName}) => {
    const con = db.getConnection();
    
    const rec = { 
                    Type: type,
                    Batch: new Date(utilities.batchTime),
                    Msg: msg,
                    CollectionName: collectionName,
                    TableName: tableName
                };
    
    con.query(`INSERT INTO pbilog SET ?`, rec, (err, res) => {});       
};

const endConnection = () => {
    db.closeConnection();
};

const sqlService = {
    CUDfirestoreRecIntoMySQL,
    createRec,
    updateRec,
    createLogRec,
    endConnection
};

export default sqlService;