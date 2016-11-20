<?php

// 
// Class for interacting with the Plupp MySQL database
//
class Plupp
{
	const TABLE_QUOTA = 'quota';
	const TABLE_TEAM = 'team';
	const TABLE_PLAN = 'plan';
	const TABLE_PROJECT = 'project';

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

	private function _getQuery($sql) {
		$result = $this->db->query($sql);
		if ($result === false) {
			return array(false, $this->error());
		}	

		return array(true, $this->_fetachAll($result));
	}

	private function _setQuery($sql) {
		$result = $this->db->query($sql) === true;
		return array($result, $result !== true ? error() : '');
	}

	public function setPlan($projectId, $data, $teamIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_PLAN . " (projectId, teamId, period, value) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ($projectId, $v[$teamIdKey], $v[$periodKey], $v[$valueKey])";
		}

		return $this->_setQuery($sql);
	}

	public function getPlan($projectId, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.teamId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " WHERE projectId = $projectId GROUP BY teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.projectId = $projectId AND p.period >= $startPeriod AND p.period < $endPeriod ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getPlans($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.projectId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= $startPeriod AND p.period < $endPeriod GROUP BY p.projectId, p.period ORDER BY p.projectId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getPlanSum($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= $startPeriod AND p.period < $endPeriod GROUP BY p.period ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function setQuotas($data, $projectIdKey, $periodKey, $valueKey) {
		$sql = "INSERT INTO " . self::TABLE_QUOTA . " (projectId, period, value) VALUES";
		$i = 0;
		foreach ($data as $k => $v) {
			if ($i++ > 0) {
				$sql .= ',';
			}
			$sql .= " ($v[$projectIdKey], $v[$periodKey], $v[$valueKey])";
		}

		return $this->_setQuery($sql);
	}

	public function getQuota($projectId, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " WHERE projectId = $projectId GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.projectId = $projectId AND p.period >= $startPeriod AND p.period < $endPeriod ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getQuotas($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.projectId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.period >= $startPeriod AND p.period < $endPeriod GROUP BY p.projectId, p.period ORDER BY p.projectId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getQuotaSum($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_QUOTA . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_QUOTA . " GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.period >= $startPeriod AND p.period < $endPeriod GROUP BY p.period ORDER BY p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getTeam($teamId) {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " WHERE id = $teamId");
	}

	public function getTeams() {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " ORDER BY name ASC");
	}

	public function getTeamsPlan($startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.teamId AS id, p.period AS period, SUM(p.value) AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY projectId, teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.period >= $startPeriod AND p.period < $endPeriod GROUP BY p.teamId, p.period ORDER BY p.teamId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getTeamPlans($teamId, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.projectId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT projectId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " WHERE teamId = $teamId GROUP BY projectId, period" .
			   ") r ON p.timestamp = r.latest AND p.projectId = r.projectId AND p.period = r.period " .
			   "WHERE p.teamId = $teamId AND p.period >= $startPeriod AND p.period < $endPeriod ORDER BY p.projectId ASC, p.period ASC";

		return $this->_getQuery($sql);
	}

	public function getProjects() {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " ORDER BY name ASC");
	}

	public function getProject($projectId) {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " WHERE id = $projectId");
	}

	public function escape($str) { }

	public function error() {
		if ($this->db->errno) {
		    return 'MySQL error (' . $this->db->errno . ') ' . $this->db->error;
		}
		return true;
	}

	public function initializeTables() {
		// @TODO make it possible to create SQL tables in an empty database
	}

}


?>