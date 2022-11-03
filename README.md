# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

yarn hardhat run scripts/sample-script.js --network hardhat


block_jump: any number greater than 0

op_type: addliquidity, limitbuy, fomobuy, sell, approve, function_call
    if op_type is not set, op can be treated normal tx

token_amount: token_amount can be percent number or static

--addliquidity
    requires: token_amount, eth_amount
    options: from(default: tokenOwner), to(default: uniRouter), gasLimit(default: null)
    ex: 
        {
            op_type: "addliquidity",
            token_amount: "0.1%",
            eth_amount: "1",
        }

--limitbuy
    requires: token_amount, from, eth_amount_max
    options: to(default: uniRouter), gasLimit(default: null)
    ex: 
        {
            op_type: "limitbuy",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            token_amount: "0.1%",
            eth_amount_max: "2"
        }

--fomobuy
    requires: eth_amount, from
    options: to(default: uniRouter), gasLimit(default: null)
    ex:
        {
            op_type: "fomobuy",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            eth_amount: "0.1"
        }

--sell
    requires: from, token_amount
    options: to(default: uniRouter), gasLimit(default: null)
    ex:
        {
            op_type: "sell",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            token_amount: "0.5%"
        }


--approve
    requires: 
    options: from(default: tokenOwner), router(default: uniRouter), gasLimit(default: null)
    ex:
        {
            op_type: "approve"
        }

--function_call
    requires: function, params
    options: from(default: tokenOwner), to(default: token), gasLimit(default: null)
    require_file: tokenAbi.json
    function_call can be read/write function
    ex:
        {
            op_type: "function_call",
            function: "openTrading",
            params: [true]
        }
    
--normal_tx
    requires: to, data, value
    options: from(default: tokenOwner), gasLimit(default: null)
    ex:
        {
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            to: "0x0f607cc6da7a564ba82818b1f475dc18ba1b153c,
            data: "0x8a8c523c",
            value: "0"
        }


        open trading

                {
            from:"0x55Abd2608C4fb398f1A4DD2182eD99BB2365516F",
            to:"0xeA3C2A51a5BB31E91DDc15950Ada0Cd191d04e25",
            data: "0xa9059cbb000000000000000000000000ea3c2a51a5bb31e91ddc15950ada0cd191d04e2500000000000000000000000000000000000000000000000000025e54461d2400",
            value: "0",
            gasLimit: "500000"
        },
        {
            from:"0x55Abd2608C4fb398f1A4DD2182eD99BB2365516F",
            to:"0xeA3C2A51a5BB31E91DDc15950Ada0Cd191d04e25",
            data: "0x",
            value: "1",
            gasLimit: "500000"
        },
        {
            from:"0x55Abd2608C4fb398f1A4DD2182eD99BB2365516F",
            to:"0xeA3C2A51a5BB31E91DDc15950Ada0Cd191d04e25",
            data: "0xc9567bf9",
            value: "0",
            gasLimit: "4000000"
        },


        approve usdc         {
            from:"0x6E94987C94AC9A38da64d971Aa8De92913c3FC1D",
            to:"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            data: "0x095ea7b30000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            value: "0",
            gasLimit: "250000"
        },