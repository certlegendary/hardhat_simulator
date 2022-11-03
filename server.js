const { exec } = require("child_process");
const fs = require("fs");

var WebSocketServer = require('ws').Server;   // webSocket library
const os = require("os")

const wssPort = process.env.PORT || 80;             // port number for the webSocket server
const wss = new WebSocketServer({ port: wssPort }); // the webSocket server
var clients = new Array;         // list of client connections
var index = 0;

let stateOfChild = {}////0:turn off,1:turn on

function handleConnection(client, request) {
	index++;

	console.log("New Connection");
	clients.push(client);
	function endClient() {
		var position = clients.indexOf(client);
		clients.splice(position, 1);
		console.log("connection closed");
	}

	function clientResponse(data) {
		index++;
		data = JSON.parse(data);
		if (data.start == false) {
			let content = JSON.stringify(data);
            fs.writeFile("./config.js", "module.exports = " + content, err=>{
                if(err){
                    console.error(err);
                }
                exec("yarn hardhat run scripts/script.js", (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                        return;
                    }
                    console.log(`stdout: ${stdout}`);

                });
                broadcast(JSON.stringify({ type: "stop", id: data.id }))

            })
		} else {
			
			broadcast(JSON.stringify({ type: "stop", id: data.id }))
			stateOfChild[data.id] = 0

		}
		
	}

	client.on('message', clientResponse);
	client.on('close', endClient);
}

function broadcast(data) {
	for (c in clients) {
		if (clients[c])
			clients[c].send(data);
	}
}

wss.on('connection', handleConnection);

console.log("Hardhat Simulator Started!");
