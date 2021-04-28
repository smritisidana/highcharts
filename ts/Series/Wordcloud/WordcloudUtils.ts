/* *
 *
 *  Experimental Highcharts module which enables visualization of a word cloud.
 *
 *  (c) 2016-2021 Highsoft AS
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 * */

/* *
 *
 *  Imports
 *
 * */
import type WordcloudPoint from './WordcloudPoint';
import type WordcloudSeries from './WordcloudSeries';
import type PositionObject from '../../Core/Renderer/PositionObject';
import PolygonMixin from '../../Mixins/Polygon.js';
const {
    isPolygonsColliding,
    movePolygon
} = PolygonMixin;
import U from '../../Core/Utilities.js';
const {
    extend,
    find,
    isNumber,
    isObject,
    merge
} = U;

/* *
  *
  * Namespace
  *
  * */

namespace WordcloudUtils {

    /* *
     *
     * Functions
     *
     * */
    /**
     * Detects if there is a collision between two rectangles.
     *
     * @private
     * @function isRectanglesIntersecting
     *
     * @param {Highcharts.PolygonBoxObject} r1
     * First rectangle.
     *
     * @param {Highcharts.PolygonBoxObject} r2
     * Second rectangle.
     *
     * @return {boolean}
     * Returns true if the rectangles overlap.
     */
    export function isRectanglesIntersecting(
        r1: Highcharts.PolygonBoxObject,
        r2: Highcharts.PolygonBoxObject
    ): boolean {
        return !(
            r2.left > r1.right ||
            r2.right < r1.left ||
            r2.top > r1.bottom ||
            r2.bottom < r1.top
        );
    }

    /**
     * Detects if a word collides with any previously placed words.
     *
     * @private
     * @function intersectsAnyWord
     *
     * @param {Highcharts.Point} point
     * Point which the word is connected to.
     *
     * @param {Array<Highcharts.Point>} points
     * Previously placed points to check against.
     *
     * @return {boolean}
     * Returns true if there is collision.
     */
    export function intersectsAnyWord(
        point: WordcloudPoint,
        points: Array<WordcloudPoint>
    ): boolean {
        let intersects = false,
            rect: Highcharts.PolygonBoxObject = point.rect as any,
            polygon: Highcharts.PolygonObject = point.polygon as any,
            lastCollidedWith = point.lastCollidedWith,
            isIntersecting = function (p: WordcloudPoint): boolean {
                let result = isRectanglesIntersecting(rect, p.rect as any);

                if (result &&
                    ((point.rotation as any) % 90 || (p.rotation as any) % 90)
                ) {
                    result = isPolygonsColliding(
                        polygon,
                        p.polygon as any
                    );
                }
                return result;
            };

        // If the point has already intersected a different point, chances are
        // they are still intersecting. So as an enhancement we check this
        // first.
        if (lastCollidedWith) {
            intersects = isIntersecting(lastCollidedWith);
            // If they no longer intersects, remove the cache from the point.
            if (!intersects) {
                delete point.lastCollidedWith;
            }
        }

        // If not already found, then check if we can find a point that is
        // intersecting.
        if (!intersects) {
            intersects = !!find(points, function (
                p: WordcloudPoint
            ): boolean {
                let result = isIntersecting(p);

                if (result) {
                    point.lastCollidedWith = p;
                }
                return result;
            });
        }
        return intersects;
    }

    /**
     * Gives a set of cordinates for an Archimedian Spiral.
     *
     * @private
     * @function archimedeanSpiral
     *
     * @param {number} attempt
     * How far along the spiral we have traversed.
     *
     * @param {Highcharts.WordcloudSpiralParamsObject} [params]
     * Additional parameters.
     *
     * @return {boolean|Highcharts.PositionObject}
     * Resulting coordinates, x and y. False if the word should be dropped from
     * the visualization.
     */
    export function archimedeanSpiral(
        attempt: number,
        params?: WordcloudSeries.WordcloudSpiralParamsObject
    ): (boolean|PositionObject) {
        let field: WordcloudSeries.WordcloudFieldObject = (params as any).field,
            result: (boolean|PositionObject) = false,
            maxDelta = (field.width * field.width) + (field.height * field.height),
            t = attempt * 0.8; // 0.2 * 4 = 0.8. Enlarging the spiral.

        // Emergency brake. TODO make spiralling logic more foolproof.
        if (attempt <= 10000) {
            result = {
                x: t * Math.cos(t),
                y: t * Math.sin(t)
            };
            if (!(Math.min(Math.abs(result.x), Math.abs(result.y)) < maxDelta)) {
                result = false;
            }
        }
        return result;
    }

    /**
     * Gives a set of cordinates for an rectangular spiral.
     *
     * @private
     * @function squareSpiral
     *
     * @param {number} attempt
     * How far along the spiral we have traversed.
     *
     * @param {Highcharts.WordcloudSpiralParamsObject} [params]
     * Additional parameters.
     *
     * @return {boolean|Highcharts.PositionObject}
     * Resulting coordinates, x and y. False if the word should be dropped from
     * the visualization.
     */
    export function squareSpiral(
        attempt: number,
        params?: WordcloudSeries.WordcloudSpiralParamsObject
    ): (boolean|PositionObject) {
        let a = attempt * 4,
            k = Math.ceil((Math.sqrt(a) - 1) / 2),
            t = 2 * k + 1,
            m = Math.pow(t, 2),
            isBoolean = function (x: unknown): x is boolean {
                return typeof x === 'boolean';
            },
            result: (boolean|PositionObject) = false;

        t -= 1;
        if (attempt <= 10000) {
            if (isBoolean(result) && a >= m - t) {
                result = {
                    x: k - (m - a),
                    y: -k
                };
            }
            m -= t;
            if (isBoolean(result) && a >= m - t) {
                result = {
                    x: -k,
                    y: -k + (m - a)
                };
            }

            m -= t;
            if (isBoolean(result)) {
                if (a >= m - t) {
                    result = {
                        x: -k + (m - a),
                        y: k
                    };
                } else {
                    result = {
                        x: k,
                        y: k - (m - a - t)
                    };
                }
            }
            result.x *= 5;
            result.y *= 5;
        }
        return result;
    }

    /**
     * Gives a set of cordinates for an rectangular spiral.
     *
     * @private
     * @function rectangularSpiral
     *
     * @param {number} attempt
     * How far along the spiral we have traversed.
     *
     * @param {Highcharts.WordcloudSpiralParamsObject} [params]
     * Additional parameters.
     *
     * @return {boolean|Higcharts.PositionObject}
     * Resulting coordinates, x and y. False if the word should be dropped from
     * the visualization.
     */
    export function rectangularSpiral(
        attempt: number,
        params?: WordcloudSeries.WordcloudSpiralParamsObject
    ): (boolean|PositionObject) {
        let result: PositionObject = squareSpiral(attempt, params) as any,
            field: WordcloudSeries.WordcloudFieldObject = (params as any).field;

        if (result) {
            result.x *= field.ratioX;
            result.y *= field.ratioY;
        }
        return result;
    }

    /**
     * @private
     * @function getRandomPosition
     *
     * @param {number} size
     * Random factor.
     *
     * @return {number}
     * Random position.
     */
    export function getRandomPosition(size: number): number {
        return Math.round((size * (Math.random() + 0.5)) / 2);
    }

    /**
     * Calculates the proper scale to fit the cloud inside the plotting area.
     *
     * @private
     * @function getScale
     *
     * @param {number} targetWidth
     * Width of target area.
     *
     * @param {number} targetHeight
     * Height of target area.
     *
     * @param {object} field
     * The playing field.
     *
     * @param {Highcharts.Series} series
     * Series object.
     *
     * @return {number}
     * Returns the value to scale the playing field up to the size of the target
     * area.
     */
    export function getScale(
        targetWidth: number,
        targetHeight: number,
        field: Highcharts.PolygonBoxObject
    ): number {
        let height = Math.max(Math.abs(field.top), Math.abs(field.bottom)) * 2,
            width = Math.max(Math.abs(field.left), Math.abs(field.right)) * 2,
            scaleX = width > 0 ? 1 / width * targetWidth : 1,
            scaleY = height > 0 ? 1 / height * targetHeight : 1;

        return Math.min(scaleX, scaleY);
    }

    /**
     * Calculates what is called the playing field. The field is the area which
     * all the words are allowed to be positioned within. The area is
     * proportioned to match the target aspect ratio.
     *
     * @private
     * @function getPlayingField
     *
     * @param {number} targetWidth
     * Width of the target area.
     *
     * @param {number} targetHeight
     * Height of the target area.
     *
     * @param {Array<Highcharts.Point>} data
     * Array of points.
     *
     * @param {object} data.dimensions
     * The height and width of the word.
     *
     * @return {object}
     * The width and height of the playing field.
     */
    export function getPlayingField(
        targetWidth: number,
        targetHeight: number,
        data: Array<WordcloudPoint>
    ): WordcloudSeries.WordcloudFieldObject {
        let info: Record<string, number> = data.reduce(function (
                obj: Record<string, number>,
                point: WordcloudPoint
            ): Record<string, number> {
                let dimensions = point.dimensions,
                    x = Math.max(dimensions.width, dimensions.height);

                // Find largest height.
                obj.maxHeight = Math.max(obj.maxHeight, dimensions.height);
                // Find largest width.
                obj.maxWidth = Math.max(obj.maxWidth, dimensions.width);
                // Sum up the total maximum area of all the words.
                obj.area += x * x;
                return obj;
            }, {
                maxHeight: 0,
                maxWidth: 0,
                area: 0
            }),
            /**
             * Use largest width, largest height, or root of total area to give
             * size to the playing field.
             */
            x = Math.max(
                info.maxHeight, // Have enough space for the tallest word
                info.maxWidth, // Have enough space for the broadest word
                // Adjust 15% to account for close packing of words
                Math.sqrt(info.area) * 0.85
            ),
            ratioX = targetWidth > targetHeight ? targetWidth / targetHeight : 1,
            ratioY = targetHeight > targetWidth ? targetHeight / targetWidth : 1;

        return {
            width: x * ratioX,
            height: x * ratioY,
            ratioX: ratioX,
            ratioY: ratioY
        } as any;
    }


    /**
     * Calculates a number of degrees to rotate, based upon a number of
     * orientations within a range from-to.
     *
     * @private
     * @function getRotation
     *
     * @param {number} [orientations]
     * Number of orientations.
     *
     * @param {number} [index]
     * Index of point, used to decide orientation.
     *
     * @param {number} [from]
     * The smallest degree of rotation.
     *
     * @param {number} [to]
     * The largest degree of rotation.
     *
     * @return {boolean|number}
     * Returns the resulting rotation for the word. Returns false if invalid
     * input parameters.
     */
    export function getRotation(
        orientations?: number,
        index?: number,
        from?: number,
        to?: number
    ): (boolean|number) {
        let result: (boolean|number) = false, // Default to false
            range: number,
            intervals: number,
            orientation: number;

        // Check if we have valid input parameters.
        if (
            isNumber(orientations) &&
            isNumber(index) &&
            isNumber(from) &&
            isNumber(to) &&
            orientations > 0 &&
            index > -1 &&
            to > from
        ) {
            range = to - from;
            intervals = range / (orientations - 1 || 1);
            orientation = index % orientations;
            result = from + (orientation * intervals);
        }
        return result;
    }

    /**
     * Calculates the spiral positions and store them in scope for quick access.
     *
     * @private
     * @function getSpiral
     *
     * @param {Function} fn
     * The spiral function.
     *
     * @param {object} params
     * Additional parameters for the spiral.
     *
     * @return {Function}
     * Function with access to spiral positions.
     */
    export function getSpiral(
        fn: WordcloudSeries.WordcloudSpiralFunction,
        params: WordcloudSeries.WordcloudSpiralParamsObject
    ): WordcloudSeries.WordcloudSpiralFunction {
        let length = 10000,
            i: number,
            arr: Array<ReturnType<WordcloudSeries.WordcloudSpiralFunction>> = [];

        for (i = 1; i < length; i++) {
            // @todo unnecessary amount of precaclulation
            arr.push(fn(i, params));
        }

        return function (
            attempt: number
        ): ReturnType<WordcloudSeries.WordcloudSpiralFunction> {
            return attempt <= length ? arr[attempt - 1] : false;
        };
    }

    /**
     * Detects if a word is placed outside the playing field.
     *
     * @private
     * @function outsidePlayingField
     *
     * @param {Highcharts.PolygonBoxObject} rect
     * The word box.
     *
     * @param {Highcharts.WordcloudFieldObject} field
     * The width and height of the playing field.
     *
     * @return {boolean}
     * Returns true if the word is placed outside the field.
     */
    export function outsidePlayingField(
        rect: Highcharts.PolygonBoxObject,
        field: WordcloudSeries.WordcloudFieldObject
    ): boolean {
        let playingField = {
            left: -(field.width / 2),
            right: field.width / 2,
            top: -(field.height / 2),
            bottom: field.height / 2
        };

        return !(
            playingField.left < rect.left &&
            playingField.right > rect.right &&
            playingField.top < rect.top &&
            playingField.bottom > rect.bottom
        );
    }

    /**
     * Check if a point intersects with previously placed words, or if it goes
     * outside the field boundaries. If a collision, then try to adjusts the
     * position.
     *
     * @private
     * @function intersectionTesting
     *
     * @param {Highcharts.Point} point
     * Point to test for intersections.
     *
     * @param {Highcharts.WordcloudTestOptionsObject} options
     * Options object.
     *
     * @return {boolean|Highcharts.PositionObject}
     * Returns an object with how much to correct the positions. Returns false
     * if the word should not be placed at all.
     */
    export function intersectionTesting(
        point: WordcloudPoint,
        options: WordcloudSeries.WordcloudTestOptionsObject
    ): (boolean|PositionObject) {
        let placed = options.placed,
            field = options.field,
            rectangle = options.rectangle,
            polygon = options.polygon,
            spiral = options.spiral,
            attempt = 1,
            delta: PositionObject = {
                x: 0,
                y: 0
            },
            // Make a copy to update values during intersection testing.
            rect = point.rect = extend<Highcharts.PolygonBoxObject>(
                {} as any,
                rectangle
            );

        point.polygon = polygon;
        point.rotation = options.rotation;

        /* while w intersects any previously placed words:
            do {
            move w a little bit along a spiral path
            } while any part of w is outside the playing field and
                    the spiral radius is still smallish */
        while (
            (delta as any) !== false &&
            (
                intersectsAnyWord(point, placed) ||
                outsidePlayingField(rect, field)
            )
        ) {
            delta = spiral(attempt) as any;
            if (isObject(delta)) {
                // Update the DOMRect with new positions.
                rect.left = rectangle.left + delta.x;
                rect.right = rectangle.right + delta.x;
                rect.top = rectangle.top + delta.y;
                rect.bottom = rectangle.bottom + delta.y;
                point.polygon = movePolygon(delta.x, delta.y, polygon);
            }
            attempt++;
        }
        return delta;
    }

    /**
     * Extends the playing field to have enough space to fit a given word.
     *
     * @private
     * @function extendPlayingField
     *
     * @param {Highcharts.WordcloudFieldObject} field
     * The width, height and ratios of a playing field.
     *
     * @param {Highcharts.PolygonBoxObject} rectangle
     * The bounding box of the word to add space for.
     *
     * @return {Highcharts.WordcloudFieldObject}
     * Returns the extended playing field with updated height and width.
     */
    export function extendPlayingField(
        field: WordcloudSeries.WordcloudFieldObject,
        rectangle: Highcharts.PolygonBoxObject
    ): WordcloudSeries.WordcloudFieldObject {
        let height: number,
            width: number,
            ratioX: number,
            ratioY: number,
            x: number,
            extendWidth: number,
            extendHeight: number,
            result: WordcloudSeries.WordcloudFieldObject;

        if (isObject(field) && isObject(rectangle)) {
            height = (rectangle.bottom - rectangle.top);
            width = (rectangle.right - rectangle.left);
            ratioX = field.ratioX;
            ratioY = field.ratioY;

            // Use the same variable to extend both the height and width.
            x = ((width * ratioX) > (height * ratioY)) ? width : height;

            // Multiply variable with ratios to preserve aspect ratio.
            extendWidth = x * ratioX;
            extendHeight = x * ratioY;

            // Calculate the size of the new field after adding
            // space for the word.
            result = merge(field, {
                // Add space on the left and right.
                width: field.width + (extendWidth * 2),
                // Add space on the top and bottom.
                height: field.height + (extendHeight * 2)
            });
        } else {
            result = field;
        }

        // Return the new extended field.
        return result;
    }

    /**
     * If a rectangle is outside a give field, then the boundaries of the field
     * is adjusted accordingly. Modifies the field object which is passed as the
     * first parameter.
     *
     * @private
     * @function updateFieldBoundaries
     *
     * @param {Highcharts.WordcloudFieldObject} field
     * The bounding box of a playing field.
     *
     * @param {Highcharts.PolygonBoxObject} rectangle
     * The bounding box for a placed point.
     *
     * @return {Highcharts.WordcloudFieldObject}
     * Returns a modified field object.
     */
    export function updateFieldBoundaries(
        field: WordcloudSeries.WordcloudFieldObject,
        rectangle: Highcharts.PolygonBoxObject
    ): WordcloudSeries.WordcloudFieldObject {
        // @todo improve type checking.
        if (!isNumber(field.left) || field.left > rectangle.left) {
            field.left = rectangle.left;
        }
        if (!isNumber(field.right) || field.right < rectangle.right) {
            field.right = rectangle.right;
        }
        if (!isNumber(field.top) || field.top > rectangle.top) {
            field.top = rectangle.top;
        }
        if (!isNumber(field.bottom) || field.bottom < rectangle.bottom) {
            field.bottom = rectangle.bottom;
        }
        return field;
    }

}

/* *
 *
 * Default export
 *
 * */
export default WordcloudUtils;
