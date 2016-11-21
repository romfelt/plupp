// @TODO date formatting
// @TODO add last updated timestamp to each view
// @TODO integrate graph library: area, bars, heat-map pie charts (project/teams)

function quotasTable(startPeriod, length) {
	var projects = Plupp.getProjects();
	var quotas = Plupp.getQuotas(startPeriod, length);
	var requested = Plupp.getPlanSum(startPeriod, length);

	// $.when.apply($, my_array);
	$.when(
		quotas.run(), projects.run(), requested.run()
	)
	.then(function() {
		var t = new PluppTable('Project Quotas', 'month', startPeriod, length, 'quotas');
		t.addDataSection(projects.reply.data, quotas.reply.data, 'editable');
		t.addSum();
		t.addDataRow('Available', [], 'header');
		t.addDelta(); // delta = available - sum
		t.addDataRow('Requested', requested.reply.data, 'header');
		t.addDelta(-4, -1); // delta = sum - requested
		t.addButtons();
		t.build(true, $('#table-container'), function(projectId) {
			projectTable(projectId, startPeriod, length);
		});
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

function plansTable(startPeriod, length) {
	var projects = Plupp.getProjects();
	var plans = Plupp.getPlans(startPeriod, length);
	var quotas = Plupp.getQuotaSum(startPeriod, length);

	$.when(
		plans.run(), projects.run(), quotas.run()
	)
	.then(function() {
		var t = new PluppTable('Project Resource Plans', 'month', startPeriod, length);
		t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
		t.addSum();
		t.addDataRow('Quotas', quotas.reply.data, 'header');
		t.addDelta(); // delta = quota - sum
		t.build(false, $('#table-container'), function(projectId) {
			projectTable(projectId, startPeriod, length);
		});
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

function projectTable(projectId, startPeriod, length) {
	var teams = Plupp.getTeams();
	var plan = Plupp.getPlan(projectId, startPeriod, length);
	var quota = Plupp.getQuota(projectId, startPeriod, length);
	var project = Plupp.getProject(projectId);

	$.when(
		teams.run(), quota.run(), plan.run(), project.run()
	)
	.then(function() {
		var title = 'Project Resource Plan: ';
		if (typeof(project.reply.data) != 'undefined') {
			title += project.reply.data[0].name;
		}
		var t = new PluppTable(title, 'month', startPeriod, length, 'plan', projectId);
		t.addDataSection(teams.reply.data, plan.reply.data, 'editable');
		t.addSum();
		t.addDataRow('Quota', quota.reply.data, 'header');
		t.addDelta(); // delta = quota - sum
		t.addButtons();
		t.build(true, $('#table-container'), function(teamId) {
			teamTable(teamId, startPeriod, length);
		});
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

function teamsTable(startPeriod, length) {
	var teams = Plupp.getTeams();
	var plans = Plupp.getTeamsPlan(startPeriod, length);

	$.when(
		plans.run(), teams.run()
	)
	.then(function() {
		var t = new PluppTable('Teams Resource Requests', 'month', startPeriod, length);
		t.addDataSection(teams.reply.data, plans.reply.data, 'constant');
		t.addSum();
		t.addDataRow('Available', [], 'header');
		t.addDelta(); // delta = available - sum
		t.build(false, $('#table-container'), function(teamId) {
			teamTable(teamId, startPeriod, length);
		});
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

function teamTable(teamId, startPeriod, length) {
	var team = Plupp.getTeam(teamId);
	var teamPlans = Plupp.getTeamPlans(teamId, startPeriod, length);
	var projects = Plupp.getProjects();

	$.when(
		team.run(), teamPlans.run(), projects.run()
	)
	.then(function() {
		var title = 'Team Resource Requests: ';
		if (typeof(team.reply.data) != 'undefined') {
			title += team.reply.data[0].name;
		}
		var t = new PluppTable(title, 'month', startPeriod, length);
		t.addDataSection(projects.reply.data, teamPlans.reply.data, 'constant');
		t.addSum();
		t.addDataRow('Available', [], 'header');
		t.addDelta(); // delta = available - sum
		t.build(false, $('#table-container'), function(projectId) {
			projectTable(projectId, startPeriod, length);
		});
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}


PluppChart = {
	stackedArea: function(containerId, data) {
		var d1 = [];
		for (var i = 0; i <= 10; i += 1) {
			d1.push([i, parseInt(Math.random() * 30)]);
		}

		var d2 = [];
		for (var i = 0; i <= 10; i += 1) {
			d2.push([i, parseInt(Math.random() * 30)]);
		}

		var d3 = [];
		for (var i = 0; i <= 10; i += 1) {
			d3.push([i, parseInt(Math.random() * 30)]);
		}

		$.plot('#' + containerId, [ d1, d2, d3 ], {
			series: {
				stack: 0,
				lines: {
					show: true,
					fill: true
				}
			},
			grid: {
				borderWidth: 0,
				margin: 10
			}
		});
	}
}

function showView(view) {
	if (view == 'quotas') {
		quotasTable(11, 24);
	}
	else if (view == 'plans') {
		plansTable(11, 24);
	}
	else if (view == 'teams') {
		teamsTable(11, 24);
	}
}


function login(username, password) {
	var l = Plupp.login(username, password);

	$.when(
		l.run()
	)
	.then(function() {
		console.log("login success");
		console.log(l.reply);
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

