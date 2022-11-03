const {ethers, waffle, network} = require("hardhat");
const config = require("../config");
const tokenAbi = require("../tokenAbi.json");
const uniswapAbi = require("../uniswapAbi.json");
config.blockNumber = eval(config.blockNumber);
const getSigner = async (from) => {
	await network.provider.request({
		method: "hardhat_impersonateAccount",
		params: [from]
	});
	return await ethers.getSigner(from);
}

const hexLabels = {};
const reduceData = (hex) => {
	if(hex == "0x095ea7b3") return "approve";
	if(hex == "0xf305d719") return "addLiquidityETH";
	if(hex == "0xfb3bdb41") return "swapETHForExactTokens";
	if(hex == "0x7ff36ab5") return "swapExactETHForTokens";
	if(hex == "0x791ac947") return "swapExactTokensForETHSupportingFeeOnTransferTokens";
	if(hex == "0xe8e33700") return "addLiquidity";
	if(hex == "0x38ed1739") return "swapExactTokensForTokens"
	if(hex == "0x8803dbee") return "swapTokensForExactTokens"
	if(hex == "0x5c11d795") return "swapExactTokensForTokensSupportingFeeOnTransferTokens"
	if(hexLabels[hex]) return hexLabels[hex];
	return hex;
}
function decodeMessage(code) {
	try {
		const rlt = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + code.substring(10));
		return rlt[0];
	} catch(err) {
		return "";
	}
}
const reduceAddy = (addy, labels) => {
	if(labels) {
		for(var key in labels) {
			if(addy.length == 66 && addy.substring(26) == key.substring(2).toLowerCase()) return labels[key];
			if(addy.length == 42 && addy.substring(2).toLowerCase() == key.substring(2).toLowerCase()) return labels[key];
		}
	}
  	return addy.length == 66 ? "0x" + addy.substring(26): "0x" + addy.substring(2).toLowerCase();
}
async function main() {
	const txPrepares = {};
	let nextBlockNumber = config.blockNumber + 1;
	txPrepares[nextBlockNumber] = [];
	const labels = {}

	for(var i = 0; i < config.setBlances.length; i ++) {
		await waffle.provider.send("hardhat_setBalance", [
			config.setBlances[i].address,
			ethers.utils.hexValue(ethers.utils.parseEther(config.setBlances[i].value)),
		]);
		console.log("eth balance of ", config.setBlances[i].address, " ",ethers.utils.parseEther(config.setBlances[i].value), ethers.utils.formatEther(await waffle.provider.getBalance(config.setBlances[i].address)));
	}

	const tokenContract = new ethers.Contract(config.tokenAddy, tokenAbi, waffle.provider);
	const totalSupply = await tokenContract.totalSupply();
	const tokenOwner = await tokenContract.owner().catch(err => {

	});
	const decimals = await tokenContract.decimals();
	if(tokenOwner) labels[tokenOwner] = "owner";
	console.log("totalSupply", totalSupply.toString(), "decimals", decimals);
	const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
	if(!config.quoteTokenAddy) config.quoteTokenAddy = WETH;
	let quote_decimals = 18;
	labels[WETH.toLowerCase()] = "WETH";
	const quoteContract = new ethers.Contract(config.quoteTokenAddy, [
		"function decimals() external view returns (uint8)",
		"function approve(address owner, uint amount) external returns (bool)"
	], waffle.provider);
	if(config.quoteTokenAddy != WETH) {
		labels[config.quoteTokenAddy.toLowerCase()] = "QuoteToken";
		quote_decimals = await quoteContract.decimals();
		console.log("quote decimals", quote_decimals);
	}
	const uniswapAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";	
	const iface = new ethers.utils.Interface(tokenAbi);
	
	console.log("=================================================================");
	
	for(var i = 0; i < config.simulates.length; i ++) {
		const op = config.simulates[i];
		let txData = {};
		if(op.op_type=="blockjump") {
			for(var j = 0; j < op.blockjump; j ++)
				txPrepares[++nextBlockNumber] = [];
			continue;
		}  else if(op.op_type == "quote_approve") {
			const from = op.from ? op.from: tokenOwner;
			txData = await quoteContract.populateTransaction.approve(op.router || uniswapAddy, ethers.constants.MaxUint256);
			txData.from = from;
		}else if(op.op_type == "addliquidity") {
			const from = op.from ? op.from: tokenOwner;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000): ethers.utils.parseUnits(op.token_amount.toString(), decimals);
			const ethAmount = ethers.utils.parseUnits(op.eth_amount.toString(), quote_decimals);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			if(config.quoteTokenAddy == WETH) {
				txData = await uniswapContract.populateTransaction.addLiquidityETH(config.tokenAddy, tokenAmount, 0, 0, from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				txData.value = ethAmount;
			} else {
				txData = await uniswapContract.populateTransaction.addLiquidity(config.quoteTokenAddy, config.tokenAddy, ethAmount, tokenAmount, 0, 0, from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
			}
			txData.from = from;
		} else if(op.op_type == "approve") {
			const from = op.from ? op.from: tokenOwner;
			txData = await tokenContract.populateTransaction.approve(op.router || uniswapAddy, ethers.constants.MaxUint256);
			txData.from = from;
		} else if(op.op_type == "limitbuy") {
			const from = op.from;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000): ethers.utils.parseUnits(op.token_amount, decimals);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			if(config.quoteTokenAddy == WETH) {
				txData = await uniswapContract.populateTransaction.swapETHForExactTokens(tokenAmount, [WETH, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				txData.value = ethers.utils.parseEther(op.eth_amount_max);
			} else {
				txData = await uniswapContract.populateTransaction.swapTokensForExactTokens(tokenAmount, ethers.utils.parseUnits(op.eth_amount_max, quote_decimals), [config.quoteTokenAddy, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
			}
			txData.from = from;
		} else if(op.op_type == "fomobuy") {
			const from = op.from;
			const ethAmount = ethers.utils.parseUnits(op.eth_amount, quote_decimals);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			if(config.quoteTokenAddy == WETH) {
				txData = await uniswapContract.populateTransaction.swapExactETHForTokens(0, [WETH, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				txData.value = ethAmount;
			} else {
				txData = await uniswapContract.populateTransaction.swapExactTokensForTokens(ethAmount, 0, [config.quoteTokenAddy, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				console.log(txData);
			}
			txData.from = from;
		} else if(op.op_type == "sell") {
			const from = op.from;
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000): ethers.utils.parseUnits(op.token_amount, decimals);
			if(config.quoteTokenAddy == WETH) {
				txData = await uniswapContract.populateTransaction.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenAmount, 0, [config.tokenAddy, WETH], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
			} else {
				txData = await uniswapContract.populateTransaction.swapExactTokensForTokensSupportingFeeOnTransferTokens(tokenAmount, 0, [config.tokenAddy, config.quoteTokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
			}
			txData.from = from;
		} else if(op.op_type == "function_call") {
			const from = op.from ? op.from: tokenOwner;
			console.log(op.params,"parmas")
			op.params = JSON.parse(op.params)
			txData.data = iface.encodeFunctionData(op.function, op.params);
			txData.to = config.tokenAddy;
			if(iface.getFunction(op.function).stateMutability == "view") {
				txData.function = op.function;
			}
			else txData.from = from;
			hexLabels[txData.data.substring(0, 10)] = op.function;
		} else {
			const from = op.from ? op.from: tokenOwner;
			txData = {
				data: op.data,
				to: op.to,
				value: ethers.utils.parseEther(op.value),
				from: from
			}
		}
		
		if(!txData.from) {
			console.log("you must input from address of op", op.op_type);
			return;
		}
		txPrepares[nextBlockNumber].push({
			...txData,
			gasLimit: op.gasLimit || null
		});
		if(!labels[txData.from]) labels[txData.from] = "from_address";
		if(op.op_type == "addliqidity" || op.op_type == "limitbuy" || op.op_type == "fomobuy" || op.op_type == "sell") {
			labels[txData.to] = "router_address";
		} else if(op.op_type == "approve" || op.op_type == "function_call") {
			labels[txData.to] = "token_address";
		} else {
			if(!labels[txData.to]) labels[txData.to] = "to_address";
		}
	}
	for(var bn = config.blockNumber + 1; bn <= nextBlockNumber; bn ++) {
		// const errs = [];
		for(var i = 0; i < txPrepares[bn].length; i ++) {
			const txPrepare = txPrepares[bn][i];
			
			if(txPrepare.from) {
				const signer = await getSigner(txPrepare.from);
				const tx = await signer.sendTransaction(txPrepare).catch(err => {
					// console.log(err);
					console.log({
						blockNumber: bn,
						transactionIndex: i,
						from: txPrepare.from,
						to: txPrepare.to,
						data: txPrepare.data.substring(0, 10),
						code: err.code,
						method: err.method,
						reason: err.reason,
						message: err.message
					});
				});
				if(!tx) break;
				// tx.wait().then(receipt => {

				// }).catch(err => {
				// 	errs.push(err.code + " " + err.reason + " " + err.method);
				// 	console.log(err.code + " " + err.reason + " " + err.method);
				// })
			} else {
				const rlt = await waffle.provider.call(txPrepare).catch(err => {
					console.log({
						function: txPrepare.function,
						to: err.transaction.to,
						data: err.transaction.data.substring(0, 10),
						code: err.code,
						method: err.method,
						reason: err.reason,
					});
				});
				if(!rlt) break;
				console.log(txPrepare.function, "result", rlt);
			}
		}
		if(i < txPrepares[bn].length) break;
		await network.provider.send("hardhat_mine");
		const block = await waffle.provider.getBlock(bn);
		const receipts = [];
		for(var i = 0; i < block.transactions.length; i ++) {
			const txx = await waffle.provider.getTransaction(block.transactions[i]);
			const receipt = await waffle.provider.getTransactionReceipt(block.transactions[i]);
			// console.log(receipt);
			try{
				var callResult, msg;
				if(receipt.status == 0) {
					const txPrepare = txPrepares[bn][i];
					const signer = await getSigner(txPrepare.from);
					callResult = await signer.call(txPrepare);
					msg = decodeMessage(callResult);
				} else {
					const transfers = receipt.logs.filter(log => {
						if(log.topics.length == 3 && log.topics[0] == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") {
							labels[log.address.toLowerCase()] = "pair_address";
						}
						if(log.topics.length == 2 && log.topics[0] == "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
							labels[log.address.toLowerCase()] = "pair_address";
						}
						
						return log.topics.length >= 1 && log.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && log.topics[1] != "0x0000000000000000000000000000000000000000000000000000000000000000" && log.topics[2] != "0x0000000000000000000000000000000000000000000000000000000000000000";
					}).map(log => {
						if(log.topics.length == 4) {
							return {
								type: "ERC721",
								address: log.address,
								from: reduceAddy(log.topics[1]),
								to: reduceAddy(log.topics[2]),
								tokenId: parseInt(log.topics[3], 16)
							}
						}
						if(log.topics.length == 3) {
							if(log.address == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
								return {
									type: "ERC20",
									address: "WETH",
									from: reduceAddy(log.topics[1], labels), 
									to: reduceAddy(log.topics[2], labels),
									amount: ethers.utils.formatEther(log.data) + " eth"
								}
							}
							if(log.address.toLowerCase() == config.tokenAddy.toLowerCase()) {
								return {
									type: "ERC20",
									address: "TargetToken",
									from: reduceAddy(log.topics[1], labels), 
									to: reduceAddy(log.topics[2], labels),
									amount: (ethers.BigNumber.from(log.data).mul(100000).div(totalSupply) / 1000) + "% " + ethers.BigNumber.from(log.data).toString()
								}
							}
							return {
								type: "ERC20",
								address: reduceAddy(log.address, labels),
								from: reduceAddy(log.topics[1], labels), 
								to: reduceAddy(log.topics[2], labels),
								amount: ethers.BigNumber.from(log.data).toString()
							}
						}
					});
					if(transfers.length > 0) {
						console.log("transfers of tx ", receipt.transactionIndex, "(", reduceData(txx.data.substring(0, 10)), ")");
						console.table(transfers);
					}
				}
				receipts.push({
					txId: receipt.transactionIndex,
					blockNumber: receipt.blockNumber, 
					gasUsed: receipt.gasUsed.toString(),
					transactionFee: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
					from: reduceAddy(receipt.from, labels),
					hex: reduceData(txx.data.substring(0, 10)),
					status: receipt.status == 0? "failed": "success",
					revert: receipt.status == 0? (msg == "" || callResult == "0x" ? "CALL_EXCEPTION transaction failed": msg) : ""
				});
			} catch(err) {
				console.log(err, receipt);
			}
		}
		console.log("block ", bn);
		console.table(receipts);
		// console.log(errs);
	}
}

main()
	// .then(() => process.exit(0))
	// .catch((error) => {
	// 	console.error(error);
	// 	process.exit(1);
	// });