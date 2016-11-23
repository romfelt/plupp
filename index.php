<html>
	<head>
		<title>Plupp 0.5</title>
		<meta charset="utf-8">
		<link rel="stylesheet" type="text/css" href="plupp.css" />
		<script src="jquery-3.1.1.min.js"></script>
		<script src="flot/jquery.flot.js"></script>
		<script src="flot/jquery.flot.stack.js"></script>
		<script src="editabletable.js"></script>
		<script src="plupp.lib.js"></script>
		<script src="plupp.js"></script>
		<script>

			function onResize() {
				// handle menu bar overflow
				$('#main').css('margin-top', $('#menu').innerHeight() + 'px');
			}

			$(window).resize(function() {
				onResize();
			});

			$(document).ready(function() {
				onResize();
				console.log("Plupp is ready!");
				doSessionUpdate('menuSessionActive', 'menuSessionInactive');
				//teamTable(3, 11, 24);
				PluppChart.stackedArea2('chart-container', 11, 24);
			});

		</script>
	</head>
	<body>
		<div id="menu">
			<table>
				<tr>
					<td>
						<a class="logo" href="">PLUPP</a>
						<a onClick="showView('allocation');">Allocation</a>
						<a onClick="showView('quotas');">Quotas</a>
						<a onClick="showView('plans');">Project Plans</a>
						<a onClick="showView('teams');">Teams</a>
						<a onClick="showView('vacation');">Vacation</a>
						<a onClick="PluppChart.stackedArea2('chart-container', 11, 24);">Reports</a>
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
			<div id="chart-container" style="height: 250px;"></div>
			<div id="chart-legend" style="height: 250px;"></div>
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