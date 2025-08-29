module.exports = {
    abi: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ID",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        }
      ],
      "name": "NewAreaStatus",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ID",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "imageSourceUrl",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "adUrl",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "adText",
          "type": "string"
        }
      ],
      "name": "NewImage",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ID",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newUser",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "invitedBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "activationTime",
          "type": "uint32"
        }
      ],
      "name": "NewUser",
      "type": "event"
    },
    {
      "stateMutability": "nonpayable",
      "type": "fallback"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "violator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "banViolator",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "pauseContract",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "refundInvestments",
          "type": "bool"
        }
      ],
      "name": "adminContractSecurity",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "newDelayInSeconds",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "newCharityAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "newImagePlacementPriceInWei",
          "type": "uint256"
        }
      ],
      "name": "adminContractSettings",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        }
      ],
      "name": "buyBlocks",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "charityAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "charityBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyRefund",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        }
      ],
      "name": "getAreaPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "x",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "y",
          "type": "uint8"
        }
      ],
      "name": "getBlockInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "landlord",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "imageID",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellPrice",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "imageID",
          "type": "uint256"
        }
      ],
      "name": "getImageInfo",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "imageSourceUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "adUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "adText",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMyInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "activationTime",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getStateInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_numUsers",
          "type": "uint256"
        },
        {
          "internalType": "uint16",
          "name": "_blocksSold",
          "type": "uint16"
        },
        {
          "internalType": "uint256",
          "name": "_totalWeiInvested",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_numImages",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_setting_imagePlacementPriceInWei",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_numNewStatus",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "_setting_delay",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "userID",
          "type": "uint256"
        }
      ],
      "name": "getUserAddressByID",
      "outputs": [
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        }
      ],
      "name": "getUserInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "referal",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "handshakes",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "activationTime",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "banned",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "userID",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "refunded",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "investments",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "imageSourceUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "adUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "adText",
          "type": "string"
        }
      ],
      "name": "placeImage",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "fromX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "fromY",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toX",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "toY",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "priceForEachBlockInWei",
          "type": "uint256"
        }
      ],
      "name": "sellBlocks",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "referal",
          "type": "address"
        }
      ],
      "name": "signIn",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
}