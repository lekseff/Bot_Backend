const http = require('http');
const express = require( 'express');
const WebSocket = require( 'ws');
const uuid = require('uuid');
const Logic = require('./Logic');

const PORT = 8080;
const logic = new Logic();

const app = express();
const server = http.createServer(app);

const webSocketServer = new WebSocket.Server({ server });

webSocketServer.on('connection', (ws) => {
  const id = uuid.v4();
  ws.id = id; // id websocket

  ws.on('message', msg => {
      
    const receivedData = JSON.parse(msg);

    switch(receivedData.event) {
      case 'newMessage':
      case 'upLoadFile':
        multipleSending(logic.processingData(receivedData), id);
        break;
      case 'geolocation':
        ws.send(JSON.stringify(
          logic.processingData(receivedData)  
        ));
        break;
      case 'getLastMessage':
        ws.send(JSON.stringify(
          logic.getLastMessage(receivedData)
        ));
        break;
      case 'getHistory':
        ws.send(JSON.stringify(
          logic.loadHistory(receivedData)
        ));
        break;
      case 'command':      
          logic.processingData(receivedData)
          .then((data) => {
            ws.send(JSON.stringify(data));
          });    
        break;
      default:
    }

  });

  ws.on('close', () => {});

  ws.on("error", e => ws.send(e));
});

server.listen(PORT, () => console.log("Server started 8080"));

/**
 * Рассылка по всем сокетам. Если это команда, ответ получит только отправитель команды
 * @param {*} data - 
 */
function multipleSending(data, id) {

  let isCommand = false;
  // Если тип сообщение, проверяем на наличие команды
  if (data.message) {
    isCommand = (data.message.startsWith('/get'));
  }
  
  webSocketServer.clients.forEach((client) => {
    if (!isCommand) {
      client.send(JSON.stringify(data));
    } else if (client.id === id) {
        client.send(JSON.stringify(data));      
    }    
  });
}