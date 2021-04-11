const state = {
    firestoreCollectionName : process.argv[2] ? process.argv[2] : 'customers',
    sqlTableName : process.argv[3] ? process.argv[3] : 'pbicustomer',
    
    batchTime: Date.now(),
    closeMySqlDatabaseConnection : false,
    sqlErrorsArray: [],
    dbConnectionMade: false,
    dbConnectionWaitCount: 0,
    dbConnectionWaitMaxCount: 5,

    numberOfDaysBeforeTodayToGetRecordsFrom: 15,
    lastRec: null,

    allClearToGetMoreFirestoreRecords: 'yes',

    totalRecsReadFromFirestore: 0,
    totalCustomersWrittenInMySql: 0,
    totalChildrenWrittenInMySql: 0,
    totalSSWrittenInMySql: 0,

    totalCustomersUpdatedInMySql: 0,
    totalChildrenUpdatedInMySql: 0,
    totalSSUpdatedInMySql: 0,

    totalUsersWrittenInMySql: 0,

};

export default state;