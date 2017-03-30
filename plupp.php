<?php

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
	const TABLE_AVAILABLE = 'available';
	const TABLE_DEPARTMENT = 'department';
	const TABLE_ALLOCATION = 'allocation';

	private $db = null;
	private $error = null; 

	// @TODO return error message
	public function __construct($host, $user, $password, $database) {
		$tmp = new mysqli($host, $user, $password, $database);
		if ($tmp->connect_errno) {
			$this->error = 'Failed to connect to MySQL: ' . $tmp->connect_error;
		}
		else {
			if (!$tmp->set_charset('utf8')) {
				$this->error = 'Error loading character set utf8: ' . $tmp->error;
			}
			$this->db = $tmp;
			return;
		}
	}

	public function __destruct() {
		if (isset($this->db)) {
			$this->db->close();
		}
	}

	// check if database initialization was a success, returns true on success, error 
	// description on failure
	public function isInitialized() {
		return $this->error !== null ? $this->error : true;
	}

	// helper to calculate end period value based on startPeriod and length of interval
	private function _endPeriod($startPeriod, $length) {
		$d = new DateTime($startPeriod);
		$d->add(new DateInterval('P' . $length . 'M'));
		return $d->format('Y-m-d');
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

	public function setPlan($userId, $projectId, $data, $teamIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_PLAN . " (projectId, teamId, period, value, userId) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$projectId', '$v[$teamIdKey]', '$v[$periodKey]', '$v[$valueKey]', '$userId')";
		}

		return $this->_setQuery($sql);
	}

	public function getPlan($startPeriod, $length, $projectId = null) {
		$sql = '';
		$endPeriod = $this->_endPeriod($startPeriod, $length);
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
		$endPeriod = $this->_endPeriod($startPeriod, $length);
		$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.period ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function setQuota($userId, $data, $projectIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_QUOTA . " (projectId, period, value, userId) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$v[$projectIdKey]', '$v[$periodKey]', '$v[$valueKey]', '$userId')";
		}

		return $this->_setQuery($sql);
	}

	public function getQuota($startPeriod, $length, $filter, $id) {
		$endPeriod = $this->_endPeriod($startPeriod, $length);

		$keyMap = array('project' => 'projectId');
		$key = array_key_exists($filter, $keyMap) ? $keyMap[$filter] : null;

		$sql = null;
		if ($key === null) {
			// get sum of quota on top level
			$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
				   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
				   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
				   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.period ORDER BY p.period ASC";
		}
		else {
			if ($id === null) {
				// get sum of quota for all projects
				$sql = "SELECT p.projectId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
					   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
					   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
					   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.projectId, p.period ORDER BY p.projectId ASC, p.period ASC";	
			}
			else {
				// get sum of quota for a specific projects
				$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
					   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . 
					   "    WHERE $key = '$id' GROUP BY projectId, period" .
					   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
					   "WHERE p.$key = '$id' AND p.period >= '$startPeriod' AND p.period < '$endPeriod' ORDER BY p.period ASC";
			}
		}

		return $this->_getQuery($sql);
	}

	public function addTeam() {
		// @TODO add me
	}

	public function getDepartment($departmentId = null) {
		if ($departmentId === null) {
			return $this->_getQuery("SELECT id, name FROM " . self::TABLE_DEPARTMENT . " ORDER BY name ASC");
		}
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_DEPARTMENT . " WHERE id = '$departmentId'");
	}

	public function getTeam($teamId = null) {
		if ($teamId === null) {
			return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " ORDER BY name ASC");
		}
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " WHERE id = '$teamId'");
	}

	public function getTeamsPlan($startPeriod, $length) {
		$endPeriod = $this->_endPeriod($startPeriod, $length);
		$sql = "SELECT p.teamId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= '$startPeriod' AND p.period < '$endPeriod' GROUP BY p.teamId, p.period ORDER BY p.teamId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getTeamPlans($teamId, $startPeriod, $length) {
		$endPeriod = $this->_endPeriod($startPeriod, $length);
		$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " WHERE teamId = '$teamId' GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.teamId = '$teamId' AND p.period >= '$startPeriod' AND p.period < '$endPeriod' ORDER BY p.projectId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	private function _createResourceDataTable($name) {
		$sql = "CREATE TEMPORARY TABLE IF NOT EXISTS $name ENGINE = MEMORY AS ( " .
			   "    SELECT a.resourceId AS resourceId, a.teamId AS teamId, a.type AS type, a.departmentId AS departmentId FROM " . self::TABLE_RESOURCE_DATA . " a INNER JOIN ( " .
			   "        SELECT resourceId, teamId, MAX(timestamp) AS latest FROM " . self::TABLE_RESOURCE_DATA . " GROUP BY resourceId " .
			   "    ) b ON a.resourceId = b.resourceId AND a.timestamp = b.latest " .
			   ")";

		return $this->_setQuery($sql);
	}

	private function _createAvailableTable($name, $startPeriod, $length) {
		$endPeriod = $this->_endPeriod($startPeriod, $length);
		$sql = "CREATE TEMPORARY TABLE IF NOT EXISTS $name ENGINE = MEMORY AS ( " .
			   "    SELECT a.resourceId AS resourceId, a.period AS period, a.value AS value FROM " . self::TABLE_AVAILABLE . " a INNER JOIN ( " .
			   "        SELECT resourceId, value, period, MAX(timestamp) AS latest FROM " . self::TABLE_AVAILABLE . " GROUP BY resourceId, period " .
			   "    ) b ON a.resourceId = b.resourceId AND a.period = b.period AND a.timestamp = b.latest " .
			   "    WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
			   ")";

		return $this->_setQuery($sql);
	}

	private function _createAllocationTable($name, $startPeriod, $length) {
		$endPeriod = $this->_endPeriod($startPeriod, $length);
		$sql = "CREATE TEMPORARY TABLE IF NOT EXISTS $name ENGINE = MEMORY AS ( " .
			   "    SELECT a.projectId AS projectId, a.resourceId AS resourceId, a.period AS period, a.value AS value FROM " . self::TABLE_ALLOCATION . " a INNER JOIN ( " .
			   "        SELECT projectId, resourceId, value, period, MAX(timestamp) AS latest FROM " . self::TABLE_ALLOCATION . " GROUP BY projectId, resourceId, period " .
			   "   ) b ON a.projectId = b.projectId AND a.resourceId = b.resourceId AND a.period = b.period AND a.timestamp = b.latest " .
			   "   WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
			   ")";

		return $this->_setQuery($sql);
	}

	// helper to prepare temporary tables needed to run a resource availbility query
	private function _getQueryAvailable($startPeriod, $length, $resourceTableName, $availableTableName, $sql) {
		// prepare temporary tables
		$arr = $this->_createResourceDataTable($resourceTableName);
		if ($arr[0] !== true) {
			return $arr;
		}
		$arr = $this->_createAvailableTable($availableTableName, $startPeriod, $length);
		if ($arr[0] !== true) {
			return $arr;
		}

		return $this->_getQuery($sql);
	}

	public function getAvailable($startPeriod, $length, $filter, $id) {
		$resource = 'resourceLatest';
		$available = 'availableLatest';
		$endPeriod = $this->_endPeriod($startPeriod, $length);

		$keyMap = array('department' => 'departmentId', 'team' => 'teamId');
		$key = array_key_exists($filter, $keyMap) ? $keyMap[$filter] : null;

		$sql = null;
		if ($key === null) {
			// get all resources on top level
			$sql = "SELECT a.period AS period, SUM(a.value) AS value FROM $available a " .
				   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "GROUP BY a.period " .
				   "ORDER BY a.period ASC";			
		}
		else {
			if ($id === null) {
				$sql = "SELECT r.$key AS id, a.period AS period, SUM(a.value) AS value FROM $available a " .
					   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
					   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
					   "GROUP BY r.$key, a.period " .
					   "ORDER BY r.teamId ASC, a.period ASC";					
			}
			else {
				$sql = "SELECT r.$key AS id, a.period AS period, SUM(a.value) AS value FROM $available a " .
					   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
					   "WHERE r.$key = $id AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
					   "GROUP BY r.$key, a.period " .
					   "ORDER BY r.teamId ASC, a.period ASC";
			}
		}
	
		return $this->_getQueryAvailable($startPeriod, $length, $resource, $available, $sql);
	}

	public function getResourceAvailability($startPeriod, $length, $filter, $id) {
		$resource = 'resourceLatest';
		$available = 'availableLatest';
		$endPeriod = $this->_endPeriod($startPeriod, $length);

		$keyMap = array('department' => 'departmentId', 'resource' => 'resourceId', 'team' => 'teamId');
		$key = array_key_exists($filter, $keyMap) ? $keyMap[$filter] : null;

		$sql = null;
		if ($key != null || $id != null) {
			$sql = "SELECT r.resourceId AS id, a.period AS period, a.value AS value FROM $available a " .
				   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
				   "WHERE r.$key = $id AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "ORDER BY a.period ASC";
		}
		else {
			// @TODO FIXME shouldn't this be a sum?
			// get all resources on top level
			$sql = "SELECT r.resourceId AS id, a.period AS period, a.value AS value FROM $available a " .
				   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
				   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "ORDER BY a.period ASC";
		}
	
		return $this->_getQueryAvailable($startPeriod, $length, $resource, $available, $sql);
	}

	public function setResourceAvailability($userId, $data, $resourceIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_AVAILABLE . " (resourceId, period, value, userId) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$v[$resourceIdKey]', '$v[$periodKey]', '$v[$valueKey]', '$userId')";
		}

		return $this->_setQuery($sql);
	}

	public function setAllocation($userId, $projectId, $data, $resourceIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_ALLOCATION . " (projectId, resourceId, period, value, userId) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ('$projectId', '$v[$resourceIdKey]', '$v[$periodKey]', '$v[$valueKey]', '$userId')";
		}

		return $this->_setQuery($sql);
	}

/*

 *: total allocation over time
 project: list of projects and allocations over time
 project+id: list of teams for a specific project over time
 team: list of teams and allocations over time
 team+id: list of projects a team is allocated to
 resource: list of resources allocation over time
 resource+id: list of projects a resource is allocated to

 project+id+teamId = return resources allocation

 */

	public function getAllocation($startPeriod, $length, $filter, $id, $group) {
		$resource = 'resourceLatest';
		$allocation = 'allocationLatest';
		$endPeriod = $this->_endPeriod($startPeriod, $length);

		$keyMap = array('raw' => 'raw', 'project' => 'a.projectId', 'department' => 'r.departmentId', 'team' => 'r.teamId', 'resource' => 'r.resourceId');
		$selectKey = array_key_exists($filter, $keyMap) ? $keyMap[$filter] : null;
		$groupKey = array_key_exists($group, $keyMap) ? $keyMap[$group] : null;

		// prepare temporary table
		$arr = $this->_createAllocationTable($allocation, $startPeriod, $length);
		if ($arr[0] !== true) {
			return $arr;
		}

		$sql = null;
		if ($selectKey === null) {
			// get all allocations on top level
			$sql = "SELECT a.period AS period, SUM(a.value) AS value FROM $allocation a " .
				   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
				   "GROUP BY a.period " .
				   "ORDER BY a.period ASC";			
		}
		else {
			// prepare temporary table
			$arr = $this->_createResourceDataTable($resource);
			if ($arr[0] !== true) {
				return $arr;
			}

			// special case with raw access, no aggregation and no filtering.
			if ($selectKey === 'raw') {
				$sql = "SELECT r.resourceId AS id, a.projectId AS projectId, a.period AS period, a.value AS value FROM $allocation a " .
					   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
					   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
					   "ORDER BY r.resourceId ASC, a.period ASC";					
			}
			else if ($id === null) {
				$sql = "SELECT $selectKey AS id, a.period AS period, SUM(a.value) AS value FROM $allocation a " .
					   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
					   "WHERE a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
					   "GROUP BY $selectKey, a.period " .
					   "ORDER BY $selectKey ASC, a.period ASC";					
			}
			else {
				if ($group === null) {
					$sql = "SELECT $selectKey AS id, a.period AS period, SUM(a.value) AS value FROM $allocation a " .
						   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
						   "WHERE $selectKey = '$id' AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
						   "GROUP BY $selectKey, a.period " .
						   "ORDER BY $selectKey ASC, a.period ASC";					
				}
				else {
					$sql = "SELECT $groupKey AS id, a.period AS period, SUM(a.value) AS value FROM $allocation a " .
						   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
						   "WHERE $selectKey = '$id' AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
						   "GROUP BY $groupKey, a.period " .
						   "ORDER BY $groupKey ASC, a.period ASC";					
				}
			}
		}

		return $this->_getQuery($sql);
	}

	public function getResourceAllocation($startPeriod, $length, $projectId, $teamId) {
		$resource = 'resourceLatest';
		$allocation = 'allocationLatest';
		$endPeriod = $this->_endPeriod($startPeriod, $length);

		// prepare temporary tables
		$arr = $this->_createAllocationTable($allocation, $startPeriod, $length);
		if ($arr[0] !== true) {
			return $arr;
		}
		$arr = $this->_createResourceDataTable($resource);
		if ($arr[0] !== true) {
			return $arr;
		}

		$sql = "SELECT r.resourceId AS id, a.period AS period, a.value AS value FROM $allocation a " .
			   "INNER JOIN $resource r ON r.resourceId = a.resourceId " .
			   "WHERE a.projectId = '$projectId' AND r.teamId = '$teamId' AND a.period >= '$startPeriod' AND a.period < '$endPeriod' " .
			   "ORDER BY r.resourceId ASC, a.period ASC";					

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

	public function getResource($filter, $id) {
		$resource = 'resourceLatest';
		$arr = $this->_createResourceDataTable($resource);
		if ($arr[0] !== true) {
			return $arr;
		}

		$sql = "SELECT r.id AS id, r.name AS name, rd.type AS type, d.id AS departmentId, d.name AS departmentName, t.id AS teamId, t.name AS teamName " .
			   "FROM $resource rd " .
			   "LEFT JOIN " . self::TABLE_RESOURCE . " r ON rd.resourceId = r.id " .
			   "LEFT JOIN " . self::TABLE_TEAM . " t ON rd.teamId = t.id " .
			   "LEFT JOIN " . self::TABLE_DEPARTMENT . " d ON rd.departmentId = d.id ";

		$key = null;
		switch ($filter) {
			case 'resource' : $key = 'r.id'; break;
			case 'department' : $key = 'd.id'; break;
			case 'team' : $key = 't.id'; break;
		}
		if ($key != null) {
			$sql .= "WHERE $key = $id ";
		}

		$sql .= "ORDER BY r.name ASC";

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
