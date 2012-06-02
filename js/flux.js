// TODO: include duplicates for company-employee pair
// TODO: handle no-connections case
// TODO: check for web worker support
//
// http://caniuse.com/webworkers
var onLinkedInLoad;

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
      hasWorkers    = typeof window.Worker !== 'undefined',
      allCmpyEmployees,
      allSchoolmates,
      cmpyNames,
      profileObjs,
      earliestDate,
      snapshotDate,
      timespan,
      snapshotWorker,
      MONTHS = ['Jan', 'Feb', 'Mar', 'Apr',
                'May', 'Jun', 'Jul', 'Aug',
                'Sep', 'Oct', 'Nov', 'Dec'],

  getTargetDate = function(targetDate) {
    var target = new Date(targetDate);
    target.setDate(15);
    target.setHours(0);
    target.setMinutes(0);
    target.setSeconds(0);
    target.setMilliseconds(0);
    return target;
  },

  /**
   * getSnapshot
   * ===========
   * Render the network graph at a point in time based on the given percentage.
   */
  getSnapshot = function(evt, percent) {
    var targetDate, target;

    if (!allCmpyEmployees || !allSchoolmates) {
      return;
    }

    target = earliestDate + (timespan * percent);
    targetDate = getTargetDate(target);

    snapshotDate = new Date();
    snapshotWorker.postMessage({ allCmpyEmployees: allCmpyEmployees,
                                 allSchoolmates:   allSchoolmates,
                                 targetDate:       targetDate.getTime() });
  },

  updateDate = function(evt, percent) {
    var target, targetDate, month, year;

    target     = earliestDate + (timespan * percent);
    targetDate = getTargetDate(target);
    month      = MONTHS[targetDate.getMonth()];
    year       = targetDate.getFullYear();
    $dateEl.text(month + ' ' + year);
  },

  /**
   * processProfiles
   * ===============
   * My profile and connection profiles retrieved. Start processing!
   */
  processProfiles = function() {
    var me = GordonUtils.getData(myProfile),
        cxns = GordonUtils.getData(cxnProfiles),
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
        allSchoolmates   = evt.data.schools;
        cmpyNames        = evt.data.cmpyNames;
        profileObjs      = evt.data.profileObjs;
        earliestDate     = evt.data.earliestDate;
        timespan         = today - earliestDate;

        graph.setData({
          profiles: profileObjs,
          cmpyNames: cmpyNames
        });
        // no-op takes around 70-100 ms
        console.log('Processing took ' + ((new Date()).getTime() - date.getTime()) + ' milliseconds');

        GordonUtils.fadeIn($('#intro2, #slider, #share'));
      }
    }, false);

    cxnWorker.postMessage({ profiles: allProfiles });
  },

  fillInName = function(profile) {
    $('#yourname').text(profile.firstName);
    setTimeout(function() {
      GordonUtils.fadeIn($('#intro1'));
    }, ANIM_DURATION);
  },

  handleOwnProfile = function(data) {
    var profile = GordonUtils.getData(data);
    if (profile && profile.length) {
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

  handleSnapshot = function(evt) {
    var date = new Date(),
        currCompanies, targetDate, dateKey;

    if (evt.data) {
      currCompanies = evt.data.currCompanies || null;
      currSchools   = evt.data.currSchools || null;
      targetDate    = evt.data.date ? new Date(evt.data.date) : null;
    }

    if (currCompanies) {
      graph.setCompanies(currCompanies, currSchools, cmpyNames);
      console.log('Processing took ' + (date.getTime() - snapshotDate.getTime()) + ' milliseconds');
    }
  },

  init = function() {
    $(window).bind('sliderStop', getSnapshot);
    $(window).bind('sliderDrag', updateDate);
    $(window).bind('sliderStart', function() {
      GordonUtils.fadeOut($('.intro'), ANIM_DURATION);
    });

    snapshotWorker = new Worker('js/snapshotWorker.js');
    snapshotWorker.addEventListener('message', handleSnapshot, false);
  },

  onLinkedInAuth = function() {
    var fields = ["id", "first-name", "last-name","positions:(start-date,end-date,company:(id,name))","picture-url","educations:(school-name,start-date,end-date)","site-standard-profile-request:(url)"];
    GordonUtils.fadeOut($signinEl, ANIM_DURATION);
    setTimeout(function() {
      GordonUtils.fadeIn($('#companies'));
    }, ANIM_DURATION);
    $('#viewport').show();
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
    GordonUtils.fadeIn($('#signin, #title'));
    IN.Event.on(IN, "auth", onLinkedInAuth);
  };

  init();
});
