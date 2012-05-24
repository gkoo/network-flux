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
      ANIM_DURATION = 500,
      graph         = new NetworkGraph(),
      today         = (new Date()).getTime(),
      $dateEl       = $('#date'),
      $signinEl     = $('#signin'),
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

        fadeIn($('#intro2'));
        fadeIn($('#slider'));
      }
    }, false);

    cxnWorker.postMessage({ profiles: allProfiles });
  },

  fillInName = function(profile) {
    console.log(profile)
    $('#yourname').text(profile.firstName);
    setTimeout(function() {
      fadeIn($('#intro1'));
    }, ANIM_DURATION);
  },

  handleOwnProfile = function(data) {
    var profile = getData(data);
    if (profile && profile.length) {
      console.log(profile);
      fillInName(profile[0]);
    }
    else {
      throw 'Couldn\'t find your profile!';
    }
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

  loadIntro = function() {
  },

  fadeIn = function($el) {
    $el.css('display', 'block');
    setTimeout(function() {
      $el.css('opacity', '1');
    }, 50);
  },

  fadeOut = function($el) {
    $el.css('opacity', '0');
    setTimeout(function() {
      $el.hide();
    }, ANIM_DURATION);
  },

  init = function() {
    $(window).bind('slider', getSnapshot);
    $(window).bind('sliderStart', function() {
      fadeOut($('.intro'));
    });

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
  },

  onLinkedInAuth = function() {
    var fields = ["id", "first-name", "last-name","positions:(start-date,end-date,company:(id,name))","picture-url","educations:(school-name,start-date,end-date)","site-standard-profile-request:(url)"];
    fadeOut($signinEl);
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
    fadeIn($signinEl);
    IN.Event.on(IN, "auth", onLinkedInAuth);
  };

  init();
});
