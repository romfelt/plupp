<?php

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
			return array(false, error());
		}	

		return array(true, $this->_fetachAll($result));
	}

	public function setPlan($projectId, $teamId, $period, $value) {
		$sql = "INSERT INTO " . self::TABLE_PLAN . " SET projectId=$projectId, teamId=$teamId, period=$period, value=$value";
		$result = $this->db->query($sql) === true;
		return array($result, $result !== true ? error() : '');
	}

	// returns array(status, data)
	public function getPlan($projectId, $startPeriod, $length) {
		$endPeriod = $startPeriod + $length;
		$sql = "SELECT p.teamId AS id, p.period AS period, p.value AS value FROM " . self::TABLE_PLAN . " p INNER JOIN (" .
			   "    SELECT teamId, period, MAX(timestamp) AS latest FROM " . self::TABLE_PLAN . " GROUP BY teamId, period" .
			   ") r ON p.timestamp = r.latest AND p.teamId = r.teamId AND p.period = r.period " .
			   "WHERE p.projectId=$projectId AND p.period >= $startPeriod AND p.period < $endPeriod ORDER BY p.timestamp DESC";

		return $this->_getQuery($sql);
	}

	public function setQuota($period, $projectId, $value) {
		$sql = "INSERT INTO " . self::TABLE_QUOTA . " SET projectId=$projectId, period=$period, value=$value";
		echo $sql . "<br>\n";
	}

	public function getQuota($startPeriod, $projectId = null) {
		if ($projectId === null) {
		}

		$sql = "SELECT * FROM " . self::TABLE_QUOTA . " WHERE period >= $period ORDER BY timestamp DESC LIMIT 1";

		echo $sql . "<br>\n";
	}

	public function getTeams() {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_TEAM . " ORDER BY name ASC");
	}

	public function getProjects() {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " ORDER BY name ASC");
	}

	public function getProject($projectId) {
		return $this->_getQuery("SELECT id, name FROM " . self::TABLE_PROJECT . " WHERE id=$projectId ORDER BY name ASC");
	}

	public function escape($str) { }

	public function error() {
		if ($this->db->errno) {
		    return 'MySQL error (' . $this->db->errno . ') ' . $this->db->error;
		}
		return true;
	}

}


?>