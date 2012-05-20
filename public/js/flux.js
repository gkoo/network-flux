// TODO: include duplicates for company-employee pair
// TODO: handle no-connections case
//
// http://caniuse.com/webworkers
var onLinkedInLoad;

$(function() {
  var myProfile,
      cxnProfiles,
      allProfiles,
      DO_PROCESSING = true,
      currCompanies = {},
      graph = new NetworkGraph(),
      today = (new Date()).getTime(),
      allCmpyEmployees,
      cmpyNames,
      profileObjs,
      earliestDate,
      timespan,
      snapshotWorker = new Worker('/js/snapshotWorker.js'),

  /**
   * getSnapshot
   * ===========
   * Render the network graph at a point in time based on the given percentage.
   */
  getSnapshot = function(percent) {
    var targetDate = earliestDate + (timespan * percent/100);
    currCompanies = {};
    snapshotWorker.postMessage({ allCmpyEmployees: allCmpyEmployees,
                                 targetDate:       targetDate });
  }

  /**
   * processProfiles
   * ===============
   * My profile and connection profiles retrieved. Start processing!
   */
  processProfiles = function() {
    var me = getData(myProfile),
        cxns = getData(cxnProfiles),
        allCompanies = {},
        date, cxnWorker;

    if (!cxns || !me) {
      throw "No profile data";
    }

    cxns.push(me);
    allProfiles = cxns;

    date = new Date();
    if (DO_PROCESSING) {
      cxnWorker = new Worker('/js/cxnWorker.js');
      cxnWorker.postMessage({ profiles: allProfiles });
      cxnWorker.addEventListener('message', function(evt) {
        if (evt.data) {
          //filterConnectionsResult(evt.data.coworkers);
          allCmpyEmployees = evt.data.companies;
          cmpyNames        = evt.data.cmpyNames;
          profileObjs      = evt.data.profileObjs;
          earliestDate     = evt.data.earliestDate;
          timespan         = today - earliestDate;
          // no-op takes around 70-100 ms
          console.log('Processing took ' + ((new Date()).getTime() - date.getTime()) + ' milliseconds');
        }
      }, false);
    }
  },

  handleOwnProfile = function(data) {
    myProfile = data;
    if (cxnProfiles) {
      processProfiles();
    }
  },

  handleConnections = function(data) {
    cxnProfiles = data;
    if (myProfile) {
      processProfiles();
    }
  };

  onLinkedInAuth = function() {
    var fields = ["id", "first-name", "last-name","positions:(start-date,end-date,company:(id,name))","picture-url","educations:(school-name,start-date,end-date)","site-standard-profile-request:(url)"];
    if (DO_PROCESSING) {
      // get own profile
      IN.API.Profile('me')
        .fields(fields).result(handleOwnProfile);
      // Pull in connection data
      IN.API.Connections("me")
        .fields(fields)
        .result(handleConnections);
    }
  };

  onLinkedInLoad = function() {
    IN.Event.on(IN, "auth", onLinkedInAuth);
  };

  snapshotWorker.addEventListener('message', function(evt) {
    var date = new Date();
    currCompanies = evt.data ? evt.data.currCompanies : null;
    if (currCompanies) {
      //filterConnectionsResult(evt.data.coworkers);
      graph.renderCompanies(currCompanies, cmpyNames);
      // no-op takes around 70-100 ms
      console.log('Processing took ' + ((new Date()).getTime() - date.getTime()) + ' milliseconds');
    }
  }, false);

  eve.on('slider', getSnapshot);

  var printCxns = function(cxnArr) {
    $('#output').empty();
    cxnArr.forEach(function(cxn) {
      var profile = profileObjs[cxn];
      output(profile.firstName + ' ' + profile.lastName);
    });
  };

  $('#datePickerBtn').click(function(evt) {
    var inputDate = $('#datePicker').val(),
        dateVal   = parseInt(inputDate, 10),
        date      = new Date(),

    currCompanies = {};
    snapshotWorker = new Worker('/js/snapshotWorker.js');

    snapshotWorker.addEventListener('message', function(evt) {
      currCompanies = evt.data ? evt.data.currCompanies : null;
      if (evt.data) {
        //filterConnectionsResult(evt.data.coworkers);
        if (currCompanies) {
          printCxns(currCompanies[1337]);
        }
        // no-op takes around 70-100 ms
        console.log('Processing took ' + ((new Date()).getTime() - date.getTime()) + ' milliseconds');
      }
    }, false);

    snapshotWorker.postMessage({ allCmpyEmployees: allCmpyEmployees,
                                 targetDate:       dateVal });
  });
});
