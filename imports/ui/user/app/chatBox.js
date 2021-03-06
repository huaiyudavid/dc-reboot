import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { MessagesCollection } from '../../../api/collections/game_collections.js';
import { ParametersInfo } from '../../../api/collections/game_collections.js';
import { SessionInfo } from '../../../api/collections/game_collections.js';
import { NeighborhoodsInfo } from '../../../api/collections/game_collections.js';

import { ColorMagic } from '../../../api/colors_mapping.js';


import './chatBox.html';

Template.chatBox.onCreated(function() {
    console.log('ParametersInfo');
    console.log(ParametersInfo.findOne({userId: Meteor.userId()}));
    var charactersLimit = ParametersInfo.findOne({userId: Meteor.userId()}).messageLengthBound;
    Session.set('charactersLimit', charactersLimit);
    Session.set('charactersRemaining', charactersLimit);
});

Template.chatBox.helpers({
    messages: function() {
        var messagesToBeReturned = []; 
        var messagesCursor;
        
        messagesCursor = MessagesCollection.find({}, {sort: {timestamp: 1}});
        console.log('messages');
        console.log(messagesCursor.fetch());
        var nameOfClient = '';

        var namesOfNeighbors = NeighborhoodsInfo.findOne({userId: Meteor.userId()}).namesOfNeighbors;
        if (namesOfNeighbors.length > 0) {
            nameOfClient = namesOfNeighbors[0];     // your own name
        }
        
        messagesCursor.forEach(function(messageDocument) {
            console.log(messageDocument);
            if((messageDocument.nameOfSender == nameOfClient)) {
                messagesToBeReturned.push({nameOfSender: "Me [" + nameOfClient + "]", message: messageDocument.message});
            }
            else {
                messagesToBeReturned.push({nameOfSender: messageDocument.nameOfSender, message: messageDocument.message});
            }
        });
        
        // Whenever a new message is added and if there is a need for it, scroll down so that the message added last is visible
        // in the chat box.
        setTimeout(function() {
            var elem = document.getElementById('messages');
            if(elem !== null) {
                elem.scrollTop = elem.scrollHeight;
            }
        }, 50);
        
        return messagesToBeReturned;
    },

    info_message: function() {
        var msg = "";
        
        // Get the name of the current user
        var name = "";  
        neigh = NeighborhoodsInfo.findOne({userId: Meteor.userId()});
        if (Meteor.user() && (neigh !== null)) { 
            namesOfNeighbors = neigh.namesOfNeighbors;
            if (namesOfNeighbors.length > 0) {  
                name = namesOfNeighbors[0]; 
            }  
        }
        
        // Generate the information message based on the current state of the sender's neighborhood
        var neighborhoodColorCounts = {};
        for(var i=0, n=ColorMagic.colors.length; i<n; i++) {
          neighborhoodColorCounts[ColorMagic.colors[i]] = 0;
        }
      
        var neighborhoodColors = neigh.neighborhoodColors;
        if(neighborhoodColors !== null) {
            for(var key in neighborhoodColors) {
                if(neighborhoodColors.hasOwnProperty(key)) {
                    if((key !== "_id") && (key !== "name")) {
                        neighborhoodColorCounts[neighborhoodColors[key]]++;
                    }
                }
            }
        }
        
        var first, last;
        if (neighborhoodColorCounts[ColorMagic.colors[0]] >= neighborhoodColorCounts[ColorMagic.colors[1]]) {
            first = 0;
            last = 1;
        } else {
            first = 1;
            last = 0;
        }
              
        msg = neighborhoodColorCounts[ColorMagic.colors[first]] + " " + (ColorMagic.colors[first]).toUpperCase();
        msg += ", " + neighborhoodColorCounts[ColorMagic.colors[last]] + " " + (ColorMagic.colors[last]).toUpperCase();
        
        return msg;
    },
    red_message: function() {
        var msg = "Let's choose RED";
        return msg;
    },
    green_message: function() {
        var msg = "Let's choose GREEN";
        return msg;
    },

    userCanSendMessages: function() {
        var response = false;
        console.log('parametersInfo');
        console.log(ParametersInfo.findOne({userId: Meteor.userId()}));
        var parametersInfo = ParametersInfo.findOne({userId: Meteor.userId()});
        if (parametersInfo != null) {
            response = parametersInfo.communication;
        }

        return response;
    },

    communicationIsStructured: function() {
        var response = false;
        var structuredCommunication = ParametersInfo.findOne({userId: Meteor.userId()}).structuredCommunication;
        if (structuredCommunication != null) {
            response = structuredCommunication;
        }

        return response;
    },

    communicationLimit: function() {
        var status = "";

        var remaining = SessionInfo.findOne({id: Meteor.userId()}).communicationUnitsRemaining;
        var structuredCommunication = ParametersInfo.findOne({userId: Meteor.userId()}).structuredCommunication;

        if (structuredCommunication) {
            status += remaining + ' messages remaining.';
        } else {
            status += Session.get('charactersRemaining') + ' characters remaining.';
        }

        return status;
    },

    communicationLimitColor: function() {
        if (Session.get("charactersRemaining") > 0) {
            return 'grey';
        } else {
            return 'red';
        }
    }
});

Template.chatBox.events({
    'paste #chat-message': function(event, template) {
        setTimeout(function() {
            var message = $('#chat-message').val();

            var length = realMessageLength(message);
            var charactersLimit = Session.get('charactersLimit');

            while (length > charactersLimit) {
                message = message.slice(0, message.length - 1);
                length = realMessageLength(message);
            }

            console.log(message);
            console.log(length);

            $('#chat-message').val(message);

            Session.set("charactersRemaining", Math.max(0, charactersLimit - length));
        }, 10);
    },

    'keypress #chat-message': function(event, template) {
        if(event.keyCode == 8) {                // 'backspace' was pressed
            var charactersLimit = Session.get('charactersLimit');
            var messageLength = calculateTypedMessageLength(event.keyCode, "backspace");
            Session.set('charactersRemaining', Math.max(0, charactersLimit - messageLength));

            return true;
        }
        else if(event.keyCode == 13) {          // 'enter' was pressed
            var sendButton = $('#sendButton');
            if(sendButton != null) {
              sendButton.click();
            }
            return false;                       // In order to eliminate the resulting "\n" character from the next message.
        } else {                                // a standard character was pressed
            var charactersLimit = Session.get('charactersLimit');
            var messageLength = calculateTypedMessageLength(event.keyCode, "character");
                
            Session.set("charactersRemaining", Math.max(0, charactersLimit - messageLength));

            if (messageLength > charactersLimit) {
                return false;
            }

            return true;
        }
    },

    "click #sendButton": function() {
        var message = $('#chat-message').val();
        
        // Send only non-empty messages. 
        if((message != null) && (message !== '')) {
            Meteor.call('sendChatMessage', message);
        }
        
        Session.set('charactersRemaining', Session.get('charactersLimit'));
        $('#chat-message').val('');
    },

    "click #reportButton": function() {
        // Meteor.call('sendStructuredMessage');
        Meteor.call('sendConstrainedMessage', 'info');
    }
});

var realMessageLength = function(message) {
    var messageLength = message.length;
        
    if(message[message.length-1] == '\\') {
        messageLength--;
    }
        
    var colorCodesRegexString = getColorCodesRegexString();
    if(colorCodesRegexString !== "") {
        var matchedColorCodesOccurences = message.match(new RegExp(colorCodesRegexString, "gi"));
            
        if(matchedColorCodesOccurences) {
            messageLength -= matchedColorCodesOccurences.length;
        }
    }
        
    return messageLength;
}

var calculateTypedMessageLength = function(keyCode, typeOfKey) {
    var message = $('#chat-message').val();
    if((message == undefined) || (message == "")) 
        return 0;
    
    if(typeOfKey == 'character') {
        message += String.fromCharCode(keyCode);      // Add the last-entered character to the message string.
    } else if (typeOfKey == 'backspace') {
        message = message.slice(0, message.length - 1);
    }
    
    return realMessageLength(message);
}

