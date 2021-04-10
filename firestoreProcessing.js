import admin from 'firebase-admin';
import utilities from './utilities.js';
import state from './state.js';
import sqlService from './sqlService.js';

//import serviceAccount from './rm2000app-firebase-adminsdk-93cvg-7977f045fd.json';

// STEPS ARE HERE https://firebase.google.com/docs/admin/setup#windows

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.ADMINCRED)),
  databaseURL: "https://rm2000app.firebaseio.com",
});

const firestoreDB = admin.firestore();

// Will take records from data array and do CU in sql table
const ProcessFirestoreRecords = (data) => {
    let rowsProcessed = 0;
    let rowsToProcess = data.length;
    state.totalRecsReadFromFirestore+= data.length;            

    // Helper
    const _interval = setInterval(() => {
        if (rowsProcessed >= rowsToProcess) {
            utilities.showMessage({type: 'INFO', msg: `${rowsProcessed} / ${rowsToProcess} records have been processed. So, ok to request next batch`});
            state.allClearToGetMoreFirestoreRecords = 'yes';
            clearInterval(_interval);
        }        
    }, 1000);

    data.forEach(async (v, i, a) => {        
        utilities.showMessage({type: 'INFO', msg: `Data in record ${v.id}`});        
        try {
            await sqlService.CUDfirestoreRecIntoMySQL(state.sqlTableName, v);
        } catch (e) {
        } finally {            
            rowsProcessed++;            
        }
    });
};

const GetFirestoreRecords = (collectionName) => {

    const recordsToReadAtOneTime = 3;
    let recsData = [];
    let xDaysAgo = new Date()
    xDaysAgo.setDate(xDaysAgo.getDate() - state.numberOfDaysBeforeTodayToGetRecordsFrom);

    let coll = firestoreDB.collection(collectionName);
    // coll = coll.where('createdAt', '>=', xDaysAgo.getTime());
    coll = coll.where('createdAt', '>=', 1617139272729);    
    coll = coll.limit(recordsToReadAtOneTime);
    coll = coll.orderBy('createdAt');

    //#region NOW GET THE RECORDS
    utilities.showMessage({type: 'DEBUG', msg: `lastRec is ${state.lastRec}`});    
    if (state.lastRec) {
        coll = coll.startAfter(state.lastRec);
    }
    
    state.allClearToGetMoreFirestoreRecords = 'no';
    coll.get()
    .then((querySnapshot) => {        
        querySnapshot.forEach((doc) => {
            recsData.push({ ...doc.data(), id: doc.id });                        
            state.lastRec = querySnapshot.docs[querySnapshot.docs.length - 1];            
        });
        utilities.showMessage({type: 'INFO', msg: `Read ${recsData.length} records from Firestore`});    

        if (recsData.length <= 0) {
            state.allClearToGetMoreFirestoreRecords = 'nomoreRecs';
        } else {
            ProcessFirestoreRecords(recsData);        
        }
    })
    .catch((err) => {
        utilities.showMessage({type: 'ERROR', msg: `Error accessing ${collectionName} from Firestore : ${err.message}`});    
        state.allClearToGetMoreFirestoreRecords = 'pbm';
    })
    .finally(() => {            
    });


};

const _firestoreToSql = () => {        
    
    return new Promise((resolve, reject) => {
       
        const si = setInterval(() => {
            if (state.allClearToGetMoreFirestoreRecords == 'pbm') {
                utilities.showMessage({type: 'ERROR', msg: `Problem accessing Firestore collection ${state.firestoreCollectionName}`});    
                clearInterval(si);
                reject(`ERROR: Problem accessing Firestore collection ${state.firestoreCollectionName}`);
            } else if (state.allClearToGetMoreFirestoreRecords == 'nomoreRecs'){
                utilities.showMessage({type: 'INFO', msg: `No more records in Firestore collection ${state.firestoreCollectionName}`});    
                clearInterval(si);
                resolve(`DONE`);
            } else if (state.allClearToGetMoreFirestoreRecords == 'yes'){
                utilities.showMessage({type: 'INFO', msg: `Will try to get records from Firestore collection ${state.firestoreCollectionName}`});    
                GetFirestoreRecords(state.firestoreCollectionName);
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