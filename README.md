# Hyperledger Fabric Basics

## Overview

This tutorial was presented as the demo at All Things Open 2016 conference to accompany my talk found [here](All_Things_Open_v10262016.pdf).

The goal of this tutorial is to show you how to get started writing applications and chaincode (smart contracts) for the [Hyperledger](https://www.hyperledger.org/) Fabric network in your local development environment. If you are looking for more information on Hyperledger Fabric and interested to contribute to the project, a good place to start is the [official documentation](http://hyperledger-fabric.readthedocs.io/en/latest/).

**Note:** The following instructions were written and tested on a Mac. Instructions may vary slightly if you run on a Windows or a Linux machine and I will add clarifications specific to other systems shortly. Please stay tuned! If you run into an issue with this tutorial, please feel free to open an issue in this repository or to reach out to me on [Hyperledger Slack](https://hyperledgerproject.slack.com/). My handle is `@anya`.

1. [Prerequisites](#prerequisites) 	
2. [Start A Fabric Network](#start-a-fabric-network)
3. [Verify The Fabric Network](#verify-the-fabric-network)
4. [Set Up Chaincode](#set-up-chaincode)
5. [Run The Application](#run-the-application)
6. [Hook Up Front End](#hook-up-front-end)
7. [Get Creative!](#get-creative)
8. [Need Help?](#need-help)

## Prerequisites

This tutorial requires you to install:

- [Git](#install-git)
- [Golang](#install-golang)
- [Node.js and NPM](#install-nodejs-and-npm)
- [Docker Toolbox](#install-docker-toolbox)

### Install Git

You need to install Git in order to clone the repository containing the  Docker images for running the Hyperledger Fabric network as well as the sample program in this repository. 

To install Git, follow the instructions [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) for the specific system that you are running on. Next, install the Git Large File Storage (Git LFS) plug-in from [here](https://git-lfs.github.com/) as the chaincode dependency file (`vendor.zip`) you will be downloading from this repository is quite large and had to be stored in Git LFS.

### Install Golang

You need to install Golang (Go) in order to modify the sample chaincode provided here as well as to develop and compile your own chaincode.

To install Golang, follow the instructions [here](https://golang.org/dl/) to download and install the latest version of Go.

Make sure to also set your `$GOPATH` environment variable to point to your workpsace per the instructions [here](https://golang.org/doc/install). If you have never used Go, it may be a bit confusing how to set up your workspace environment. It is imporant to understand that you must set up the following three directories inside your workspace: `src`, `pkg`, and `bin`. I encourage you to read the [workspace reference](https://golang.org/doc/code.html#Workspaces) to understand how to properly configure your workspace folder and your `$GOPATH`.

### Install Node.js And NPM

You need to install Node.js and NPM in order to run the web application that is provided with this repository. The appication provided here is written in Node.js and uses the [Hyperledger Fabric Client](https://www.npmjs.com/package/hfc) package from NPM.

To install Node.js and NPM, download the appropriate installer from [here](https://nodejs.org/en/download/). Node.js comes with NPM alrady installed, but NPM gets updated more frequently than Node, so you'll want to make sure that it's the latest version by executing the following command.

	sudo npm install npm@latest -g

### Install Docker Toolbox

You need to install Docker Toolbox in order to be able to run the Hyperledger Fabric peer and member services Docker containers on your machine.

To download and install Docker Toolbox, which includes both Docker Engine and Compose, go [here](https://www.docker.com/products/docker-toolbox) and complete the set up process. If you would like a more step-by step guide on how to install Docker Toolbox, the instructions [here](https://getcarina.com/docs/tutorials/docker-install-mac/) are also very helpful.

Once you have installed Docker Toolbox, you should see the following two icons in you Mac's Applications view: (1) Docker Quick Start Terminal and (2) Kinematic (Beta). 

Start up the `default` Docker host by clicking on the Docker Quickstart Terminal.

It will open a new terminal window and initialize the Docker host. Once the startup process is complete, you will see the cute Docker whale together with the IP address of the Docker host. In this example the IP address of the Docker host is `192.168.99.100`. Take note of this IP address as you will need it later to connect to your Docker containers.

```
                        ##         .
                  ## ## ##        ==
               ## ## ## ## ##    ===
           /"""""""""""""""""\___/ ===
      ~~~ {~~ ~~~~ ~~~ ~~~~ ~~~ ~ /  ===- ~~~
           \______ o           __/
             \    \         __/
              \____\_______/


docker is configured to use the default machine with IP 192.168.99.100
For help getting started, check out the docs at https://docs.docker.com
```

## Start A Fabric Network

From the command line of your Docker Quickstart Terminal:

(1) Clone the `fabric-images` repository and set the appropriate environment settings.

	git clone https://github.com/IBM-Blockchain/fabric-images.git
	cd fabric-images/docker-compose
	. setenv.sh

(2) Start either a single peer with membership services network or a four peer with membership services network:

	docker-compose -f single-peer-ca.yaml up
	
or

	docker-compose -f four-peer-ca.yaml up
	
When the network comes up, you should see logging information from the peer nodes on your screen.

The official Dockerhub documentation for these images can be found [here](https://hub.docker.com/r/ibmblockchain/fabric-peer/). That page contains additional information on configuring the network, usage samples, and helpful Docker commands. Definitely check it out when you are ready start working on more complex applications.

## Verify The Fabric Network

Open another Docker Quickstart Terminal by clicking on the Docker Quickstart Terminal icon within your Mac's application view.

(1) Verify the correct number of Docker containers is up.

	docker ps
	
If you started a network with one peer and a CA your output will look similar to this.

```
CONTAINER ID    IMAGE                                                  COMMAND                  CREATED              STATUS              PORTS                                                      NAMES
66bb7d646a09    ibmblockchain/fabric-peer:x86_64-0.6.1-preview         "sh -c 'sleep 10; pee"   About a minute ago   Up About a minute   0.0.0.0:7050-7051->7050-7051/tcp, 0.0.0.0:7053->7053/tcp   dockercompose_vp_1
090884ad0a22    ibmblockchain/fabric-membersrvc:x86_64-0.6.1-preview   "membersrvc"             About a minute ago   Up About a minute   0.0.0.0:7054->7054/tcp                                     dockercompose_membersrvc_1
```

If you started a network with four peers and a CA your output will look similar to this.

```
CONTAINER ID    IMAGE                                                   COMMAND                  CREATED             STATUS              PORTS                                                      NAMES
ee9e96dbc7e0    ibmblockchain/fabric-peer:x86_64-0.6.1-preview          "sh -c 'sleep 10; pee"   19 hours ago    Up 19 hours    0.0.0.0:10050->7050/tcp, 0.0.0.0:10051->7051/tcp, 0.0.0.0:10053->7053/tcp   dockercompose_vp3_1
ff75701f333d    ibmblockchain/fabric-peer:x86_64-0.6.1-preview          "sh -c 'sleep 10; pee"   19 hours ago    Up 19 hours    0.0.0.0:9050->7050/tcp, 0.0.0.0:9051->7051/tcp, 0.0.0.0:9053->7053/tcp      dockercompose_vp2_1
57f6b8596cdf    ibmblockchain/fabric-peer:x86_64-0.6.1-preview          "sh -c 'sleep 10; pee"   19 hours ago    Up 19 hours    0.0.0.0:8050->7050/tcp, 0.0.0.0:8051->7051/tcp, 0.0.0.0:8053->7053/tcp      dockercompose_vp1_1
81afc8905956    ibmblockchain/fabric-peer:x86_64-0.6.1-preview          "sh -c 'sleep 10; pee"   19 hours ago    Up 19 hours    0.0.0.0:7050-7051->7050-7051/tcp, 0.0.0.0:7053->7053/tcp                    dockercompose_vp0_1
635765a03923    ibmblockchain/fabric-membersrvc:x86_64-0.6.1-preview    "membersrvc"             19 hours ago    Up 19 hours    0.0.0.0:7054->7054/tcp                                                      dockercompose_membersrvc_1
```

(2) Confirm that the network is responsive.

From the command line of your Docker Quickstart Terminal or any other terminal:

Send a curl request to the `<docker_host_ip>` that you noted earlier when starting up the Quickstart Terminal. This request targets the default REST interface port on the peer (or one of the four peers in the four peer network).

	curl <docker_host_ip>:7050/chain

In this example, `<docker_host_ip>` is `192.168.99.100`, therefore the request becomes:

	curl 192.168.99.100:7050/chain
	
You should receive a response similar to the one below:

```
{
	"height": 1,
	"currentBlockHash": "RrndKwuojRMjOz/rdD7rJD/NUupiuBuCtQwnZG7Vdi/XXcTd2MDyAMsFAZ1ntZL2/IIcSUeatIZAKS6ss7fEvg=="
}
```
	
You can send a few additional requests to verify functionality. For example, to retrive the only currently existing block in the blockchain (block 0) or to see which peers are part of the network (could be one or four). 
	
Sample output is provided below.
	
```
curl 192.168.99.100:7050/chain/blocks/0

{
	"nonHashData": 
		{
			"localLedgerCommitTimestamp": 
				{
					"seconds": 1477174494,
					"nanos": 134269287
				}
		}
}
```

```
curl 192.168.99.100:7050/network/peers

{
	"peers": 
		[{
			"ID": {"name":"vp0"},
			"address": "172.18.0.2:7051",
			"type": 1,
			"pkiID":"p51Rf5joFU1ZoKqNsLOXe2TQHuVfPMIIiLwEbBOlnOs="
		}]
}
```

## Set Up Chaincode

Now that the Fabric network is up and running, you have to set up your chaincode in an apropriate local directory, so the Node.js [`hfc`](https://www.npmjs.com/package/hfc) module can locate it.

First, you need to clone this repository, as it contains the chaincode that you need.

	git clone https://github.com/angrbrd/hyperledger-fabric-basics.git

Given that our chaincode is written in Go, we follow the Go convention of storing Go code underneath the `$GOPATH/src/` directory. Therefore, move the sample chaincode, `crowd_fund_chaincode`, underneath `$GOPATH/src/` and unzip the `vendor.zip` archive with the following commands. Switch to the root directory of this repository:

	cd hyperledger-fabric-basics
	
followed by:

	cp -r crowd_fund_chaincode $GOPATH/src
	tar -xf $GOPATH/src/crowd_fund_chaincode/vendor.zip -C $GOPATH/src/crowd_fund_chaincode/
	rm $GOPATH/src/crowd_fund_chaincode/vendor.zip
	 
That's it! The chaincode is now ready to be deployed by the application.

## Run The Application

Now that the chaincode has been set up in the appropriate directory, it is time to run the application code. The sample application will enroll an administrative user, `WebAppAdmin`, which is pre-registered with the membership services. Think of this user as a "boot strap user" that is given special priveleges. These privileges allow the `WebAppAdmin` user to register and enroll other new users. Next, the application will dynamically register an enroll a new user, `WebApp_user1` with the help of `WebAppAdmin`. This new user `WebApp_user1` then deploys the chaincode.

In order to run the application, execute the following commands for either the single peer network or the four peer network. Switch to the root directory of this repository:

	cd hyperledger-fabric-basics
	
followed by:

	node crowd_fund_demo.js <docker_host_ip> single-peer
	
or 

	node crowd_fund_demo.js <docker_host_ip> four-peer
	
As in this example `<docker_host_ip>` is `192.168.99.100`, the commands become:

	node crowd_fund_demo.js 192.168.99.100 single-peer
	
or

	node crowd_fund_demo.js 192.168.99.100 four-peer
	
Once you execute one of the commands above, the application will go through its initialization phase, including deploying the chaincode to the network. Then the application will begin listening for requests which will trigger invocations and queries on the chaincode. When you see the output similar to the one below, the chaincode has finished deploying and you are ready to continue!

```
node crowd_fund_demo.js 192.168.99.100 four-peer
Docker Host IP: 192.168.99.100

Setting keyValStore location to: /tmp/keyValStore
Setting membersrvc address to: grpc://192.168.99.100:7054
Adding peer address: grpc://192.168.99.100:7051
Adding peer address: grpc://192.168.99.100:8051
Adding peer address: grpc://192.168.99.100:9051
Adding peer address: grpc://192.168.99.100:10051
Setting eventHubAddr address to: grpc://192.168.99.100:7053

Successfully got WebAppAdmin member.
Successfully enrolled WebAppAdmin member.
Setting WebAppAdmin as chain registrar.
Registering user `WebAppUser_1`.
Successfully registered and enrolled WebApp_user1.

Deploying chaincode now...
Successfully deployed chaincode: request={"chaincodePath":"crowd_fund_chaincode","fcn":"init","args":["account","0"]}, response={"uuid":"8ac966d9afd117022582b6a8ae15a99837d923c579bab289e02fffcfa3d68ad1","chaincodeID":"8ac966d9afd117022582b6a8ae15a99837d923c579bab289e02fffcfa3d68ad1"}

Starting WebApp on port 3000
WebApp is now listening on port 3000
```  

## Hook Up Front End

Now that the chaincode is ready to receive transactions, you can start up the client side code in your browser and give it a try. The front end of this sample is extremely simple and exists only for the purpose of explaining how the entire application fits together.

To trigger transations from the web application front end, simply open the `index.html` file at the root of this repository in your browser by double clicking it. The application presented here is a crowd funding application, where users can add more money to an account by sending a transaction. You can see the current value of the account by clicking the `Get Account Value` button and you can deposit more funds into the account by specifying the amount and clicking `Donate`. Give it a try and you will observe that as you add more money to the account, the account value increases accordingly. And now it is recorded on your local blockchain. How cool is that :-D! To convince yourself that you are actually sending transactions when you click the buttons, take a look at the console output of your application, which will show a new message every time yout trigger an invoke or a query.

```
Successfully submitted chaincode invoke transaction: request={"chaincodeID":"a657eb0787d4622b46a93ba4d16731dbea7facaab016740679f9ca9d5486e841","fcn":"invoke","args":["account","50"]}, response={"uuid":"1b0387ac-d32a-4a57-a2eb-9b508c34d3f0"}
Successfully queried existing chaincode state: request={"chaincodeID":"a657eb0787d4622b46a93ba4d16731dbea7facaab016740679f9ca9d5486e841","fcn":"query","args":["account"]}, response={"result":{"type":"Buffer","data":[51,48,48]}}, value=300
```

Also, you may once again use the peer REST interface to query the `/chain` endpoint. You will observe that the block height will continue to increase with every invoke transaction. (Query transactions do not modify chaincode state and therefore do not get recorded on the blockchain.

```
curl 192.168.99.100:7050/chain

{
  "height": 5,
  "currentBlockHash": "0JdJ94OPYwQnitPaMzUG1jpvuhdBSF/ueNJJ6t4rDJNKYp0kvwJhMiEzXEWerBigrHdQ5Uo4L2V6f0WT/gnuPA==",
  "previousBlockHash": "QSiwvarJFsNTQr5vGIwTNamnVAqf/qZE+lxILs8/l2kMBvTVru9LLYh09WCBDgdwormREhC0PgA8VjwlZKOPEg=="
}
```

## Get Creative!

Now it's your turn! Do you have a cool idea that you'd like to prototype as a chaincode (smart contract)? If so, just start modifying the existing chaincode sample and get going! The sample is now located in your `$GOPATH/src/crowd_fund_chaincode` directory on your machine.

While thinking of other cool ideas you may want to stop and tear down your network. You would also need to do that if you want to switch from the single peer to the four peer network or if you just run into trouble with the network and need to start over. In that case, use the following commands:

	docker stop $(docker ps -a -q)
	docker rm -f $(docker ps -aq)
	
Then restart the Fabric network as described in an [earlier section](#start-a-fabric-network).

## Need Help?

If these instructions have been helpful in getting you off the ground, great! If you're still hitting some snags, feel free to reach out to me on [Hyperledger Slack](https://hyperledgerproject.slack.com/). My handle is `@anya`. You can also open an issue in this repository to let me know that you found a problem. Oh, and by the way, the entire Hyperledger community is very helpful getting people started with Hyperledger Fabric. So you may join the appropriate channels on Slack and ask your questions!

**Happy Building!**
