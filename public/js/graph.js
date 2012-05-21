var NetworkGraph;

(function() {
  var PAPER_WIDTH      = 950,
      PAPER_HEIGHT     = 600,

      KNOB_RADIUS      = 20,

      // Coords for the playbar.
      BAR_WIDTH        = PAPER_WIDTH - KNOB_RADIUS*3,
      BAR_THICKNESS    = 10,
      BAR_CENTER_Y     = PAPER_HEIGHT-55,
      BAR_TOP_Y        = BAR_CENTER_Y - (BAR_THICKNESS/2),
      BAR_LEFT_BOUND   = KNOB_RADIUS * 3/2,
      BAR_RIGHT_BOUND  = KNOB_RADIUS*3/2 + BAR_WIDTH,

      // Bounding box for canvas viewport (where the circles are allowed to go)
      VIEWPORT_PADDING = 30,
      VIEWPORT_TOP     = VIEWPORT_PADDING,
      VIEWPORT_LEFT    = VIEWPORT_PADDING,
      VIEWPORT_RIGHT   = PAPER_WIDTH - VIEWPORT_PADDING,
      VIEWPORT_BOTTOM  = BAR_TOP_Y - VIEWPORT_PADDING,
      VIEWPORT_MID_X   = VIEWPORT_PADDING + (VIEWPORT_RIGHT - VIEWPORT_LEFT)/2,
      VIEWPORT_MID_Y   = VIEWPORT_PADDING + (VIEWPORT_BOTTOM - VIEWPORT_TOP)/2,

      ANIM_DURATION    = 500,

      cmpyCircles      = {}, // all circles created up to this point
      currCircles      = [], // the circles currently drawn in the viewport
      isDragging       = false,
      isHighlighting   = false, // are we highlighting a circle?
      highlightedCirc,

      GraphSliderBar,
      CompanyCircle,
      GraphUtils;

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
      // http://www.mathsisfun.com/data/function-grapher.php
      var radius = 100 - (1000/(cmpySize+10))

      // Want radius to be minimum of 10
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

    // Convenience method to move both the circle and the label
    move: function(x, y, animate) {
      var coords = { 'cx': x, 'cy': y },
          el     = this.el;
      this.label.hide();
      if (animate) {
        el.animate(coords, ANIM_DURATION, 'ease-out');
      }
      else {
        el.attr(coords);
      }
      this.label.attr({
                        'x': x,
                        'y': y - el.attr('r') - 5
                      });
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
          diffX    = myX - cx,     // adjacent
          diffY    = cy - myY,     // opposite
                                   // browser coord system is upside down.
          hypot    = Math.sqrt(diffX*diffX + diffY*diffY),
          angle    = Math.asin(diffY/hypot),
          newHypot = Math.max(rad*3/2, 30) + myR,
          angleIncrements = [Math.PI/2, (-1)*Math.PI/2, Math.PI],
          len = angleIncrements.length,
          i = 0,
          newX, newY, tmpAngle;

      this.el.stop(); // stop any existing animation

      // Handle some ambiguous cases.
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

      // Handle circle flying out of bounds.
      // Try going right 90 degrees, then left 90 degrees, then 180.
      while (!GraphUtils.isInBounds(newX, newY, myR)) {
        if (i >= len) {
          break;
        }
        tmpAngle = angle + angleIncrements[i++];
        newX     = cx + Math.cos(tmpAngle)*newHypot,
        newY     = cy + Math.sin(tmpAngle)*newHypot * (-1); // flip to right side up
      }

      if (!GraphUtils.isInBounds(newX, newY, myR)) {
        // Didn't find a new in-bounds position. This shouldn't happen.
        console.log('Couldn\'t find a in-bounds position to jump to!');
      }
      else {
        angle = tmpAngle;
      }

      this.move(newX, newY, true);
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

    // setEmployees
    // ============
    // Resizes the circle based on the number of employees.
    setEmployees: function(employees) {
      var el = this.el,
          oldRadius = el.attr('r'),
          newRadius = this.calculateCmpyRadius(employees.length),
          oldLabelY = this.label.attr('y'),
          x = el.attr('cx'),
          y = el.attr('cy'),
          point;

      this.size = employees.length;

      // recheck bounds when resizing circle
      if (!GraphUtils.isInBounds(x, y, newRadius)) {
        point = this.moveAwayFromEdge(x, y, newRadius);
        x = point.x;
        y = point.y;
      }
      el.animate({ 'cx': x, 'cy': y, 'r': newRadius }, ANIM_DURATION, 'ease-out');
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

      this.label.show();

      if (!isHighlighting) {
        this.label.toFront();
        this.el.toFront();
        this.moveOverlapCircles();
      }
    },

    doHoverOut: function() {
      this.label.hide();
      collidingCircles = [];
    },

    doClick: function() {
      if (this.clicked) {
        if (isHighlighting && this != highlightedCirc) {
          // Clicked on a circle, but another was highlighted.
          // Unhighlight that one, then highlight this one.
          highlightedCirc.unhighlight();
        }
        else {
          isHighlighting = !isHighlighting;
        }
        highlightedCirc = this;
        eve('circleClick', this);
      }
    },

    doDrag: function(dx, dy) {
      var newX, newY, el;
      if (isDragging) {
        el = this.el;
        newX = this.mouseDownX + dx;
        newY = this.mouseDownY + dy;
        if (GraphUtils.xInBounds(newX, el.attr('r'))) {
          el.attr({ 'cx': newX });
        }
        if (GraphUtils.yInBounds(newY, el.attr('r'))) {
          el.attr({ 'cy': newY });
        }
      }
    },

    doDragStart: function() {
      var el = this.el;
      this.mouseDownX = el.attr('cx');
      this.mouseDownY = el.attr('cy');

      if (isHighlighting && this !== highlightedCirc) {
        highlightedCirc.unhighlight();
        isHighlighting = false;
      }

      isDragging = true;
      el.stop();
      this.label.hide();
    },

    doDragStop: function() {
      var el = this.el;
      this.resetLabelPosition();
      this.label.show();
      this.moveOverlapCircles();

      if (!isHighlighting) {
        el.data('cx', el.attr('cx'));
        el.data('cy', el.attr('cy'));
      }
      isDragging = false;

      // Have to do this stupid check because every drag event also produces a
      // click event.
      this.clicked = (this.mouseDownX === el.attr('cx') &&
                      this.mouseDownY === el.attr('cy'));
    },

    moveAwayFromEdge: function(x, y, r) {
      var left   = x - r,
          top    = y - r,
          right  = left + 2*r,
          bottom = top + 2*r;

      if (typeof x === 'undefined') {
        x = this.el.attr('x');
        y = this.el.attr('y');
        r = this.el.attr('r');
      }

      if (left < VIEWPORT_PADDING) {
        x = VIEWPORT_PADDING + r;
      }
      else if (right > VIEWPORT_RIGHT) {
        x = PAPER_WIDTH - VIEWPORT_PADDING - r;
      }
      if (top < VIEWPORT_PADDING) {
        y = VIEWPORT_PADDING + r;
      }
      else if (bottom > BAR_TOP_Y - VIEWPORT_PADDING) {
        y = BAR_TOP_Y - VIEWPORT_PADDING - r;
      }

      return { x: x,
               y: y };
    },

    // getCenter
    // =========
    // Returns random center coordinates that ensure the circle will be drawn
    // completely within the boundaries of the canvas.
    getCenter: function(radius) {
      var x      = Math.floor(Math.random()*PAPER_WIDTH),
          y      = Math.floor(Math.random()*BAR_TOP_Y),
          point  = this.moveAwayFromEdge(x, y, radius);

      return { x: point.x,
               y: point.y };
    },

    highlight: function() {
      var self = this;
      this.move(VIEWPORT_MID_X, VIEWPORT_MID_Y, true);
      setTimeout(function() {
        self.moveOverlapCircles();
      }, ANIM_DURATION);
    },

    unhighlight: function() {
      // move back to original position
      var el = this.el,
          cx = el.data('cx');
          cy = el.data('cy');

      el.toFront();
      this.move(cx, cy, true);
    },

    handleClick: function() {
      if (isHighlighting) {
        this.highlight();
      }
      else {
        this.unhighlight();
      }
    },

    init: function(cmpyEmployees, cmpyName, paper) {
      var radius = this.calculateCmpyRadius(cmpyEmployees.length),
          coords = this.getCenter(radius),
          x      = coords.x,
          y      = coords.y,
          self   = this;

      this.el  = paper.circle(x, // center x
                              y, // center y
                              radius)
                      .fill('#fff')
                      .data('size', cmpyEmployees.length)
                      .data('cx', x)
                      .data('cy', y);

      this.label = paper.text(x, y-radius-5, cmpyName)
                        .fill('#000')
                        .hide();

      this.el.hover(this.doHoverIn,
                    this.doHoverOut,
                    this,
                    this)
             .click(this.doClick, this)
             .drag(this.doDrag,
                   this.doDragStart,
                   this.doDragStop,
                   this,
                   this,
                   this);

      eve.on('circleClick', this.handleClick);
    }
  };

  NetworkGraph = function() {
    this.init();
  };

  NetworkGraph.prototype = {
    init: function() {
      this.paper = new Raphael(document.getElementById('canvas-container'), PAPER_WIDTH, PAPER_HEIGHT);
      this.sliderBar = new GraphSliderBar(this.paper);

      //eve.on('circleClick', this.fadeOtherCircles);
    },

    renderCompanies: function(companies, cmpyNames) {
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
    },

    fadeOtherCircles: function() {
      var self = this,
          fill = isHighlighting ? '#004' : '#fff';
      currCircles.forEach(function(circ) {
        if (circ.el.id !== self.el.id) {
          circ.el.animate({ 'fill': fill }, 2000, 'linear');
        }
      });
    }
  };

  GraphUtils = {
    // isInBounds
    // ==========
    // Returns if the circle is in bounds.
    isInBounds: function(x, y, r) {
      return this.xInBounds(x, r) && this.yInBounds(y, r);
    },

    xInBounds: function(x, r) {
      return (x - r) > VIEWPORT_LEFT &&
             (x + r) < VIEWPORT_RIGHT;
    },

    yInBounds: function(y, r) {
      return (y - r) > VIEWPORT_TOP &&
             (y + r) < VIEWPORT_BOTTOM;
    }
  };
})();
