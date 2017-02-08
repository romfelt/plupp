//
// Class for handling a Plupp API request, keeps its data after request has completed.
// Use Plupp object factory instead of using this class directly.
//
function PluppRequest(service, data) {
	var self = this; // keep reference to this object to be used independent of call context
	this.reply = null; // complete JSON reply returned by request on success
	this.root = "api.php";
	this.service = service;
	this.data = data;
	this.status = null; // null equals not completed, true if completed successfully and false if completed with errors

	this.onSuccess = function(reply) {
		self.reply = reply;
		if (self.reply.request != true) {
			self.status = false;
			console.log("Request error: " + JSON.stringify(self.reply.error));
		}
		else {
			self.status = true;
		}
	}

	this.onError = function(error) {
		self.status = false;
	}

	// run the request, return deferred object
	this.run = function() {
		var jqxhr;
		if (typeof(self.data) === 'undefined') {
			jqxhr = $.get("api.php/" + self.service);
		}
		else {
			jqxhr = $.post("api.php/" + self.service, self.data);
		}

		jqxhr.done(self.onSuccess)
			 .fail(self.onError);

		return jqxhr;
	}	
}

//
// Plupp request object factory
//
Plupp = {
	login:function(username, password) {
		var data = { 'username': username, 'password': password };
		return new PluppRequest("login", data);
	},
	logout:function() {
		return new PluppRequest("logout");
	},
	getSession:function() {
		return new PluppRequest("session");
	},
	getProject:function(projectId) {
		return new PluppRequest("project/" + projectId);
	},
	getProjects:function() {
		return new PluppRequest("project");
	},
	getDepartment:function(teamId) {
		return this._getWithOptionalId("department", teamId);
	},
	getResource:function(filter, id) {
		return this._getWithOptionalFilterId("resource", filter, id);
	},
	getResourceAvailability:function(startPeriod, length, filter, id) {
		return this._getIntervalWithOptionalFilterId("resourceavailability", startPeriod, length, filter, id);
	},
	setResourceAvailability:function(data) {
		return new PluppRequest("resourceavailability", data);
	},
	getTeams:function() {
		return new PluppRequest("team");
	},
	getTeam:function(teamId) {
		return new PluppRequest("team/" + teamId);
	},
	getTeams:function() {
		return new PluppRequest("team");
	},
	getTeamsPlan:function(startPeriod, length) {
		return new PluppRequest("teamsplan/" + startPeriod + "/" + length);
	},
	getTeamPlans:function(teamId, startPeriod, length) {
		return new PluppRequest("teamplans/" + teamId + "/" + startPeriod + "/" + length);
	},
	getAvailable:function(startPeriod, length, filter, id) {
		return this._getIntervalWithOptionalFilterId("available", startPeriod, length, filter, id);
	},
	setPlan:function(projectId, data) {
		return new PluppRequest("plan/" + projectId, data);
	},
	getPlan:function(projectId, startPeriod, length) {
		return new PluppRequest("plan/" + startPeriod + "/" + length + "/" + projectId);
	},
	getPlans:function(startPeriod, length) {
		return new PluppRequest("plan/" + startPeriod + "/" + length);
	},
	getPlanSum:function(startPeriod, length) {
		return new PluppRequest("plansum/" + startPeriod + "/" + length);
	},
	setQuotas:function(data) {
		return new PluppRequest("quota", data);
	},
	getQuota:function(projectId, startPeriod, length) {
		return new PluppRequest("quota/" + startPeriod + "/" + length + "/" + projectId);
	},
	getQuotas:function(startPeriod, length) {
		return new PluppRequest("quota/" + startPeriod + "/" + length);
	},
	getQuotaSum:function(startPeriod, length) {
		return new PluppRequest("quotasum/" + startPeriod + "/" + length);
	},

	// helper function to get a service with a given interval and optional fiter and id
	_getIntervalWithOptionalFilterId:function(service, startPeriod, length, filter, id) {
		if (typeof(filter) === 'undefined') {
			return new PluppRequest(service + "/" + startPeriod + "/" + length);
		}

		if (typeof(id) === 'undefined') {
			return new PluppRequest(service + "/" + startPeriod + "/" + length + "/" + filter);
		}

		return new PluppRequest(service + "/" + startPeriod + "/" + length + "/" + filter + "/" + id);
	},

	// helper function to get a service with optional fiter and id
	_getWithOptionalFilterId:function(service, filter, id) {
		if (typeof(filter) === 'undefined') {
			return new PluppRequest(service);
		}

		if (typeof(id) === 'undefined') {
			return new PluppRequest(service + "/" + filter);
		}

		return new PluppRequest(service + "/" + filter + "/" + id);
	},

	// helper function to get a service with an optional id
	_getWithOptionalId:function(service, id) {
		if (typeof(id) === 'undefined') {
			return new PluppRequest(service);
		}
		return new PluppRequest(service + "/" + id);
	}
}
