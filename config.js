module.exports = {
    "id": 1667155922095,
    "start": false,
    "name": "sim 3",
    "blockNumber": "16171420",
    "tokenAddy": "0x8e870d67f660d95d5be530380d0ec0bd388289e1",
    "quoteTokenAddy": "0x661e4c62f57fccb205b89e0540b28258d0ffd83d",
    "setBlances": [
        {
            "address": "0xfbdca6ba283f9b703e036feba95ee8af262aa0d4",
            "value": "2"
        }
    ],
    "simulates": [
        {
            "op_type": "approve",
            "from": "0x28570292e2164572989623a85fdef4f699c8889c"
        },
        {
            "op_type": "addliquidity",
            "from": "0xfbdca6ba283f9b703e036feba95ee8af262aa0d4",
            "token_amount": "50",
            "eth_amount": "2",
            "gasLimit": "1000000"
        },
        {
            "op_type": "blockjump",
            "blockjump": "1"
        },
        {
            "op_type": "limitbuy",
            "from": "0xFB9995F9C4478a53D31dF7dF309fc1F4d607886b",
            "token_amount": "1",
            "eth_amount_max": "1",
            "gasLimit": "600000"
        },
        {
            "op_type": "blockjump",
            "blockjump": "1"
        },
        {
            "op_type": "sell",
            "from": "0xFB9995F9C4478a53D31dF7dF309fc1F4d607886b",
            "token_amount": "1",
            "gasLimit": "600000"
        }
    ]
}