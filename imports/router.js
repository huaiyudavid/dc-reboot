import { Meteor } from 'meteor/meteor';

Router.configure({
    loadingTemplate: 'loadingWheel',
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if(currentUser) {
            Router.go(Meteor.users.findOne(currentUser).location);
            this.next();
        } else {
            this.render("login");
        }
    },
});

Router.route('/', {
    name: 'home',
    template: 'outline',
    
    waitOn: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            return Meteor.subscribe('userData');
        }
    },
});

Router.route('/description1', {
    name: 'description1',
    template: 'description1',
});

Router.route('/description2', {
    name: 'description2',
    template: 'description2',
});

Router.route('/description3', {
    name: 'description3',
    template: 'description3',
});

Router.route('/description4', {
    name: 'description4',
    template: 'description4',
});

Router.route('/description5', {
    name: 'description5',
    template: 'description5',
});

Router.route('/lobby', {
    name: 'lobby',
    template: 'lobby',
});

