var getSnapshot = function(allCmpyEmployees, targetDate) {
  var currCompanies = {},
      datePair,
      startDate,
      endDate;

  for (cmpyId in allCmpyEmployees) {
    if (allCmpyEmployees.hasOwnProperty(cmpyId)) {
      for (cxnId in allCmpyEmployees[cmpyId]) {
        datePair  = allCmpyEmployees[cmpyId][cxnId].split(':'),
        startDate = parseInt(datePair[0], 10),
        endDate   = parseInt(datePair[1], 10);

        if (startDate <= targetDate && (!endDate || targetDate <= endDate)) {
          // connection was in range! add to currCompanies
          if (!currCompanies[cmpyId]) {
            currCompanies[cmpyId] = [];
          }
          currCompanies[cmpyId].push(cxnId);
        }
      }
    }
  }

  return currCompanies;
};

self.addEventListener('message', function(evt) {
  var allCmpyEmployees = evt.data.allCmpyEmployees,
      targetDate = evt.data.targetDate,
      currCompanies = getSnapshot(allCmpyEmployees, targetDate);

  self.postMessage({
    currCompanies: currCompanies
  });
}, false);
