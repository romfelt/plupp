<html>
	<head>
		<title>PLUPP 0.5</title>
		<meta charset="utf-8" />
		<meta http-equiv="cache-control" content="no-cache" />
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
			var view = new PluppView('table-container', 'chart-container', '2016-11-01', 24);

			function onResize() {
				// handle menu bar overflow
				$('#main').css('margin-top', $('#menu').innerHeight() + 'px');
				//$('#chart-container').innerHeight(($('body').height() - $('#menu').innerHeight()) + 'px');
			}
			
			$(window).resize(function() {
				onResize();
			});

			$(document).ready(function() {
				onResize();
				view.setViewMode('chart');
				doSessionUpdate('menuSessionActive', 'menuSessionInactive');
				console.log("Plupp is ready!");
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
						<a onClick="view.allocation();">Allocation</a>
						<a onClick="view.plans();">Project Plans</a>
						<a onClick="view.quotas();">Project Budgets</a>
						<a onClick="view.available();">Available Resources</a>
						<a onClick="view.teams();">Disciplines</a>
						<a onClick="view.departments();">Departments</a>
						<!-- TODO a onClick="">Vacation</a-->
					</td>
					<td id="menuSession" style="text-align: right">						
						<span id="menuSessionActive"><a onClick="doLogout();"><img class="icon" src="icons/020-user-white.svg"> Logout <span id="menuSessionActiveUser"></span></a></span>
						<span id="menuSessionInactive"><a onClick="showModal('loginForm');"><img class="icon" src="icons/020-user-white.svg"> Login</a></span>
					</td>
				</tr>
			</table>
		</div>

		<div id="main">
			<div id="viewMenu">
				<a onClick="showModal('labelForm');"><img class="icon" src="icons/017-plus.svg"> Add label</a>
				<a onClick="showLabels(this);"><img class="icon" src="icons/013-tag.svg"> Labels</a>
				<a onClick="showHistory(this);"><img class="icon" src="icons/018-clock.svg"> History</a>
				<a onClick="view.setViewMode('chart');"><img class="icon" src="icons/016-stats.svg"> Chart view</a>
				<a onClick="view.setViewMode('table');"><img class="icon" src="icons/015-list.svg"> Table view</a>
			</div>
			<div id="table-container"></div>
			<div id="chart-container" style="height: 400px;"></div>
		</div>

		<div id="loginForm" class="modal-form">
			<input id="loginUsername" placeholder="Username" />
			<input id="loginPassword" placeholder="Password" type="password" class="" />
			<div>
				<button class="button button-blue" onClick="doLogin('loginUsername', 'loginPassword', 'loginMessage');"><img class="icon" src="icons/001-check-white.svg"> Login</button>
				<button class="button button-black" onClick="hideModal('loginForm');"><img class="icon" src="icons/002-close-white.svg"> Close</button>
			</div>
			<div id="loginMessage" class="modal-form-message"></div>
		</div>

		<div id="labelForm" class="modal-form">
			<input id="labelText" placeholder="Label" />
			<div>
				<button class="button button-blue" onClick="createLabel('labelText', 'labelMessage');"><img class="icon" src="icons/001-check-white.svg"> Create</button>
				<button class="button button-black" onClick="hideModal('labelForm');"><img class="icon" src="icons/002-close-white.svg"> Close</button>
			</div>
			<div id="labelMessage" class="modal-form-message"></div>
		</div>

		<div id="buttons"></div>
		<div id="modal-bg"></div>

	</body>
</html>