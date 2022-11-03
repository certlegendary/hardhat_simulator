
block_jump: any number greater than 0

op_type: addliquidity, limitbuy, fomobuy, sell, approve, quote_approve, function_call
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

--quote_approve
    requires: 
    options: from(default: tokenOwner), router(default: uniRouter), gasLimit(default: null)
    ex:
        {
            op_type: "quote_approve"
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