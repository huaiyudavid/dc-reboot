import { Participants } from './participants.js';
import { Payouts } from './payouts.js';
import { Time } from './time.js';
import { Progress } from './progress.js';
import { Session } from './session.js';
import { Parameters } from './parameters.js';
import { Neighborhoods } from './neighborhoods.js';
import { ColorMagic } from './colors_mapping.js';
import { Logger } from './logging.js';

export const var startGames = function(isProperGames, numberOfGames, numberOfBatches) {
    proper = isProperGames;
    games = numberOfGames;
    batches = numberOfBatches;

    // previousGamesCleanup?

    // Wait until all TurkServer collections data has been loaded.
    Meteor.setTimeout(function() {
            runGames();
    }, 2000);
}

var sessionTimeout, preSessionCountdown, sessionCountdown, preSessionTimeout, postSessionTimeout;
var proper, games, batches;

var runGames = function() {
    // TODO: initialize PersistentInfo?

    clearPastPilotExperimentsData();

    // TODO: update PersistentInfo? nah

    /* Log entry. */ Logger.recordExperimentInitializationStart();

    initializeParameters();

    /* L */ Participants.initializeFullListOfParticipants();

    Participants.initializeMissedGames();

    Payouts.resetTotalPayouts(Participants.participants);

    // initializeTimeInfo(); =======> already done by default in time.js
    Time.updateTimeInfo('start experiment');

    // initializeProgressInfo(); =======> already done by default in progress.js
    //initializeSessionInfo(); =========> already done by default in session.js

    /* Log entry. */ Logger.recordExperimentInitializationCompletion();
    /* L */ Progress.setProgress('experiment', true);

    // run pre game
    runPreGame();
}

var runPreGame = function() {
    // If this is not the last game, ...
    if (Session.sessionNumber < games) {
        Progress.setProgress('preSession', true);

        // ... countdown to next session.
        preSessionCountdown = setInterval(Time.updateTimeInfo('current time'), Time.timeUpdateRate);
        preSessionTimeout = setTimeout(function() {
            clearInterval(preSessionCountdown);
            Progress.setProgress('preSession', false);

            // Start next game.
            runGame();  
        }, Time.preSessionLength * Time.timeUpdateRate);
    } else { // If this is the last game, end the sequence of games.
        /* Log entry. */ Logger.recordExperimentPayouts();

        /* L */ Progress.setProgress('experiment', false);

        // If the sequence consisted of proper games, set the acquired bonus payments, and terminate the instance.
        if(proper) {            
            // Terminate experiment and move participating players to exit survey
            movePlayersToSurvey();
        }
        // If not, start the sequence of proper games.
        else {
            startGames(true, Parameters.pilotProperGames, Parameters.properBatches);
        }
    }
    
}

var runGame = function() {
    initializeGame();

    /* L */ Progress.setProgress('session', true);

    // Timer that counts seconds during the session
    sessionCountdown = setInterval(Meteor.bindEnvironment(Time.updateTimeInfo('current time')), Time.timeUpdateRate);

    // Terminates the session once the full length of the session is up
    sessionTimeout = setTimeout(Meteor.bindEnvironment(function(){ terminateGame(false); }), Time.sessionLength * Time.timeUpdateRate); 
}

var initializeGame = function() {
    Session.checkResetBatch(proper);

    /* Log entry. */ Logger.recordSessionInitializationStart(Session.sessionNumber);

    Session.adjMatrix = Parameters.getNextAdjMatrix(proper, Session.sessionNumber);
\    /* Log entry. */ Logger.recordNetworkAdjacencyMatrix(adjMatrix);

    Participants.participantsThreshold = Session.adjMatrix.length;
    console.log("Game participants:\t" + Participants.participantsThreshold);

    Participants.initializeGameParticipants(Session.isNewBatch());
    if (Session.isNewBatch()) {
        /* L */ Participants.assignIdsToNames();

        if (Session.adversaryMode()) {
            Participants.assignAdversaries();
        }
    }

    /* L */ Neighborhoods.assignNeighborhoodsToClients();

    /* Log entry. */ Logger.recordAdversaries();

    /* L */ assignColorsToNodes();

    // If ColorsMagic.colorAnonymizationActive ==  false, then initializeAnonymizationInfo will assign the identity color 
    // permutation to each node ("red" will be mapped to "red", "green" will be mapped to "green").
    /* L */ ColorsMagic.initializeColorAnonymization();

    setSessionIncentivesConflictParameters(proper, Session.sessionNumber);
    /* L */ Parameters.setSessionCommunicationParameters(proper, Session.sessionNumber);
    /* L */ Parameters.setIndividualCommunicationParameters();

    Payouts.initializeSessionPayoutInfo(Participants.participants);
    Payouts.initializePotentialSessionPayouts(Session.adversaryMode());

    if (Parameters.communication) {
        // We need to make sure that users cannot send messages beyound the corresponding total (character) count!
        Session.initializeCommunicationUsageLevels();
        Session.initializeCommunicationLimits();
        
    }

    /* L */ Session.initializeColorCounts();

    Session.clearMessages();

    Session.initializeColorChangeInfo();


    Session.sessionNumber++;
    Session.currentBatchGame++;

    /* Log entry. */ Logger.recordSessionInitializationCompletion(currentSession);
}

var terminateGame = function(outcome) {
    Session.freeToUpdateColors = false;
    /* L */ Progress.setProgress('session', false);

    clearTimeout(sessionTimeout);
    clearInterval(sessionCountdown);

    /* L */ Session.setOutcome(outcome);

    /* L */ Payouts.applyIncentiveSessionPayouts(outcome);

    Progress.setProgress('postSession', true);

    postSessionTimeout = setTimeout(Meteor.bindEnvironment(function() {
            Progress.setProgress('postSession', false);
            runPreGame();
    }), Time.postSessionLength * Time.timeUpdateRate);
}

var clearPastPilotExperimentsData = function() {
    clearTimeout(sessionTimeout);
    clearTimeout(preSessionTimeout);
    clearTimeout(postSessionTimeout);
    clearInterval(timerIntervalS);
    clearInterval(timerIntervalP);
    
    //TODO: implement masterClear()
    masterClear();
}

/* This method is called upon experiment termination */
var movePlayersToSurvey = function() {
    Meteor.users.update(
        {"status.online": true, username: {$ne: "admin"}, location: '/experiment'}, 
        {$set: {'location': '/survey'}},
        {multi: true}
    );
}