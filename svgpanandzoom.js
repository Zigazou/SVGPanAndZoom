/**
 * @fileoverview SVGPanAndZoom is a library to handle user interactions
 * (panning and zooming) on a simple SVG document (preferably a map).
 * @author zigazou@free.fr (Frédéric Bisson)
 * @version 0.1.0
 */

var SVGPAZ = {};

/**
 * Returns a callback on an object method.
 * 
 * The returned function will allow the method to keep track of its object
 * through the this special variable.
 *
 * @param {Object} object The method’s object
 * @param {Function} method The method
 * @return {Function} a function which will correctly the method
 * @example
 * var myObject = new Object();
 * myObject.message = 'Hello world !';
 * myObject.loadHandler = function(event) {
 *     alert(this.message);
 * }
 * document.addEventListener('load', handler(myObject, myObject.loadHandler));
 */
SVGPAZ.handler = function(object, method) {
    'use strict';

    var temporaryFunction = function() {
        // arguments is a special variable containing all the arguments sent
        // to the function.
        method.apply(object, arguments);
    };

    return temporaryFunction;
}

/**
 * Viewer class is able to pan and zoom a complete SVG document using the
 * viewBox attribute.
 *
 * @class Viewer
 * @param elt {DOMElement} the SVG document to manipulate
 * @param width {number} width of the SVG document
 * @param height {number} height of the SVG document
 * @constructor
 */
SVGPAZ.Viewer = function(elt, width, height) {
    'use strict';

    /**
     * Maximum width of the SVG map.
     * @type {number}
     */
    this.maxWidth = width;

    /**
     * Maximum height of the SVG map.
     * @type {number}
     */
    this.maxHeight = height;

    /**
     * Current center X coordinate. Changes to this value must be followed by
     * a call to the redraw method otherwise the changes won’t be visible.
     * @type {number}
     */
    this.centerX = this.maxWidth / 2;

    /**
     * Current center Y coordinate. Changes to this value must be followed by
     * a call to the redraw method otherwise the changes won’t be visible.
     * @type {number}
     */
    this.centerY = this.maxHeight / 2;

    /**
     * Current zoom level. Changes to this value must be followed by
     * a call to the redraw method otherwise the changes won’t be visible.
     * @type {number}
     */
    this.zoom = 1;

    /**
     * divider is an helper property. It is equal to 2^(zoom-1)
     * @type {number}
     */
    this.divider = 1;

    /**
     * SVG document the viewer manipulates.
     * @type {DOMElement}
     */
    this.doc = elt;

    /**
     * Determine how many units of the SVG document occupies 1 pixel in the
     * document (HTML) which contains the SVG document.
     * @type {number}
     */
    this.containerRatio = this.maxWidth /
                          document.defaultView.frameElement.offsetWidth;
}

/**
 * Pan a complete SVG document.
 *
 * @class Viewer
 * @method Viewer.prototype.panningSet
 * @param {Number} deltaX number of screen units to add or remove from the
 *     current X position
 * @param {Number} deltaY number of screen units to add or remove from the
 *     current Y position
 */
SVGPAZ.Viewer.prototype.panningSet = function(deltaX, deltaY) {
    'use strict';

    // The deltas are given in screen units, not in SVG units, so converts
    // them !
    this.centerX += deltaX * this.containerRatio / this.divider;
    this.centerY += deltaY * this.containerRatio / this.divider;
    this.redraw();
};

/**
 * Zoom in or out of a complete SVG document.
 *
 * @method Viewer.prototype.zoomSet
 * @param {Number} delta number of units to add or remove from the current
 *     zoom level
 */
SVGPAZ.Viewer.prototype.zoomSet = function(delta) {
    'use strict';

    this.zoom = Math.min(10, Math.max(1, this.zoom + delta));

    // Convert zoom level into exponential scale
    this.divider = Math.pow(2, this.zoom - 1);

    this.redraw();
};

/**
 * Make the SVG document take into account any changes made to the viewBox
 * parameters.
 *
 * @method Viewer.prototype.redraw
 */
SVGPAZ.Viewer.prototype.redraw = function() {
    'use strict';

    // A viewBox is a rectangle specified by its top-left coordinates and
    // its dimensions
    var viewWidth = this.maxWidth / this.divider;
    var viewHeight = this.maxHeight / this.divider;
    var topX = this.centerX - viewWidth / 2;
    var topY = this.centerY - viewHeight / 2;

    var viewBox = topX + ' ' + topY + ' ' + viewWidth + ' ' + viewHeight;

    this.doc.setAttribute('viewBox', viewBox);
};

/**
 * Define handlers for mouse interactions
 *
 * @class MouseHandler
 * @constructor
 * @param panCallback {function} the function to call when a panning action is
 *     requested.
 * @param zoomCallback {function} the function to call when a zooming action is
 *     requested.
 */
SVGPAZ.MouseHandler = function(panCallback, zoomCallback) {
    'use strict';

    /**
     * Indicates if a dragging operations is occuring (the left mouse button
     * has been pressed but not released).
     * @type {boolean}
     */
    this.dragging = false;

    /**
     * Last X position of the mouse.
     * @type {number}
     */
    this.originX = 0;

    /**
     * Last Y position of the mouse.
     * @type {number}
     */
    this.originY = 0;

    /**
     * Function to call for panning actions.
     * @type {function}
     */
    this.panCallback = panCallback;

    /**
     * Function to call for zooming actions.
     * @type {function}
     */
    this.zoomCallback = zoomCallback;
}

/**
 * Add event listeners to document
 *
 * @method MouseHandler.prototype.redraw
 * @param {Object} elt Element to which add the listeners
 */
SVGPAZ.MouseHandler.prototype.listenOn = function(elt) {
    'use strict';

    // Create two handlers for mouse wheel movement because of the browsers
    // support for this functionnality
    elt.addEventListener(
		'mousewheel',
		SVGPAZ.handler(this, this.wheelHandler)
	);

    elt.addEventListener(
		'DOMMouseScroll',
		SVGPAZ.handler(this, this.wheelHandler)
	);

    // Create handlers for mouse movements
    elt.addEventListener(
		'mouseup',
		SVGPAZ.handler(this, this.mouseUpHandler)
	);

    elt.addEventListener(
		'mousedown',
		SVGPAZ.handler(this, this.mouseDownHandler)
	);

    elt.addEventListener(
		'mousemove',
		SVGPAZ.handler(this, this.mouseMoveHandler)
	);
};

/**
 * Normalize mouse wheel values. There are lots of differences between browsers
 * even from the same name or version ! This method returns a normalized value
 * between -2 and 2 included. The normalization method used here is from the
 * "Normalizing mousehweel speed across browsers" post, answer 13650579. It
 * has been rewritten for better readability.
 * 
 * @see http://stackoverflow.com/questions/5527601/normalizing-mousewheel-spee
 * d-across-browsers/13650579#13650579
 * @method MouseHandler.prototype.normalizeWheelDelta
 * @param {Event} event The event from which data will be retrieved
 * @return {Number} the delta between -2 and 2
 */
SVGPAZ.MouseHandler.prototype.normalizeWheelDelta = function(event) {
    'use strict';

    // Equalize event object
    event = window.event || event;

    var detail = event.detail,
        wheelDelta = event.wheelDelta,
        n = 225,
        n1 = n - 1;

    var delta;

    // Normalize delta
    if(detail) {
        var f;

        if(wheelDelta && (f = wheelDelta / detail)) {
            delta = detail / f;
        } else {
            delta = -detail / 1.35;
        }
    } else {
        delta = wheelDelta / 120;
    }

    // Quadratic scale if |delta| > 1
    if(delta < 1) {
        if(delta < -1) {
            delta = (-Math.pow(delta, 2) - n1) / n;
        }
    } else {
        delta = (Math.pow(delta, 2) + n1) / n;
    }

    // Delta must be in [-2..2]
    delta = Math.min(Math.max(delta / 2, -1), 1);

    return delta;
};

/**
 * Mouse wheel event handler
 *
 * @method MouseHandler.prototype.wheelHandler
 * @param {Event} event The Event object
 */
SVGPAZ.MouseHandler.prototype.wheelHandler = function(event) {
    'use strict';

    var delta = this.normalizeWheelDelta(event);
    this.zoomCallback(delta);
};

/**
 * Mouse button up event handler
 *
 * @method MouseHandler.prototype.mouseUpHandler
 * @param {Event} event The Event object
 */
SVGPAZ.MouseHandler.prototype.mouseUpHandler = function(event) {
    'use strict';

    event.preventDefault();
    this.dragging = false;
};

/**
 * Mouse button down event handler
 *
 * @method MouseHandler.prototype.mouseDownHandler
 * @param {Event} event The Event object
 */
SVGPAZ.MouseHandler.prototype.mouseDownHandler = function(event) {
    'use strict';

    event.preventDefault();

    // If the user clicks on a point, a drag operation is being initiated
    this.dragging = true;

    // Keeps the coordinates of the action for further computations
    this.originX = event.clientX;
    this.originY = event.clientY;
};

/**
 * Mouse move event handler
 *
 * @method MouseHandler.prototype.mouseMoveHandler
 * @param {Event} event The Event object
 */
SVGPAZ.MouseHandler.prototype.mouseMoveHandler = function(event) {
    'use strict';

    // Tests if the user has started a drag operation
    if(this.dragging) {
        event.preventDefault();

        // Move the viewBox according to the mouse move
        this.panCallback(
            (this.originX - event.clientX),
            (this.originY - event.clientY)
        );

        // Keeps the coordinates of the action for further computations
        this.originX = event.clientX;
        this.originY = event.clientY;
    }
};

/**
 * Define handlers for keyboard interactions
 *
 * @class KeyboardHandler manages keyboard inputs and transforms them into
 *     panning or zooming actions.
 * @constructor
 * @param panCallback {function} the function to call when a panning action is
 *     requested.
 * @param zoomCallback {function} the function to call when a zooming action is
 *     requested.
 */
SVGPAZ.KeyboardHandler = function(panCallback, zoomCallback) {
    'use strict';

    /**
     * Function to call for panning actions.
     * @type {function}
     */
    this.panCallback = panCallback;

    /**
     * Function to call for zooming actions.
     * @type {function}
     */
    this.zoomCallback = zoomCallback;
}

/**
 * Add event listeners to document
 *
 * @method KeyboardHandler.prototype.listenOn
 * @param {Object} elt Element to which add the listeners
 */
SVGPAZ.KeyboardHandler.prototype.listenOn = function(elt) {
    'use strict';

    elt.addEventListener(
		'keydown',
		SVGPAZ.handler(this, this.keydownHandler)
	);
};

/**
 * KeyDown event handler.
 *
 * @method KeyboardHandler.prototype.keydownHandler
 * @param {Event} event The Event object
 */
SVGPAZ.KeyboardHandler.prototype.keydownHandler = function(event) {
    'use strict';

    var charCode = event.which ? event.which : event.keyCode;

    switch(charCode) {
        case 107: // + key, zoom in
            this.zoomCallback(1);
            break;

        case 109: // - key, zoom out
            this.zoomCallback(-1);
            break;

        case 39: // → key, move to the right of the document
            this.panCallback(10, 0);
            break;

        case 37: // ← key, move to the left of the document
            this.panCallback(-10, 0);
            break;

        case 38: // ↑ key, move to the top of the document
            this.panCallback(0, -10);
            break;

        case 40: // ↓ key, move to the bottom of the document
            this.panCallback(0, 10);
            break;

        default:
            return;
    }
};

/**
 * Define handlers for gesture interactions
 *
 * @class TouchHandler manages gesture inputs and transforms them into panning
 *     or zooming actions.
 * @param panCallback {function} the function to call when a panning action is
 *     requested.
 * @param zoomCallback {function} the function to call when a zooming action is
 *     requested.
 * @constructor
 */
SVGPAZ.TouchHandler = function(panCallback, zoomCallback) {
    'use strict';

    /**
     * Mode keeps track of how many fingers currently are touching the screen.
     * It currently supports only 1-finger mode for panning and 2-fingers
     * mode for zooming. 0, 1 and 2 are the only valid values. 0 means there
     * is no finger or there are more than 2 fingers, which the TouchHandler
     * class will ignore.
     * @type {number}
     */
    this.mode = 0;

    /**
     * Keeps up to 2 fingers information given by a gesture event.
     * @type {Array[]}
     */
    this.fingers = new Array(null, null);

    /**
     * Function to call for panning actions.
     * @type {function}
     */
    this.panCallback = panCallback;

    /**
     * Function to call for zooming actions.
     * @type {function}
     */
    this.zoomCallback = zoomCallback;
}

/**
 * Add event listeners to document
 *
 * @method TouchHandler.prototype.listenOn
 * @param {Object} elt Element to which add the listeners
 */
SVGPAZ.TouchHandler.prototype.listenOn = function(elt) {
    'use strict';

    elt.addEventListener(
		'touchstart',
		SVGPAZ.handler(this, this.touchStartHandler)
	);

    elt.addEventListener(
		'touchmove',
		SVGPAZ.handler(this, this.touchMoveHandler)
	);

    elt.addEventListener(
		'touchend',
		SVGPAZ.handler(this, this.touchEndHandler)
	);
};

/**
 * Handles touch start event.
 *
 * @method TouchHandler.prototype.touchStartHandler
 * @param {Event} event The Event object
 */
SVGPAZ.TouchHandler.prototype.touchStartHandler = function(event) {
    'use strict';

    this.mode = event.touches.length;

    // The mode property can only have 0, 1 or 2 as value.
    if(this.mode !== 1 && this.mode !== 2) {
        this.mode = 0;
        return;
    }

    // Keeps track of the current fingers positions
    for(var i = 0; i < this.mode; i++) {
        this.fingers[i] = event.touches[i];
    }
};

/**
 * Handles touch move event.
 *
 * @method TouchHandler.prototype.touchMoveHandler
 * @param {Event} event The Event object
 */
SVGPAZ.TouchHandler.prototype.touchMoveHandler = function(event) {
    'use strict';

    // 1-finger mode = panning
    if(this.mode === 1) {
        event.preventDefault();

        this.panCallback(
            this.fingers[0].pageX - event.touches[0].pageX,
            this.fingers[0].pageY - event.touches[0].pageY
        );

        // Keeps track of the current finger positions
        this.fingers[0] = event.touches[0];

        return;
    }

    // 2-fingers mode = zooming
    if(this.mode === 2) {
        event.preventDefault();

        // Determines distance between the previous fingers positions
        var previousDistance = Math.sqrt(
            Math.pow(this.fingers[0].pageX - this.fingers[1].pageX, 2) +
            Math.pow(this.fingers[0].pageY - this.fingers[1].pageY, 2)
        );

        // Determines distance between the current fingers positions
        var currentDistance = Math.sqrt(
            Math.pow(event.touches[0].pageX - event.touches[1].pageX, 2) +
            Math.pow(event.touches[0].pageY - event.touches[1].pageY, 2)
        );

        var distance = (currentDistance - previousDistance) / 100;

        this.zoomCallback(distance);

        // Keeps track of the current fingers positions
        this.fingers[0] = event.touches[0];
        this.fingers[1] = event.touches[1];

        return;
    }
};

/**
 * Handles touch end event.
 *
 * @method TouchHandler.prototype.touchEndHandler
 * @param {Event} event The Event object
 */
SVGPAZ.TouchHandler.prototype.touchEndHandler =
    SVGPAZ.TouchHandler.prototype.touchStartHandler;

/**
 * Handles document load event. This function should be called automatically
 * on load of the document in order to install each necessary handler.
 *
 * @param {Viewer} viewer The Viewer
 */
SVGPAZ.init = function(viewer) {
    'use strict';

    // Create the panning and zooming callback
    var panCallback = SVGPAZ.handler(viewer, viewer.panningSet);
    var zoomCallback = SVGPAZ.handler(viewer, viewer.zoomSet);

    // Create the handlers based on the callback
    var handlers = {
        mouse: new SVGPAZ.MouseHandler(panCallback, zoomCallback),
        keyboard: new SVGPAZ.KeyboardHandler(panCallback, zoomCallback),
        touch: new SVGPAZ.TouchHandler(panCallback, zoomCallback)
    };

    // Activate the handlers
    handlers.keyboard.listenOn(document);
    handlers.mouse.listenOn(document);
    handlers.touch.listenOn(document);
}
