// TODO:
// - Quota => Budget (resource)
// - Team => Discipline
// - add notification that user has to login
// - allocation, remove user of plans API... then remove API?
// - project priority, sort on that
// - call-stack, being able to click back to previous view(s)
// - clean up plupp.lib.js to user same request helper
// - add last X updated timestamp/user to each view
// - allow browse history byt setting a timestamp
// - add tag support: i.e. Evander TG2 @ 2017-01-23 12:02:11
// - add new and update resources
// - being able to locally enable disable projects (and on server)
// - being able to locally shift project requests in time to simulate
// - remove APIs teamsPlan, teamPlans
// - combine quota/quotaSum

$.fn.center = function() {
	this.css('position', 'fixed');
	this.css('top', ($(window).height() / 2 - this.height() / 2) + 'px');
	this.css('left', ($(window).width() / 2 - this.width() / 2) + 'px');
	return this;
}

// returns delta number of months as: before - after, where before < after and before 
// and after are given as '2016-12-04'
function monthsBetween(before, after) {
	var a = moment(after);
	var b = moment(before);
	return a.diff(b, 'months');
}

function showModal(modalId) {
	$('#' + modalId).center().fadeIn();
	$('#modal-bg').fadeIn();
}

function hideModal(modalId) {
	$('#' + modalId).fadeOut();
	$('#modal-bg').fadeOut();	
}

// check if there is an active session and update menu accordingly
function doSessionUpdate(activeId, inactiveId) {
	$('#' + activeId).hide();
	$('#' + inactiveId).hide();

	var session = Plupp.getSession();

	$.when(
		session.run()
	)
	.then(function() {
		if (session.reply.request === true && session.reply.session === true) {
			$('#' + activeId + ' a:first-child').html('Logout (' + session.reply.username + ')');
			$('#' + activeId).show();
			return;
		}
		// something went wrong or there is no active session, assume no session
		$('#' + inactiveId).show();
	})
}

function doLogin(usernameId, passwordId, messageId) {
	var username = $('#' + usernameId).val();
	var password = $('#' + passwordId).val();
	var l = Plupp.login(username, password);

	$.when(
		l.run()
	)
	.then(function() {
		console.log(l.reply);
		if (l.reply.request === true) {
			$('#' + messageId).html('').hide();
			hideModal('loginForm');
			doSessionUpdate('menuSessionActive', 'menuSessionInactive');
		}
		else {
			$('#' + messageId).html("Login failed, please try again...").show();
		}
	})
	.fail(function() {
		$('#' + messageId).html("Login failed, please try again...").show();
	});
}

function doLogout() {
	var l = Plupp.logout();

	$.when(
		l.run()
	)
	.then(function() {
		doSessionUpdate('menuSessionActive', 'menuSessionInactive');
	})
	.fail(function() {
		doSessionUpdate('menuSessionActive', 'menuSessionInactive');
	});
}

//
// Class for basic Stack implementation
//
function Stack() {
	this.stack = new Array();

	this.pop = function() {
		return this.stack.pop();
	}

	this.push = function(item) {
		this.stack.push(item);
	}

	this.peek = function(item) {
		if (this.stack.length > 0) {
			return this.stack[this.stack.length - 1];
		}
		return undefined;
	}

	this.clear = function() {
		this.stack.length = 0;
	}

	this.length = function() {
		return this.stack.length;
	}
}

//
// Class for handling Plupp Views at UI application
//
// @param tableContainerId DOM id for table div
// @param chartContainerId DOM id for chart div
// @param startPeriod is a date, e.g. 2016-12-01
// @param length is number of months from the startPeriod
//
function PluppView(tableContainerId, chartContainerId, startPeriod, length) {
	var self = this; // keep reference to this object to be used independent of call context
	this.tableContainerId = tableContainerId;
	this.chartContainerId = chartContainerId;
	this.startPeriod = startPeriod;
	this.length = length;
	this.title = 'Define Title Here';
	this.mode = 'chart'; // possible view modes are 'table' or 'chart'
	this.view = null; // current view
	this.viewArg = null; // current view argument
	this.stack = new Stack(); // view stack

	// @param mode The new mode to set, if left undefined it is toggled
	this.setViewMode = function(mode) {
		if (typeof(mode) == 'undefined') {
			// toggle mode
			self.mode = self.mode == 'table' ? 'chart' : 'table';
		}
		else if (mode == 'table' || mode == 'chart') {
			self.mode = mode;
		}

		// clear container and change to it
		if (self.mode == 'chart') {
			$('#' + self.tableContainerId).hide();
			$('#' + self.chartContainerId).html('').show();
		}
		else {
			$('#' + self.chartContainerId).hide();
			$('#' + self.tableContainerId).html('').show();
		}

		// call call-back
		if (typeof(self.view) == 'function') {
			self.view.apply(this, self.viewArg)
		}
		else {
			console.log("ignoring call to unknown view function, calling default");
			self.plans();
		}

		return self.mode;
	}

	// push view to navigation stack
	this.pushView = function(title, view, args) {
		// TODO
	}

	this.onError = function(e) {
		console.log("something went wrong: " + e);
	}

	this.allocation = function() {
		self.view = self.allocation;
		self.title = 'Project Allocation';
		var projects = Plupp.getProjects();
		var quotas = Plupp.getQuota(self.startPeriod, 1, 'project');
		var alloc = Plupp.getAllocation(self.startPeriod, 1, 'raw');
		var resc = Plupp.getResource();

		$.when(
			quotas.run(), projects.run(), alloc.run(), resc.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'quotas');
				t.addNameHeader(projects.reply.data, ['projectId', 'period']);
				t.addDataSection(resc.reply.data, alloc.reply.data, 'projectId', 'editable');
				t.addSum();
				t.addDataRow('Quota', quotas.reply.data, 'projectId', 'header');
				t.addDelta(); // delta = available - sum
				t.build(true, $('#' + self.tableContainerId), self.project);
			}
			else {
				// TODO self._chartStackedArea('project', projects, quotas, alloc, 'Requested');
			}
		})
		.fail(self.onError);
	}

	this.quotas = function() {
		self.view = self.quotas;
		self.title = 'Project Quotas';
		var projects = Plupp.getProjects();
		var quotas = Plupp.getQuota(self.startPeriod, self.length, 'project');
		var alloc = Plupp.getAllocation(self.startPeriod, self.length);
		var avail = Plupp.getAvailable(self.startPeriod, self.length);

		$.when(
			quotas.run(), projects.run(), alloc.run(), avail.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'quotas');
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, quotas.reply.data, 'period', 'editable');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'period', 'header');
				t.addDelta(); // delta = available - sum
				t.addDataRow('Requested', alloc.reply.data, 'period', 'header');
				t.addDelta(-4, -1); // delta = sum - requested
				t.build(true, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, quotas, alloc, 'Requested');
			}
		})
		.fail(self.onError);
	}

	this.plans = function() {
		self.view = self.plans;
		self.title = 'Project Resource Plans';
		var projects = Plupp.getProjects();
		var alloc = Plupp.getAllocation(self.startPeriod, self.length, 'project');
		var quotas = Plupp.getQuota(self.startPeriod, self.length);

		$.when(
			alloc.run(), projects.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, alloc.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'period', 'header');
				t.addDelta(); // delta = quota - sum
				t.build(false, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, alloc, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.project = function(/*projectId*/) {
		self.title = 'Project Resource Plan: ';
		self.view = self.project;
		self.viewArg = arguments;
		var projectId = arguments[0];
		var teams = Plupp.getTeams();
		var alloc = Plupp.getAllocation(self.startPeriod, self.length, 'project', projectId, 'team');
		var quota = Plupp.getQuota(startPeriod, length, 'project', projectId);
		var project = Plupp.getProject(projectId);

		$.when(
			teams.run(), quota.run(), alloc.run(), project.run()
		)
		.then(function() {
			if (typeof(project.reply.data) != 'undefined') {
				self.title += project.reply.data[0].name;
			}

			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'plan', projectId);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, alloc.reply.data, 'period', 'constant', projectId);
				t.addSum();
				t.addDataRow('Quota', quota.reply.data, 'period', 'header');
				t.addDelta(); // delta = quota - sum
				t.build(false, $('#' + self.tableContainerId), self.projectTeam);
			}
			else {
				self._chartStackedArea('team', teams, alloc, quota, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.projectTeam = function(/*teamId, projectId*/) {
		self.title = 'Project Team Resource Requests';
		self.view = self.projectTeam;
		self.viewArg = arguments;
		var teamId = arguments[0];
		var projectId = arguments[1];
		var project = Plupp.getProject(projectId);
		var team = Plupp.getTeam(teamId);
		var alloc = Plupp.getResourceAllocation(self.startPeriod, self.length, projectId, teamId);
		var resc = Plupp.getResource('team', teamId);

		$.when(
			team.run(), alloc.run(), project.run(), resc.run()
		)
		.then(function() {
			if (typeof(team.reply.data) != 'undefined' && typeof(project.reply.data) != 'undefined') {
				self.title = 'Project ' + project.reply.data[0].name + ': ' + team.reply.data[0].name + ' resource requests';
			}

			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'allocation', projectId);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(resc.reply.data, alloc.reply.data, 'period', 'editable', projectId);
				t.addSum();
//				t.addDataRow('Available', avail.reply.data, 'period', 'header');
//				t.addDelta(); // delta = available - sum
				t.build(true, $('#' + self.tableContainerId), self.resource);
			}
			else {
				self._chartStackedArea('resource', resc, alloc/*, avail, 'Available'*/);
			}
		})
		.fail(self.onError);
	}

	this.teams = function() {
		self.view = self.teams;
		self.title = 'Team Resource Requests';
		var teams = Plupp.getTeams();
		var alloc = Plupp.getAllocation(self.startPeriod, self.length, 'team');
		var avail = Plupp.getAvailable(self.startPeriod, self.length);

		$.when(
			alloc.run(), teams.run(), avail.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, alloc.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'period', 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), self.team);
			}
			else {
				self._chartStackedArea('team', teams, alloc, avail, 'Available');
			}
		})
		.fail(self.onError);
	}

	this.available = function() {
		self.view = self.available;
		self.title = 'Resource Availability';
		var teams = Plupp.getTeams();
		var avail = Plupp.getAvailable(self.startPeriod, self.length, 'team');
		var quotas = Plupp.getQuota(self.startPeriod, self.length);

		$.when(
			avail.run(), teams.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, avail.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'period', 'header');
				t.addDelta(); // delta = quota - available
				t.build(false, $('#' + self.tableContainerId), self.team);
			}
			else {
				self._chartStackedArea('team', teams, avail, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.departments = function() {
		self.view = self.departments;
		self.title = 'Departments';
		var depts = Plupp.getDepartment();
		var avail = Plupp.getAvailable(self.startPeriod, self.length, 'department');
		var quotas = Plupp.getQuota(self.startPeriod, self.length);

		$.when(
			avail.run(), depts.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(depts.reply.data, avail.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'period', 'header');
				t.addDelta(-2, -1); // delta =  available - quota
				t.build(false, $('#' + self.tableContainerId), self.department);
			}
			else {
				self._chartStackedArea('department', depts, avail, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.department = function(/*departmentId*/) {
		self.title = 'Department: ';
		self.view = self.department;
		self.viewArg = arguments;
		var departmentId = arguments[0];
		var dept = Plupp.getDepartment(departmentId);
		var resc = Plupp.getResource('department', departmentId);
		var avail = Plupp.getResourceAvailability(self.startPeriod, self.length, 'department', departmentId);

		$.when(
			avail.run(), dept.run(), resc.run()
		)
		.then(function() {
			if (typeof(dept.reply.data) != 'undefined') {
				self.title += dept.reply.data[0].name;
			}
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'resourceavailability', 666);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(resc.reply.data, avail.reply.data, 'period', 'editable');
				t.addSum();
				t.build(true, $('#' + self.tableContainerId), self.resource);
			}
			else {
//				self._chartStackedArea('resource', teams, avail, quotas, 'Quota');
				console.log("chart not supported for this view");
			}
		})
		.fail(self.onError);
	}

	this.team = function(/*teamId*/) {
		self.title = 'Team Resource Requests: ';
		self.view = self.team;
		self.viewArg = arguments;
		var teamId = arguments[0];
		var team = Plupp.getTeam(teamId);
		var projects = Plupp.getProjects();
		var alloc = Plupp.getAllocation(self.startPeriod, self.length, 'team', teamId);
		var avail = Plupp.getAvailable(self.startPeriod, self.length, 'team', teamId);

		$.when(
			team.run(), alloc.run(), projects.run(), avail.run()
		)
		.then(function() {
			if (typeof(team.reply.data) != 'undefined') {
				self.title += team.reply.data[0].name;
			}

			if (self.mode == 'table') {
				var t = new PluppTable(self.title);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, alloc.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'period', 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, alloc, avail, 'Available');
			}
		})
		.fail(self.onError);
	}

	// @TODO make this complete, show which projects a specific resource is allocated to
	this.resource = function(/*resourceId*/) {
		self.title = 'Resource: ';
		self.view = self.resource;
		self.viewArg = arguments;
		var resourceId = arguments[0];
		var projects = Plupp.getProjects();
		var resc = Plupp.getResource('resource', resourceId);
		var alloc = Plupp.getAllocation(self.startPeriod, self.length, 'resource', resourceId, 'project');
		var avail = Plupp.getResourceAvailability(self.startPeriod, self.length, 'resource', resourceId);

		$.when(
			avail.run(), projects.run(), resc.run()
		)
		.then(function() {
			if (typeof(resc.reply.data) != 'undefined') {
				self.title += resc.reply.data[0].name;
			}
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'resourceavailability', 666);
				t.addDateHeader(self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, alloc.reply.data, 'period', 'constant');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'period', 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, alloc, avail, 'Available');
				console.log("chart not supported for this view");
			}
		})
		.fail(self.onError);
	}

	this._chartStackedArea = function(callback, titles, values, limit, limitTitle) {
		var config = { 
			stack: true,
			clickable: true,
			hoverable: true,
			shadowSize: 1,
		};

		var limitConfig = { 
			clickable: true,
			hoverable: true,
			lines: {
				stack: false,
				shadowSize: 1,
				fill: false,
				lineWidth: 3,
				shadowSize: 1
			},
			color: '#000'
		};

		var c = new PluppChart(self, self.title, 'month', self.startPeriod, self.length);
		c.addDataSection(titles.reply.data, values.reply.data, callback, config);
		if (typeof(limit) !== 'undefined') {
			c.addDataRow(limitTitle, limit.reply.data, callback, limitConfig);
		}
		c.build($('#' + self.chartContainerId), 400);
	}

}
