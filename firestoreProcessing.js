import admin from 'firebase-admin';
import db from './connection.js';
import utilities from './utilities.js';
import sqlService from './sqlService.js';

//import serviceAccount from './rm2000app-firebase-adminsdk-93cvg-7977f045fd.json';

// STEPS ARE HERE https://firebase.google.com/docs/admin/setup#windows

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.ADMINCRED)),
  databaseURL: "https://rm2000app.firebaseio.com",
});

const firestoreDB = admin.firestore();

const _closeMySqlConnection = () => {
    setTimeout(() => {        
        utilities.showMessage({type: 'INFO', msg: 'Closing connection in 15 seconds'});
        utilities.closeMySqlDatabaseConnection = true;
    }, 15000);
};

const _processMySqlStatus1Records = (rows) => {    
    const rowsToProcess = rows.length;
    let rowsProcessed = 0;
    
    // Helper
    const _interval = setInterval(() => {
        if (rowsProcessed >= rowsToProcess) {
            utilities.showMessage({type: 'INFO', msg: `${rowsProcessed} / ${rowsToProcess} mysql records have been processed. So now closing mysql database connection`});
            _closeMySqlConnection();
            clearInterval(_interval);
        }        
    }, 6000);


    // MAIN LOOP
    utilities.showMessage({type: 'INFO', msg: `Starting Main SQL Loop for ${rows.length} records`}); 
    rows.forEach((v, i, a) => {               
        if (v['FirestoreId']) {         // this record was once uploaded to Firestore, that is why it has a value in FirestoreID
            // so let's try to update it
            utilities.showMessage({type: 'INFO', msg: `FirestoreID ${v['FirestoreId']} exists in SQL record so, will try to update Firestore Record with Name and City`});        

            firestoreDB.collection(utilities.firestoreCollectionName).doc(v['FirestoreId'])
            .update({
                Name: v['Name'],
                City: v['City']
            })
            .then(() => {                
                utilities.showMessage({type: 'INFO', msg: `Firestore document successfully updated`});        
                
                // Update the mysql record
                utilities.showMessage({type: 'INFO', msg: `Will now update the SQL record`});        
                sqlService.updateRec1(utilities.sqlTableName, {
                    Id: v['Id'],
                    Status: 99,
                    FirestoreProcessCounter: 2,
                    FirestoreId: v['FirestoreId']                                 
                });
            })
            .catch((error) => {
                // The document probably doesn't exist.
                utilities.showMessage({type: 'ERROR', msg: `Error updating Firestore doc or updating SQL record`, obj:error});        
            })
            .finally(() =>{
                rowsProcessed++;
            });
        } else {
            // Add to Firestore
            utilities.showMessage({type: 'INFO', msg: `No FirestoreID in SQL record so, will try to add Firestore Record`});        
            firestoreDB.collection(utilities.firestoreCollectionName)
            .add({
                Name: v['Name'],
                City: v['City'],
                ProcareId: v['ProcareId'],
                MysqlId: v['Id']
            })
            .then((docRef) => {
                utilities.showMessage({type: 'INFO', msg: `Firestore document successfully added, Id is ${docRef.id}`});        

                // Update the mysql record
                utilities.showMessage({type: 'INFO', msg: `Will now update the SQL record`});        
                sqlService.updateRec1(utilities.sqlTableName, {
                    Id: v['Id'],
                    Status: 99,
                    FirestoreProcessCounter: 1,
                    FirestoreId: docRef.id                    
                });
            })
            .catch((error) => {
                utilities.showMessage({type: 'ERROR', msg: `Error adding Firestore doc or updating SQL record`, obj:error});        
            })
            .finally(() => {
                rowsProcessed++;
            });
        }
    });
};

const _sqlToFirestore = () => {
    const tblName = utilities.sqlTableName;
    const con = db.getConnection();
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            utilities.showMessage({type: 'INFO', msg: `In 6 seconds will do SQL --> Firestore processing. Read Staus 1 records from table ${tblName} and will do CU in Firestore and U in SQL`});        
        
            con.query({
                sql: `SELECT * FROM ${tblName} WHERE Status = ?`,
                timeout: 10000, // 10s
                values: [1]
              }, function (err, rows, fields) {
                if(!rows.length) {             
                    _closeMySqlConnection();                  
                    reject({msg: `No Status 1 records found in ${tblName}, so no Firestore CU activity was required`});
                } else {
                    _processMySqlStatus1Records(rows);                                             
                    resolve({msg: `There were ${rows.length} sql records that needed processing`});
                }
              });
        }, 6000);
    });    
};

const firestoreProcessing = {
    sqlToFirestore: _sqlToFirestore    
}

export default firestoreProcessing;