import db from './connection.js';
import state from './state.js';

const createLogRec = ( {type, msg, collectionName, tableName, other}) => {
    const con = db.getConnection();
    
    return new Promise((resolve, reject) => {
        const rec = { 
                        Type: type,
                        CreatedAt: new Date(Date.now()),
                        Batch: new Date(state.batchTime),
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

const LogService = {
    createLogRec
};

export default LogService;