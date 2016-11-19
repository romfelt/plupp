<html>
	<head>
		<title>Plupp 0.1</title>
		<meta charset="utf-8">
		<script src="jquery-3.1.1.min.js"></script>	
		<script src="plupp.js"></script>
		<script src="editabletable.js"></script>
		<link rel="stylesheet" type="text/css" href="plupp.css" />
	</head>
	<body>
		<div id="menu" style="display:table;">
			<div style="display:table-cell;vertical-align:middle;">
				<a id="logo" href="#plupp">PLUPP</a>
				<a onClick="showView('quotas');">Project Quotas</a>
				<a onClick="showView('plans');">Project Resource Plans</a>
				<a onClick="showView('teams');">Teams</a>
				<a href="#home">Vacation</a>
				<a href="#contact">Report</a>
			</div>
		</div>
		<div id="main">
			<div id="table-container"></div>
		</div>
		<div id="buttons"></div>
	</body>
</html>