/*
* Copyright 2019, 2020 Marcus Rejas
*
* Some code and inspiration is from signalk-mqtt-gw
* Copyright 2016 Teppo Kurki <teppo.kurki@iki.fi>
*
* But the mistakes are mine :-)
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0

* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

const id = 'signalk-iotopen-lynx-gw';
const mqtt = require('mqtt');
const NeDBStore = require('mqtt-nedb-store');
const Request = require("request");

var known_paths = [];

function lynxObjectExists(path, config) {
	//app.debug('lynxObjectExists called with ' + path + '\n'); 

	if (known_paths.includes(path)) {
		//app.debug('Known in cache\n');
		return;
	} else {
		//app.debug('Not known in cache\n');
	}

	var urlPrefix = '';
	var returnValue = false;
	if ( config.useTLS ) {
		urlPrefix = 'https://';
	} else {
		urlPrefix = 'http://';
	}

	var url = urlPrefix + config.restHost + '/api/v2/functionx/' + config.installationId + '?signalk_path=' + path;


	//app.debug('token:' + config.password);

	var options = {
		uri: url,
		method: 'GET',
		headers: { 'User-Agent': 'SignalK IoT Open Gateway' }
	};

	Request(options, function (error, response, body) {
		if (error) {
			//app.debug('Error cought' + error + '\n');
		}

		var result = [ "undefined" ];		

    		try {
			result = JSON.parse(body);
    		} catch(e) {
        		//app.debug(e);
    		}

		//app.debug(body);

		if (typeof result[0] != "undefined" && path.localeCompare(result[0].meta.signalk_path) == 0) {
			//app.debug(path + '==' + result[0].meta.signalk_path + '==> TRUE\n');
			//app.debug('Adding to cache\n');
			known_paths.push(path);
		} else {
			createLynxObject(path, config);
		}
	}).auth('token', config.password, true);
}

function createLynxObject(path, config) {
	//app.debug('createLynxObject called with ' + path +  '\n'); 
	var urlPrefix = '';
	if ( config.useTLS ) {
		urlPrefix = 'https://';
	} else {
		urlPrefix = 'http://';
	}
	var url = urlPrefix + config.restHost + '/api/v2/functionx/' + config.installationId;
	var topic = 'obj/signalk/' + path.replace(/\./g, '/');

	var options = {
		uri: url,
		method: 'POST',
		headers: {
    			'Accept': 'application/json',
    			'Content-Type': 'application/json'
  		},
		json: {
			"installation_id": config.installationId,
			"type": "signalk",
			"meta": {
				"signalk_path": path,
				"topic_read": topic,
				"name": path
			},
	 	}
	};

	Request(options, function (error, response, body) {
		//app.debug(url + ': ' + JSON.stringify(options) + ' :' + JSON.stringify(body));
		if (error) {
			//app.debug("Error creating LynxObject " + JSON.stringify(body));
			return(false);
		}

	}).auth('token', config.password, true);
	return(true);
}

module.exports = function(app) {
	var plugin = {
		unsubscribes: [],
	};
	var server

	plugin.id = id;
	plugin.name = 'SignalK to IoT Open Lynx (alpha)';
	plugin.description =
		'Plugin that provides gateway functionality from Signal K to IoT Open Lynx';

	plugin.schema = {
		title: 'Signal K - IoT Open Lynx Gateway',
		type: 'object',
		properties: {
			restHost: {
				type: 'string',
				title: 'IoT Open Lynx REST server (e.g. lynx.iotopen.se)',
				description:
					'IoT Open Lynx server that the paths listed below should be sent to',
				default: 'lynx.iotopen.se',
			},
			mqttHost: {
				type: 'string',
				title: 'IoT Open Lynx MQTT server and port (e.g. lynx.iotopen.se:8883)',
				description:
					'IoT Open Lynx server that the paths listed below should be sent to. In most cases the same as the REST server and port is most likely 8883.',
				default: 'lynx.iotopen.se:8883',
			},
			useTLS: {
				type: "boolean",
				default: true,
				title: "Use TLS encryption (https/mqtts)"
			},
			rejectUnauthorized: {
				type: "boolean",
				default: true,
				title: "Reject self signed and invalid server certificates"
			},
			password: {
				type: "string",
				title: "Token from Lynx"
			},
			installationId: {
				type: "string",
				title: "Installation ID from Lynx"
			},
			clientId: {
				type: "string",
				title: "Client ID from Lynx"
			},
			paths: {
				type: 'array',
				title: 'Signal K self paths to send',
				description: 'See the Data Browser to get currently known self paths',
				//description: 'Seen paths:' + app.streambundle.getAvailablePaths().toString(), //.join(),
				//description: app.streambundle.getAvailablePaths().join(),
				//description: app.streambundle.getAvailablePaths(),
				default: [{ path: 'navigation.position', interval: 60 }],
				items: {
					type: 'object',
					properties: {
						path: {
							type: 'string',
							title: 'Path',
						},
						interval: {
							type: 'number',
							title:
								'Minimum interval between updates for this path to be sent to the server',
						},
					},
				},
			},
		},
	};

	var started = false;

	plugin.onStop = [];

	plugin.start = function(options) {
		plugin.onStop = [];
		var urlPrefix = "";
		if ( options.useTLS ) {
			urlPrefix = 'mqtts://';
		} else {
			urlPrefix = 'mqtt://'
		}

		const manager = NeDBStore(app.getDataDirPath());
		const client = mqtt.connect(urlPrefix + options.mqttHost, {
			rejectUnauthorized: options.rejectUnauthorized,
			reconnectPeriod: 60000,
			clientId: app.selfId,
			outgoingStore: manager.outgoing,
			username: 'Token',
			password: options.password
		});
		client.on('error', (err) => console.error(err))
		startSending(options, client, plugin.onStop);
		plugin.onStop.push(_ => client.end());
		started = true;
	};

	plugin.stop = function() {
		plugin.onStop.forEach(f => f());
	};

	plugin.statusMessage = function () {
		if (started)
			return 'Connection to IoT Open established.';
		else
			return 'Not yet connected to IoT Open.';
	}

	function startSending(options, client, onStop) {
		options.paths.forEach(pathInterval => {
			// If there are more than one value we need to split it up.
			// If the value is not numeric we have to skip it.
			//
			onStop.push(
				app.streambundle
					.getSelfBus(pathInterval.path)
					.debounceImmediate(pathInterval.interval * 1000)
					.log()
					.onValue(normalizedPathValue => {
						//app.debug('Got Value = ' + normalizedPathValue.value);
						//app.debug('Got Unit = ' + normalizedPathValue.unit);
						//app.debug("Checking if path exists: " + pathInterval.path);
						
						var path_list = {};

						if (typeof normalizedPathValue.value === 'object') {
							// We have to create a path for each value. Adding the full value to msg.
							Object.keys(normalizedPathValue.value).forEach(function(index, item) {
								const lynxMetric = { value: normalizedPathValue.value[index], msg: JSON.stringify(normalizedPathValue.value) }
								//app.debug('Adding ' + normalizedPathValue.value[index] + ' to ' + pathInterval.path + '.'+ index + '\n');
								path_list[pathInterval.path + '.'+ index] = Object.create(lynxMetric);
							});

						} else {
							const lynxMetric = { value: normalizedPathValue.value, msg: '' }
							//app.debug('Adding ' + normalizedPathValue.value + ' to ' + pathInterval.path + '\n');
							path_list[pathInterval.path] = Object.create(lynxMetric);
						}


						Object.keys(path_list).forEach(function(path, value) {
							//app.debug('path=' + path + ' value=' + path_list[path] + '\n');
							lynxObjectExists(path, options);
							client.publish(
								options.clientId.concat('/obj/signalk/', path.replace(/\./g, '/')),
								JSON.stringify({
									timestamp: new Date(normalizedPathValue.timestamp).getTime() / 1000,
									value: path_list[path].value,
									msg: path_list[path].msg
								}),
								{ qos: 2 }
						)
						}); 

					}
					)
			);
		});
	}

	return plugin;
};
