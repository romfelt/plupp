<html>
	<head>
		<title>PLUPP 0.5</title>
		<meta charset="utf-8">
		<link rel="shortcut icon" href="/plupp/plupp.png" />
		<link rel="stylesheet" type="text/css" href="plupp.css" />
		<script src="jquery-3.1.1.min.js"></script>
		<script src="moment.min.js"></script>
		<script src="flot/jquery.flot.js"></script>
		<script src="flot/jquery.flot.time.js"></script>
		<script src="flot/jquery.flot.stack.js"></script>
		<script src="flot/jquery.flot.resize.js"></script>
		<script src="editabletable.js"></script>
		<script src="plupp.lib.js"></script>
		<script src="plupp.table.lib.js"></script>
		<script src="plupp.chart.lib.js"></script>
		<script src="plupp.js"></script>
		<script>
			var view = new PluppView('2016-11-01', 24);

			function onResize() {
				// handle menu bar overflow
				$('#main').css('margin-top', $('#menu').innerHeight() + 'px');
				//$('#chart-container').innerHeight(($('body').height() - $('#menu').innerHeight()) + 'px');
			}

			function toogleTableChart() {
				$('#table-container').hide();
				$('#chart-container').hide();
				if (view.mode() == 'chart') {
					view.mode('table');
					$('#viewMode').text('Change to Chart view');
					$('#table-container').show();
				}
				else {
					view.mode('chart');
					$('#viewMode').text('Change to Table view');
					$('#chart-container').show();
				}
				// @TODO make switch to same view
				view.plans();
			}

			$(window).resize(function() {
				onResize();
			});

			$(document).ready(function() {
				onResize();
				console.log("Plupp is ready!");
				toogleTableChart();
				doSessionUpdate('menuSessionActive', 'menuSessionInactive');
				view.plans();
			});

		</script>
	</head>
	<body>
		<div id="menu">
			<table>
				<tr>
					<td>
						<!-- @TODO make logo configurable -->
						<!--span id="logo"><img src="flir-logo-transparent.png"></span-->
						<a class="plupp-logo" href="">PLUPP</a>
						<a onClick="">Allocation</a>
						<a onClick="view.quotas();">Quotas</a>
						<a onClick="view.plans();">Project Plans</a>
						<a onClick="view.teams();">Teams</a>
						<a onClick="view.available();">Available Resources</a>
						<a onClick="view.departments();">Departments</a>
						<a onClick="">Vacation</a>
						<a id="viewMode" onClick="toogleTableChart();">llll</a>
					</td>
					<td id="menuSession" style="text-align: right">
						<span id="menuSessionActive"><a onClick="doLogout();">Logout</a></span>
						<span id="menuSessionInactive"><a onClick="showModal('loginForm');">Login</a></span>
					</td>
				</tr>
			</table>
		</div>

		<div id="main">
			<div id="table-container"></div>
			<div id="chart-container" style="height: 400px;"></div>
		</div>

		<div id="loginForm">
			<input id="loginUsername" placeholder="Username" />
			<input id="loginPassword" placeholder="Password" type="password" class="" />
			<div>
				<button class="button button-blue" onClick="doLogin('loginUsername', 'loginPassword', 'loginMessage');">Login</button>
				<button class="button button-black" onClick="hideModal('loginForm');">Close</button>
			</div>
			<div id="loginMessage"></div>
		</div>

		<div id="buttons"></div>
		<div id="modal-bg"></div>

	</body>
</html>