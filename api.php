<?php

// @TODO add user id to POST
// @TODO use session_commit() to signal system that session is no longer in use, may execute other scripts in parallel, faster ride?

$DEBUG = true;

if ($DEBUG === true) {
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
	echo GetPlans::DESCRIPTION . '<br>';
	echo GetPlanSum::DESCRIPTION . '<br>';
	echo SetQuotas::DESCRIPTION . '<br>';
	echo GetQuota::DESCRIPTION . '<br>';
	echo GetQuotas::DESCRIPTION . '<br>';
	echo GetQuotaSum::DESCRIPTION . '<br>';
	echo GetProject::DESCRIPTION . '<br>';
	echo GetProjects::DESCRIPTION . '<br>';
	echo GetTeam::DESCRIPTION . '<br>';
	echo GetTeams::DESCRIPTION . '<br>';
	echo GetTeamPlans::DESCRIPTION . '<br>';
	echo GetTeamsPlan::DESCRIPTION . '<br>';
	echo GetTeamAvailability::DESCRIPTION . '<br>';
	echo GetResource::DESCRIPTION . '<br>';
	echo GetResources::DESCRIPTION . '<br>';
	echo PostLogin::DESCRIPTION . '<br>';
	echo GetSession::DESCRIPTION . '<br>';
	echo GetLogout::DESCRIPTION . '<br>';
	exit();
}

require_once('plupp.php');
require_once('session.php');

// start session before page outputs data
$session = Session::getInstance();

$cmd = $request[0];
$obj = null;

if ($method == 'POST') {
	switch ($cmd) {
		case SetPlan::API: $obj = new SetPlan($request); break;
		case SetQuotas::API: $obj = new SetQuotas($request); break;
		case PostLogin::API: $obj = new PostLogin($request); break;
	}
}
else if ($method == 'GET') {
	switch ($cmd) {
		case GetPlan::API: $obj = new GetPlan($request); break;
		case GetPlans::API: $obj = new GetPlans($request); break;
		case GetPlanSum::API: $obj = new GetPlanSum($request); break;
		case GetTeam::API: $obj = new GetTeam($request); break;
		case GetTeams::API: $obj = new GetTeams($request); break;
		case GetTeamPlans::API: $obj = new GetTeamPlans($request); break;
		case GetTeamsPlan::API: $obj = new GetTeamsPlan($request); break;
		case GetTeamAvailability::API: $obj = new GetTeamAvailability($request); break;
		case GetProject::API: $obj = new GetProject($request); break;
		case GetProjects::API: $obj = new GetProjects($request); break;
		case GetResource::API: $obj = new GetResource($request); break;
		case GetResources::API: $obj = new GetResources($request); break;
		case GetQuota::API: $obj = new GetQuota($request); break;
		case GetQuotas::API: $obj = new GetQuotas($request); break;
		case GetQuotaSum::API: $obj = new GetQuotaSum($request); break;
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
		/* @TODO add API timer 
		$this->startTime = microtime(true);
		$time = microtime(true) - $this->startTime;
		*/
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
		$code = $rc === true ? self::OK : self::SERVER_ERROR;
		self::replyAndDie($code, $this->reply); // send reply and HTTP status code
	}

	// Initialize end point. Check if number of required args is availble.
	protected function init() {
		if ($this->request == null || $this->availableArgs < $this->requiredArgs) {
			self::replyAndDie(self::BAD_REQUEST, 'Not enough arguments in request');
		}

		// check if API requires that user is logged in to use it in order to make changes 
		if ($this->session->isValid() !== true && $this->anonymous !== true) {
			self::replyAndDie(ServiceEndPoint::UNAUTHORIZED, 'Login in order to use this API');
		}

		$this->plupp = new Plupp('localhost', 'plupp', 'qwerty', 'plupp');
		return true;
	}

	// Where the actual service (or work) is done. Should be implemented by derived class.
	protected function service() {
		self::replyAndDie(self::SERVER_ERROR, 'Unhandled API end-point');
	}

	// Returns reply to requester as JSON encoded data and exits php script
	// @param code The HTTP response code
	// @param reply The data object or error string to return to caller
	public static function replyAndDie($code, $reply) {
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

		echo json_encode($reply);
		
		exit();
	}
}

// JSON data in body
class SetPlan extends ServiceEndPoint {
	const DESCRIPTION = 'POST /plan/{projectId}, set new project resource plan.';
	const API = 'plan';

	protected $anonymous = false;

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$projectId = $this->request[1];
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setPlan($projectId, $data, 'id', 'period', 'value');
		return $rc === true;
	}
}

class GetPlan extends ServiceEndPoint {
	const DESCRIPTION = 'GET /plan/{projectId}/{startPeriod}/{length}, get detailed project resource plan with team break-down within a given time intervall.';
	const API = 'plan';

	public function __construct($request) {
		parent::__construct($request, 3);
	}

	protected function service() {
		$projectId = $this->request[1];
		$startPeriod = $this->request[2];
		$length = $this->request[3];
		list($rc, $this->reply) = $this->plupp->getPlan($projectId, $startPeriod, $length);
		$this->reply['projectId'] = $projectId;
		return $rc === true;
	}
}

class GetPlans extends ServiceEndPoint {
	const DESCRIPTION = 'GET /plans/{startPeriod}/{length}, get resource plans for all projects within a given time intervall, i.e. how much total resources each project requests.';
	const API = 'plans';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $this->reply) = $this->plupp->getPlans($startPeriod, $length);
		return $rc === true;
	}
}

class GetPlanSum extends ServiceEndPoint {
	const DESCRIPTION = 'GET /plansum/{startPeriod}/{length}, get the total sum of requested resources for all projects within a given time intervall.';
	const API = 'plansum';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $this->reply) = $this->plupp->getPlanSum($startPeriod, $length);
		return $rc === true;
	}
}

class SetQuotas extends ServiceEndPoint {
	const DESCRIPTION = 'POST /quotas, set new project quotas.';
	const API = 'quotas';

	protected $anonymous = false;

	protected function service() {
		$data = $_POST['data'];
		list($rc, $this->reply) = $this->plupp->setQuotas($data, 'id', 'period', 'value');
		return $rc === true;
	}
}

class GetQuota extends ServiceEndPoint {
	const DESCRIPTION = 'GET /quota/{projectId}/{startPeriod}/{length}, get project resource quotas for a specific project within a given time intervall.';
	const API = 'quota';

	public function __construct($request) {
		parent::__construct($request, 3);
	}

	protected function service() {
		$projectId = $this->request[1];
		$startPeriod = $this->request[2];
		$length = $this->request[3];
		list($rc, $this->reply) = $this->plupp->getQuota($projectId, $startPeriod, $length);
		return $rc === true;
	}
}

class GetQuotas extends ServiceEndPoint {
	const DESCRIPTION = 'GET /quotas/{startPeriod}/{length}, get project resource quotas for all projects within a given time intervall.';
	const API = 'quotas';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $this->reply) = $this->plupp->getQuotas($startPeriod, $length);
		return $rc === true;
	}
}

class GetQuotaSum extends ServiceEndPoint {
	const DESCRIPTION = 'GET /quotasum/{startPeriod}/{length}, get the total sum of project resource quotas for all projects within a given time intervall.';
	const API = 'quotasum';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $this->reply) = $this->plupp->GetQuotaSum($startPeriod, $length);
		return $rc === true;
	}
}

class GetTeam extends ServiceEndPoint {
	const DESCRIPTION = 'GET /team/{teamId}, get team information for a specific team.';
	const API = 'team';

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$teamId = $this->request[1];
		list($rc, $this->reply) = $this->plupp->getTeam($teamId);
		return $rc === true;
	}
}

class GetTeams extends ServiceEndPoint {
	const DESCRIPTION = 'GET /teams, get list of teams and team information.';
	const API = 'teams';

	protected function service() {
		list($rc, $this->reply) = $this->plupp->getTeams();
		return $rc === true;
	}
}

class GetTeamsPlan extends ServiceEndPoint {
	const DESCRIPTION = 'GET /teamsplan/{startPeriod}/{length}, get aggregated project resource plan for all teams within a given time intervall, i.e. how much of each team is requested by the total project portfolio.';
	const API = 'teamsplan';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		list($rc, $this->reply) = $this->plupp->getTeamsPlan($startPeriod, $length);
		return $rc === true;
	}
}

class GetTeamPlans extends ServiceEndPoint {
	const DESCRIPTION = 'GET /teamplans/{teamId}/{startPeriod}/{length}, get all project resource plans for a team within a given time intervall, i.e. how much is a team requested by each project.';
	const API = 'teamplans';

	public function __construct($request) {
		parent::__construct($request, 3);
	}

	protected function service() {
		$teamId = $this->request[1];
		$startPeriod = $this->request[2];
		$length = $this->request[3];
		list($rc, $this->reply) = $this->plupp->getTeamPlans($teamId, $startPeriod, $length);
		return $rc === true;
	}
}

class GetTeamAvailability extends ServiceEndPoint {
	const DESCRIPTION = 'GET /teamavailability/{startPeriod}/{length}/{teamId}, get aggregated resource availability for a specific team within a given time intervall, i.e. how much of a team is available in total. ´teamId´ is optional, leaving this blank will return all teams.';
	const API = 'teamavailability';

	public function __construct($request) {
		parent::__construct($request, 2);
	}

	protected function service() {
		$startPeriod = $this->request[1];
		$length = $this->request[2];
		$teamId = $this->availableArgs > $this->requiredArgs ? $this->request[3] : null;
		list($rc, $this->reply) = $this->plupp->getTeamAvailability($startPeriod, $length, $teamId);
		return $rc === true;
	}
}

class GetProjects extends ServiceEndPoint {
	const DESCRIPTION = 'GET /projects, get list of projects and project information.';
	const API = 'projects';

	protected function service() {
		list($rc, $this->reply) = $this->plupp->getProjects();
		return $rc === true;
	}
}

class GetProject extends ServiceEndPoint {
	const DESCRIPTION = 'GET /project/{projectId}, get project information for a specific project.';
	const API = 'project';

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$projectId = $this->request[1];
		list($rc, $this->reply) = $this->plupp->getProject($projectId);
		return $rc === true;
	}
}

class GetResources extends ServiceEndPoint {
	const DESCRIPTION = 'GET /resources, get list of resources and resource information; a resource being a human being doing great things.';
	const API = 'resources';

	protected function service() {
		list($rc, $this->reply) = $this->plupp->getResources();
		return $rc === true;
	}
}

class GetResource extends ServiceEndPoint {
	const DESCRIPTION = 'GET /resource/{resourceId}, get resource information for a specific resource; a resource being a human being doing great things.';
	const API = 'resource';

	public function __construct($request) {
		parent::__construct($request, 1);
	}

	protected function service() {
		$resourceId = $this->request[1];
		list($rc, $this->reply) = $this->plupp->getResource($resourceId);
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
