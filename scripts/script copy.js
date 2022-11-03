const {ethers, waffle, network} = require("hardhat");
const config = require("../config");
const tokenAbi = require("../tokenAbi.json");
const uniswapAbi = require("../uniswapAbi.json");
const { Console } = require('node:console');
const { Transform } = require('node:stream');
const ts = new Transform({ transform(chunk, enc, cb) { cb(null, chunk) } })
const logger = new Console({ stdout: ts })
function getTable (data) {
	logger.table(data)
	return (ts.read() || '').toString()
}

const deploy = async (contractName, oData) => {
    const RJSscript = await ethers.getContractFactory(contractName);
    const RJS = await RJSscript.deploy(oData);
    await RJS.deployed();
    console.log(contractName, " is deployed to:", RJS.address);
    return RJS;
}

const getSigner = async (from) => {
	await network.provider.request({
		method: "hardhat_impersonateAccount",
		params: [from]
	});
	return await ethers.getSigner(from);
}

const reduceAddy = (addy, labels) => {
	if(labels) {
		for(var key in labels) {
			if(addy.substring(26) == key.substring(2).toLowerCase()) return labels[key];
		}
	}
  	return "0x" + addy.substring(26);
}

function decodeMessage(code) {
	try {
		const rlt = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + code.substring(10));
		return rlt[0];
	} catch(err) {
		return "";
	}
}

async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const totalPrint = {}, errs = [];

async function main() {
	for(var i = 0; i < config.setBlances.length; i ++) {
		await waffle.provider.send("hardhat_setBalance", [
			config.setBlances[i].address,
			ethers.utils.parseEther(config.setBlances[i].value).toHexString(),
		]);
		console.log("eth balance of ", config.setBlances[i].address, " ", ethers.utils.formatEther(await waffle.provider.getBalance(config.setBlances[i].address)));
	}

	const tokenContract = new ethers.Contract(config.tokenAddy, tokenAbi, waffle.provider);
	const totalSupply = await tokenContract.totalSupply();
	const tokenOwner = await tokenContract.owner();
	console.log("totalSupply", totalSupply.toString());

	const uniswapAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";	
	const iface = new ethers.utils.Interface(tokenAbi);
	const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
	console.log("=================================================================");

	let nextBlockNumber = config.blockNumber + 1;
	totalPrint[nextBlockNumber] = [];
	for(var i = 0; i < config.simulates.length; i ++) {
		const op = config.simulates[i];
		let txData = {}, signer;
		if(op.block_jump) {
			await network.provider.send("hardhat_mine", ["0x" + op.block_jump.toString(16)]);
			totalPrint[++nextBlockNumber] = [];
			await sleep(1500);
			console.log("=================================================================");
			continue;
		} else if(op.op_type == "addliquidity") {
			const from = op.from ? op.from: tokenOwner;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000): ethers.BigNumber.from(op.token_amount);
			const ethAmount = ethers.utils.parseEther(op.eth_amount.toString());
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			txData = await uniswapContract.populateTransaction.addLiquidityETH(config.tokenAddy, tokenAmount, 0, 0, from, Date.now() + 10 * 60 * 1000);
			signer = await getSigner(from);
			txData.value = ethAmount;
		} else if(op.op_type == "approve") {
			const from = op.from ? op.from: tokenOwner;
			txData = await tokenContract.populateTransaction.approve(op.router || uniswapAddy, ethers.constants.MaxUint256);
			signer = await getSigner(from);
		} else if(op.op_type == "limitbuy") {
			const from = op.from;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000): ethers.BigNumber.from(op.token_amount);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			txData = await uniswapContract.populateTransaction.swapETHForExactTokens(tokenAmount, [WETH, config.tokenAddy], from, Date.now() + 10 * 60 * 1000);
			signer = await getSigner(from);
			txData.value = ethers.utils.parseEther(op.eth_amount_max);
		} else if(op.op_type == "fomobuy") {
			const from = op.from;
			const ethAmount = ethers.utils.parseEther(op.eth_amount);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			txData = await uniswapContract.populateTransaction.swapExactETHForTokens(0, [WETH, config.tokenAddy], from, Date.now() + 10 * 60 * 1000);
			signer = await getSigner(from);
			txData.value = ethAmount;
		} else if(op.op_type == "sell") {
			const from = op.from;
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			const tokenAmount = await tokenContract.balanceOf(from);
			txData = await uniswapContract.populateTransaction.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenAmount, 0, [config.tokenAddy, WETH], from, Date.now() + 10 * 60 * 1000);
			signer = await getSigner(from);
		} else if(op.op_type == "function_call") {
			const from = op.from ? op.from: tokenOwner;
			txData.data = iface.encodeFunctionData(op.function, op.params);
			txData.to = config.tokenAddy;
			if(iface.getFunction(op.function).stateMutability == "view") {
				const rlt = await waffle.provider.call({
					...txData
				}).catch(err => {
					console.log(op.op_type, err.code + " " + err.reason + " " + err.method);
				});
				if(!rlt) continue;
				console.log("read", txData, rlt);
				continue;
			}
			signer = await getSigner(from);
		} else {
			const from = op.from ? op.from: tokenOwner;
			txData = {
				data: op.data,
				to: op.to,
				value: op.value
			}
			signer = await getSigner(from);
		}

		const tx = await signer.sendTransaction({
			...txData,
			gasLimit: op.gasLimit || null
		}).catch(err => {
			errs.push({
				from: err.transaction.from,
				to: err.transaction.to,
				data: err.transaction.data.substring(0, 10),
				code: err.code,
				method: err.method,
				reason: err.reason,
			})
		});
		
		const labels = {}
		labels[signer.address] = "from_address";
		if(op.op_type == "addliqidity" || op.op_type == "limitbuy" || op.op_type == "fomobuy" || op.op_type == "sell") {
			labels[txData.to] = "router_address";
		} else if(op.op_type == "approve" || op.op_type == "function_call") {
			labels[txData.to] = "token_address";
		} else {
			labels[txData.to] = "to_address";
		}
		// if(tx)
		// tx.wait().then(receipt => {
		// 	totalPrint[receipt.blockNumber][receipt.transactionIndex] = "blockNumber " + receipt.blockNumber + " transactionIndex " + receipt.transactionIndex + " gasUsed " + receipt.gasUsed.toString();
		// 	const transfers = receipt.logs.filter(log => {
		// 		if(log.topics.length == 3 && log.topics[0] == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") {
		// 			labels[log.address] = "pair_address";
		// 		}
		// 		return log.topics.length >= 1 && log.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
		// 	}).map(log => {
		// 		if(log.topics.length == 4) {
		// 			return {
		// 				type: "ERC721",
		// 				address: log.address,
		// 				from: reduceAddy(log.topics[1]),
		// 				to: reduceAddy(log.topics[2]),
		// 				tokenId: parseInt(log.topics[3], 16)
		// 			}
		// 		}
		// 		if(log.topics.length == 3) {
		// 			if(log.address == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
		// 				return {
		// 					type: "ERC20",
		// 					address: "WETH",
		// 					from: reduceAddy(log.topics[1], labels), 
		// 					to: reduceAddy(log.topics[2], labels),
		// 					amount: ethers.utils.formatEther(log.data) + " eth"
		// 				}
		// 			}
		// 			if(log.address.toLowerCase() == config.tokenAddy.toLowerCase()) {
		// 				return {
		// 					type: "ERC20",
		// 					address: "TargetToken",
		// 					from: reduceAddy(log.topics[1], labels), 
		// 					to: reduceAddy(log.topics[2], labels),
		// 					amount: (ethers.BigNumber.from(log.data).mul(100000).div(totalSupply) / 1000) + "% " + ethers.BigNumber.from(log.data).toString()
		// 				}
		// 			}
		// 			return {
		// 				type: "ERC20",
		// 				address: log.address,
		// 				from: reduceAddy(log.topics[1], labels), 
		// 				to: reduceAddy(log.topics[2], labels),
		// 				amount: ethers.BigNumber.from(log.data).toString()
		// 			}
		// 		}
		// 	});
		// 	if(transfers.length > 0) totalPrint[receipt.blockNumber][receipt.transactionIndex] += "\n" + getTable(transfers);
		// }).catch(async (err) => {
		// 	const callResult = await signer.call({
		// 		...txData
		// 	});
		// 	const msg = decodeMessage(callResult);
		// 	totalPrint[err.receipt.blockNumber][err.receipt.transactionIndex] = "blockNumber " + err.receipt.blockNumber + " transactionIndex " + err.receipt.transactionIndex + " gasUsed " + err.receipt.gasUsed.toString();
		// 	if(msg == "" || callResult == "0x") {
		// 		totalPrint[err.receipt.blockNumber][err.receipt.transactionIndex] += " " + op.op_type + " " + err.code + " " + err.reason;
		// 	} else {
		// 		totalPrint[err.receipt.blockNumber][err.receipt.transactionIndex] += " " + op.op_type + " " + msg;
		// 	}
		// });
	}

	await network.provider.send("hardhat_mine");
	await sleep(1500);
	console.log("=================================================================");
	console.table(errs);
	for(var i = config.blockNumber + 1; i <= nextBlockNumber; i ++) {
		const block = await waffle.provider.getBlock(i);
		const receipts = [];
		for(var j = 0; j < block.transactions.length; j ++) {
			const receipt = await waffle.provider.getTransactionReceipt(block.transactions[j]);
			// console.log(receipt);
			try{
				receipts.push({
					blockNumber: receipt.blockNumber, 
					transactionIndex: receipt.transactionIndex,
					gasUsed: receipt.gasUsed.toString(),
					transactionFee: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
					status: receipt.status == 0? "failed": ""
				});
			} catch(err) {
				console.log(err, receipt);
			}
			
		}
		console.table(receipts);
	}
}

main()
	// .then(() => process.exit(0))
	// .catch((error) => {
	// 	console.error(error);
	// 	process.exit(1);
	// });