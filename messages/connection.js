const mysql = require('mysql2');
//------------------DATABASE CONNECTION-------------------------

var config =
{
    host: 'foodtruckserver2.mysql.database.azure.com',
    user: 'sebanime02@foodtruckserver2',
    password: 'Pendejo2025',
    database: 'foodtruckdb',
    port: 3306,
    ssl: true
};

/*
var config =
{
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'foodtruckdb',
    port: 3306,
    ssl: false
};
*/

const conn = new mysql.createConnection(config);

conn.connect(
    function (err) { 
    if (err) { 
        console.log("!!! Cannot connect !!! Error:");
        throw err;
    }
    else
    {
       console.log("Connection established.");
          
    }   
});

module.exports.Connection = conn;