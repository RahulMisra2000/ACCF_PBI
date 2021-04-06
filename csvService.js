import fs from 'fs';
// https://github.com/mafintosh/csv-parser#api
import csv from 'csv-parser';

import utilities from './utilities.js';
import sqlService from './sqlService.js';

const csvOptions = { 
    separator: ',', 
    quote: '"',
    skipComments: true,
    strict: true 
};

const CsvLineIsInValid = (fileName, line) => {
    let errorFound = false;

    if (fileName === 'data.csv') {
        if (!line.hasOwnProperty('Id')) { 
            errorArray.push({code: 10, lineNum: csvLineNum});
            errorFound = true; 
        }
        if (line.hasOwnProperty('Id') && !utilities.isNumeric(line['Id'].trim())) {
            errorArray.push({code: 11, lineNum: csvLineNum});
            errorFound = true;
        }

        if (!line.hasOwnProperty('Name')) { 
            errorArray.push({code: 20, lineNum: csvLineNum});
            errorFound = true;
        }
        if (line.hasOwnProperty('Name') && !utilities.isAlphaNumeric(line['Name'].trim())) {
            errorArray.push({code: 21, lineNum: csvLineNum});
            errorFound = true;
        }

        if (!line.hasOwnProperty('City')) { 
            errorArray.push({code: 30, lineNum: csvLineNum});
            errorFound = true;
        }
        if (line.hasOwnProperty('City') && !utilities.isAlphaNumeric(line['City'].trim())) {
            errorArray.push({code: 31, lineNum: csvLineNum});
            errorFound = true;
        }        
        return errorFound;
    } 
    
    // Other files
    if (fileName === 'data1.csv') {

    }

};

const trimFieldsInCsvLine = (csvLine) => {
    console.log(csvLine);
    const obj = {};

    for (const key in csvLine) {
        obj[key] = csvLine[key].trim();
    }
    return {...obj};
};

const _CsvFileToMySql = (fileName) => {
    let csvLineNum = 1;
    utilities.sqlErrorsArray.length = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(fileName)
        .pipe(csv(csvOptions))
        .on('data', async (csvLine) => {                                    
            sqlService.CUDcsvLineIntoMySQL(utilities.sqlTableName, trimFieldsInCsvLine(csvLine), ++csvLineNum);  // CUD determination HERE
        })
        .on('end', () => {            
            // Give some time because the csv reading finishes a LOT faster than the sql operations
            // Hopefully the setTimeout seconds will be enough for all the csv records to be processed into the mysql table
            setTimeout(() => {
                utilities.sqlErrorsArray.length 
                    ? resolve(`${csvLineNum} csv lines were read. ${utilities.sqlErrorsArray.length} csv lines were not processed into mysql`) 
                    : resolve(`All ${csvLineNum} csv lines were read and processed into mysql`);                
            }, 10000); // TODO: When going LIVE test with max csv records and then adjust the 10 seconds to whatever is needed for safety
        });
    });      
};


const _isCsvFileValid = (fileName) => {
    let errorArray = [];
    let csvLineNum = 1;
    let errorFound = false;

    return new Promise((res, rej) => {
        fs.createReadStream(fileName)
        .pipe(csv(csvOptions))
        .on('data', (csvLine) => {
            csvLineNum++;
            if (CsvLineIsInValid(fileName, csvLine)) {
                errorFound = true;
            }            
        })
        .on('end', () => { 
            res({ isValid: !errorFound, errors: [...errorArray] });
        });
    });      
};

const csvService = {
    validateCsvFile: (fileName) => { return _isCsvFileValid(fileName) },
    CsvFileToMySql: (fileName) => { return _CsvFileToMySql(fileName) }
};

export default csvService;