var fs = require("fs");
var http = require("http");
var https = require("https");
const path = require('path');
var express = require("express");
const { SIGTERM } = require("constants");


// TODO 
// This should write to a sql table called RUNLOG
// the name column should be the name of the program
// 


const dontShowScreenOutput = false;

const showMessage = (msg, obj) => {
  if (dontShowScreenOutput) { 
    return; 
  }

  if (msg) {
    console.log(msg);
  }
  if (obj) {
    console.log(obj);
  }
};

showMessage('FIRST LINE');

const shutdownServers = () => {
  httpServer?.close(() => {
    showMessage('http server closed', null);
  });

  httpsServer?.close(() => {
    showMessage('https server closed', null);
  });
};

process.on("uncaughtException", (err) => {
  shutdownServers();
  showMessage("uncaughtException", err);
  }
);
process.on("unhandledRejection", (err) => {
  shutdownServers();
  showMessage("unhandledRejection", err);
});

process.on('SIGTERM', () => {
  showMessage('Received sigterm');
  shutdownServers();
})

var app = express();
var httpServer = http.createServer(app);

// This was created using openssl (under Git for Windows installation) using instructions in the first part of
// https://nodejs.org/en/knowledge/HTTP/servers/how-to-create-a-HTTPS-server/


var privateKey = fs.readFileSync(path.join(__dirname, '/key.pem'), "utf8");
var certificate = fs.readFileSync(path.join(__dirname, '/cert.pem'), "utf8");
var credentials = { key: privateKey, cert: certificate };

var httpsServer = https.createServer(credentials, app);

httpServer.listen(8080, () => {
  showMessage("Web Server (http) started at port: 8080");
});
httpsServer.listen(8443, () => {
  showMessage("Web Server (httpS) started at port: 8443");
});


app.get('/', function (req, res) {  
  showMessage(`My Process Id is ${process.pid}`);
  res.send('hi');
});

app.get('/end', function (req, res) {
  shutdownServers();
  res.send('ending now');
});

app.get("/reboot", (req, res)=>{
  setTimeout(function () {
      // When NodeJS exits
      process.on("exit", function () {
          shutdownServers();
          require("child_process").spawn(process.argv.shift(), process.argv, {
              cwd: process.cwd(),
              detached : true,
              stdio: "inherit"
          });
      });
      process.exit();
  }, 5000);
})


/*
setTimeout(() => {
  showMessage('sigterm now');
  process.kill(process.pid, 'SIGTERM');
}, 6000);
*/
