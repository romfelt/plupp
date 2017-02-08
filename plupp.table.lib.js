// @TODO remove args, reuse from parent reference

//
// Class for building dynamic and interactive tables
//
function PluppTable(tableTitle, periodType, startPeriod, length, requestService, requestId) {
	var self = this; // keep reference to this object to be used independent of call context
	this.tableTitle = tableTitle;
	this.tableId = 'pluppTable';
	this.startPeriod = startPeriod;
	this.length = length;
	this.requestService = requestService;
	this.requestId = requestId;
	this.table = null;
	this.zeroes = null;

	// returns array of length with pre-defined values
	this.getArray = function(length, startValue, increment) {
		var data = [];
		for (var i = 0; i < length; i++) {
			data.push(startValue);
			startValue += increment;
		}
		return data;
	}

	// create an array of zeroes to be reused
	self.zeroes = self.getArray(length, 0, 0);

	// initilize table with a date row on top
	if (periodType == 'month') {
		var m = moment(self.startPeriod);
		var months = [];
		for (var i = 0; i < length; i++) {
			months.push([m.format("MMM YYYY"), m.format("YYYY-MM-DD")]); // store both user format as well as API format (2016-01-01)
			m.add(1, 'month');
		}
		self.table = [{'type': 'time', 'title': 'Month', 'data': months}];
	}
	else {
		console.log("Not yet supported!");
	}

	this.addDataSection = function(titles, values, type) {
		var lookup = {}; // lookup table to keep track of objects based on id, no need to search

		// @TODO move this full-array-expansion to PluppRequest on success so that API hooks can be used by other clients as well, such as graphs
		// create default value zero to all table cells
		$.each(titles, function(i, v) {
			var data = self.zeroes.slice(); // make copy of array to create new object
			var obj = {'type': type, 'id': v.id, 'title': v.name, 'data': data};
			self.table.push(obj);
			lookup[v.id] = obj; // store reference to object, instead of searching for objects
		});

		// add real cell values
		$.each(values, function(i, v) {
			if (typeof lookup[v.id] !== 'undefined') {
				var m = monthsBetween(self.startPeriod, v.period);
				var f = parseFloat(v.value);
				lookup[v.id].data[m] = f;
			}
		});
	}

	this.addDataRow = function(title, values, type) {
		var data = self.zeroes.slice(); // make copy of array to create new object
		$.each(values, function(i, v) {
			var m = monthsBetween(self.startPeriod, v.period);
			var f = parseFloat(v.value);
			data[m] = f;
		});
		self.table.push({'type': type, 'title': title, 'data': data});
	}

	this.addSum = function() {
		self.table.push({'type': 'sum', 'title': 'Sum', 'columns': self.length});
	}

	// Delta is calculated as cell(A) - cell(B), where rowA is the relative row index from 'this'
	// row. Default is: delta(n) = cell(n-1) - cell(n-2).
	this.addDelta = function(rowA, rowB) {
		var a = isNaN(rowA) ? -1 : rowA;
		var b = isNaN(rowB) ? -2 : rowB;
		self.table.push({'type': 'delta', 'title': 'Delta', 'columns': length, 'rowA': a, 'rowB': b});
	}

	// set or get cell value
	this.cell = function(column, row, value) {
		if (typeof(value) === 'undefined') {
			return $('#' + self.tableId + ' tr:eq(' + row + ') td:eq(' + column + ')').text();
		}
		else {
			$('#' + self.tableId + ' tr:eq(' + row + ') td:eq(' + column + ')').text(value);
		}
	}

	// get Float value of cell
	this.cellF = function(column, row) {
		var v = parseFloat(self.cell(column, row));
		return !isNaN(v) ? v : 0;
	}

	// get sum of cell block
	this.sum = function(column, row, width, height) {
		var sum = 0;
		for (var c = 0; c < width; c++) {
			for (var r = 0; r < height; r++) {
				sum += self.cellF(column + c, row + r);
			}
		}
		return sum;
	}

	// get delta between two cells: A - B
	this.delta = function(columnA, rowA, columnB, rowB) {
		return self.cellF(columnA, rowA) - self.cellF(columnB, rowB);
	}

	this.updateSums = function() {
		$('#' + self.tableId + ' .cell-sum').each(function(i, e) {
			var c = $(e).index();
		    var r = $(e).closest('tr').index();
			var s = self.sum(c, 1, 1, r - 1);
			s = s.toFixed(2);
			$(e).text(s);
		});
	}

	this.updateDeltas = function() {
		$('#' + self.tableId + ' .cell-delta').each(function(i, e) {
		    var tr = $(e).closest('tr');
			var c = $(e).index();
		    var r = tr.index();
			var s = self.delta(c, r + tr.data('rowA'), c, r + tr.data('rowB'));

			// set new value and class accordingly
			s = s.toFixed(2);
			$(e).text(s);
			if (s < 0) {
				$(e).addClass('cell-delta-negative');
			}
			else {
				$(e).removeClass('cell-delta-negative');
			}
		});
	}

	this.updateTable = function() {
		self.updateSums();
		self.updateDeltas();
	}

	this.addCells = function(container, data, classes) {
		$.each(data, function(i, v) {
			container.append($('<td/>')
				.addClass(classes)
				.text(v)
				.data('value', v)); // store orginal value to cell data to enable undo
		});
	}

	this.build = function(editable, container, callback) {
		var table = $('<table id="' + self.tableId + '"/>').addClass('edit-table');

		$.each(self.table, function(i, obj) {
			var tr = $("<tr/>");
			var td = $("<td/>")
				.addClass('cell-header')
				.text(obj.title);

			// if this is a row with an ´id´ make first column cell clickable
			if (typeof(obj.id) !== 'undefined') {
				td.addClass('cell-clickable');
				td.click(function() {
					if (typeof(callback) === 'undefined') {
						console.log("warning: install click callback");
						return;
					}
					callback(obj.id);
				});
			}

			tr.append(td);
			if (obj.type == 'time') {
				$.each(obj.data, function(i, v) {
					tr.append($('<td/>')
						.addClass('cell-header')
						.text(v[0])
						.data('period', v[1])); // store timestamp as data in cell to be used when posting
				});
			}
			else if (obj.type == 'editable') {
				tr.data('id', obj.id); // row id used for interfacing with database, such as projectId or teamId
				self.addCells(tr, obj.data, 'cell');
			}
			else if (obj.type == 'constant') {
				self.addCells(tr, obj.data, 'cell-constant');
			}
			else if (obj.type == 'header') {
				self.addCells(tr, obj.data, 'cell-header');
			}
			else if (obj.type == 'sum') {
				self.addCells(tr, new Array(obj.columns), 'cell-sum');
			}
			else if (obj.type == 'delta') {
				tr.data('rowA', obj.rowA);
				tr.data('rowB', obj.rowB);
				self.addCells(tr, new Array(obj.columns), 'cell-delta');
			}

			table.append(tr);
		});

		// erase existing elements in container and add table
		container.html('<h1>' + self.tableTitle + '</h1>');
		container.append(table);
		self.updateTable();

		if (editable === true) {
			$('#buttons').hide();

			var save = $('<button id="save">Save changes</button>')
				.click(function() {
					self.post();
				})
				.addClass('button button-green');

			var cancel = $('<button id="undo">Undo</button>')
				.click(function() {
					$('#' + self.tableId + ' td.cell-dirty').each(function(i, e) {
						$(e).text($(e).data('value')).removeClass('cell-dirty');
					});
					$('#buttons').fadeOut();
					self.updateTable();
				})
				.addClass('button button-red');

			// erase existing elements in button container and add buttons
			$('#buttons').html(save);
			$('#buttons').append(cancel);

			// enable table editing
			table.editableTableWidget();

			$('td.cell').on('validate', function(e, newValue) {
				if (isNaN(newValue)) {
					return false; // mark cell as invalid
				}
			});

			$('td.cell').on('change', function(e, newValue) {
				$(e.target).addClass('cell-dirty');
				$('#buttons').fadeIn();

				// @TODO only update corresponding column
				self.updateTable();

				return true;
			});
		}
	}

	// post changed cells' data to service end point
	this.post = function() {
		var requestData = {'data' : []};

		// get all dirty cells, i.e. those modified
		$('#' + self.tableId + ' td.cell-dirty').each(function(i, e) {
			// time period value is stored as data in top cell of same column
			var period = $('#' + self.tableId + ' tr:eq(0) td:eq(' + $(e).index() + ')').data('period'); 
		    var id = $(e).closest('tr').data('id'); // id value stored as data in row element
		    var value = parseFloat($(e).text());
			if (!isNaN(value)) { // @TODO add checks for all variables
				requestData.data.push({'id' : id, 'period' : period, 'value' : value});
			}
		});

		// check if there where dirty cells
		if (requestData.data.length == 0) {
			return;
		}

		var request;
		if (self.requestService == 'quotas') {
			request = Plupp.setQuotas(requestData);
		}
		else if (self.requestService == 'plan') {
			request = Plupp.setPlan(self.requestId, requestData);
		}
		else if (self.requestService == 'resourceavailability') {
			request = Plupp.setResourceAvailability(requestData);
		}
		else {
			console.log("missing POST hook");
			return;
		}

		$.when(
			request.run()
		)
		.then(function() {
			if (request.status != true) {
				alert("request failed");
			}
			else {
				// remove dirty styling and store new value to data field to enable undo again
				$('#' + self.tableId + ' td.cell-dirty').each(function(i, e) {
					$(e).data('value', $(e).text()).removeClass('cell-dirty');
				});
				$('#buttons').fadeOut();
			}
		})
		.fail(function() {
			alert("request failed");				
		});
	}
}
