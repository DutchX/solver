const { ethers } = require('ethers');

const abi = require('../abi/dutchXabi.json');
const erc20_abi = require('../abi/erc20abi.json');

require('dotenv').config();

// const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/ugm8Vq5TkJDw6OqX-Qhiw7__0uU7cBLT');
// const provider = new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia');
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

const dutchXaddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const mockTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const mockTokenContract = new ethers.Contract(mockTokenAddress, erc20_abi, provider);

const mockToken2Address = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const mockToken2Contract = new ethers.Contract(mockToken2Address, erc20_abi, provider);

const dutchXcontract = new ethers.Contract(dutchXaddress, abi, provider);

const solverSigner = new ethers.Wallet('0x' + process.env.SOLVER_PRIVATE_KEY, provider);

const userSigner = new ethers.Wallet('0x' + process.env.USER_PRIVATE_KEY, provider);


function encodeOrder(order) {
  const types = [
      'address', 'uint256', 'address', 'uint256', 
      'uint256', 'address', 'uint256', 'uint256', 
      'uint256', 'uint256', 'uint256', 'uint256', 
      'string'
  ];

  const values = [
      order.from, order.fromChainId, order.fromToken, order.fromAmount,
      order.toChainId, order.toToken, order.startingPrice, order.endingPrice,
      order.stakeAmount, order.creationTimestamp, order.duration, order.nonce,
      order.orderId
  ];

  return ethers.utils.solidityKeccak256(types, values);
}

function encodeMessage(order) {
  const types = [
      'address', 'uint256', 'address', 'uint256', 
      'uint256', 'address', 'uint256', 'uint256', 
      'uint256', 'uint256', 'uint256', 'uint256', 
      'string'
  ];

  const values = [
      order.from, order.fromChainId, order.fromToken, order.fromAmount,
      order.toChainId, order.toToken, order.startingPrice, order.endingPrice,
      order.stakeAmount, order.creationTimestamp, order.duration, order.nonce,
      order.orderId
  ];

  return ethers.utils.defaultAbiCoder.encode(types, values);
}



async function signOrder(order, signer) {
  const message = encodeMessage(order);
  // const abi
  const digest = ethers.utils.keccak256(ethers.utils.soliditySha256(['string','bytes32'], ["\x19Ethereum Signed Message:\n32", ethers.utils.keccak256(message)]));

  console.log('Digest', digest);
  const signature = await signer.signMessage(ethers.utils.arrayify(digest));
  return {message, signature};
}

async function main() {

  const blockTimestamp = (await provider.getBlock('latest')).timestamp
  console.log('Block timestamp', blockTimestamp)

  const order = {
      from: "0x0b04f0774084f00f8B9fB4EcF8de0Ba44c2CA5bB",
      fromChainId: 11155111,
      fromToken: "0xfb8c7dD1E47b57a3308f52B55244f974b1E319A0",
      fromAmount: ethers.utils.parseEther('10'),
      toChainId: 85431,
      toToken: "0xfb8c7dD1E47b57a3308f52B55244f974b1E319A0",
      startingPrice: ethers.utils.parseEther('1'),
      endingPrice: ethers.utils.parseEther('0.9'),
      stakeAmount: ethers.utils.parseEther('1'),
      creationTimestamp: 1702139996,
      duration: 180,
      nonce: 1,
      orderId: 'blah blah black sheep',

  };

  const {message, signature} = await signOrder(order, solverSigner);
  console.log('Message to sign:', message)
  console.log('Signed message:', signature);


  const userApproveTx = await mockTokenContract.connect(userSigner).approve(dutchXaddress, order.fromAmount);
  await userApproveTx.wait();

  console.log('Approved fromAmount');

  const approveTx = await mockTokenContract.connect(solverSigner).approve(dutchXaddress, order.stakeAmount);
  await approveTx.wait();

  console.log('Approved stakeAmount');

  const claimTx = await dutchXcontract.connect(solverSigner).claimOrder();
  await claimTx.wait();
  console.log('Claimed order hash', claimTx.hash);

  const claimedOrder = await dutchXcontract.getOrder(1);
  console.log('Claimed order', claimedOrder);

}



main().catch(console.error);


