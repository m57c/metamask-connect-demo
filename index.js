/**
 * Demo of a Connect with Metamask flow
 *
 * 1. Detect the provider
 * 2. Detect the chain the user is connected to
 * 3. Get the user's acount address
 * 4. Sign a message to prove ownership of the account
 **/

import { bufferToHex } from 'ethereumjs-util';
import { recoverPersonalSignature } from 'eth-sig-util';

const connectButton = document.getElementById("connectButton");
const signButton = document.getElementById("signButton");

let currentAccount = null;
let chainId = null;

function sendToLog(msg, type="success") {
  const log = document.getElementById("log");
  const logCardTemplate = document.getElementById(`log-${type}-template`);
  const newLog = logCardTemplate.cloneNode(true);

  newLog.removeAttribute('id');
  newLog.querySelector(".log-message-text").innerText = msg;

  log.append(newLog);

  newLog.classList.remove('hidden');
}

function handleAccountsChnaged(accounts) {
  if (accounts.length === 0) {
    // MetaMask is locked or not connected
    connectButton.hidden = false;
    signButton.hidden = true;
  } else if (accounts[0] !== currentAccount) {
    connectButton.hidden = true;
    currentAccount = accounts[0];
    sendToLog(`Connected to account: ${currentAccount}`);
    signButton.hidden = false;
  }
}

function connect() {
  ethereum
    .request({ method: "eth_requestAccounts" })
    .then(handleAccountsChnaged)
    .catch((err) => {
      if (err.code === 4001) {
        // User rejected the request
        sendToLog("User rejected request to connect", "error");
      } else {
        console.error(err.message);
      }
    });
}
connectButton.addEventListener("click", connect);

function verifySignature(msg, sig) {
  const msgBufferHex = bufferToHex(Buffer.from(msg, 'utf8'));
  const recoverdAddress = recoverPersonalSignature({
    data: msgBufferHex,
    sig: sig,
  });
  
  if (recoverdAddress.toLowerCase() === currentAccount.toLowerCase()) {
    signButton.hidden = true;
    sendToLog(`Verified you own: ${currentAccount}.`);
    sendToLog("You are now signed in");
  } else {
    sendToLog(`${recoverdAddress} does not match ${currentAccount}. You do not own this account`, "error");
  }
}

/**
 * 1. Detect the provider
 * MetaMask injects window.ethereum into the site.
 * A more complete implemenation of this step is here: 
 * https://github.com/MetaMask/detect-provider/blob/main/src/index.ts
 **/
if (window.ethereum) {
  sendToLog("Provider Detected");

  const { ethereum } = window;

  if (ethereum.isMetaMask) {
    sendToLog("Provider is MetaMask");
  } else {
    sendToLog("Provider is Not MetaMask", "error");
  }

  /**
   * 2. Detect chain the user is connected to and detect when user switches chains.
   **/
  ethereum
    .request({ method: "eth_chainId" })
    .then((_chainId) => {
      chainId = _chainId; 
      sendToLog(`Chain ID: ${chainId}`);
    });

  //Reload the page if the chain changes
  ethereum.on("chainChanged", (_chainId) => {
    window.location.reload();
  });

  /**
   * 3. Detect connected account and when the user changes accounts
   **/
  ethereum
    .request({ method: "eth_accounts" })
    .then(handleAccountsChnaged)
    .catch((err) => {
      console.error(err);
    });

  ethereum.on("accountsChanged", (_accounts) => {
    //handleAccountsChnaged(_accounts);
    window.location.reload();
  });

  /**
   * 4. Sign a mesage to prove ownership of the account
   **/
  signButton.addEventListener('click', () => {
    if (currentAccount !== null) {

      let nonce = Math.random().toString(20).toString('hex').substring(2);

      let msg = "Sign this message to prove\n"
        + "you have access to this wallet.\n"
        + "This wont cost any Ether.\n\n"
        + "The app will verify your wallet using\n"
        + `this random ID: ${nonce}`
      
      ethereum
        .request({
          method: 'personal_sign',
          params: [
            msg,
            currentAccount,
          ],
        })
        .then((response) => {
          sendToLog(`Signature: ${response}`);
          verifySignature(msg, response);
        })
        .catch((err) => {
          if (err.code === 4001) {
            // User rejected the request
            sendToLog("User rejected request to sign", "error");
          } else {
            console.error(err);
          }
        });
    }
  });
} else {
  sendToLog("Provider not detected", "error");
}
