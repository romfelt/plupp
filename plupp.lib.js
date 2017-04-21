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
	getHistory:function(timestamp, entries, view, id) {
		return this._getIntervalWithOptionalFilterId("history", timestamp, entries, view, id);
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
	setAllocation:function(data) {
		return new PluppRequest("allocation", data);
	},
	getAllocation:function(startPeriod, length, filter, id, group) {
		return this._getWithOptionalArgs("allocation", startPeriod, length, filter, id, group);
	},
	getResourceAllocation:function(startPeriod, length, projectId, teamId) {
		return this._getWithOptionalArgs("resourceallocation", startPeriod, length, projectId, teamId);
	},
	setPlan:function(data) {
		return new PluppRequest("plan", data);
	},
	getPlan:function(startPeriod, length, filter, id, group) {
		return this._getWithOptionalArgs("plan", startPeriod, length, filter, id, group);
	},
	getResourcePlan:function(startPeriod, length, projectId, teamId) {
		return this._getWithOptionalArgs("resourceplan", startPeriod, length, projectId, teamId);
	},
	getTeam:function(teamId) {
		return new PluppRequest("team/" + teamId);
	},
	getTeams:function() {
		return new PluppRequest("team");
	},
	getAvailable:function(startPeriod, length, filter, id) {
		return this._getIntervalWithOptionalFilterId("available", startPeriod, length, filter, id);
	},
	setQuota:function(data) {
		return new PluppRequest("quota", data);
	},
	getQuota:function(startPeriod, length, filter, id) {
		return this._getIntervalWithOptionalFilterId("quota", startPeriod, length, filter, id);
	},

	// Helper function to get a service with any number of arguments.
	_getWithOptionalArgs:function(service) {
		var args = Array.prototype.slice.call(arguments, 1); // using the arguments object
		return new PluppRequest(service + "/" + args.join('/'));
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
