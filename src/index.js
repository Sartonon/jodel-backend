const express = require('express');
const _ = require('lodash');
const axios = require('axios');
const nodemailer = require('nodemailer');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({
  port: 8081
});

app.use(cors());

const messages = [];
let connections = 0;

setInterval(() => {
  try {
    wss.broadcast(JSON.stringify({
      type: 'userAmount',
      amount: connections,
    }));
  } catch (err) {
    console.log(err);
  }
}, 1000);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/api/messages', function(req, res) {
  res.send(messages);
});

app.get('/api/messages/:id', function(req, res) {
  console.log(req.params.id);
  const post = messages.find(m => m.id === req.params.id);
  res.send(post);
});

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

wss.on('connection', function(ws) {
  connections++;
  ws.on('message', function(msg) {
    const data = JSON.parse(msg);

    if (data.type === "jodel") {
      handleJodelPost(data);
    } else if (data.type === "upvote") {
      handleUpvote(data);
    } else if (data.type === "downvote") {
      handleDownvote(data);
    }
  });

  ws.on('error', function(e) {
    console.log('error!: ' + e);
  });

  ws.on('close', function(e) {
    connections--;
    console.log('client closed connection!');
  });
});

wss.on('error', function() {
  console.log('errored');
});

app.listen(3010, function() {
  console.log('listening on port 3001');
});

async function handleJodelPost(data) {
  const apiResponse = await axios.get("http://api.forismatic.com/api/1.0/?method=getQuote&lang=en&format=json");
  const apiData = apiResponse.data;
  const jodel = {
    name: data.name,
    message: data.message,
    color: data.color,
    id: _.uniqueId('jodel_'),
    votes: 0,
    quoteText: apiData.quoteText,
    quoteAuthor: apiData.quoteAuthor,
    time: data.time,
  };
  // sendMail(jodel);
  if (data.message) {
    messages.unshift(jodel);
    wss.broadcast(JSON.stringify({
      type: 'jodel',
      ...jodel,
    }));
  }
}

function handleUpvote(data) {
  const message = messages.find(m => m.id === data.id);
  message.votes++;
  wss.broadcast(JSON.stringify({
    type: "vote",
    data: message
  }));
}

function handleDownvote(data) {
  const message = messages.find(m => m.id === data.id);
  message.votes--;
  wss.broadcast(JSON.stringify({
    type: "vote",
    data: message
  }));
}

function sendMail(jodel) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'fbp2aqreg4ydmeyc@ethereal.email',
      pass: 'eWvtY7H7wMX6dw8eeC'
    }
  });

  const mailOptions = {
    from: 'youremail@gmail.com',
    to: 'santtu_1993@hotmail.com',
    subject: 'Uusi jodlaus!',
    text: jodel.message
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}
