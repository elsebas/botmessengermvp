"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
const mysql = require('mysql2');
var foodtruck_id = 1; //ID del MVP FoodTruck bot 
var conn = require("./connection").Connection;


var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});



//------------------CONTROLADOR RAIZ-------------------------
var bot = new builder.UniversalBot(connector,function(session)
{
    console.log('Aqui va el session message');
    
    session.send("Hello %s Welcome to our Bot", session.message.address.user.name);
    session.send("Would you like to see our Menu ?");
   
    var msg = new builder.Message(session);
    msg.attachments([
        new builder.HeroCard(session)
            .buttons
            ([
                builder.CardAction.postBack(session, "Menu", "YES"),
                builder.CardAction.postBack(session, "noMenu", "NO"),
                 builder.CardAction.postBack(session, "otherOptions", "More")
            ])    
    ]);
    session.send(msg);
    
});

bot.localePath(path.join(__dirname, './locale'));

//------------------AUTH LOGIN OWNER------------------------
bot.dialog('authOwner', 
[
function (session) 
{
    builder.Prompts.text(session,"Plese Type username");

},function(session,results)
{   
    session.userData.username = results.response;
    console.log(results.response);
    console.log(session.userData.username);
    builder.Prompts.text(session,"Plese Type password");

},function(session,results)
{
    var username = session.userData.username;
    session.userData.username = {};
    console.log(results.response);
    var password = results.response;

    console.log(username);
    console.log(password);
    conn.query
    (
    'SELECT COUNT(*) FROM `owner` WHERE `username` = ? AND `password`=? AND foodtruck_id=?',[username,password,foodtruck_id],
        function(err, results, fields) 
        {
            if(err)
            {
                showErrorAuthenticathed(session);
            }

                
                var result = results[0];
               
                if(result['COUNT(*)'])
                {
                    console.log(result['COUNT(*)']);
                    var count  = result['COUNT(*)'];
                    if(count == "1")
                    { 
                        
                        builder.Prompts.text(session,"User authenticated");
                        session.userData.authenticated = true;
                        showOwnerMenu(session);

                       
                    }
                    else
                    {
                        showErrorAuthenticathed(session);
                    }
                }
                else
                {
                    showErrorAuthenticathed(session);
                }
            
               
            
        }

    );

}
]).triggerAction({ matches: /Owner Login/
      
});

//------------------CLOSE OWNER SESSION------------------------
bot.dialog('logoutOwner', function (session) 
{
    if(session.userData.authenticated)
    {
        session.userData.authenticated = false;
        session.send('Session closed, thanks for using the bot');
    }

}).triggerAction({ matches: /(Owner Logout)/i });


//------------------SHOW OWNER MENU------------------------
bot.dialog('showOwnerOptions', function (session) 
{
    if(session.userData.authenticated)
    {
      showOwnerMenu(session);
    }

}).triggerAction({ matches: /(Owner Options)/i });

//------------------SHOW SPECIALS CLIENT------------------------
bot.dialog('showSpecials', function (session) 
{
         conn.query
        (
    'SELECT * FROM `product` WHERE `foodtruck_id` = ? AND `special`=? ',[foodtruck_id,1],
        function(err, results, fields) 
        {
            if (err)  {session.send("Information not Available");}
            else
            {

            
                var msg = new builder.Message(session);
                var attachments = [];
                results.forEach(function(value,index)
                { 

                    var card = 
                     new builder.HeroCard(session)
                            .title(value.title)
                            .subtitle(value.description)
                            .text("$"+value.cost)
                            .buttons
                            ([
                                builder.CardAction.postBack(session, "buy "+value._id, "Buy")
                            ]);
                        
                    attachments.push(card);
                  
                });
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                msg.attachments(attachments);
                session.send(msg);
            }
        }
        ); 
      

}).triggerAction({ matches: /(specials|SPECIALS|select Specials)/i });

//------------------SET SPECIALS OWNER------------------------
bot.dialog('showSpecialsAdmin', function (session) 
{       

    if(session.userData.authenticated)
       {
        session.send("Select the Today's Specials");
        session.send("Type 'set Specials' if you make a mistake, Type 'Owner Options' to comeback owner menu");
        
            conn.query
            (
            'SELECT * FROM `product` WHERE `foodtruck_id` = ? ',[foodtruck_id],
                function(err, results, fields) 
                {
                    if (err){builder.Prompts.text(session,"Information not Available");}
                    else
                    {
                      
                        var msg = new builder.Message(session);
                        var attachments = [];
                        results.forEach(function(value,index)
                        { 
                            
                            var card = 
                             new builder.HeroCard(session)
                                    .title(value.title)
                                    .subtitle(value.description)
                                    .text("$"+value.cost)
                                    .buttons
                                    ([
                                        builder.CardAction.postBack(session, "add "+value.id+" special" ,"Add Special")
                                    ]);
                                
                            attachments.push(card);
                          
                        });
                        msg.attachmentLayout(builder.AttachmentLayout.carousel);
                        msg.attachments(attachments);
                        session.send(msg);

                        conn.query
                        (
                            'UPDATE `product` SET `special`= ? WHERE `foodtruck_id` = ? ',[0,foodtruck_id],
                            function(err, results, fields) 
                            {
                                if(err)
                                {
                                    builder.Prompts.text(session,"Error processing the request");

                                }
                                else
                                {
                                    console.log('Actualizo todos a cero');
                                }
                            }
                        );
                    }
                }
                ); 
    }
    else
    {
        
    }
      
}).triggerAction({ matches: /(set Specials)/i,
   
});


bot.dialog('setSpecialsAdmin', function (session, args) 
{
    var utterance = args.intent.matched.input;
    console.log(utterance);
    var str =""+utterance;
    var res = str.split(" ");
    console.log("String partido "+res[1]);
    var id = res[1];
    
      conn.query
        (
        'UPDATE `product` SET `special`=? WHERE `foodtruck_id` = ? AND `id` = ?',[1,foodtruck_id,id],
        function(err, results, fields) 
        {
            if(err)
            {
                session.send("Error processing the request");
  
            }
            else
            {
                session.send("Added");

            }
        }
        ); 
        
      
}).triggerAction({ matches: /add\s.*special/i,
    
    onSelectAction: (session, args) => 

 {
    console.log(args.intent.matched.input);
    session.beginDialog('setSpecialsAdmin',args);   
}





});


//------------------REVIEWS BOT-------------------------
bot.dialog('giveReview', function (session) {
    
    session.send("Please give us your opinion");
    session.send("What is your impression about the bot ?");

    var msg = new builder.Message(session)
        .suggestedActions(
            builder.SuggestedActions.create(
                    session, [
                        builder.CardAction.postBack(session, "give review 1", "1"),
                        builder.CardAction.postBack(session, "give review 2", "2"),
                        builder.CardAction.postBack(session, "give review 3", "3"),
                        builder.CardAction.postBack(session, "give review 4", "4"),
                        builder.CardAction.postBack(session, "give review 5", "5")
                    ]
                ));
        session.send(msg);  

}).triggerAction({ matches: /(review|REVIEWS|Review|Calification|calification|give review)/i});

bot.dialog('registerReview', function (session,args) 
{
    console.log(args.intent.matched.input);
    /*
    var reviewChar = args.intent.matched.input;
    var lastChar = reviewChar.substr(reviewChar.length - 1);*/
    var utterance = args.intent.matched.input;
    console.log(utterance);
    var str =""+utterance;
    var res = str.split(" ");
    console.log("String partido "+res[2]);
    var id = res[2];

    try
    {
        conn.query
        (
              'INSERT INTO `reviews`(value,foodtruck_id) VALUES (?,?) ',[id,foodtruck_id],
              function(err, results, fields) 
              {  
                    if(err){session.send('Try again later');  }
                    else{session.send('Thanks for your Review');  }
                    

              }    
        );
    }catch(e)
    {

    }
    
  
}).triggerAction({ matches: /^(give review\s)(1|2|3|4|5)/i,
 onSelectAction: (session, args) => 
    {
    
    session.beginDialog('registerReview',args);
     
    }
      
});


//------------------MENU-------------------------

bot.dialog('showMenu', function (session) {
    
    session.send("This is our menu");

    session.userData = {};
    var msg = new builder.Message(session);
    msg.attachments([
        new builder.HeroCard(session)
            .title('Feel confortable choosing your options')
            .buttons([
                builder.CardAction.postBack(session, "select Food", "Main Menu"),
                builder.CardAction.postBack(session, "select Drinks", "Drinks"),
                builder.CardAction.postBack(session, "select Sides", "Sides"),
                builder.CardAction.postBack(session, "select Specials", "Specials"),
            ])    
    ]);
    session.send(msg);
}).triggerAction({ matches: /(menu|MENU|Menu|Main Menu|drinks|food)/i,
 onSelectAction: (session, args) => 

 {
    console.log(args.intent.matched.input);
     if(  /^(menu|MENU|Menu|Main Menu)/i.test(args.intent.matched.input))
     {
        try
        {
            console.log(args);
            session.beginDialog('showMenu');
        }catch(e)
        {

        }
           
     }
     else
     {
    
        var msg = new builder.Message(session)
        .text("Did you mean Menu ?")
        .suggestedActions(
            builder.SuggestedActions.create(
                    session, [
                        builder.CardAction.postBack(session, "showMenu", "YES")
                    ]
                ));
        session.send(msg);  

     }
      
}


 });

//--------------HOURS OF OPERATION CLIENT-------------------------

bot.dialog('showHours', function (session) 
{

         var dayindex = new Date();
         var day = dayindex.getDay();
         console.log(dayindex.getDay());
        conn.query(
          'SELECT * FROM `hours_operation` WHERE `foodtruck_id` = ? AND `day_week` = ?',[foodtruck_id,day],
          function(err, results, fields) {

                if (err) {  session.send("Information not Available");}
                else
                {
                    if(results[0].hour=="")
                    {
                        session.send("Today We do not open, thanks");
                    }
                    else
                    {
                        session.send("Today We are open from %s",results[0].hour);
    
                    }
                }
              
                       
          }
        );
           
 
}).triggerAction({ matches: /^(hou|HOU|HOURS|hours|hour|HOUR)/i,
 onSelectAction: (session, args) => 

 {
    console.log(args.intent.matched.input);
     if(args.intent.matched.input =="Hours")
     {
            console.log('En el select Action');
            console.log(args);
            try
            {
                session.beginDialog('showHours');
            }catch(e)
            {
                session.send('Try Again Later')
            }
     }
     else
     {
    
        var msg = new builder.Message(session)
        .text("Did you mean Hours?")
        .suggestedActions(
            builder.SuggestedActions.create(
                    session, [
                        builder.CardAction.postBack(session, "Hours", "YES"),
                        builder.CardAction.postBack(session, "", "NO")
                    ]
                ));
        session.send(msg);  

     }
      
}

 });
//--------------SET HOURS OF OPERATION OWNER-------------------------


bot.dialog('setHoursOwner', [function (session) 
{
    builder.Prompts.text(session,"Select the Hours of operation day per day\n\nIf you dont work that day just Type 'Empty'\n\nHours of operation at monday ? (Example: 10AM to 3PM )");
 
},function(session,results)
{
  console.log(results.response);
  if(results.response!="Empty")
  {
    saveHourOperation(session,1,results.response);
  }else
  {

     saveHourOperation(session,1,"");
  }
    builder.Prompts.text(session,"Tuesday ?");
}
,function(session,results)
{
    console.log(results.response);

    if(results.response!="Empty")
  {
       saveHourOperation(session,2,results.response);
  }else
  {
    saveHourOperation(session,2,"");
  }
    builder.Prompts.text(session,"Wednesday ?");

}
,function(session,results)
{
    console.log(results.response);

    if(results.response!="Empty")
  {
     saveHourOperation(session,3,results.response);
  }else
  {
     saveHourOperation(session,3,"");
  }
    builder.Prompts.text(session,"Thursday ?");

}
,function(session,results)
{
    console.log(results.response);

 if(results.response!="Empty")
  {
     saveHourOperation(session,4,results.response);
  }else
  {
     saveHourOperation(session,4,"");
  }
    builder.Prompts.text(session,"Friday ?");
}
,function(session,results)
{
  console.log(results.response);

  if(results.response!="Empty")
  {
     saveHourOperation(session,5,results.response);
  }else
  {
     saveHourOperation(session,5,"");
  }
    builder.Prompts.text(session,"Saturday ?");
}
,function(session,results)
{
  console.log(results.response);

 if(results.response!="Empty")
  {
     saveHourOperation(session,6,results.response);
  }else
  {
     saveHourOperation(session,6,"");
  }
    builder.Prompts.text(session,"Sunday ?");

}
,function(session,results)
{
  console.log(results.response);

    if(results.response!="Empty")
    {
       saveHourOperation(session,7,results.response);
    }else
    {
       saveHourOperation(session,7,"");
    }
    builder.Prompts.text(session,"Hours of operation Updated, to comeback please Type 'Owner Options' ");
    verifyConnection();
}
]).triggerAction({ matches: /set Hours/i,

 onSelectAction: (session, args) => 

 {
  
     if(session.userData.authenticated)
     {   
            try
            {
                session.beginDialog('setHoursOwner');
            }catch(e)
            {
                session.send("Try Again, Type 'set Hours' ");
            }
     }

}

});

//------------------CONTACT INFORMATION------------------------

bot.dialog('contact', function (session) 
{
       
    builder.Prompts.text(session,"If you like to place an order");
    conn.query
    (
    'SELECT * FROM `foodtruck` WHERE `id` = ?',[foodtruck_id],
          function(err, results, fields) 
          {

                if (err)  session.send("Information not Available");
                try
                {
                    if(results[0].phone_number=="")
                    {
                        session.send("Information not Available")
                    }
                    else
                    {
                        session.send("Call us at %s",results[0].phone_number);

                    }
                }catch(err)
                {
                     session.send("Information not Available")
                }
                
                       
          }
        );
        
}).triggerAction({ matches: /^(contact|contact information|call)/i });

//--------------HELP-------------------------
bot.dialog('showHelp', function (session) {

  var msg = new builder.Message(session);
    msg.attachments([
        new builder.HeroCard(session)
            
            .buttons([
                builder.CardAction.postBack(session, "Hours", "Hours of operations"),
                builder.CardAction.postBack(session, "location", "Our location "),
                builder.CardAction.postBack(session, "contact", "Contact information"),
                builder.CardAction.postBack(session, "menu", "See the menu"),
            ])    
    ]);
    session.send(msg);

}).triggerAction({ matches: /(no|otherOptions)/i }

);


//--------------SET LOCATION (OWNER)-------------------------
bot.dialog('setLocation',[
    
    function (session)
    {
        builder.Prompts.text(session, "Send me your current location.");
    },
    function (session,results) 
    {
        
        console.log(results);
        if(session.message.entities.length != 0){
            console.log(session.message.entities[0].geo.latitude);
            console.log(session.message.entities[0].geo.longitude);

            //session.userData.lat = session.message.entities[0].geo.latitude;
            //session.userData.lon = session.message.entities[0].geo.longitude;
            session.endDialog();
        }else
        {
            session.endDialog("Sorry, I didn't get your location.");
        }
    }
    /*
    function (session)
    {
    var data = { method: "sendMessage", parameters: { text: "<b>Save time by sending us your current location.</b>", parse_mode: "HTML", reply_markup: { keyboard: [ [ { text: "Share location", request_location: true } ] ] } } };
    const message = new builder.Message(session);
    message.setChannelData(data);
    session.send(message);
    }*/

]).triggerAction({ matches: /(set Location)/i }

);

//--------------GET LOCATION-------------------------

bot.dialog('showLocation', function (session) {

    conn.query
    (
    'SELECT * FROM `foodtruck` WHERE `id` = ?',[foodtruck_id],
          function(err, results, fields) 
          {

                if (err)  session.send("Information not Available");
                try
                {
                    if(results[0].latitude==""||results[0].longitude=="")
                    {
                        session.send("Information not Available")
                    }
                    else
                    {
                        var latitude = results[0].latitude;
                        var longitude = results[0].longitude;
                        msg = 'http://maps.google.com/maps?q='+latitude+','+longitude;
                        session.send(msg);

                    }
                }catch(err)
                {
                     session.send("Information not Available")
                }
                
                       
          }
        );


}).triggerAction({ matches: /(location|LOCATION|Location|ubication|Ubication|where?|Where)/i }

);



//--------------SHOW MAIN MENU-------------------------


bot.dialog('cards', function (session) 
{



}).triggerAction({ matches: /select Food/i });


function getFoodtruckInformation()
{
    conn.query
    (
    'SELECT * FROM `foodtruck` WHERE `id` = ?',[foodtruck_id],
          function(err, results, fields) 
          {
                if (!err) return results[0];   
                       
          }
        );

}

function getProducts()
{
    conn.query
    (
    'SELECT * FROM `product` WHERE `foodtruck_id` = ?',[foodtruck_id],
          function(err, results, fields) 
          {
                if (!err)  return results;                         
          }
        );
}



function showErrorAuthenticathed(session)
{
        builder.Prompts.text(session,"User not found, Repeat the process?");
                 
                  var msg = new builder.Message(session)
                    .text("")
                    .suggestedActions(
                        builder.SuggestedActions.create(
                                session, [
                                    builder.CardAction.postBack(session, "Login Owner", "YES"),
                                    builder.CardAction.postBack(session, "/", "NO")
                                ]
                            ));
                    session.send(msg);  
                        session.send(msg);  
}



//------------------OWNER MENU-----------------------
function showOwnerMenu(session)
{
     session.send("Owner Options: ");

     var msg = new builder.Message(session)
        .suggestedActions(
        builder.SuggestedActions.create(
        session, [
        builder.CardAction.postBack(session, "set Specials", "Update Specials"),
        builder.CardAction.postBack(session, "set Hours", "Update Hours of operation"),
        builder.CardAction.postBack(session, "Logout Owner", "Logout"),
        ]
        ));
    session.send(msg);  
   
}

function saveHourOperation(session,day,msg)
{ console.log(msg);
    try
    {
        conn.query
        (
              'UPDATE `hours_operation` SET  hour = ? WHERE foodtruck_id=? AND day_week=? ',[msg,foodtruck_id,day],
              function(err, results, fields) 
              {        
                    session.send('Saved');  

              }    
        );
    }catch(e)
    {

    }

}

function verifyConnection()
{
    conn.connect(
    function (err) { 
    if (err) { 
        console.log("!!! Cannot connect !!! Error:");
        console(err);
        var config =
        {
            host: 'foodtruckserver2.mysql.database.azure.com',
            user: 'sebanime02@foodtruckserver2',
            password: 'Pendejo2025',
            database: 'foodtruckdb',
            port: 3306,
            ssl: true
        };
        const conn = new mysql.createConnection(config);
    }
    else
    {
       console.log("Connection established.");
          
    }   
});
}


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
