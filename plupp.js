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

// convert Plupp JSON to Flot data format
function expand(titles, values, startPeriod, length) {
	var lookup = [];
	var series = [];

	// initalize a data serie per title
	$.each(titles, function(i, v) {
		var data = [];
		series.push(data); // Flot needs array in order
		lookup[v.id] = data; // store reference to data object, instead of searching for objects
	});

	// add datapoints
	$.each(values, function(i, v) {
		if (typeof lookup[v.id] !== 'undefined') {
			lookup[v.id].push([v.period - startPeriod, v.value]);
		}
	});

	return series;
}

// convert Plupp JSON to Flot data format and fill all blanks with zeros
function expandAndFill(config, titles, values, startPeriod, length) {
	var zeroes = [];
	for (var i = 0; i < length; i++) {
		zeroes.push([startPeriod + i, 0]);
	}

	var lookup = [];
	var series = [];

	// initalize a data serie per title with default values
	$.each(titles, function(i, v) {
		var data = $.extend(true, [], zeroes); // make deep copy of zeroes array (and the arrays it contains)
		series.push($.extend({ 'label': v.name, 'data': data }, config));
		lookup[v.id] = data; // store reference to data object, instead of searching for objects
	});

	// add real values to datapoints
	$.each(values, function(i, v) {
		if (typeof lookup[v.id] !== 'undefined') {
			lookup[v.id][v.period - startPeriod][1] = v.value;
		}
	});

	return series;
}

PluppChart = {
	stackedArea2: function(containerId, startPeriod, length) {
		var projects = Plupp.getProjects();
		var plans = Plupp.getPlans(startPeriod, length);
		var quotas = Plupp.getQuotaSum(startPeriod, length);

		$.when(
			plans.run(), projects.run(), quotas.run()
		)
		.then(function() {
			var config = { 
				clickable: true,
				hoverable: true,
				shadowSize: 1,
				stack: true,
			};
			var data = expandAndFill(config, projects.reply.data, plans.reply.data, startPeriod, length);


			var qConfig = { 
				clickable: true,
				hoverable: true,
				lines: {
					shadowSize: 1,
					stack: false,
					fill: false,
					lineWidth: 2,
					shadowSize: 1
				},
				color: '#000'
			};
			var qData = [[11, 50], [12, 50], [13, 50], [14, 50], [15, 50], [16, 50], [17, 50]];
			data.push($.extend({ 'label': 'Quota', 'data': qData }, qConfig));

			$.plot('#' + containerId, data, {
				series: {
/*					stack: 0, */
					lines: {
						show: true,
						fill: true,
						lineWidth: 1,
						shadowSize: 0
					},
					points: {
						//show: true
					}
				},
				yaxis: {
					min: 0,
//					max: 150
				},
				grid: {
					borderWidth: 0,
					margin: 10,
					hoverable: true,
					clickable: true
				},
				legend: {
					show: true,
					labelFormatter: null, // function(label, series) { return '<a href="#' + label + '">' + label + '</a>'; }
					labelBoxBorderColor: null,
					noColumns: 2,
					position: "ne",
					margin: [2, 2], // number of pixels or [x margin, y margin]
					backgroundColor: '#fff', // null or color
					backgroundOpacity: 0.5, //number between 0 and 1
//					container: $('#chart-legend'), //null or jQuery object/DOM element/jQuery expression
//					sorted: null/false, true, "ascending", "descending", "reverse", or a comparator
				}
			});

			$("<div id='tooltip'></div>").css({
				position: "absolute",
				display: "none",
				border: "1px solid #fdd",
				padding: "2px",
				"background-color": "#fee",
				opacity: 0.80
			}).appendTo("body");



			$('#' + containerId).bind("plothover", function(event, pos, item) {
				if (item) {
					/*
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

					$("#tooltip").html(item.series.label + " of " + x + " = " + y)
						.css({top: item.pageY + 5, left: item.pageX + 5})
						.fadeIn(200);
				}
				else {
					$("#tooltip").hide();
				}
			});
/*
			$("#placeholder").bind("plotclick", function (event, pos, item) {
				if (item) {
					$("#clickdata").text(" - click point " + item.dataIndex + " in " + item.series.label);
					plot.highlight(item.series, item.datapoint);
				}
			});
*/



		})
		.fail(function() {
			console.log( "something went wrong!" );
		});

	},
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

