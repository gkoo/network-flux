// TODO: include duplicates for company-employee pair
// TODO: handle no-connections case
// TODO: check for web worker support
//
// IDEAS
// =====
// 1) Click on a circle to show faces of the employees there.
// 2) Toggle names on and off
// 3) Add "life" to the circles. Bigger circles move slower, smaller ones move faster.
//
// http://caniuse.com/webworkers
var onLinkedInLoad;
var snapshotDate;

$(function() {
  var myProfile,
      cxnProfiles,
      allProfiles,
      DO_PROCESSING = 1,
      graph = new NetworkGraph(),
      today = (new Date()).getTime(),
      $dateEl = $('#date'),
      allCmpyEmployees,
      cmpyNames,
      profileObjs,
      earliestDate,
      timespan,
      snapshotWorker,
      MONTHS = ['Jan', 'Feb', 'Mar', 'Apr',
                'May', 'Jun', 'Jul', 'Aug',
                'Sep', 'Oct', 'Nov', 'Dec'],

  /**
   * getSnapshot
   * ===========
   * Render the network graph at a point in time based on the given percentage.
   */
  getSnapshot = function(evt, percent) {
    var targetDate,
        targetDateObj,
        month,
        year;

    if (!allCmpyEmployees) {
      return;
    }

    targetDate = earliestDate + (timespan * percent/100);
    targetDateObj = new Date(targetDate);
    month = MONTHS[targetDateObj.getMonth()];
    year = targetDateObj.getFullYear();

    $dateEl.text(month + ' ' + year);
    snapshotDate = new Date();
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

    cxnWorker = new Worker('js/cxnWorker.js');
    cxnWorker.addEventListener('message', function(evt) {
      if (evt.data) {
        allCmpyEmployees = evt.data.companies;
        cmpyNames        = evt.data.cmpyNames;
        profileObjs      = evt.data.profileObjs;
        earliestDate     = evt.data.earliestDate;
        timespan         = today - earliestDate;

        graph.setProfiles(profileObjs);
        // no-op takes around 70-100 ms
        console.log('Processing took ' + ((new Date()).getTime() - date.getTime()) + ' milliseconds');
        if (output) {
          output('ready!');
        }
      }
    }, false);

    cxnWorker.postMessage({ profiles: allProfiles });
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
  },

  debug = function() {
    $('#circle-Stanford-University').find('.cmpy-circ').css({
      width: '30px',
      height: '30px',
      'background-color': '#f00'
    });
  },

  init = function() {
    $(window).bind('slider', getSnapshot);

    snapshotWorker = new Worker('js/snapshotWorker.js');
    snapshotWorker.addEventListener('message', function(evt) {
      var date = new Date(),
          currCompanies = evt.data ? evt.data.currCompanies : null;

      if (currCompanies) {
        graph.renderCompanies(currCompanies, cmpyNames);
        // no-op takes around 70-100 ms
        console.log('Processing took ' + (date.getTime() - snapshotDate.getTime()) + ' milliseconds');
      }
    }, false);

    $('#debugBtn').click(debug);
  },

  onLinkedInAuth = function() {
    var fields = ["id", "first-name", "last-name","positions:(start-date,end-date,company:(id,name))","picture-url","educations:(school-name,start-date,end-date)","site-standard-profile-request:(url)"];
    $('#canvas-container').show();
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

  init();
});
