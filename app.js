/**
 *
 * AproPLAN Pebble V0.2
 */

/**************
*  Require
**************/

var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Voice = require('ui/voice');
var Settings = require('settings');

/**************
*  Variables
**************/

var USER_ALIAS = '';
var USER_PASSWD = '';
var USER_ID = '';
var USER_DISPLAYNAME = '';
var USER_COMPANY = '';

var ONLY_PATH_TO_LOAD = '&onlypathtoloaddata=true';
var REQUESTER_ID = 'CD3A3271-3405-408A-96A3-FDD69A908A29'; // C55C8D26-056F-4F00-8DDF-ED1E1F518BC7';
var BASE_URL_PARAM = '';
var BASE_URL = 'https://app.aproplan.com/rest/';

/**************
*  Functions
**************/

/*
* Show splash screen function
*/
var showSplashScreen = function() {
  // Show splash screen while waiting for data
  var splashWindow = new UI.Window({
    backgroundColor: '#388E3C'
  });
  var text = new UI.Text({
    position: new Vector2(0, 55),
    size: new Vector2(144, 168),
    text:'Connecting...',
    font:'GOTHIC_28_BOLD',
    color:'white',
    textOverflow:'wrap',
    textAlign:'center'
  });

  // add to splashWindow and show
  splashWindow.add(text);
  return splashWindow;
};

/*
* Show error window
*/
var showError = function (reason) {
  var errWindow = new UI.Window({
    backgroundColor: 'red'
  });
  
  var txt = 'Oops something went wrong...';
  if(reason){
    txt = reason;
  }

  // text element to inform user
  var text = new UI.Text({
    position: new Vector2(0, 55),
    size: new Vector2(144, 168),
    text:txt,
    font:'GOTHIC_28_BOLD',
    color:'white',
    textOverflow:'wrap',
    textAlign:'center'
  });

  // add to splashWindow and show
  errWindow.add(text);
  errWindow.show();
};

/*
* Show message window
*/
var showMessage = function (message, title) {
  var card = new UI.Card({
    title: title,
    body: message,
    bodyColor: 'white',
    backgroundColor: '#388E3C'
  });
  
  // add to splashWindow and show
  card.show();
  return card;
};

/*
* Create the project entities
*/
var createProjectsEntityList = function(data) {
  var items = [];
  var len = data.length;
  
  for(var i = 0; i < len; i++) {
    // add to menu items array
    items.push({
      title:data[i].Name.toUpperCase(),
      subtitle:data[i].Code
    });
  }
  
  return items;
};

/*
* Create the notes entities
*/
var createNotesEntityList = function(data) {
  var items = [];
  var len = data.length;
  
  for(var i = 0; i < len; i++) {
    // add to menu items array
    items.push({
      title:data[i].Subject.toUpperCase(),
      subtitle:data[i].CodeNum
    });
  }
  
  return items;
};

/*
* Generates a 4 hex digit
*/
var s4 = function() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
};

/*
* Generates a GUID
*/
var generateGuid = function() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

/*
* Add a comment to a not using voice
*/
var addNoteComment = function(note){
  Voice.dictate('start', true, function(e) {
    if (e.err) {
      console.log('Error: ' + e.err);
      return;
    }
    // post the comment
    var postUrl = BASE_URL +'notecomments' + BASE_URL_PARAM;
    var postData = {"Comment":""+e.transcription+"","Id":""+ generateGuid() +"","From":{"Id":""+ USER_ID +""},"Note":{"Id":""+note.Id+""}};
          
    ajax(
      {
        url: postUrl,
        type: 'json',
        method: 'POST',
        data: [postData]
      },
      function(response) {
      },
      function(posterror) {
        // Error when posting the comment
        showError();
      }
    );
  });
};

/*
* Display selected note details
*/
var showNoteDetails = function(noteId){
  var noteUrl = BASE_URL +'notes'+ BASE_URL_PARAM+ '&filter=Filter.Eq(Id,'+ noteId + ')';
  var notePathToLoadload = '&pathtoload=Subject,IssueType.Description,Comments.Comment';
  var finalNoteUrl = noteUrl + notePathToLoadload + ONLY_PATH_TO_LOAD;
  ajax(
    {
      url: finalNoteUrl,
      type: 'json'
    },
    function(apiNote) {
      // display the note details
      var card = new UI.Card({
        title: apiNote[0].Subject,
        subtitle: apiNote[0].IssueType ? apiNote[0].IssueType.Description : '',
        scrollable: true
      });
      var i, len = apiNote[0].Comments ? apiNote[0].Comments.length : 0;
      var fullComments = '';
      for(i = 0; i < len; i++){
        fullComments += '- ' + apiNote[0].Comments[i].Comment + '\n';
      }
      card.body(fullComments);
      
      card.on('click', 'select', function() {
        addNoteComment(apiNote[0]);
      });
      
      card.show();
    },
    function(error) {
      // Error when displaying the note info
      showError();
    }
  );
};

/*
* Display the notes list
*/
var showNotesList = function(projectId, projectName){
  var notesUrl = BASE_URL +'notes'+ BASE_URL_PARAM +'&filter=Filter.And(Filter.Eq(Project.Id,' + projectId + '),Filter.And(Filter.IsFalse(IsArchived),Filter.Exists(NoteInCharge,Filter.Or(Filter.Eq(UserId,'+ USER_ID +'),Filter.Or(Filter.Eq(Tag,'+ USER_DISPLAYNAME +'),Filter.Eq(Tag,'+ USER_COMPANY +'))))))&sortorder=duedate';
  var pathToLoadload = '&pathtoload=Subject,CodeNum';
  var finalUrl = notesUrl + pathToLoadload + ONLY_PATH_TO_LOAD;
  
  ajax(
    {
      url: finalUrl,
      type: 'json'
    },
    function(apiNotes) {
      var notesMenu = new UI.Menu({
        sections: [{
          title: 'Points of ' + projectName,
          items: createNotesEntityList(apiNotes)
        }],
        textColor: '#388E3C',
        highlightBackgroundColor: '#388E3C'
      });
      
      notesMenu.on('select', function(e) {
        showNoteDetails(apiNotes[e.itemIndex].Id);
      });
      
      notesMenu.show();
    },
    function(error) {
      // Failure!
      showError();
    }
  );
};

/*
* Load projects
*/
var loadProjects = function(welcomeWindow){
  var projectsUrl = BASE_URL +'projects'+ BASE_URL_PARAM;
  var projectsPathToLoadload = '&pathtoload=Name,Code&filter=Filter.IsTrue(IsActive)';
  var finaProjectslUrl = projectsUrl + projectsPathToLoadload + ONLY_PATH_TO_LOAD;
  ajax(
    {
      url: finaProjectslUrl,
      type: 'json'
    },
    function(data) {
      var resultsMenu = new UI.Menu({
        sections: [{
          title: 'Your projects',
          items: createProjectsEntityList(data)
        }],
        textColor: '#388E3C',
        highlightBackgroundColor: '#388E3C'
      });
    
      resultsMenu.on('select', function(e) {
        showNotesList(data[e.itemIndex].Id, data[e.itemIndex].Name);
      });

      // Show the Menu, hide the splash
      resultsMenu.show();
      welcomeWindow.hide();
    },
    function(error) {
      // Failure!
      showError();
    }
  );
};  

/*
* Login
*/
var login = function(splashWindow){
  var loginUrl = BASE_URL +'login'+ BASE_URL_PARAM;
  ajax(
    {
      url: loginUrl,
      type: 'json'
    },
    function(data) {
      USER_ID = data.Id;
      USER_DISPLAYNAME = data.DisplayName;
      USER_COMPANY = data.CompanyName;
      
      // show welcome window
      var welcomeWindow = new UI.Window({
        backgroundColor: '#388E3C'
      });
      var text = new UI.Text({
        position: new Vector2(0, 55),
        size: new Vector2(144, 168),
        text:'Hi, ' + USER_DISPLAYNAME,
        font:'GOTHIC_28_BOLD',
        color:'white',
        textOverflow:'wrap',
        textAlign:'center'
      });

      welcomeWindow.add(text);
      welcomeWindow.show();
      
      // hide splash
      splashWindow.hide();
      
      loadProjects(welcomeWindow);
    },
    function(error) {
      // Error when logging in
      // TODO error does not show
      showError('Cannot login due to invalid login or password');
    }
  );
};

/*****************
*     Main
******************/
// Display splashwindow
var splashWindow = showSplashScreen();
splashWindow.show();

USER_ALIAS = Settings.option('login');
USER_PASSWD = Settings.option('passwd');
BASE_URL_PARAM = '?alias='+ USER_ALIAS +'&pass='+ USER_PASSWD +'&requesterid=' + REQUESTER_ID + '&v=5';

if(!USER_ALIAS || !USER_PASSWD){
  // show message to user to configure the app
  showMessage('Go to the settings of AproPLAN to configure your password and/or login', 'Missing credentials');
}else{
  // Make the login
  login(splashWindow);
}

// Set a configurable with just the close callback
Settings.config(
  { url: 'http://www.app-pebble.eu.pn/pebble.html' },
  function(e) { },
  function(e) {
    var config = JSON.parse(decodeURIComponent(e.response));
    Settings.option('login', config.login);
    Settings.option('passwd', config.passwd);
    
    USER_ALIAS = Settings.option('login');
    USER_PASSWD = Settings.option('passwd');
    BASE_URL_PARAM = '?alias='+ USER_ALIAS +'&pass='+ USER_PASSWD +'&requesterid='+ REQUESTER_ID + '&v=5';
    
    login(splashWindow);
  }
);
