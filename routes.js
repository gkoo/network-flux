var express = require('express'),
    sys = require('sys'),
    fs = require('fs'),
    app = express.createServer(),
    logStream = fs.createWriteStream('./request.log', { flags: 'a' }),
    stupidLoadStatuses = ['Plugging in computer...',
                          'Untangling cords...',
                          'Oiling gears...',
                          'Pondering the meaning of existence...',
                          'Please insert floppy disk...',
                          'Doing some spring cleaning...',
                          'Changing batteries...'];

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger({ stream: logStream }));
  app.use(app.router); // IMPORTANT! keep this line last.
});


/* ==============
 * ERROR HANDLING
 * ==============
 */
function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

/*
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});
*/

// Routes

app.get('/test', function(req, res){
  res.render('linkedin_test', {
    locals: {
      title: 'LinkedIn Connection Timeline',
      loadStatus: stupidLoadStatuses[Math.floor(Math.random()*stupidLoadStatuses.length)]
    },
    layout: false
  });
});

app.get('/', function(req, res){
  res.render('index', {
    locals: {
      title: 'LinkedIn Connection Timeline',
      loadStatus: stupidLoadStatuses[Math.floor(Math.random()*stupidLoadStatuses.length)]
    },
    layout: false
  });
});


// export app instance into the Routes module object
exports.app = app;
