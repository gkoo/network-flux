var PAPER_WIDTH     = 950,
    PAPER_HEIGHT    = 600,
    KNOB_RADIUS     = 20,
    BAR_WIDTH       = PAPER_WIDTH - KNOB_RADIUS*3,
    BAR_THICKNESS   = 10,
    BAR_CENTER_Y    = PAPER_HEIGHT-55,
    BAR_LEFT_BOUND  = KNOB_RADIUS * 3/2,
    BAR_RIGHT_BOUND = KNOB_RADIUS*3/2 + BAR_WIDTH,
    cmpyCircles     = {},
    GraphSliderBar,
    CompanyCircle,
    NetworkGraph;

GraphSliderBar = function(paper) {
  var isDragging      = false,
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
    bar.fill('#000');

    knob = paper.circle(KNOB_RADIUS*3/2 + BAR_WIDTH,  // center x
                        BAR_CENTER_Y,  // center y
                        KNOB_RADIUS); // radius

    knob.fill('#f00');

    knob.drag(handleKnobDrag,
              handleKnobDragStart,
              handleKnobDragStop);

    //debugStr = paper.text(50, 50, 'Hi')
                    //.attr({ 'font-size': 18 });
  };

  init();
};

CompanyCircle = function(cmpyEmployees, cmpyName, paper) {
  this.init(cmpyEmployees, cmpyName, paper);
};

CompanyCircle.prototype = {
  calculateCmpyRadius: function(cmpySize) {
    // Formula: y = -1000/(x+10) + 100
    var radius = 100 - (1000/(cmpySize+10))
    return Math.max(radius, 10);
  },

  show: function() {
    this.el.show();
    return this;
  },

  hide: function() {
    this.el.hide();
    this.label.hide();
    return this;
  },

  setEmployees: function(employees) {
    var oldRadius = this.el.attr('r'),
        newRadius = this.calculateCmpyRadius(employees.length),
        oldLabelY = this.label.attr('y');
    this.el.attr({ 'r': newRadius });
    this.label.attr({ 'y': oldLabelY + (oldRadius - newRadius) });
    return this;
  },

  doHoverIn: function () {
    this.label.show().toFront();
    this.el.toFront();
  },

  doHoverOut: function() {
    this.label.hide();
  },

  // getCenter
  // =========
  // Returns random center coordinates that ensure the circle will be drawn
  // completely within the boundaries of the canvas.
  getCenter: function(radius) {
    var x        = Math.floor(Math.random()*PAPER_WIDTH),
        y        = Math.floor(Math.random()*(BAR_CENTER_Y - (BAR_THICKNESS/2))),
        left    = x - radius,
        top     = y - radius,
        right   = left + 2*radius,
        bottom  = top + 2*radius,
        padding = 10;

    if (left < padding) {
      x = padding + radius;
    }
    else if (right > PAPER_WIDTH - padding) {
      x = PAPER_WIDTH - padding - radius;
    }
    if (top < padding) {
      y = padding + radius;
    }
    else if (bottom > BAR_CENTER_Y - (BAR_THICKNESS/2) - padding) {
      y = BAR_CENTER_Y - (BAR_THICKNESS/2) - padding - radius;
    }

    return { x: x,
             y: y };
  },

  init: function(cmpyEmployees, cmpyName, paper) {
    var radius = this.calculateCmpyRadius(cmpyEmployees.length),
        coords = this.getCenter(radius),
        x      = coords.x,
        y      = coords.y;

    this.el  = paper.circle(x,      // center x
                            y,      // center y
                            radius) // radius
                    .fill('#fff')
                    .data('size', cmpyEmployees.length);

    this.label = paper.text(x, y-radius-5, cmpyName)
                      .fill('#000')
                      .hide();

    this.el.hover(this.doHoverIn,
                  this.doHoverOut,
                  this,
                  this);
  }
};

NetworkGraph = function() {
  this.init = function() {
    this.paper = new Raphael(document.getElementById('canvas-container'), PAPER_WIDTH, PAPER_HEIGHT);
    this.sliderBar = new GraphSliderBar(this.paper);
  };

  this.renderCompanies = (function(companies, cmpyNames) {
    var cmpyCircle, x, y, radius;

    // Hide current company circles
    for (cmpyId in cmpyCircles) {
      cmpyCircles[cmpyId].hide();
    }

    // Debug
    $('#output').text("Num companies: " + Object.keys(companies).length);

    for (cmpyId in companies) {
      cmpyCircle = cmpyCircles[cmpyId];

      // If the company circle already exists, just show it.
      if (cmpyCircle) {
        cmpyCircle.show()
                  .setEmployees(companies[cmpyId]);
      }
      // It didn't exist. Create it.
      else {
        cmpyCircle = new CompanyCircle(companies[cmpyId], cmpyNames[cmpyId], this.paper);
        cmpyCircles[cmpyId] = cmpyCircle;
      }
    }
  }).bind(this);

  this.init();
};
