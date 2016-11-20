// @TODO date formatting
// @TODO add last updated timestamp to each view
// @TODO make projects and teams clickable to navigate further into details
// @TODO integrate graph library: area, bars, heat-map pie charts (project/teams)

function PluppRequest(service, data) {
	var self = this; // keep reference to this object to be used independent of call context
	this.reply = null; // complete JSON reply returned by request on success
	this.root = "api.php";
	this.service = service;
	this.data = data;
	this.status = null; // null equals not completed, true if completed successfully and false if completed with errors

	this.onSuccess = function(reply) {
		self.reply = reply;
		if (self.reply.status != true) {
			self.status = false;
			console.log("Request error: " + JSON.stringify(self.reply.error));
		}
		else {
			self.status = true;
		}
	}

	this.onError = function(error) {
		self.status = false;
	}

	// run the request, return deferred object
	this.run = function() {
		var jqxhr;
		if (typeof(self.data) === 'undefined') {
			jqxhr = $.get("api.php/" + self.service);
		}
		else {
			jqxhr = $.post("api.php/" + self.service, self.data);
		}

		jqxhr.done(self.onSuccess)
			 .fail(self.onError);

		return jqxhr;
	}	
}

Plupp = {
	getProject:function(projectId) {
		return new PluppRequest("project/" + projectId);
	},
	getProjects:function() {
		return new PluppRequest("projects");
	},
	getTeam:function(teamId) {
		return new PluppRequest("team/" + teamId);
	},
	getTeams:function() {
		return new PluppRequest("teams");
	},
	getTeamsPlan:function(startPeriod, length) {
		return new PluppRequest("teamsplan/" + "/" + startPeriod + "/" + length);
	},
	getTeamPlans:function(teamId, startPeriod, length) {
		return new PluppRequest("teamplans/" + teamId + "/" + startPeriod + "/" + length);
	},
	setPlan:function(projectId, data) {
		return new PluppRequest("plan/" + projectId, data);
	},
	getPlan:function(projectId, startPeriod, length) {
		return new PluppRequest("plan/" + projectId + "/" + startPeriod + "/" + length);
	},
	getPlans:function(startPeriod, length) {
		return new PluppRequest("plans/" + startPeriod + "/" + length);
	},
	getPlanSum:function(startPeriod, length) {
		return new PluppRequest("plansum/" + startPeriod + "/" + length);
	},
	setQuotas:function(data) {
		return new PluppRequest("quotas", data);
	},
	getQuota:function(projectId, startPeriod, length) {
		return new PluppRequest("quota/" + projectId + "/" + startPeriod + "/" + length);
	},
	getQuotas:function(startPeriod, length) {
		return new PluppRequest("quotas/" + startPeriod + "/" + length);
	},
	getQuotaSum:function(startPeriod, length) {
		return new PluppRequest("quotasum/" + startPeriod + "/" + length);
	}
}

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
	this.buttons = false;

	// returns array of length with pre-defined values
	this.getArray = function(length, startValue, increment) {
		var data = [];
		for (var i = 0; i < length; i++) {
			data.push(startValue);
			startValue += increment;
		}
		return data;
	}

	self.zeroes = self.getArray(length, 0, 0);
	if (periodType == 'month') {
		var months = self.getArray(length, startPeriod, 1);
		self.table = [{'type': 'time', 'title': 'Month', 'data': months}];
	}

	this.addDataSection = function(titles, values, type) {
		var lookup = {}; // lookup table to keep track of objects based on id, no need to search

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
				lookup[v.id].data[v.period - self.startPeriod] = v.value;
			}
		});
	}

	this.addDataRow = function(title, values, type) {
		var data = self.zeroes.slice(); // make copy of array to create new object
		$.each(values, function(i, v) {
			data[v.period - self.startPeriod] = v.value;
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

	// @TODO keep this? Or decide automatically when build()-ing with or without support for editing?
	this.addButtons = function() {
		self.buttons = true;
	}

	this.build = function(editable, container) {
		var table = $('<table id="' + self.tableId + '"/>').addClass('edit-table');

		$.each(self.table, function(i, obj) {
			var tr = $("<tr/>");

			tr.append($("<td class='cell-header'/>").text(obj.title));
			if (obj.type == 'time') {
				self.addCells(tr, obj.data, 'cell-header');
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

		if (self.buttons === true) {
			$('#buttons').hide();

			var save = $('<button id="save">Save changes</button>')
				.click(function() {
					self.post();
				})
				.addClass('button button-save');

			var cancel = $('<button id="undo">Undo</button>')
				.click(function() {
					$('#' + self.tableId + ' td.cell-dirty').each(function(i, e) {
						$(e).text($(e).data('value')).removeClass('cell-dirty');
					});
					$('#buttons').fadeOut();
					self.updateTable();
				})
				.addClass('button button-undo');

			// erase existing elements in button container and add buttons
			$('#buttons').html(save);
			$('#buttons').append(cancel);
		}

		if (editable === true) {
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
			// @TODO move time period value to data field instead, allows other formatting of date in cell
			var period = $('#' + self.tableId + ' tr:eq(0) td:eq(' + $(e).index() + ')').text(); // time period value store in to top cell in same column
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
		else {
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
