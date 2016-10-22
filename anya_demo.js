var hfc = require('hfc');
var test = require('tape');
var util = require('util');

//
// Required configuration settings
//

var SDK_KEYSTORE = "/tmp/keyValStore";
var SDK_MEMBERSRVC_ADDRESS = "grpc://localhost:7054";
var SDK_PEER_ADDRESS = "grpc://localhost:7051";
var SDK_EVENTHUB_ADDRESS = "grpc://localhost:7053";

//
//  Create a test chain object
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

// Set the peer address
console.log("Setting peer address to: " + SDK_PEER_ADDRESS);
chain.addPeer(SDK_PEER_ADDRESS);

// Set the eventHub address
console.log("Setting eventHubAddr address to: " + SDK_EVENTHUB_ADDRESS);
chain.eventHubConnect(SDK_EVENTHUB_ADDRESS);
process.on('exit', function () {
  chain.eventHubDisconnect();
});

// Set the chaincode deployment mode to network, i.e. chaincode runs inside
// a Docker container
chain.setDevMode(false);

//
// Declare test variables that will be used across multiple tests.
//

// Member object returned after registration and enrollment
var test_user_Member1;

// testChaincodeID will store the chaincode ID value after deployment and used
// to execute the invocation and query
var testChaincodeID;

//
// Enroll the WebAppAdmin member. WebAppAdmin member is already registered
// manually by being included inside the membersrvc.yaml file.
//

test('Enroll WebAppAdmin', function (t) {
    // Get the WebAppAdmin member
    chain.getMember("WebAppAdmin", function (err, WebAppAdmin) {
        if (err) {
            t.fail("Failed to get WebAppAdmin member " + " ---> " + err);
            t.end(err);
        } else {
            t.pass("Successfully got WebAppAdmin member" /*+ " ---> " + JSON.stringify(crypto)*/);

            // Enroll the WebAppAdmin member with the certificate authority using
            // the one time password hard coded inside the membersrvc.yaml.
            pw = "DJY27pEnl16d";
            WebAppAdmin.enroll(pw, function (err, enrollment) {
                if (err) {
                    t.fail("Failed to enroll WebAppAdmin member " + " ---> " + err);
                    t.end(err);
                } else {
					// Set the WebAppAdmin as the designated chain registrar
					chain.setRegistrar(WebAppAdmin);

                    t.pass("Successfully enrolled WebAppAdmin member");
					t.end(err);
                }
            });
        }
    });
});  /* Enroll WebAppAdmin */

//
// Register and enroll a new user with the certificate authority.
// This will be performed by the registrar member, WebAppAdmin.
//

test('Register and enroll a new user', function (t) {
    // Register and enroll test_user
    chain.getMember("WebApp_user1", function (err, WebApp_user1) {
        if (err) {
            t.fail("Failed to get WebApp_user1"  + " ---> ", err);
			t.end(err);
        } else {
            test_user_Member1 = WebApp_user1;

			// User may not be enrolled yet. Perform both registration and enrollment.
			var registrationRequest = {
				enrollmentID: test_user_Member1.getName(),
				affiliation: "bank_a"
			};
			test_user_Member1.registerAndEnroll(registrationRequest, function (err, member) {
				if (err) {
					t.fail("Failed to enroll WebApp_user1 member " + " ---> " + err);
					t.end(err);
				} else{
		            t.pass("Successfully registered and enrolled " + test_user_Member1.getName());
					t.end();
				}
			});
        }
    });
}); /* Register and enroll a new user */

//
// Create and issue a chaincode deploy request by the test user, who was
// registered and enrolled in the UT above. Deploy a testing chaincode from
// a local directory in the user's $GOPATH.
//

test('Deploy a chaincode by enrolled user', function (t) {
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
    var deployTx = test_user_Member1.deploy(deployRequest);

    // Print the deploy results
    deployTx.on('complete', function (results) {
        // Deploy request completed successfully
        console.log(util.format("deploy results: %j", results));
        // Set the testChaincodeID for subsequent tests
        testChaincodeID = results.chaincodeID;
        console.log("testChaincodeID:" + testChaincodeID);
        t.pass(util.format("Successfully deployed chaincode: request=%j, response=%j", deployRequest, results));
		t.end();
    });
    deployTx.on('error', function (err) {
        // Deploy request failed
        t.fail(util.format("Failed to deploy chaincode: request=%j, error=%j", deployRequest, err));
		t.end();
    });
}); /* Deploy a chaincode by enrolled user */

//
// Create and issue a chaincode query request by the test user, who was
// registered and enrolled in the UT above. Query an existing chaincode
// state variable with a transaction certificate batch size of 1.
//

test('Query existing chaincode state by enrolled user with batch size of 1', function (t) {
    // Construct the query request
    var queryRequest = {
        // Name (hash) required for query
        chaincodeID: testChaincodeID,
        // Function to trigger
        fcn: "query",
        // Existing state variable to retrieve
        args: ["a"]
    };

    // Trigger the query transaction
    test_user_Member1.setTCertBatchSize(1);
    var queryTx = test_user_Member1.query(queryRequest);

    // Print the query results
    queryTx.on('complete', function (results) {
        // Query completed successfully
        t.pass(util.format("Successfully queried existing chaincode state: request=%j, response=%j, value=%s", queryRequest, results, results.result.toString()));
		t.end();
	});
    queryTx.on('error', function (err) {
        // Query failed
        t.fail(util.format("Failed to query existing chaincode state: request=%j, error=%j", queryRequest, err));
		t.end();
	});
}); /* Query existing chaincode state by enrolled user with batch size of 1 */

//
// Create and issue a chaincode invoke request by the test user, who was
// registered and enrolled in the UT above.
//

test('Invoke a chaincode by enrolled user', function (t) {
	// Construct the invoke request
    var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: testChaincodeID,
        // Function to trigger
        fcn: "invoke",
        // Parameters for the invoke function
        args: ["a", "b", "10"]
    };

    // Trigger the invoke transaction
    var invokeTx = test_user_Member1.invoke(invokeRequest);

    // Print the invoke results
    invokeTx.on('submitted', function (results) {
        // Invoke transaction submitted successfully
        t.pass(util.format("Successfully submitted chaincode invoke transaction: request=%j, response=%j", invokeRequest, results));
        chain.eventHubDisconnect();
		t.end();
    });
    invokeTx.on('error', function (err) {
        // Invoke transaction submission failed
        t.fail(util.format("Failed to submit chaincode invoke transaction: request=%j, error=%j", invokeRequest, err));
		t.end();
	});
}); /* Invoke a chaincode by enrolled user */
