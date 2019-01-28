'use strict';
const jwt = require('jsonwebtoken');
var config = require('../configuration');

module.exports = function(Account) {
    Account.mergeAccount = (req,cb) => {
        var token = req.headers['x-access-token'];
        var postData = req.body;

        jwt.verify(token, config.secret , (err, decodedObj) => {
            if (err){
                let err = Error();
                err.statusCode = 500;
                err.message = 'Failed to authenticate token.';
                err.auth = false;
                cb(err,null);
            }

            var userName = decodedObj.username;
            Account.app.datasources.dbService.getDebitAccounts(username,(err,response,ctx) =>{
                if(err){
                    let err = Error();
                    err.statusCode = 500;
                    err.message = 'Failed to load data.';
                    cb(err,null);
                }
                var data = JSON.parse(response);

                postData.senders.map((obj) => {
                    var filteredSenderBank = data.banks.filter((bank) => {
                        return bank.bankName == obj.senderBank;
                    })[0];

                    var filteredReceiverBank = data.banks.filter((bank) => {
                        return bank.bankName == postData.receiver.receiverBank
                    })[0];

                    if(!filteredReceiverBank){
                        filteredReceiverBank = {
                            "bankName": "LBG",
                            "bankId": "LLBBGG",
                            "accounts": [{
                                    "accountType": "SB",
                                    "accountNumber": "XXXXXX XXXX2222",
                                    "accountTitle": "Easy Saver",
                                    "standingInst": 0,
                                    "balance": 0,
                                    "minBalance": 200,
                                    "interestRate": 0.5,
                                    "availableBalance": 0,
                                    "automatedSITransations": false,
                                    "standingInstructions": []
                            }]
                        }
                    }
                    var restBankDetails = data.banks.filter((bank)=>{
                    return bank.bankName != postData.receiver.receiverBank && bank.bankName != obj.senderBank;
                    });
                    filteredReceiverBank.accounts[0].balance = parseInt(filteredReceiverBank.accounts[0].balance) + parseInt(filteredSenderBank.accounts[0].balance);
                    filteredReceiverBank.accounts[0].standingInstructions = [...filteredReceiverBank.accounts[0].standingInstructions, ...filteredSenderBank.accounts[0].standingInstructions];
                    filteredReceiverBank.accounts[0].standingInst = filteredReceiverBank.accounts[0].standingInstructions.reduce((acc, val)=>acc+val.value,0);
                    filteredSenderBank.accounts[0].availableBalance = filteredReceiverBank.accounts[0].balance - filteredReceiverBank.accounts[0].standingInstructions - filteredReceiverBank.accounts[0].standingInst;
                    data.banks = [...restBankDetails, filteredReceiverBank];
                });

                Account.app.datasources.dbService.modifyDebitBanks(username,{"banks":data.banks},(err,response,ctx) => {
                    if(err)
                    {
                        let err = Error();
                        err.statusCode = 500;
                        err.message = 'Failed to patch data.';
                        cb(err,null);
                    }
                    if(response)
                    {
                        cb(null, response);
                    }

                });
            });
        });
    };
}

