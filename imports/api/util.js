import { Meteor } from 'meteor/meteor';

export const var Utilities = {
    today: function() {
        return moment().format('MM-DD-YYYY');
    }, 

    treatment: function() {
        var batch = TurkServer.batch();
        if (!batch) {return;}
        var treatments = batch.treatments;
        if (treatments.length != 1) {return;}
        return treatments[0];
    },

    // oppId: function() {
    //     var inst = Experiments.findOne();
    //     if (!inst) {return;}
    //     var users = inst.users;
    //     var opponentId = _.filter(users, function(userId) {
    //     return userId != Meteor.userId();
    //     });
    //     if (!opponentId) {return;}
    //     else {return opponentId[0];}
    // }, 

    // assignmentId: function() {
    //     var asst = Assignments.findOne();
    //     return asst && asst.assignmentId;
    // }, 

    batchId: function() {
        return TurkServer.batch()._id;
    }, 

    // currentRound: function() {
    //     var round = Rounds.findOne({}, {sort: {index: -1}});
    //     return round && round.index;
    // }, 

    sleep: Meteor.wrapAsync(function(time, cb) {
        return Meteor.setTimeout((function() {
            return cb(void 0);
        }), time)
    }),

    // Converts milliseconds to time in "(m)m:ss" format.
    millisecondsToTime: function(mSecs) {
        if(mSecs < 0){
            return "0:00";
        }
        else {
            var minutes = Math.floor(mSecs / (60 * 1000));
            var divisor_for_seconds = mSecs % (60 * 1000);
            var seconds = Math.floor(divisor_for_seconds / 1000)
            
            var timeValue = minutes + ":";
            if(seconds < 10) timeValue += "0";
            timeValue += seconds;
            
            return timeValue; 
        }
    }, 

    // Rounds numbers to a specific number of decimal points and returns a string. 
    precise_round: function(num, decimals) {
        var t=Math.pow(10, decimals);   
        return (Math.round((num * t) + (decimals>0?1:0)*(sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
    },

    // Rounds numbers to a specific number of decimal points and returns a number. 
    precise_round_to_number: function(num, decimals) {
        var t=Math.pow(10, decimals);   
        return Math.round((num * t) + (decimals>0?1:0)*(sign(num) * (10 / Math.pow(100, decimals)))) / t;
    },

    // Determines the sign of a number.
    sign: function(num) {
        // IE does not support method sign here
        if (typeof Math.sign === 'undefined') {
            if (num > 0) {
                return 1;
            }
            if (num < 0) {
                return -1;
            }
            return 0;
        }
        return Math.sign(num);
    }
};