var GordonUtils={getData:function(d){return d&&d.values&&d.values.length?d.values:null},extend:function(d,f){for(prop in f)f.hasOwnProperty(prop)&&(d[prop]=f[prop]);return d},fadeIn:function(d){d.css("display","block");setTimeout(function(){d.css("opacity","1")},50)},fadeOut:function(d,f){f=f||500;d.css("opacity","0");setTimeout(function(){d.hide()},f)}};if(Array&&Array.prototype&&"undefined"===typeof Array.prototype.forEach)Array.prototype.forEach=function(d){var f;for(f=0;void 0>f;++f)d(this[f])};
if(Object&&"undefined"===typeof Object.keys)Object.keys=function(d){var f=0;for(key in d)d.hasOwnProperty(key)&&++f};
if(Function&&Function.prototype&&!Function.prototype.bind)Function.prototype.bind=function(d){if("function"!==typeof this)throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");var f=Array.prototype.slice.call(arguments,1),n=this,j=function(){},q=function(){return n.apply(this instanceof j?this:d||window,f.concat(Array.prototype.slice.call(arguments)))};j.prototype=this.prototype;q.prototype=new j;return q};var NetworkGraph;
(function(){var d=$(window),f=$("#viewport"),n=$("#connections"),j=$("#companyTitle"),q={},s=[],w=[],o=!1,k=!1,l,r,t,p,u,v,i;i={isInBounds:function(a,b,c){return this.xInBounds(a,c)&&this.yInBounds(b,c)},xInBounds:function(a,b){return 0<a-b&&890>a+b},yInBounds:function(a,b){return 0<a-b&&660>a+b},getRandomCenter:function(a){var b=Math.floor(890*Math.random()),c=Math.floor(660*Math.random());return i.moveAwayFromEdge(b,c,a)},isIntersecting:function(a,b){var c=a.r,e=b.r,g=2*c,h=2*e,d=a.cx-c,f=b.cx-
e,c=a.cy-c,e=b.cy-e;return d+g>=f&&d<=f+h&&c+g>=e&&c<=e+h},moveAwayFromEdge:function(a,b,c){0>=a-c?a=c:890<a+c&&(a=890-c);0>=b-c?b=c:660<b+c&&(b=660-c);return{x:a,y:b}}};p=function(){};p.prototype={createEl:function(a,b,c,e){this.r=b;this.$circle=$("<div>").addClass("circle "+e+"-circ").css({width:2*b,height:2*b});this.setBorderRadius(b);this.$label=$("<span>").addClass(e+"-label").css({top:b-8+"px",left:b-100+"px"}).text(c);this.$circle.append(this.$label);this.$container=$("<div>").addClass("circle-container "+
e+"-circ-container").attr("id","circle-"+a).append(this.$circle);return this},setBorderRadius:function(a){a*=2;this.$circle.css({"-moz-border-radius":a+"px","-ms-border-radius":a+"px","-o-border-radius":a+"px","-webkit-border-radius":a+"px","border-radius":a+"px"})},show:function(){this.$container.show();return this},hide:function(){this.$container.hide();return this},move:function(a,b,c){var e={left:a-this.r,top:b-this.r};this.cx=a;this.cy=b;this.$container.css(e);c&&setTimeout(c,500);return this},
setRadius:function(a,b){var c=2*a;"undefined"===typeof b&&(b=!0);b&&this.$container.css({left:this.cx-a,top:this.cy-a});this.$circle.css({width:c+"px",height:c+"px"});this.r=a;this.setBorderRadius(a);return this},findOpenSpace:function(a,b,c){var e=Math.PI,g=this.cx-a,h=b-this.cy,d=Math.sqrt(g*g+h*h),d=Math.asin(h/d),c=Math.max(3*c/2,30)+this.r,f=[Math.PI/2,-1*Math.PI/2,Math.PI],m;0>g&&0<h?d=e-d:0>d&&0>g&&0>h?d=e-d:this.cy===b&&0>g&&(d=e);e=a+Math.cos(d)*c;m=b+-1*Math.sin(d)*c;for(g=0,h=f.length;g<
h&&!i.isInBounds(e,m,this.r);++g){m=d+f[g++];e=a+Math.cos(m)*c;m=b+-1*Math.sin(m)*c}if(!i.isInBounds(e,m,this.r))console.log("Couldn't find a in-bounds position to jump to!"),a=i.getRandomCenter(this.r),e=a.x,m=a.y;this.move(e,m)},moveOverlapCirclesProto:function(a){var b=this,c=[];a.forEach(function(a){a!==b&&i.isIntersecting(b,a)&&c.push(a)});c.forEach(function(a){a.findOpenSpace(b.cx,b.cy,b.r)})},getContainer:function(){return this.$container}};t=function(){var a,b,c,e=function(){percent=Math.floor(100*
(c/910));d.trigger("sliderStop",percent);b&&(window.clearTimeout(b),b=null)},g=function(){b&&window.clearTimeout(b);b=setTimeout(e,100)},h=function(a,b){d.trigger("sliderStart");k&&l&&(k=!1,l.unhighlight(),d.trigger("circleClick"));c=b.position.left;g()},f=function(a,b){percent=Math.floor(100*(c/910));d.trigger("sliderDrag",percent);c=b.position.left;g()},x=function(){b&&(window.clearTimeout(b),b=null,e())};(function(){this.$el=$("#slider");a=this.$el.find("#sliderHandle");a.draggable({axis:"x",containment:"parent",
start:h,drag:f,stop:x})})()};u=function(a){this.init(a)};u.prototype=new p;GordonUtils.extend(u.prototype,{init:function(a){i.getRandomCenter(40);var b=$("<a>"),c=a.pictureUrl||"img/icon_no_photo_80x80.png",e=a.siteStandardProfileRequest?a.siteStandardProfileRequest.url:"#";this.id=a.id;this.profile=a;this.createEl(a.id,40,a.firstName+" "+a.lastName,"cxn");b.attr({href:e||"#",title:a.firstName+" "+a.lastName,target:"_new"});b.append($("<img>").addClass("cxn-picture").attr("src",c));this.$circle.append(b)},
show:function(){this.$container.css("display","inline-block")},doDrag:function(a,b){var c,e,d;if(o)d=this.el,c=this.mouseDownX+a,e=this.mouseDownY+b,this.xInBounds(c)&&d.attr({x:c}),this.yInBounds(e)&&d.attr({y:e})},doDragStart:function(){var a=this.el;this.mouseDownX=a.attr("x");this.mouseDownY=a.attr("y");o=!0;a.stop()},doDragStop:function(){o&&(this.moveOverlapCircles(),o=!1)},setCenter:function(a,b){var c=this.IMG_DIM;this.el.attr({x:a-c/2,y:b-c/2})},setImageWidth:function(a){this.$container.find("img").css({width:a,
height:a});return this},xInBounds:function(a){var b=l.el.attr("r");return 0<=a&&890>=a+this.IMG_DIM&&a+this.IMG_DIM<=445-b&&a<=445+b},yInBounds:function(a){var b=l.el.attr("r");return 0<=a&&660>=a+this.IMG_DIM&&(a+this.IMG_DIM<=330-b||a<=330+b)},moveOverlapCircles:function(){return this.moveOverlapCirclesProto.call(this,w)}});v=function(a,b,c){this.init(a,b,c)};v.prototype=new p;GordonUtils.extend(v.prototype,{calculateCmpyRadius:function(a){return Math.max(100-1E3/(a+10),10)},moveOverlapCircles:function(){return this.moveOverlapCirclesProto.call(this,
s)},setEmployees:function(a){var b=this.calculateCmpyRadius(a.length),c=this.cx,e=this.cy;this.employees=a;this.pictures=[];if(!i.isInBounds(c,e,b))a=i.moveAwayFromEdge(c,e,b),c=a.x,e=a.y;this.move(c,e);this.r!==b&&(this.setRadius(b),this.$label.css({top:b-8+"px",left:b-100+"px"}));return this},resetLabelPosition:function(){var a=this.el;this.label.attr({x:a.attr("cx"),y:a.attr("cy")-a.attr("r")-5})},doHoverIn:function(){k||(this.$container.addClass("hover"),this.$label.show(),this.moveOverlapCircles())},
doHoverOut:function(){this.$container.removeClass("hover");this.$label.hide()},doClick:function(){this.wasDragging||((k=!k)?(this.highlight(),l=this):this.unhighlight(),d.trigger("circleClick",this));this.wasDragging=!1},doDragStop:function(a,b){this.wasDragging=!0;this.cx=b.position.left+this.r;this.cy=b.position.top+this.r;this.moveOverlapCircles()},loadEmployees:function(){var a=this,b=[],c=this.employees.length;80.65625<c?(this.pictureWidth=Math.floor(9*Math.sqrt(516200/c)/10),this.pictureWidth=
Math.max(20,this.pictureWidth)):this.pictureWidth=80;this.employees.forEach(function(c){var c=r[c],d;d=q[c.id];d||(d=new u(c),q[c.id]=d,c.pictureUrl?n.append(d.getContainer()):b.push(d));d.setRadius(a.pictureWidth/2,!1).setImageWidth(a.pictureWidth);a.pictures.push(d)});b.forEach(function(a){n.append(a.getContainer())})},showEmployees:function(){var a=this.employees.length,b,c;if(this.pictures)for(b=0,c=this.pictures.length;b<c;++b)this.pictures[b].show();b=Math.floor(890/this.pictureWidth);c=Math.ceil(this.employees.length/
b);n.css({top:370-c*(this.pictureWidth+2)/2-this.pictureWidth/2,left:445-(this.pictureWidth+2)*(b>a?a:b)/2});GordonUtils.fadeIn(j)},addBackButton:function(){this.$circle.append($("<span>").addClass("backBtn").text("Back"))},removeBackButton:function(){this.$circle.children(".backBtn").remove()},highlight:function(){var a=1!==this.employees.length;this.loadEmployees();this.origCx=this.cx;this.origCy=this.cy;this.origR=this.r;this.setRadius(40,!1);this.$label.hide();j.text([this.employees.length,"connection"+
(a?"s":""),"at",this.name].join(" "));this.move(40,40,function(){this.$container.addClass("highlighted");this.showEmployees();this.addBackButton()}.bind(this))},unhighlight:function(){this.move(this.origCx,this.origCy);this.setRadius(this.origR);this.$container.removeClass("highlighted");this.removeBackButton();GordonUtils.fadeOut(j,500);this.pictures&&(this.pictures.forEach(function(a){a.hide()}),w=[]);f.removeClass("highlighting")},positionEl:function(a,b,c){this.cx=a;this.cy=b;this.$container.css({left:this.cx-
c,top:this.cy-c});return this},init:function(a,b,c){var d=this.calculateCmpyRadius(b.length),f=i.getRandomCenter(d),h=f.x,f=f.y;this.id=a.replace(/[^\w\d-_]/gi,"-");this.origR=d;this.name=c;this.createEl(this.id,d,c,"cmpy").positionEl(h,f,d);this.$circle.click(this.doClick.bind(this)).hover(this.doHoverIn.bind(this),this.doHoverOut.bind(this));this.$container.css("position","absolute").draggable({containment:"parent",stop:this.doDragStop.bind(this)});this.employees=b;this.pictures=[]}});NetworkGraph=
function(){this.init()};NetworkGraph.prototype={init:function(){this.sliderBar=new t;d.on("circleClick",this.fadeOtherCircles.bind(this))},renderCompanies:function(a,b){var c,d=[];s.forEach(function(b){var c=a[b.id];c?(b.setEmployees(c),d.push(b),a[b.id]=0):b.hide()});for(cmpyId in a)a[cmpyId]&&(c=new v(cmpyId,a[cmpyId],b[cmpyId]),f.append(c.getContainer()),d.push(c));s=d},fadeOtherCircles:function(){s.forEach(function(a){a.id!==l.id&&(k?a.hide():a.show())})},setProfiles:function(a){r=a}}})();var onLinkedInLoad,snapshotDate;
$(function(){var d,f,n,j=new NetworkGraph,q=(new Date).getTime(),s=$("#date"),w=$("#signin"),o,k,l,r,t,p,u="Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),v=function(a,b){var c;o&&(c=r+t*b/100,snapshotDate=new Date,p.postMessage({allCmpyEmployees:o,targetDate:c}))},i=function(a,b){var c,d;c=new Date(r+t*b/100);d=u[c.getMonth()];c=c.getFullYear();s.text(d+" "+c)},a=function(){var a=GordonUtils.getData(d),b=GordonUtils.getData(f),c;if(!b||!a)throw"No profile data";b.push(a);n=b;c=new Date;
a=new Worker("js/cxnWorker.js");a.addEventListener("message",function(a){if(a.data)o=a.data.companies,k=a.data.cmpyNames,l=a.data.profileObjs,r=a.data.earliestDate,t=q-r,j.setProfiles(l),console.log("Processing took "+((new Date).getTime()-c.getTime())+" milliseconds"),GordonUtils.fadeIn($("#intro2, #slider, #share"))},!1);a.postMessage({profiles:n})},b=function(a){$("#yourname").text(a.firstName);setTimeout(function(){GordonUtils.fadeIn($("#intro1"))},500)},c=function(c){var e=GordonUtils.getData(c);
if(e&&e.length)b(e[0]);else throw"Couldn't find your profile!";d=c;f&&a()},e=function(b){f=b;d&&a()},g=function(){var a="id first-name last-name positions:(start-date,end-date,company:(id,name)) picture-url educations:(school-name,start-date,end-date) site-standard-profile-request:(url)".split(" ");GordonUtils.fadeOut(w,500);$("#viewport").show();IN.API.Profile("me").fields(a).result(c);IN.API.Connections("me").fields(a).result(e)};onLinkedInLoad=function(){GordonUtils.fadeIn($("#signin, #title"));
IN.Event.on(IN,"auth",g)};(function(){$(window).bind("sliderStop",v);$(window).bind("sliderDrag",i);$(window).bind("sliderStart",function(){GordonUtils.fadeOut($(".intro"),500)});p=new Worker("js/snapshotWorker.js");p.addEventListener("message",function(a){var b=new Date;if(a=a.data?a.data.currCompanies:null)j.renderCompanies(a,k),console.log("Processing took "+(b.getTime()-snapshotDate.getTime())+" milliseconds")},!1)})()});