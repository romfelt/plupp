<?php

/*

ini_set('display_errors', 'On');
error_reporting(E_ALL | E_STRICT);

$session = Session::getInstance(60);

echo "<a href='?action=none'>Status</a> | ";
echo "<a href='?action=login&user=spider&pass=man'>Login</a> | ";
echo "<a href='?action=logout'>Logout</a> | ";
echo "<a href='?action=touch'>Touch</a><br>\n";

echo $session->toString();

$action = isset($_GET['action']) ? $_GET['action'] : 'none';
$rc = '';
switch ($action) {
	case 'login': $rc = $session->start($_GET['user'], $_GET['pass'], 'got root?'); break;
	case 'logout': $rc = $session->end(); break;
	case 'touch': $rc = $session->touch(); break;
}
echo "<b>Action: $action returned " . ($rc === false ? 'false' : 'true') . "</b><br>\n";

echo $session->toString();

*/

//
// A basic session handler class, singleton style.
//
class Session {
	const SESSION_NAME = 'name';
	const SESSION_ID = 'id';
	const SESSION_TIME = 'time';
	const SESSION_ACCESS = 'access';

	private static $instance; // the only instance

	private $length; // session length in seconds 

	private function __construct($sessionLengthInSeconds = 3600) {
		$this->length = $sessionLengthInSeconds;
		session_start();
		$this->validate();
	}

	public function __destruct() {
	}

	public static function getInstance() {
		if (isset(self::$instance)) {
			return self::$instance;
		}

		self::$instance = new self();		
		return self::$instance;
	}

	public function getId() {
		return session_id();
	}

	public function toString() {
		$tmp  = "getId() = " . $this->getId() . "<br>\n";
		$tmp .= "length = " . $this->length . " s<br>\n";
		$r = $this->isValid();
		$tmp .= "isValid() = " . ($r === true ? 'true' : 'false') . "<br>\n";
		$r = $this->getUserInfo();
		$tmp .= "getUserInfo() = " . ($r === false ? 'false' : print_r($r, true)) . "<br>\n";
		$r = $this->getTimeLeft();
		$tmp .= "getTimeLeft() = " . ($r === false ? 'false' : $r) . "<br>\n";
		$r = $this->getUserId();
		$tmp .= "getUserId() = " . ($r === false ? 'false' : $r) . "<br>\n";
		$r = $this->getUserName();
		$tmp .= "getUserName() = " . ($r === false ? 'false' : $r) . "<br>\n";

		return $tmp;
	}

	// start new user session and setup session variables 
	public function start($userId, $userName, $access) {
		$_SESSION[self::SESSION_ID] = $userId;
		$_SESSION[self::SESSION_NAME] = $userName;
		$_SESSION[self::SESSION_ACCESS] = $access;
		$_SESSION[self::SESSION_TIME] = time(); 
		$this->validate();
		return true;
	}

	// end session, i.e. remove all session variables and destroy the session 
	public function end() {
		if (session_status() === PHP_SESSION_ACTIVE) {
			session_unset(); 
			session_destroy();
		}
		$this->validate();
		return true;
	}

	// like a isValid() but it also updates UNIX time stamp to enable automatic session ending
	public function touch() {
		if ($this->isValid() !== true) {
			return false;
		}
		$_SESSION[self::SESSION_TIME] = time(); 
		return true;
	}

	// run validate once, access result using isValid()
	private function validate() {
		if (isset($_SESSION[self::SESSION_TIME])) {
			$maxTime = ((int) $_SESSION[self::SESSION_TIME]) + $this->length;
			if (time() < $maxTime) {
				$this->valid = true;
				return;
			}
		}
		$this->valid = false;
		return;
	}

	// check if session is still valid 
	public function isValid() {
		return $this->valid === true;
	}

	// returns time left in session or false if no session
	public function getTimeLeft() {
		if (isset($_SESSION[self::SESSION_TIME])) {
			return ((int) $_SESSION[self::SESSION_TIME]) + $this->length - time();
		}
		return false;
	}

	// returns array with user info or false if session is not valid
	public function getUserInfo() {
		if ($this->isValid() !== true) {
			return false;
		}
		return array('userId' => ((int) $_SESSION[self::SESSION_ID]), 'username' => $_SESSION[self::SESSION_NAME], 'access' => $_SESSION[self::SESSION_ACCESS]);
	}

	// returns user name or false if session is not valid
	public function getUserName() {
		if ($this->isValid() !== true) {
			return false;
		}
		return $_SESSION[self::SESSION_NAME];
	}

	// returns user id or false if session is not valid
	public function getUserId() {
		if ($this->isValid() !== true) {
			return false;
		}
		return $_SESSION[self::SESSION_ID];
	}

	// returns user access or false if session is not valid
	public function getUserAccess() {
		if ($this->isValid() !== true) {
			return false;
		}
		return $_SESSION[self::SESSION_ACCESS];
	}
}
