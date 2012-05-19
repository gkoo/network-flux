var PAPER_WIDTH  = 950,
    PAPER_HEIGHT = 500,

GraphSliderBar = function(paper) {
  var isDragging      = false,
      KNOB_RADIUS     = 20,
      BAR_WIDTH       = 950 - KNOB_RADIUS*3,
      BAR_THICKNESS   = 10,
      BAR_CENTER_Y    = 445,
      BAR_LEFT_BOUND  = KNOB_RADIUS * 3/2,
      BAR_RIGHT_BOUND = KNOB_RADIUS*3/2 + BAR_WIDTH,
      mouseDownX, newMouseX, bar, knob, debugStr,

  handleKnobDrag = function(dx) {
    newX = mouseDownX + dx;
    if (newX >= BAR_LEFT_BOUND && newX <= BAR_RIGHT_BOUND) {
      newMouseX = newX;
      knob.attr({ 'cx': newX });
      //debugStr.attr({ 'text': Math.floor((newX-BAR_LEFT_BOUND)/BAR_WIDTH * 100) + '%' });
    }
  },

  handleKnobDragStart = function(x, y, evt) {
    isDragging = true;
    mouseDownX = knob.attr('cx');
  },

  handleKnobDragStop = function(x, y, evt) {
    isDragging = false;
    eve('slider', this, Math.floor((newMouseX-BAR_LEFT_BOUND)/BAR_WIDTH * 100));
  },

  init = function() {
    bar = paper.rect(BAR_LEFT_BOUND,                   // top left x
                     BAR_CENTER_Y - (BAR_THICKNESS/2), // top left y
                     BAR_WIDTH,                        // width
                     BAR_THICKNESS);                   // height
    bar.attr({ fill: '#000' });

    knob = paper.circle(KNOB_RADIUS*3/2 + BAR_WIDTH,  // center x
                        BAR_CENTER_Y,  // center y
                        KNOB_RADIUS); // radius

    knob.attr({ fill: '#f00' });

    knob.drag(handleKnobDrag,
              handleKnobDragStart,
              handleKnobDragStop);

    //debugStr = paper.text(50, 50, 'Hi')
                    //.attr({ 'font-size': 18 });
  };

  init();
},

CompanyCircle = function(cmpy, paper) {
  var calculateCmpyRadius = function(cmpySize) {
    // Formula: y = -1000/(x+10) + 100
    var radius = 100 - (1000/(cmpySize+10))
    return Math.max(radius, 10);
  };

  this.remove = function() {
    this.el.remove();
  };

  this.init = function(cmpy, paper) {
    radius   = calculateCmpyRadius(cmpy.length);
    x        = Math.floor(Math.random()*PAPER_WIDTH);
    y        = Math.floor(Math.random()*PAPER_HEIGHT);
    this.el  = paper.circle(x,        // center x
                               y,        // center y
                               radius); // radius
  };

  this.init(cmpy, paper);
},

NetworkGraph = function() {
  this.init = function() {
    this.paper = new Raphael(document.getElementById('canvas-container'), PAPER_WIDTH, PAPER_HEIGHT);
    this.sliderBar = new GraphSliderBar(this.paper);
  };

  this.companyEls = [];

  this.renderCompanies = (function(companies, cmpyNames) {
    var cmpy, x, y, radius;

    // clear current company circles
    this.companyEls.forEach(function(el) {
      el.remove();
    });

    $('#output').text("Num companies: " + Object.keys(companies).length);
    for (cmpyId in companies) {
      cmpy = new CompanyCircle(companies[cmpyId], this.paper);
      this.companyEls.push(cmpy);
    }
  }).bind(this);

  this.init();
};
