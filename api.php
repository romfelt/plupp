<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL | E_STRICT);

// get the HTTP method, path and body of the request
$method = $_SERVER['REQUEST_METHOD'];
$request = ServiceEndPoint::getRequest();

if (!isset($method) || $request == null || !isset($request[0])) {
	echo "<h1>PLUPP API description</h1>";
	echo PostPlan::API . '<br>';
	echo GetPlan::API . '<br>';
	echo GetPlans::API . '<br>';
	echo PostQuota::API . '<br>';
	echo GetQuota::API . '<br>';
	echo GetQuotas::API . '<br>';
	echo GetProject::API . '<br>';
	echo GetProjects::API . '<br>';
	echo GetTeams::API . '<br>';
	exit();
}

require_once('plupp.php');

$cmd = $request[0];
$obj = null;

if ($method == 'POST') {
	switch ($cmd) {
		case 'plan': $obj = new PostPlan($request); break;
		case 'quota': $obj = new PostQuota($request); break;
	}
}
else if ($method == 'GET') {
	switch ($cmd) {
		case 'plan': $obj = new GetPlan($request); break;
		case 'plans': $obj = new GetPlans($request); break;
		case 'teams': $obj = new GetTeams($request); break;
		case 'project': $obj = new GetProject($request); break;
		case 'projects': $obj = new GetProjects($request); break;
		case 'quota': $obj = new GetQuota($request); break;
		case 'quotas': $obj = new GetQuotas($request); break;
	}
}

if ($obj === null) {
	ServiceEndPoint::replyAndDie(ServiceEndPoint::BAD_REQUEST, "Unknown API call: $method $cmd");
}

$obj->run();



// Base class for API service end-point.
// Extend this class and implement __constructor() and service() methods. Create an object and call run() method.
class ServiceEndPoint {
	const OK = 200;
	const BAD_REQUEST = 400;
	const SERVER_ERROR = 500;

	protected $plupp;
	protected $request;
	protected $requiredArgs;
	protected $reply; 

	// @param request The path at which script was called, see self::getRequest().
	// @param requiredArgs number of required args excluding end point name
	public function __construct($request, $requiredArgs = 0) {
		$this->request = $request;
		$this->requiredArgs = $requiredArgs;
	}

	public function __destruct() {
	}

	// Path info "api.php/some/args/and/data" results in the array [some, args, and, data]
	public static function getRequest() {
		global $_SERVER;
		return isset($_SERVER['PATH_INFO']) ? explode('/', trim($_SERVER['PATH_INFO'], '/')) : null;
	}

	public function run() {
		$this->init(); // will exit on fail
		$rc = $this->service(); // run the service

		// translate return code if set to true or false
		if ($rc === true) {
			$rc = self::OK;
		} 
		else if ($rc === false) {
			$rc = self::SERVER_ERROR;
		} 

		$this->reply($rc); // send reply and HTTP status code
	}

	// Initialize end point. Check if number of required args is availble.
	protected function init() {
		if ($this->request == null || (count($this->request) - 1) < $this->requiredArgs) {
			self::replyAndDie(self::BAD_REQUEST, 'Not enough arguments in request');
		}

		$this->plupp = new Plupp('localhost', 'plupp', 'qwerty', 'plupp');
		return true;
	}

	// Where the actual service (or work) is done. Should be implemented by derived class.
	protected function service() {
		self::replyAndDie(self::SERVER_ERROR, 'Unhandled API end-point');
	}

	// Returns reply to requester as JSON encoded data and exits php script
	private function reply($code) {
		self::replyAndDie($code, $this->reply);
	}

	// Returns reply to requester as JSON encoded data and exits php script
	public static function replyAndDie($code, $reply) {
		http_response_code($code);
		header('Content-type: application/json');
		if (isset($reply)) {
			if ($code != self::OK) {
				$reply = array('error' => $reply);
			}
			echo json_encode($reply);
		}
		exit();
	}
}

// JSON data in body
class PostPlan extends ServiceEndPoint {
	const API = 'POST /plan/{projectId}';

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$projectId = $this->request[1];
		$data = $_POST['data'];
		list($rc, $reply) = $this->plupp->setPlan2($projectId, $data, 'id', 'period', 'value');
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetPlan extends ServiceEndPoint {
	const API = 'GET /plan/{projectId}/{startPeriod}/{length}';

	public function __construct($request) {
		parent::__construct($request, 3);
	}

	protected function service() {
		$projectId = $this->request[1];
		$startPeriod = $this->request[2];
		$length = $this->request[3];
		list($rc, $reply) = $this->plupp->getPlan($projectId, $startPeriod, $length);
		$reply['projectId'] = $projectId;
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetPlans extends ServiceEndPoint {
	const API = 'GET /plans/{startPeriod}/{length}';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $reply) = $this->plupp->getPlans($startPeriod, $length);
		$this->reply = $reply;
		return $rc === true;
	}
}

class PostQuota extends ServiceEndPoint {
	const API = 'POST /quota';

	protected function service() {
		$data = $_POST['data'];
		list($rc, $reply) = $this->plupp->setQuota($data, 'id', 'period', 'value');
		$this->reply = $reply;
		return $rc === true;

	}
}

class GetQuota extends ServiceEndPoint {
	const API = 'GET /quota/{projectId}/{startPeriod}/{length}';

	public function __construct($request) {
		parent::__construct($request, 3);
	}

	protected function service() {
		$projectId = $this->request[1];
		$startPeriod = $this->request[2];
		$length = $this->request[3];
		list($rc, $reply) = $this->plupp->getQuota($projectId, $startPeriod, $length);
		$reply['projectId'] = $projectId;
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetQuotas extends ServiceEndPoint {
	const API = 'GET /quotas/{startPeriod}/{length}';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $reply) = $this->plupp->getQuotas($startPeriod, $length);
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetTeams extends ServiceEndPoint {
	const API = 'GET /teams';

	protected function service() {
		list($rc, $reply) = $this->plupp->getTeams();
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetProjects extends ServiceEndPoint {
	const API = 'GET /projects';

	protected function service() {
		list($rc, $reply) = $this->plupp->getProjects();
		$this->reply = $reply;
		return $rc === true;
	}
}

class GetProject extends ServiceEndPoint {
	const API = 'GET /project/{projectId}';

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$projectId = $this->request[1];
		list($rc, $reply) = $this->plupp->getProject($projectId);
		$this->reply = $reply;
		return $rc === true;
	}
}

?>
