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

      cmpyCircles      = {}, // all company circles created up to this point
      cxnCircles       = {}, // all connection circles created up to this point
      currCmpys        = [], // the circles currently drawn in the viewport
      currCxns         = [], // the circles currently drawn in the viewport
      isDragging       = false,
      isHighlighting   = false, // are we highlighting a circle?
      highlightedCirc,
      profileData,
      paper,

      GraphSliderBar,
      NetworkCircle,
      ConnectionCircle,
      CompanyCircle,
      GraphUtils;

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
    },

    // getRandomCenter
    // ===============
    // Returns random center coordinates that ensure the circle will be drawn
    // completely within the boundaries of the canvas.
    getRandomCenter: function(radius) {
      var x      = Math.floor(Math.random()*(VIEWPORT_RIGHT-VIEWPORT_LEFT)) +
                   VIEWPORT_PADDING,
          y      = Math.floor(Math.random()*(BAR_TOP_Y - VIEWPORT_PADDING)) +
                   VIEWPORT_PADDING;

      return GraphUtils.moveAwayFromEdge(x, y, radius);
    },

    moveAwayFromEdge: function(x, y, r) {
      var left   = x - r,
          top    = y - r,
          right  = left + 2*r,
          bottom = top + 2*r;

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
    }
  };

  NetworkCircle = function() {
    // move
    // ====
    // Convenience method to move both the circle and the label
    //
    // @onComplete: callback to be invoked when animation is complete.
    this.move = function(x, y, animate, onComplete) {
      var circleType = this instanceof ConnectionCircle ? 'cxn' : 'cmpy',
          el         = this.el,
          coords;

      if (circleType === 'cmpy') {
        coords = { 'cx': x, 'cy': y };
      }
      else {
        coords = { 'x': x - this.IMG_DIM/2, 'y': y - this.IMG_DIM/2 };
      }

      if (this.label) {
        this.label.hide()
                  .attr({ 'x': x,
                          'y': y - el.attr('r') - 5 });
      }

      if (animate) {
        el.animate(coords, ANIM_DURATION, 'ease-out', onComplete);
      }
      else {
        el.attr(coords);
      }
    };

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
    this.findOpenSpace = function(cx, cy, rad) {
      var el         = this.el,
          pi         = Math.PI,
          imgRad     = this.IMG_DIM ? this.IMG_DIM/2 : null,
          myX        = el.attr('cx') || el.attr('x') + imgRad,
          myY        = el.attr('cy') || el.attr('y') + imgRad,
          myR        = el.attr('r')  || imgRad, // my radius
          diffX      = myX - cx,     // adjacent
          diffY      = cy - myY,     // opposite
                                   // browser coord system is upside down.
          hypot      = Math.sqrt(diffX*diffX + diffY*diffY),
          angle      = Math.asin(diffY/hypot),
          newHypot   = Math.max(rad*3/2, 30) + myR,
          angleIncrements = [Math.PI/2, (-1)*Math.PI/2, Math.PI],
          newCenter, i, len, newX, newY, tmpAngle;

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

      newX = cx + Math.cos(angle)*newHypot;
      newY = cy + Math.sin(angle)*newHypot * (-1); // flip to right side up

      // Handle circle flying out of bounds.
      // Try going right 90 degrees, then left 90 degrees, then 180.
      i = 0;
      len = angleIncrements.length;
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
        // Last resort ... just find a random x,y to jump to
        newCenter = GraphUtils.getRandomCenter(myR);
        newX = newCenter.x;
        newY = newCenter.y;
      }
      else {
        angle = tmpAngle;
      }

      this.move(newX, newY, true);
    };

    // moveOverlapCirclesProto
    // =======================
    // Detect other circles that overlap with this one, and move them!
    // Intended to be curried by implementing classes.
    //
    //
    // @circleList: list of elements against which to check for collisions
    this.moveOverlapCirclesProto = function(circleList) {
      // Check if any other circles have intersecting BBoxes.
      var el     = this.el,
          myId   = el.id,
          myBBox = el.getBBox(),
          rad    = el.attr('r') || this.IMG_DIM/2,
          cx     = el.attr('cx') || el.attr('x') + rad,
          cy     = el.attr('cy') || el.attr('y') + rad,
          overlapCircles = [];

      circleList.forEach(function(circ) {
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
        circ.findOpenSpace(cx, cy, rad);
        circ.el.toBack();
      });
    };
  };

  GraphSliderBar = function() {
    var mouseDownX, newMouseX, bar, knob,

    handleKnobDrag = function(dx) {
      newX = mouseDownX + dx;
      if (newX >= BAR_LEFT_BOUND && newX <= BAR_RIGHT_BOUND) {
        newMouseX = newX;
        knob.attr({ 'cx': newX });
      }
    },

    handleKnobDragStart = function(x, y, evt) {
      mouseDownX = knob.attr('cx');
      if (isHighlighting && highlightedCirc) {
        isHighlighting = false;
        eve('circleClick', highlightedCirc);
      }
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
    };

    init();
  };

  ConnectionCircle = function(profile, cx, cy) {
    this.init(profile, cx, cy);
  };

  ConnectionCircle.prototype = new NetworkCircle();

  extend(ConnectionCircle.prototype, {
    IMG_DIM: 80,

    init: function(profile, cx, cy) {
      var imgDim = this.IMG_DIM,
          center = GraphUtils.getRandomCenter(imgDim/2),
          x      = center.x - imgDim/2,
          y      = center.y - imgDim/2;

      this.el = paper.rect(x, y, imgDim, imgDim, imgDim/2)
                     .attr({ 'fill': 'url(' + profile.pictureUrl + ')' })
                     .hide()
                     .drag(this.doDrag,
                           this.doDragStart,
                           this.doDragStop,
                           this,
                           this,
                           this)
                     .hover(this.doHoverIn,
                            this.doHoverOut,
                            this,
                            this);
    },

    doDrag: function(dx, dy) {
      var newX, newY, el;
      if (isDragging) {
        el = this.el;
        newX = this.mouseDownX + dx;
        newY = this.mouseDownY + dy;
        if (this.xInBounds(newX)) {
          el.attr({ 'x': newX });
        }
        if (this.yInBounds(newY)) {
          el.attr({ 'y': newY });
        }
      }
    },

    doDragStart: function() {
      var el = this.el;

      this.mouseDownX = el.attr('x');
      this.mouseDownY = el.attr('y');

      isDragging = true;
      el.stop();
    },

    doDragStop: function() {
      if (isDragging) {
        this.moveOverlapCircles();
        isDragging = false;
      }
    },

    doHoverIn: function() {
      var el = this.el;

      if (isDragging) {
        return;
      }

      this.el.toFront();
      this.moveOverlapCircles();
    },

    doHoverOut: function() {
    },

    setCenter: function(cx, cy) {
      var imgDim = this.IMG_DIM,
          x = cx - imgDim/2,
          y = cy - imgDim/2;

      this.el.attr({ 'x': x, 'y': y });
    },

    xInBounds: function(x) {
      var midCircR = highlightedCirc.el.attr('r'),
          inBounds = (x >= VIEWPORT_LEFT &&
                      x + this.IMG_DIM <= VIEWPORT_RIGHT);

      return inBounds && (x + this.IMG_DIM <= VIEWPORT_MID_X - midCircR &&
                          x <= VIEWPORT_MID_X + midCircR);
    },

    yInBounds: function(y) {
      var midCircR = highlightedCirc.el.attr('r'),
          inBounds = (y >= VIEWPORT_TOP &&
                      y + this.IMG_DIM <= VIEWPORT_BOTTOM);

      return inBounds && (y + this.IMG_DIM <= VIEWPORT_MID_Y - midCircR ||
                          y <= VIEWPORT_MID_Y + midCircR);
    },

    // Curries the NetworkCircle.moveOverlapCircles function with currCxns
    // (specifies that we want to compare this circle against other cxn circles)
    moveOverlapCircles: function() {
      return this.moveOverlapCirclesProto.call(this, currCxns);
    },


    hide: function() {
      this.el.hide();
    },

    show: function() {
      this.el.show();
    }
  });

  CompanyCircle = function(cmpyEmployees, cmpyName) {
    this.init(cmpyEmployees, cmpyName);
  };

  CompanyCircle.prototype = new NetworkCircle();

  extend(CompanyCircle.prototype, {
    calculateCmpyRadius: function(cmpySize) {
      // Formula: y = -15000/(x+100) + 150
      // http://www.mathsisfun.com/data/function-grapher.php
      var radius = 150 - (15000/(cmpySize+100))

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

    // Curries the NetworkCircle.moveOverlapCircles function with currCmpys
    // (specifies that we want to compare this circle against other cmpy circles)
    moveOverlapCircles: function() {
      return this.moveOverlapCirclesProto.call(this, currCmpys);
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

      this.employees = employees;
      this.pictures = [];

      // recheck bounds when resizing circle
      if (!GraphUtils.isInBounds(x, y, newRadius)) {
        point = GraphUtils.moveAwayFromEdge(x, y, newRadius);
        x = point.x;
        y = point.y;
      }
      el.animate({ 'cx': x, 'cy': y, 'r': newRadius }, ANIM_DURATION, 'ease-out', this.resetLabelPosition.bind(this));
      return this;
    },

    resetLabelPosition: function() {
      var el = this.el;
      this.label.attr({ 'x': el.attr('cx'), 'y': el.attr('cy') - el.attr('r') - 5 });
    },

    doHoverIn: function () {
      var el = this.el;

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

      if (isHighlighting) {
        if (this === highlightedCirc) {
          return;
        }
        else {
          highlightedCirc.unhighlight();
          isHighlighting = false;
        }
      }

      isDragging = true;
      el.stop();
      this.label.hide();
    },

    doDragStop: function() {
      var el = this.el;
      if (isDragging) {
        this.resetLabelPosition();
        this.label.show();
        this.moveOverlapCircles();

        if (!isHighlighting) {
          el.data('cx', el.attr('cx'));
          el.data('cy', el.attr('cy'));
        }
        isDragging = false;
      }

      // Have to do this stupid check because every drag event also produces a
      // click event.
      this.clicked = (this.mouseDownX === el.attr('cx') &&
                      this.mouseDownY === el.attr('cy'));
    },

    // loadEmployees
    // =============
    // Creates the ConnectionCircles, so that we can start loading images, but
    // keeps the RaphaelJS elements hidden for now.
    loadEmployees: function() {
      var self         = this,
          idx          = 0,
          pi           = Math.PI,
          cmpyR        = this.el.attr('r'),
          i, len;

      this.employees.forEach(function(empId) {
        var profile     = profileData[empId],
            IMG_DIM     = 80,
            cxnCircle;

        if (profile.pictureUrl) {
          cxnCircle = cxnCircles[profile.id];
          if (!cxnCircle) {
            cxnCircle = new ConnectionCircle(profile);
            cxnCircles[profile.id] = cxnCircle;
          }
          self.pictures.push(cxnCircle);
        }
      });
    },

    // showEmployees
    // =============
    // Reveals the ConnectionCircles
    showEmployees: function() {
      this.pictures.forEach(function(cxnCirc) {
        cxnCirc.show();
        currCxns.push(cxnCirc);
      });
    },

    highlight: function() {
      this.loadEmployees();
      this.move(VIEWPORT_MID_X, VIEWPORT_MID_Y, true, (function() {
        this.moveOverlapCircles();
        this.el.fill('#00f'); // TODO: make it glow!
        this.showEmployees();
      }).bind(this));
    },

    unhighlight: function() {
      // move back to original position
      var el = this.el,
          cx = el.data('cx');
          cy = el.data('cy');

      el.toFront();
      this.move(cx, cy, true);
      this.el.fill('#fff');
      $('#output').empty(); // TODO: remove this line

      if (this.pictures) {
        this.pictures.forEach(function(cxnCirc) {
          cxnCirc.hide();
        });
        currCxns = [];
      }
    },

    handleClick: function() {
      if (isHighlighting) {
        this.highlight();
      }
      else {
        this.unhighlight();
      }
    },

    init: function(cmpyEmployees, cmpyName) {
      var radius = this.calculateCmpyRadius(cmpyEmployees.length),
          coords = GraphUtils.getRandomCenter(radius),
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

      this.employees = cmpyEmployees;

      this.pictures = [];

      eve.on('circleClick', this.handleClick);
    }
  });

  NetworkGraph = function() {
    this.init();
  };

  NetworkGraph.prototype = {
    init: function() {
      paper = new Raphael(document.getElementById('canvas-container'), PAPER_WIDTH, PAPER_HEIGHT);
      this.sliderBar = new GraphSliderBar();

      eve.on('circleClick', this.fadeOtherCircles);
    },

    renderCompanies: function(companies, cmpyNames) {
      var cmpyCircle, x, y, radius;

      // Hide current company circles
      for (cmpyId in cmpyCircles) {
        cmpyCircles[cmpyId].hide();
      }

      currCmpys = [];

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
          cmpyCircle = new CompanyCircle(companies[cmpyId], cmpyNames[cmpyId]);
          cmpyCircles[cmpyId] = cmpyCircle;
        }

        currCmpys.push(cmpyCircle);
      }
    },

    fadeOtherCircles: function() {
      var self = this; // "this" is bound to circle that was clicked.

      currCmpys.forEach(function(circ) {
        if (circ.el.id !== self.el.id) {
          if (isHighlighting) {
            circ.el.hide();
          }
          else {
            circ.el.show();
          }
        }
      });
    },

    setProfiles: function(profiles) {
      profileData = profiles;
    }
  };
})();
