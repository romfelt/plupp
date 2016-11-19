
function doPost(tableId) {
	// @TODO check valid data
	var requestType = $('#' + tableId).data('requestType');
	var requestId = $('#' + tableId).data('requestId');	
	var requestData = {'data' : []};

	// get all dirty cells, i.e. those modified
	$('td.cell-dirty').each(function(i, e) {
		var period = $('#' + tableId + ' tr:eq(0) td:eq(' + $(e).index() + ')').text(); // time period value store in to top cell in same column
	    var id = $(e).closest('tr').data('id'); // id value stored as data in row element
	    var value = parseFloat($(e).text());
		if (!isNaN(value)) { // @TODO add checks for all variables
			requestData.data.push({'id' : id, 'period' : period, 'value' : value});
		}
	});

	console.log(JSON.stringify(requestData));

	$.ajax({
		url: 'api.php/' + requestType + '/' + requestId,
		type: 'POST',
		data: requestData,
		success: function(result) {
			$('td.cell-dirty').removeClass('cell-dirty');
		},
		error: function(exception) {
			alert('Exeption:' + JSON.stringify(exception));
		}
	});
}



function PluppRequest(call) {
	var self = this; // keep reference to this object to be used independent of call context
	this.reply = null; // complete JSON reply returned by request on success
	this.root = "api.php";
	this.call = call;

	this.onSuccess = function(reply) {
		// console.log("Success: " + JSON.stringify(reply));
		self.reply = reply;
	}

	this.onError = function(error) {
	}

	// run the request, return deferred object
	this.run = function() {
		return $.get("api.php/" + self.call, self.onSuccess);
	}	
}

Plupp = {
	getProject:function(projectId) {
		return new PluppRequest("project/" + projectId);
	},
	getProjects:function() {
		return new PluppRequest("projects");
	},
	getTeams:function() {
		return new PluppRequest("teams");
	},
	getPlan:function(projectId, startPeriod, length) {
		return new PluppRequest("plan/" + projectId + "/" + startPeriod + "/" + length);
	},
	getPlans:function(startPeriod, length) {
		return new PluppRequest("plans/" + startPeriod + "/" + length);
	},
	getQuota:function(projectId, startPeriod, length) {
		return new PluppRequest("quota/" + projectId + "/" + startPeriod + "/" + length);
	},
	getQuotas:function(startPeriod, length) {
		return new PluppRequest("quotas/" + startPeriod + "/" + length);
	}
}



function Table(tableId, periodType, startPeriod, length) {
	var self = this; // keep reference to this object to be used independent of call context
	this.startPeriod = startPeriod;
	this.length = length;
	this.table = null;
	this.zeroes = null;
	this.tableId = tableId;

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

	this.addEditDataSection = function(titles, values) {
		var lookup = {}; // lookup table 

		// create default value zero to all table cells
		$.each(titles, function(i, v) {
			var data = self.zeroes.slice(); // make copy of array to create new object
			var obj = {'type': 'editable', 'id': v.id, 'title': v.name, 'data': data};
			self.table.push(obj);
			lookup[v.id] = obj; // store reference to object, instead of searching for objects
		});

		// add real cell values using lookup
		$.each(values, function(i, v) {
			if (typeof lookup[v.id] !== 'undefined') {
				lookup[v.id].data[v.period - self.startPeriod] = v.value;
			}
		});
	}	

	this.addDataRow = function(values, type, title) {
		var data = self.zeroes.slice(); // make copy of array to create new object
		$.each(values, function(i, v) {
			data[v.period - self.startPeriod] = v.value;
		});
		self.table.push({'type': type, 'title': title, 'data': data});  
	}

	this.addSum = function() {
		self.table.push({'type': 'sum', 'title': "Sum", 'columns': self.length});
	}

	this.addDelta = function() {
		self.table.push({'type': 'delta', 'title': "Delta", 'columns': length});
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
			var c = $(e).index();
		    var r = $(e).closest('tr').index();
			var s = self.delta(c, r - 1, c, r - 2);
			$(e).text(s);
		});
	}

	this.updateTable = function() {
		self.updateSums();
		self.updateDeltas();
	}

	this.addCells = function(container, data, classes) {
		$.each(data, function(i, v) {
			container.append($('<td/>').addClass(classes).text(v));
		});
	}

	this.build = function(container, requestType, requestId) {
		var table = $('<table id="' + self.tableId + '"/>').addClass('edit-table');

		// @TODO store in object instead!!
		// store data in table element for generic ajax request to use
		table.data('requestType', requestType);
		table.data('requestId', requestId);

		$.each(self.table, function(i, obj) {
			var tr = $("<tr/>");

			tr.append($("<td class='cell-header'/>").text(obj.title));
			if (obj.type == 'time') {
				self.addCells(tr, obj.data, 'cell-header');
			}
			else if (obj.type == 'editable') {
				tr.data('id', obj.id); // id used for interfacing with database
				self.addCells(tr, obj.data, 'cell');			
			}
			else if (obj.type == 'quota') {
				self.addCells(tr, obj.data, 'cell-header');
			}
			else if (obj.type == 'sum') {
				self.addCells(tr, new Array(obj.columns), 'cell-sum');
			}
			else if (obj.type == 'delta') {
				self.addCells(tr, new Array(obj.columns), 'cell-delta');
			}

			table.append(tr);
		});

		container.append(table);
		table.editableTableWidget();
		self.updateTable();

		$('td.cell').on('validate', function(e, newValue) {
			// @TODO make proper input value check
			if (newValue == 1) { 
				return false; // mark cell as invalid 
			}
		});
		
		$('td.cell').on('change', function(e, newValue) {
			// @TODO only update corresponding column
			$(e.target).addClass('cell-dirty');
			self.updateTable();
			return true;
		});
	}
}

function quotasTable(startPeriod, length) {
	var projects = Plupp.getProjects();
	var quotas = Plupp.getQuotas(startPeriod, length);

	// $.when.apply($, my_array);
	$.when(
		quotas.run(), projects.run()
	)
	.then(function() {
		var t = new Table('quotas', 'month', startPeriod, length);
		t.addEditDataSection(projects.reply.data, quotas.reply.data);
		t.addSum();
		t.addDataRow([], 'quota', 'Available');
		t.addDelta();
		t.addDataRow([], 'quota', 'Requested');
		t.addDelta();
		t.build($('#table-container'), 'plan', 66);
	})
	.fail(function() {
		console.log( "something went wrong!" );
	});
}

function projectTable(projectId, startPeriod, length) {
	var teams = Plupp.getTeams();
	var plan = Plupp.getPlan(projectId, startPeriod, length);
	var quota = Plupp.getQuota(projectId, startPeriod, length);

	$.when(
		teams.run(), quota.run(), plan.run()
	)
	.then(function() {
		var t = new Table('project', 'month', startPeriod, length);
		t.addEditDataSection(teams.reply.data, plan.reply.data);
		t.addSum();
		t.addDataRow(quota.reply.data, 'quota', 'Quota');
		t.addDelta();
		t.build($('#table-container'), 'quota', 0);
	})
	.fail(function() {
		console.log( "something went wrong!" );
	});
}

function showView(view) {
	if (view == 'quotas') {
		quotasTable(startPeriod, length);
	}
}

$(document).ready(function() {
	console.log("ready!");

	projectTable(66, 11, 24);
//	quotasTable(11, 24);

	return;

});

