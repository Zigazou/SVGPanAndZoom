SVGPanAndZoom
=============

SVGPanAndZoom is a library to handle user interactions (panning and zooming) on a simple SVG document (preferably a map).

This is work in progress, so don’t expect it to be fully complete.

It aims to support mouse, keyboard and gesture user interactions.

How it works
------------

The SVGPanAndZoom library must be loaded by the SVG file.

It changes the viewBox property of the SVG tag accordingly to the user interactions in order to achieve panning and zooming operations.

It defines the SVGPAZ namespace.

The SVGPAZ.init function will connect the viewer to the document events.

Example
-------

The rouen.html and rouen.svg contains an example showing how to use the SVGPanAndZoom library

Author
------

Frédéric BISSON
zigazou@free.fr
