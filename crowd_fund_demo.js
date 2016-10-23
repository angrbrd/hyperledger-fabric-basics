var hfc = require('hfc');
var util = require('util');

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
		chaincodePath: "chaincode_example02",
        // Function to trigger
        fcn: "init",
        // Arguments to the initializing function
        args: ["a", "100", "b", "200"],
    };

    // Trigger the deploy transaction
    var deployTx = app_user.deploy(deployRequest);

    // Print the successfull deploy results
    deployTx.on('complete', function (results) {
        // Set the chaincodeID for subsequent tests
        chaincodeID = results.chaincodeID;
        console.log(util.format("Successfully deployed chaincode: request=%j, "
					+ "response=%j" + "\n", deployRequest, results));
    });
    deployTx.on('error', function (err) {
        // Deploy request failed
        console.log(util.format("ERROR: Failed to deploy chaincode: request=%j, "
					+ "error=%j", deployRequest, err));
		process.exit(1);
    });
}

//
// Create and issue a chaincode query request.
//
function queryChaincode() {
    // Construct the query request
    var queryRequest = {
        // Name (hash) required for query
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: "query",
        // Existing state variable to retrieve
        args: ["a"]
    };

    // Trigger the query transaction
    app_user.setTCertBatchSize(1);
    var queryTx = app_user.query(queryRequest);

    // Print the query results
    queryTx.on('complete', function (results) {
        // Query completed successfully
        console.log(util.format("Successfully queried existing chaincode state: "
					+ "request=%j, response=%j, value=%s", queryRequest, results,
					results.result.toString()));
	});
    queryTx.on('error', function (err) {
        // Query failed
        console.log(util.format("ERROR: Failed to query existing chaincode " +
					+ "state: request=%j, error=%j", queryRequest, err));
		process.exit(1);
	});
}

//
// Create and issue a chaincode invoke request.
//
function invokeChaincode() {
	// Construct the invoke request
    var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: "invoke",
        // Parameters for the invoke function
        args: ["a", "b", "10"]
    };

    // Trigger the invoke transaction
    var invokeTx = app_user.invoke(invokeRequest);

    // Print the invoke results
    invokeTx.on('submitted', function (results) {
        // Invoke transaction submitted successfully
        console.log(util.format("Successfully submitted chaincode invoke " +
					" transaction: request=%j, response=%j", invokeRequest, results));
    });
    invokeTx.on('error', function (err) {
        // Invoke transaction submission failed
        console.log(util.format("ERROR: Failed to submit chaincode invoke "
					+ "transaction: request=%j, error=%j", invokeRequest, err));
		process.exit(1);
	});
}
