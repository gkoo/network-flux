var NetworkGraph;

(function() {
  var $window          = $(window),
      $viewport        = $('#viewport'),
      $cmpyTitle       = $('#companyTitle'),
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
      VIEWPORT_WIDTH   = PAPER_WIDTH - 2*VIEWPORT_PADDING,
      VIEWPORT_HEIGHT  = 660,

      VP_SHRUNK_HEIGHT = 200,

      HIGHLIGHT_RADIUS = 40,

      CXN_WINDOW_HEIGHT = VIEWPORT_HEIGHT - VP_SHRUNK_HEIGHT,

      ANIM_DURATION    = 1000,
      BIG_RADIUS       = 40, // radius threshold for always showing labels

      cmpyCircles      = {}, // all company circles created up to this point
      currCmpys        = [], // the circles currently drawn in the viewport
      isDragging       = false,
      isHighlighting   = false, // are we highlighting a circle?
      isAnimating      = false, // are we currently in the middle of an animation?
      highlightedCirc,
      profileData,
      cmpyNames,

      GraphSliderBar,
      NetworkCircle,
      ConnectionCircle,
      CompanyCircle,
      GraphUtils,
      ConnectionCollection,
      CompanyCollection;

  GraphUtils = {
    // isInBounds
    // ==========
    // Returns if the circle is in bounds.
    isInBounds: function(x, y, r) {
      return this.xInBounds(x, r) && this.yInBounds(y, r);
    },

    xInBounds: function(x, r, parent) {
      return (x - r) > 0 &&
             (x + r) < VIEWPORT_WIDTH;
    },

    yInBounds: function(y, r, parent) {
      return (y - r) > 0 &&
             (y + r) < (isHighlighting ? VP_SHRUNK_HEIGHT : VIEWPORT_HEIGHT);
    },

    // getRandomCenter
    // ===============
    // Returns random center coordinates that ensure the circle will be drawn
    // completely within the boundaries of the canvas.
    getRandomCenter: function(radius) {
      var cx = Math.floor(Math.random()*(VIEWPORT_WIDTH)),
          cy = Math.floor(Math.random()*(isHighlighting ? VP_SHRUNK_HEIGHT : VIEWPORT_HEIGHT));

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
          y2 = circ2.cy - r2;

      return ((x1 + d1 >= x2 && x1 <= x2 + d2) && // x-axis intersects.
              (y1 + d1 >= y2 && y1 <= y2 + d2)); // y-axis intersects.
    },

    moveAwayFromEdge: function(cx, cy, r) {
      var left     = cx - r,
          right    = cx + r,
          top      = cy - r,
          bottom   = cy + r,
          vpHeight = isHighlighting ? VP_SHRUNK_HEIGHT : VIEWPORT_HEIGHT;

      if (left <= 0) {
        cx = r;
      }
      else if (right > VIEWPORT_WIDTH) {
        cx = VIEWPORT_WIDTH - r;
      }
      if (top <= 0) {
        cy = r;
      }
      else if (bottom > vpHeight) {
        cy = vpHeight - r;
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
                               .css({
                                 top: (r-8) + 'px',
                                 left: (r-100) + 'px'
                               })
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

    setRadius: function(r, recenter, isCompany) {
      var diam = 2*r,
          newX,
          newY;

      if (typeof recenter === 'undefined') {
        recenter = true;
      }
      if (typeof isCompany === 'undefined') {
        isCompany = true;
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

      if (isCompany && r >= BIG_RADIUS) {
        this.$label.show();
      }
      else {
        this.$label.hide();
      }

      this.r = r;
      this.setBorderRadius(r);

      return this;
    },

    setElPosition: function(x, y, r) {
      this.cx = x;
      this.cy = y;
      this.$container.css({
        left: this.cx-r,
        top:  this.cy-r
      });
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
          angleIncrements = [pi/6, pi/4, pi/3, pi/2, 2*pi/3, 3*pi/4, 5*pi/6, pi],
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
        if (GraphUtils.isInBounds(newX, newY, this.r)) {
          break;
        }
        tmpAngle = angle - angleIncrements[i++];
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
    var $handle, timeout, left, timeoutLength = 100,

    update = function() {
      percent = left/(PAPER_WIDTH - 2*KNOB_RADIUS);
      $window.trigger('sliderStop', percent);
      if (timeout) {
        window.clearTimeout(timeout);
        timeout = null;
      }
    },

    resetTimeout = function() {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = setTimeout(update, timeoutLength);
    },

    handleDragStart = function(evt, ui) {
      $window.trigger('sliderStart');
      // If a circle is currently highlighted, reset the state.
      if (isHighlighting && highlightedCirc) {
        isHighlighting = false;
        highlightedCirc.unhighlight();
        isAnimating = true;
        $window.trigger('circleClick');
        $window.trigger('unhighlight');
      }

      left = ui.position.left;
      resetTimeout();
    },

    handleDrag = function(evt, ui) {
      percent = left/(PAPER_WIDTH - 2*KNOB_RADIUS);
      $window.trigger('sliderDrag', percent);
      left = ui.position.left;
      resetTimeout();
    },

    handleDragStop = function(evt, ui) {
      if (timeout) {
        window.clearTimeout(timeout);
        timeout = null;
        update();
      }
    },

    init = function() {
      this.$el = $('#slider');
      $handle = this.$el.find('#sliderHandle');
      $handle.draggable({
        axis:        'x',
        containment: 'parent',
        start:       handleDragStart,
        drag:        handleDrag,
        stop:        handleDragStop
      });
    };

    init();
  };

  ConnectionCircle = function(profile) {
    this.init(profile);
  };

  ConnectionCircle.prototype = new NetworkCircle();

  GordonUtils.extend(ConnectionCircle.prototype, {
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
      this.$container.css('top', this.top);
    },

    hide: function() {
      this.$container.css('top', CXN_WINDOW_HEIGHT);
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

    /**
     * prepareElPosition
     * =================
     * Calculate where the connection circle will ultimately be positioned
     * and set it up with the proper positioning.
     *
     * Assume that rowNum and colNum have already been set.
     */
    prepareElPosition: function(numPerRow, numRows) {
      var picWidth = this.r * 2;
      this.top  = this.rowNum * picWidth;
      this.left = this.colNum * picWidth;
      this.setElPosition(this.left + this.r, CXN_WINDOW_HEIGHT + this.r, this.r);
    }
  });

  CompanyCircle = function(id, cmpyEmployees, cmpyName, isSchool) {
    this.init(id, cmpyEmployees, cmpyName, isSchool);
  };

  CompanyCircle.prototype = new NetworkCircle();

  GordonUtils.extend(CompanyCircle.prototype, {
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
          opacity, point;

      this.employees = employees;

      // recheck bounds when resizing circle
      if (!GraphUtils.isInBounds(cx, cy, newRadius)) {
        point = GraphUtils.moveAwayFromEdge(cx, cy, newRadius);
        cx = point.x;
        cy = point.y;

        this.move(cx, cy);
      }

      if (this.r !== newRadius) {
        this.setRadius(newRadius);
        this.$label.css({
          top: (newRadius-8) + 'px',
          left: (newRadius-100) + 'px'
        });
        //this.setOpacity();
      }

      return this;
    },

    setOpacity: function() {
      var opacity = -1000/(this.r+10) + 110;
      opacity = Math.min(opacity, 100); // upper limit of 100
      this.$circle.css('opacity', opacity/100);
    },

    resetLabelPosition: function() {
      var el = this.el;
      this.label.attr({ 'x': el.attr('cx'), 'y': el.attr('cy') - el.attr('r') - 5 });
    },

    doHoverIn: function () {
      //if (isDragging) {
        //return;
      //}
      if (!isAnimating) {
        this.$container.addClass('hover');
        this.$label.show();
        this.moveOverlapCircles();
      }
    },

    doHoverOut: function() {
      this.$container.removeClass('hover');
      if (this.r < BIG_RADIUS) {
        this.$label.hide();
      }
    },

    doClick: function(evt) {
      var self = this;
      if (!this.wasDragging && !isAnimating) { // need to check wasDragging
                                               // because drag triggers a click too. =(
        isHighlighting = !isHighlighting;

        if (isHighlighting) {
          this.highlight();
          highlightedCirc = this;
          isAnimating = true;
          $window.trigger('loadEmployees', { employees: this.employees });

          // Only reveal connection pictures once we've resized company view
          setTimeout(function() {
            $window.trigger('showEmployees');
          }, ANIM_DURATION);
        }

        else if (this == highlightedCirc) {
          this.unhighlight();
          isAnimating = true;
          $window.trigger('unhighlight');
        }

        else {
          // clicked on a circle that wasn't highlighted
          highlightedCirc.unhighlight();
          // TODO: swich highlights;
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

    // highlight
    // =========
    // Highlights a company and shows its employees.
    highlight: function() {
      var plural = this.employees.length !== 1,
          self = this;
      //this.origCx = this.cx;
      //this.origCy = this.cy;
      //this.origR = this.r;
      //this.setRadius(HIGHLIGHT_RADIUS, false);
      this.$label.show();
      $cmpyTitle.text([this.employees.length, 'connection' + (plural ? 's' : ''), 'at', this.name].join(' '));
      //this.move(HIGHLIGHT_RADIUS, HIGHLIGHT_RADIUS, (function() {
      window.setTimeout(function() {
        self.$container.addClass('highlighted');
        //this.moveOverlapCircles();
        //self.showEmployees();
      }, ANIM_DURATION);
      //}).bind(this));
    },

    unhighlight: function() {
      // move back to original position
      //this.move(this.origCx, this.origCy);
      this.$container.removeClass('highlighted');
      GordonUtils.fadeOut($cmpyTitle, ANIM_DURATION);

      $viewport.removeClass('highlighting');
    },

    init: function(id, cmpyEmployees, cmpyName, isSchool) {
      var radius = this.calculateCmpyRadius(cmpyEmployees.length),
          coords = GraphUtils.getRandomCenter(radius),
          x      = coords.x,
          y      = coords.y,
          self   = this;

      this.id = id;
      this.origR = radius;
      this.name  = cmpyName;
      this.createEl(this.id,
                    radius,
                    cmpyName, // label
                    'cmpy')  // circle type
          .setElPosition(x, y, radius);

      this.$circle.click(this.doClick.bind(this))
                  .hover(this.doHoverIn.bind(this),
                         this.doHoverOut.bind(this));

      // Weird. I think jQuery sets position to relative, when specifying
      // top and left, so need to explicitly set position: absolute.
      this.$container.addClass(isSchool ? 'school' : '')
                     .css('position', 'absolute')
                     .draggable({
                       containment: 'parent',
                       stop: this.doDragStop.bind(this)
                     });

      //this.setOpacity();

      if (radius >= BIG_RADIUS) {
        this.$label.show();
      }

      this.employees = cmpyEmployees;

      this.pictures = [];
    }
  });

  CompanyCollection = function() {
    this.init();
  };

  CompanyCollection.prototype = {
    $viewport: $('#companies'),

    /**
     * add
     * ===
     * Creates a company circle object and adds it to the collection.
     */
    add: function(id, employees, cmpyName, isSchool) {
      // TODO: FINISH THIS
      var cmpyCircle = new CompanyCircle(id, employees, cmpyName, isSchool);
      this.renderCompany(cmpyCircle);
      return cmpyCircle;
    },

    renderCompany: function(cmpyCircle) {
      this.$viewport.append(cmpyCircle.getContainer());
    },

    showRemainingCompanies: function(cmpysToShow, isSchool, tmpCmpys) {
      var employees;
      for (id in cmpysToShow) {
        employees = cmpysToShow[id];

        if (employees) {
          cmpyCircle = cmpyCircles[id];
          if (cmpyCircle) {
            cmpyCircle.setEmployees(employees)
                      .show();
          }
          else {
            cmpyCircle = this.add(id, cmpysToShow[id], cmpyNames[id], isSchool);
            cmpyCircles[id] = cmpyCircle;
          }
          tmpCmpys.push(cmpyCircle);
        }
      }
    },

    renderCompanies: function(companies, schools) {
      var cmpyCircle, x, y, radius, cmpyEmployees, tmpCmpys;

      if (isAnimating) {
        // wait for animation to finish, then render.
        this.cmpysToRender = {
          companies: companies,
          schools: schools
        }
        return;
      }

      tmpCmpys = []; // placeholder for currCmpys

      // Loop through the currently displayed companies and hide them unless
      // they are part of the next view.
      currCmpys.forEach(function(cmpyCircle) {
        var employees = companies[cmpyCircle.id],
            schoolmates = schools[cmpyCircle.id];

        if (employees) {
          // This circle is part of the next view. Don't hide, just resize.
          cmpyCircle.setEmployees(employees);
          tmpCmpys.push(cmpyCircle);
          companies[cmpyCircle.id] = 0; // we don't need to render this company
        }
        else if (schoolmates) {
          // This circle is part of the next view. Don't hide, just resize.
          cmpyCircle.setEmployees(schoolmates);
          tmpCmpys.push(cmpyCircle);
          companies[cmpyCircle.id] = 0; // we don't need to render this company
        }
        else {
          // This circle is not part of the next view. Hide.
          cmpyCircle.hide();
        }
      });

      // Render or unhide the companies that weren't part of the previous view.
      this.showRemainingCompanies(companies, false, tmpCmpys);
      this.showRemainingCompanies(schools, true, tmpCmpys);

      currCmpys = tmpCmpys;
    },

    resizeArea: function() {
      var viewportHeight = isHighlighting ? VP_SHRUNK_HEIGHT : VIEWPORT_HEIGHT;

      this.$viewport.css('height', viewportHeight + 'px');

      currCmpys.forEach(function(cmpyCirc) {
        var top, yRatio, newX, newY;

        if (isHighlighting) {
          cmpyCirc.origCx = cmpyCirc.cx;
          cmpyCirc.origCy = cmpyCirc.cy;
          top    = cmpyCirc.cy - cmpyCirc.r;
          yRatio = top / VIEWPORT_HEIGHT;
          newX   = cmpyCirc.cx;
          newY   = VP_SHRUNK_HEIGHT * yRatio + cmpyCirc.r;

          if (newY + cmpyCirc.r >= VP_SHRUNK_HEIGHT) {
            newY = VP_SHRUNK_HEIGHT - cmpyCirc.r;
          }
        }
        else { // not highlighting; restore to full size.
          newX = cmpyCirc.origCx;
          newY = cmpyCirc.origCy;
        }

        cmpyCirc.setElPosition(newX, newY, cmpyCirc.r);
      });
    },

    // Wrapper just used to check if we should wait for animation to complete first.
    resizeAreaWrapper: function() {
      if (isHighlighting) {
        this.resizeArea();
      }
      else {
        setTimeout(this.resizeArea.bind(this), ANIM_DURATION);
        setTimeout(function() {
          isAnimating = false;
          $window.trigger('animComplete');
        }, ANIM_DURATION);
      }
    },

    init: function() {
      var self = this;
      this.$el = $('#companies');
      $window.on('circleClick', this.resizeAreaWrapper.bind(this));
      $window.on('animComplete', function () {
        if (self.cmpysToRender) {
          self.renderCompanies(self.cmpysToRender.companies, self.cmpysToRender.schools);
          self.cmpysToRender = null;
        }
      });
    }
  };

  ConnectionViewport = function() {
    this.init();
  };

  ConnectionViewport.prototype = {
    init: function() {
      this.$el = $('#connections');
      $window.on('loadEmployees', this.loadEmployees.bind(this));
      $window.on('showEmployees', this.showEmployees.bind(this));
      $window.on('unhighlight', this.hideEmployees.bind(this));
    },

    pictureWidth: 80,

    circles: {}, // hash of all cxn circles ever created. EVER. =)

    currCxns: [], // array of currently displayed connections.

    loadEmployees: function(evt, data) {
      var noPictureProfiles = [], // array of circles without pictureUrl's
          employees         = data.employees,
          numEmployees      = employees.length,
          cxnWindowArea     = VIEWPORT_WIDTH*CXN_WINDOW_HEIGHT,
          i, len, empId, profile, cxnCircle, rowNum, colNum, numPerRow, numRows;

      if (cxnWindowArea/(80*80) < numEmployees) {
        // fit pictures to connections box.
        this.pictureWidth = Math.floor(Math.sqrt(VIEWPORT_WIDTH*CXN_WINDOW_HEIGHT/numEmployees)*9/10);
        // set minimum image width to 30
        this.pictureWidth = Math.max(30, this.pictureWidth);
      }
      else {
        this.pictureWidth = 80;
      }

      numPerRow = Math.floor(VIEWPORT_WIDTH / this.pictureWidth);
      numRows   = ((employees.length - 1) / numPerRow) + 1;

      for (i = 0, len = employees.length; i < len; ++i) {
        empId = employees[i];
        profile = profileData[empId];
        cxnCircle = this.circles[profile.id];
        rowNum = Math.floor(i / numPerRow);
        colNum = i % numPerRow;

        // Create the circle if it doesn't exist yet.
        if (!cxnCircle) {
          cxnCircle = new ConnectionCircle(profile);
          this.circles[profile.id] = cxnCircle;

          //if (profile.pictureUrl) {
            this.$el.append(cxnCircle.getContainer());
          //}
          //else {
            //noPictureProfiles.push(cxnCircle);
          //}
        }
        // Set up positioning info.
        cxnCircle.rowNum = rowNum;
        cxnCircle.colNum = colNum;
        cxnCircle.setRadius(this.pictureWidth/2, false, false)
                 .setImageWidth(this.pictureWidth)
                 .prepareElPosition(numPerRow, numRows);
        this.currCxns.push(cxnCircle);
      }

      // Add pictures with no profiles to DOM last.
      //noPictureProfiles.forEach(function(circ) {
        //$connections.append(circ.getContainer());
      //});
    },

    showEmployees: function() {
      var self = this;
      this.$el.addClass('show');
      setTimeout(function() {
        self.currCxns.forEach(function(cxnCirc) {
          cxnCirc.show();
        });
      }, 50);
      setTimeout(function() {
        isAnimating = false;
        $window.trigger('animComplete');
      }, ANIM_DURATION);
    },

    hideEmployees: function() {
      var self = this;
      this.currCxns.forEach(function(cxnCirc) {
        cxnCirc.hide();
      });
      setTimeout(function() {
        self.$el.removeClass('show');
      }, ANIM_DURATION);
    }
  };

  NetworkGraph = function() {
    this.init();
  };

  NetworkGraph.prototype = {
    init: function() {
      this.sliderBar      = new GraphSliderBar();
      this.cmpyCollection = new CompanyCollection();
      this.cxnViewport    = new ConnectionViewport();

      //$window.on('circleClick', this.fadeOtherCircles.bind(this));
    },

    setCompanies: function(companies, schools) {
      this.cmpyCollection.renderCompanies(companies, schools);
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

    setData: function(o) {
      profileData = o.profiles || null;
      cmpyNames = o.cmpyNames || null;
    }
  };
})();
