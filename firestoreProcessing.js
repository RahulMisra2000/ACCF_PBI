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

// Will take records from data array and do CU in sql table
const ProcessFirestoreRecords = (data) => {
    const con = db.getConnection();
    const tblName = utilities.sqlTableName; 
    
    data.forEach((v, i, a) => {        
        utilities.showMessage({type: 'INFO', msg: `Data in record ${v.id}`});        
    });
    setTimeout(() => {
        utilities.showMessage({type: 'INFO', msg: `In 2 seconds will allow more records to be fetched from Firestore`});        
        utilities.allClearToGetMoreFirestoreRecords = 'yes';
    }, 2000);    

};

const GetFirestoreRecords = (collectionName) => {

    const recordsToReadAtOneTime = 3;
    let recsData = [];
    let xDaysAgo = new Date()
    xDaysAgo.setDate(xDaysAgo.getDate() - utilities.numberOfDaysBeforeTodayToGetRecordsFrom);

    let coll = firestoreDB.collection(collectionName);
    // coll = coll.where('createdAt', '>=', xDaysAgo.getTime());
    coll = coll.where('createdAt', '>=', 1617139272729);    
    coll = coll.limit(recordsToReadAtOneTime);
    coll = coll.orderBy('createdAt');

    //#region NOW GET THE RECORDS
    utilities.showMessage({type: 'DEBUG', msg: `lastRec is ${utilities.lastRec}`});    
    if (utilities.lastRec) {
        coll = coll.startAfter(utilities.lastRec);
    }
    
    utilities.allClearToGetMoreFirestoreRecords = 'no';
    coll.get()
    .then((querySnapshot) => {        
        querySnapshot.forEach((doc) => {
            recsData.push({ ...doc.data(), id: doc.id });                        
            utilities.lastRec = querySnapshot.docs[querySnapshot.docs.length - 1];            
        });
        utilities.showMessage({type: 'INFO', msg: `Read ${recsData.length} records from Firestore`});    

        if (recsData.length <= 0) {
            utilities.allClearToGetMoreFirestoreRecords = 'nomoreRecs';
        } else {
            ProcessFirestoreRecords(recsData);        
        }
    })
    .catch((err) => {
        utilities.showMessage({type: 'INFO', msg: `Error accessing ${collectionName} from Firestore : ${err.message}`});    
        utilities.allClearToGetMoreFirestoreRecords = 'pbm';
    })
    .finally(() => {            
    });


};

const _firestoreToSql = () => {        
    
    return new Promise((resolve, reject) => {
       
        const si = setInterval(() => {
            if (utilities.allClearToGetMoreFirestoreRecords == 'pbm') {
                utilities.showMessage({type: 'ERROR', msg: `Problem accessing Firestore collection ${utilities.firestoreCollectionName}`});    
                clearInterval(si);
                reject(`ERROR: Problem accessing Firestore collection ${utilities.firestoreCollectionName}`);
            } else if (utilities.allClearToGetMoreFirestoreRecords == 'nomoreRecs'){
                utilities.showMessage({type: 'INFO', msg: `No more records in Firestore collection ${utilities.firestoreCollectionName}`});    
                clearInterval(si);
                resolve(`DONE`);
            } else if (utilities.allClearToGetMoreFirestoreRecords == 'yes'){
                utilities.showMessage({type: 'INFO', msg: `Will try to get records from Firestore collection ${utilities.firestoreCollectionName}`});    
                GetFirestoreRecords(utilities.firestoreCollectionName);
            } else { 
                utilities.showMessage({type: 'INFO', msg: `Waiting to get Read more records from Firestore collection ${utilities.collecfirestoreCollectionNametionName}`});    
            }
        }, 7000);

    });

    //#endregion
};

const firestoreProcessing = {
    firestoreToSql: _firestoreToSql
}

export default firestoreProcessing;