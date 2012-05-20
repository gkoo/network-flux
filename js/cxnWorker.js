// TODO: what i want to do
// create a hash keyed by company id
// store a startDate:endDate pair for every connection that worked at that company.
// sort employees by start date? to narrow search space?
//
// Oh god. do I want to factor in when the connection first shared a company/education? To show how your network grows over time? v2.


// normalizeDate
// =============
// Takes date from LinkedIn response and normalizes
// to epochTime.
//
// @liDate: date in the form of '6-2011'
var allCompanies = {},

cmpyNames = {},

profileObjs = {},

earliestDate = 0,

normalizeDate = function(liDate) {
  var date;
  if (!liDate) {
    return 0;
  }
  date = new Date();
  date.setMonth(liDate.month-1 || 0);
  date.setYear(liDate.year);
  // Set rest of values
  date.setDate(15); // set to middle of month .. just 'cause?
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  return date.getTime();
},

/**
 * addPosition
 * ===========
 * Helper function for adding a position/education to allCompanies.
 */
addPosition = function(cmpyId, startDate, endDate, profileId) {
  var startDateNorm = normalizeDate(startDate);
      endDateNorm   = normalizeDate(endDate);

  if (!earliestDate || earliestDate > startDateNorm) {
    earliestDate = startDateNorm;
  }

  if (!allCompanies[cmpyId]) {
    allCompanies[cmpyId] = {};
  }

  allCompanies[cmpyId][profileId] = [startDateNorm, endDateNorm].join(':');
},

createCmpyBuckets = function(profiles, callback) {
  profiles.forEach(function(profile) {
    var positions = getData(profile.positions),
        educations = getData(profile.educations),
        companyId, startDate;

    if (positions) {
      positions.forEach(function(position) {
        if (position.company && position.company.id && position.startDate) {
          // Company and start date exist. Store in allCompanies.
          addPosition(position.company.id, position.startDate, position.endDate, profile.id);
        }
        if (position.company.id && position.company.name) {
          cmpyNames[position.company.id] = position.company.name;
        }
      });
    }
    /*
    if (educations) {
      educations.forEach(function(edu) {
        if (edu.schoolName && edu.startDate) {
          // School and start date exist. Store in allCompanies.
          addPosition(edu.schoolName, edu.startDate, edu.endDate, profile.id);
        }
        if (edu.schoolName) {
          // Yeah I know this is stupid. But it's also stupid that there are no school IDs.
          // Don't judge me!
          cmpyNames[edu.schoolName] = edu.schoolName;
        }
      });
    }
    */

    profileObjs[profile.id] = profile;
  });

  callback(null, {
    companies:    allCompanies,
    profileObjs:  profileObjs,
    cmpyNames:    cmpyNames,
    earliestDate: earliestDate
  });
};

importScripts('js/helpers.js');

self.addEventListener('message', function(evt) {
  var profiles = evt.data.profiles;

  if (profiles && profiles.length) {
    createCmpyBuckets(profiles, function(err, data) {
      if (err) {
        // handle error
      }
      else {
        self.postMessage(data);
      }
    });
  }
}, false);
