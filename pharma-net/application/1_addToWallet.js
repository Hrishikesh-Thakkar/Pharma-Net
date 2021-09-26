'use strict';

const fs = require('fs'); // FileSystem Library
const { FileSystemWallet, X509WalletMixin } = require('fabric-network'); // Wallet Library provided by Fabric
const path = require('path'); // Support library to build filesystem paths in NodeJs

const crypto_materials = path.resolve(__dirname, '../network/crypto-config'); // Directory where all Network artifacts are stored

async function main(certificatePath, privateKeyPath,organization) {

    var identityMaterial = getIdentityBasedOnOrganization(organization);

    var wallet = new FileSystemWallet(identityMaterial.walletPath);
	// Main try/catch block
	try {

		// Fetch the credentials from our previously generated Crypto Materials required to create this user's identity
		const certificate = fs.readFileSync(certificatePath).toString();
		// IMPORTANT: Change the private key name to the key generated on your computer
		const privatekey = fs.readFileSync(privateKeyPath).toString();

		// Load credentials into wallet
		const identityLabel = identityMaterial.identityLabel;
		const identity = X509WalletMixin.createIdentity(identityMaterial.msp, certificate, privatekey);

		await wallet.import(identityLabel, identity);

	} catch (error) {
		console.log(`Error adding to wallet. ${error}`);
		console.log(error.stack);
		throw new Error(error);
	}
}


function getIdentityBasedOnOrganization(organization){
    var identityMaterial = {
        walletPath : "",
        identityLabel : "",
        msp: ""
    }
    if(organization == "Manufacturer"){
        identityMaterial.walletPath = './identity/manufacturer';
        identityMaterial.identityLabel = 'MANUFACTURER_ADMIN';
        identityMaterial.msp = 'manufacturerMSP';
    }
    else if(organization == "Distributor"){
        identityMaterial.walletPath = './identity/distributor';
        identityMaterial.identityLabel = 'DISTRIBUTOR_ADMIN';
        identityMaterial.msp = 'distributorMSP';
    }
    else if(organization == "Retailer"){
        identityMaterial.walletPath = './identity/retailer';
        identityMaterial.identityLabel = 'RETAILER_ADMIN';
        identityMaterial.msp = 'retailerMSP';
    }
    else if(organization == "Consumer"){
        identityMaterial.walletPath = './identity/consumer';
        identityMaterial.identityLabel = 'CONSUMER_ADMIN';
        identityMaterial.msp = 'consumerMSP';
    }
    else if(organization == "Transporter"){
        identityMaterial.walletPath = './identity/transporter';
        identityMaterial.identityLabel = 'TRANSPORTER_ADMIN';
        identityMaterial.msp = 'transporterMSP';
    }
    else{
        throw new Error("Invalid organization provided");
    }

    return identityMaterial;
}

/*main(
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/manufacturer.pharma-network.com/users/Admin@manufacturer.pharma-network.com/msp/signcerts/Admin@manufacturer.pharma-network.com-cert.pem',
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/manufacturer.pharma-network.com/users/Admin@manufacturer.pharma-network.com/msp/keystore/bc49fd37498f696e18ac7c1dd535b0bc0a674c3f9fa7301dc8ca4a4fea5f9e3f_sk',
    'Manufacturer')
 .then(() => {
  console.log('User identity added to wallet.');
});*/

/*main(
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/distributor.pharma-network.com/users/Admin@distributor.pharma-network.com/msp/signcerts/Admin@distributor.pharma-network.com-cert.pem',
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/distributor.pharma-network.com/users/Admin@distributor.pharma-network.com/msp/keystore/050f3c7f08c816b981019a02ecb04ac69e8938c06f9fe48dc52a10b387528289_sk',
    'Distributor')
 .then(() => {
  console.log('User identity added to wallet.');
});*/

/*main(
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/retailer.pharma-network.com/users/Admin@retailer.pharma-network.com/msp/signcerts/Admin@retailer.pharma-network.com-cert.pem',
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/retailer.pharma-network.com/users/Admin@retailer.pharma-network.com/msp/keystore/3a1ee9fdad5d389dd0e7a55eb59f57d6eec631620b95cbb48c3cb262cfc46921_sk',
    'Retailer')
 .then(() => {
  console.log('User identity added to wallet.');
});*/

/*main(
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/consumer.pharma-network.com/users/Admin@consumer.pharma-network.com/msp/signcerts/Admin@consumer.pharma-network.com-cert.pem',
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/consumer.pharma-network.com/users/Admin@consumer.pharma-network.com/msp/keystore/54303a3b4922ec7c239a72e6800db37d8ab38bd88ca69275c3ae15e53f8f13ae_sk',
    'Consumer')
 .then(() => {
  console.log('User identity added to wallet.');
});*/

/*main(
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/transporter.pharma-network.com/users/Admin@transporter.pharma-network.com/msp/signcerts/Admin@transporter.pharma-network.com-cert.pem',
    '/home/upgrad/workspace/pharmachain/network/crypto-config/peerOrganizations/transporter.pharma-network.com/users/Admin@transporter.pharma-network.com/msp/keystore/7109a11a9f4acab293cb5f30471777f3fb1d37896293984e420f9abc42f23143_sk',
    'Transporter')
 .then(() => {
  console.log('User identity added to wallet.');
});*/

module.exports.execute = main;
