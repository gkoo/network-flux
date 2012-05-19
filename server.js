
/**
 * Module dependencies.
 */

var PORT    = 8080,
    routes  = require('./routes.js'),
    app     = routes.app;


// Only listen on $ node server.js

if (!module.parent) {
  app.listen(PORT);
  console.log("Express server listening on port %d", app.address().port);
}
