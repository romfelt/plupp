// @TODO date formatting
// @TODO add last updated timestamp to each view
// @TODO integrate graph library: area, bars, heat-map pie charts (project/teams)

$.fn.center = function() {
	this.css('position', 'fixed');
	this.css('top', ($(window).height() / 2 - this.height() / 2) + 'px');
	this.css('left', ($(window).width() / 2 - this.width() / 2) + 'px');
	return this;
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
function PluppView(startPeriod, length) {
	var self = this; // keep reference to this object to be used independent of call context
	this.startPeriod = startPeriod;
	this.length = length;
	this.tableContainerId = 'table-container';
	this.chartContainerId = 'chart-container';
	this.title = 'Define Title Here';
	this._mode = 'table'; // possible modes are 'table' or 'chart'

	this.mode = function(mode) {
		if (typeof(mode) == 'undefined') {
			return self._mode;
		}
		self._mode = mode;
	}

	this.onError = function() {
		console.log("something went wrong!");
	}

	this.quotas = function() {
		var projects = Plupp.getProjects();
		var quotas = Plupp.getQuotas(self.startPeriod, self.length);
		var requested = Plupp.getPlanSum(self.startPeriod, self.length);

		$.when(
			quotas.run(), projects.run(), requested.run()
		)
		.then(function() {
			if (self.mode() == 'table') {
				var t = new PluppTable('Project Quotas', 'month', self.startPeriod, self.length, 'quotas');
				t.addDataSection(projects.reply.data, quotas.reply.data, 'editable');
				t.addSum();
				t.addDataRow('Available', [], 'header');
				t.addDelta(); // delta = available - sum
				t.addDataRow('Requested', requested.reply.data, 'header');
				t.addDelta(-4, -1); // delta = sum - requested
				t.build(true, $('#' + self.tableContainerId), function(projectId) {
					self.project(projectId);
				});
			}
			else {
				self._chartStackedArea(projects, quotas, requested, 'Requested');
			}
		})
		.fail(self.onError);
	}

	this.plans = function() {
		self.title = 'Project Resource Plans';
		var projects = Plupp.getProjects();
		var plans = Plupp.getPlans(self.startPeriod, self.length);
		var quotas = Plupp.getQuotaSum(self.startPeriod, self.length);

		$.when(
			plans.run(), projects.run(), quotas.run()
		)
		.then(function() {
			if (self.mode() == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Quotas', quotas.reply.data, 'header');
				t.addDelta(); // delta = quota - sum
				t.build(false, $('#' + self.tableContainerId), function(projectId) {
					self.project(projectId);
				});
			}
			else {
				self._chartStackedArea(projects, plans, quotas, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.teams = function() {
		self.title = 'Team Resource Requests';
		var teams = Plupp.getTeams();
		var plans = Plupp.getTeamsPlan(self.startPeriod, self.length);
		// @TODO add available

		$.when(
			plans.run(), teams.run()
		)
		.then(function() {
			if (self.mode() == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(teams.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Available', [], 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), function(teamId) {
					self.team(teamId);
				});
			}
			else {
				self._chartStackedArea(teams, plans);
			}
		})
		.fail(self.onError);
	}

	this.project = function(projectId) {
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
			if (self.mode() == 'table') {
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length, 'plan', projectId);
				t.addDataSection(teams.reply.data, plan.reply.data, 'editable');
				t.addSum();
				t.addDataRow('Quota', quota.reply.data, 'header');
				t.addDelta(); // delta = quota - sum
				t.build(true, $('#' + self.tableContainerId), function(teamId) {
					self.team(teamId);
				});
			}
			else {
				self._chartStackedArea(teams, plan, quota, 'Quota');
			}
		})
		.fail(self.onError);
	}

	this.team = function(teamId) {
		self.title = 'Team Resource Requests: ';
		var team = Plupp.getTeam(teamId);
		var plans = Plupp.getTeamPlans(teamId, self.startPeriod, self.length);
		var projects = Plupp.getProjects();
		// @TODO add available

		$.when(
			team.run(), plans.run(), projects.run()
		)
		.then(function() {
			if (self.mode() == 'table') {
				if (typeof(team.reply.data) != 'undefined') {
					self.title += team.reply.data[0].name;
				}
				var t = new PluppTable(self.title, 'month', self.startPeriod, self.length);
				t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
				t.addSum();
				t.addDataRow('Available', [], 'header');
				t.addDelta(); // delta = available - sum
				t.build(false, $('#' + self.tableContainerId), function(projectId) {
					self.project(projectId);
				});
			}
			else {
				self._chartStackedArea(projects, plans);
			}
		})
		.fail(self.onError);
	}

	this._chartStackedArea = function(titles, values, limit, limitTitle) {
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

		var c = new PluppChart(self.chartTitle, 'month', self.startPeriod, self.length);
		c.addDataSection(titles.reply.data, values.reply.data, config);
		if (typeof(limit) !== 'undefined') {
			c.addDataRow(limitTitle, limit.reply.data, limitConfig);
		}
		c.build($('#' + self.chartContainerId));
	}

}
