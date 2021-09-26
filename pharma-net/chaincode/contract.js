'use strict';

const {Contract} = require('fabric-contract-api');

class PharmanetContract extends Contract {
	constructor() {
		// Provide a custom name to refer to this smart contract
        super('org.pharma-network.pharmanet');
	}

	async instantiate(ctx) {
		console.log('Pharmanet Smart Contract Instantiated');
    }

    /**
	 * Create a new Company account on the network
	 * @param ctx - The transaction context object
	 * @param companyCRN - ID to be used for creating a new student account
	 * @param name - Name of the company
	 * @param location - Location of the company
	 * @param organisationRole - The organisation role which the company has e.g Manufacturer, Distributor, Retailer, Transporter
	 * @returns Company
	 */
	async registerCompany(ctx, companyCRN, companyName, location, organisationRole) {
		const companyKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.company', [companyCRN,companyName]);
		const hierarchyId = this.getCompanyHierarchyId(organisationRole);
		let newCompanyObject = {
			companyID: companyKey,
			name: companyName,
			location: location,
			organisationRole: organisationRole,
			hierarchyKey: hierarchyId
		};
		let dataBuffer = Buffer.from(JSON.stringify(newCompanyObject));
		await ctx.stub.putState(companyKey,dataBuffer);
		return newCompanyObject;
	}

	/** Adding a Drug to the network
	 * @param ctx - The Transaction Context Object
	 * @param drugName - Drug Name for new Drug
	 * @param serialNo - Incrementing Serial Number
	 * @param mfgData - Date of Manufacturing
	 * @param expDate - Expiration Date
	 * @param companyCRN - Company ID Manufacturing the Drug
	 * @returns Drug
	 */
	async addDrug(ctx, drugName, serialNo, mfgDate, expDate, companyCRN){
		let manufacturerOrg = "manufacturer.pharma-network.com";
        this.validateInitiator(ctx,manufacturerOrg);

        const productKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product', [drugName,serialNo]);

        let iterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [companyCRN]);
        let manufacturerResults = await this.getAllResults(iterator);

        let newProductObject = {
            productID : productKey,
            name : drugName,
            manufacturer : manufacturerResults[0].companyID,
            manufacturingDate : mfgDate,
            expiryDate : expDate,
            owner : manufacturerResults[0].companyID,
            shipment : []
        };

        let dataBuffer = Buffer.from(JSON.stringify(newProductObject));
        await ctx.stub.putState(productKey,dataBuffer);
        return newProductObject;
	}

	/** Creates Purchase Order to be sent
	 * @param ctx - Transaction Context
	 * @param buyerCRN - Registration Number of Buyer
	 * @param sellerCRN - Registration Number of Sellet
	 * @param drugName - Drug Name to be purchased
	 * @param quantity - Quantity of drugs purchased
	 * @returns Purchase Order
	 */
	async createPO(ctx, buyerCRN, sellerCRN, drugName, quantity){
		const initiatorID = ctx.clientIdentity.getX509Certificate();
        if(initiatorID.issuer.organizationName.trim() === "distributor.pharma-network.com" || initiatorID.issuer.organizationName.trim() === "retailer.pharma-network.com"  ){
         	let buyerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [buyerCRN]);
        	let buyerResults = await this.getAllResults(buyerIterator);
        	let sellerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [sellerCRN]);
        	let sellerResults = await this.getAllResults(sellerIterator);
        	const poKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.purchaseOrder',[buyerCRN, drugName]);

        	if(buyerResults[0].hierarchyKey - sellerResults[0].hierarchyKey !== 1){
        		throw new Error("Illegal Operation");
        	}

        	let drugIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.product', [drugName]);
        	let drugResults = await this.getAllResults(drugIterator);

					//Check how many drugs belong to the seller with the name
					let validDrugs = 0;
					for(let i=0; i<drugResults.length; i++){
						if(drugResults[i].owner === sellerResults[0].companyID){
	        		validDrugs++;
	        	}
					}

        	if(validDrugs-quantity < 0){
        		throw new Error("Seller does not own enough drugs");
        	}

        	let newPurchaseOrderObj = {
                poID : poKey,
                drugName : drugName,
                quantity : quantity,
                buyer : buyerResults[0].companyID,
                seller : sellerResults[0].companyID,
                createdAt : new Date()
            };

            let dataBuffer = Buffer.from(JSON.stringify(newPurchaseOrderObj));
            await ctx.stub.putState(poKey,dataBuffer);
            return newPurchaseOrderObj;
        } else {
        	throw new Error("Cannot Access this request");
        }
	}

	/** Creates Shipment to be delivered
	 * @param ctx - Transaction Context
	 * @param buyerCRN - Buyer Registration Number
	 * @param drugName - Drug Name to be shipped
	 * @param listOfAssets - Drug list to be shipped
	 * @param transporterCRN - Transaction Registration Number
	 * @returns Shipment
	 */
	async createShipment(ctx, buyerCRN, drugName, listOfAssets, transporterCRN){

		listOfAssets = listOfAssets.split(',');

		const poKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.purchaseOrder', [buyerCRN, drugName]);
		let poBuffer = await ctx.stub.getState(poKey).catch(err => console.log(err));

		let poObject = JSON.parse(poBuffer.toString());
		if(poObject === undefined || poObject === null){
			throw new Error('Purchase Order does not exist');
		}

		let transporterIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [transporterCRN]);
    let transporterResults = await this.getAllResults(transporterIterator);

    let buyerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [buyerCRN]);
    let buyerResults = await this.getAllResults(buyerIterator);

    if(parseInt(poObject.quantity) !== listOfAssets.length){
    	throw new Error("Purchase Order is not valid");
    }

    await this.validateAssets(ctx, listOfAssets);

    let shipmentKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.shipment', [buyerCRN, drugName]);
    let newShipmentObject = {
    	shipmentID: shipmentKey,
    	creator: poObject.seller,
    	assets: listOfAssets,
    	transporter: transporterResults[0].companyID,
    	status: "in-transit"
    };

    let dataBuffer = Buffer.from(JSON.stringify(newShipmentObject));
    await ctx.stub.putState(shipmentKey,dataBuffer);

    return newShipmentObject;
	}

	/** Updates Shipment on Delivery
	 * @param ctx - Transaction Context
	 * @param buyerCRN - Buyer Registration Number
	 * @param drugName - Drug Name to be shipped
	 * @param transporterCRN - Transaction Registration Number
	 * @returns Shipment Updated
	 */
	async updateShipment(ctx, buyerCRN, drugName, transporterCRN){
		let shipmentKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.shipment',[buyerCRN,drugName]);
		let shipmentBuffer= await ctx.stub.getState(shipmentKey).catch(err => console.log(err));
		let shipmentObject= JSON.parse(shipmentBuffer.toString());

		let transporterIterator =  await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [transporterCRN]);
		let transporterResults = await this.getAllResults(transporterIterator);

		let buyerIterator =  await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company', [buyerCRN]);
    let buyerResults = await this.getAllResults(buyerIterator);

		if(shipmentObject.transporter === transporterResults[0].companyID){

			let newShipmentObj = {
				shipmentID : shipmentKey,
				creator : shipmentObject.creator,
				assets : shipmentObject.assets,
				transporter : transporterResults[0].companyID,
				status : "delivered",
			};
			let dataBuffer = Buffer.from(JSON.stringify(newShipmentObj));
			await ctx.stub.putState(shipmentKey,dataBuffer);
			await this.updateAssetOwners(ctx, shipmentObject.assets, buyerResults[0].companyID, newShipmentObj);
			return newShipmentObj;
		}
		else{
			throw new Error('Not authorized to initiate the transaction: Transporter not authorised to initiate this transaction');
		}
	}

	/** Consumer Purchases Drug
	 * @param ctx - Transaction Context
	 * @param drugName - Name of the drug retailed
	 * @param serialNo - Serial Number of selected Drug
	 * @param retailerCRN - Retailer Registration Number
	 * @param customerAadhar - Aadhar of buyer
	 * @returns Product Purchased
	 */
	async retailDrug(ctx, drugName, serialNo, retailerCRN, customerAadhar){
		let retailerOrg = "retailer.pharma-network.com";
		this.validateInitiator(ctx,retailerOrg);

		const productKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product',[drugName, serialNo]);
		let productBuffer = await ctx.stub.getState(productKey).catch(err => console.log(err));
		let productObject = JSON.parse(productBuffer.toString());

		let retailerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.com.pharmanet.company',[retailerCRN]);
		let retailerResults = await this.getAllResults(retailerIterator);

		if(retailerResults[0].companyID !== productObject.owner){
			throw new Error("Not the owner of the drug");
		}
		productObject.owner = customerAadhar;

		let dataBuffer = Buffer.from(JSON.stringify(productObject));
		await ctx.stub.putState(productKey,dataBuffer);
		return productObject;
	}

	/** Shows all the history of the product
	 * @param ctx - Transaction Context
	 * @param drugName - Drug to be searched
	 * @param serialNo - Serial No of drug
	 * @returns history
	 */
	async viewHistory(ctx, drugName, serialNo){
		const productKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product',[drugName,serialNo]);
		const historyIterator = await ctx.stub.getHistoryForKey(productKey).catch(err => console.log(err));
    let result = [];
    let res = await historyIterator.next();
    while (!res.done) {
      if (res.value) {
        console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
        const obj = JSON.parse(res.value.value.toString('utf8'));
        result.push(obj);
      }
      res = await historyIterator.next();
    }
    await historyIterator.close();
    return result;
	}

	/** Checks the current state of the Drug
	 * @param ctx - Transaction Context
	 * @param drugName - Drug to be searched
	 * @param serialNo - Serial No of drug
	 * @returns Current State of Drug
	 */
	async viewDrugCurrentState(ctx, drugName, serialNo) {
		const productKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product',[drugName,serialNo]);

		let productBuffer= await ctx.stub.getState(productKey).catch(err => console.log(err));
		let productObject= JSON.parse(productBuffer.toString());
		return productObject;
  }

//Get Company Hierarchy ID
	getCompanyHierarchyId(organisationRole){
        let organisationRoles = ["Manufacturer","Distributor","Retailer"];
        if(organisationRoles.indexOf(organisationRole) != -1)
            return organisationRoles.indexOf(organisationRole) + 1;
        else
            return -1;
    }

//Validates the initiator of the transaction
    validateInitiator(ctx, initiator){
		const initiatorID = ctx.clientIdentity.getX509Certificate();
		console.log(initiator);
		if(initiatorID.issuer.organizationName.trim() !== initiator){
			throw new Error('Not authorized to initiate the transaction: ' + initiatorID.issuer.organizationName + ' not authorised to initiate this transaction');
		}
	}

//This checks if all the assets exist.
	async validateAssets(ctx, listOfAssets){
        for(let i=0;i<listOfAssets.length;i++){
            let drugName = listOfAssets[i].split('|')[0].toString();
            let serialNo = listOfAssets[i].split('|')[1].toString();
            let drugCompositeKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product',[drugName,serialNo]);
            let drugBuffer = await ctx.stub.getState(drugCompositeKey).catch(err => console.log(err));
            let drugObj= JSON.parse(drugBuffer.toString());
            if(drugObj.productID == undefined || drugObj.productID == null){
                throw new Error('Invalid transaction : Incorrect asset list provided. Please check the assets info provided.');
            }
        }
    }

	//This iterates over all the drugs and updates the owner to the buyer
	 async updateAssetOwners(ctx, listOfAssets, buyerId, shipmentObject){
        for(let i=0;i<listOfAssets.length;i++){
            let drugName = listOfAssets[i].split('|')[0].toString();
            let serialNo = listOfAssets[i].split('|')[1].toString();
            let drugCompositeKey = ctx.stub.createCompositeKey('org.pharma-network.com.pharmanet.product',[drugName,serialNo]);
            let drugBuffer = await ctx.stub.getState(drugCompositeKey).catch(err => console.log(err));
            let drugObj= JSON.parse(drugBuffer.toString());
            drugObj.owner =  shipmentObject.status === "in-transit" ? shipmentObject.transporter : buyerId;
            drugObj.shipment.push(shipmentObject.shipmentID);
            let dataBuffer = Buffer.from(JSON.stringify(drugObj));
            await ctx.stub.putState(drugCompositeKey, dataBuffer);
        }
    }

//This returns the array of where the iterator is at
	async getAllResults(iterator) {
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value) {
                // if not a getHistoryForKey iterator then key is contained in res.value.key
                allResults.push(JSON.parse(res.value.value.toString('utf8')));
            }
            if (res.done) {
                await iterator.close();
                if(allResults.length === 0){
                	throw new Error("Not Found");
                }
                return allResults;
            }
        }
	}
}

module.exports = PharmanetContract;
