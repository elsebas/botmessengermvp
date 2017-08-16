"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

bot.localePath(path.join(__dirname, './locale'));


var bot = new builder.UniversalBot(connector, 
    function (session) 
    {
    }
);

bot.dialog('hidialog', 
    [
 
    function (session) 
    {
        
       session.send('Hi %s!', session.message.address.user.name);
       session.send('blablabla, please type "name" ');
       session.send('if you want more information, please type "info" ');
        session.endDialog(); 
       

    }
]).triggerAction({ matches:  /(hi)/  });



bot.dialog('presentationdialog', 
    [
 
    function (session) 
    {
      
        
        session.endDialog('My name is menubot, a bot to restaurants'); 
       

    }
]).triggerAction({ matches:  /(name)/  });



bot.dialog('infodialog', 
    [
 
    function (session) 
    {
      
        session.endDialog('Developed By Hutek INC.'); //terminan los dialogs, lo devuelve al function session del UniversalBot

    }
]).triggerAction({ matches:  /(info)/  });



if (useEmulator) 
{
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
