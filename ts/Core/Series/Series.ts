/* *
 *
 *  (c) 2010-2021 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type AnimationOptions from '../Animation/AnimationOptions';
import type Axis from '../Axis/Axis';
import type AxisType from '../Axis/AxisType';
import type Chart from '../Chart/Chart';
import type ColorType from '../Color/ColorType';
import type DataExtremesObject from './DataExtremesObject';
import type { EventCallback } from '../Callback';
import type PointerEvent from '../PointerEvent';
import type {
    PointOptions,
    PointShortOptions,
    PointStateHoverOptions
} from './PointOptions';
import type RangeSelector from '../../Extensions/RangeSelector';
import type SeriesLike from './SeriesLike';
import type {
    SeriesDataSortingOptions,
    SeriesOptions,
    SeriesStateHoverOptions,
    SeriesZonesOptions
} from './SeriesOptions';
import type {
    SeriesTypeOptions,
    SeriesTypePlotOptions
} from './SeriesType';
import type { StatesOptionsKey } from './StatesOptions';
import type SVGAttributes from '../Renderer/SVG/SVGAttributes';
import type SVGPath from '../Renderer/SVG/SVGPath';
import type { SymbolKey } from '../Renderer/SVG/SymbolType';
import type TooltipOptions from '../TooltipOptions';

import A from '../Animation/AnimationUtilities.js';
const {
    animObject,
    setAnimation
} = A;
import F from '../Foundation.js';
const {
    registerEventOptions
} = F;
import H from '../Globals.js';
const {
    hasTouch,
    svg,
    win
} = H;
import LegendSymbolMixin from '../../Mixins/LegendSymbol.js';
import D from '../DefaultOptions.js';
const { defaultOptions } = D;
import palette from '../Color/Palette.js';
import Point from './Point.js';
import SeriesRegistry from './SeriesRegistry.js';
const { seriesTypes } = SeriesRegistry;
import SVGElement from '../Renderer/SVG/SVGElement.js';
import U from '../Utilities.js';
const {
    addEvent,
    arrayMax,
    arrayMin,
    clamp,
    cleanRecursively,
    correctFloat,
    defined,
    erase,
    error,
    extend,
    find,
    fireEvent,
    getNestedProperty,
    isArray,
    isNumber,
    isString,
    merge,
    objectEach,
    pick,
    removeEvent,
    splat,
    syncTimeout
} = U;

/* *
 *
 *  Declarations
 *
 * */

declare module '../Chart/ChartLike'{
    interface ChartLike {
        runTrackerClick?: boolean;
    }
}

declare module '../Renderer/SVG/SVGElementLike' {
    interface SVGElementLike {
        survive?: boolean;
    }
}

declare module './SeriesLike' {
    interface SeriesLike {
        _hasPointMarkers?: boolean;
        invertible?: boolean;
        pointArrayMap?: Array<string>;
        pointValKey?: string;
    }
}

/**
 * @private
 */
interface KDNode {
    [side: string]: (KDNode|Point|undefined);
    left?: KDNode;
    point: Point;
    right?: KDNode;
}

/**
 * @private
 */
interface KDPointSearchObject {
    clientX: number;
    plotY?: number;
}

/* *
 *
 *  Class
 *
 * */

/**
 * This is the base series prototype that all other series types inherit from.
 * A new series is initialized either through the
 * [series](https://api.highcharts.com/highcharts/series)
 * option structure, or after the chart is initialized, through
 * {@link Highcharts.Chart#addSeries}.
 *
 * The object can be accessed in a number of ways. All series and point event
 * handlers give a reference to the `series` object. The chart object has a
 * {@link Highcharts.Chart#series|series} property that is a collection of all
 * the chart's series. The point objects and axis objects also have the same
 * reference.
 *
 * Another way to reference the series programmatically is by `id`. Add an id
 * in the series configuration options, and get the series object by
 * {@link Highcharts.Chart#get}.
 *
 * Configuration options for the series are given in three levels. Options for
 * all series in a chart are given in the
 * [plotOptions.series](https://api.highcharts.com/highcharts/plotOptions.series)
 * object. Then options for all series of a specific type
 * are given in the plotOptions of that type, for example `plotOptions.line`.
 * Next, options for one single series are given in the series array, or as
 * arguments to `chart.addSeries`.
 *
 * The data in the series is stored in various arrays.
 *
 * - First, `series.options.data` contains all the original config options for
 *   each point whether added by options or methods like `series.addPoint`.
 *
 * - Next, `series.data` contains those values converted to points, but in case
 *   the series data length exceeds the `cropThreshold`, or if the data is
 *   grouped, `series.data` doesn't contain all the points. It only contains the
 *   points that have been created on demand.
 *
 * - Then there's `series.points` that contains all currently visible point
 *   objects. In case of cropping, the cropped-away points are not part of this
 *   array. The `series.points` array starts at `series.cropStart` compared to
 *   `series.data` and `series.options.data`. If however the series data is
 *   grouped, these can't be correlated one to one.
 *
 * - `series.xData` and `series.processedXData` contain clean x values,
 *   equivalent to `series.data` and `series.points`.
 *
 * - `series.yData` and `series.processedYData` contain clean y values,
 *   equivalent to `series.data` and `series.points`.
 *
 * @class
 * @name Highcharts.Series
 *
 * @param {Highcharts.Chart} chart
 * The chart instance.
 *
 * @param {Highcharts.SeriesOptionsType|object} options
 * The series options.
 */
class Series {

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * General options for all series types.
     *
     * @optionparent plotOptions.series
     */
    public static defaultOptions: SeriesOptions = {
        // base series options

        /**
         * The SVG value used for the `stroke-linecap` and `stroke-linejoin`
         * of a line graph. Round means that lines are rounded in the ends and
         * bends.
         *
         * @type       {Highcharts.SeriesLinecapValue}
         * @default    round
         * @since      3.0.7
         * @apioption  plotOptions.line.linecap
         */

        /**
         * Pixel width of the graph line.
         *
         * @see In styled mode, the line stroke-width can be set with the
         *      `.highcharts-graph` class name.
         *
         * @sample {highcharts} highcharts/plotoptions/series-linewidth-general/
         *         On all series
         * @sample {highcharts} highcharts/plotoptions/series-linewidth-specific/
         *         On one single series
         *
         * @product highcharts highstock
         *
         * @private
         */
        lineWidth: 2,

        /**
         * For some series, there is a limit that shuts down initial animation
         * by default when the total number of points in the chart is too high.
         * For example, for a column chart and its derivatives, animation does
         * not run if there is more than 250 points totally. To disable this
         * cap, set `animationLimit` to `Infinity`.
         *
         * @type      {number}
         * @apioption plotOptions.series.animationLimit
         */

        /**
         * Allow this series' points to be selected by clicking on the graphic
         * (columns, point markers, pie slices, map areas etc).
         *
         * The selected points can be handled by point select and unselect
         * events, or collectively by the [getSelectedPoints
         * ](/class-reference/Highcharts.Chart#getSelectedPoints) function.
         *
         * And alternative way of selecting points is through dragging.
         *
         * @sample {highcharts} highcharts/plotoptions/series-allowpointselect-line/
         *         Line
         * @sample {highcharts} highcharts/plotoptions/series-allowpointselect-column/
         *         Column
         * @sample {highcharts} highcharts/plotoptions/series-allowpointselect-pie/
         *         Pie
         * @sample {highcharts} highcharts/chart/events-selection-points/
         *         Select a range of points through a drag selection
         * @sample {highmaps} maps/plotoptions/series-allowpointselect/
         *         Map area
         * @sample {highmaps} maps/plotoptions/mapbubble-allowpointselect/
         *         Map bubble
         *
         * @since 1.2.0
         *
         * @private
         */
        allowPointSelect: false,

        /**
         * When true, each point or column edge is rounded to its nearest pixel
         * in order to render sharp on screen. In some cases, when there are a
         * lot of densely packed columns, this leads to visible difference
         * in column widths or distance between columns. In these cases,
         * setting `crisp` to `false` may look better, even though each column
         * is rendered blurry.
         *
         * @sample {highcharts} highcharts/plotoptions/column-crisp-false/
         *         Crisp is false
         *
         * @since   5.0.10
         * @product highcharts highstock gantt
         *
         * @private
         */
        crisp: true,

        /**
         * If true, a checkbox is displayed next to the legend item to allow
         * selecting the series. The state of the checkbox is determined by
         * the `selected` option.
         *
         * @productdesc {highmaps}
         * Note that if a `colorAxis` is defined, the color axis is represented
         * in the legend, not the series.
         *
         * @sample {highcharts} highcharts/plotoptions/series-showcheckbox-true/
         *         Show select box
         *
         * @since 1.2.0
         *
         * @private
         */
        showCheckbox: false,

        /**
         * Enable or disable the initial animation when a series is displayed.
         * The animation can also be set as a configuration object. Please
         * note that this option only applies to the initial animation of the
         * series itself. For other animations, see [chart.animation](
         * #chart.animation) and the animation parameter under the API methods.
         * The following properties are supported:
         *
         * - `defer`: The animation delay time in milliseconds.
         *
         * - `duration`: The duration of the animation in milliseconds.
         *
         * - `easing`: Can be a string reference to an easing function set on
         *   the `Math` object or a function. See the _Custom easing function_
         *   demo below.
         *
         * Due to poor performance, animation is disabled in old IE browsers
         * for several chart types.
         *
         * @sample {highcharts} highcharts/plotoptions/series-animation-disabled/
         *         Animation disabled
         * @sample {highcharts} highcharts/plotoptions/series-animation-slower/
         *         Slower animation
         * @sample {highcharts} highcharts/plotoptions/series-animation-easing/
         *         Custom easing function
         * @sample {highstock} stock/plotoptions/animation-slower/
         *         Slower animation
         * @sample {highstock} stock/plotoptions/animation-easing/
         *         Custom easing function
         * @sample {highmaps} maps/plotoptions/series-animation-true/
         *         Animation enabled on map series
         * @sample {highmaps} maps/plotoptions/mapbubble-animation-false/
         *         Disabled on mapbubble series
         *
         * @type    {boolean|Partial<Highcharts.AnimationOptionsObject>}
         * @default {highcharts} true
         * @default {highstock} true
         * @default {highmaps} false
         *
         * @private
         */
        animation: {
            /** @internal */
            duration: 1000
        },

        /**
         * @default   0
         * @type      {number}
         * @since     8.2.0
         * @apioption plotOptions.series.animation.defer
         */

        /**
         * An additional class name to apply to the series' graphical elements.
         * This option does not replace default class names of the graphical
         * element.
         *
         * @type      {string}
         * @since     5.0.0
         * @apioption plotOptions.series.className
         */

        /**
         * Disable this option to allow series rendering in the whole plotting
         * area.
         *
         * **Note:** Clipping should be always enabled when
         * [chart.zoomType](#chart.zoomType) is set
         *
         * @sample {highcharts} highcharts/plotoptions/series-clip/
         *         Disabled clipping
         *
         * @default   true
         * @type      {boolean}
         * @since     3.0.0
         * @apioption plotOptions.series.clip
         */

        /**
         * The main color of the series. In line type series it applies to the
         * line and the point markers unless otherwise specified. In bar type
         * series it applies to the bars unless a color is specified per point.
         * The default value is pulled from the `options.colors` array.
         *
         * In styled mode, the color can be defined by the
         * [colorIndex](#plotOptions.series.colorIndex) option. Also, the series
         * color can be set with the `.highcharts-series`,
         * `.highcharts-color-{n}`, `.highcharts-{type}-series` or
         * `.highcharts-series-{n}` class, or individual classes given by the
         * `className` option.
         *
         * @productdesc {highmaps}
         * In maps, the series color is rarely used, as most choropleth maps use
         * the color to denote the value of each point. The series color can
         * however be used in a map with multiple series holding categorized
         * data.
         *
         * @sample {highcharts} highcharts/plotoptions/series-color-general/
         *         General plot option
         * @sample {highcharts} highcharts/plotoptions/series-color-specific/
         *         One specific series
         * @sample {highcharts} highcharts/plotoptions/series-color-area/
         *         Area color
         * @sample {highcharts} highcharts/series/infographic/
         *         Pattern fill
         * @sample {highmaps} maps/demo/category-map/
         *         Category map by multiple series
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @apioption plotOptions.series.color
         */

        /**
         * Styled mode only. A specific color index to use for the series, so
         * its graphic representations are given the class name
         * `highcharts-color-{n}`.
         *
         * @type      {number}
         * @since     5.0.0
         * @apioption plotOptions.series.colorIndex
         */


        /**
         * Whether to connect a graph line across null points, or render a gap
         * between the two points on either side of the null.
         *
         * @sample {highcharts} highcharts/plotoptions/series-connectnulls-false/
         *         False by default
         * @sample {highcharts} highcharts/plotoptions/series-connectnulls-true/
         *         True
         *
         * @type      {boolean}
         * @default   false
         * @product   highcharts highstock
         * @apioption plotOptions.series.connectNulls
         */


        /**
         * You can set the cursor to "pointer" if you have click events attached
         * to the series, to signal to the user that the points and lines can
         * be clicked.
         *
         * In styled mode, the series cursor can be set with the same classes
         * as listed under [series.color](#plotOptions.series.color).
         *
         * @sample {highcharts} highcharts/plotoptions/series-cursor-line/
         *         On line graph
         * @sample {highcharts} highcharts/plotoptions/series-cursor-column/
         *         On columns
         * @sample {highcharts} highcharts/plotoptions/series-cursor-scatter/
         *         On scatter markers
         * @sample {highstock} stock/plotoptions/cursor/
         *         Pointer on a line graph
         * @sample {highmaps} maps/plotoptions/series-allowpointselect/
         *         Map area
         * @sample {highmaps} maps/plotoptions/mapbubble-allowpointselect/
         *         Map bubble
         *
         * @type      {string|Highcharts.CursorValue}
         * @apioption plotOptions.series.cursor
         */

        /**
         * A reserved subspace to store options and values for customized
         * functionality. Here you can add additional data for your own event
         * callbacks and formatter callbacks.
         *
         * @sample {highcharts} highcharts/point/custom/
         *         Point and series with custom data
         *
         * @type      {Highcharts.Dictionary<*>}
         * @apioption plotOptions.series.custom
         */

        /**
         * Name of the dash style to use for the graph, or for some series types
         * the outline of each shape.
         *
         * In styled mode, the
         * [stroke dash-array](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-dashstyle/)
         * can be set with the same classes as listed under
         * [series.color](#plotOptions.series.color).
         *
         * @sample {highcharts} highcharts/plotoptions/series-dashstyle-all/
         *         Possible values demonstrated
         * @sample {highcharts} highcharts/plotoptions/series-dashstyle/
         *         Chart suitable for printing in black and white
         * @sample {highstock} highcharts/plotoptions/series-dashstyle-all/
         *         Possible values demonstrated
         * @sample {highmaps} highcharts/plotoptions/series-dashstyle-all/
         *         Possible values demonstrated
         * @sample {highmaps} maps/plotoptions/series-dashstyle/
         *         Dotted borders on a map
         *
         * @type      {Highcharts.DashStyleValue}
         * @default   Solid
         * @since     2.1
         * @apioption plotOptions.series.dashStyle
         */

        /**
         * A description of the series to add to the screen reader information
         * about the series.
         *
         * @type      {string}
         * @since     5.0.0
         * @requires  modules/accessibility
         * @apioption plotOptions.series.description
         */

        /**
         * Options for the series data sorting.
         *
         * @type      {Highcharts.DataSortingOptionsObject}
         * @since     8.0.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.dataSorting
         */

        /**
         * Enable or disable data sorting for the series. Use [xAxis.reversed](
         * #xAxis.reversed) to change the sorting order.
         *
         * @sample {highcharts} highcharts/datasorting/animation/
         *         Data sorting in scatter-3d
         * @sample {highcharts} highcharts/datasorting/labels-animation/
         *         Axis labels animation
         * @sample {highcharts} highcharts/datasorting/dependent-sorting/
         *         Dependent series sorting
         * @sample {highcharts} highcharts/datasorting/independent-sorting/
         *         Independent series sorting
         *
         * @type      {boolean}
         * @since     8.0.0
         * @apioption plotOptions.series.dataSorting.enabled
         */

        /**
         * Whether to allow matching points by name in an update. If this option
         * is disabled, points will be matched by order.
         *
         * @sample {highcharts} highcharts/datasorting/match-by-name/
         *         Enabled match by name
         *
         * @type      {boolean}
         * @since     8.0.0
         * @apioption plotOptions.series.dataSorting.matchByName
         */

        /**
         * Determines what data value should be used to sort by.
         *
         * @sample {highcharts} highcharts/datasorting/sort-key/
         *         Sort key as `z` value
         *
         * @type      {string}
         * @since     8.0.0
         * @default   y
         * @apioption plotOptions.series.dataSorting.sortKey
         */

        /**
         * Enable or disable the mouse tracking for a specific series. This
         * includes point tooltips and click events on graphs and points. For
         * large datasets it improves performance.
         *
         * @sample {highcharts} highcharts/plotoptions/series-enablemousetracking-false/
         *         No mouse tracking
         * @sample {highmaps} maps/plotoptions/series-enablemousetracking-false/
         *         No mouse tracking
         *
         * @type      {boolean}
         * @default   true
         * @apioption plotOptions.series.enableMouseTracking
         */

        /**
         * Whether to use the Y extremes of the total chart width or only the
         * zoomed area when zooming in on parts of the X axis. By default, the
         * Y axis adjusts to the min and max of the visible data. Cartesian
         * series only.
         *
         * @type      {boolean}
         * @default   false
         * @since     4.1.6
         * @product   highcharts highstock gantt
         * @apioption plotOptions.series.getExtremesFromAll
         */

        /**
         * An array specifying which option maps to which key in the data point
         * array. This makes it convenient to work with unstructured data arrays
         * from different sources.
         *
         * @see [series.data](#series.line.data)
         *
         * @sample {highcharts|highstock} highcharts/series/data-keys/
         *         An extended data array with keys
         * @sample {highcharts|highstock} highcharts/series/data-nested-keys/
         *         Nested keys used to access object properties
         *
         * @type      {Array<string>}
         * @since     4.1.6
         * @apioption plotOptions.series.keys
         */

        /**
         * The line cap used for line ends and line joins on the graph.
         *
         * @type       {Highcharts.SeriesLinecapValue}
         * @default    round
         * @product    highcharts highstock
         * @apioption  plotOptions.series.linecap
         */

        /**
         * The [id](#series.id) of another series to link to. Additionally,
         * the value can be ":previous" to link to the previous series. When
         * two series are linked, only the first one appears in the legend.
         * Toggling the visibility of this also toggles the linked series.
         *
         * If master series uses data sorting and linked series does not have
         * its own sorting definition, the linked series will be sorted in the
         * same order as the master one.
         *
         * @sample {highcharts|highstock} highcharts/demo/arearange-line/
         *         Linked series
         *
         * @type      {string}
         * @since     3.0
         * @product   highcharts highstock gantt
         * @apioption plotOptions.series.linkedTo
         */

        /**
         * Options for the corresponding navigator series if `showInNavigator`
         * is `true` for this series. Available options are the same as any
         * series, documented at [plotOptions](#plotOptions.series) and
         * [series](#series).
         *
         * These options are merged with options in [navigator.series](
         * #navigator.series), and will take precedence if the same option is
         * defined both places.
         *
         * @see [navigator.series](#navigator.series)
         *
         * @type      {Highcharts.PlotSeriesOptions}
         * @since     5.0.0
         * @product   highstock
         * @apioption plotOptions.series.navigatorOptions
         */

        /**
         * The color for the parts of the graph or points that are below the
         * [threshold](#plotOptions.series.threshold). Note that `zones` takes
         * precedence over the negative color. Using `negativeColor` is
         * equivalent to applying a zone with value of 0.
         *
         * @see In styled mode, a negative color is applied by setting this option
         *      to `true` combined with the `.highcharts-negative` class name.
         *
         * @sample {highcharts} highcharts/plotoptions/series-negative-color/
         *         Spline, area and column
         * @sample {highcharts} highcharts/plotoptions/arearange-negativecolor/
         *         Arearange
         * @sample {highcharts} highcharts/css/series-negative-color/
         *         Styled mode
         * @sample {highstock} highcharts/plotoptions/series-negative-color/
         *         Spline, area and column
         * @sample {highstock} highcharts/plotoptions/arearange-negativecolor/
         *         Arearange
         * @sample {highmaps} highcharts/plotoptions/series-negative-color/
         *         Spline, area and column
         * @sample {highmaps} highcharts/plotoptions/arearange-negativecolor/
         *         Arearange
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     3.0
         * @apioption plotOptions.series.negativeColor
         */

        /**
         * Same as
         * [accessibility.series.descriptionFormatter](#accessibility.series.descriptionFormatter),
         * but for an individual series. Overrides the chart wide configuration.
         *
         * @type      {Function}
         * @since     5.0.12
         * @apioption plotOptions.series.pointDescriptionFormatter
         */

        /**
         * If no x values are given for the points in a series, `pointInterval`
         * defines the interval of the x values. For example, if a series
         * contains one value every decade starting from year 0, set
         * `pointInterval` to `10`. In true `datetime` axes, the `pointInterval`
         * is set in milliseconds.
         *
         * It can be also be combined with `pointIntervalUnit` to draw irregular
         * time intervals.
         *
         * Please note that this options applies to the _series data_, not the
         * interval of the axis ticks, which is independent.
         *
         * @sample {highcharts} highcharts/plotoptions/series-pointstart-datetime/
         *         Datetime X axis
         * @sample {highstock} stock/plotoptions/pointinterval-pointstart/
         *         Using pointStart and pointInterval
         *
         * @type      {number}
         * @default   1
         * @product   highcharts highstock gantt
         * @apioption plotOptions.series.pointInterval
         */

        /**
         * On datetime series, this allows for setting the
         * [pointInterval](#plotOptions.series.pointInterval) to irregular time
         * units, `day`, `month` and `year`. A day is usually the same as 24
         * hours, but `pointIntervalUnit` also takes the DST crossover into
         * consideration when dealing with local time. Combine this option with
         * `pointInterval` to draw weeks, quarters, 6 months, 10 years etc.
         *
         * Please note that this options applies to the _series data_, not the
         * interval of the axis ticks, which is independent.
         *
         * @sample {highcharts} highcharts/plotoptions/series-pointintervalunit/
         *         One point a month
         * @sample {highstock} highcharts/plotoptions/series-pointintervalunit/
         *         One point a month
         *
         * @type       {string}
         * @since      4.1.0
         * @product    highcharts highstock gantt
         * @validvalue ["day", "month", "year"]
         * @apioption  plotOptions.series.pointIntervalUnit
         */

        /**
         * Possible values: `"on"`, `"between"`, `number`.
         *
         * In a column chart, when pointPlacement is `"on"`, the point will not
         * create any padding of the X axis. In a polar column chart this means
         * that the first column points directly north. If the pointPlacement is
         * `"between"`, the columns will be laid out between ticks. This is
         * useful for example for visualising an amount between two points in
         * time or in a certain sector of a polar chart.
         *
         * Since Highcharts 3.0.2, the point placement can also be numeric,
         * where 0 is on the axis value, -0.5 is between this value and the
         * previous, and 0.5 is between this value and the next. Unlike the
         * textual options, numeric point placement options won't affect axis
         * padding.
         *
         * Note that pointPlacement needs a [pointRange](
         * #plotOptions.series.pointRange) to work. For column series this is
         * computed, but for line-type series it needs to be set.
         *
         * For the `xrange` series type and gantt charts, if the Y axis is a
         * category axis, the `pointPlacement` applies to the Y axis rather than
         * the (typically datetime) X axis.
         *
         * Defaults to `undefined` in cartesian charts, `"between"` in polar
         * charts.
         *
         * @see [xAxis.tickmarkPlacement](#xAxis.tickmarkPlacement)
         *
         * @sample {highcharts|highstock} highcharts/plotoptions/series-pointplacement-between/
         *         Between in a column chart
         * @sample {highcharts|highstock} highcharts/plotoptions/series-pointplacement-numeric/
         *         Numeric placement for custom layout
         * @sample {highcharts|highstock} maps/plotoptions/heatmap-pointplacement/
         *         Placement in heatmap
         *
         * @type      {string|number}
         * @since     2.3.0
         * @product   highcharts highstock gantt
         * @apioption plotOptions.series.pointPlacement
         */

        /**
         * If no x values are given for the points in a series, pointStart
         * defines on what value to start. For example, if a series contains one
         * yearly value starting from 1945, set pointStart to 1945.
         *
         * @sample {highcharts} highcharts/plotoptions/series-pointstart-linear/
         *         Linear
         * @sample {highcharts} highcharts/plotoptions/series-pointstart-datetime/
         *         Datetime
         * @sample {highstock} stock/plotoptions/pointinterval-pointstart/
         *         Using pointStart and pointInterval
         *
         * @type      {number}
         * @default   0
         * @product   highcharts highstock gantt
         * @apioption plotOptions.series.pointStart
         */

        /**
         * Whether to select the series initially. If `showCheckbox` is true,
         * the checkbox next to the series name in the legend will be checked
         * for a selected series.
         *
         * @sample {highcharts} highcharts/plotoptions/series-selected/
         *         One out of two series selected
         *
         * @type      {boolean}
         * @default   false
         * @since     1.2.0
         * @apioption plotOptions.series.selected
         */

        /**
         * Whether to apply a drop shadow to the graph line. Since 2.3 the
         * shadow can be an object configuration containing `color`, `offsetX`,
         * `offsetY`, `opacity` and `width`.
         *
         * @sample {highcharts} highcharts/plotoptions/series-shadow/
         *         Shadow enabled
         *
         * @type      {boolean|Highcharts.ShadowOptionsObject}
         * @default   false
         * @apioption plotOptions.series.shadow
         */

        /**
         * Whether to display this particular series or series type in the
         * legend. Standalone series are shown in legend by default, and linked
         * series are not. Since v7.2.0 it is possible to show series that use
         * colorAxis by setting this option to `true`.
         *
         * @sample {highcharts} highcharts/plotoptions/series-showinlegend/
         *         One series in the legend, one hidden
         *
         * @type      {boolean}
         * @apioption plotOptions.series.showInLegend
         */

        /**
         * Whether or not to show the series in the navigator. Takes precedence
         * over [navigator.baseSeries](#navigator.baseSeries) if defined.
         *
         * @type      {boolean}
         * @since     5.0.0
         * @product   highstock
         * @apioption plotOptions.series.showInNavigator
         */

        /**
         * If set to `true`, the accessibility module will skip past the points
         * in this series for keyboard navigation.
         *
         * @type      {boolean}
         * @since     5.0.12
         * @apioption plotOptions.series.skipKeyboardNavigation
         */

        /**
         * Whether to stack the values of each series on top of each other.
         * Possible values are `undefined` to disable, `"normal"` to stack by
         * value or `"percent"`.
         *
         * When stacking is enabled, data must be sorted
         * in ascending X order.
         *
         * Some stacking options are related to specific series types. In the
         * streamgraph series type, the stacking option is set to `"stream"`.
         * The second one is `"overlap"`, which only applies to waterfall
         * series.
         *
         * @see [yAxis.reversedStacks](#yAxis.reversedStacks)
         *
         * @sample {highcharts} highcharts/plotoptions/series-stacking-line/
         *         Line
         * @sample {highcharts} highcharts/plotoptions/series-stacking-column/
         *         Column
         * @sample {highcharts} highcharts/plotoptions/series-stacking-bar/
         *         Bar
         * @sample {highcharts} highcharts/plotoptions/series-stacking-area/
         *         Area
         * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-line/
         *         Line
         * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-column/
         *         Column
         * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-bar/
         *         Bar
         * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-area/
         *         Area
         * @sample {highcharts} highcharts/plotoptions/series-waterfall-with-normal-stacking
         *         Waterfall with normal stacking
         * @sample {highcharts} highcharts/plotoptions/series-waterfall-with-overlap-stacking
         *         Waterfall with overlap stacking
         * @sample {highstock} stock/plotoptions/stacking/
         *         Area
         *
         * @type       {string}
         * @product    highcharts highstock
         * @validvalue ["normal", "overlap", "percent", "stream"]
         * @apioption  plotOptions.series.stacking
         */

        /**
         * Whether to apply steps to the line. Possible values are `left`,
         * `center` and `right`.
         *
         * @sample {highcharts} highcharts/plotoptions/line-step/
         *         Different step line options
         * @sample {highcharts} highcharts/plotoptions/area-step/
         *         Stepped, stacked area
         * @sample {highstock} stock/plotoptions/line-step/
         *         Step line
         *
         * @type       {string}
         * @since      1.2.5
         * @product    highcharts highstock
         * @validvalue ["left", "center", "right"]
         * @apioption  plotOptions.series.step
         */

        /**
         * The threshold, also called zero level or base level. For line type
         * series this is only used in conjunction with
         * [negativeColor](#plotOptions.series.negativeColor).
         *
         * @see [softThreshold](#plotOptions.series.softThreshold).
         *
         * @type      {number|null}
         * @default   0
         * @since     3.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.threshold
         */

        /**
         * Set the initial visibility of the series.
         *
         * @sample {highcharts} highcharts/plotoptions/series-visible/
         *         Two series, one hidden and one visible
         * @sample {highstock} stock/plotoptions/series-visibility/
         *         Hidden series
         *
         * @type      {boolean}
         * @default   true
         * @apioption plotOptions.series.visible
         */

        /**
         * Defines the Axis on which the zones are applied.
         *
         * @see [zones](#plotOptions.series.zones)
         *
         * @sample {highcharts} highcharts/series/color-zones-zoneaxis-x/
         *         Zones on the X-Axis
         * @sample {highstock} highcharts/series/color-zones-zoneaxis-x/
         *         Zones on the X-Axis
         *
         * @type      {string}
         * @default   y
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zoneAxis
         */

        /**
         * General event handlers for the series items. These event hooks can
         * also be attached to the series at run time using the
         * `Highcharts.addEvent` function.
         *
         * @declare Highcharts.SeriesEventsOptionsObject
         *
         * @private
         */
        events: {},

        /**
         * Fires after the series has finished its initial animation, or in case
         * animation is disabled, immediately as the series is displayed.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-afteranimate/
         *         Show label after animate
         * @sample {highstock} highcharts/plotoptions/series-events-afteranimate/
         *         Show label after animate
         *
         * @type      {Highcharts.SeriesAfterAnimateCallbackFunction}
         * @since     4.0
         * @product   highcharts highstock gantt
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.afterAnimate
         */

        /**
         * Fires when the checkbox next to the series' name in the legend is
         * clicked. One parameter, `event`, is passed to the function. The state
         * of the checkbox is found by `event.checked`. The checked item is
         * found by `event.item`. Return `false` to prevent the default action
         * which is to toggle the select state of the series.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-checkboxclick/
         *         Alert checkbox status
         *
         * @type      {Highcharts.SeriesCheckboxClickCallbackFunction}
         * @since     1.2.0
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.checkboxClick
         */

        /**
         * Fires when the series is clicked. One parameter, `event`, is passed
         * to the function, containing common event information. Additionally,
         * `event.point` holds a pointer to the nearest point on the graph.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-click/
         *         Alert click info
         * @sample {highstock} stock/plotoptions/series-events-click/
         *         Alert click info
         * @sample {highmaps} maps/plotoptions/series-events-click/
         *         Display click info in subtitle
         *
         * @type      {Highcharts.SeriesClickCallbackFunction}
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.click
         */

        /**
         * Fires when the series is hidden after chart generation time, either
         * by clicking the legend item or by calling `.hide()`.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-hide/
         *         Alert when the series is hidden by clicking the legend item
         *
         * @type      {Highcharts.SeriesHideCallbackFunction}
         * @since     1.2.0
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.hide
         */

        /**
         * Fires when the legend item belonging to the series is clicked. One
         * parameter, `event`, is passed to the function. The default action
         * is to toggle the visibility of the series. This can be prevented
         * by returning `false` or calling `event.preventDefault()`.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-legenditemclick/
         *         Confirm hiding and showing
         *
         * @type      {Highcharts.SeriesLegendItemClickCallbackFunction}
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.legendItemClick
         */

        /**
         * Fires when the mouse leaves the graph. One parameter, `event`, is
         * passed to the function, containing common event information. If the
         * [stickyTracking](#plotOptions.series) option is true, `mouseOut`
         * doesn't happen before the mouse enters another graph or leaves the
         * plot area.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-mouseover-sticky/
         *         With sticky tracking by default
         * @sample {highcharts} highcharts/plotoptions/series-events-mouseover-no-sticky/
         *         Without sticky tracking
         *
         * @type      {Highcharts.SeriesMouseOutCallbackFunction}
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.mouseOut
         */

        /**
         * Fires when the mouse enters the graph. One parameter, `event`, is
         * passed to the function, containing common event information.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-mouseover-sticky/
         *         With sticky tracking by default
         * @sample {highcharts} highcharts/plotoptions/series-events-mouseover-no-sticky/
         *         Without sticky tracking
         *
         * @type      {Highcharts.SeriesMouseOverCallbackFunction}
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.mouseOver
         */

        /**
         * Fires when the series is shown after chart generation time, either
         * by clicking the legend item or by calling `.show()`.
         *
         * @sample {highcharts} highcharts/plotoptions/series-events-show/
         *         Alert when the series is shown by clicking the legend item.
         *
         * @type      {Highcharts.SeriesShowCallbackFunction}
         * @since     1.2.0
         * @context   Highcharts.Series
         * @apioption plotOptions.series.events.show
         */

        /**
         * Options for the point markers of line-like series. Properties like
         * `fillColor`, `lineColor` and `lineWidth` define the visual appearance
         * of the markers. Other series types, like column series, don't have
         * markers, but have visual options on the series level instead.
         *
         * In styled mode, the markers can be styled with the
         * `.highcharts-point`, `.highcharts-point-hover` and
         * `.highcharts-point-select` class names.
         *
         * @declare Highcharts.PointMarkerOptionsObject
         *
         * @private
         */
        marker: {

            /**
             * Enable or disable the point marker. If `undefined`, the markers
             * are hidden when the data is dense, and shown for more widespread
             * data points.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-enabled/
             *         Disabled markers
             * @sample {highcharts} highcharts/plotoptions/series-marker-enabled-false/
             *         Disabled in normal state but enabled on hover
             * @sample {highstock} stock/plotoptions/series-marker/
             *         Enabled markers
             *
             * @type      {boolean}
             * @default   {highcharts} undefined
             * @default   {highstock} false
             * @apioption plotOptions.series.marker.enabled
             */

            /**
             * The threshold for how dense the point markers should be before
             * they are hidden, given that `enabled` is not defined. The number
             * indicates the horizontal distance between the two closest points
             * in the series, as multiples of the `marker.radius`. In other
             * words, the default value of 2 means points are hidden if
             * overlapping horizontally.
             *
             * @sample highcharts/plotoptions/series-marker-enabledthreshold
             *         A higher threshold
             *
             * @since 6.0.5
             */
            enabledThreshold: 2,

            /**
             * The fill color of the point marker. When `undefined`, the series'
             * or point's color is used.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-fillcolor/
             *         White fill
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @apioption plotOptions.series.marker.fillColor
             */

            /**
             * Image markers only. Set the image width explicitly. When using
             * this option, a `width` must also be set.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-width-height/
             *         Fixed width and height
             * @sample {highstock} highcharts/plotoptions/series-marker-width-height/
             *         Fixed width and height
             *
             * @type      {number}
             * @since     4.0.4
             * @apioption plotOptions.series.marker.height
             */

            /**
             * The color of the point marker's outline. When `undefined`, the
             * series' or point's color is used.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-fillcolor/
             *         Inherit from series color (undefined)
             *
             * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             */
            lineColor: palette.backgroundColor,

            /**
             * The width of the point marker's outline.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-fillcolor/
             *         2px blue marker
             */
            lineWidth: 0,

            /**
             * The radius of the point marker.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-radius/
             *         Bigger markers
             *
             * @default {highstock} 2
             * @default {highcharts} 4
             *
             */
            radius: 4,

            /**
             * A predefined shape or symbol for the marker. When undefined, the
             * symbol is pulled from options.symbols. Other possible values are
             * `'circle'`, `'square'`,`'diamond'`, `'triangle'` and
             * `'triangle-down'`.
             *
             * Additionally, the URL to a graphic can be given on this form:
             * `'url(graphic.png)'`. Note that for the image to be applied to
             * exported charts, its URL needs to be accessible by the export
             * server.
             *
             * Custom callbacks for symbol path generation can also be added to
             * `Highcharts.SVGRenderer.prototype.symbols`. The callback is then
             * used by its method name, as shown in the demo.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-symbol/
             *         Predefined, graphic and custom markers
             * @sample {highstock} highcharts/plotoptions/series-marker-symbol/
             *         Predefined, graphic and custom markers
             *
             * @type      {string}
             * @apioption plotOptions.series.marker.symbol
             */

            /**
             * Image markers only. Set the image width explicitly. When using
             * this option, a `height` must also be set.
             *
             * @sample {highcharts} highcharts/plotoptions/series-marker-width-height/
             *         Fixed width and height
             * @sample {highstock} highcharts/plotoptions/series-marker-width-height/
             *         Fixed width and height
             *
             * @type      {number}
             * @since     4.0.4
             * @apioption plotOptions.series.marker.width
             */

            /**
             * States for a single point marker.
             *
             * @declare Highcharts.PointStatesOptionsObject
             */
            states: {

                /**
                 * The normal state of a single point marker. Currently only
                 * used for setting animation when returning to normal state
                 * from hover.
                 *
                 * @declare Highcharts.PointStatesNormalOptionsObject
                 */
                normal: {
                    /**
                     * Animation when returning to normal state after hovering.
                     *
                     * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                     */
                    animation: true
                },

                /**
                 * The hover state for a single point marker.
                 *
                 * @declare Highcharts.PointStatesHoverOptionsObject
                 */
                hover: {

                    /**
                     * Animation when hovering over the marker.
                     *
                     * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                     */
                    animation: {
                        /** @internal */
                        duration: 50
                    },

                    /**
                     * Enable or disable the point marker.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-hover-enabled/
                     *         Disabled hover state
                     */
                    enabled: true,

                    /**
                     * The fill color of the marker in hover state. When
                     * `undefined`, the series' or point's fillColor for normal
                     * state is used.
                     *
                     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
                     * @apioption plotOptions.series.marker.states.hover.fillColor
                     */

                    /**
                     * The color of the point marker's outline. When
                     * `undefined`, the series' or point's lineColor for normal
                     * state is used.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-hover-linecolor/
                     *         White fill color, black line color
                     *
                     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
                     * @apioption plotOptions.series.marker.states.hover.lineColor
                     */

                    /**
                     * The width of the point marker's outline. When
                     * `undefined`, the series' or point's lineWidth for normal
                     * state is used.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-hover-linewidth/
                     *         3px line width
                     *
                     * @type      {number}
                     * @apioption plotOptions.series.marker.states.hover.lineWidth
                     */

                    /**
                     * The radius of the point marker. In hover state, it
                     * defaults to the normal state's radius + 2 as per the
                     * [radiusPlus](#plotOptions.series.marker.states.hover.radiusPlus)
                     * option.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-hover-radius/
                     *         10px radius
                     *
                     * @type      {number}
                     * @apioption plotOptions.series.marker.states.hover.radius
                     */

                    /**
                     * The number of pixels to increase the radius of the
                     * hovered point.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-states-hover-linewidthplus/
                     *         5 pixels greater radius on hover
                     * @sample {highstock} highcharts/plotoptions/series-states-hover-linewidthplus/
                     *         5 pixels greater radius on hover
                     *
                     * @since 4.0.3
                     */
                    radiusPlus: 2,

                    /**
                     * The additional line width for a hovered point.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-states-hover-linewidthplus/
                     *         2 pixels wider on hover
                     * @sample {highstock} highcharts/plotoptions/series-states-hover-linewidthplus/
                     *         2 pixels wider on hover
                     *
                     * @since 4.0.3
                     */
                    lineWidthPlus: 1
                },

                /**
                 * The appearance of the point marker when selected. In order to
                 * allow a point to be selected, set the
                 * `series.allowPointSelect` option to true.
                 *
                 * @declare Highcharts.PointStatesSelectOptionsObject
                 */
                select: {

                    /**
                     * Enable or disable visible feedback for selection.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-select-enabled/
                     *         Disabled select state
                     *
                     * @type      {boolean}
                     * @default   true
                     * @apioption plotOptions.series.marker.states.select.enabled
                     */

                    /**
                     * The radius of the point marker. In hover state, it
                     * defaults to the normal state's radius + 2.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-select-radius/
                     *         10px radius for selected points
                     *
                     * @type      {number}
                     * @apioption plotOptions.series.marker.states.select.radius
                     */

                    /**
                     * The fill color of the point marker.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-select-fillcolor/
                     *         Solid red discs for selected points
                     *
                     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
                     */
                    fillColor: palette.neutralColor20,

                    /**
                     * The color of the point marker's outline. When
                     * `undefined`, the series' or point's color is used.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-select-linecolor/
                     *         Red line color for selected points
                     *
                     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
                     */
                    lineColor: palette.neutralColor100,

                    /**
                     * The width of the point marker's outline.
                     *
                     * @sample {highcharts} highcharts/plotoptions/series-marker-states-select-linewidth/
                     *         3px line width for selected points
                     */
                    lineWidth: 2
                }
            }
        },

        /**
         * Properties for each single point.
         *
         * @declare Highcharts.PlotSeriesPointOptions
         *
         * @private
         */
        point: {

            /**
             * Fires when a point is clicked. One parameter, `event`, is passed
             * to the function, containing common event information.
             *
             * If the `series.allowPointSelect` option is true, the default
             * action for the point's click event is to toggle the point's
             * select state. Returning `false` cancels this action.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-click/
             *         Click marker to alert values
             * @sample {highcharts} highcharts/plotoptions/series-point-events-click-column/
             *         Click column
             * @sample {highcharts} highcharts/plotoptions/series-point-events-click-url/
             *         Go to URL
             * @sample {highmaps} maps/plotoptions/series-point-events-click/
             *         Click marker to display values
             * @sample {highmaps} maps/plotoptions/series-point-events-click-url/
             *         Go to URL
             *
             * @type      {Highcharts.PointClickCallbackFunction}
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.click
             */

            /**
             * Fires when the mouse leaves the area close to the point. One
             * parameter, `event`, is passed to the function, containing common
             * event information.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-mouseover/
             *         Show values in the chart's corner on mouse over
             *
             * @type      {Highcharts.PointMouseOutCallbackFunction}
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.mouseOut
             */

            /**
             * Fires when the mouse enters the area close to the point. One
             * parameter, `event`, is passed to the function, containing common
             * event information.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-mouseover/
             *         Show values in the chart's corner on mouse over
             *
             * @type      {Highcharts.PointMouseOverCallbackFunction}
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.mouseOver
             */

            /**
             * Fires when the point is removed using the `.remove()` method. One
             * parameter, `event`, is passed to the function. Returning `false`
             * cancels the operation.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-remove/
             *         Remove point and confirm
             *
             * @type      {Highcharts.PointRemoveCallbackFunction}
             * @since     1.2.0
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.remove
             */

            /**
             * Fires when the point is selected either programmatically or
             * following a click on the point. One parameter, `event`, is passed
             * to the function. Returning `false` cancels the operation.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-select/
             *         Report the last selected point
             * @sample {highmaps} maps/plotoptions/series-allowpointselect/
             *         Report select and unselect
             *
             * @type      {Highcharts.PointSelectCallbackFunction}
             * @since     1.2.0
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.select
             */

            /**
             * Fires when the point is unselected either programmatically or
             * following a click on the point. One parameter, `event`, is passed
             * to the function.
             *  Returning `false` cancels the operation.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-unselect/
             *         Report the last unselected point
             * @sample {highmaps} maps/plotoptions/series-allowpointselect/
             *         Report select and unselect
             *
             * @type      {Highcharts.PointUnselectCallbackFunction}
             * @since     1.2.0
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.unselect
             */

            /**
             * Fires when the point is updated programmatically through the
             * `.update()` method. One parameter, `event`, is passed to the
             * function. The new point options can be accessed through
             * `event.options`. Returning `false` cancels the operation.
             *
             * @sample {highcharts} highcharts/plotoptions/series-point-events-update/
             *         Confirm point updating
             *
             * @type      {Highcharts.PointUpdateCallbackFunction}
             * @since     1.2.0
             * @context   Highcharts.Point
             * @apioption plotOptions.series.point.events.update
             */

            /**
             * Events for each single point.
             *
             * @declare Highcharts.PointEventsOptionsObject
             */
            events: {}
        },

        /**
         * Options for the series data labels, appearing next to each data
         * point.
         *
         * Since v6.2.0, multiple data labels can be applied to each single
         * point by defining them as an array of configs.
         *
         * In styled mode, the data labels can be styled with the
         * `.highcharts-data-label-box` and `.highcharts-data-label` class names
         * ([see example](https://www.highcharts.com/samples/highcharts/css/series-datalabels)).
         *
         * @sample {highcharts} highcharts/plotoptions/series-datalabels-enabled
         *         Data labels enabled
         * @sample {highcharts} highcharts/plotoptions/series-datalabels-multiple
         *         Multiple data labels on a bar series
         * @sample {highcharts} highcharts/css/series-datalabels
         *         Style mode example
         *
         * @type    {*|Array<*>}
         * @product highcharts highstock highmaps gantt
         *
         * @private
         */
        dataLabels: {
            /**
             * Enable or disable the initial animation when a series is
             * displayed for the `dataLabels`. The animation can also be set as
             * a configuration object. Please note that this option only
             * applies to the initial animation.
             * For other animations, see [chart.animation](#chart.animation)
             * and the animation parameter under the API methods.
             * The following properties are supported:
             *
             * - `defer`: The animation delay time in milliseconds.
             *
             * @sample {highcharts} highcharts/plotoptions/animation-defer/
             *          Animation defer settings
             *
             * @type      {boolean|Partial<Highcharts.AnimationOptionsObject>}
             * @since     8.2.0
             * @apioption plotOptions.series.dataLabels.animation
             */
            animation: {},
            /**
             * The animation delay time in milliseconds.
             * Set to `0` renders dataLabel immediately.
             * As `undefined` inherits defer time from the [series.animation.defer](#plotOptions.series.animation.defer).
             *
             * @type      {number}
             * @since     8.2.0
             * @apioption plotOptions.series.dataLabels.animation.defer
             */

            /**
             * The alignment of the data label compared to the point. If
             * `right`, the right side of the label should be touching the
             * point. For points with an extent, like columns, the alignments
             * also dictates how to align it inside the box, as given with the
             * [inside](#plotOptions.column.dataLabels.inside)
             * option. Can be one of `left`, `center` or `right`.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-align-left/
             *         Left aligned
             * @sample {highcharts} highcharts/plotoptions/bar-datalabels-align-inside-bar/
             *         Data labels inside the bar
             *
             * @type {Highcharts.AlignValue|null}
             */
            align: 'center',

            /**
             * Whether to allow data labels to overlap. To make the labels less
             * sensitive for overlapping, the
             * [dataLabels.padding](#plotOptions.series.dataLabels.padding)
             * can be set to 0.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-allowoverlap-false/
             *         Don't allow overlap
             *
             * @type      {boolean}
             * @default   false
             * @since     4.1.0
             * @apioption plotOptions.series.dataLabels.allowOverlap
             */

            /**
             * The background color or gradient for the data label.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             * @sample {highmaps} maps/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @since     2.2.1
             * @apioption plotOptions.series.dataLabels.backgroundColor
             */

            /**
             * The border color for the data label. Defaults to `undefined`.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @since     2.2.1
             * @apioption plotOptions.series.dataLabels.borderColor
             */

            /**
             * The border radius in pixels for the data label.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             * @sample {highmaps} maps/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @type      {number}
             * @default   0
             * @since     2.2.1
             * @apioption plotOptions.series.dataLabels.borderRadius
             */

            /**
             * The border width in pixels for the data label.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @type      {number}
             * @default   0
             * @since     2.2.1
             * @apioption plotOptions.series.dataLabels.borderWidth
             */

            /**
             * A class name for the data label. Particularly in styled mode,
             * this can be used to give each series' or point's data label
             * unique styling. In addition to this option, a default color class
             * name is added so that we can give the labels a contrast text
             * shadow.
             *
             * @sample {highcharts} highcharts/css/data-label-contrast/
             *         Contrast text shadow
             * @sample {highcharts} highcharts/css/series-datalabels/
             *         Styling by CSS
             *
             * @type      {string}
             * @since     5.0.0
             * @apioption plotOptions.series.dataLabels.className
             */

            /**
             * The text color for the data labels. Defaults to `undefined`. For
             * certain series types, like column or map, the data labels can be
             * drawn inside the points. In this case the data label will be
             * drawn with maximum contrast by default. Additionally, it will be
             * given a `text-outline` style with the opposite color, to further
             * increase the contrast. This can be overridden by setting the
             * `text-outline` style to `none` in the `dataLabels.style` option.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-color/
             *         Red data labels
             * @sample {highmaps} maps/demo/color-axis/
             *         White data labels
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @apioption plotOptions.series.dataLabels.color
             */

            /**
             * Whether to hide data labels that are outside the plot area. By
             * default, the data label is moved inside the plot area according
             * to the
             * [overflow](#plotOptions.series.dataLabels.overflow)
             * option.
             *
             * @type      {boolean}
             * @default   true
             * @since     2.3.3
             * @apioption plotOptions.series.dataLabels.crop
             */

            /**
             * Whether to defer displaying the data labels until the initial
             * series animation has finished. Setting to `false` renders the
             * data label immediately. If set to `true` inherits the defer
             * time set in [plotOptions.series.animation](#plotOptions.series.animation).
             * If set to a number, a defer time is specified in milliseconds.
             *
             * @sample highcharts/plotoptions/animation-defer
             *         Set defer time
             *
             * @since     4.0.0
             * @type      {boolean|number}
             * @product   highcharts highstock gantt
             */
            defer: true,

            /**
             * Enable or disable the data labels.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-enabled/
             *         Data labels enabled
             * @sample {highmaps} maps/demo/color-axis/
             *         Data labels enabled
             *
             * @type      {boolean}
             * @default   false
             * @apioption plotOptions.series.dataLabels.enabled
             */

            /**
             * A declarative filter to control of which data labels to display.
             * The declarative filter is designed for use when callback
             * functions are not available, like when the chart options require
             * a pure JSON structure or for use with graphical editors. For
             * programmatic control, use the `formatter` instead, and return
             * `undefined` to disable a single data label.
             *
             * @example
             * filter: {
             *     property: 'percentage',
             *     operator: '>',
             *     value: 4
             * }
             *
             * @sample {highcharts} highcharts/demo/pie-monochrome
             *         Data labels filtered by percentage
             *
             * @declare   Highcharts.DataLabelsFilterOptionsObject
             * @since     6.0.3
             * @apioption plotOptions.series.dataLabels.filter
             */

            /**
             * The operator to compare by. Can be one of `>`, `<`, `>=`, `<=`,
             * `==`, and `===`.
             *
             * @type       {string}
             * @validvalue [">", "<", ">=", "<=", "==", "==="]
             * @apioption  plotOptions.series.dataLabels.filter.operator
             */

            /**
             * The point property to filter by. Point options are passed
             * directly to properties, additionally there are `y` value,
             * `percentage` and others listed under {@link Highcharts.Point}
             * members.
             *
             * @type      {string}
             * @apioption plotOptions.series.dataLabels.filter.property
             */

            /**
             * The value to compare against.
             *
             * @type      {number}
             * @apioption plotOptions.series.dataLabels.filter.value
             */

            /**
             * A
             * [format string](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting)
             * for the data label. Available variables are the same as for
             * `formatter`.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-format/
             *         Add a unit
             * @sample {highmaps} maps/plotoptions/series-datalabels-format/
             *         Formatted value in the data label
             *
             * @type      {string}
             * @default   y
             * @default   point.value
             * @since     3.0
             * @apioption plotOptions.series.dataLabels.format
             */

            // eslint-disable-next-line valid-jsdoc
            /**
             * Callback JavaScript function to format the data label. Note that
             * if a `format` is defined, the format takes precedence and the
             * formatter is ignored.
             *
             * @sample {highmaps} maps/plotoptions/series-datalabels-format/
             *         Formatted value
             *
             * @type {Highcharts.DataLabelsFormatterCallbackFunction}
             */
            formatter: function (this: Point.PointLabelObject): string {
                const { numberFormatter } = this.series.chart;
                return typeof this.y !== 'number' ? '' : numberFormatter(this.y, -1);
            },

            /**
             * For points with an extent, like columns or map areas, whether to
             * align the data label inside the box or to the actual value point.
             * Defaults to `false` in most cases, `true` in stacked columns.
             *
             * @type      {boolean}
             * @since     3.0
             * @apioption plotOptions.series.dataLabels.inside
             */

            /**
             * Format for points with the value of null. Works analogously to
             * [format](#plotOptions.series.dataLabels.format). `nullFormat` can
             * be applied only to series which support displaying null points.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-format/
             *         Format data label and tooltip for null point.
             *
             * @type      {boolean|string}
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.nullFormat
             */

            /**
             * Callback JavaScript function that defines formatting for points
             * with the value of null. Works analogously to
             * [formatter](#plotOptions.series.dataLabels.formatter).
             * `nullPointFormatter` can be applied only to series which support
             * displaying null points.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-format/
             *         Format data label and tooltip for null point.
             *
             * @type      {Highcharts.DataLabelsFormatterCallbackFunction}
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.nullFormatter
             */

            /**
             * How to handle data labels that flow outside the plot area. The
             * default is `"justify"`, which aligns them inside the plot area.
             * For columns and bars, this means it will be moved inside the bar.
             * To display data labels outside the plot area, set `crop` to
             * `false` and `overflow` to `"allow"`.
             *
             * @type       {Highcharts.DataLabelsOverflowValue}
             * @default    justify
             * @since      3.0.6
             * @apioption  plotOptions.series.dataLabels.overflow
             */

            /**
             * When either the `borderWidth` or the `backgroundColor` is set,
             * this is the padding within the box.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             * @sample {highmaps} maps/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @since 2.2.1
             */
            padding: 5,

            /**
             * Aligns data labels relative to points. If `center` alignment is
             * not possible, it defaults to `right`.
             *
             * @type      {Highcharts.AlignValue}
             * @default   center
             * @apioption plotOptions.series.dataLabels.position
             */

            /**
             * Text rotation in degrees. Note that due to a more complex
             * structure, backgrounds, borders and padding will be lost on a
             * rotated data label.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-rotation/
             *         Vertical labels
             *
             * @type      {number}
             * @default   0
             * @apioption plotOptions.series.dataLabels.rotation
             */

            /**
             * The shadow of the box. Works best with `borderWidth` or
             * `backgroundColor`. Since 2.3 the shadow can be an object
             * configuration containing `color`, `offsetX`, `offsetY`, `opacity`
             * and `width`.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
             *         Data labels box options
             *
             * @type      {boolean|Highcharts.ShadowOptionsObject}
             * @default   false
             * @since     2.2.1
             * @apioption plotOptions.series.dataLabels.shadow
             */

            /**
             * The name of a symbol to use for the border around the label.
             * Symbols are predefined functions on the Renderer object.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-shape/
             *         A callout for annotations
             *
             * @type      {string}
             * @default   square
             * @since     4.1.2
             * @apioption plotOptions.series.dataLabels.shape
             */

            /**
             * Styles for the label. The default `color` setting is
             * `"contrast"`, which is a pseudo color that Highcharts picks up
             * and applies the maximum contrast to the underlying point item,
             * for example the bar in a bar chart.
             *
             * The `textOutline` is a pseudo property that applies an outline of
             * the given width with the given color, which by default is the
             * maximum contrast to the text. So a bright text color will result
             * in a black text outline for maximum readability on a mixed
             * background. In some cases, especially with grayscale text, the
             * text outline doesn't work well, in which cases it can be disabled
             * by setting it to `"none"`. When `useHTML` is true, the
             * `textOutline` will not be picked up. In this, case, the same
             * effect can be acheived through the `text-shadow` CSS property.
             *
             * For some series types, where each point has an extent, like for
             * example tree maps, the data label may overflow the point. There
             * are two strategies for handling overflow. By default, the text
             * will wrap to multiple lines. The other strategy is to set
             * `style.textOverflow` to `ellipsis`, which will keep the text on
             * one line plus it will break inside long words.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-style/
             *         Bold labels
             * @sample {highcharts} highcharts/plotoptions/pie-datalabels-overflow/
             *         Long labels truncated with an ellipsis in a pie
             * @sample {highcharts} highcharts/plotoptions/pie-datalabels-overflow-wrap/
             *         Long labels are wrapped in a pie
             * @sample {highmaps} maps/demo/color-axis/
             *         Bold labels
             *
             * @type      {Highcharts.CSSObject}
             * @since     4.1.0
             * @apioption plotOptions.series.dataLabels.style
             */
            style: {
                /** @internal */
                fontSize: '11px',
                /** @internal */
                fontWeight: 'bold',
                /** @internal */
                color: 'contrast',
                /** @internal */
                textOutline: '1px contrast'
            },

            /**
             * Options for a label text which should follow marker's shape.
             * Border and background are disabled for a label that follows a
             * path.
             *
             * **Note:** Only SVG-based renderer supports this option. Setting
             * `useHTML` to true will disable this option.
             *
             * @declare   Highcharts.DataLabelsTextPathOptionsObject
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.textPath
             */

            /**
             * Presentation attributes for the text path.
             *
             * @type      {Highcharts.SVGAttributes}
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.textPath.attributes
             */

            /**
             * Enable or disable `textPath` option for link's or marker's data
             * labels.
             *
             * @type      {boolean}
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.textPath.enabled
             */

            /**
             * Whether to
             * [use HTML](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html)
             * to render the labels.
             *
             * @type      {boolean}
             * @default   false
             * @apioption plotOptions.series.dataLabels.useHTML
             */

            /**
             * The vertical alignment of a data label. Can be one of `top`,
             * `middle` or `bottom`. The default value depends on the data, for
             * instance in a column chart, the label is above positive values
             * and below negative values.
             *
             * @type  {Highcharts.VerticalAlignValue|null}
             * @since 2.3.3
             */
            verticalAlign: 'bottom',

            /**
             * The x position offset of the label relative to the point in
             * pixels.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-rotation/
             *         Vertical and positioned
             * @sample {highcharts} highcharts/plotoptions/bar-datalabels-align-inside-bar/
             *         Data labels inside the bar
             */
            x: 0,

            /**
             * The Z index of the data labels. The default Z index puts it above
             * the series. Use a Z index of 2 to display it behind the series.
             *
             * @type      {number}
             * @default   6
             * @since     2.3.5
             * @apioption plotOptions.series.dataLabels.z
             */

            /**
             * The y position offset of the label relative to the point in
             * pixels.
             *
             * @sample {highcharts} highcharts/plotoptions/series-datalabels-rotation/
             *         Vertical and positioned
             */
            y: 0
        },

        /**
         * When the series contains less points than the crop threshold, all
         * points are drawn, even if the points fall outside the visible plot
         * area at the current zoom. The advantage of drawing all points
         * (including markers and columns), is that animation is performed on
         * updates. On the other hand, when the series contains more points than
         * the crop threshold, the series data is cropped to only contain points
         * that fall within the plot area. The advantage of cropping away
         * invisible points is to increase performance on large series.
         *
         * @since   2.2
         * @product highcharts highstock
         *
         * @private
         */
        cropThreshold: 300,

        /**
         * Opacity of a series parts: line, fill (e.g. area) and dataLabels.
         *
         * @see [states.inactive.opacity](#plotOptions.series.states.inactive.opacity)
         *
         * @since 7.1.0
         *
         * @private
         */
        opacity: 1,

        /**
         * The width of each point on the x axis. For example in a column chart
         * with one value each day, the pointRange would be 1 day (= 24 * 3600
         * * 1000 milliseconds). This is normally computed automatically, but
         * this option can be used to override the automatic value.
         *
         * @product highstock
         *
         * @private
         */
        pointRange: 0,

        /**
         * When this is true, the series will not cause the Y axis to cross
         * the zero plane (or [threshold](#plotOptions.series.threshold) option)
         * unless the data actually crosses the plane.
         *
         * For example, if `softThreshold` is `false`, a series of 0, 1, 2,
         * 3 will make the Y axis show negative values according to the
         * `minPadding` option. If `softThreshold` is `true`, the Y axis starts
         * at 0.
         *
         * @since   4.1.9
         * @product highcharts highstock
         *
         * @private
         */
        softThreshold: true,

        /**
         * @declare Highcharts.SeriesStatesOptionsObject
         *
         * @private
         */
        states: {

            /**
             * The normal state of a series, or for point items in column, pie
             * and similar series. Currently only used for setting animation
             * when returning to normal state from hover.
             *
             * @declare Highcharts.SeriesStatesNormalOptionsObject
             */
            normal: {
                /**
                 * Animation when returning to normal state after hovering.
                 *
                     * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                 */
                animation: true
            },

            /**
             * Options for the hovered series. These settings override the
             * normal state options when a series is moused over or touched.
             *
             * @declare Highcharts.SeriesStatesHoverOptionsObject
             */
            hover: {

                /**
                 * Enable separate styles for the hovered series to visualize
                 * that the user hovers either the series itself or the legend.
                 *
                 * @sample {highcharts} highcharts/plotoptions/series-states-hover-enabled/
                 *         Line
                 * @sample {highcharts} highcharts/plotoptions/series-states-hover-enabled-column/
                 *         Column
                 * @sample {highcharts} highcharts/plotoptions/series-states-hover-enabled-pie/
                 *         Pie
                 *
                 * @type      {boolean}
                 * @default   true
                 * @since     1.2
                 * @apioption plotOptions.series.states.hover.enabled
                 */


                /**
                 * Animation setting for hovering the graph in line-type series.
                 *
                 * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                 * @since   5.0.8
                 * @product highcharts highstock
                 */
                animation: {

                    /**
                     * The duration of the hover animation in milliseconds. By
                     * default the hover state animates quickly in, and slowly
                     * back to normal.
                     *
                     * @internal
                     */
                    duration: 50
                },

                /**
                 * Pixel width of the graph line. By default this property is
                 * undefined, and the `lineWidthPlus` property dictates how much
                 * to increase the linewidth from normal state.
                 *
                 * @sample {highcharts} highcharts/plotoptions/series-states-hover-linewidth/
                 *         5px line on hover
                 *
                 * @type      {number}
                 * @product   highcharts highstock
                 * @apioption plotOptions.series.states.hover.lineWidth
                 */

                /**
                 * The additional line width for the graph of a hovered series.
                 *
                 * @sample {highcharts} highcharts/plotoptions/series-states-hover-linewidthplus/
                 *         5 pixels wider
                 * @sample {highstock} highcharts/plotoptions/series-states-hover-linewidthplus/
                 *         5 pixels wider
                 *
                 * @since   4.0.3
                 * @product highcharts highstock
                 */
                lineWidthPlus: 1,

                /**
                 * In Highcharts 1.0, the appearance of all markers belonging
                 * to the hovered series. For settings on the hover state of the
                 * individual point, see
                 * [marker.states.hover](#plotOptions.series.marker.states.hover).
                 *
                 * @deprecated
                 *
                 * @extends   plotOptions.series.marker
                 * @excluding states
                 * @product   highcharts highstock
                 */
                marker: {
                    // lineWidth: base + 1,
                    // radius: base + 1
                },

                /**
                 * Options for the halo appearing around the hovered point in
                 * line-type series as well as outside the hovered slice in pie
                 * charts. By default the halo is filled by the current point or
                 * series color with an opacity of 0.25\. The halo can be
                 * disabled by setting the `halo` option to `null`.
                 *
                 * In styled mode, the halo is styled with the
                 * `.highcharts-halo` class, with colors inherited from
                 * `.highcharts-color-{n}`.
                 *
                 * @sample {highcharts} highcharts/plotoptions/halo/
                 *         Halo options
                 * @sample {highstock} highcharts/plotoptions/halo/
                 *         Halo options
                 *
                 * @declare Highcharts.SeriesStatesHoverHaloOptionsObject
                 * @type    {null|*}
                 * @since   4.0
                 * @product highcharts highstock
                 */
                halo: {

                    /**
                     * A collection of SVG attributes to override the appearance
                     * of the halo, for example `fill`, `stroke` and
                     * `stroke-width`.
                     *
                     * @type      {Highcharts.SVGAttributes}
                     * @since     4.0
                     * @product   highcharts highstock
                     * @apioption plotOptions.series.states.hover.halo.attributes
                     */


                    /**
                     * The pixel size of the halo. For point markers this is the
                     * radius of the halo. For pie slices it is the width of the
                     * halo outside the slice. For bubbles it defaults to 5 and
                     * is the width of the halo outside the bubble.
                     *
                     * @since   4.0
                     * @product highcharts highstock
                     */
                    size: 10,

                    /**
                     * Opacity for the halo unless a specific fill is overridden
                     * using the `attributes` setting. Note that Highcharts is
                     * only able to apply opacity to colors of hex or rgb(a)
                     * formats.
                     *
                     * @since   4.0
                     * @product highcharts highstock
                     */
                    opacity: 0.25
                }
            },


            /**
             * Specific options for point in selected states, after being
             * selected by
             * [allowPointSelect](#plotOptions.series.allowPointSelect)
             * or programmatically.
             *
             * @sample maps/plotoptions/series-allowpointselect/
             *         Allow point select demo
             *
             * @declare   Highcharts.SeriesStatesSelectOptionsObject
             * @extends   plotOptions.series.states.hover
             * @excluding brightness
             */
            select: {
                animation: {
                    /** @internal */
                    duration: 0
                }
            },

            /**
             * The opposite state of a hover for series.
             *
             * @sample highcharts/plotoptions/series-states-inactive-disabled
             *         Disabled inactive state
             *
             * @declare Highcharts.SeriesStatesInactiveOptionsObject
             */
            inactive: {
                /**
                 * Enable or disable the inactive state for a series
                 *
                 * @sample highcharts/plotoptions/series-states-inactive-disabled
                 *         Disabled inactive state
                 *
                 * @type {boolean}
                 * @default true
                 * @apioption plotOptions.series.states.inactive.enabled
                 */

                /**
                 * The animation for entering the inactive state.
                 *
                 * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                 */
                animation: {
                    /** @internal */
                    duration: 50
                },
                /**
                 * Opacity of series elements (dataLabels, line, area).
                 *
                 * @type {number}
                 */
                opacity: 0.2
            }
        },

        /**
         * Sticky tracking of mouse events. When true, the `mouseOut` event on a
         * series isn't triggered until the mouse moves over another series, or
         * out of the plot area. When false, the `mouseOut` event on a series is
         * triggered when the mouse leaves the area around the series' graph or
         * markers. This also implies the tooltip when not shared. When
         * `stickyTracking` is false and `tooltip.shared` is false, the tooltip
         * will be hidden when moving the mouse between series. Defaults to true
         * for line and area type series, but to false for columns, pies etc.
         *
         * **Note:** The boost module will force this option because of
         * technical limitations.
         *
         * @sample {highcharts} highcharts/plotoptions/series-stickytracking-true/
         *         True by default
         * @sample {highcharts} highcharts/plotoptions/series-stickytracking-false/
         *         False
         *
         * @default {highcharts} true
         * @default {highstock} true
         * @default {highmaps} false
         * @since   2.0
         *
         * @private
         */
        stickyTracking: true,

        /**
         * A configuration object for the tooltip rendering of each single
         * series. Properties are inherited from [tooltip](#tooltip), but only
         * the following properties can be defined on a series level.
         *
         * @declare   Highcharts.SeriesTooltipOptionsObject
         * @since     2.3
         * @extends   tooltip
         * @excluding animation, backgroundColor, borderColor, borderRadius,
         *            borderWidth, className, crosshairs, enabled, formatter,
         *            headerShape, hideDelay, outside, padding, positioner,
         *            shadow, shape, shared, snap, split, stickOnContact,
         *            style, useHTML
         * @apioption plotOptions.series.tooltip
         */

        /**
         * When a series contains a data array that is longer than this, only
         * one dimensional arrays of numbers, or two dimensional arrays with
         * x and y values are allowed. Also, only the first point is tested,
         * and the rest are assumed to be the same format. This saves expensive
         * data checking and indexing in long series. Set it to `0` disable.
         *
         * Note:
         * In boost mode turbo threshold is forced. Only array of numbers or
         * two dimensional arrays are allowed.
         *
         * @since   2.2
         * @product highcharts highstock gantt
         *
         * @private
         */
        turboThreshold: 1000,

        /**
         * An array defining zones within a series. Zones can be applied to the
         * X axis, Y axis or Z axis for bubbles, according to the `zoneAxis`
         * option. The zone definitions have to be in ascending order regarding
         * to the value.
         *
         * In styled mode, the color zones are styled with the
         * `.highcharts-zone-{n}` class, or custom classed from the `className`
         * option
         * ([view live demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/color-zones/)).
         *
         * @see [zoneAxis](#plotOptions.series.zoneAxis)
         *
         * @sample {highcharts} highcharts/series/color-zones-simple/
         *         Color zones
         * @sample {highstock} highcharts/series/color-zones-simple/
         *         Color zones
         *
         * @declare   Highcharts.SeriesZonesOptionsObject
         * @type      {Array<*>}
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zones
         */

        /**
         * Styled mode only. A custom class name for the zone.
         *
         * @sample highcharts/css/color-zones/
         *         Zones styled by class name
         *
         * @type      {string}
         * @since     5.0.0
         * @apioption plotOptions.series.zones.className
         */

        /**
         * Defines the color of the series.
         *
         * @see [series color](#plotOptions.series.color)
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zones.color
         */

        /**
         * A name for the dash style to use for the graph.
         *
         * @see [plotOptions.series.dashStyle](#plotOptions.series.dashStyle)
         *
         * @sample {highcharts|highstock} highcharts/series/color-zones-dashstyle-dot/
         *         Dashed line indicates prognosis
         *
         * @type      {Highcharts.DashStyleValue}
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zones.dashStyle
         */

        /**
         * Defines the fill color for the series (in area type series)
         *
         * @see [fillColor](#plotOptions.area.fillColor)
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zones.fillColor
         */

        /**
         * The value up to where the zone extends, if undefined the zones
         * stretches to the last value in the series.
         *
         * @type      {number}
         * @since     4.1.0
         * @product   highcharts highstock
         * @apioption plotOptions.series.zones.value
         */

        /**
         * When using dual or multiple color axes, this number defines which
         * colorAxis the particular series is connected to. It refers to
         * either the
         * {@link #colorAxis.id|axis id}
         * or the index of the axis in the colorAxis array, with 0 being the
         * first. Set this option to false to prevent a series from connecting
         * to the default color axis.
         *
         * Since v7.2.0 the option can also be an axis id or an axis index
         * instead of a boolean flag.
         *
         * @sample highcharts/coloraxis/coloraxis-with-pie/
         *         Color axis with pie series
         * @sample highcharts/coloraxis/multiple-coloraxis/
         *         Multiple color axis
         *
         * @type      {number|string|boolean}
         * @default   0
         * @product   highcharts highstock highmaps
         * @apioption plotOptions.series.colorAxis
         */

        /**
         * Determines what data value should be used to calculate point color
         * if `colorAxis` is used. Requires to set `min` and `max` if some
         * custom point property is used or if approximation for data grouping
         * is set to `'sum'`.
         *
         * @sample highcharts/coloraxis/custom-color-key/
         *         Custom color key
         * @sample highcharts/coloraxis/changed-default-color-key/
         *         Changed default color key
         *
         * @type      {string}
         * @default   y
         * @since     7.2.0
         * @product   highcharts highstock highmaps
         * @apioption plotOptions.series.colorKey
         */

        /**
         * Determines whether the series should look for the nearest point
         * in both dimensions or just the x-dimension when hovering the series.
         * Defaults to `'xy'` for scatter series and `'x'` for most other
         * series. If the data has duplicate x-values, it is recommended to
         * set this to `'xy'` to allow hovering over all points.
         *
         * Applies only to series types using nearest neighbor search (not
         * direct hover) for tooltip.
         *
         * @sample {highcharts} highcharts/series/findnearestpointby/
         *         Different hover behaviors
         * @sample {highstock} highcharts/series/findnearestpointby/
         *         Different hover behaviors
         * @sample {highmaps} highcharts/series/findnearestpointby/
         *         Different hover behaviors
         *
         * @since      5.0.10
         * @validvalue ["x", "xy"]
         *
         * @private
         */
        findNearestPointBy: 'x'

    };

    /* *
     *
     *  Properties
     *
     * */

    public _hasTracking?: boolean;

    public _i: number = void 0 as any;

    public animationTimeout?: number;

    public area?: SVGElement;

    public basePointRange?: number;

    public buildingKdTree?: boolean;

    public chart: Chart = void 0 as any;

    public clips?: Array<SVGElement>;

    public closestPointRange?: number;

    public closestPointRangePx?: number;

    public color?: (ColorType);

    public colorIndex?: number;

    public cropped?: boolean;

    public data: Array<Point> = void 0 as any;

    public dataMax?: number;

    public dataMin?: number;

    public enabledDataSorting?: boolean;

    public fillColor?: ColorType;

    public finishedAnimating?: boolean;

    public getExtremesFromAll?: boolean;

    public graph?: SVGElement;

    public graphPath?: SVGPath;

    public group?: SVGElement;

    public eventOptions: Record<string, EventCallback<Series, Event>> = void 0 as any;

    public eventsToUnbind: Array<Function> = void 0 as any;

    public halo?: SVGElement;

    public hasCartesianSeries?: Chart['hasCartesianSeries'];

    public hasRendered?: boolean;

    public id?: string;

    public index: number = void 0 as any;

    public initialType?: string;

    public isDirty?: boolean;

    public isDirtyData?: boolean;

    public isRadialSeries?: boolean;

    public kdTree?: KDNode;

    public linkedParent?: Series;

    public linkedSeries: Array<Series> = void 0 as any;

    public options: SeriesOptions = void 0 as any;

    public markerGroup?: SVGElement;

    public opacity?: number;

    public optionalAxis?: string;

    public pointInterval?: number;

    public points: Array<Point> = void 0 as any;

    public pointValKey?: string;

    public processedXData: Array<number> = void 0 as any;

    public processedYData: (Array<(number|null)>|Array<Array<(number|null)>>) = void 0 as any;

    public selected?: boolean;

    public sharedClipKey?: string;

    public stateMarkerGraphic?: SVGElement;

    public stickyTracking?: boolean;

    public symbol?: SymbolKey;

    public tooltipOptions: TooltipOptions = void 0 as any;

    public tracker?: SVGElement;

    public trackerGroups?: Array<string>;

    public userOptions: DeepPartial<SeriesTypeOptions> = void 0 as any;

    public xAxis: AxisType = void 0 as any;

    public xData?: Array<number>;

    public xIncrement?: (number|null);

    public yAxis: AxisType = void 0 as any;

    public yData?: (
        Array<(number|null)>|
        Array<Array<(number|null)>>
    );

    public zoneAxis?: string;

    public zones: Array<SeriesZonesOptions> = void 0 as any;

    /* *
     *
     *  Functions
     *
     * */

    /* eslint-disable valid-jsdoc */

    public init(
        chart: Chart,
        userOptions: DeepPartial<SeriesTypeOptions>
    ): void {

        fireEvent(this, 'init', { options: userOptions });

        const series = this,
            chartSeries = chart.series;

        // The 'eventsToUnbind' property moved from prototype into the
        // Series init to avoid reference to the same array between
        // the different series and charts. #12959, #13937
        this.eventsToUnbind = [];

        /**
         * Read only. The chart that the series belongs to.
         *
         * @name Highcharts.Series#chart
         * @type {Highcharts.Chart}
         */
        series.chart = chart;

        /**
         * Read only. The series' type, like "line", "area", "column" etc.
         * The type in the series options anc can be altered using
         * {@link Series#update}.
         *
         * @name Highcharts.Series#type
         * @type {string}
         */

        /**
         * Read only. The series' current options. To update, use
         * {@link Series#update}.
         *
         * @name Highcharts.Series#options
         * @type {Highcharts.SeriesOptionsType}
         */
        series.options = series.setOptions(userOptions);
        const options = series.options;

        series.linkedSeries = [];
        // bind the axes
        series.bindAxes();

        extend<Series>(series, {
            /**
             * The series name as given in the options. Defaults to
             * "Series {n}".
             *
             * @name Highcharts.Series#name
             * @type {string}
             */
            name: options.name,
            state: '',
            /**
             * Read only. The series' visibility state as set by {@link
             * Series#show}, {@link Series#hide}, or in the initial
             * configuration.
             *
             * @name Highcharts.Series#visible
             * @type {boolean}
             */
            visible: options.visible !== false, // true by default
            /**
             * Read only. The series' selected state as set by {@link
             * Highcharts.Series#select}.
             *
             * @name Highcharts.Series#selected
             * @type {boolean}
             */
            selected: options.selected === true // false by default
        });

        registerEventOptions(this, options);

        const events = options.events;
        if (
            (events && events.click) ||
            (
                options.point &&
                options.point.events &&
                options.point.events.click
            ) ||
            options.allowPointSelect
        ) {
            chart.runTrackerClick = true;
        }

        series.getColor();
        series.getSymbol();

        // Initialize the parallel data arrays
        series.parallelArrays.forEach(function (key: string): void {
            if (!(series as any)[key + 'Data']) {
                (series as any)[key + 'Data'] = [];
            }
        });

        // Mark cartesian
        if (series.isCartesian) {
            chart.hasCartesianSeries = true;
        }

        // Get the index and register the series in the chart. The index is
        // one more than the current latest series index (#5960).
        let lastSeries: Series|undefined;
        if (chartSeries.length) {
            lastSeries = chartSeries[chartSeries.length - 1];
        }
        series._i = pick(lastSeries && lastSeries._i, -1) + 1;
        series.opacity = series.options.opacity;

        // Insert the series and re-order all series above the insertion
        // point.
        chart.orderSeries(this.insert(chartSeries));

        // Set options for series with sorting and set data later.
        if (options.dataSorting && options.dataSorting.enabled) {
            series.setDataSortingOptions();

        } else if (!series.points && !series.data) {
            series.setData(options.data as any, false);
        }

        fireEvent(this, 'afterInit');
    }

    /**
     * Check whether the series item is itself or inherits from a certain
     * series type.
     *
     * @function Highcharts.Series#is
     * @param {string} type The type of series to check for, can be either
     *        featured or custom series types. For example `column`, `pie`,
     *        `ohlc` etc.
     *
     * @return {boolean}
     *        True if this item is or inherits from the given type.
     */
    public is(type: string): boolean {
        return seriesTypes[type] && this instanceof seriesTypes[type];
    }

    /**
     * Insert the series in a collection with other series, either the chart
     * series or yAxis series, in the correct order according to the index
     * option. Used internally when adding series.
     *
     * @private
     * @function Highcharts.Series#insert
     * @param {Array<Highcharts.Series>} collection
     *        A collection of series, like `chart.series` or `xAxis.series`.
     * @return {number}
     *         The index of the series in the collection.
     */
    public insert(collection: Array<Series>): number {
        const indexOption = this.options.index;
        let i: any;

        // Insert by index option
        if (isNumber(indexOption)) {
            i = collection.length;
            while (i--) {
                // Loop down until the interted element has higher index
                if ((indexOption as any) >=
                        pick(collection[i].options.index, collection[i]._i)
                ) {
                    collection.splice(i + 1, 0, this);
                    break;
                }
            }
            if (i === -1) {
                collection.unshift(this);
            }
            i = i + 1;


        // Or just push it to the end
        } else {
            collection.push(this);
        }
        return pick(i, collection.length - 1);
    }

    /**
     * Set the xAxis and yAxis properties of cartesian series, and register
     * the series in the `axis.series` array.
     *
     * @private
     * @function Highcharts.Series#bindAxes
     */
    public bindAxes(): void {
        const series = this,
            seriesOptions = series.options,
            chart = series.chart;
        let axisOptions;

        fireEvent(this, 'bindAxes', null as any, function (): void {

            // repeat for xAxis and yAxis
            (series.axisTypes || []).forEach(function (AXIS: string): void {
                let index = 0;

                // loop through the chart's axis objects
                (chart as any)[AXIS].forEach(function (axis: Axis): void {
                    axisOptions = axis.options;

                    // apply if the series xAxis or yAxis option mathches
                    // the number of the axis, or if undefined, use the
                    // first axis
                    if (
                        (
                            (seriesOptions as any)[AXIS] === index &&
                            !axisOptions.isInternal
                        ) ||
                        (
                            typeof (seriesOptions as any)[AXIS] !==
                            'undefined' &&
                            (seriesOptions as any)[AXIS] === axisOptions.id
                        ) ||
                        (
                            typeof (seriesOptions as any)[AXIS] ===
                            'undefined' &&
                            axisOptions.index === 0
                        )
                    ) {

                        // register this series in the axis.series lookup
                        series.insert(axis.series);

                        // set this series.xAxis or series.yAxis reference
                        /**
                         * Read only. The unique xAxis object associated
                         * with the series.
                         *
                         * @name Highcharts.Series#xAxis
                         * @type {Highcharts.Axis}
                         */
                        /**
                         * Read only. The unique yAxis object associated
                         * with the series.
                         *
                         * @name Highcharts.Series#yAxis
                         * @type {Highcharts.Axis}
                         */
                        (series as any)[AXIS] = axis;

                        // mark dirty for redraw
                        axis.isDirty = true;
                    }

                    if (!axisOptions.isInternal) {
                        index++;
                    }
                });

                // The series needs an X and an Y axis
                if (!(series as any)[AXIS] &&
                    series.optionalAxis !== AXIS
                ) {
                    error(18, true, chart);
                }

            });
        });

        fireEvent(this, 'afterBindAxes');
    }

    /**
     * For simple series types like line and column, the data values are
     * held in arrays like xData and yData for quick lookup to find extremes
     * and more. For multidimensional series like bubble and map, this can
     * be extended with arrays like zData and valueData by adding to the
     * `series.parallelArrays` array.
     *
     * @private
     * @function Highcharts.Series#updateParallelArrays
     */
    public updateParallelArrays(
        point: Point,
        i: (number|string)
    ): void {
        const series = point.series,
            args = arguments,
            fn = isNumber(i) ?
                // Insert the value in the given position
                function (key: string): void {
                    const val = key === 'y' && series.toYData ?
                        series.toYData(point) :
                        (point as any)[key];

                    (series as any)[key + 'Data'][i] = val;
                } :
                // Apply the method specified in i with the following
                // arguments as arguments
                function (key: string): void {
                    (Array.prototype as any)[i].apply(
                        (series as any)[key + 'Data'],
                        Array.prototype.slice.call(args, 2)
                    );
                };

        series.parallelArrays.forEach(fn);
    }

    /**
     * Define hasData functions for series. These return true if there
     * are data points on this series within the plot area.
     *
     * @private
     * @function Highcharts.Series#hasData
     * @return {boolean}
     */
    public hasData(): boolean {
        return ((
            this.visible &&
            typeof this.dataMax !== 'undefined' &&
            typeof this.dataMin !== 'undefined'
        ) || ( // #3703
            this.visible &&
            (this.yData as any) &&
            (this.yData as any).length > 0) // #9758
        );
    }

    /**
     * Return an auto incremented x value based on the pointStart and
     * pointInterval options. This is only used if an x value is not given
     * for the point that calls autoIncrement.
     *
     * @private
     * @function Highcharts.Series#autoIncrement
     * @return {number}
     */
    public autoIncrement(): number {

        const options: SeriesTypeOptions = this.options,
            pointIntervalUnit = options.pointIntervalUnit,
            time = this.chart.time;
        let date,
            xIncrement = this.xIncrement as number,
            pointInterval;

        xIncrement = pick(xIncrement, options.pointStart, 0);

        this.pointInterval = pointInterval = pick(
            this.pointInterval,
            options.pointInterval,
            1
        );

        // Added code for pointInterval strings
        if (pointIntervalUnit) {
            date = new time.Date(xIncrement);

            if (pointIntervalUnit === 'day') {
                time.set(
                    'Date',
                    date,
                    time.get('Date', date) + pointInterval
                );
            } else if (pointIntervalUnit === 'month') {
                time.set(
                    'Month',
                    date,
                    time.get('Month', date) + pointInterval
                );
            } else if (pointIntervalUnit === 'year') {
                time.set(
                    'FullYear',
                    date,
                    time.get('FullYear', date) + pointInterval
                );
            }

            pointInterval = date.getTime() - xIncrement;

        }

        this.xIncrement = xIncrement + pointInterval;
        return xIncrement;
    }

    /**
     * Internal function to set properties for series if data sorting is
     * enabled.
     *
     * @private
     * @function Highcharts.Series#setDataSortingOptions
     */
    public setDataSortingOptions(): void {
        const options = this.options;

        extend<Series>(this, {
            requireSorting: false,
            sorted: false,
            enabledDataSorting: true,
            allowDG: false
        });

        // To allow unsorted data for column series.
        if (!defined(options.pointRange)) {
            options.pointRange = 1;
        }
    }

    /**
     * Set the series options by merging from the options tree. Called
     * internally on initializing and updating series. This function will
     * not redraw the series. For API usage, use {@link Series#update}.
     * @private
     * @function Highcharts.Series#setOptions
     *
     * @param {Highcharts.SeriesOptionsType} itemOptions
     * The series options.
     *
     * @return {Highcharts.SeriesOptionsType}
     *
     * @fires Highcharts.Series#event:afterSetOptions
     */
    public setOptions(itemOptions: DeepPartial<SeriesTypeOptions>): this['options'] {
        const chart = this.chart,
            chartOptions = chart.options,
            plotOptions = chartOptions.plotOptions,
            userOptions = chart.userOptions || {},
            seriesUserOptions = merge(itemOptions),
            styledMode = chart.styledMode,
            e = {
                plotOptions: plotOptions,
                userOptions: seriesUserOptions
            };
        let zone;

        fireEvent(this, 'setOptions', e);

        // These may be modified by the event
        const typeOptions = (e.plotOptions as any)[this.type],
            userPlotOptions = (
                userOptions.plotOptions || {} as SeriesTypePlotOptions
            );

        // use copy to prevent undetected changes (#9762)
        /**
         * Contains series options by the user without defaults.
         * @name Highcharts.Series#userOptions
         * @type {Highcharts.SeriesOptionsType}
         */
        this.userOptions = e.userOptions;

        const options: SeriesTypeOptions = merge(
            typeOptions,
            (plotOptions as any).series,
            // #3881, chart instance plotOptions[type] should trump
            // plotOptions.series
            userOptions.plotOptions &&
            (userOptions.plotOptions as any)[this.type],
            seriesUserOptions
        );

        // The tooltip options are merged between global and series specific
        // options. Importance order asscendingly:
        // globals: (1)tooltip, (2)plotOptions.series,
        // (3)plotOptions[this.type]
        // init userOptions with possible later updates: 4-6 like 1-3 and
        // (7)this series options
        this.tooltipOptions = merge(
            defaultOptions.tooltip, // 1
            (defaultOptions.plotOptions as any).series &&
                (defaultOptions.plotOptions as any).series.tooltip, // 2
            (defaultOptions.plotOptions as any)[this.type].tooltip, // 3
            (chartOptions.tooltip as any).userOptions, // 4
            (plotOptions as any).series &&
            (plotOptions as any).series.tooltip, // 5
            (plotOptions as any)[this.type].tooltip, // 6
            (seriesUserOptions.tooltip as any) // 7
        ) as any;

        // When shared tooltip, stickyTracking is true by default,
        // unless user says otherwise.
        this.stickyTracking = pick(
            seriesUserOptions.stickyTracking,
            (userPlotOptions as any)[this.type] &&
            (userPlotOptions as any)[this.type].stickyTracking,
            userPlotOptions.series && userPlotOptions.series.stickyTracking,
            (
                this.tooltipOptions.shared && !this.noSharedTooltip ?
                    true :
                    options.stickyTracking
            )
        );

        // Delete marker object if not allowed (#1125)
        if (typeOptions.marker === null) {
            delete options.marker;
        }

        // Handle color zones
        this.zoneAxis = options.zoneAxis;
        const zones = this.zones = (options.zones || []).slice();
        if (
            (options.negativeColor || options.negativeFillColor) &&
            !options.zones
        ) {
            zone = {
                value:
                    (options as any)[this.zoneAxis + 'Threshold'] ||
                    options.threshold ||
                    0,
                className: 'highcharts-negative'
            } as SeriesZonesOptions;
            if (!styledMode) {
                zone.color = options.negativeColor;
                zone.fillColor = options.negativeFillColor;
            }
            zones.push(zone);
        }
        if (zones.length) { // Push one extra zone for the rest
            if (defined(zones[zones.length - 1].value)) {
                zones.push(styledMode ? {} : {
                    color: this.color,
                    fillColor: this.fillColor
                });
            }
        }

        fireEvent(this, 'afterSetOptions', { options: options });

        return options;
    }

    /**
     * Return series name in "Series {Number}" format or the one defined by
     * a user. This method can be simply overridden as series name format
     * can vary (e.g. technical indicators).
     *
     * @function Highcharts.Series#getName
     *
     * @return {string}
     * The series name.
     */
    public getName(): string {
        // #4119
        return pick(
            this.options.name,
            'Series ' + ((this.index as any) + 1)
        );
    }

    /**
     * @private
     * @function Highcharts.Series#getCyclic
     */
    public getCyclic(
        prop: string,
        value?: any,
        defaults?: AnyRecord
    ): void {
        const chart = this.chart,
            userOptions = this.userOptions,
            indexName = prop + 'Index',
            counterName = prop + 'Counter',
            len = defaults ? defaults.length : pick(
                (chart.options.chart as any)[prop + 'Count'],
                (chart as any)[prop + 'Count']
            );
        let i,
            setting;

        if (!value) {
            // Pick up either the colorIndex option, or the _colorIndex
            // after Series.update()
            setting = pick(
                (userOptions as any)[indexName],
                (userOptions as any)['_' + indexName]
            );
            if (defined(setting)) { // after Series.update()
                i = setting;
            } else {
                // #6138
                if (!chart.series.length) {
                    (chart as any)[counterName] = 0;
                }
                (userOptions as any)['_' + indexName] = i =
                    (chart as any)[counterName] % len;
                (chart as any)[counterName] += 1;
            }
            if (defaults) {
                value = defaults[i];
            }
        }
        // Set the colorIndex
        if (typeof i !== 'undefined') {
            (this as any)[indexName] = i;
        }
        (this as any)[prop] = value;
    }

    /**
     * Get the series' color based on either the options or pulled from
     * global options.
     *
     * @private
     * @function Highcharts.Series#getColor
     */
    public getColor(): void {
        if (this.chart.styledMode) {
            this.getCyclic('color');

        } else if (this.options.colorByPoint) {
            this.color = palette.neutralColor20;

        } else {
            this.getCyclic(
                'color',
                this.options.color ||
                (defaultOptions.plotOptions as any)[this.type].color,
                this.chart.options.colors
            );
        }
    }

    /**
     * Get all points' instances created for this series.
     *
     * @private
     * @function Highcharts.Series#getPointsCollection
     * @return {Array<Highcharts.Point>}
     */
    public getPointsCollection(): Array<Point> {
        return (this.hasGroupedData ? this.points : this.data) || [];
    }

    /**
     * Get the series' symbol based on either the options or pulled from
     * global options.
     *
     * @private
     * @function Highcharts.Series#getSymbol
     * @return {void}
     */
    public getSymbol(): void {
        const seriesMarkerOption = this.options.marker;

        this.getCyclic(
            'symbol',
            (seriesMarkerOption as any).symbol,
            this.chart.options.symbols
        );
    }

    /**
     * Finds the index of an existing point that matches the given point
     * options.
     *
     * @private
     * @function Highcharts.Series#findPointIndex
     * @param    {Highcharts.PointOptionsObject} optionsObject
     *           The options of the point.
     * @param    {number} fromIndex
     *           The index to start searching from, used for optimizing
     *           series with required sorting.
     * @returns  {number|undefined}
     *           Returns the index of a matching point, or undefined if no
     *           match is found.
     */
    public findPointIndex(
        optionsObject: PointOptions,
        fromIndex: number
    ): (number|undefined) {
        const id = optionsObject.id,
            x = optionsObject.x,
            oldData = this.points,
            dataSorting = this.options.dataSorting;
        let matchingPoint,
            matchedById,
            pointIndex,
            matchKey: string;

        if (id) {
            matchingPoint = this.chart.get(id);

        } else if (this.linkedParent || this.enabledDataSorting) {
            matchKey = (dataSorting && dataSorting.matchByName) ?
                'name' : 'index';

            matchingPoint = find(oldData, function (
                oldPoint: Point
            ): boolean {
                return !oldPoint.touched && (oldPoint as any)[matchKey] ===
                    (optionsObject as any)[matchKey];
            });
            // Add unmatched point as a new point
            if (!matchingPoint) {
                return void 0;

            }
        }

        if (matchingPoint) {
            pointIndex = matchingPoint && matchingPoint.index;
            if (typeof pointIndex !== 'undefined') {
                matchedById = true;
            }
        }

        // Search for the same X in the existing data set
        if (typeof pointIndex === 'undefined' && isNumber(x)) {
            pointIndex = (this.xData as any).indexOf(x as any, fromIndex);
        }

        // Reduce pointIndex if data is cropped
        if (pointIndex !== -1 &&
            typeof pointIndex !== 'undefined' &&
            this.cropped
        ) {
            pointIndex = (pointIndex >= (this.cropStart as any)) ?
                pointIndex - (this.cropStart as any) : pointIndex;
        }

        if (!matchedById &&
            oldData[pointIndex] && oldData[pointIndex].touched
        ) {
            pointIndex = void 0;
        }
        return pointIndex;
    }

    /**
     * Internal function called from setData. If the point count is the same
     * as is was, or if there are overlapping X values, just run
     * Point.update which is cheaper, allows animation, and keeps references
     * to points. This also allows adding or removing points if the X-es
     * don't match.
     *
     * @private
     * @function Highcharts.Series#updateData
     */
    public updateData(
        data: Array<(PointOptions|PointShortOptions)>,
        animation?: (boolean|Partial<AnimationOptions>)
    ): boolean {
        const options = this.options,
            dataSorting = options.dataSorting,
            oldData = this.points,
            pointsToAdd = [] as Array<(PointOptions|PointShortOptions)>,
            requireSorting = this.requireSorting,
            equalLength = data.length === oldData.length;
        let hasUpdatedByKey,
            i,
            point,
            lastIndex: number,
            succeeded = true;

        this.xIncrement = null;

        // Iterate the new data
        data.forEach(function (pointOptions, i): void {
            const optionsObject = (
                defined(pointOptions) &&
                    this.pointClass.prototype.optionsToObject.call(
                        { series: this },
                        pointOptions
                    )
            ) || {};
            let pointIndex;

            // Get the x of the new data point
            const x = optionsObject.x,
                id = optionsObject.id;

            if (id || isNumber(x)) {
                pointIndex = this.findPointIndex(
                    optionsObject,
                    lastIndex
                );

                // Matching X not found
                // or used already due to ununique x values (#8995),
                // add point (but later)
                if (
                    pointIndex === -1 ||
                    typeof pointIndex === 'undefined'
                ) {
                    pointsToAdd.push(pointOptions);

                // Matching X found, update
                } else if (
                    oldData[pointIndex] &&
                    pointOptions !== (options.data as any)[pointIndex]
                ) {
                    oldData[pointIndex].update(
                        pointOptions,
                        false,
                        null as any,
                        false
                    );

                    // Mark it touched, below we will remove all points that
                    // are not touched.
                    oldData[pointIndex].touched = true;

                    // Speed optimize by only searching after last known
                    // index. Performs ~20% bettor on large data sets.
                    if (requireSorting) {
                        lastIndex = pointIndex + 1;
                    }
                // Point exists, no changes, don't remove it
                } else if (oldData[pointIndex]) {
                    oldData[pointIndex].touched = true;
                }

                // If the length is equal and some of the nodes had a
                // match in the same position, we don't want to remove
                // non-matches.
                if (
                    !equalLength ||
                    i !== pointIndex ||
                    (dataSorting && dataSorting.enabled) ||
                    this.hasDerivedData
                ) {
                    hasUpdatedByKey = true;
                }
            } else {
                // Gather all points that are not matched
                pointsToAdd.push(pointOptions);
            }
        }, this);

        // Remove points that don't exist in the updated data set
        if (hasUpdatedByKey) {
            i = oldData.length;
            while (i--) {
                point = oldData[i];
                if (point && !point.touched && point.remove) {
                    point.remove(false, animation);
                }
            }

        // If we did not find keys (ids or x-values), and the length is the
        // same, update one-to-one
        } else if (equalLength && (!dataSorting || !dataSorting.enabled)) {
            data.forEach(function (point, i): void {
                // .update doesn't exist on a linked, hidden series (#3709)
                // (#10187)
                if (point !== oldData[i].y && oldData[i].update) {
                    oldData[i].update(point, false, null as any, false);
                }
            });
            // Don't add new points since those configs are used above
            pointsToAdd.length = 0;

        // Did not succeed in updating data
        } else {
            succeeded = false;
        }

        oldData.forEach(function (point): void {
            if (point) {
                point.touched = false;
            }
        });

        if (!succeeded) {
            return false;
        }

        // Add new points
        pointsToAdd.forEach(function (point): void {
            this.addPoint(point, false, null as any, null as any, false);
        }, this);

        if (
            this.xIncrement === null &&
            this.xData &&
            this.xData.length
        ) {
            this.xIncrement = arrayMax(this.xData);
            this.autoIncrement();
        }

        return true;
    }

    /**
     * Apply a new set of data to the series and optionally redraw it. The
     * new data array is passed by reference (except in case of
     * `updatePoints`), and may later be mutated when updating the chart
     * data.
     *
     * Note the difference in behaviour when setting the same amount of
     * points, or a different amount of points, as handled by the
     * `updatePoints` parameter.
     *
     * @sample highcharts/members/series-setdata/
     *         Set new data from a button
     * @sample highcharts/members/series-setdata-pie/
     *         Set data in a pie
     * @sample stock/members/series-setdata/
     *         Set new data in Highcharts Stock
     * @sample maps/members/series-setdata/
     *         Set new data in Highmaps
     *
     * @function Highcharts.Series#setData
     *
     * @param {Array<Highcharts.PointOptionsType>} data
     *        Takes an array of data in the same format as described under
     *        `series.{type}.data` for the given series type, for example a
     *        line series would take data in the form described under
     *        [series.line.data](https://api.highcharts.com/highcharts/series.line.data).
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart after the series is altered. If
     *        doing more operations on the chart, it is a good idea to set
     *        redraw to false and call {@link Chart#redraw} after.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        When the updated data is the same length as the existing data,
     *        points will be updated by default, and animation visualizes
     *        how the points are changed. Set false to disable animation, or
     *        a configuration object to set duration or easing.
     *
     * @param {boolean} [updatePoints=true]
     *        When this is true, points will be updated instead of replaced
     *        whenever possible. This occurs a) when the updated data is the
     *        same length as the existing data, b) when points are matched
     *        by their id's, or c) when points can be matched by X values.
     *        This allows updating with animation and performs better. In
     *        this case, the original array is not passed by reference. Set
     *        `false` to prevent.
     */
    public setData(
        data: Array<(PointOptions|PointShortOptions)>,
        redraw?: boolean,
        animation?: (boolean|Partial<AnimationOptions>),
        updatePoints?: boolean
    ): void {
        const series = this,
            oldData = series.points,
            oldDataLength = (oldData && oldData.length) || 0,
            options = series.options,
            chart = series.chart,
            dataSorting = options.dataSorting,
            xAxis = series.xAxis,
            turboThreshold = options.turboThreshold,
            xData = this.xData,
            yData = this.yData,
            pointArrayMap = series.pointArrayMap,
            valueCount = pointArrayMap && pointArrayMap.length,
            keys = options.keys;
        let i,
            pt,
            updatedData,
            indexOfX = 0,
            indexOfY = 1,
            firstPoint = null;

        data = data || [];
        const dataLength = data.length;
        redraw = pick(redraw, true);

        if (dataSorting && dataSorting.enabled) {
            data = this.sortData(data);
        }

        // First try to run Point.update which is cheaper, allows animation,
        // and keeps references to points.
        if (
            updatePoints !== false &&
            dataLength &&
            oldDataLength &&
            !series.cropped &&
            !series.hasGroupedData &&
            series.visible &&
            // Soft updating has no benefit in boost, and causes JS error
            // (#8355)
            !series.isSeriesBoosting
        ) {
            updatedData = this.updateData(data, animation);
        }

        if (!updatedData) {

            // Reset properties
            series.xIncrement = null;

            series.colorCounter = 0; // for series with colorByPoint (#1547)

            // Update parallel arrays
            this.parallelArrays.forEach(function (key): void {
                (series as any)[key + 'Data'].length = 0;
            });

            // In turbo mode, only one- or twodimensional arrays of numbers
            // are allowed. The first value is tested, and we assume that
            // all the rest are defined the same way. Although the 'for'
            // loops are similar, they are repeated inside each if-else
            // conditional for max performance.
            if (turboThreshold && dataLength > turboThreshold) {

                firstPoint = series.getFirstValidPoint(data);

                if (isNumber(firstPoint)) { // assume all points are numbers
                    for (i = 0; i < dataLength; i++) {
                        (xData as any)[i] = this.autoIncrement();
                        (yData as any)[i] = data[i];
                    }

                // Assume all points are arrays when first point is
                } else if (isArray(firstPoint)) {
                    if (valueCount) { // [x, low, high] or [x, o, h, l, c]
                        for (i = 0; i < dataLength; i++) {
                            pt = data[i];
                            (xData as any)[i] = (pt as any)[0];
                            (yData as any)[i] =
                                (pt as any).slice(1, valueCount + 1);
                        }
                    } else { // [x, y]
                        if (keys) {
                            indexOfX = keys.indexOf('x');
                            indexOfY = keys.indexOf('y');

                            indexOfX = indexOfX >= 0 ? indexOfX : 0;
                            indexOfY = indexOfY >= 0 ? indexOfY : 1;
                        }

                        for (i = 0; i < dataLength; i++) {
                            pt = data[i];
                            (xData as any)[i] = (pt as any)[indexOfX];
                            (yData as any)[i] = (pt as any)[indexOfY];
                        }
                    }
                } else {
                    // Highcharts expects configs to be numbers or arrays in
                    // turbo mode
                    error(12, false, chart);
                }
            } else {
                for (i = 0; i < dataLength; i++) {
                    // stray commas in oldIE:
                    if (typeof data[i] !== 'undefined') {
                        pt = { series: series };
                        series.pointClass.prototype.applyOptions.apply(
                            pt,
                            [data[i]]
                        );
                        series.updateParallelArrays(pt as any, i);
                    }
                }
            }

            // Forgetting to cast strings to numbers is a common caveat when
            // handling CSV or JSON
            if (yData && isString(yData[0])) {
                error(14, true, chart);
            }

            series.data = [];
            series.options.data = series.userOptions.data = data;

            // destroy old points
            i = oldDataLength;
            while (i--) {
                if (oldData[i] && oldData[i].destroy) {
                    oldData[i].destroy();
                }
            }

            // reset minRange (#878)
            if (xAxis) {
                xAxis.minRange = xAxis.userMinRange;
            }

            // redraw
            series.isDirty = chart.isDirtyBox = true;
            series.isDirtyData = !!oldData;
            animation = false;
        }

        // Typically for pie series, points need to be processed and
        // generated prior to rendering the legend
        if (options.legendType === 'point') {
            this.processData();
            this.generatePoints();
        }

        if (redraw) {
            chart.redraw(animation);
        }
    }

    /**
     * Internal function to sort series data
     *
     * @private
     * @function Highcharts.Series#sortData
     *
     * @param {Array<Highcharts.PointOptionsType>} data
     * Force data grouping.
     *
     * @return {Array<Highcharts.PointOptionsObject>}
     */
    public sortData(
        data: Array<(PointOptions|PointShortOptions)>
    ): Array<PointOptions> {
        const series = this,
            options = series.options,
            dataSorting: SeriesDataSortingOptions = options.dataSorting as any,
            sortKey = dataSorting.sortKey || 'y',
            getPointOptionsObject = function (
                series: Series,
                pointOptions: (PointOptions|PointShortOptions)
            ): PointOptions {
                return (defined(pointOptions) &&
                    series.pointClass.prototype.optionsToObject.call({
                        series: series
                    }, pointOptions)) || {};
            };

        data.forEach(function (pointOptions, i): void {
            data[i] = getPointOptionsObject(series, pointOptions);
            (data[i] as any).index = i;
        }, this);

        // Sorting
        const sortedData: Array<Point> = data.concat().sort((a, b): number => {
            const aValue = getNestedProperty(sortKey, a) as (boolean|number|string);
            const bValue = getNestedProperty(sortKey, b) as (boolean|number|string);
            return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }) as Array<Point>;
        // Set x value depending on the position in the array
        sortedData.forEach(function (point, i): void {
            point.x = i;
        }, this);

        // Set the same x for linked series points if they don't have their
        // own sorting
        if (series.linkedSeries) {
            series.linkedSeries.forEach(function (linkedSeries): void {
                const options = linkedSeries.options,
                    seriesData = options.data as Array<PointOptions>;

                if (
                    (!options.dataSorting ||
                    !options.dataSorting.enabled) &&
                    seriesData
                ) {
                    seriesData.forEach(function (pointOptions, i): void {
                        seriesData[i] = getPointOptionsObject(
                            linkedSeries,
                            pointOptions
                        );

                        if (data[i]) {
                            seriesData[i].x = (data[i] as any).x;
                            seriesData[i].index = i;
                        }
                    });

                    linkedSeries.setData(seriesData, false);
                }
            });
        }

        return data as any;
    }

    /**
     * Internal function to process the data by cropping away unused data
     * points if the series is longer than the crop threshold. This saves
     * computing time for large series.
     *
     * @private
     * @function Highcharts.Series#getProcessedData
     * @param {boolean} [forceExtremesFromAll]
     *        Force getting extremes of a total series data range.
     * @return {Highcharts.SeriesProcessedDataObject}
     */
    public getProcessedData(
        forceExtremesFromAll?: boolean
    ): Series.ProcessedDataObject {
        const series = this,
            xAxis = series.xAxis,
            options = series.options,
            cropThreshold = options.cropThreshold,
            getExtremesFromAll =
                forceExtremesFromAll ||
                series.getExtremesFromAll ||
                options.getExtremesFromAll, // #4599
            isCartesian = series.isCartesian,
            val2lin = xAxis && xAxis.val2lin,
            isLog = !!(xAxis && xAxis.logarithmic);
        let croppedData: Series.CropDataObject,
            cropped,
            cropStart = 0,
            distance,
            closestPointRange,
            i, // loop variable
            xExtremes,
            min,
            max,
            // copied during slice operation:
            processedXData: Array<number> = series.xData as any,
            processedYData: (
                Array<(number|null)>|Array<Array<(number|null)>>
            ) = (series.yData as any),
            throwOnUnsorted = series.requireSorting;
        const dataLength = (processedXData as any).length;

        if (xAxis) {
            // corrected for log axis (#3053)
            xExtremes = xAxis.getExtremes();
            min = xExtremes.min;
            max = xExtremes.max;
        }

        // optionally filter out points outside the plot area
        if (isCartesian &&
            series.sorted &&
            !getExtremesFromAll &&
            (
                !cropThreshold ||
                dataLength > cropThreshold ||
                series.forceCrop
            )
        ) {

            // it's outside current extremes
            if ((processedXData as any)[dataLength - 1] < (min as any) ||
                (processedXData as any)[0] > (max as any)
            ) {
                processedXData = [];
                processedYData = [];

            // only crop if it's actually spilling out
            } else if (
                series.yData && (
                    (processedXData as any)[0] < (min as any) ||
                    (processedXData as any)[dataLength - 1] > (max as any)
                )
            ) {
                croppedData = this.cropData(
                    series.xData as any,
                    series.yData as any,
                    min as any,
                    max as any
                );
                processedXData = croppedData.xData;
                processedYData = croppedData.yData;
                cropStart = croppedData.start;
                cropped = true;
            }
        }


        // Find the closest distance between processed points
        i = (processedXData as any).length || 1;
        while (--i) {
            distance = (
                isLog ?
                    (val2lin((processedXData as any)[i]) -
                    val2lin((processedXData as any)[i - 1])) :
                    ((processedXData as any)[i] -
                    (processedXData as any)[i - 1])
            );

            if (distance > 0 &&
                (
                    typeof closestPointRange === 'undefined' ||
                    distance < closestPointRange
                )
            ) {
                closestPointRange = distance;

            // Unsorted data is not supported by the line tooltip, as well
            // as data grouping and navigation in Stock charts (#725) and
            // width calculation of columns (#1900)
            } else if (distance < 0 && throwOnUnsorted) {
                error(15, false, series.chart);
                throwOnUnsorted = false; // Only once
            }
        }

        return {
            xData: processedXData,
            yData: processedYData,
            cropped: cropped,
            cropStart: cropStart,
            closestPointRange: closestPointRange
        };
    }

    /**
     * Internal function to apply processed data.
     * In Highcharts Stock, this function is extended to provide data grouping.
     *
     * @private
     * @function Highcharts.Series#processData
     * @param {boolean} [force]
     *        Force data grouping.
     * @return {boolean|undefined}
     */
    public processData(force?: boolean): (boolean|undefined) {
        const series = this,
            xAxis = series.xAxis;

        // If the series data or axes haven't changed, don't go through
        // this. Return false to pass the message on to override methods
        // like in data grouping.
        if (series.isCartesian &&
            !series.isDirty &&
            !xAxis.isDirty &&
            !series.yAxis.isDirty &&
            !force
        ) {
            return false;
        }

        const processedData = series.getProcessedData();

        // Record the properties
        series.cropped = processedData.cropped; // undefined or true
        series.cropStart = processedData.cropStart;
        series.processedXData = processedData.xData;
        series.processedYData = processedData.yData;
        series.closestPointRange = series.basePointRange = processedData.closestPointRange;
    }

    /**
     * Iterate over xData and crop values between min and max. Returns
     * object containing crop start/end cropped xData with corresponding
     * part of yData, dataMin and dataMax within the cropped range.
     *
     * @private
     * @function Highcharts.Series#cropData
     * @param {Array<number>} xData
     * @param {Array<number>} yData
     * @param {number} min
     * @param {number} max
     * @param {number} [cropShoulder]
     * @return {Highcharts.SeriesCropDataObject}
     */
    public cropData(
        xData: Array<number>,
        yData: (Array<(number|null)>|Array<Array<(number|null)>>),
        min: number,
        max: number,
        cropShoulder?: number
    ): Series.CropDataObject {
        const dataLength = xData.length;
        let i,
            j,
            cropStart = 0,
            cropEnd = dataLength;

        // line-type series need one point outside
        cropShoulder = pick(cropShoulder, this.cropShoulder);

        // iterate up to find slice start
        for (i = 0; i < dataLength; i++) {
            if (xData[i] >= min) {
                cropStart = Math.max(0, i - (cropShoulder as any));
                break;
            }
        }

        // proceed to find slice end
        for (j = i; j < dataLength; j++) {
            if (xData[j] > max) {
                cropEnd = j + (cropShoulder as any);
                break;
            }
        }

        return {
            xData: xData.slice(cropStart, cropEnd),
            yData: yData.slice(cropStart, cropEnd),
            start: cropStart,
            end: cropEnd
        };
    }

    /**
     * Generate the data point after the data has been processed by cropping
     * away unused points and optionally grouped in Highcharts Stock.
     *
     * @private
     * @function Highcharts.Series#generatePoints
     */
    public generatePoints(): void {
        const series = this,
            options = series.options,
            dataOptions = options.data,
            processedXData = series.processedXData,
            processedYData = series.processedYData,
            PointClass = series.pointClass,
            processedDataLength = (processedXData as any).length,
            cropStart = series.cropStart || 0,
            hasGroupedData = series.hasGroupedData,
            keys = options.keys,
            points = [],
            groupCropStartIndex: number = (
                options.dataGrouping &&
                options.dataGrouping.groupAll ?
                    cropStart :
                    0
            );
        let dataLength,
            cursor,
            point,
            i,
            data = series.data;


        if (!data && !hasGroupedData) {
            const arr = [] as Array<Point>;

            arr.length = (dataOptions as any).length;
            data = series.data = arr;
        }

        if (keys && hasGroupedData) {
            // grouped data has already applied keys (#6590)
            series.options.keys = false as any;
        }

        for (i = 0; i < processedDataLength; i++) {
            cursor = cropStart + i;
            if (!hasGroupedData) {
                point = data[cursor];
                // #970:
                if (
                    !point &&
                    typeof (dataOptions as any)[cursor] !== 'undefined'
                ) {
                    data[cursor] = point = (new PointClass()).init(
                        series,
                        (dataOptions as any)[cursor],
                        (processedXData as any)[i]
                    );
                }
            } else {
                // splat the y data in case of ohlc data array
                point = (new PointClass()).init(
                    series,
                    [(processedXData as any)[i]].concat(
                        splat((processedYData as any)[i])
                    )
                );

                /**
                 * Highcharts Stock only. If a point object is created by data
                 * grouping, it doesn't reflect actual points in the raw
                 * data. In this case, the `dataGroup` property holds
                 * information that points back to the raw data.
                 *
                 * - `dataGroup.start` is the index of the first raw data
                 *   point in the group.
                 *
                 * - `dataGroup.length` is the amount of points in the
                 *   group.
                 *
                 * @product highstock
                 *
                 * @name Highcharts.Point#dataGroup
                 * @type {Highcharts.DataGroupingInfoObject|undefined}
                 */
                point.dataGroup = (series.groupMap as any)[groupCropStartIndex + i];
                if ((point.dataGroup as any).options) {
                    point.options = (point.dataGroup as any).options;
                    extend(point, (point.dataGroup as any).options);
                    // Collision of props and options (#9770)
                    delete point.dataLabels;
                }
            }
            if (point) { // #6279
                /**
                 * Contains the point's index in the `Series.points` array.
                 *
                 * @name Highcharts.Point#index
                 * @type {number}
                 * @readonly
                 */
                // For faster access in Point.update
                point.index = hasGroupedData ? (groupCropStartIndex + i) : cursor;
                points[i] = point;
            }
        }

        // restore keys options (#6590)
        series.options.keys = keys;

        // Hide cropped-away points - this only runs when the number of
        // points is above cropThreshold, or when swithching view from
        // non-grouped data to grouped data (#637)
        if (
            data &&
            (
                processedDataLength !== (dataLength = data.length) ||
                hasGroupedData
            )
        ) {
            for (i = 0; i < dataLength; i++) {
                // when has grouped data, clear all points
                if (i === cropStart && !hasGroupedData) {
                    i += processedDataLength;
                }
                if (data[i]) {
                    data[i].destroyElements();
                    data[i].plotX = void 0; // #1003
                }
            }
        }

        /**
         * Read only. An array containing those values converted to points.
         * In case the series data length exceeds the `cropThreshold`, or if
         * the data is grouped, `series.data` doesn't contain all the
         * points. Also, in case a series is hidden, the `data` array may be
         * empty. To access raw values, `series.options.data` will always be
         * up to date. `Series.data` only contains the points that have been
         * created on demand. To modify the data, use
         * {@link Highcharts.Series#setData} or
         * {@link Highcharts.Point#update}.
         *
         * @see Series.points
         *
         * @name Highcharts.Series#data
         * @type {Array<Highcharts.Point>}
         */
        series.data = data;

        /**
         * An array containing all currently visible point objects. In case
         * of cropping, the cropped-away points are not part of this array.
         * The `series.points` array starts at `series.cropStart` compared
         * to `series.data` and `series.options.data`. If however the series
         * data is grouped, these can't be correlated one to one. To modify
         * the data, use {@link Highcharts.Series#setData} or
         * {@link Highcharts.Point#update}.
         *
         * @name Highcharts.Series#points
         * @type {Array<Highcharts.Point>}
         */
        series.points = points;

        fireEvent(this, 'afterGeneratePoints');
    }

    /**
     * Get current X extremes for the visible data.
     *
     * @private
     * @function Highcharts.Series#getXExtremes
     *
     * @param {Array<number>} xData
     * The data to inspect. Defaults to the current data within the visible
     * range.
     *
     * @return {Highcharts.RangeObject}
     */
    public getXExtremes(xData: Array<number>): RangeSelector.RangeObject {
        return {
            min: arrayMin(xData),
            max: arrayMax(xData)
        };
    }

    /**
     * Calculate Y extremes for the visible data. The result is returned
     * as an object with `dataMin` and `dataMax` properties.
     *
     * @private
     * @function Highcharts.Series#getExtremes
     *
     * @param {Array<number>} [yData]
     * The data to inspect. Defaults to the current data within the visible
     * range.
     * @param {boolean} [forceExtremesFromAll]
     * Force getting extremes of a total series data range.
     *
     * @return {Highcharts.DataExtremesObject}
     */
    public getExtremes(
        yData?: (Array<(number|null)>|Array<Array<(number|null)>>),
        forceExtremesFromAll?: boolean
    ): DataExtremesObject {
        const xAxis = this.xAxis,
            yAxis = this.yAxis,
            xData = this.processedXData || this.xData,
            activeYData = [],
            // Handle X outside the viewed area. This does not work with
            // non-sorted data like scatter (#7639).
            shoulder = this.requireSorting ? this.cropShoulder : 0,
            positiveValuesOnly = yAxis ? yAxis.positiveValuesOnly : false;
            // #2117, need to compensate for log X axis
        let xExtremes,
            validValue,
            withinRange,
            x,
            y: (number|Array<(number|null)>|null),
            i,
            j,
            xMin = 0,
            xMax = 0,
            activeCounter = 0;

        yData = yData || this.stackedYData || this.processedYData || [];
        const yDataLength = yData.length;

        if (xAxis) {
            xExtremes = xAxis.getExtremes();
            xMin = xExtremes.min;
            xMax = xExtremes.max;
        }

        for (i = 0; i < yDataLength; i++) {

            x = (xData as any)[i];
            y = yData[i];

            // For points within the visible range, including the first
            // point outside the visible range (#7061), consider y extremes.
            validValue = (
                (isNumber(y) || isArray(y)) &&
                (((y as any).length || y > 0) || !positiveValuesOnly)
            );
            withinRange = (
                forceExtremesFromAll ||
                this.getExtremesFromAll ||
                this.options.getExtremesFromAll ||
                this.cropped ||
                !xAxis || // for colorAxis support
                (
                    ((xData as any)[i + shoulder] || x) >= xMin &&
                    ((xData as any)[i - shoulder] || x) <= xMax
                )
            );

            if (validValue && withinRange) {

                j = (y as any).length;
                if (j) { // array, like ohlc or range data
                    while (j--) {
                        if (isNumber((y as any)[j])) { // #7380, #11513
                            activeYData[activeCounter++] = (y as any)[j];
                        }
                    }
                } else {
                    activeYData[activeCounter++] = y;
                }
            }
        }

        const dataExtremes = {
            dataMin: arrayMin(activeYData),
            dataMax: arrayMax(activeYData)
        };

        fireEvent(this, 'afterGetExtremes', { dataExtremes });

        return dataExtremes;
    }

    /**
     * Set the current data extremes as `dataMin` and `dataMax` on the
     * Series item. Use this only when the series properties should be
     * updated.
     *
     * @private
     * @function Highcharts.Series#applyExtremes
     */
    public applyExtremes(): DataExtremesObject {
        const dataExtremes = this.getExtremes();

        /**
         * Contains the minimum value of the series' data point. Some series
         * types like `networkgraph` do not support this property as they
         * lack a `y`-value.
         * @name Highcharts.Series#dataMin
         * @type {number|undefined}
         * @readonly
         */
        this.dataMin = dataExtremes.dataMin;

        /**
         * Contains the maximum value of the series' data point. Some series
         * types like `networkgraph` do not support this property as they
         * lack a `y`-value.
         * @name Highcharts.Series#dataMax
         * @type {number|undefined}
         * @readonly
         */
        this.dataMax = dataExtremes.dataMax;

        return dataExtremes;
    }

    /**
     * Find and return the first non null point in the data
     *
     * @private
     * @function Highcharts.Series.getFirstValidPoint
     *
     * @param {Array<Highcharts.PointOptionsType>} data
     * Array of options for points
     *
     * @return {Highcharts.PointOptionsType}
     */
    public getFirstValidPoint(
        data: Array<(PointOptions|PointShortOptions)>
    ): (PointOptions|PointShortOptions) {
        const dataLength = data.length;
        let i = 0,
            firstPoint = null;

        while (firstPoint === null && i < dataLength) {
            firstPoint = data[i];
            i++;
        }

        return firstPoint;
    }

    /**
     * Translate data points from raw data values to chart specific
     * positioning data needed later in the `drawPoints` and `drawGraph`
     * functions. This function can be overridden in plugins and custom
     * series type implementations.
     *
     * @function Highcharts.Series#translate
     *
     * @fires Highcharts.Series#events:translate
     */
    public translate(): void {
        if (!this.processedXData) { // hidden series
            this.processData();
        }
        this.generatePoints();
        const series = this,
            options = series.options,
            stacking = options.stacking,
            xAxis = series.xAxis,
            categories = xAxis.categories,
            enabledDataSorting = series.enabledDataSorting,
            yAxis = series.yAxis,
            points = series.points,
            dataLength = points.length,
            hasModifyValue = !!series.modifyValue,
            pointPlacement = series.pointPlacementToXValue(), // #7860
            dynamicallyPlaced = Boolean(pointPlacement),
            threshold = options.threshold,
            stackThreshold = options.startFromThreshold ? threshold : 0,
            zoneAxis = this.zoneAxis || 'y';
        let i,
            plotX,
            lastPlotX,
            stackIndicator,
            closestPointRangePx = Number.MAX_VALUE;

        /**
         * Plotted coordinates need to be within a limited range. Drawing
         * too far outside the viewport causes various rendering issues
         * (#3201, #3923, #7555).
         * @private
         */
        function limitedRange(val: number): number {
            return clamp(val, -1e5, 1e5);
        }

        // Translate each point
        for (i = 0; i < dataLength; i++) {
            const point = points[i],
                xValue = point.x;
            let pointStack,
                stackValues: (Array<number>|undefined),
                yValue = point.y,
                yBottom = point.low;
            const stack = stacking && yAxis.stacking && yAxis.stacking.stacks[(
                series.negStacks &&
                (yValue as any) <
                (stackThreshold ? 0 : (threshold as any)) ?
                    '-' :
                    ''
            ) + series.stackKey];

            if (
                yAxis.positiveValuesOnly && !yAxis.validatePositiveValue(yValue) ||
                xAxis.positiveValuesOnly && !xAxis.validatePositiveValue(xValue)
            ) {
                point.isNull = true;
            }

            // Get the plotX translation
            point.plotX = plotX = correctFloat( // #5236
                limitedRange((xAxis.translate as any)( // #3923
                    xValue,
                    0,
                    0,
                    0,
                    1,
                    pointPlacement,
                    this.type === 'flags'
                )) // #3923
            );

            // Calculate the bottom y value for stacked series
            if (stacking &&
                series.visible &&
                stack &&
                stack[xValue as any]
            ) {
                stackIndicator = series.getStackIndicator(
                    stackIndicator,
                    xValue as any,
                    series.index as any
                );

                if (!point.isNull) {
                    pointStack = stack[xValue as any];
                    stackValues =
                        pointStack.points[stackIndicator.key as any];
                }
            }

            if (isArray(stackValues)) {
                yBottom = stackValues[0];
                yValue = stackValues[1];

                if (yBottom === stackThreshold &&
                    (stackIndicator as any).key ===
                        (stack as any)[xValue as any].base
                ) {
                    yBottom = pick<number|undefined, number>(
                        (isNumber(threshold) && threshold) as any,
                        yAxis.min as any
                    );
                }

                // #1200, #1232
                if (yAxis.positiveValuesOnly && yBottom <= 0) {
                    yBottom = null as any;
                }

                point.total = point.stackTotal = (pointStack as any).total;
                point.percentage =
                    (pointStack as any).total &&
                    ((point.y as any) / (pointStack as any).total * 100);
                point.stackY = yValue;

                // Place the stack label

                // in case of variwide series (where widths of points are
                // different in most cases), stack labels are positioned
                // wrongly, so the call of the setOffset is omited here and
                // labels are correctly positioned later, at the end of the
                // variwide's translate function (#10962)
                if (!(series as any).irregularWidths) {
                    (pointStack as any).setOffset(
                        series.pointXOffset || 0,
                        series.barW || 0
                    );
                }

            }

            // Set translated yBottom or remove it
            point.yBottom = defined(yBottom) ?
                limitedRange(yAxis.translate(
                    (yBottom as any), 0 as any, 1 as any, 0 as any, 1 as any
                ) as any) :
                null as any;

            // general hook, used for Highcharts Stock compare mode
            if (hasModifyValue) {
                yValue = (series.modifyValue as any)(yValue, point);
            }

            // Set the the plotY value, reset it for redraws
            // #3201
            point.plotY = void 0;
            if (isNumber(yValue)) {
                const translated = yAxis.translate(
                    yValue, false, true, false, true
                );
                if (typeof translated !== 'undefined') {
                    point.plotY = limitedRange(translated);
                }
            }

            point.isInside = this.isPointInside(point);

            // Set client related positions for mouse tracking
            point.clientX = dynamicallyPlaced ?
                correctFloat(xAxis.translate(
                    xValue as any,
                    0 as any,
                    0 as any,
                    0 as any,
                    1 as any,
                    pointPlacement
                ) as any) :
                plotX; // #1514, #5383, #5518

            // Negative points. For bubble charts, this means negative z
            // values (#9728)
            point.negative = (point as any)[zoneAxis] < (
                (options as any)[zoneAxis + 'Threshold'] ||
                threshold ||
                0
            );

            // some API data
            point.category = (
                categories &&
                typeof (categories as any)[point.x as any] !== 'undefined' ?
                    (categories as any)[point.x as any] :
                    point.x
            );

            // Determine auto enabling of markers (#3635, #5099)
            if (!point.isNull && point.visible !== false) {
                if (typeof lastPlotX !== 'undefined') {
                    closestPointRangePx = Math.min(
                        closestPointRangePx,
                        Math.abs(plotX - lastPlotX)
                    );
                }
                lastPlotX = plotX;
            }

            // Find point zone
            point.zone = (this.zones.length && point.getZone() as any);

            // Animate new points with data sorting
            if (!point.graphic && series.group && enabledDataSorting) {
                point.isNew = true;
            }
        }
        series.closestPointRangePx = closestPointRangePx;

        fireEvent(this, 'afterTranslate');
    }

    /**
     * Return the series points with null points filtered out.
     *
     * @function Highcharts.Series#getValidPoints
     *
     * @param {Array<Highcharts.Point>} [points]
     * The points to inspect, defaults to {@link Series.points}.
     *
     * @param {boolean} [insideOnly=false]
     * Whether to inspect only the points that are inside the visible view.
     *
     * @param {boolean} [allowNull=false]
     * Whether to allow null points to pass as valid points.
     *
     * @return {Array<Highcharts.Point>}
     * The valid points.
     */
    public getValidPoints(
        points?: Array<Point>,
        insideOnly?: boolean,
        allowNull?: boolean
    ): Array<Point> {
        const chart = this.chart;

        // #3916, #5029, #5085
        return (points || this.points || []).filter(
            function (point: Point): boolean {
                if (insideOnly && !chart.isInsidePlot(
                    point.plotX as any,
                    point.plotY as any,
                    { inverted: chart.inverted }
                )) {
                    return false;
                }
                return point.visible !== false &&
                    (allowNull || !point.isNull);
            }
        );
    }

    /**
     * Get the clipping for the series. Could be called for a series to
     * initiate animating the clip or to set the final clip (only width
     * and x).
     *
     * @private
     * @function Highcharts.Series#getClip
     *
     * @param  {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     * Initialize the animation.
     *
     * @param  {boolean} [finalBox]
     * Final size for the clip - end state for the animation.
     *
     * @return {Highcharts.Dictionary<number>}
     */
    public getClipBox(
        animation?: (boolean|Partial<AnimationOptions>),
        finalBox?: boolean
    ): Record<string, number> {
        const series = this,
            options = series.options,
            chart = series.chart,
            inverted = chart.inverted,
            xAxis = series.xAxis,
            yAxis = xAxis && series.yAxis,
            scrollablePlotAreaOptions =
                (chart.options.chart as any).scrollablePlotArea || {};
        let clipBox;

        if (animation && options.clip === false && yAxis) {
            // support for not clipped series animation (#10450)
            clipBox = inverted ? {
                y: -chart.chartWidth + yAxis.len + (yAxis.pos as any),
                height: chart.chartWidth,
                width: chart.chartHeight,
                x: -chart.chartHeight + xAxis.len + (xAxis.pos as any)
            } : {
                y: -(yAxis.pos as any),
                height: chart.chartHeight,
                width: chart.chartWidth,
                x: -(xAxis.pos as any)
            };
            // x and width will be changed later when setting for animation
            // initial state in Series.setClip
        } else {
            clipBox = series.clipBox || chart.clipBox;

            if (finalBox) {
                clipBox.width = chart.plotSizeX as any;
                clipBox.x = (chart.scrollablePixelsX || 0) *
                    (scrollablePlotAreaOptions.scrollPositionX || 0);
            }
        }

        return !finalBox ? clipBox : {
            width: clipBox.width,
            x: clipBox.x
        };
    }

    /**
     * Get the shared clip key, creating it if it doesn't exist.
     *
     * @private
     * @function Highcharts.Series#getSharedClipKey
     */
    public getSharedClipKey(animation?: AnimationOptions): string {
        if (this.sharedClipKey) {
            return this.sharedClipKey;
        }

        const sharedClipKey = [
            animation && animation.duration,
            animation && animation.easing,
            animation && animation.defer,
            this.getClipBox(animation).height,
            this.options.xAxis,
            this.options.yAxis
        ].join(',');

        if (this.options.clip !== false || animation) {
            this.sharedClipKey = sharedClipKey;
        }

        return sharedClipKey;
    }

    /**
     * Set the clipping for the series. For animated series it is called
     * twice, first to initiate animating the clip then the second time
     * without the animation to set the final clip.
     *
     * @private
     * @function Highcharts.Series#setClip
     */
    public setClip(animation?: AnimationOptions): void {
        const chart = this.chart,
            options = this.options,
            renderer = chart.renderer,
            inverted = chart.inverted,
            seriesClipBox = this.clipBox,
            clipBox = this.getClipBox(animation),
            sharedClipKey = this.getSharedClipKey(animation); // #4526
        let clipRect = chart.sharedClips[sharedClipKey],
            markerClipRect = chart.sharedClips[sharedClipKey + 'm'];

        if (animation) {
            clipBox.width = 0;
            if (inverted) {
                clipBox.x = chart.plotHeight +
                    (options.clip !== false ? 0 : chart.plotTop);
            }
        }

        // If a clipping rectangle with the same properties is currently
        // present in the chart, use that.
        if (!clipRect) {

            // When animation is set, prepare the initial positions
            if (animation) {
                chart.sharedClips[sharedClipKey + 'm'] = markerClipRect =
                    renderer.clipRect(
                        // include the width of the first marker
                        inverted ? (chart.plotSizeX || 0) + 99 : -99,
                        inverted ? -chart.plotLeft : -chart.plotTop,
                        99,
                        inverted ? chart.chartWidth : chart.chartHeight
                    );


            }
            chart.sharedClips[sharedClipKey] = clipRect = renderer.clipRect(clipBox);

            // Create hashmap for series indexes
            clipRect.count = { length: 0 };

        // When the series is rendered again before starting animating, in
        // compliance to a responsive rule
        } else if (!chart.hasLoaded) {
            clipRect.attr(clipBox);
        }

        if (animation) {
            if (!clipRect.count[this.index]) {
                clipRect.count[this.index] = true;
                clipRect.count.length += 1;
            }
        }


        if (options.clip !== false || animation) {
            (this.group as any).clip(
                animation || seriesClipBox ? clipRect : chart.clipRect
            );
            (this.markerGroup as any).clip(markerClipRect);
        }

        // Remove the shared clipping rectangle when all series are shown
        if (!animation) {
            if (clipRect.count[this.index]) {
                delete clipRect.count[this.index];
                clipRect.count.length -= 1;
            }

            if (clipRect.count.length === 0) {
                if (!seriesClipBox) {
                    chart.sharedClips[sharedClipKey] = clipRect.destroy();
                }
                if (markerClipRect) {
                    chart.sharedClips[sharedClipKey + 'm'] = markerClipRect.destroy();
                }
            }
        }
    }

    /**
     * Animate in the series. Called internally twice. First with the `init`
     * parameter set to true, which sets up the initial state of the
     * animation. Then when ready, it is called with the `init` parameter
     * undefined, in order to perform the actual animation. After the
     * second run, the function is removed.
     *
     * @function Highcharts.Series#animate
     *
     * @param {boolean} [init]
     * Initialize the animation.
     */
    public animate(init?: boolean): void {
        const series = this,
            chart = series.chart,
            animation = animObject(series.options.animation),
            sharedClipKey = this.sharedClipKey;

        // Initialize the animation. Set up the clipping rectangle.
        if (init) {

            series.setClip(animation);

        // Run the animation
        } else if (sharedClipKey) {
            const clipRect = chart.sharedClips[sharedClipKey];
            const markerClipRect = chart.sharedClips[sharedClipKey + 'm'];

            const finalBox = series.getClipBox(animation, true);

            if (clipRect) {
                clipRect.animate(finalBox, animation);
            }
            if (markerClipRect) {
                markerClipRect.animate({
                    width: finalBox.width + 99,
                    x: finalBox.x - (chart.inverted ? 0 : 99)
                }, animation);
            }
        }
    }

    /**
     * This runs after animation to land on the final plot clipping.
     *
     * @private
     * @function Highcharts.Series#afterAnimate
     *
     * @fires Highcharts.Series#event:afterAnimate
     */
    public afterAnimate(): void {
        this.setClip();
        fireEvent(this, 'afterAnimate');
        this.finishedAnimating = true;
    }

    /**
     * Draw the markers for line-like series types, and columns or other
     * graphical representation for {@link Point} objects for other series
     * types. The resulting element is typically stored as
     * {@link Point.graphic}, and is created on the first call and updated
     * and moved on subsequent calls.
     *
     * @function Highcharts.Series#drawPoints
     */
    public drawPoints(): void {
        const series = this,
            points = series.points,
            chart = series.chart,
            options = series.options,
            seriesMarkerOptions = options.marker,
            markerGroup = (
                (series as any)[series.specialGroup as any] ||
                series.markerGroup
            ),
            xAxis = series.xAxis,
            globallyEnabled = pick(
                (seriesMarkerOptions as any).enabled,
                !xAxis || xAxis.isRadial ? true : null,
                // Use larger or equal as radius is null in bubbles (#6321)
                (series.closestPointRangePx as any) >= (
                    (seriesMarkerOptions as any).enabledThreshold *
                    (seriesMarkerOptions as any).radius
                )
            );
        let i,
            point,
            graphic,
            verb,
            pointMarkerOptions,
            hasPointMarker,
            markerAttribs;

        if (
            (seriesMarkerOptions as any).enabled !== false ||
            series._hasPointMarkers
        ) {

            for (i = 0; i < points.length; i++) {
                point = points[i];
                graphic = point.graphic;
                verb = graphic ? 'animate' : 'attr';
                pointMarkerOptions = point.marker || {};
                hasPointMarker = !!point.marker;
                const shouldDrawMarker = (
                    (
                        globallyEnabled &&
                        typeof pointMarkerOptions.enabled === 'undefined'
                    ) || pointMarkerOptions.enabled
                ) && !point.isNull && point.visible !== false;

                // only draw the point if y is defined
                if (shouldDrawMarker) {
                    // Shortcuts
                    const symbol = pick(
                        pointMarkerOptions.symbol, series.symbol, 'rect' as SymbolKey
                    );

                    markerAttribs = series.markerAttribs(
                        point,
                        (point.selected && 'select') as any
                    );

                    // Set starting position for point sliding animation.
                    if (series.enabledDataSorting) {
                        point.startXPos = xAxis.reversed ?
                            -(markerAttribs.width || 0) :
                            xAxis.width;
                    }

                    const isInside = point.isInside !== false;
                    if (graphic) { // update
                        // Since the marker group isn't clipped, each
                        // individual marker must be toggled
                        graphic[isInside ? 'show' : 'hide'](isInside)
                            .animate(markerAttribs);

                    } else if (
                        isInside &&
                        ((markerAttribs.width || 0) > 0 || point.hasImage)
                    ) {

                        /**
                         * The graphic representation of the point.
                         * Typically this is a simple shape, like a `rect`
                         * for column charts or `path` for line markers, but
                         * for some complex series types like boxplot or 3D
                         * charts, the graphic may be a `g` element
                         * containing other shapes. The graphic is generated
                         * the first time {@link Series#drawPoints} runs,
                         * and updated and moved on subsequent runs.
                         *
                         * @name Point#graphic
                         * @type {SVGElement}
                         */
                        point.graphic = graphic = chart.renderer
                            .symbol(
                                symbol,
                                markerAttribs.x,
                                markerAttribs.y,
                                markerAttribs.width,
                                markerAttribs.height,
                                hasPointMarker ?
                                    pointMarkerOptions :
                                    seriesMarkerOptions
                            )
                            .add(markerGroup);
                        // Sliding animation for new points
                        if (
                            series.enabledDataSorting &&
                            chart.hasRendered
                        ) {
                            graphic.attr({
                                x: point.startXPos
                            });
                            verb = 'animate';
                        }
                    }

                    if (graphic && verb === 'animate') { // update
                        // Since the marker group isn't clipped, each
                        // individual marker must be toggled
                        graphic[isInside ? 'show' : 'hide'](isInside)
                            .animate(markerAttribs);

                    }

                    // Presentational attributes
                    if (graphic && !chart.styledMode) {
                        graphic[verb](
                            series.pointAttribs(
                                point,
                                (point.selected && 'select') as any
                            )
                        );
                    }

                    if (graphic) {
                        graphic.addClass(point.getClassName(), true);
                    }

                } else if (graphic) {
                    point.graphic = graphic.destroy(); // #1269
                }
            }
        }
    }

    /**
     * Get non-presentational attributes for a point. Used internally for
     * both styled mode and classic. Can be overridden for different series
     * types.
     *
     * @see Series#pointAttribs
     *
     * @function Highcharts.Series#markerAttribs
     *
     * @param {Highcharts.Point} point
     * The Point to inspect.
     *
     * @param {string} [state]
     * The state, can be either `hover`, `select` or undefined.
     *
     * @return {Highcharts.SVGAttributes}
     * A hash containing those attributes that are not settable from CSS.
     */
    public markerAttribs(
        point: Point,
        state?: StatesOptionsKey
    ): SVGAttributes {
        const seriesOptions = this.options,
            seriesMarkerOptions = seriesOptions.marker,
            pointMarkerOptions = point.marker || {},
            symbol = (
                pointMarkerOptions.symbol ||
                (seriesMarkerOptions as any).symbol
            );
        let seriesStateOptions: SeriesStateHoverOptions,
            pointStateOptions: PointStateHoverOptions,
            radius = pick(
                pointMarkerOptions.radius,
                (seriesMarkerOptions as any).radius
            );

        // Handle hover and select states
        if (state) {
            seriesStateOptions = (seriesMarkerOptions as any).states[state];
            pointStateOptions = pointMarkerOptions.states &&
                (pointMarkerOptions.states as any)[state];

            radius = pick(
                pointStateOptions && pointStateOptions.radius,
                seriesStateOptions && seriesStateOptions.radius,
                radius + (
                    seriesStateOptions && seriesStateOptions.radiusPlus ||
                    0
                )
            );
        }

        point.hasImage = symbol && symbol.indexOf('url') === 0;

        if (point.hasImage) {
            radius = 0; // and subsequently width and height is not set
        }
        const attribs: SVGAttributes = {
            // Math.floor for #1843:
            x: seriesOptions.crisp ?
                Math.floor(point.plotX as any - radius) :
                (point.plotX as any) - radius,
            y: (point.plotY as any) - radius
        };

        if (radius) {
            attribs.width = attribs.height = 2 * radius;
        }

        return attribs;
    }

    /**
     * Internal function to get presentational attributes for each point.
     * Unlike {@link Series#markerAttribs}, this function should return
     * those attributes that can also be set in CSS. In styled mode,
     * `pointAttribs` won't be called.
     *
     * @private
     * @function Highcharts.Series#pointAttribs
     *
     * @param {Highcharts.Point} [point]
     * The point instance to inspect.
     *
     * @param {string} [state]
     * The point state, can be either `hover`, `select` or 'normal'. If
     * undefined, normal state is assumed.
     *
     * @return {Highcharts.SVGAttributes}
     * The presentational attributes to be set on the point.
     */
    public pointAttribs(
        point?: Point,
        state?: StatesOptionsKey
    ): SVGAttributes {
        const seriesMarkerOptions = this.options.marker,
            pointOptions = point && point.options,
            pointMarkerOptions = (
                (pointOptions && pointOptions.marker) || {}
            ),
            pointColorOption = pointOptions && pointOptions.color,
            pointColor = point && point.color,
            zoneColor = point && point.zone && point.zone.color;
        let seriesStateOptions,
            pointStateOptions,
            color: (ColorType|undefined) = this.color,
            fill,
            stroke,
            strokeWidth = pick(
                pointMarkerOptions.lineWidth,
                (seriesMarkerOptions as any).lineWidth
            ),
            opacity = 1;

        color = (
            pointColorOption ||
            zoneColor ||
            pointColor ||
            color
        );

        fill = (
            pointMarkerOptions.fillColor ||
            (seriesMarkerOptions as any).fillColor ||
            color
        );
        stroke = (
            pointMarkerOptions.lineColor ||
            (seriesMarkerOptions as any).lineColor ||
            color
        );

        // Handle hover and select states
        state = state || 'normal';
        if (state) {
            seriesStateOptions = (seriesMarkerOptions as any).states[state];
            pointStateOptions = (
                pointMarkerOptions.states &&
                (pointMarkerOptions.states as any)[state]
            ) || {};
            strokeWidth = pick(
                pointStateOptions.lineWidth,
                seriesStateOptions.lineWidth,
                strokeWidth + pick(
                    pointStateOptions.lineWidthPlus,
                    seriesStateOptions.lineWidthPlus,
                    0
                )
            );
            fill = (
                pointStateOptions.fillColor ||
                seriesStateOptions.fillColor ||
                fill
            );
            stroke = (
                pointStateOptions.lineColor ||
                seriesStateOptions.lineColor ||
                stroke
            );

            opacity = pick(
                pointStateOptions.opacity,
                seriesStateOptions.opacity,
                opacity
            );
        }

        return {
            'stroke': stroke,
            'stroke-width': strokeWidth,
            'fill': fill,
            'opacity': opacity
        };
    }

    /**
     * Clear DOM objects and free up memory.
     *
     * @private
     * @function Highcharts.Series#destroy
     *
     * @fires Highcharts.Series#event:destroy
     */
    public destroy(keepEventsForUpdate?: boolean): void {

        const series = this,
            chart = series.chart,
            issue134 = /AppleWebKit\/533/.test(win.navigator.userAgent),
            data = series.data || [];
        let destroy: ('hide'|'destroy'),
            i,
            point,
            axis;

        // add event hook
        fireEvent(series, 'destroy');

        // remove events
        this.removeEvents(keepEventsForUpdate);

        // erase from axes
        (series.axisTypes || []).forEach(function (AXIS: string): void {
            axis = (series as any)[AXIS];
            if (axis && axis.series) {
                erase(axis.series, series);
                axis.isDirty = axis.forceRedraw = true;
            }
        });

        // remove legend items
        if (series.legendItem) {
            series.chart.legend.destroyItem(series);
        }

        // destroy all points with their elements
        i = data.length;
        while (i--) {
            point = data[i];
            if (point && point.destroy) {
                point.destroy();
            }
        }

        if (series.clips) {
            series.clips.forEach((clip): void => clip.destroy());
        }

        // Clear the animation timeout if we are destroying the series
        // during initial animation
        U.clearTimeout(series.animationTimeout as any);

        // Destroy all SVGElements associated to the series
        objectEach(series, function (val: any, prop: string): void {
            // Survive provides a hook for not destroying
            if (val instanceof SVGElement && !val.survive) {

                // issue 134 workaround
                destroy = issue134 && prop === 'group' ?
                    'hide' :
                    'destroy';

                val[destroy]();
            }
        });

        // remove from hoverSeries
        if (chart.hoverSeries === series) {
            chart.hoverSeries = void 0;
        }
        erase(chart.series, series);
        chart.orderSeries();

        // clear all members
        objectEach(series, function (val: any, prop: string): void {
            if (!keepEventsForUpdate || prop !== 'hcEvents') {
                delete (series as any)[prop];
            }
        });
    }

    /**
     * Clip the graphs into zones for colors and styling.
     *
     * @private
     * @function Highcharts.Series#applyZones
     */
    public applyZones(): void {
        const series = this,
            chart = this.chart,
            renderer = chart.renderer,
            zones = this.zones,
            clips = (this.clips || []) as Array<SVGElement>,
            graph = this.graph,
            area = this.area,
            chartSizeMax = Math.max(chart.chartWidth, chart.chartHeight),
            axis: Axis = (this as any)[
                (this.zoneAxis || 'y') + 'Axis'
            ],
            inverted = chart.inverted;
        let translatedFrom,
            translatedTo: (number|undefined),
            clipAttr: Record<string, number>,
            extremes: RangeSelector.RangeObject,
            reversed: (boolean|undefined),
            horiz: (boolean|undefined),
            pxRange: number,
            pxPosMin: number,
            pxPosMax: number,
            zoneArea: SVGElement,
            zoneGraph: SVGElement,
            ignoreZones = false;

        if (
            zones.length &&
            (graph || area) &&
            axis &&
            typeof axis.min !== 'undefined'
        ) {
            reversed = axis.reversed;
            horiz = axis.horiz;
            // The use of the Color Threshold assumes there are no gaps
            // so it is safe to hide the original graph and area
            // unless it is not waterfall series, then use showLine property
            // to set lines between columns to be visible (#7862)
            if (graph && !this.showLine) {
                graph.hide();
            }
            if (area) {
                area.hide();
            }

            // Create the clips
            extremes = axis.getExtremes();
            zones.forEach(function (threshold, i): void {

                translatedFrom = reversed ?
                    (horiz ? chart.plotWidth : 0) :
                    (horiz ? 0 : (axis.toPixels(extremes.min) || 0));

                translatedFrom = clamp(
                    pick(translatedTo, translatedFrom),
                    0,
                    chartSizeMax
                );
                translatedTo = clamp(
                    Math.round(
                        axis.toPixels(
                            pick(threshold.value, extremes.max),
                            true
                        ) || 0
                    ),
                    0,
                    chartSizeMax
                );

                if (ignoreZones) {
                    translatedFrom = translatedTo =
                        axis.toPixels(extremes.max);
                }

                pxRange = Math.abs(translatedFrom - translatedTo);
                pxPosMin = Math.min(translatedFrom, translatedTo);
                pxPosMax = Math.max(translatedFrom, translatedTo);
                if (axis.isXAxis) {
                    clipAttr = {
                        x: inverted ? pxPosMax : pxPosMin,
                        y: 0,
                        width: pxRange,
                        height: chartSizeMax
                    };
                    if (!horiz) {
                        clipAttr.x = chart.plotHeight - clipAttr.x;
                    }
                } else {
                    clipAttr = {
                        x: 0,
                        y: inverted ? pxPosMax : pxPosMin,
                        width: chartSizeMax,
                        height: pxRange
                    };
                    if (horiz) {
                        clipAttr.y = chart.plotWidth - clipAttr.y;
                    }
                }

                // VML SUPPPORT
                if (inverted && renderer.isVML) {
                    if (axis.isXAxis) {
                        clipAttr = {
                            x: 0,
                            y: reversed ? pxPosMin : pxPosMax,
                            height: clipAttr.width,
                            width: chart.chartWidth
                        };
                    } else {
                        clipAttr = {
                            x: (
                                clipAttr.y -
                                chart.plotLeft -
                                chart.spacingBox.x
                            ),
                            y: 0,
                            width: clipAttr.height,
                            height: chart.chartHeight
                        };
                    }
                }
                // END OF VML SUPPORT

                if (clips[i]) {
                    clips[i].animate(clipAttr);
                } else {
                    clips[i] = (renderer.clipRect as any)(clipAttr);
                }

                // when no data, graph zone is not applied and after setData
                // clip was ignored. As a result, it should be applied each
                // time.
                zoneArea = (series as any)['zone-area-' + i];
                zoneGraph = (series as any)['zone-graph-' + i];

                if (graph && zoneGraph) {
                    zoneGraph.clip(clips[i]);
                }

                if (area && zoneArea) {
                    zoneArea.clip(clips[i]);
                }

                // if this zone extends out of the axis, ignore the others
                ignoreZones = (threshold.value as any) > extremes.max;

                // Clear translatedTo for indicators
                if (series.resetZones && translatedTo === 0) {
                    translatedTo = void 0;
                }
            });
            this.clips = clips;
        } else if (series.visible) {
            // If zones were removed, restore graph and area
            if (graph) {
                graph.show(true);
            }
            if (area) {
                area.show(true);
            }
        }
    }

    /**
     * Initialize and perform group inversion on series.group and
     * series.markerGroup.
     *
     * @private
     * @function Highcharts.Series#invertGroups
     */
    public invertGroups(inverted?: boolean): void {
        const series = this,
            chart = series.chart;

        /**
         * @private
         */
        function setInvert(): void {
            ['group', 'markerGroup'].forEach(function (
                groupName: string
            ): void {
                if ((series as any)[groupName]) {

                    // VML/HTML needs explicit attributes for flipping
                    if (chart.renderer.isVML) {
                        (series as any)[groupName].attr({
                            width: series.yAxis.len,
                            height: series.xAxis.len
                        });
                    }

                    (series as any)[groupName].width = series.yAxis.len;
                    (series as any)[groupName].height = series.xAxis.len;
                    // If inverted polar, don't invert series group
                    (series as any)[groupName].invert(
                        series.isRadialSeries ? false : inverted
                    );
                }
            });
        }

        // Pie, go away (#1736)
        if (!series.xAxis) {
            return;
        }

        // A fixed size is needed for inversion to work
        series.eventsToUnbind.push(addEvent(chart, 'resize', setInvert));

        // Do it now
        (setInvert as any)();

        // On subsequent render and redraw, just do setInvert without
        // setting up events again
        series.invertGroups = setInvert;
    }

    /**
     * General abstraction for creating plot groups like series.group,
     * series.dataLabelsGroup and series.markerGroup. On subsequent calls,
     * the group will only be adjusted to the updated plot size.
     *
     * @private
     * @function Highcharts.Series#plotGroup
     */
    public plotGroup(
        prop: string,
        name: string,
        visibility: 'hidden'|'inherit'|'visible',
        zIndex?: number,
        parent?: SVGElement
    ): SVGElement {
        let group = (this as any)[prop];

        const isNew = !group,
            attrs: SVGAttributes = {
                visibility,
                zIndex: zIndex || 0.1 // IE8 and pointer logic use this
            };

        // Avoid setting undefined opacity, or in styled mode
        if (
            typeof this.opacity !== 'undefined' &&
            !this.chart.styledMode && this.state !== 'inactive' // #13719
        ) {
            attrs.opacity = this.opacity;
        }

        // Generate it on first call
        if (isNew) {

            (this as any)[prop] = group = this.chart.renderer
                .g()
                .add(parent);

        }

        // Add the class names, and replace existing ones as response to
        // Series.update (#6660)
        group.addClass(
            (
                'highcharts-' + name +
                ' highcharts-series-' + this.index +
                ' highcharts-' + this.type + '-series ' +
                (
                    defined(this.colorIndex) ?
                        'highcharts-color-' + this.colorIndex + ' ' :
                        ''
                ) +
                (this.options.className || '') +
                (
                    group.hasClass('highcharts-tracker') ?
                        ' highcharts-tracker' :
                        ''
                )
            ),
            true
        );

        // Place it on first and subsequent (redraw) calls
        group.attr(attrs)[isNew ? 'attr' : 'animate'](
            this.getPlotBox()
        );

        return group;
    }

    /**
     * Get the translation and scale for the plot area of this series.
     *
     * @function Highcharts.Series#getPlotBox
     *
     * @return {Highcharts.SeriesPlotBoxObject}
     */
    public getPlotBox(): Series.PlotBoxObject {
        const chart = this.chart;
        let xAxis = this.xAxis,
            yAxis = this.yAxis;

        // Swap axes for inverted (#2339)
        if (chart.inverted) {
            xAxis = yAxis;
            yAxis = this.xAxis;
        }
        return {
            translateX: xAxis ? xAxis.left : chart.plotLeft,
            translateY: yAxis ? yAxis.top : chart.plotTop,
            scaleX: 1, // #1623
            scaleY: 1
        };
    }

    /**
     * Removes the event handlers attached previously with addEvents.
     * @private
     * @function Highcharts.Series#removeEvents
     */
    public removeEvents(keepEventsForUpdate?: boolean): void {
        const series = this;

        if (!keepEventsForUpdate) {
            // remove all events
            removeEvent(series);
        }

        if (series.eventsToUnbind.length) {
            // remove only internal events for proper update
            // #12355 - solves problem with multiple destroy events
            series.eventsToUnbind.forEach(function (
                unbind: Function
            ): void {
                unbind();
            });
            series.eventsToUnbind.length = 0;
        }
    }

    /**
     * Render the graph and markers. Called internally when first rendering
     * and later when redrawing the chart. This function can be extended in
     * plugins, but normally shouldn't be called directly.
     *
     * @function Highcharts.Series#render
     *
     * @fires Highcharts.Series#event:afterRender
     */
    public render(): void {
        const series = this,
            chart = series.chart,
            options = series.options,
            animOptions = animObject(options.animation),
            visibility: 'hidden'|'inherit'|'visible' = series.visible ?
                'inherit' : 'hidden', // #2597
            zIndex = options.zIndex,
            hasRendered = series.hasRendered,
            chartSeriesGroup = chart.seriesGroup,
            inverted = chart.inverted;
        // Animation doesn't work in IE8 quirks when the group div is
        // hidden, and looks bad in other oldIE
        let animDuration = (
            !series.finishedAnimating &&
            chart.renderer.isSVG &&
            animOptions.duration
        );

        fireEvent(this, 'render');

        // the group
        const group = series.plotGroup(
            'group',
            'series',
            visibility,
            zIndex as any,
            chartSeriesGroup as any
        );

        series.markerGroup = series.plotGroup(
            'markerGroup',
            'markers',
            visibility,
            zIndex as any,
            chartSeriesGroup as any
        );

        // initiate the animation
        if (animDuration && series.animate) {
            series.animate(true);
        }

        // SVGRenderer needs to know this before drawing elements (#1089,
        // #1795)
        group.inverted = pick(series.invertible, series.isCartesian) ?
            inverted : false;

        // Draw the graph if any
        if ((series as any).drawGraph) {
            (series as any).drawGraph();
            series.applyZones();
        }

        // Draw the points
        if (series.visible) {
            series.drawPoints();
        }

        /* series.points.forEach(function (point) {
            if (point.redraw) {
                point.redraw();
            }
        }); */

        // Draw the data labels
        if (series.drawDataLabels) {
            series.drawDataLabels();
        }

        // In pie charts, slices are added to the DOM, but actual rendering
        // is postponed until labels reserved their space
        if (series.redrawPoints) {
            series.redrawPoints();
        }

        // draw the mouse tracking area
        if (
            series.drawTracker &&
            series.options.enableMouseTracking !== false
        ) {
            series.drawTracker();
        }

        // Handle inverted series and tracker groups
        series.invertGroups(inverted);

        // Initial clipping, must be defined after inverting groups for VML.
        // Applies to columns etc. (#3839).
        if (
            options.clip !== false &&
            !series.sharedClipKey &&
            !hasRendered
        ) {
            group.clip(chart.clipRect);
        }

        // Run the animation
        if (animDuration && series.animate) {
            series.animate();
        }

        // Call the afterAnimate function on animation complete (but don't
        // overwrite the animation.complete option which should be available
        // to the user).
        if (!hasRendered) {
            // Additional time if defer is defined before afterAnimate
            // will be triggered
            if (animDuration && animOptions.defer) {
                animDuration += animOptions.defer;
            }
            series.animationTimeout = syncTimeout(function (): void {
                series.afterAnimate();
            }, animDuration || 0);
        }

        // Means data is in accordance with what you see
        series.isDirty = false;

        // (See #322) series.isDirty = series.isDirtyData = false; // means
        // data is in accordance with what you see
        series.hasRendered = true;

        fireEvent(series, 'afterRender');
    }

    /**
     * Redraw the series. This function is called internally from
     * `chart.redraw` and normally shouldn't be called directly.
     * @private
     * @function Highcharts.Series#redraw
     */
    public redraw(): void {
        const series = this,
            chart = series.chart,
            // cache it here as it is set to false in render, but used after
            wasDirty = series.isDirty || series.isDirtyData,
            group = series.group,
            xAxis = series.xAxis,
            yAxis = series.yAxis;

        // reposition on resize
        if (group) {
            if (chart.inverted) {
                group.attr({
                    width: chart.plotWidth,
                    height: chart.plotHeight
                });
            }

            group.animate({
                translateX: pick(xAxis && xAxis.left, chart.plotLeft),
                translateY: pick(yAxis && yAxis.top, chart.plotTop)
            });
        }

        series.translate();
        series.render();
        if (wasDirty) { // #3868, #3945
            delete this.kdTree;
        }
    }

    /**
     * Find the nearest point from a pointer event. This applies to series that
     * use k-d-trees to get the nearest point. Native pointer events must be
     * normalized using `Pointer.normalize`, that adds `chartX` and `chartY`
     * properties.
     *
     * @sample highcharts/demo/synchronized-charts
     *         Synchronized charts with tooltips
     *
     * @function Highcharts.Series#searchPoint
     *
     * @param {Highcharts.PointerEvent} e
     *        The normalized pointer event
     * @param {boolean} [compareX=false]
     *        Search only by the X value, not Y
     *
     * @return {Point|undefined}
     *        The closest point to the pointer event
     */
    public searchPoint(
        e: PointerEvent,
        compareX?: boolean
    ): (Point|undefined) {
        const series = this,
            xAxis = series.xAxis,
            yAxis = series.yAxis,
            inverted = series.chart.inverted;

        return this.searchKDTree({
            clientX: inverted ?
                xAxis.len - e.chartY + (xAxis.pos as any) :
                e.chartX - (xAxis.pos as any),
            plotY: inverted ?
                yAxis.len - e.chartX + (yAxis.pos as any) :
                e.chartY - (yAxis.pos as any)
        }, compareX, e);
    }

    /**
     * Build the k-d-tree that is used by mouse and touch interaction to get
     * the closest point. Line-like series typically have a one-dimensional
     * tree where points are searched along the X axis, while scatter-like
     * series typically search in two dimensions, X and Y.
     *
     * @private
     * @function Highcharts.Series#buildKDTree
     */
    public buildKDTree(e?: PointerEvent): void {

        // Prevent multiple k-d-trees from being built simultaneously
        // (#6235)
        this.buildingKdTree = true;

        const series = this,
            dimensions = (series.options.findNearestPointBy as any)
                .indexOf('y') > -1 ? 2 : 1;

        /**
         * Internal function
         * @private
         */
        function _kdtree(
            points: Array<Point>,
            depth: number,
            dimensions: number
        ): (KDNode|undefined) {
            const length = points && points.length;
            let axis: string,
                median;

            if (length) {

                // alternate between the axis
                axis = series.kdAxisArray[depth % dimensions];

                // sort point array
                points.sort(function (a, b): number {
                    return (a as any)[axis] - (b as any)[axis];
                });

                median = Math.floor(length / 2);

                // build and return nod
                return {
                    point: points[median],
                    left: _kdtree(
                        points.slice(0, median), depth + 1, dimensions
                    ),
                    right: _kdtree(
                        points.slice(median + 1), depth + 1, dimensions
                    )
                };

            }
        }

        /**
         * Start the recursive build process with a clone of the points
         * array and null points filtered out. (#3873)
         * @private
         */
        function startRecursive(): void {
            series.kdTree = _kdtree(
                series.getValidPoints(
                    null as any,
                    // For line-type series restrict to plot area, but
                    // column-type series not (#3916, #4511)
                    !series.directTouch
                ),
                dimensions,
                dimensions
            );
            series.buildingKdTree = false;
        }
        delete series.kdTree;

        // For testing tooltips, don't build async. Also if touchstart, we
        // may be dealing with click events on mobile, so don't delay
        // (#6817).
        syncTimeout(
            startRecursive,
            series.options.kdNow || (e && e.type === 'touchstart') ? 0 : 1
        );
    }

    /**
     * @private
     * @function Highcharts.Series#searchKDTree
     */
    public searchKDTree(
        point: KDPointSearchObject,
        compareX?: boolean,
        e?: PointerEvent
    ): (Point|undefined) {
        const series = this,
            kdX = this.kdAxisArray[0],
            kdY = this.kdAxisArray[1],
            kdComparer = compareX ? 'distX' : 'dist',
            kdDimensions = (series.options.findNearestPointBy as any)
                .indexOf('y') > -1 ? 2 : 1;

        /**
         * Set the one and two dimensional distance on the point object.
         * @private
         */
        function setDistance(
            p1: KDPointSearchObject,
            p2: Point
        ): void {
            const x = (defined((p1 as any)[kdX]) &&
                    defined((p2 as any)[kdX])) ?
                    Math.pow((p1 as any)[kdX] - (p2 as any)[kdX], 2) :
                    null,
                y = (defined((p1 as any)[kdY]) &&
                    defined((p2 as any)[kdY])) ?
                    Math.pow((p1 as any)[kdY] - (p2 as any)[kdY], 2) :
                    null,
                r = (x || 0) + (y || 0);

            p2.dist = defined(r) ? Math.sqrt(r) : Number.MAX_VALUE;
            p2.distX = defined(x) ? Math.sqrt(x as any) : Number.MAX_VALUE;
        }

        /**
         * @private
         */
        function _search(
            search: KDPointSearchObject,
            tree: KDNode,
            depth: number,
            dimensions: number
        ): Point {
            const point = tree.point,
                axis = series.kdAxisArray[depth % dimensions];
            let nPoint1,
                nPoint2,
                ret = point;

            setDistance(search, point);

            // Pick side based on distance to splitting point
            const tdist = (search as any)[axis] - (point as any)[axis],
                sideA = tdist < 0 ? 'left' : 'right',
                sideB = tdist < 0 ? 'right' : 'left';

            // End of tree
            if (tree[sideA]) {
                nPoint1 = _search(
                    search, tree[sideA] as any, depth + 1, dimensions
                );

                ret = (
                    (nPoint1 as any)[kdComparer] <
                    (ret as any)[kdComparer] ?
                        nPoint1 :
                        point
                );
            }
            if (tree[sideB]) {
                // compare distance to current best to splitting point to
                // decide wether to check side B or not
                if (Math.sqrt(tdist * tdist) < (ret as any)[kdComparer]) {
                    nPoint2 = _search(
                        search,
                        tree[sideB] as any,
                        depth + 1,
                        dimensions
                    );
                    ret = (
                        (nPoint2 as any)[kdComparer] <
                        (ret as any)[kdComparer] ?
                            nPoint2 :
                            ret
                    );
                }
            }

            return ret;
        }

        if (!this.kdTree && !this.buildingKdTree) {
            this.buildKDTree(e);
        }

        if (this.kdTree) {
            return _search(point, this.kdTree, kdDimensions, kdDimensions);
        }
    }

    /**
     * @private
     * @function Highcharts.Series#pointPlacementToXValue
     */
    public pointPlacementToXValue(): number {
        const {
            options: {
                pointPlacement,
                pointRange
            },
            xAxis: axis
        } = this;

        let factor = pointPlacement;
        // Point placement is relative to each series pointRange (#5889)
        if (factor === 'between') {
            factor = axis.reversed ? -0.5 : 0.5; // #11955
        }

        return isNumber(factor) ?
            factor * (pointRange || axis.pointRange) :
            0;
    }

    /**
     * @private
     * @function Highcharts.Series#isPointInside
     */
    public isPointInside(point: (Record<string, number>|Point)): boolean {
        const isInside =
            typeof point.plotY !== 'undefined' &&
            typeof point.plotX !== 'undefined' &&
            point.plotY >= 0 &&
            point.plotY <= this.yAxis.len && // #3519
            point.plotX >= 0 &&
            point.plotX <= this.xAxis.len;

        return isInside;
    }

    /**
     * Draw the tracker object that sits above all data labels and markers to
     * track mouse events on the graph or points. For the line type charts
     * the tracker uses the same graphPath, but with a greater stroke width
     * for better control.
     * @private
     */
    public drawTracker(): void {
        const series = this,
            options = series.options,
            trackByArea = options.trackByArea,
            trackerPath = ([] as SVGPath).concat(
                trackByArea ?
                    (series.areaPath as any) :
                    (series.graphPath as any)
            ),
            // trackerPathLength = trackerPath.length,
            chart = series.chart,
            pointer = chart.pointer,
            renderer = chart.renderer,
            snap = (chart.options.tooltip as any).snap,
            tracker = series.tracker,
            onMouseOver = function (e: PointerEvent): void {
                if (chart.hoverSeries !== series) {
                    series.onMouseOver();
                }
            },
            /*
             * Empirical lowest possible opacities for TRACKER_FILL for an
             * element to stay invisible but clickable
             * IE6: 0.002
             * IE7: 0.002
             * IE8: 0.002
             * IE9: 0.00000000001 (unlimited)
             * IE10: 0.0001 (exporting only)
             * FF: 0.00000000001 (unlimited)
             * Chrome: 0.000001
             * Safari: 0.000001
             * Opera: 0.00000000001 (unlimited)
             */
            TRACKER_FILL = 'rgba(192,192,192,' + (svg ? 0.0001 : 0.002) + ')';
        let i: number;

        // Draw the tracker
        if (tracker) {
            tracker.attr({ d: trackerPath });
        } else if (series.graph) { // create

            series.tracker = renderer.path(trackerPath)
                .attr({
                    visibility: series.visible ? 'visible' : 'hidden',
                    zIndex: 2
                })
                .addClass(
                    trackByArea ?
                        'highcharts-tracker-area' :
                        'highcharts-tracker-line'
                )
                .add(series.group);

            if (!chart.styledMode) {
                (series.tracker as any).attr({
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round', // #1225
                    stroke: TRACKER_FILL,
                    fill: trackByArea ? TRACKER_FILL : 'none',
                    'stroke-width': series.graph.strokeWidth() +
                        (trackByArea ? 0 : 2 * snap)
                });
            }

            // The tracker is added to the series group, which is clipped, but
            // is covered by the marker group. So the marker group also needs to
            // capture events.
            [
                series.tracker,
                series.markerGroup,
                series.dataLabelsGroup
            ].forEach(function (
                tracker?: SVGElement
            ): void {
                if (tracker) {
                    tracker.addClass('highcharts-tracker')
                        .on('mouseover', onMouseOver)
                        .on('mouseout', function (e: PointerEvent): void {
                            pointer.onTrackerMouseOut(e);
                        });

                    if (options.cursor && !chart.styledMode) {
                        tracker.css({ cursor: options.cursor });
                    }

                    if (hasTouch) {
                        tracker.on('touchstart', onMouseOver);
                    }
                }
            });
        }
        fireEvent(this, 'afterDrawTracker');
    }

    /**
     * Add a point to the series after render time. The point can be added at
     * the end, or by giving it an X value, to the start or in the middle of the
     * series.
     *
     * @sample highcharts/members/series-addpoint-append/
     *         Append point
     * @sample highcharts/members/series-addpoint-append-and-shift/
     *         Append and shift
     * @sample highcharts/members/series-addpoint-x-and-y/
     *         Both X and Y values given
     * @sample highcharts/members/series-addpoint-pie/
     *         Append pie slice
     * @sample stock/members/series-addpoint/
     *         Append 100 points in Highcharts Stock
     * @sample stock/members/series-addpoint-shift/
     *         Append and shift in Highcharts Stock
     * @sample maps/members/series-addpoint/
     *         Add a point in Highmaps
     *
     * @function Highcharts.Series#addPoint
     *
     * @param {Highcharts.PointOptionsType} options
     *        The point options. If options is a single number, a point with
     *        that y value is appended to the series. If it is an array, it will
     *        be interpreted as x and y values respectively. If it is an
     *        object, advanced options as outlined under `series.data` are
     *        applied.
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart after the point is added. When adding
     *        more than one point, it is highly recommended that the redraw
     *        option be set to false, and instead {@link Chart#redraw} is
     *        explicitly called after the adding of points is finished.
     *        Otherwise, the chart will redraw after adding each point.
     *
     * @param {boolean} [shift=false]
     *        If true, a point is shifted off the start of the series as one is
     *        appended to the end.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Whether to apply animation, and optionally animation
     *        configuration.
     *
     * @param {boolean} [withEvent=true]
     *        Used internally, whether to fire the series `addPoint` event.
     *
     * @fires Highcharts.Series#event:addPoint
     */
    public addPoint(
        options: (PointOptions|PointShortOptions),
        redraw?: boolean,
        shift?: boolean,
        animation?: (boolean|Partial<AnimationOptions>),
        withEvent?: boolean
    ): void {
        const series = this,
            seriesOptions = series.options,
            data = series.data,
            chart = series.chart,
            xAxis = series.xAxis,
            names = xAxis && xAxis.hasNames && xAxis.names,
            dataOptions = seriesOptions.data,
            xData = series.xData as any;
        let isInTheMiddle,
            i: number;

        // Optional redraw, defaults to true
        redraw = pick(redraw, true);

        // Get options and push the point to xData, yData and series.options. In
        // series.generatePoints the Point instance will be created on demand
        // and pushed to the series.data array.
        const point = { series: series } as any;
        series.pointClass.prototype.applyOptions.apply(point, [options]);
        const x: (number|null) = point.x;

        // Get the insertion point
        i = xData.length;
        if (series.requireSorting && (x as any) < xData[i - 1]) {
            isInTheMiddle = true;
            while (i && xData[i - 1] > (x as any)) {
                i--;
            }
        }

        // Insert undefined item
        (series.updateParallelArrays as any)(point, 'splice', i, 0, 0);
        // Update it
        series.updateParallelArrays(point as any, i);

        if (names && point.name) {
            names[x as any] = point.name;
        }
        (dataOptions as any).splice(i, 0, options);

        if (isInTheMiddle) {
            series.data.splice(i, 0, null as any);
            series.processData();
        }

        // Generate points to be added to the legend (#1329)
        if (seriesOptions.legendType === 'point') {
            series.generatePoints();
        }

        // Shift the first point off the parallel arrays
        if (shift) {
            if (data[0] && data[0].remove) {
                data[0].remove(false);
            } else {
                data.shift();
                series.updateParallelArrays(point as any, 'shift');

                (dataOptions as any).shift();
            }
        }

        // Fire event
        if (withEvent !== false) {
            fireEvent(series, 'addPoint', { point: point });
        }

        // redraw
        series.isDirty = true;
        series.isDirtyData = true;

        if (redraw) {
            chart.redraw(animation); // Animation is set anyway on redraw, #5665
        }
    }

    /**
     * Remove a point from the series. Unlike the
     * {@link Highcharts.Point#remove} method, this can also be done on a point
     * that is not instanciated because it is outside the view or subject to
     * Highcharts Stock data grouping.
     *
     * @sample highcharts/members/series-removepoint/
     *         Remove cropped point
     *
     * @function Highcharts.Series#removePoint
     *
     * @param {number} i
     *        The index of the point in the {@link Highcharts.Series.data|data}
     *        array.
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart after the point is added. When
     *        removing more than one point, it is highly recommended that the
     *        `redraw` option be set to `false`, and instead {@link
     *        Highcharts.Chart#redraw} is explicitly called after the adding of
     *        points is finished.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Whether and optionally how the series should be animated.
     *
     * @fires Highcharts.Point#event:remove
     */
    public removePoint(
        i: number,
        redraw?: boolean,
        animation?: (boolean|Partial<AnimationOptions>)
    ): void {

        const series = this,
            data = series.data,
            point = data[i],
            points = series.points,
            chart = series.chart,
            remove = function (): void {

                if (points && points.length === data.length) { // #4935
                    points.splice(i, 1);
                }
                data.splice(i, 1);
                (series.options.data as any).splice(i, 1);
                (series.updateParallelArrays as any)(
                    point || { series: series },
                    'splice',
                    i,
                    1
                );

                if (point) {
                    point.destroy();
                }

                // redraw
                series.isDirty = true;
                series.isDirtyData = true;
                if (redraw) {
                    chart.redraw();
                }
            };

        setAnimation(animation, chart);
        redraw = pick(redraw, true);

        // Fire the event with a default handler of removing the point
        if (point) {
            point.firePointEvent('remove', null as any, remove);
        } else {
            remove();
        }
    }

    /**
     * Remove a series and optionally redraw the chart.
     *
     * @sample highcharts/members/series-remove/
     *         Remove first series from a button
     *
     * @function Highcharts.Series#remove
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart or wait for an explicit call to
     *        {@link Highcharts.Chart#redraw}.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Whether to apply animation, and optionally animation
     *        configuration.
     *
     * @param {boolean} [withEvent=true]
     *        Used internally, whether to fire the series `remove` event.
     *
     * @fires Highcharts.Series#event:remove
     */
    public remove(
        redraw?: boolean,
        animation?: (boolean|Partial<AnimationOptions>),
        withEvent?: boolean,
        keepEvents?: boolean
    ): void {
        const series = this,
            chart = series.chart;

        /**
         * @private
         */
        function remove(): void {

            // Destroy elements
            series.destroy(keepEvents);

            // Redraw
            chart.isDirtyLegend = chart.isDirtyBox = true;
            chart.linkSeries();

            if (pick(redraw, true)) {
                chart.redraw(animation);
            }
        }

        // Fire the event with a default handler of removing the point
        if (withEvent !== false) {
            fireEvent(series, 'remove', null as any, remove);
        } else {
            remove();
        }
    }

    /**
     * Update the series with a new set of options. For a clean and precise
     * handling of new options, all methods and elements from the series are
     * removed, and it is initialized from scratch. Therefore, this method is
     * more performance expensive than some other utility methods like {@link
     * Series#setData} or {@link Series#setVisible}.
     *
     * Note that `Series.update` may mutate the passed `data` options.
     *
     * @sample highcharts/members/series-update/
     *         Updating series options
     * @sample maps/members/series-update/
     *         Update series options in Highmaps
     *
     * @function Highcharts.Series#update
     *
     * @param {Highcharts.SeriesOptionsType} options
     *        New options that will be merged with the series' existing options.
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart after the series is altered. If doing
     *        more operations on the chart, it is a good idea to set redraw to
     *        false and call {@link Chart#redraw} after.
     *
     * @fires Highcharts.Series#event:update
     * @fires Highcharts.Series#event:afterUpdate
     */
    public update(
        options: DeepPartial<SeriesTypeOptions>,
        redraw?: boolean
    ): void {

        options = cleanRecursively(options, this.userOptions);

        fireEvent(this, 'update', { options: options });

        const series = this,
            chart = series.chart,
            // must use user options when changing type because series.options
            // is merged in with type specific plotOptions
            oldOptions = series.userOptions,
            initialType = series.initialType || series.type,
            plotOptions = chart.options.plotOptions,
            initialSeriesProto = seriesTypes[initialType].prototype,
            groups = [
                'group',
                'markerGroup',
                'dataLabelsGroup',
                'transformGroup'
            ],
            // Animation must be enabled when calling update before the initial
            // animation has first run. This happens when calling update
            // directly after chart initialization, or when applying responsive
            // rules (#6912).
            animation = series.finishedAnimating && { animation: false },
            kinds = {} as Record<string, number>;
        let seriesOptions: SeriesOptions,
            n,
            preserve = [
                'eventOptions',
                'navigatorSeries',
                'baseSeries'
            ],
            newType = (
                options.type ||
                oldOptions.type ||
                chart.options.chart.type
            );
        const keepPoints = !(
            // Indicators, histograms etc recalculate the data. It should be
            // possible to omit this.
            this.hasDerivedData ||
        // New type requires new point classes
        (newType && newType !== this.type) ||
        // New options affecting how the data points are built
        typeof options.pointStart !== 'undefined' ||
        typeof options.pointInterval !== 'undefined' ||
        // Changes to data grouping requires new points in new group
        series.hasOptionChanged('dataGrouping') ||
        series.hasOptionChanged('pointStart') ||
        series.hasOptionChanged('pointInterval') ||
        series.hasOptionChanged('pointIntervalUnit') ||
        series.hasOptionChanged('keys')
        );

        newType = newType || initialType;

        if (keepPoints) {
            preserve.push(
                'data',
                'isDirtyData',
                'points',
                'processedXData',
                'processedYData',
                'xIncrement',
                'cropped',
                '_hasPointMarkers',
                '_hasPointLabels',
                'clips', // #15420

                // Networkgraph (#14397)
                'nodes',
                'layout',

                // Map specific, consider moving it to series-specific preserve-
                // properties (#10617)
                'mapMap',
                'mapData',
                'minY',
                'maxY',
                'minX',
                'maxX'
            );
            if (options.visible !== false) {
                preserve.push('area', 'graph');
            }
            series.parallelArrays.forEach(function (key: string): void {
                preserve.push(key + 'Data');
            });

            if (options.data) {
                // setData uses dataSorting options so we need to update them
                // earlier
                if (options.dataSorting) {
                    extend(series.options.dataSorting, options.dataSorting);
                }
                this.setData(options.data as any, false);
            }
        }

        // Do the merge, with some forced options
        options = merge(oldOptions, animation as any, {
            // When oldOptions.index is null it should't be cleared.
            // Otherwise navigator series will have wrong indexes (#10193).
            index: typeof oldOptions.index === 'undefined' ?
                series.index : oldOptions.index,
            pointStart: pick(
                // when updating from blank (#7933)
                plotOptions && plotOptions.series && plotOptions.series.pointStart,
                oldOptions.pointStart,
                // when updating after addPoint
                (series.xData as any)[0]
            )
        }, (!keepPoints && { data: series.options.data }) as any, options);

        // Merge does not merge arrays, but replaces them. Since points were
        // updated, `series.options.data` has correct merged options, use it:
        if (keepPoints && options.data) {
            options.data = series.options.data;
        }

        // Make sure preserved properties are not destroyed (#3094)
        preserve = groups.concat(preserve);
        preserve.forEach(function (prop: string): void {
            (preserve as any)[prop] = (series as any)[prop];
            delete (series as any)[prop];
        });

        let casting = false;

        if (seriesTypes[newType]) {

            casting = newType !== series.type;

            // Destroy the series and delete all properties, it will be
            // reinserted within the `init` call below
            series.remove(false, false, false, true);

            if (casting) {
                // Modern browsers including IE11
                // @todo slow, consider alternatives mentioned:
                // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf
                if (Object.setPrototypeOf) {
                    Object.setPrototypeOf(
                        series,
                        seriesTypes[newType].prototype
                    );

                // Legacy (IE < 11)
                } else {

                    const ownEvents = Object.hasOwnProperty.call(series, 'hcEvents') &&
                        series.hcEvents;
                    for (n in initialSeriesProto) { // eslint-disable-line guard-for-in
                        (series as any)[n] = void 0;
                    }

                    // Reinsert all methods and properties from the new type
                    // prototype (#2270, #3719).
                    extend<Series>(
                        series,
                        seriesTypes[newType].prototype
                    );

                    // The events are tied to the prototype chain, don't copy if
                    // they're not the series' own
                    if (ownEvents) {
                        series.hcEvents = ownEvents;
                    } else {
                        delete series.hcEvents;
                    }
                }
            }
        } else {
            error(
                17,
                true,
                chart,
                { missingModuleFor: newType }
            );
        }

        // Re-register groups (#3094) and other preserved properties
        preserve.forEach(function (prop: string): void {
            (series as any)[prop] = (preserve as any)[prop];
        });

        series.init(chart, options);

        // Remove particular elements of the points. Check `series.options`
        // because we need to consider the options being set on plotOptions as
        // well.
        if (keepPoints && this.points) {
            seriesOptions = series.options;
            // What kind of elements to destroy
            if (seriesOptions.visible === false) {
                kinds.graphic = 1;
                kinds.dataLabel = 1;
            } else if (!series._hasPointLabels) {
                const { marker, dataLabels } = seriesOptions;
                if (
                    marker && (
                        marker.enabled === false ||
                        (oldOptions.marker && oldOptions.marker.symbol) !==
                            marker.symbol // #10870, #15946
                    )
                ) {
                    kinds.graphic = 1;
                }
                if (
                    dataLabels &&
                    (dataLabels as any).enabled === false
                ) {
                    kinds.dataLabel = 1;
                }
            }
            this.points.forEach(function (point): void {
                if (point && point.series) {
                    point.resolveColor();
                    // Destroy elements in order to recreate based on updated
                    // series options.
                    if (Object.keys(kinds).length) {
                        point.destroyElements(kinds);
                    }
                    if (
                        seriesOptions.showInLegend === false &&
                        point.legendItem
                    ) {
                        chart.legend.destroyItem(point);
                    }
                }
            }, this);
        }

        series.initialType = initialType;
        chart.linkSeries(); // Links are lost in series.remove (#3028)

        // #15383: Fire updatedData if the type has changed to keep linked
        // series such as indicators updated
        if (casting && series.linkedSeries.length) {
            series.isDirtyData = true;
        }

        fireEvent(this, 'afterUpdate');

        if (pick(redraw, true)) {
            chart.redraw(keepPoints ? void 0 : false);
        }
    }

    /**
     * Used from within series.update
     * @private
     */
    public setName(name: string): void {
        this.name = this.options.name = this.userOptions.name = name;
        this.chart.isDirtyLegend = true;
    }

    /**
     * Check if the option has changed.
     * @private
     */
    public hasOptionChanged(optionName: string): boolean {
        const chart = this.chart,
            option = (this.options as any)[optionName],
            plotOptions = chart.options.plotOptions,
            oldOption = (this.userOptions as any)[optionName];

        if (oldOption) {
            return option !== oldOption;
        }

        return option !==
            pick(
                plotOptions && plotOptions[this.type] && (plotOptions[this.type] as any)[optionName],
                plotOptions && plotOptions.series && (plotOptions as any).series[optionName],
                option
            );
    }

    /**
     * Runs on mouse over the series graphical items.
     *
     * @function Highcharts.Series#onMouseOver
     * @fires Highcharts.Series#event:mouseOver
     */
    public onMouseOver(): void {
        const series = this,
            chart = series.chart,
            hoverSeries = chart.hoverSeries,
            pointer = chart.pointer;

        pointer.setHoverChartIndex();

        // set normal state to previous series
        if (hoverSeries && hoverSeries !== series) {
            hoverSeries.onMouseOut();
        }

        // trigger the event, but to save processing time,
        // only if defined
        if ((series.options.events as any).mouseOver) {
            fireEvent(series, 'mouseOver');
        }

        // hover this
        series.setState('hover');

        /**
         * Contains the original hovered series.
         *
         * @name Highcharts.Chart#hoverSeries
         * @type {Highcharts.Series|null}
         */
        chart.hoverSeries = series;
    }

    /**
     * Runs on mouse out of the series graphical items.
     *
     * @function Highcharts.Series#onMouseOut
     *
     * @fires Highcharts.Series#event:mouseOut
     */
    public onMouseOut(): void {
        // trigger the event only if listeners exist
        const series = this,
            options = series.options,
            chart = series.chart,
            tooltip = chart.tooltip,
            hoverPoint = chart.hoverPoint;

        // #182, set to null before the mouseOut event fires
        chart.hoverSeries = null as any;

        // trigger mouse out on the point, which must be in this series
        if (hoverPoint) {
            hoverPoint.onMouseOut();
        }

        // fire the mouse out event
        if (series && (options.events as any).mouseOut) {
            fireEvent(series, 'mouseOut');
        }


        // hide the tooltip
        if (
            tooltip &&
            !series.stickyTracking &&
            (!tooltip.shared || series.noSharedTooltip)
        ) {
            tooltip.hide();
        }

        // Reset all inactive states
        chart.series.forEach(function (s): void {
            s.setState('', true);
        });

    }

    /**
     * Set the state of the series. Called internally on mouse interaction
     * operations, but it can also be called directly to visually
     * highlight a series.
     *
     * @function Highcharts.Series#setState
     *
     * @param {Highcharts.SeriesStateValue|""} [state]
     *        The new state, can be either `'hover'`, `'inactive'`, `'select'`,
     *        or `''` (an empty string), `'normal'` or `undefined` to set to
     *        normal state.
     * @param {boolean} [inherit]
     *        Determines if state should be inherited by points too.
     */
    public setState(
        state?: (StatesOptionsKey|''),
        inherit?: boolean
    ): void {
        const series = this,
            options = series.options,
            graph = series.graph,
            inactiveOtherPoints = options.inactiveOtherPoints,
            stateOptions = options.states,
            // By default a quick animation to hover/inactive,
            // slower to un-hover
            stateAnimation = pick(
                (
                    (stateOptions as any)[state || 'normal'] &&
                    (stateOptions as any)[state || 'normal'].animation
                ),
                series.chart.options.chart.animation
            );
        let attribs,
            lineWidth = options.lineWidth,
            i = 0,
            opacity = options.opacity;

        state = state || '';

        if (series.state !== state) {

            // Toggle class names
            [
                series.group,
                series.markerGroup,
                series.dataLabelsGroup
            ].forEach(function (
                group: (SVGElement|undefined)
            ): void {
                if (group) {
                    // Old state
                    if (series.state) {
                        group.removeClass('highcharts-series-' + series.state);
                    }
                    // New state
                    if (state) {
                        group.addClass('highcharts-series-' + state);
                    }
                }
            });

            series.state = state;

            if (!series.chart.styledMode) {

                if ((stateOptions as any)[state] &&
                    (stateOptions as any)[state].enabled === false
                ) {
                    return;
                }

                if (state) {
                    lineWidth = (
                        (stateOptions as any)[state].lineWidth ||
                        lineWidth + (
                            (stateOptions as any)[state].lineWidthPlus || 0
                        )
                    ); // #4035

                    opacity = pick(
                        (stateOptions as any)[state].opacity,
                        opacity
                    );
                }

                if (graph && !graph.dashstyle) {
                    attribs = {
                        'stroke-width': lineWidth
                    };

                    // Animate the graph stroke-width.
                    graph.animate(
                        attribs,
                        stateAnimation
                    );
                    while ((series as any)['zone-graph-' + i]) {
                        (series as any)['zone-graph-' + i].animate(
                            attribs,
                            stateAnimation
                        );
                        i = i + 1;
                    }
                }

                // For some types (pie, networkgraph, sankey) opacity is
                // resolved on a point level
                if (!inactiveOtherPoints) {
                    [
                        series.group,
                        series.markerGroup,
                        series.dataLabelsGroup,
                        series.labelBySeries
                    ].forEach(function (
                        group: (SVGElement|undefined)
                    ): void {
                        if (group) {
                            group.animate(
                                {
                                    opacity: opacity
                                },
                                stateAnimation
                            );
                        }
                    });
                }
            }
        }

        // Don't loop over points on a series that doesn't apply inactive state
        // to siblings markers (e.g. line, column)
        if (inherit && inactiveOtherPoints && series.points) {
            series.setAllPointsToState(state || void 0);
        }
    }

    /**
     * Set the state for all points in the series.
     *
     * @function Highcharts.Series#setAllPointsToState
     *
     * @private
     *
     * @param {string} [state]
     *        Can be either `hover` or undefined to set to normal state.
     */
    public setAllPointsToState(state?: StatesOptionsKey): void {
        this.points.forEach(function (point): void {
            if (point.setState) {
                point.setState(state);
            }
        });
    }

    /**
     * Show or hide the series.
     *
     * @function Highcharts.Series#setVisible
     *
     * @param {boolean} [visible]
     * True to show the series, false to hide. If undefined, the visibility is
     * toggled.
     *
     * @param {boolean} [redraw=true]
     * Whether to redraw the chart after the series is altered. If doing more
     * operations on the chart, it is a good idea to set redraw to false and
     * call {@link Chart#redraw|chart.redraw()} after.
     *
     * @fires Highcharts.Series#event:hide
     * @fires Highcharts.Series#event:show
     */
    public setVisible(
        vis?: boolean,
        redraw?: boolean
    ): void {
        const series = this,
            chart = series.chart,
            legendItem = series.legendItem,
            ignoreHiddenSeries = chart.options.chart.ignoreHiddenSeries,
            oldVisibility = series.visible;

        // if called without an argument, toggle visibility
        series.visible =
            vis =
            series.options.visible =
            series.userOptions.visible =
            typeof vis === 'undefined' ? !oldVisibility : vis; // #5618
        const showOrHide = vis ? 'show' : 'hide';

        // show or hide elements
        [
            'group',
            'dataLabelsGroup',
            'markerGroup',
            'tracker',
            'tt'
        ].forEach(function (key: string): void {
            if ((series as any)[key]) {
                (series as any)[key][showOrHide]();
            }
        });


        // hide tooltip (#1361)
        if (
            chart.hoverSeries === series ||
            (chart.hoverPoint && chart.hoverPoint.series) === series
        ) {
            series.onMouseOut();
        }


        if (legendItem) {
            chart.legend.colorizeItem(series, vis);
        }


        // rescale or adapt to resized chart
        series.isDirty = true;
        // in a stack, all other series are affected
        if (series.options.stacking) {
            chart.series.forEach(function (otherSeries): void {
                if (otherSeries.options.stacking && otherSeries.visible) {
                    otherSeries.isDirty = true;
                }
            });
        }

        // show or hide linked series
        series.linkedSeries.forEach(function (otherSeries): void {
            otherSeries.setVisible(vis, false);
        });

        if (ignoreHiddenSeries) {
            chart.isDirtyBox = true;
        }

        fireEvent(series, showOrHide);

        if (redraw !== false) {
            chart.redraw();
        }
    }

    /**
     * Show the series if hidden.
     *
     * @sample highcharts/members/series-hide/
     *         Toggle visibility from a button
     *
     * @function Highcharts.Series#show
     * @fires Highcharts.Series#event:show
     */
    public show(): void {
        this.setVisible(true);
    }

    /**
     * Hide the series if visible. If the
     * [chart.ignoreHiddenSeries](https://api.highcharts.com/highcharts/chart.ignoreHiddenSeries)
     * option is true, the chart is redrawn without this series.
     *
     * @sample highcharts/members/series-hide/
     *         Toggle visibility from a button
     *
     * @function Highcharts.Series#hide
     * @fires Highcharts.Series#event:hide
     */
    public hide(): void {
        this.setVisible(false);
    }


    /**
     * Select or unselect the series. This means its
     * {@link Highcharts.Series.selected|selected}
     * property is set, the checkbox in the legend is toggled and when selected,
     * the series is returned by the {@link Highcharts.Chart#getSelectedSeries}
     * function.
     *
     * @sample highcharts/members/series-select/
     *         Select a series from a button
     *
     * @function Highcharts.Series#select
     *
     * @param {boolean} [selected]
     * True to select the series, false to unselect. If undefined, the selection
     * state is toggled.
     *
     * @fires Highcharts.Series#event:select
     * @fires Highcharts.Series#event:unselect
     */
    public select(selected?: boolean): void {
        const series = this;

        series.selected =
        selected =
        this.options.selected = (
            typeof selected === 'undefined' ?
                !series.selected :
                selected
        );

        if (series.checkbox) {
            series.checkbox.checked = selected;
        }

        fireEvent(series, selected ? 'select' : 'unselect');
    }

    /**
     * Checks if a tooltip should be shown for a given point.
     *
     * @private
     * @param {number} plotX
     * @param {number} plotY
     * @param {Highcharts.ChartIsInsideOptionsObject} [options]
     * @return {boolean}
     */
    public shouldShowTooltip(
        plotX: number,
        plotY: number,
        options: Chart.IsInsideOptionsObject = {}
    ): boolean {
        options.series = this;
        options.visiblePlotOnly = true;
        return this.chart.isInsidePlot(plotX, plotY, options);
    }

    /** eslint-enable valid-jsdoc */

}

/* *
 *
 *  Prototype Properties
 *
 * */

interface Series extends SeriesLike {
    axisTypes: Array<string>;
    coll: 'series';
    colorCounter: number;
    cropShoulder: number;
    directTouch: boolean;
    drawLegendSymbol: (
        Highcharts.LegendSymbolMixin['drawLineMarker']|
        Highcharts.LegendSymbolMixin['drawRectangle']
    );
    hcEvents?: Record<string, Array<U.EventWrapperObject<Series>>>;
    isCartesian: boolean;
    kdAxisArray: Array<string>;
    parallelArrays: Array<string>;
    pointClass: typeof Point;
    requireSorting: boolean;
    sorted: boolean;
}
extend(Series.prototype, {
    axisTypes: ['xAxis', 'yAxis'],
    coll: 'series',
    colorCounter: 0,
    cropShoulder: 1,
    directTouch: false,
    drawLegendSymbol: LegendSymbolMixin.drawLineMarker,
    isCartesian: true,
    kdAxisArray: ['clientX', 'plotY'],
    // each point's x and y values are stored in this.xData and this.yData:
    parallelArrays: ['x', 'y'],
    pointClass: Point,
    requireSorting: true,
    // requires the data to be sorted:
    sorted: true
});

/* *
 *
 *  Registry
 *
 * */

SeriesRegistry.series = Series;

/* *
 *
 * Class Namespace
 *
 * */
namespace Series {
    export interface CropDataObject {
        end: number;
        start: number;
        xData: Array<number>;
        yData: (Array<(number|null)>|Array<Array<(number|null)>>);
    }
    export interface PlotBoxObject {
        scaleX: number;
        scaleY: number;
        translateX: number;
        translateY: number;
    }
    export interface ProcessedDataObject {
        xData: Array<number>;
        yData: (Array<(number|null)>|Array<Array<(number|null)>>);
        cropped: (boolean|undefined);
        cropStart: number;
        closestPointRange: (number|undefined);
    }
}

/* *
 *
 *  Default Export
 *
 * */

export default Series;

/* *
 *
 *  API Declarations
 *
 * */

/**
 * This is a placeholder type of the possible series options for
 * [Highcharts](../highcharts/series), [Highcharts Stock](../highstock/series),
 * [Highmaps](../highmaps/series), and [Gantt](../gantt/series).
 *
 * In TypeScript is this dynamically generated to reference all possible types
 * of series options.
 *
 * @ignore-declaration
 * @typedef {Highcharts.SeriesOptions|Highcharts.Dictionary<*>} Highcharts.SeriesOptionsType
 */

/**
 * Options for `dataSorting`.
 *
 * @interface Highcharts.DataSortingOptionsObject
 * @since 8.0.0
 *//**
 * Enable or disable data sorting for the series.
 * @name Highcharts.DataSortingOptionsObject#enabled
 * @type {boolean|undefined}
 *//**
 * Whether to allow matching points by name in an update.
 * @name Highcharts.DataSortingOptionsObject#matchByName
 * @type {boolean|undefined}
 *//**
 * Determines what data value should be used to sort by.
 * @name Highcharts.DataSortingOptionsObject#sortKey
 * @type {string|undefined}
 */

/**
 * Function callback when a series has been animated.
 *
 * @callback Highcharts.SeriesAfterAnimateCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occured.
 *
 * @param {Highcharts.SeriesAfterAnimateEventObject} event
 *        Event arguments.
 */

/**
 * Event information regarding completed animation of a series.
 *
 * @interface Highcharts.SeriesAfterAnimateEventObject
 *//**
 * Animated series.
 * @name Highcharts.SeriesAfterAnimateEventObject#target
 * @type {Highcharts.Series}
 *//**
 * Event type.
 * @name Highcharts.SeriesAfterAnimateEventObject#type
 * @type {"afterAnimate"}
 */

/**
 * Function callback when the checkbox next to the series' name in the legend is
 * clicked.
 *
 * @callback Highcharts.SeriesCheckboxClickCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occured.
 *
 * @param {Highcharts.SeriesCheckboxClickEventObject} event
 *        Event arguments.
 */

/**
 * Event information regarding check of a series box.
 *
 * @interface Highcharts.SeriesCheckboxClickEventObject
 *//**
 * Whether the box has been checked.
 * @name Highcharts.SeriesCheckboxClickEventObject#checked
 * @type {boolean}
 *//**
 * Related series.
 * @name Highcharts.SeriesCheckboxClickEventObject#item
 * @type {Highcharts.Series}
 *//**
 * Related series.
 * @name Highcharts.SeriesCheckboxClickEventObject#target
 * @type {Highcharts.Series}
 *//**
 * Event type.
 * @name Highcharts.SeriesCheckboxClickEventObject#type
 * @type {"checkboxClick"}
 */

/**
 * Function callback when a series is clicked. Return false to cancel toogle
 * actions.
 *
 * @callback Highcharts.SeriesClickCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occured.
 *
 * @param {Highcharts.SeriesClickEventObject} event
 *        Event arguments.
 */

/**
 * Common information for a click event on a series.
 *
 * @interface Highcharts.SeriesClickEventObject
 * @extends global.Event
 *//**
 * Nearest point on the graph.
 * @name Highcharts.SeriesClickEventObject#point
 * @type {Highcharts.Point}
 */

/**
 * Gets fired when the series is hidden after chart generation time, either by
 * clicking the legend item or by calling `.hide()`.
 *
 * @callback Highcharts.SeriesHideCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occured.
 *
 * @param {global.Event} event
 *        The event that occured.
 */

/**
 * The SVG value used for the `stroke-linecap` and `stroke-linejoin` of a line
 * graph.
 *
 * @typedef {"butt"|"round"|"square"|string} Highcharts.SeriesLinecapValue
 */

/**
 * Gets fired when the legend item belonging to the series is clicked. The
 * default action is to toggle the visibility of the series. This can be
 * prevented by returning `false` or calling `event.preventDefault()`.
 *
 * @callback Highcharts.SeriesLegendItemClickCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occured.
 *
 * @param {Highcharts.SeriesLegendItemClickEventObject} event
 *        The event that occured.
 */

/**
 * Information about the event.
 *
 * @interface Highcharts.SeriesLegendItemClickEventObject
 *//**
 * Related browser event.
 * @name Highcharts.SeriesLegendItemClickEventObject#browserEvent
 * @type {global.PointerEvent}
 *//**
 * Prevent the default action of toggle the visibility of the series.
 * @name Highcharts.SeriesLegendItemClickEventObject#preventDefault
 * @type {Function}
 *//**
 * Related series.
 * @name Highcharts.SeriesCheckboxClickEventObject#target
 * @type {Highcharts.Series}
 *//**
 * Event type.
 * @name Highcharts.SeriesCheckboxClickEventObject#type
 * @type {"checkboxClick"}
 */

/**
 * Gets fired when the mouse leaves the graph.
 *
 * @callback Highcharts.SeriesMouseOutCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        Series where the event occured.
 *
 * @param {global.PointerEvent} event
 *        Event that occured.
 */

/**
 * Gets fired when the mouse enters the graph.
 *
 * @callback Highcharts.SeriesMouseOverCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        Series where the event occured.
 *
 * @param {global.PointerEvent} event
 *        Event that occured.
 */

/**
 * Translation and scale for the plot area of a series.
 *
 * @interface Highcharts.SeriesPlotBoxObject
 *//**
 * @name Highcharts.SeriesPlotBoxObject#scaleX
 * @type {number}
 *//**
 * @name Highcharts.SeriesPlotBoxObject#scaleY
 * @type {number}
 *//**
 * @name Highcharts.SeriesPlotBoxObject#translateX
 * @type {number}
 *//**
 * @name Highcharts.SeriesPlotBoxObject#translateY
 * @type {number}
 */

/**
 * Gets fired when the series is shown after chart generation time, either by
 * clicking the legend item or by calling `.show()`.
 *
 * @callback Highcharts.SeriesShowCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        Series where the event occured.
 *
 * @param {global.Event} event
 *        Event that occured.
 */

/**
 * Possible key values for the series state options.
 *
 * @typedef {"hover"|"inactive"|"normal"|"select"} Highcharts.SeriesStateValue
 */

''; // detach doclets above

/* *
 *
 *  API Options
 *
 * */

/**
 * Series options for specific data and the data itself. In TypeScript you
 * have to cast the series options to specific series types, to get all
 * possible options for a series.
 *
 * @example
 * // TypeScript example
 * Highcharts.chart('container', {
 *     series: [{
 *         color: '#06C',
 *         data: [[0, 1], [2, 3]]
 *     } as Highcharts.SeriesLineOptions ]
 * });
 *
 * @type      {Array<*>}
 * @apioption series
 */

/**
 * An id for the series. This can be used after render time to get a pointer
 * to the series object through `chart.get()`.
 *
 * @sample {highcharts} highcharts/plotoptions/series-id/
 *         Get series by id
 *
 * @type      {string}
 * @since     1.2.0
 * @apioption series.id
 */

/**
 * The index of the series in the chart, affecting the internal index in the
 * `chart.series` array, the visible Z index as well as the order in the
 * legend.
 *
 * @type      {number}
 * @since     2.3.0
 * @apioption series.index
 */

/**
 * The sequential index of the series in the legend.
 *
 * @see [legend.reversed](#legend.reversed),
 *      [yAxis.reversedStacks](#yAxis.reversedStacks)
 *
 * @sample {highcharts|highstock} highcharts/series/legendindex/
 *         Legend in opposite order
 *
 * @type      {number}
 * @apioption series.legendIndex
 */
/**
 * The name of the series as shown in the legend, tooltip etc.
 *
 * @sample {highcharts} highcharts/series/name/
 *         Series name
 * @sample {highmaps} maps/demo/category-map/
 *         Series name
 *
 * @type      {string}
 * @apioption series.name
 */

/**
 * This option allows grouping series in a stacked chart. The stack option
 * can be a string or anything else, as long as the grouped series' stack
 * options match each other after conversion into a string.
 *
 * @sample {highcharts} highcharts/series/stack/
 *         Stacked and grouped columns
 *
 * @type      {number|string}
 * @since     2.1
 * @product   highcharts highstock
 * @apioption series.stack
 */

/**
 * The type of series, for example `line` or `column`. By default, the
 * series type is inherited from [chart.type](#chart.type), so unless the
 * chart is a combination of series types, there is no need to set it on the
 * series level.
 *
 * @sample {highcharts} highcharts/series/type/
 *         Line and column in the same chart
 * @sample highcharts/series/type-dynamic/
 *         Dynamic types with button selector
 * @sample {highmaps} maps/demo/mapline-mappoint/
 *         Multiple types in the same map
 *
 * @type      {string}
 * @apioption series.type
 */

/**
 * When using dual or multiple x axes, this number defines which xAxis the
 * particular series is connected to. It refers to either the
 * {@link #xAxis.id|axis id}
 * or the index of the axis in the xAxis array, with 0 being the first.
 *
 * @type      {number|string}
 * @default   0
 * @product   highcharts highstock
 * @apioption series.xAxis
 */

/**
 * When using dual or multiple y axes, this number defines which yAxis the
 * particular series is connected to. It refers to either the
 * {@link #yAxis.id|axis id}
 * or the index of the axis in the yAxis array, with 0 being the first.
 *
 * @sample {highcharts} highcharts/series/yaxis/
 *         Apply the column series to the secondary Y axis
 *
 * @type      {number|string}
 * @default   0
 * @product   highcharts highstock
 * @apioption series.yAxis
 */

/**
 * Define the visual z index of the series.
 *
 * @sample {highcharts} highcharts/plotoptions/series-zindex-default/
 *         With no z index, the series defined last are on top
 * @sample {highcharts} highcharts/plotoptions/series-zindex/
 *         With a z index, the series with the highest z index is on top
 * @sample {highstock} highcharts/plotoptions/series-zindex-default/
 *         With no z index, the series defined last are on top
 * @sample {highstock} highcharts/plotoptions/series-zindex/
 *         With a z index, the series with the highest z index is on top
 *
 * @type      {number}
 * @product   highcharts highstock
 * @apioption series.zIndex
 */

''; // include precedent doclets in transpilat
