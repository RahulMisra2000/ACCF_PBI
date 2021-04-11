import db from './connection.js';
import state from './state.js';

const createLogRec = ( {type, msg, collectionName, tableName, other}) => {
    const con = db.getConnection();
    
    return new Promise((resolve, reject) => {
        const rec = { 
                        Subsytem: 'PBI'.substring(0,20),
                        SourceFileName: process.argv[1].substring(0,40),
                        Type: type?.substring(0,8),
                        CreatedAt: new Date(),
                        Batch: new Date(state.batchTime),
                        Msg: msg?.substring(0,250),
                        CollectionName: collectionName ? collectionName.substring(0,30): state.firestoreCollectionName.substring(0,30),
                        TableName: tableName ? tableName.substring(0,30) : state.sqlTableName.substring(0,30),
                        Other: other?.substring(0,250),
                        Pid: process.pid
                    };
        
        con.query(`INSERT INTO pbilog SET ?`, rec, (err, res) => {
            resolve();
        });       
    });
};

const LogService = {
    createLogRec
};

export default LogService;