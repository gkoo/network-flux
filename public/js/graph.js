// TODO: redo boundary checking when resizing a circle.
var NetworkGraph;

(function() {
  var PAPER_WIDTH     = 950,
      PAPER_HEIGHT    = 600,
      KNOB_RADIUS     = 20,
      BAR_WIDTH       = PAPER_WIDTH - KNOB_RADIUS*3,
      BAR_THICKNESS   = 10,
      BAR_CENTER_Y    = PAPER_HEIGHT-55,
      BAR_TOP_Y       = BAR_CENTER_Y - (BAR_THICKNESS/2),
      BAR_LEFT_BOUND  = KNOB_RADIUS * 3/2,
      BAR_RIGHT_BOUND = KNOB_RADIUS*3/2 + BAR_WIDTH,
      cmpyCircles     = {},
      currCircles     = [],
      isDragging      = false,
      GraphSliderBar,
      CompanyCircle;

  GraphSliderBar = function(paper) {
    var mouseDownX, newMouseX, bar, knob, debugStr,

    handleKnobDrag = function(dx) {
      newX = mouseDownX + dx;
      if (newX >= BAR_LEFT_BOUND && newX <= BAR_RIGHT_BOUND) {
        newMouseX = newX;
        knob.attr({ 'cx': newX });
        //debugStr.attr({ 'text': Math.floor((newX-BAR_LEFT_BOUND)/BAR_WIDTH * 100) + '%' });
      }
    },

    handleKnobDragStart = function(x, y, evt) {
      mouseDownX = knob.attr('cx');
    },

    handleKnobDragStop = function(x, y, evt) {
      eve('slide', this, Math.floor((newMouseX-BAR_LEFT_BOUND)/BAR_WIDTH * 100));
    },

    init = function() {
      bar = paper.rect(BAR_LEFT_BOUND, // top left x
                       BAR_TOP_Y,      // top left y
                       BAR_WIDTH,      // width
                       BAR_THICKNESS); // height
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

    // findOpenSpace
    // =============
    // Moves a background circle out of the way of the currently highlighted
    // circle.
    //
    // Thanks mathisfun.com for the trigonometry refresher!
    // http://www.mathsisfun.com/sine-cosine-tangent.html
    //
    // @cx: center x of highlighted circle
    // @cy: center y of highlighted circle
    // @radius: radius of highlighted circle
    findOpenSpace: function(cx, cy, rad) {
      var el       = this.el,
          pi       = Math.PI,
          myX      = el.attr('cx'),
          myY      = el.attr('cy'),
          myR      = el.attr('r'), // my radius
          diffX    = myX - cx,
          diffY    = cy - myY,     // browser coord system is upside down.
          hypot    = Math.sqrt(diffX*diffX + diffY*diffY),
          angle    = Math.asin(diffY/hypot),
          newHypot = rad*3/2 + myR,
          newX, newY;

      this.el.stop(); // stop any existing animation

      if (diffX < 0 && diffY > 0) {
        angle = pi - angle;
      }
      else if (angle < 0 && diffX < 0 && diffY < 0) {
        angle = pi - angle;
      }
      else if (myY === cy && diffX < 0) {
        angle = pi;
      }
      newX     = cx + Math.cos(angle)*newHypot,
      newY     = cy + Math.sin(angle)*newHypot * (-1); // flip to right side up

      this.el.animate({ 'cx': newX, 'cy': newY }, 500, 'ease-out');
      this.label.attr({ 'x': newX, 'y': newY - this.el.attr('r') - 5 });
    },

    // moveOverlapCircles
    // ==================
    // Detect other circles that overlap with this one, and move them!
    moveOverlapCircles: function() {
      // Check if any other circles have intersecting BBoxes.
      var overlapCircles = [],
          el             = this.el,
          myId           = el.id,
          myBBox         = el.getBBox();

      currCircles.forEach(function(circ) {
        var bbox;

        // Don't compare the same circle to itself
        if (circ.el.id !== myId) {
          bbox = circ.el.getBBox();
          if (Raphael.isBBoxIntersect(myBBox, bbox)) {
            overlapCircles.push(circ);
          }
        }
      });

      overlapCircles.forEach(function(circ) {
        circ.findOpenSpace(el.attr('cx'), el.attr('cy'), el.attr('r'));
      });
    },

    // TODO: redo boundary checking when resizing a circle.
    setEmployees: function(employees) {
      var oldRadius = this.el.attr('r'),
          newRadius = this.calculateCmpyRadius(employees.length),
          oldLabelY = this.label.attr('y');

      this.size = employees.length;
      this.el.animate({ 'r': newRadius }, 500, 'ease-out');
      this.label.attr({ 'y': oldLabelY + (oldRadius - newRadius) });
      return this;
    },

    resetLabelPosition: function() {
      var el = this.el;
      this.label.attr({ 'x': el.attr('cx'), 'y': el.attr('cy') - el.attr('r') - 5 });
    },

    doHoverIn: function () {
      var el     = this.el;

      if (isDragging) {
        return;
      }

      this.label.show().toFront();
      this.el.toFront();

      this.moveOverlapCircles();
    },

    doHoverOut: function() {
      this.label.hide();
      collidingCircles = [];
    },

    // isInBounds
    // ==========
    // Returns if the circle is in bounds.
    isInBounds: function() {
      var el = this.el,
          x  = this.el.attr('cx'),
          y  = this.el.attr('cy'),
          r  = this.el.attr('r'),
          padding = 0;

      return (x - r) > padding &&
             (x + r) < PAPER_WIDTH - padding &&
             (y - r) > padding &&
             (y + r) < BAR_CENTER_Y - padding;
    },

    handleDrag: function(dx, dy) {
      var newX, newY, el = this.el;
      newX = el.mouseDownX + dx;
      newY = el.mouseDownY + dy;
      el.attr({ 'cx': newX });
      el.attr({ 'cy': newY });
    },

    handleDragStart: function() {
      var el = this.el;
      isDragging = true;
      el.stop();
      el.mouseDownX = el.attr('cx');
      el.mouseDownY = el.attr('cy');
      this.label.hide();
    },

    handleDragStop: function() {
      isDragging = false;
      this.resetLabelPosition();
      this.label.show();
      this.moveOverlapCircles();
    },

    // getCenter
    // =========
    // Returns random center coordinates that ensure the circle will be drawn
    // completely within the boundaries of the canvas.
    getCenter: function(radius) {
      var x        = Math.floor(Math.random()*PAPER_WIDTH),
          y        = Math.floor(Math.random()*BAR_TOP_Y),
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
      else if (bottom > BAR_TOP_Y - padding) {
        y = BAR_TOP_Y - padding - radius;
      }

      return { x: x,
               y: y };
    },

    init: function(cmpyEmployees, cmpyName, paper) {
      var radius = this.calculateCmpyRadius(cmpyEmployees.length),
          coords = this.getCenter(radius),
          x      = coords.x,
          y      = coords.y,
          self   = this;

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
                    this)
             .drag(this.handleDrag,
                   this.handleDragStart,
                   this.handleDragStop,
                   this,
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

      currCircles = [];

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

        currCircles.push(cmpyCircle);
      }
    }).bind(this);

    this.init();
  };
})();
