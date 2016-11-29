<?php

// @TODO add CONFIG struct in separate file to allow configuration of multiple instances
// @TODO add real_escape to prevent injection via strings
// @TODO add casting integer to avoid SQL injection
//       $aid = (int) $_GET['aid'];

// 
// Class for interacting with the Plupp MySQL database
//
class Plupp {
	const TABLE_QUOTA = 'quota';
	const TABLE_TEAM = 'team';
	const TABLE_PLAN = 'plan';
	const TABLE_PROJECT = 'project';
	const TABLE_USER = 'user';
	const TABLE_SESSION = 'session';
	const TABLE_RESOURCE = 'resource';
	const TABLE_RESOURCE_DATA = 'resource_data';
	const TABLE_AVAILABILITY = 'availability';
	const TABLE_DEPARTMENT = 'department';

	// @TODO return error message
	public function __construct($host, $user, $password, $database) {
		$tmp = new mysqli($host, $user, $password, $database);
		if ($tmp->connect_errno) {
			echo 'Failed to connect to MySQL: ' . $tmp->connect_error;
		}
		else {
			if (!$tmp->set_charset('utf8')) {
				echo 'Error loading character set utf8: ' . $tmp->error;
			}
			$this->db = $tmp;
		}
	}

	public function __destruct() {
		if (isset($this->db)) {
			$this->db->close();
		}
	}

	private function _fetachAll($result) {
		$data = array();
		if ($result->num_rows > 0) {
			while ($r = $result->fetch_assoc()) {
				$data['data'][] = $r;
			}
		}
		return $data;
	}

	// performs query and returns result on success
	private function _doQuery($sql) {
		$result = $this->db->query($sql);
		if ($result === false) {
			return array(false, $this->_error($sql));
		}

		return array(true, $result);
	}

	private function _getQuery($sql) {
		$result = $this->db->query($sql);
		if ($result === false) {
			return array(false, $this->_error($sql));
		}	

		return array(true, $this->_fetachAll($result));
	}

	private function _setQuery($sql) {
		$result = $this->db->query($sql) === true;
		return array($result, $result !== true ? $this->_error($sql) : '');
	}

	// @TODO add debug flag to enable this
	private function _error($sql) {
		if ($this->db->errno) {
		    return 'MySQL error (' . $this->db->errno . ') ' . $this->db->error . ', caused by call: ' . $sql;
		}
		return true;
	}

	public function setPlan($projectId, $data, $teamIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_PLAN . " (projectId, teamId, period, value) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$projectId', '$v[$teamIdKey]', '$v[$periodKey]', '$v[$valueKey]')";
		}

		return $this->_setQuery($sql);
	}

	public function getPlan($startPeriod, $length, $projectId = null) {
		$sql = '';
		$endPeriod = $startPeriod + $length;
		if ($projectId === null) {
			$sql = "SELECT p.projectId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
				   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
				   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
				   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.projectId, p.period ORDER BY p.projectId ASC, p.period ASC";
		}
		else {
			$sql = "SELECT p.teamId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
				   "    SELECT teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " WHERE projectId = '$projectId' GROUP BY teamId, period" .
				   ") r ON p.timestamp = r.latest AND p.teamId = r.teamId AND p.period = r.period " .
				   "WHERE p.projectId = '$projectId' AND p.period >= '$startPeriod' AND p.period < '$endPeriod' ORDER BY p.period ASC";
		}
		return $this->_getQuery($sql);
	}

	public function getPlanSum($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.period ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function setQuota($data, $projectIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_QUOTA . " (projectId, period, value) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$v[$projectIdKey]', '$v[$periodKey]', '$v[$valueKey]')";
		}

		return $this->_setQuery($sql);
	}

	public function getQuota($startPeriod, $length, $projectId = null) {
		$sql = '';
		$endPeriod = $startPeriod + $length;
		if ($projectId === null){
			$sql = "SELECT p.projectId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
				   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
				   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
				   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.projectId, p.period ORDER BY p.projectId ASC, p.period ASC";		
		}
		else {
			$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
				   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . 
				   "    WHERE projectId = '$projectId' GROUP BY projectId, period" .
				   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
				   "WHERE p.projectId = '$projectId' AND p.period >= '$startPeriod' AND p.period < '$endPeriod' ORDER BY p.period ASC";
		}
		return $this->_getQuery($sql);
	}

	public function getQuotaSum($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.period ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function addTeam() {
		// @TODO add me
	}

	public function getTeam($teamId = null) {
		if ($teamId === null) {
			return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " ORDER BY name ASC");
		}
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " WHERE id = '$teamId'");
	}

	public function getTeamsPlan($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.teamId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.teamId, p.period ORDER BY p.teamId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getTeamPlans($teamId, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " WHERE teamId = '$teamId' GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.teamId = '$teamId' AND p.period >= '$startPeriod' AND p.period < '$endPeriod' ORDER BY p.projectId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	private function _createResourceTable($name) {
		$sql = "CREATE TEMPORARY TABLE IF NOT EXISTS $name AS ( " .
			   "    SELECT a.resourceId AS resourceId, a.teamId AS teamId, a.type AS type, a.departmentId AS departmentId FROM " . self::TABLE_RESOURCE_DATA . " a INNER JOIN ( " .
			   "        SELECT resourceId, teamId, MAX(timestamp) AS latest FROM " . self::TABLE_RESOURCE_DATA . " GROUP BY resourceId " .
			   "    ) b ON a.resourceId = b.resourceId AND a.timestamp = b.latest " .
			   ")";

		return $this->_setQuery($sql);
	}

	private function _createAvailabilityTable($name, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "CREATE TEMPORARY TABLE IF NOT EXISTS $name AS ( " .
			   "    SELECT a.resourceId AS resourceId, a.period AS period, a.value AS value FROM " . self::TABLE_AVAILABILITY . " a INNER JOIN ( " .
			   "        SELECT resourceId, value, period, MAX(timestamp) AS latest FROM " . self::TABLE_AVAILABILITY . " GROUP BY resourceId, period " .
			   "    ) b ON a.resourceId = b.resourceId AND a.period = b.period AND a.timestamp = b.latest " .
			   "    WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
			   ")";

		return $this->_setQuery($sql);
	}

	public function getTeamAvailability($startPeriod, $length, $teamId = null) {
		$resource = 'resourceLatest';
		$arr = $this->_createResourceTable($resource);
		if ($arr[0] !== true) {
			return $arr;
		}

		$availability = 'availabilityLatest';
		$arr = $this->_createAvailabilityTable($availability, $startPeriod, $length);
		if ($arr[0] !== true) {
			return $arr;
		}

		$endPeriod = $startPeriod + $length;
		$sql = '';
		if ($teamId === null) {
			$sql = "SELECT r.teamId AS id, a.period AS period, SUM(a.value) AS value FROM $availability a " .
				   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
				   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "GROUP BY r.teamId, a.period ORDER BY r.teamId ASC, a.period ASC";
		}
		else {
			$sql = "SELECT r.teamId AS id, a.period AS period, SUM(a.value) AS value FROM $availability a " .
				   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
				   "WHERE r.teamId = $teamId AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "GROUP BY r.teamId, a.period ORDER BY r.teamId ASC, a.period ASC";
		}
		return $this->_getQuery($sql);
	}

	public function addProject() {
		// @TODO add me
	}

	public function getProject($projectId = null) {
		if ($projectId === null) {
			return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " ORDER BY name ASC");
		}
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " WHERE id = $projectId");
	}

	public function addResource($name, $teamId, $departmentId, $type) {
		// @TODO add me
	}

	public function getResource($resourceId = null) {
		$resource = 'resourceLatest';
		$arr = $this->_createResourceTable($resource);
		if ($arr[0] !== true) {
			return $arr;
		}

		$sql = "SELECT r.id AS id, r.name AS name, rd.type AS type, d.id AS departmentId, d.name AS departmentName, t.id AS teamId, t.name AS teamName " .
			   "FROM $resource rd " .
			   "LEFT JOIN " . self::TABLE_RESOURCE . " r ON rd.resourceId = r.id " .
			   "LEFT JOIN " . self::TABLE_TEAM . " t ON rd.teamId = t.id " .
			   "LEFT JOIN " . self::TABLE_DEPARTMENT . " d ON rd.departmentId = d.id ";

		if ($resourceId != null) {
			$sql .= "WHERE r.id = $resourceId ";
		}

		$sql .= "ORDER BY r.id ASC";

		return $this->_getQuery($sql);
	}

	// verify username/password combination using ldap
	private function _verifyByLDAP($username, $password) {
		// @TODO make LDAP settings configurable
		$server = 'ldap://zone2.flir.net';
		$ldaprdn = 'zone2' . "\\" . $username;
		$rc = false;
		$result = '';

		if ($ldap = @ldap_connect($server)) {
			ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
			ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
			if (@ldap_bind($ldap, $ldaprdn, $password)) {
				$rc = true;
			}
			else {
				$result = 'LDAP server returned invalid username and password combination';
			}
			ldap_close($ldap);
		}
		else {
			$result = 'Unable to connect to LDAP server';
		}

		return array($rc, $result);
	}

	// get user from database based on username
	private function _getUser($username) {
		$sql = "SELECT id, password, source FROM " . self::TABLE_USER . " WHERE BINARY username = '$username' LIMIT 1";

		list($rc, $result) = $this->_doQuery($sql);

		if ($rc === true) {
			if ($result->num_rows > 0) {
				if ($row = $result->fetch_assoc()) {
					return array(true, $row);
				}
			}
			return array(false, 'Username not found');
		}
		return array(false, $result);
	}

	//  verifying login is done in two steps:
	// 	  1. check if user is available in user database
	//    2. verify password with source (ldap or local database)
	public function verifyLogin($username, $password) {
		list($rc, $result) = $this->_getUser($username);
		if ($rc === true) {
			if ($result['source'] === 'database') {
				$passhash = md5($password);
				if ($passhash !== $result['password']) { // use password stored in this local database
					$rc = false;
					$result = 'Invalid username and password combination';
				}
				// else simply return result from getUser() call
			}
			else if ($result['source'] === 'ldap') {
				list($rc, $error) = $this->_verifyByLDAP($username, $password);
				if ($rc !== true) {
					$result = $error;
				}
				// else simply return result from getUser() call
			}
			else {
				$rc = false;
				$result = 'Unable to verify login with unknown source';
			}
			
			if (isset($result['password'])) {
				unset($result['password']);
			}
		}

		//addSession($user, $status);
		return array($rc === true, $result);
	}

	public function startSession($userId, $sessionId) {
		return true;
	}

	public function endSession($sessionId) {
		return true;
	}

	public function initializeTables() {
		// @TODO make it possible to create SQL tables in an empty database
	}
}

?>
