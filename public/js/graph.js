var NetworkGraph;

(function() {
  var $window          = $(window),
      $viewport        = $('#viewport'),
      $connections     = $('#connections'),
      PAPER_WIDTH      = 950,
      PAPER_HEIGHT     = 750,

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
      VIEWPORT_WIDTH   = $viewport.width(),
      VIEWPORT_HEIGHT  = $viewport.height(),

      HIGHLIGHT_RADIUS = 40,

      CXN_WINDOW_HEIGHT = VIEWPORT_HEIGHT - 2*HIGHLIGHT_RADIUS,

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
      return (x - r) > 0 &&
             (x + r) < VIEWPORT_WIDTH;
    },

    yInBounds: function(y, r) {
      return (y - r) > 0 &&
             (y + r) < VIEWPORT_HEIGHT;
    },

    // getRandomCenter
    // ===============
    // Returns random center coordinates that ensure the circle will be drawn
    // completely within the boundaries of the canvas.
    getRandomCenter: function(radius) {
      var cx = Math.floor(Math.random()*(VIEWPORT_WIDTH)),
          cy = Math.floor(Math.random()*(VIEWPORT_HEIGHT));

      return GraphUtils.moveAwayFromEdge(cx, cy, radius);
    },

    isIntersecting: function(circ1, circ2) {
      var r1 = circ1.r,
          r2 = circ2.r,
          d1 = r1 * 2,
          d2 = r2 * 2,
          x1 = circ1.cx - r1,
          x2 = circ2.cx - r2,
          y1 = circ1.cy - r1,
          y2 = circ2.cy - r2,
          intersect = false;

      return ((x1 + d1 >= x2 && x1 <= x2 + d2) && // x-axis intersects.
              (y1 + d1 >= y2 && y1 <= y2 + d2)); // y-axis intersects.
    },

    moveAwayFromEdge: function(cx, cy, r) {
      var left   = cx - r,
          right  = cx + r,
          top    = cy - r,
          bottom = cy + r;

      if (left <= 0) {
        cx = r;
      }
      else if (right > VIEWPORT_WIDTH) {
        cx = VIEWPORT_WIDTH - r;
      }
      if (top <= 0) {
        cy = r;
      }
      else if (bottom > VIEWPORT_HEIGHT) {
        cy = VIEWPORT_HEIGHT - r;
      }

      return { x: cx,
               y: cy };
    }
  };

  NetworkCircle = function() {};

  NetworkCircle.prototype = {
    createEl: function(id, r, name, type) {
      this.r  = r;
      this.$circle = $('<div>').addClass('circle ' + type + '-circ')
                               .css({
                                 width: r*2,
                                 height: r*2
                               });
      this.setBorderRadius(r);
      this.$label = $('<span>').addClass(type + '-label')
                               .text(name);
      this.$circle.append(this.$label);
      this.$container = $('<div>').addClass('circle-container ' + type + '-circ-container')
                                  .attr('id', 'circle-'+id)
                                  .append(this.$circle);
      return this;
    },

    setBorderRadius: function(r) {
      var r2 = r*2;
      this.$circle.css({
        '-moz-border-radius':    r2 + 'px',
        '-ms-border-radius':     r2 + 'px',
        '-o-border-radius':      r2 + 'px',
        '-webkit-border-radius': r2 + 'px',
        'border-radius':         r2 + 'px'
      });
    },

    show: function() {
      this.$container.show();
      return this;
    },

    hide: function() {
      this.$container.hide();
      return this;
    },

    // move
    // ====
    // Convenience method to move both the circle and the label
    move: function(cx, cy, onComplete) {
      var $circle = this.$circle,
          coords  = { left: cx - this.r, top: cy - this.r };

      this.cx = cx;
      this.cy = cy;

      this.$container.css(coords);
      if (onComplete) {
        setTimeout(onComplete, ANIM_DURATION);
      }
      return this;
    },

    setRadius: function(r, recenter) {
      var diam = 2*r,
          newX,
          newY;

      if (typeof recenter === 'undefined') {
        recenter = true;
      }

      if (recenter) {
        this.$container.css({
          left: this.cx - r,
          top:  this.cy - r
        });
      }
      this.$circle.css({
        width: diam + 'px',
        height: diam + 'px'
      });

      this.r = r;
      this.setBorderRadius(r);

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
      var pi         = Math.PI,
          imgRad     = this.IMG_DIM ? this.IMG_DIM/2 : null,
          diffX      = this.cx - cx,     // adjacent
          diffY      = cy - this.cy,     // opposite
                                   // browser coord system is upside down.
          hypot      = Math.sqrt(diffX*diffX + diffY*diffY),
          angle      = Math.asin(diffY/hypot),
          newHypot   = Math.max(rad*3/2, 30) + this.r,
          angleIncrements = [Math.PI/2, (-1)*Math.PI/2, Math.PI],
          newCenter, i, len, newX, newY, tmpAngle;

      // Handle some ambiguous cases.
      if (diffX < 0 && diffY > 0) {
        angle = pi - angle;
      }
      else if (angle < 0 && diffX < 0 && diffY < 0) {
        angle = pi - angle;
      }
      else if (this.cy === cy && diffX < 0) {
        angle = pi;
      }

      newX = cx + Math.cos(angle)*newHypot;
      newY = cy + Math.sin(angle)*newHypot * (-1); // flip to right side up

      // Handle circle flying out of bounds.
      // Try going right 90 degrees, then left 90 degrees, then 180.
      for (i = 0, len = angleIncrements.length; i < len; ++i) {
        if (GraphUtils.isInBounds(newX, newY, this.r)) {
          break;
        }
        tmpAngle = angle + angleIncrements[i++];
        newX     = cx + Math.cos(tmpAngle)*newHypot,
        newY     = cy + Math.sin(tmpAngle)*newHypot * (-1); // flip to right side up
      }

      if (!GraphUtils.isInBounds(newX, newY, this.r)) {
        // Didn't find a new in-bounds position. This shouldn't happen.
        console.log('Couldn\'t find a in-bounds position to jump to!');
        // Last resort ... just find a random x,y to jump to
        newCenter = GraphUtils.getRandomCenter(this.r);
        newX = newCenter.x;
        newY = newCenter.y;
      }
      else {
        angle = tmpAngle;
      }

      this.move(newX, newY);
    },

    // moveOverlapCirclesProto
    // =======================
    // Detect other circles that overlap with this one, and move them!
    // Intended to be curried by implementing classes.
    //
    //
    // @circleList: list of elements against which to check for collisions
    moveOverlapCirclesProto: function(circleList) {
      // Check if any other circles have intersecting BBoxes.
      var self           = this,
          overlapCircles = [];

      circleList.forEach(function(circ) {
        // Don't compare the same circle to itself
        if (circ !== self && GraphUtils.isIntersecting(self, circ)) {
          overlapCircles.push(circ);
        }
      });

      overlapCircles.forEach(function(circ) {
        circ.findOpenSpace(self.cx, self.cy, self.r);
      });
    },

    getContainer: function() {
      return this.$container;
    }
  };

  GraphSliderBar = function() {
    var $handle,

    handleDragStart = function(evt, ui) {
      if (isHighlighting && highlightedCirc) {
        isHighlighting = false;
        highlightedCirc.unhighlight();
        $window.trigger('circleClick');
      }
    },

    handleDragStop = function(evt, ui) {
      var percent = Math.floor(ui.position.left/(PAPER_WIDTH - 2*KNOB_RADIUS)*100);
      $window.trigger('slider', percent);
    },

    init = function() {
      this.$el = $('#slider');
      $handle = this.$el.find('#sliderHandle');
      $handle.draggable({
        axis: 'x',
        containment: 'parent',
        start: handleDragStart,
        stop: handleDragStop
      });
    };

    init();
  };

  ConnectionCircle = function(profile) {
    this.init(profile);
  };

  ConnectionCircle.prototype = new NetworkCircle();

  extend(ConnectionCircle.prototype, {
    init: function(profile) {
       var r       = 40, // profile pic is 80x80
          center   = GraphUtils.getRandomCenter(r),
          x        = center.x - r,
          y        = center.y - r,
          linkEl   = $('<a>'),
          photoUrl = profile.pictureUrl || 'img/icon_no_photo_80x80.png',
          url      = profile.siteStandardProfileRequest ? profile.siteStandardProfileRequest.url : '#';

      this.id = profile.id;
      this.profile = profile;
      this.createEl(profile.id,
                    r,
                    profile.firstName + ' ' + profile.lastName,
                    'cxn');
      linkEl.attr({
        href: url || '#',
        title: profile.firstName + ' ' + profile.lastName,
        target: '_new'
      });
      linkEl.append($('<img>').addClass('cxn-picture')
                              .attr('src', photoUrl));
      this.$circle.append(linkEl);
    },

    show: function() {
      this.$container.css('display', 'inline-block');
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

    setCenter: function(cx, cy) {
      var imgDim = this.IMG_DIM,
          x = cx - imgDim/2,
          y = cy - imgDim/2;

      this.el.attr({ 'x': x, 'y': y });
    },

    setImageWidth: function(width) {
      this.$container.find('img').css({
        width: width,
        height: width
      });
      return this;
    },

    xInBounds: function(x) {
      var midCircR = highlightedCirc.el.attr('r'),
          inBounds = (x >= 0 && x + this.IMG_DIM <= VIEWPORT_WIDTH);

      return inBounds && (x + this.IMG_DIM <= VIEWPORT_WIDTH/2 - midCircR &&
                          x <= VIEWPORT_WIDTH/2 + midCircR);
    },

    yInBounds: function(y) {
      var midCircR = highlightedCirc.el.attr('r'),
          inBounds = (y >= 0 &&
                      y + this.IMG_DIM <= VIEWPORT_HEIGHT);

      return inBounds && (y + this.IMG_DIM <= VIEWPORT_HEIGHT/2 - midCircR ||
                          y <= VIEWPORT_HEIGHT/2 + midCircR);
    },

    // Curries the NetworkCircle.moveOverlapCircles function with currCxns
    // (specifies that we want to compare this circle against other cxn circles)
    moveOverlapCircles: function() {
      return this.moveOverlapCirclesProto.call(this, currCxns);
    }
  });

  CompanyCircle = function(id, cmpyEmployees, cmpyName) {
    this.init(id, cmpyEmployees, cmpyName);
  };

  CompanyCircle.prototype = new NetworkCircle();

  extend(CompanyCircle.prototype, {
    calculateCmpyRadius: function(cmpySize) {
      // Formula: y = -1000/(x+10) + 100
      // http://www.mathsisfun.com/data/function-grapher.php
      var radius = 100 - (1000/(cmpySize+10))

      // Want radius to be minimum of 10
      return Math.max(radius, 10);
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
      var oldRadius = this.r,
          newRadius = this.calculateCmpyRadius(employees.length),
          cx = this.cx,
          cy = this.cy,
          point;

      this.employees = employees;
      this.pictures = [];

      // recheck bounds when resizing circle
      if (!GraphUtils.isInBounds(cx, cy, newRadius)) {
        point = GraphUtils.moveAwayFromEdge(cx, cy, newRadius);
        cx = point.x;
        cy = point.y;
      }

      this.move(cx, cy);

      if (this.r !== newRadius) {
        this.setRadius(newRadius);
      }

      return this;
    },

    resetLabelPosition: function() {
      var el = this.el;
      this.label.attr({ 'x': el.attr('cx'), 'y': el.attr('cy') - el.attr('r') - 5 });
    },

    doHoverIn: function () {
      //if (isDragging) {
        //return;
      //}
      if (!isHighlighting) {
        this.$container.addClass('hover');
        this.$label.show();
        this.moveOverlapCircles();
      }
    },

    doHoverOut: function() {
      this.$container.removeClass('hover');
      this.$label.hide();
    },

    doClick: function(evt) {
      if (!this.wasDragging) {
        if (isHighlighting && this != highlightedCirc) {
          // Clicked on a circle, but another was highlighted.
          // Unhighlight that one, then highlight this one.
          highlightedCirc.unhighlight();
        }
        else {
          isHighlighting = !isHighlighting;
        }
        if (isHighlighting) {
          this.highlight();
          highlightedCirc = this;
        }
        else {
          this.unhighlight();
        }
        $window.trigger('circleClick', this);
      }
      this.wasDragging = false;
    },

    doDragStop: function(evt, ui) {
      this.wasDragging = true;
      this.cx = ui.position.left + this.r;
      this.cy = ui.position.top + this.r;
      this.moveOverlapCircles();
    },

    // loadEmployees
    // =============
    // Creates the ConnectionCircles, so that we can start loading images, but
    // keeps the RaphaelJS elements hidden for now.
    loadEmployees: function() {
      var self              = this,
          noPictureProfiles = [],
          numEmployees      = this.employees.length,
          cxnWindowArea     = VIEWPORT_WIDTH*CXN_WINDOW_HEIGHT;

      if (cxnWindowArea/(80*80) < numEmployees) {
        // fit pictures to connections box.
        this.pictureWidth = Math.floor(Math.sqrt(VIEWPORT_WIDTH*CXN_WINDOW_HEIGHT/numEmployees)*9/10);
        // set minimum image width to 20
        this.pictureWidth = Math.max(20, this.pictureWidth);
      }
      else {
        this.pictureWidth = 80;
      }

      this.employees.forEach(function(empId) {
        var profile = profileData[empId],
            cxnCircle;

        cxnCircle = cxnCircles[profile.id];
        if (!cxnCircle) {
          cxnCircle = new ConnectionCircle(profile);
          cxnCircles[profile.id] = cxnCircle;
          if (profile.pictureUrl) {
            $connections.append(cxnCircle.getContainer());
          }
          else {
            noPictureProfiles.push(cxnCircle);
          }
        }
        cxnCircle.setRadius(self.pictureWidth/2, false)
                 .setImageWidth(self.pictureWidth);
        self.pictures.push(cxnCircle);
      });

      // Add pictures with no profiles to DOM last.
      noPictureProfiles.forEach(function(circ) {
        $connections.append(circ.getContainer());
      });
    },

    // showEmployees
    // =============
    // Reveals the ConnectionCircles
    showEmployees: function() {
      var numEmployees = this.employees.length,
          i, len, numPerRow, numRows, width, height;

      $viewport.addClass('highlighting');
      if (this.pictures) {
        for (i = 0, len = this.pictures.length; i < len; ++i) {
          this.pictures[i].show();
        }
      }

      numPerRow = Math.floor(VIEWPORT_WIDTH/this.pictureWidth);
      numRows = Math.ceil(this.employees.length/numPerRow);
      width = (this.pictureWidth + 2) * (numPerRow > numEmployees ? numEmployees : numPerRow);
      height = numRows * (this.pictureWidth + 2); // + 2 for border
      $connections.css({
        top: HIGHLIGHT_RADIUS*2 + CXN_WINDOW_HEIGHT/2 - height/2 - this.pictureWidth/2,
        left: VIEWPORT_WIDTH/2 - width/2
      });
    },

    highlight: function() {
      this.loadEmployees();
      this.origCx = this.cx;
      this.origCy = this.cy;
      this.setRadius(HIGHLIGHT_RADIUS, false);
      this.move(HIGHLIGHT_RADIUS, HIGHLIGHT_RADIUS, (function() {
        this.$container.addClass('highlighted');
        //this.moveOverlapCircles();
        this.showEmployees();
      }).bind(this));
    },

    unhighlight: function() {
      // move back to original position
      this.move(this.origCx, this.origCy);
      this.setRadius(this.origR);
      this.$container.removeClass('highlighted');

      if (this.pictures) {
        this.pictures.forEach(function(cxnCirc) {
          cxnCirc.hide();
        });
        currCxns = [];
      }
      $viewport.removeClass('highlighting');
    },

    positionEl: function(x, y, r) {
      this.cx = x;
      this.cy = y;
      this.$container.css({
        left: this.cx-r,
        top:  this.cy-r
      });
      return this;
    },

    init: function(id, cmpyEmployees, cmpyName) {
      var radius = this.calculateCmpyRadius(cmpyEmployees.length),
          coords = GraphUtils.getRandomCenter(radius),
          x      = coords.x,
          y      = coords.y,
          self   = this,
          STRIP_PUNC = /[^\w\d-_]/gi;

      this.id = id.replace(STRIP_PUNC, '-');
      this.origR = radius;
      this.createEl(this.id,
                    radius,
                    cmpyName, // label
                    'cmpy')  // circle type
          .positionEl(x, y, radius);

      this.$circle.click(this.doClick.bind(this))
                  .hover(this.doHoverIn.bind(this),
                         this.doHoverOut.bind(this));

      this.$container.css('position', 'absolute').draggable({
        containment: 'parent',
        stop: this.doDragStop.bind(this)
      })

      this.employees = cmpyEmployees;

      this.pictures = [];
    }
  });

  NetworkGraph = function() {
    this.init();
  };

  NetworkGraph.prototype = {
    init: function() {
      this.sliderBar = new GraphSliderBar();

      $window.on('circleClick', this.fadeOtherCircles.bind(this));
    },

    renderCompanies: function(companies, cmpyNames) {
      var cmpyCircle, x, y, radius, tmpCmpys = [];

      // Hide current company circles
      currCmpys.forEach(function(cmpyCircle) {
        var employees = companies[cmpyCircle.id];
        if (employees) {
          // This circle is part of the next view. Don't hide, just resize.
          cmpyCircle.setEmployees(employees);
          tmpCmpys.push(cmpyCircle);
          companies[cmpyCircle.id] = 0; // we don't need to render this company
        }
        else {
          // This circle is not part of the next view. Hide.
          cmpyCircle.hide();
        }
      });

      // Debug
      $('#output').text("Num companies: " + Object.keys(companies).length);

      for (cmpyId in companies) {
        var cmpyEmployees = companies[cmpyId];

        if (cmpyEmployees) {
          cmpyCircle = new CompanyCircle(cmpyId, companies[cmpyId], cmpyNames[cmpyId]);
          cmpyCircles[cmpyId] = cmpyCircle;
          $viewport.append(cmpyCircle.getContainer());
          tmpCmpys.push(cmpyCircle);
        }
      }
      currCmpys = tmpCmpys;
    },

    fadeOtherCircles: function() {
      currCmpys.forEach(function(circ) {
        if (circ.id !== highlightedCirc.id) {
          if (isHighlighting) {
            circ.hide();
          }
          else {
            circ.show();
          }
        }
      });
    },

    setProfiles: function(profiles) {
      profileData = profiles;
    }
  };
})();
