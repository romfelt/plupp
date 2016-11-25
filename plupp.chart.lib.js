//
// Class for building dynamic and interactive charts
//
// @TODO remove args, reuse from parent reference
function PluppChart(parent, title, periodType, startPeriod, length) {
	var self = this; // keep reference to this object to be used independent of call context
	this.title = title;
	this.id = 'pluppChart';
	this.startPeriod = startPeriod;
	this.length = length;
	this.series = []; // flot data series
	this.zeroes = null;
	this.callback = null; // callback when a label is clicked
	this.parent = parent;

	// returns array of length with pre-defined values
	this.getPointArray = function(startValue, increment) {
		var data = [];
		for (var i = 0; i < self.length; i++) {
			data.push([self.startPeriod + i, startValue]);
			startValue += increment;
		}
		return data;
	}

	self.zeroes = self.getPointArray(0, 0);

	// convert Plupp JSON to Flot data format and fill all blanks with zeros
	this.addDataSection = function(titles, values, callback, config) {
		var lookup = [];

		// initalize a data serie per title with default values
		$.each(titles, function(i, v) {
			var data = $.extend(true, [], self.zeroes); // make deep copy of zeroes array (and the arrays it contains)
			self.series.push($.extend({ 'label': {'name': v.name, 'id': v.id, 'callback': callback}, 'data': data }, config));
			lookup[v.id] = data; // store reference to data object, instead of searching for objects
		});

		// add real values to datapoints using lookup and access data by reference
		$.each(values, function(i, v) {
			if (typeof lookup[v.id] !== 'undefined') {
				lookup[v.id][v.period - self.startPeriod][1] = v.value;
			}
		});
	}

	// convert Plupp JSON to Flot data format and fill all blanks with zeros
	this.addDataRow = function(title, values, callback, config) {
		var data = $.extend(true, [], self.zeroes); // make deep copy of zeroes array (and the arrays it contains)
		var series = $.extend({ 'label': {'name': title, 'id': 0, 'callback': callback}, 'data': data }, config);

		// add real values to datapoints
		$.each(values, function(i, v) {
			series.data[v.period - self.startPeriod][1] = v.value;
		});

		self.series.push(series);
	}

	// returns what the label should say
	this.labelFormatter = function(label, series) { 
		if (label.callback == 'project') {
			return '<a onClick="view.project(' + label.id + ');">' + label.name + '</a>';
		}
		else if (label.callback == 'team') {
			return '<a onClick="view.team(' + label.id + ');">' + label.name + '</a>';
		}
		return label.name;
	}

	this.build = function(container, height) {
		var chart = $('<div id="' + self.id + '"/>').height(height);

		// erase existing elements in container and add table
		container.html('<h1>' + self.title + '</h1>');
		container.append(chart);

		$.plot(chart, self.series, {
			series: {
				lines: {
					show: true,
					fill: true,
					lineWidth: 1,
					shadowSize: 1
				},
				points: {
//				show: true
				}
			},
			yaxis: {
				min: 0,
//				max: 150
			},
			grid: {
				borderWidth: 0,
				margin: 10,
				hoverable: true,
				clickable: true
			},
			legend: {
				show: true,
				labelFormatter: self.labelFormatter,
				labelBoxBorderColor: null,
				noColumns: 2,
				position: 'ne',
				margin: [2, 2], // number of pixels or [x margin, y margin]
				backgroundColor: '#fff', // null or color
				backgroundOpacity: 0.5, //number between 0 and 1
//				container: $('#chart-legend'), //null or jQuery object/DOM element/jQuery expression
//				sorted: null/false, true, "ascending", "descending", "reverse", or a comparator
			}
		});

		$('<div id="tooltip"></div>').css({
			position: 'absolute',
			display: 'none',
			border: '1px solid #fdd',
			padding: '2px',
			'background-color': '#fee',
			opacity: 0.80
		}).appendTo('body');

		container.bind('plothover', function(event, pos, item) {
			if (item) {
				/* @TODO compensate for the fact that stacked chart sum
				item: {
					datapoint: the point, e.g. [0, 2]
					dataIndex: the index of the point in the data array
					series: the series object
					seriesIndex: the index of the series
					pageX, pageY: the global screen coordinates of the point
				} 

				showTooltip(item.pageX, item.pageY, item.series.data[item.dataIndex][3]);

				*/
				var x = item.datapoint[0].toFixed(2),
					y = item.datapoint[1].toFixed(2);

				$('#tooltip').html(item.series.label + ' of ' + x + ' = ' + y)
					.css({top: item.pageY + 5, left: item.pageX + 5})
					.fadeIn(200);
			}
			else {
				$('#tooltip').hide();
			}
		});
		/* @TODO add a pie chart or redirect?
		.bind('plotclick', function(event, pos, item) {
			if (item) {
			}
		});
		*/
	}

}
