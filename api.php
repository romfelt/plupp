<?php

// @TODO use session_commit() to signal system that session is no longer in use, may execute other scripts in parallel, faster ride?

// include configuration
require_once('plupp.config.php');

if ($CONFIG['debug'] === true) {
	ini_set('display_errors', 'On');
	error_reporting(E_ALL | E_STRICT);
}

// get the HTTP method, path and body of the request
$method = $_SERVER['REQUEST_METHOD'];
$request = ServiceEndPoint::getRequest();

if (!isset($method) || $request == null || !isset($request[0])) {
	echo "<h1>PLUPP API description</h1>";
	echo SetPlan::DESCRIPTION . '<br>';
	echo GetPlan::DESCRIPTION . '<br>';
	echo GetResourcePlan::DESCRIPTION . '<br>';
	echo SetAllocation::DESCRIPTION . '<br>';
	echo GetAllocation::DESCRIPTION . '<br>';
	echo GetResourceAllocation::DESCRIPTION . '<br>';
	echo SetQuota::DESCRIPTION . '<br>';
	echo GetQuota::DESCRIPTION . '<br>';
	echo GetProject::DESCRIPTION . '<br>';
	echo GetDepartment::DESCRIPTION . '<br>';
	echo GetTeam::DESCRIPTION . '<br>';
	echo GetAvailable::DESCRIPTION . '<br>';
	echo GetResource::DESCRIPTION . '<br>';
	echo SetResourceAvailability::DESCRIPTION . '<br>';
	echo GetResourceAvailability::DESCRIPTION . '<br>';
	echo PostLogin::DESCRIPTION . '<br>';
	echo GetSession::DESCRIPTION . '<br>';
	echo GetLogout::DESCRIPTION . '<br>';
	exit();
}

// include dependencies
require_once('plupp.php');
require_once('session.php');

// start session before page outputs data
$session = Session::getInstance($CONFIG['session_timeout']);

$cmd = $request[0];
$obj = null;

if ($method == 'POST') {
	switch ($cmd) {
		case SetPlan::API: $obj = new SetPlan($request); break;
		case SetAllocation::API: $obj = new SetAllocation($request); break;
		case SetQuota::API: $obj = new SetQuota($request); break;
		case SetResourceAvailability::API: $obj = new SetResourceAvailability($request); break;
		case PostLogin::API: $obj = new PostLogin($request); break;
	}
}
else if ($method == 'GET') {
	switch ($cmd) {
		case GetPlan::API: $obj = new GetPlan($request); break;
		case GetResourcePlan::API: $obj = new GetResourcePlan($request); break;
		case GetAllocation::API: $obj = new GetAllocation($request); break;
		case GetResourceAllocation::API: $obj = new GetResourceAllocation($request); break;
		case GetDepartment::API: $obj = new GetDepartment($request); break;
		case GetTeam::API: $obj = new GetTeam($request); break;
		case GetAvailable::API: $obj = new GetAvailable($request); break;
		case GetProject::API: $obj = new GetProject($request); break;
		case GetResource::API: $obj = new GetResource($request); break;
		case GetResourceAvailability::API: $obj = new GetResourceAvailability($request); break;
		case GetQuota::API: $obj = new GetQuota($request); break;
		case GetSession::API: $obj = new GetSession($request); break;
		case GetLogout::API: $obj = new GetLogout($request); break;
	}
}

if ($obj === null) {
	ServiceEndPoint::replyAndDie(ServiceEndPoint::BAD_REQUEST, "Unknown API: $method $cmd");
}

$obj->run();
exit();

// Base class for API service end-point.
// Extend this class and implement __constructor() and service() methods. Create an object and call run() method.
class ServiceEndPoint {
	const SESSION_HOURS = 48; // for how many hours is a session valid if not used 
	const OK = 200;
	const BAD_REQUEST = 400;
	const UNAUTHORIZED = 401;
	const SERVER_ERROR = 500;

	protected $anonymous = true; // set to false in derived class to require a user session
	protected $plupp;
	protected $request;
	protected $requiredArgs;
	protected $availableArgs;
	protected $reply;
	protected $session;
	protected $startTime;

	// @param request The path at which script was called, see self::getRequest().
	// @param requiredArgs number of required args excluding end point name
	public function __construct($request, $requiredArgs = 0) {
		$this->startTime = microtime(true);
		$this->request = $request;
		$this->requiredArgs = $requiredArgs;
		$this->availableArgs = count($this->request) - 1;
		$this->session = Session::getInstance();
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
		$this->session->touch(); // keep session alive when a valid request has been received
		$rc = $this->service(); // run the service
		$time = microtime(true) - $this->startTime;
		$code = $rc === true ? self::OK : self::SERVER_ERROR;
		self::replyAndDie($code, $this->reply, $time); // send reply and HTTP status code
	}

	// initialize end point
	protected function init() {
		global $CONFIG;

		// check if number of required args is available
		if ($this->request == null || $this->availableArgs < $this->requiredArgs) {
			self::replyAndDie(self::BAD_REQUEST, 'Not enough arguments in request');
		}

		// check if API requires that user is logged in to use it in order to make changes 
		if ($this->session->isValid() !== true && $this->anonymous !== true) {
			self::replyAndDie(ServiceEndPoint::UNAUTHORIZED, 'Login in order to use this API');
		}

		// create plupp database interface
		$this->plupp = new Plupp($CONFIG['db_host'], $CONFIG['db_username'], $CONFIG['db_password'], $CONFIG['db_database']);
		if ($this->plupp->isInitialized() !== true) {
			self::replyAndDie(self::SERVER_ERROR, $this->plupp->isInitialized());
		}

		return true;
	}

	// Where the actual service (or work) is done. Should be implemented by derived class.
	protected function service() {
		self::replyAndDie(self::SERVER_ERROR, 'Unhandled API end-point');
	}

	// Returns reply to requester as JSON encoded data and exits php script
	// @param code The HTTP response code
	// @param reply The data object or error string to return to caller
	// @param time The time it took to service the request
	public static function replyAndDie($code, $reply, $time = null) {
		http_response_code($code);
		header('Content-type: application/json');

		if ($code === self::OK) {
			if (isset($reply)) {
				$reply['request'] = true; 
			}
			else {
				$reply = array('request' => true);
			}
		}
		else {
			$reply = array('error' => $reply, 'request' => false);
		}

		if ($time !== null) {
			$reply['time'] = round($time, 6); 
		}

		echo json_encode($reply);
		exit();
	}
}

// Service end-point with 2 required arguments and 1 optional: /{startPeriod}/{length}/{id}
class ServiceEndPointIntervalId extends ServiceEndPoint {
	protected $startPeriod;
	protected $length;
	protected $optionalId;

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function initArgs() {
		$this->startPeriod = $this->request[1];
		$this->length = $this->request[2];
		$this->optionalId = $this->availableArgs > $this->requiredArgs ? $this->request[3] : null;
	}
}

// Service end-point with 2 required arguments and 3 optional: /{startPeriod}/{length}/{filter}/{id}/{group}
class ServiceEndPointIntervalFilterId extends ServiceEndPoint {
	protected $startPeriod;
	protected $length;
	protected $optionalFilter;
	protected $optionalId;
	protected $optionalGroup;

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function initArgs() {
		$this->startPeriod = $this->request[1];
		$this->length = $this->request[2];
		$this->optionalFilter = $this->availableArgs >= 3 ? $this->request[3] : null;
		$this->optionalId = $this->availableArgs >= 4 ? $this->request[4] : null;
		$this->optionalGroup = $this->availableArgs >= 5 ? $this->request[5] : null;
	}
}

// Service end-point with 2 optional arguments: /{filter}/{id}
class ServiceEndPointFilterId extends ServiceEndPoint {
	protected $optionalFilter;
	protected $optionalId;

	public function __construct($request) {
		parent::__construct($request, 0);
		$this->optionalFilter = null;
		$this->optionalId = null;
	}

	protected function initArgs() {
		if ($this->availableArgs >= 2) {
			$this->optionalFilter = $this->request[1];
			$this->optionalId = $this->request[2];
		}
	}
}

class GetAllocation extends ServiceEndPointIntervalFilterId {
	const DESCRIPTION = 'GET /allocation/{startPeriod}/{length}/{filter}/{id}/{group}, get total resource allocation within a given time intervall. {filter}, {id} and {group} are optional, leaving those blank will return sum on top level. Leaving just {id} and {group} blank will return sum aggregated based on filter: raw (special case where {id} and {group} is ignored), project, team or resource. {group} specifies how results for a certain filter/id pair should be returned.';
	const API = 'allocation';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getAllocation($this->startPeriod, $this->length, $this->optionalFilter, $this->optionalId, $this->optionalGroup);
		return $rc === true;
	}
}

class GetResourceAllocation extends ServiceEndPoint {
	const DESCRIPTION = 'GET /resourceallocation/{startPeriod}/{length}/{projectId}/{teamId}, get resources from a specific team allocated to a certain project within a given time intervall.';
	const API = 'resourceallocation';


	public function __construct($request) {
		parent::__construct($request, 4);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		$projectId = $this->request[3];
		$teamId = $this->request[4];

		list($rc, $this->reply) = $this->plupp->getResourceAllocation($startPeriod, $length, $projectId, $teamId);
		return $rc === true;
	}
}


// JSON data in body
class SetAllocation extends ServiceEndPoint {
	const DESCRIPTION = 'POST /allocation, set project resource allocation according to JSON data payload format [{ id, projectId, value, period }, ...] where id is resource id.';
	const API = 'allocation';

	protected $anonymous = false;

	protected function service() {
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setAllocation($this->session->getUserId(), $data, 'id', 'period', 'value', 'projectId');
		return $rc === true;
	}
}

class GetPlan extends ServiceEndPointIntervalFilterId {
	const DESCRIPTION = 'GET /plan/{startPeriod}/{length}/{filter}/{id}/{group}, get total resource allocation plan within a given time intervall. {filter}, {id} and {group} are optional, leaving those blank will return sum on top level. Leaving just {id} and {group} blank will return sum aggregated based on filter: raw (special case where {id} and {group} is ignored), project, team or resource. {group} specifies how results for a certain filter/id pair should be returned.';
	const API = 'plan';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getPlan($this->startPeriod, $this->length, $this->optionalFilter, $this->optionalId, $this->optionalGroup);
		return $rc === true;
	}
}

class GetResourcePlan extends ServiceEndPoint {
	const DESCRIPTION = 'GET /resourceplan/{startPeriod}/{length}/{projectId}/{teamId}, get resources from a specific team planned to a certain project within a given time intervall.';
	const API = 'resourceplan';

	public function __construct($request) {
		parent::__construct($request, 4);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		$projectId = $this->request[3];
		$teamId = $this->request[4];

		list($rc, $this->reply) = $this->plupp->getResourcePlan($startPeriod, $length, $projectId, $teamId);
		return $rc === true;
	}
}


// JSON data in body
class SetPlan extends ServiceEndPoint {
	const DESCRIPTION = 'POST /plan, set project resource plan according to JSON data payload format [{ id, projectId, value, period }, ...] where id is resource id.';
	const API = 'plan';

	protected $anonymous = false;

	protected function service() {
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setPlan($this->session->getUserId(), $data, 'id', 'period', 'value', 'projectId');
		return $rc === true;
	}
}

class SetQuota extends ServiceEndPoint {
	const DESCRIPTION = 'POST /quota, set project quota according to JSON data payload format [{ id, value, period }, ...] where id is project id.';
	const API = 'quota';

	protected $anonymous = false;

	protected function service() {
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setQuota($this->session->getUserId(), $data, 'id', 'period', 'value');
		return $rc === true;
	}
}

class GetQuota extends ServiceEndPointIntervalFilterId {
	const DESCRIPTION = 'GET /quota/{startPeriod}/{length}/{filter}/{id}, get resource quotas within a given time intervall. {filter} and {id} are optional, leaving these blank will return total quota sum quota for all projects. Setting just {filter} will return quota aggregated on projects and with {id} set only quota for that specific project.';
	const API = 'quota';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getQuota($this->startPeriod, $this->length, $this->optionalFilter, $this->optionalId);
		return $rc === true;
	}
}

class GetDepartment extends ServiceEndPoint {
	const DESCRIPTION = 'GET /department/{departmentId}, get department information for a specific department. {departmentId} is optional, leaving this blank will return all departments.';
	const API = 'department';

	protected function service() {
		$departmentId = $this->availableArgs > $this->requiredArgs ? $this->request[1] : null;
		list($rc, $this->reply) = $this->plupp->getDepartment($departmentId);
		return $rc === true;
	}
}

class GetTeam extends ServiceEndPoint {
	const DESCRIPTION = 'GET /team/{teamId}, get team information for a specific team. {teamId} is optional, leaving this blank will return all teams.';
	const API = 'team';

	protected function service() {
		$teamId = $this->availableArgs > $this->requiredArgs ? $this->request[1] : null;
		list($rc, $this->reply) = $this->plupp->getTeam($teamId);
		return $rc === true;
	}
}

class GetAvailable extends ServiceEndPointIntervalFilterId {
	const DESCRIPTION = 'GET /available/{startPeriod}/{length}/{filter}/{id}, get total resources available within a given time intervall. {filter} and {id} are optional, leaving both blank will return sum on top level. Leaving just {id} blank will return sum aggregated based on filter: department or team.';
	const API = 'available';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getAvailable($this->startPeriod, $this->length, $this->optionalFilter, $this->optionalId);
		return $rc === true;
	}
}

class GetProject extends ServiceEndPoint {
	const DESCRIPTION = 'GET /project/{projectId}, get project information for a specific project. {projectId} is optional, leaving this blank will return all projects.';
	const API = 'project';

	protected function service() {
		$projectId = $this->availableArgs > $this->requiredArgs ? $this->request[1] : null;
		list($rc, $this->reply) = $this->plupp->getProject($projectId);
		return $rc === true;
	}
}

class GetResource extends ServiceEndPointFilterId {
	const DESCRIPTION = 'GET /resource/{filter}/{id}, get resource information for one or multiple resources; a resource being a human being doing great things. {filter} and {id} are optional, leaving those blank will return all resources. {filter} can be one of: resource, team or department.';
	const API = 'resource';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getResource($this->optionalFilter, $this->optionalId);
		return $rc === true;
	}
}

class GetResourceAvailability extends ServiceEndPointIntervalFilterId {
	const DESCRIPTION = 'GET /resourceavailability/{startPeriod}/{length}/{filter}/{id}, get individual resources available within a given time intervall. {filter} and {id} are optional, leaving both blank will return all resources else all resources for that filter/id-pair will be returned.';
	const API = 'resourceavailability';

	protected function service() {
		$this->initArgs();
		list($rc, $this->reply) = $this->plupp->getResourceAvailability($this->startPeriod, $this->length, $this->optionalFilter, $this->optionalId);
		return $rc === true;
	}
}

class SetResourceAvailability extends ServiceEndPoint {
	const DESCRIPTION = 'POST /resourceavailability, set resource availability according to JSON data payload format [{ id, value, period }, ...] where id is resource id.';
	const API = 'resourceavailability';

	protected $anonymous = false;

	protected function service() {
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setResourceAvailability($this->session->getUserId(), $data, 'id', 'period', 'value');
		return $rc === true;
	}
}

class PostLogin extends ServiceEndPoint {
	const DESCRIPTION = 'POST /login, login to system with JSON carrying data in body as {username: "username", password: "password"}.';
	const API = 'login';

	protected function service() {
		if (!isset($_POST['username']) || !isset($_POST['password'])) {
			$this->reply = 'Not enough data in post';
			return self::BAD_REQUEST;
		}

		$username = $_POST['username'];
		$password = $_POST['password'];
		
		list($rc, $this->reply) = $this->plupp->verifyLogin($username, $password);

		if ($rc !== true) {
			return false;
		}

		// user was verified successfully, create a user session
		// @TODO add permissions
		$this->session->start($this->reply['id'], $username, 'TODO');

		return true;
	}
}

class GetSession extends ServiceEndPoint {
	const DESCRIPTION = 'GET /session, get status of user session. If there is an active session the username is also returned in the reply.';
	const API = 'session';

	protected function service() {
		$username = $this->session->getUserName();
		if ($username !== false) {
			$this->reply = array('session' => true, 'username' => $username);
		}
		else {
			$this->reply = array('session' => false);	
		}

		// return true even though a session does not exist, the data tells wheter a session do exist
		return true;
	}
}

class GetLogout extends ServiceEndPoint {
	const DESCRIPTION = 'GET /logout, end current user session and log out user.';
	const API = 'logout';

	protected function service() {
		// @TODO add information to database that session was ended?
		// list($rc, $this->reply) = $this->plupp->doLogout($sessionId);
		$this->session->end();
		return true;
	}
}

?>
