<html>
	<head>
		<title>PLUPP - Steakes on the grill</title>
		<meta charset="utf-8">
		<link rel="shortcut icon" href="../plupp.png" />

		<style>
			body {
				width: 100%;
				height: 100%;
				background-color: #000;
				background: url('grill.jpg') no-repeat 50% 50% fixed; 
				background-size: cover;
			}

			img {
				margin: 4px;
			}

			.grill-item { 
				width: 50px; 
				text-align: center;
			}

			.grill-item-text {
				color: #fff;
				font-family: sans-serif;;
				text-align: center;
				text-shadow: 1px 1px 2px #000, 0px 1px 3px #000;
				background: rgba(0,0,0,0);
				left: 0;
				position: absolute;
				top: 10px;
				width: 100%;
			}

			.grill-item-width1 { 
				width: 100px; 
			}

			.grill-item-width2 { 
				width: 200px; 
			}

			.grill-item-width3 { 
				width: 300px; 
			}

		</style>

		<script src="../jquery-3.1.1.min.js"></script>
		<script src="../masonry.min.js"></script>
		<script src="../moment.min.js"></script>
		<script src="../plupp.lib.js"></script>
		<script>
			function onResize() {

			}

			function makeBBQ(data) {
				var maxWidth = 300; // max width

				// get min and max
				var max = 0, min = 99999999;
				$.each(data, function(i, p) {
					if (p.value > max) max = p.value;
					if (p.value < min) min = p.value;
				});
				console.log("min = " + min + ", max = " + max);

				// put some steakes on the grill
				$.each(data, function(i, p) {
					if (p.value == 0) {
						return true; // continue
					}

					var src = (p.value == min) ? 'shrimp.png' : 'beef.png';
					var w = Math.floor(maxWidth * (p.value / max) - 3);

					var img = $('<img class="grill-item-img" src="' + src + '" width="' + w + '">')
								.hover(
									function() { $(this).closest('div').find('span').show(); }, 
									function() { $(this).closest('div').find('span').hide(); });

					var div = $('<div class="grill-item" />')
								.addClass('grill-item-width' + Math.ceil(w/100))
								.append(img)
								.append('<span class="grill-item-text"><b>' + p.name + '</b><br>' + p.value + ' FTE</span>');

					$('#grill').append(div);
				});

				$('.grill-item-text').hide();
				$('#grill').masonry({
					// options
					itemSelector: '.grill-item',
					columnWidth: 100
				});
			}

			function loadData() {
				var projects = Plupp.getProjects();
				var allocation = Plupp.getAllocation('2017-01-01', 1, 'project');

				$.when(
					projects.run(), allocation.run()
				)
				.then(function() {
					$.each(allocation.reply.data, function(i, a) {
						$.each(projects.reply.data, function(j, p) {
							if (a.id === p.id) {
								a['name'] = p.name;
								return false; // break
							}
						});
					});
					makeBBQ(allocation.reply.data);
				})
				.fail(function() {
					console.log("loading data failed");
				});
			}

			$(window).resize(function() {
				onResize();
			});

			$(document).ready(function() {
				onResize();
				loadData();
			});

		</script>
	</head>
	<body>
		<div id="grill"></div>
	</body>
</html>
