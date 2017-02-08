// @TODO add last X updated timestamp/user to each view
// @TODO allow browse history byt setting a timestamp
// @TODO add tag support: i.e. Evander TG2 @ 2017-01-23 12:02:11
// @TODO add new and update resources
// @TODO allocation

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
			self.view(self.viewArg)
		}
		else {
			console.log("ignoring call to unknown view function, calling default");
			self.plans();
		}

		return self.mode;
	}

	this.onError = function(e) {
		console.log("something went wrong: " + e);
	}

	this.quotas = function() {
		self.view = self.quotas;
		self.title = 'Project Quotas';
		var projects = Plupp.getProjects();
		var quotas = Plupp.getQuotas(self.startPeriod, self.length);
		var requested = Plupp.getPlanSum(self.startPeriod, self.length);

		$.when(
			quotas.run(), projects.run(), requested.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length, 'quotas');
				t.addDataSection(projects.reply.data, quotas.reply.data, 'editable');
				t.addSum();
				t.addDataRow('Available', [], 'header');
				t.addDelta(); // delta = available - sum
				t.addDataRow('Requested', requested.reply.data, 'header');
				t.addDelta(-4, -1); // delta = sum - requested
				t.build(true, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, quotas, requested, 'Requested');
			}
		})
		.fail(self.onError);
	}

	this.plans = function() {
		self.view = self.plans;
		self.title = 'Project Resource Plans';
		var projects = Plupp.getProjects();
		var plans = Plupp.getPlans(self.startPeriod, self.length);
		var quotas = Plupp.getQuotaSum(self.startPeriod, self.length);

		$.when(
			plans.run(), projects.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'header');
				t.addDelta(); // delta = quota - sum
				t.build(false, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, plans, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.teams = function() {
		self.view = self.teams;
		self.title = 'Team Resource Requests';
		var teams = Plupp.getTeams();
		var plans = Plupp.getTeamsPlan(self.startPeriod, self.length);
		var avail = Plupp.getAvailable(self.startPeriod, self.length);

		$.when(
			plans.run(), teams.run(), avail.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), self.team);
			}
			else {
				self._chartStackedArea('team', teams, plans, avail, 'Available');
			}
		})
		.fail(self.onError);
	}

	this.available = function() {
		self.view = self.available;
		self.title = 'Resource Availability';
		var teams = Plupp.getTeams();
		var avail = Plupp.getAvailable(self.startPeriod, self.length, 'team');
		var quotas = Plupp.getQuotaSum(self.startPeriod, self.length);

		$.when(
			avail.run(), teams.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, avail.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'header');
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
		var quotas = Plupp.getQuotaSum(self.startPeriod, self.length);

		$.when(
			avail.run(), depts.run(), quotas.run()
		)
		.then(function() {
			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(depts.reply.data, avail.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'header');
				t.addDelta(-2, -1); // delta =  available - quota
				t.build(false, $('#' + self.tableContainerId), self.department);
			}
			else {
				self._chartStackedArea('department', depts, avail, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.department = function(departmentId) {
		self.view = self.department;
		self.viewArg = departmentId;
		self.title = 'Department: ';
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
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length, 'resourceavailability', 666);
				t.addDataSection(resc.reply.data, avail.reply.data, 'editable');
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

	this.project = function(projectId) {
		self.view = self.project;
		self.viewArg = projectId;
		self.title = 'Project Resource Plan: ';
		var teams = Plupp.getTeams();
		var plan = Plupp.getPlan(projectId, startPeriod, length);
		var quota = Plupp.getQuota(projectId, startPeriod, length);
		var project = Plupp.getProject(projectId);

		$.when(
			teams.run(), quota.run(), plan.run(), project.run()
		)
		.then(function() {
			if (typeof(project.reply.data) != 'undefined') {
				self.title += project.reply.data[0].name;
			}

			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length, 'plan', projectId);
				t.addDataSection(teams.reply.data, plan.reply.data, 'editable');
				t.addSum();
				t.addDataRow('Quota', quota.reply.data, 'header');
				t.addDelta(); // delta = quota - sum
				t.build(true, $('#' + self.tableContainerId), self.team);
			}
			else {
				self._chartStackedArea('team', teams, plan, quota, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.team = function(teamId) {
		self.view = self.team;
		self.viewArg = teamId;
		self.title = 'Team Resource Requests: ';
		var team = Plupp.getTeam(teamId);
		var plans = Plupp.getTeamPlans(teamId, self.startPeriod, self.length);
		var projects = Plupp.getProjects();
		var avail = Plupp.getAvailable(self.startPeriod, self.length, 'team', teamId);

		$.when(
			team.run(), plans.run(), projects.run(), avail.run()
		)
		.then(function() {
			if (typeof(team.reply.data) != 'undefined') {
				self.title += team.reply.data[0].name;
			}

			if (self.mode == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Available', avail.reply.data, 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), self.project);
			}
			else {
				self._chartStackedArea('project', projects, plans, avail, 'Available');
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
