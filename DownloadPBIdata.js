import firestoreProcessing from './firestoreProcessing.js';
import utilities from './utilities.js';

const downloadPBIData = () => {
    return firestoreProcessing.firestoreToSql();    
};

export default downloadPBIData;