// @TODO date formatting
// @TODO add last updated timestamp to each view
// @TODO make projects and teams clickable to navigate further into details
// @TODO integrate graph library: area, bars, heat-map pie charts (project/teams)

function quotasTable(startPeriod, length) {
	var projects = Plupp.getProjects();
	var quotas = Plupp.getQuotas(startPeriod, length);

	// $.when.apply($, my_array);
	$.when(
		quotas.run(), projects.run()
	)
	.then(function() {
		var t = new PluppTable('Project Quotas', 'month', startPeriod, length, 'quotas');
		t.addDataSection(projects.reply.data, quotas.reply.data, 'editable');
		t.addSum();
		t.addDataRow('Available', [], 'header');
		t.addDelta();
		t.addDataRow('Requested', [], 'header');
		t.addDelta();
		t.addButtons();
		t.build(true, $('#table-container'));
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
}

function plansTable(startPeriod, length) {
	var projects = Plupp.getProjects();
	var plans = Plupp.getPlans(startPeriod, length);

	$.when(
		plans.run(), projects.run()
	)
	.then(function() {
		var t = new PluppTable('Project Resource Plans', 'month', startPeriod, length);
		t.addDataSection(projects.reply.data, plans.reply.data, 'constant');
		t.addSum();
		t.addDataRow('Available', [], 'header');
		t.addDelta();
		t.build(false, $('#table-container'));
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
		t.addDelta();
		t.addButtons();
		t.build(true, $('#table-container'));	
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
		t.addDelta();
		t.build(false, $('#table-container'));
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
		t.addDelta();
		t.build(false, $('#table-container'));
	})
	.fail(function() {
		// @TODO 
		console.log( "something went wrong!" );
	});
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

$(document).ready(function() {
	console.log("Plupp is ready!");
	teamTable(3, 11, 24);
});
