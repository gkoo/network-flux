// ================
// profileWorker.js
// ================
// Takes care of the minimal processing required for the current user's profile.

var formatPositionDates,

STRIP_PUNC = /[^\w\s]/gi,

convertDateToVal = function(date) {
  var yearVal;
  if (!date) {
    return 0;
  }
  yearVal = (date.year - 1900)*12;
  return date.month ? yearVal + date.month : yearVal + 1;
};

// Returns the formatted dates for time spent at a given company
// @callback - called for each company, returns company name and dates
storeFormattedPositionDates = function(profile, callback) {
  var company, datesKey, start, end;

  if (profile.positions && profile.positions.values) {
    length = profile.positions.values.length;
    // store a list of employment dates for each company in redis
    for (i = 0; i<profile.positions.values.length; ++i) {
      position = profile.positions.values[i];

      company = position.company;
      if (company && company.name && position.startDate) {
        company.name = company.name.toLowerCase().replace(STRIP_PUNC, '');
        start = convertDateToVal(position.startDate);
        end = position.endDate ? convertDateToVal(position.endDate) : 0;
        dates = start + ':' + end;
        callback({
          cmpName: company.name,
          dates: dates
        });
      }
    }
  }
};

if (typeof self !== 'undefined') {
  // used in context of web workers
  self.addEventListener('message', function(evt) {
    var i,
        data = evt.data,
        profile = data ? data.profile : null,
        employmentDates = {}; // hash where key is companyName and val is array of 'start:end' date strings
    if (data.type === 'storeOwnProfile') {
      if (profile) {
        storeFormattedPositionDates(profile, function(employDates) {
          if (employDates) {
            employmentDates[employDates.cmpName] = employDates.dates;
          }
        });
        self.postMessage({
          type: 'storeOwnProfileComplete',
          employmentDates: employmentDates
        });
      }
    }
  }, false);
}

if (typeof exports !== 'undefined') {
  // For NodeJS module
  exports.storeFormattedPositionDates = storeFormattedPositionDates;
}
