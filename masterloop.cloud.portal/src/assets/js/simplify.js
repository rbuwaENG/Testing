/*
 (c) 2013, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

(function () { "use strict";

// to suit your point format, run search/replace for '.x' and '.y';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

// square distance between 2 points
function getSqDist(p1, p2) {

    // Commented to support GPS locations
    // var dx = p1.x - p2.x,
    //     dy = p1.y - p2.y;
    var dx = p1.Value.Longitude - p2.Value.Longitude,
        dy = p1.Value.Latitude - p2.Value.Latitude;

    return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {

    var x = p1.x,
        y = p1.y,
        dx = p2.x - x,
        dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}

// square distance from a point to a segment for GPS
function getSqSegDistGPS(p, p1, p2) {

    var x = p1.Value.Longitude,
        y = p1.Value.Latitude,
        dx = p2.Value.Longitude - x,
        dy = p2.Value.Latitude - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p.Value.Longitude - x) * dx + (p.Value.Latitude - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.Value.Longitude;
            y = p2.Value.Latitude;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.Value.Longitude - x;
    dy = p.Value.Latitude - y;

    return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points, sqTolerance) {

    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) {
        newPoints.push(point);
    }

    return newPoints;
}

// simplification using optimized Douglas-Peucker algorithm with recursion elimination
function simplifyDouglasPeucker(points, sqTolerance) {

    var len = points.length,
        MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array : Array,
        markers = new MarkerArray(len),
        first = 0,
        last = len - 1,
        stack = [],
        newPoints = [],
        i, maxSqDist, sqDist, index;

    markers[first] = markers[last] = 1;

    while (last) {

        maxSqDist = 0;

        for (i = first + 1; i < last; i++) {
            //sqDist = getSqSegDist(points[i], points[first], points[last]);
            sqDist = getSqSegDistGPS(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;
            stack.push(first, index, index, last);
        }

        last = stack.pop();
        first = stack.pop();
    }

    for (i = 0; i < len; i++) {
        if (markers[i]) {
            newPoints.push(points[i]);
        }
    }

    return newPoints;
}

// both algorithms combined for awesome performance
function simplify(points, tolerance, highestQuality) {
    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
}

// export as AMD module / Node module / browser variable
if (typeof define === 'function' && define.amd) {
    define(function() {
        return simplify;
    });
} else if (typeof module !== 'undefined') {
    module.exports = simplify;
} else {
    window.simplify = simplify;
}

})();
