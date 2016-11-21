<html>
	<head>
		<title>Plupp 0.1</title>
		<meta charset="utf-8">
		<link rel="stylesheet" type="text/css" href="plupp.css" />
		<script src="jquery-3.1.1.min.js"></script>
		<script src="flot/jquery.flot.js"></script>
		<script src="flot/jquery.flot.stack.js"></script>
		<script src="editabletable.js"></script>
		<script src="plupp.lib.js"></script>
		<script src="plupp.js"></script>

		<script>

			$(document).ready(function() {
				console.log("Plupp is ready!");
//				teamTable(3, 11, 24);

				PluppChart.stackedArea('chart-container', null);
			});

		</script>


	</head>
	<body>
		<div id="menu" style="display:table;">
			<div style="display:table-cell;vertical-align:middle;">
				<a id="logo" href="">PLUPP</a>
				<a onClick="showView('allocation');">Allocation</a>
				<a onClick="showView('quotas');">Quotas</a>
				<a onClick="showView('plans');">Project Plans</a>
				<a onClick="showView('teams');">Teams</a>
				<a onClick="showView('vacation');">Vacation</a>
				<a onClick="showView('reports');">Reports</a>
				<a onClick="login('romfelt', '****');">Login</a>
			</div>
		</div>
		<div id="main">
			<div id="table-container"></div>
		</div>


		<div id="chart-container" style="height: 250px;"></div>

		<div id="buttons"></div>
	</body>
</html>