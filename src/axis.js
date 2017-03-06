import {slice} from "./array";
import identity from "./identity";

var top = 1,
    right = 2,
    bottom = 3,
    left = 4,
    epsilon = 1e-6;

function translateX(x) {
  return "translate(" + x + ",0)";
}

function translateY(y) {
  return "translate(0," + y + ")";
}

function center(scale) {
  var offset = scale.bandwidth() / 2;
  if (scale.round()) offset = Math.round(offset);
  return function(d) {
    return scale(d) + offset;
  };
}

function entering() {
  return !this.__axis;
}

function axis(orient, scale) {
  var tickArguments = [],
      tickValues = null,
      tickFormat = null,
      tickSizeInner = 6,
      tickSizeOuter = 6,
      tickSizeColumn = 50,
      tickPadding = 3,
      k = orient === top || orient === left ? -1 : 1,
      x, y = orient === left || orient === right ? (x = "x", "y") : (x = "y", "x"),
      transform = orient === top || orient === bottom ? translateX : translateY;

  function axis(context) {
    var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity) : tickFormat,
        spacing = Math.max(tickSizeInner, 0) + tickPadding,
        range = scale.range(),
        range0 = range[0] + 0.5,
        range1 = range[range.length - 1] + 0.5,
        position = (scale.bandwidth ? center : identity)(scale.copy()),
        selection = context.selection ? context.selection() : context,
        path = selection.selectAll(".domain").data([null]),
        tick = selection.selectAll(".tick").data(values[0], scale).order(),
        tickExit = tick.exit(),
        tickEnter = tick.enter().append("g").attr("class", "tick"),
        rect = tick.select("rect.column"),
        line = tick.select("line"),
        text = tick.select("text"),
        colWidth = (range1 / values[0].length);

    path = path.merge(path.enter().insert("path", ".tick")
        .attr("class", "domain")
        .attr("stroke", "#000"));

    tick = tick.merge(tickEnter);

	rect = rect.merge(tickEnter.append("rect")
		.attr("class", "column")
		.attr("x", 0)
		.attr("y", -12)
		.attr("height", tickSizeColumn)
		.attr("width", colWidth));

	if (!tick.filter(function(d, i) { return i == 0; }).select(".prefix-column").node()) {
		rect = rect.merge(tick.filter(function(d, i) { return i == 0; }).append("rect")
			.attr("class", "prefix-column")
			.attr("x", 0)
			.attr("y", -12)
			.attr("height", tickSizeColumn)
			.attr("width", colWidth));
	}

    line = line.merge(tickEnter.append("line")
        .attr("stroke", "#000")
        .attr(x + "2", k * tickSizeInner)
        .attr(y + "1", 0.5)
        .attr(y + "2", 0.5));

    text = text.merge(tickEnter.append("text")
        .attr("fill", "#000")
        .attr(x, k * spacing)
        .attr(y, 0.5)
        .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

    if (context !== selection) {
      path = path.transition(context);
      tick = tick.transition(context);
      line = line.transition(context);
      text = text.transition(context);

      tickExit = tickExit.transition(context)
          .attr("opacity", epsilon)
          .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform"); });

      tickEnter
          .attr("opacity", epsilon)
          .attr("transform", function(d) { var p = this.parentNode.__axis; return transform(p && isFinite(p = p(d)) ? p : position(d)); });
    }

    tickExit.remove();

    path
        .attr("d", orient === left || orient == right
            ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter
            : "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter)
        .attr("transform", translateY(tickSizeInner * -1));

    tick
        .attr("opacity", 1)
        .attr("transform", function(d) { return transform(position(d)); });

    var maxWidth = 0;

    rect
		.attr("width", function(d, i) {
			var width = 0;

			if (i + 1 < tick.data().length) {
				var nextData = tick.data()[i + 1];

				width = position(nextData) - position(d);
				maxWidth = Math.max(maxWidth, width);
			} else {
				width =  maxWidth;
			}

			return width;
		})
		.attr("class", function(d, i) {
			return "column " + ((values[1] + i) % 2 == 1 ? "even" : "odd");
		})
        .attr("height", tickSizeColumn);

    // we don't really care that this is inaccurate since we only show the first one
    // so yes, the "x" = "width" thing is not correct, but don't care
	var prefixCol = tick.select(".prefix-column")
		.attr("width", function(d, i) {
			var width = 0;

			if (i + 1 < tick.data().length) {
				var nextData = tick.data()[i + 1];
				width = position(nextData) - position(d);
			}

			return width;
		})
		.attr("height", tickSizeColumn);

	prefixCol.attr("x", prefixCol.attr("width") * -1);

    line
        .attr(x + "2", k * tickSizeInner);

    text
        .attr(x, k * spacing)
        .text(format);

    selection.filter(entering)
        .attr("fill", "none")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

    selection
        .each(function() { this.__axis = position; });
  }

  axis.scale = function(_) {
    return arguments.length ? (scale = _, axis) : scale;
  };

  axis.ticks = function() {
    return tickArguments = slice.call(arguments), axis;
  };

  axis.tickArguments = function(_) {
    return arguments.length ? (tickArguments = _ == null ? [] : slice.call(_), axis) : tickArguments.slice();
  };

  axis.tickValues = function(_) {
    return arguments.length ? (tickValues = _ == null ? null : slice.call(_), axis) : tickValues && tickValues.slice();
  };

  axis.tickFormat = function(_) {
    return arguments.length ? (tickFormat = _, axis) : tickFormat;
  };

  axis.tickSize = function(_) {
    return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
  };

  axis.tickSizeInner = function(_) {
    return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
  };

  axis.tickSizeOuter = function(_) {
    return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
  };

  axis.tickSizeColumn = function(_) {
	return arguments.length ? (tickSizeColumn = +_, axis) : tickSizeColumn;
};

  axis.tickPadding = function(_) {
    return arguments.length ? (tickPadding = +_, axis) : tickPadding;
  };

  return axis;
}

export function axisTop(scale) {
  return axis(top, scale);
}

export function axisRight(scale) {
  return axis(right, scale);
}

export function axisBottom(scale) {
  return axis(bottom, scale);
}

export function axisLeft(scale) {
  return axis(left, scale);
}
