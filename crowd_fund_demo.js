// Hyperledger Fabric Client to connect to the Fabric network
var hfc = require('hfc');
// For printing formatted things
var util = require('util');
// Express to listen to browser requests
var express = require('express');
var app = express();
// Body parser for parsing the request body
var bodyParser = require('body-parser')
// Debug modules to aid with debugging
var debugModule = require('debug');
var debug = debugModule('crowd_fund');

////////////////////////////////////////////////////////////////////////////////
// The fist part of this application configures all the required settings the //
// app will need to connect to the Fabric network, such as the membership     //
// service address, the peer address(es), the eventHub address for listening  //
// to incoming events, etc.                                                   //
////////////////////////////////////////////////////////////////////////////////

//
// Get the Docker Host IP from command line
//
var DOCKER_HOST_IP = process.argv[2];
if (DOCKER_HOST_IP == null || DOCKER_HOST_IP == "") {
	console.log("ERROR: No Docker Host IP specified! Exiting.");
	process.exit(1);
} else {
	console.log("Docker Host IP: " + DOCKER_HOST_IP + "\n");
}

//
// Required configuration settings
//
var SDK_KEYSTORE = "/tmp/keyValStore";
var SDK_MEMBERSRVC_ADDRESS = "grpc://" + DOCKER_HOST_IP + ":7054";
var SDK_PEER_ADDRESSES = [
	"grpc://" + DOCKER_HOST_IP + ":7051",
	"grpc://" + DOCKER_HOST_IP + ":8051",
	"grpc://" + DOCKER_HOST_IP + ":9051",
	"grpc://" + DOCKER_HOST_IP + ":10051"
];
var SDK_EVENTHUB_ADDRESS = "grpc://" + DOCKER_HOST_IP + ":7053";

//
//  Create a chain object
//
var chain = hfc.newChain("testChain");

//
// Configure the chain settings
//

// Set the location of the KeyValueStore
console.log("Setting keyValStore location to: " + SDK_KEYSTORE);
chain.setKeyValStore(hfc.newFileKeyValStore(SDK_KEYSTORE));

// Set the membership services address
console.log("Setting membersrvc address to: " + SDK_MEMBERSRVC_ADDRESS);
chain.setMemberServicesUrl(SDK_MEMBERSRVC_ADDRESS);

// Set the peer address(es) depending on the network type
if (process.argv[3] == "single-peer") {
	console.log("Setting peer address to: " + SDK_PEER_ADDRESSES[0]);
	chain.addPeer(SDK_PEER_ADDRESSES[0]);
} else if (process.argv[3] == "four-peer") {
	SDK_PEER_ADDRESSES.forEach(function(peer_address) {
		console.log("Adding peer address: " + peer_address);
		chain.addPeer(peer_address);
	});
} else {
	console.log("ERROR: Please select either a `single-peer` " +
	 			" or a `four-peer` network!");
	process.exit(1);
}

// Set the eventHub address
console.log("Setting eventHubAddr address to: " + SDK_EVENTHUB_ADDRESS + "\n");
chain.eventHubConnect(SDK_EVENTHUB_ADDRESS);
process.on('exit', function () {
	console.log("Exiting and disconnecting eventHub channel.");
	chain.eventHubDisconnect();
});

// Set the chaincode deployment mode to "network", i.e. chaincode runs inside
// a Docker container
chain.setDevMode(false);

//
// Declare variables that will be used across multiple operations
//

// User object returned after registration and enrollment
var app_user;

// chaincodeID will store the chaincode ID value after deployment which is
// later used to execute invocations and queries
var chaincodeID;

////////////////////////////////////////////////////////////////////////////////
// The second part of this app does the required setup to register itself     //
// with the Fabric network. Specifically, it enrolls and registers the        //
// required users and then deploys the chaincode to the network. The          //
// chaincode will then be ready to take invoke and query requests.            //
////////////////////////////////////////////////////////////////////////////////

//
// Enroll the WebAppAdmin member. WebAppAdmin member is already registered
// manually by being included inside the membersrvc.yaml file, i.e. the
// configuration file for the membership services Docker container.
//
chain.getMember("WebAppAdmin", function (err, WebAppAdmin) {
    if (err) {
		console.log("ERROR: Failed to get WebAppAdmin member -- " + err);
		process.exit(1);
    } else {
        console.log("Successfully got WebAppAdmin member.");

        // Enroll the WebAppAdmin member with the certificate authority using
        // the one time password hard coded inside the membersrvc.yaml.
        pw = "DJY27pEnl16d";
        WebAppAdmin.enroll(pw, function (err, enrollment) {
            if (err) {
                console.log("ERROR: Failed to enroll WebAppAdmin member -- "
							+ err);
                process.exit(1);
            } else {
				// Set the WebAppAdmin as the designated chain registrar
				console.log("Successfully enrolled WebAppAdmin member.");
				console.log("Setting WebAppAdmin as chain registrar.");
				chain.setRegistrar(WebAppAdmin);

				// Register a new user with WebAppAdmin as the chain registrar
				console.log("Registering user `WebAppUser_1`.");
				registerUser("WebApp_user1");
            }
        });
    }
});

//
// Register and enroll a new user with the certificate authority.
// This will be performed by the member with registrar authority, WebAppAdmin.
//
function registerUser(user_name) {
    // Register and enroll the user
    chain.getMember(user_name, function (err, user) {
        if (err) {
            console.log("ERROR: Failed to get " + user.getName() + " -- ", err);
			process.exit(1);
        } else {
            app_user = user;

			// User may not be enrolled yet. Perform both registration
			// and enrollment.
			var registrationRequest = {
				enrollmentID: app_user.getName(),
				affiliation: "bank_a"
			};
			app_user.registerAndEnroll(registrationRequest, function (err, member) {
				if (err) {
					console.log("ERROR: Failed to enroll "
								+ app_user.getName() + " -- " + err);
					process.exit(1);
				} else{
		            console.log("Successfully registered and enrolled "
								+ app_user.getName() + ".\n");

					// Deploy a chaincode with the new user
					console.log("Deploying chaincode now...");
					deployChaincode()
				}
			});
        }
    });
}

//
// Construct and issue a chaincode deployment request. Deploy the chaincode from
// a local directory in the user's $GOPATH.
//
function deployChaincode() {
    // Construct the deploy request
    var deployRequest = {
		// Path (under $GOPATH/src) required for deploy in network mode
		chaincodePath: "crowd_fund_chaincode",
        // Function to trigger
        fcn: "init",
        // Arguments to the initializing function
        args: ["account", "0"],
    };

    // Trigger the deploy transaction
    var deployTx = app_user.deploy(deployRequest);

    // Print the successfull deploy results
    deployTx.on('complete', function (results) {
        // Set the chaincodeID for subsequent tests
        chaincodeID = results.chaincodeID;
        console.log(util.format("Successfully deployed chaincode: request=%j, "
					+ "response=%j" + "\n", deployRequest, results));
		// The chaincode is successfully deployed, start the listener port
		 startListener();
    });
    deployTx.on('error', function (err) {
        // Deploy request failed
        console.log(util.format("ERROR: Failed to deploy chaincode: request=%j, "
					+ "error=%j", deployRequest, err));
		process.exit(1);
    });
}

////////////////////////////////////////////////////////////////////////////////
// The third part of this app configures an HTTP server in order to listen    //
// for incoming HTTP requests. These requests will then invoke or query the   //
// chancode and return a response to the client.                              //
////////////////////////////////////////////////////////////////////////////////

// Assign any listening port for your webApp
var app_port = 3000;

// Enable CORS for ease of development and testing
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

// Use body-parer to parse the JSON formatted request payload
app.use(bodyParser.json());

//
// Add route for a chaincode query request for a specific state variable
//
app.get("/state/:var", function(req, res) {
	// State variable to retrieve
	var stateVar = req.params.var;

	// Construct the query request
    var queryRequest = {
        // Name (hash) required for query
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: "query",
        // State variable to retrieve
        args: [stateVar]
    };

    // Trigger the query transaction
    var queryTx = app_user.query(queryRequest);

    // Query completed successfully
    queryTx.on('complete', function (results) {
        console.log(util.format("Successfully queried existing chaincode state: "
					+ "request=%j, response=%j, value=%s", queryRequest, results,
					results.result.toString()));

		res.status(200).json({ "value": results.result.toString() });
	});
	// Query failed
    queryTx.on('error', function (err) {
		var errorMsg = util.format("ERROR: Failed to query existing chaincode " +
					 + "state: request=%j, error=%j", queryRequest, err);

        console.log(errorMsg);

		res.status(500).json({ error: errorMsg });
	});
});

//
// Add route for a chaincode invoke request
//
app.post('/transactions', function(req, res) {
	// Ammount to transfer
	var ammount = req.body.ammount;

	// Construct the invoke request
    var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: "invoke",
        // Parameters for the invoke function
        args: ["account", ammount]
    };

    // Trigger the invoke transaction
    var invokeTx = app_user.invoke(invokeRequest);

    // Invoke transaction submitted successfully
    invokeTx.on('submitted', function (results) {
        console.log(util.format("Successfully submitted chaincode invoke " +
					" transaction: request=%j, response=%j", invokeRequest, results));

		res.status(200).json({ status: "submitted" });
    });
	// Invoke transaction submission failed
    invokeTx.on('error', function (err) {
        var errorMsg = util.format("ERROR: Failed to submit chaincode invoke "
					+ "transaction: request=%j, error=%j", invokeRequest, err);

		console.log(errorMsg);

		res.status(500).json({ error: errorMsg });
	});
});

//
// Start the HTTP server to listen for incoming requests
//
function startListener() {
	console.log("Starting WebApp on port " + app_port);
	app.listen(app_port);
	console.log("WebApp is now listening on port " + app_port + "\n");
}
