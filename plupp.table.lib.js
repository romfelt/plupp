//
// Class for building dynamic and interactive tables. 
//
// NOTE that a header must be added before other data is added, because header specifies number of data columns.
//
// @param tableTitle Title string that is displayed above the table.
// @param options are optional arguments that controls function of the table with the following structure:
//			{
// 				request: *,		Optional. The request service called when doing a post.
// 				requestId: *,	Optional. An id to be used when calling the service, some service end-points require this.
// 				postData: *,	Optional. An object of key-value pairs carrying additional data to be added to service 
//								post data as part of each element. For example: {'projectId' : 1, 'someArg' : 'someString', ...}
// 				tableId: *,		Optional. Table DOM id, default is 'pluppTable'. 
// 			}
//
function PluppTable(tableTitle, options) {
	var self = this; // keep reference to this object to be used independent of call context
	var defaults = {'tableId': 'pluppTable', 'updateLastChange': {'args': []}};

	this.tableTitle = tableTitle;
	this.length = 0; // number of data columns, set by header functions
	this.table = [];
	this.zeroes = null;
	this.lookup = {}; // column lookup table to avoid searching when populating cells, returns delta index
 	this.settings = $.extend({}, defaults, options); // make sure we have an options object with a defined 'tableId' even though no is supplied

	// returns array of length with pre-defined values
	this.getArray = function(length, startValue, increment) {
		var data = [];
		for (var i = 0; i < length; i++) {
			data.push(startValue);
			startValue += increment;
		}
		return data;
	}

	// add monthly date header row
	this.addDateHeader = function(startPeriod, length) {
		self.length = length;
		self.lookup = {}; // reset column lookup table
		var m = moment(startPeriod);
		var d = [];
		for (var i = 0; i < self.length; i++) {
			d.push([m.format("MMM YYYY"), m.format("YYYY-MM-DD"), 'period']); // store both user format as well as internal API format (2016-01-01)
			self.lookup[m.format("YYYY-MM-DD")] = i; // associate date with index
			m.add(1, 'month'); // increase one month
		}
		var obj = {'type': 'title', 'title': '', 'data': d};
		self.table.push(obj);

		// create an array of zeroes to be reused to save some time
		self.zeroes = self.getArray(self.length, 0, 0);
	}

	// add title/id header row
	this.addNameHeader = function(data, fieldName) {
		self.length = data.length;
		self.lookup = {}; // reset column lookup table
		var d = [];
		$.each(data, function(i, v) {
			d.push([v.name, v.id, fieldName]); // store name, id and name of id field when doing a post
			self.lookup[v.id] = i; // associate name with index
		});
		var obj = {'type': 'title', 'title': '', 'data': d};
		self.table.push(obj);

		// create an array of zeroes to be reused to save some time
		self.zeroes = self.getArray(self.length, 0, 0);
	}

	this.addDataSection = function(titles, values, columnField, type, parentId) {
		var lookup = {}; // row lookup table to keep track of objects based on id, no need to search

		// @TODO move this full-array-expansion to PluppRequest on success so that API hooks can be used by other clients as well, such as graphs
		// create default value zero to all table cells
		$.each(titles, function(i, v) {
			var data = self.zeroes.slice(); // make copy of array to create new object
			var obj = {'type': type, 'id': v.id, 'pid': parentId, 'title': v.name, 'data': data};
			self.table.push(obj);
			lookup[v.id] = obj; // store reference to object, instead of searching for objects
		});

		// add real cell values
		$.each(values, function(i, v) {
			if (typeof lookup[v.id] !== 'undefined') {
				var x = self.lookup[v[columnField]];
				if (typeof x !== 'undefined') {
					var f = parseFloat(v.value);
					lookup[v.id].data[x] = f;
				}
			}
		});
	}

	this.addDataRow = function(title, values, columnField, type) {
		var data = self.zeroes.slice(); // make copy of array to create new object
		$.each(values, function(i, v) {
			var x = self.lookup[v[columnField]];
			if (typeof x !== 'undefined') {
				var f = parseFloat(v.value);
				data[x] = f;
			}
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
		self.table.push({'type': 'delta', 'title': 'Delta', 'columns': self.length, 'rowA': a, 'rowB': b});
	}

	// set or get cell value
	this.cell = function(column, row, value) {
		if (typeof(value) === 'undefined') {
			return $('#' + self.settings.tableId + ' tr:eq(' + row + ') td:eq(' + column + ')').text();
		}
		else {
			$('#' + self.settings.tableId + ' tr:eq(' + row + ') td:eq(' + column + ')').text(value);
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
		$('#' + self.settings.tableId + ' .cell-sum').each(function(i, e) {
			var c = $(e).index();
		    var r = $(e).closest('tr').index();
			var s = self.sum(c, 1, 1, r - 1);
			s = s.toFixed(2);
			$(e).text(s);
		});
	}

	this.updateDeltas = function() {
		$('#' + self.settings.tableId + ' .cell-delta').each(function(i, e) {
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

	this.updateLastChange = function() {
		// is there a callback to update last changed date?
		if (typeof self.settings.updateLastChange.callback === 'function') {
			self.settings.updateLastChange.callback(self.settings.updateLastChange.args);
		}
	}

	this.addCells = function(container, data, classes) {
		$.each(data, function(i, v) {
			container.append($('<td/>')
				.addClass(classes)
				.text(v)
				.data('value', v)); // store orginal value to cell data to enable undo
		});
	}

	// @TODO remove editable, if there are cells of type editable make it editable... doh!
	this.build = function(editable, container, callback) {
		$('#buttons').fadeOut();
		var table = $('<table id="' + self.settings.tableId + '"/>').addClass('edit-table');

		$.each(self.table, function(i, obj) {
			var tr = $("<tr/>");
			var td = $("<td/>")
				.addClass('cell-header')
				.text(obj.title);

			// if this is a row with an ´id´ make first column cell clickable to allow navigation
			if (typeof(obj.id) !== 'undefined') {
				td.addClass('cell-clickable');
				td.click(function() {
					if (typeof(callback) === 'undefined') {
						console.log("warning: install click callback");
						return;
					}
					callback(obj.id, obj.pid);
				});
			}

			tr.append(td);
			if (obj.type == 'title') {
				$.each(obj.data, function(i, v) {
					tr.append($('<td/>')
						.addClass('cell-title-header')
						.text(v[0])
						.data('idValue', v[1]) // store timestamp/title and its name as data in cell to be used when posting
						.data('idName', v[2])); 
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
				self.addCells(tr, obj.data, 'cell-constant-header');
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
		container.html('<h1>' + self.tableTitle + '<br><span class="last-change"></span></h1>');
		container.append(table);
		self.updateTable();
		self.updateLastChange();

		if (editable === true) {
			$('#buttons').hide();

			var save = $('<button id="save">Save changes</button>')
				.click(function() {
					self.post();
				})
				.addClass('button button-green');

			var cancel = $('<button id="undo">Undo</button>')
				.click(function() {
					$('#' + self.settings.tableId + ' td.cell-dirty').each(function(i, e) {
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
		$('#' + self.settings.tableId + ' td.cell-dirty').each(function(i, e) {
			var title = $('#' + self.settings.tableId + ' tr:eq(0) td:eq(' + $(e).index() + ')'); // time period, id or other value is stored as data in title cell of same column
		    var id = $(e).closest('tr').data('id'); // id value stored as data in row element
		    var value = parseFloat($(e).text());
			if (!isNaN(value) && top !== undefined) { // @TODO add checks for all variables
				var obj = {'id' : id, 'value' : value };
				obj[title.data('idName')] = title.data('idValue');
				// add additional table POST data if specififed
				if (self.settings.postData !== undefined) {
					$.extend(obj, self.settings.postData);
				}
				requestData.data.push(obj);
			}
		});

		// check if there where dirty cells
		if (requestData.data.length == 0) {
			return;
		}

		var request;
		switch (self.settings.request) {
			case 'quotas' : 
				request = Plupp.setQuota(requestData);
				break;
			case 'plan' : 
				request = Plupp.setPlan(requestData);
				break;
			case 'resourceavailability' : 
				request = Plupp.setResourceAvailability(requestData);
				break;
			case 'allocation' : 
				request = Plupp.setAllocation(requestData);
				break;
			case 'fake' : // for debug purposes only
				request = Plupp.setFake(requestData);
				break;
			default: 
				console.log("missing post-hook for service: " + self.settings.request);
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
				$('#' + self.settings.tableId + ' td.cell-dirty').each(function(i, e) {
					$(e).data('value', $(e).text()).removeClass('cell-dirty');
				});
				$('#buttons').fadeOut();
				self.updateLastChange();
			}
		})
		.fail(function() {
			alert("request failed");				
		});
	}
}
