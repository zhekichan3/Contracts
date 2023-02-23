"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var hardhat_1 = require("hardhat");
var chai_1 = require("chai");
var owner;
var validator;
var user1;
var user2;
var user3;
var USDT_ETH;
var USDT_BSC;
var DAI_ETH;
var DAI_BSC;
var Bridge_ETH;
var Bridge_BSC;
var fee = 20; // 2%
var lockTime = 100; // seconds
var USDT_ETH_Pool;
var DAI_ETH_Pool;
var USDT_BSC_Pool;
var DAI_BSC_Pool;
describe("Cross chain Bridge test", function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    _a = _b.sent(), owner = _a[0], validator = _a[1], user1 = _a[2], user2 = _a[3], user3 = _a[4];
                    return [2 /*return*/];
            }
        });
    }); });
    it("STEP 1: Should deploy the Tokens", function () {
        return __awaiter(this, void 0, void 0, function () {
            var USDTAmount, DAIAmount, TokenContract;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        USDTAmount = 100000000000;
                        DAIAmount = hardhat_1.ethers.utils.parseEther("100000");
                        return [4 /*yield*/, hardhat_1.ethers.getContractFactory("Token")];
                    case 1:
                        TokenContract = _a.sent();
                        return [4 /*yield*/, TokenContract.deploy("USDT token", "USDT", USDTAmount, 6)];
                    case 2: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 3:
                        USDT_ETH = (_a.sent());
                        return [4 /*yield*/, TokenContract.deploy("USDT token", "USDT", USDTAmount, 6)];
                    case 4: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 5:
                        USDT_BSC = (_a.sent());
                        return [4 /*yield*/, TokenContract.deploy("DAI token", "DAI", DAIAmount, 18)];
                    case 6: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 7:
                        DAI_ETH = (_a.sent());
                        return [4 /*yield*/, TokenContract.deploy("DAI token", "DAI", DAIAmount, 18)];
                    case 8: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 9:
                        DAI_BSC = (_a.sent());
                        return [4 /*yield*/, USDT_ETH.transfer(user1.address, 1000000000)];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, USDT_ETH.transfer(user2.address, 1000000000)];
                    case 11:
                        _a.sent();
                        return [4 /*yield*/, USDT_BSC.transfer(user1.address, 1000000000)];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, USDT_BSC.transfer(user2.address, 1000000000)];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, DAI_ETH.transfer(user1.address, hardhat_1.ethers.utils.parseEther("1000"))];
                    case 14:
                        _a.sent();
                        return [4 /*yield*/, DAI_ETH.transfer(user2.address, hardhat_1.ethers.utils.parseEther("1000"))];
                    case 15:
                        _a.sent();
                        return [4 /*yield*/, DAI_BSC.transfer(user1.address, hardhat_1.ethers.utils.parseEther("1000"))];
                    case 16:
                        _a.sent();
                        return [4 /*yield*/, DAI_BSC.transfer(user2.address, hardhat_1.ethers.utils.parseEther("1000"))];
                    case 17:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 2: Should deploy the Bridge", function () {
        return __awaiter(this, void 0, void 0, function () {
            var BridgeContract;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory("Bridge")];
                    case 1:
                        BridgeContract = _a.sent();
                        return [4 /*yield*/, BridgeContract.deploy(validator.address, fee, lockTime)];
                    case 2: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 3:
                        Bridge_ETH = (_a.sent());
                        return [4 /*yield*/, BridgeContract.deploy(validator.address, fee, lockTime)];
                    case 4: return [4 /*yield*/, (_a.sent()).deployed()];
                    case 5:
                        Bridge_BSC = (_a.sent());
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 3: Check Bridge parameters", function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _a = chai_1.expect;
                        return [4 /*yield*/, Bridge_ETH.validator()];
                    case 1:
                        _a.apply(void 0, [_g.sent()]).to.equal(validator.address);
                        _b = chai_1.expect;
                        return [4 /*yield*/, Bridge_BSC.validator()];
                    case 2:
                        _b.apply(void 0, [_g.sent()]).to.equal(validator.address);
                        _c = chai_1.expect;
                        return [4 /*yield*/, Bridge_ETH.fee()];
                    case 3:
                        _c.apply(void 0, [_g.sent()]).to.equal(fee);
                        _d = chai_1.expect;
                        return [4 /*yield*/, Bridge_BSC.fee()];
                    case 4:
                        _d.apply(void 0, [_g.sent()]).to.equal(fee);
                        _e = chai_1.expect;
                        return [4 /*yield*/, Bridge_ETH.lockPeriod()];
                    case 5:
                        _e.apply(void 0, [_g.sent()]).to.equal(lockTime);
                        _f = chai_1.expect;
                        return [4 /*yield*/, Bridge_BSC.lockPeriod()];
                    case 6:
                        _f.apply(void 0, [_g.sent()]).to.equal(lockTime);
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 4: Should create new Liquidity Pools", function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
            return __generator(this, function (_8) {
                switch (_8.label) {
                    case 0:
                        Bridge_ETH.addPool(USDT_ETH.address);
                        Bridge_ETH.addPool(DAI_ETH.address);
                        Bridge_BSC.addPool(USDT_BSC.address);
                        Bridge_BSC.addPool(DAI_BSC.address);
                        _b = (_a = hardhat_1.ethers).getContractAt;
                        _c = ["LiquidityPool"];
                        return [4 /*yield*/, Bridge_ETH.liquidityPools(USDT_ETH.address)];
                    case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([_8.sent()]))];
                    case 2:
                        USDT_ETH_Pool = _8.sent();
                        _e = (_d = hardhat_1.ethers).getContractAt;
                        _f = ["LiquidityPool"];
                        return [4 /*yield*/, Bridge_ETH.liquidityPools(DAI_ETH.address)];
                    case 3: return [4 /*yield*/, _e.apply(_d, _f.concat([_8.sent()]))];
                    case 4:
                        DAI_ETH_Pool = _8.sent();
                        _h = (_g = hardhat_1.ethers).getContractAt;
                        _j = ["LiquidityPool"];
                        return [4 /*yield*/, Bridge_BSC.liquidityPools(USDT_BSC.address)];
                    case 5: return [4 /*yield*/, _h.apply(_g, _j.concat([_8.sent()]))];
                    case 6:
                        USDT_BSC_Pool = _8.sent();
                        _l = (_k = hardhat_1.ethers).getContractAt;
                        _m = ["LiquidityPool"];
                        return [4 /*yield*/, Bridge_BSC.liquidityPools(DAI_BSC.address)];
                    case 7: return [4 /*yield*/, _l.apply(_k, _m.concat([_8.sent()]))];
                    case 8:
                        DAI_BSC_Pool = _8.sent();
                        _o = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH_Pool.token()];
                    case 9:
                        _o.apply(void 0, [_8.sent()]).to.equal(USDT_ETH.address);
                        _p = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH_Pool.lockPeriod()];
                    case 10:
                        _p.apply(void 0, [_8.sent()]).to.equal(lockTime);
                        _q = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH_Pool.bridge()];
                    case 11:
                        _q.apply(void 0, [_8.sent()]).to.equal(Bridge_ETH.address);
                        _r = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH_Pool.name()];
                    case 12:
                        _r.apply(void 0, [_8.sent()]).to.equal("USDT token Bridge LP Token");
                        _s = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH_Pool.symbol()];
                    case 13:
                        _s.apply(void 0, [_8.sent()]).to.equal("pUSDT");
                        _t = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC_Pool.token()];
                    case 14:
                        _t.apply(void 0, [_8.sent()]).to.equal(USDT_BSC.address);
                        _u = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC_Pool.lockPeriod()];
                    case 15:
                        _u.apply(void 0, [_8.sent()]).to.equal(lockTime);
                        _v = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC_Pool.bridge()];
                    case 16:
                        _v.apply(void 0, [_8.sent()]).to.equal(Bridge_BSC.address);
                        _w = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC_Pool.name()];
                    case 17:
                        _w.apply(void 0, [_8.sent()]).to.equal("USDT token Bridge LP Token");
                        _x = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC_Pool.symbol()];
                    case 18:
                        _x.apply(void 0, [_8.sent()]).to.equal("pUSDT");
                        _y = chai_1.expect;
                        return [4 /*yield*/, DAI_ETH_Pool.token()];
                    case 19:
                        _y.apply(void 0, [_8.sent()]).to.equal(DAI_ETH.address);
                        _z = chai_1.expect;
                        return [4 /*yield*/, DAI_ETH_Pool.lockPeriod()];
                    case 20:
                        _z.apply(void 0, [_8.sent()]).to.equal(lockTime);
                        _0 = chai_1.expect;
                        return [4 /*yield*/, DAI_ETH_Pool.bridge()];
                    case 21:
                        _0.apply(void 0, [_8.sent()]).to.equal(Bridge_ETH.address);
                        _1 = chai_1.expect;
                        return [4 /*yield*/, DAI_ETH_Pool.name()];
                    case 22:
                        _1.apply(void 0, [_8.sent()]).to.equal("DAI token Bridge LP Token");
                        _2 = chai_1.expect;
                        return [4 /*yield*/, DAI_ETH_Pool.symbol()];
                    case 23:
                        _2.apply(void 0, [_8.sent()]).to.equal("pDAI");
                        _3 = chai_1.expect;
                        return [4 /*yield*/, DAI_BSC_Pool.token()];
                    case 24:
                        _3.apply(void 0, [_8.sent()]).to.equal(DAI_BSC.address);
                        _4 = chai_1.expect;
                        return [4 /*yield*/, DAI_BSC_Pool.lockPeriod()];
                    case 25:
                        _4.apply(void 0, [_8.sent()]).to.equal(lockTime);
                        _5 = chai_1.expect;
                        return [4 /*yield*/, DAI_BSC_Pool.bridge()];
                    case 26:
                        _5.apply(void 0, [_8.sent()]).to.equal(Bridge_BSC.address);
                        _6 = chai_1.expect;
                        return [4 /*yield*/, DAI_BSC_Pool.name()];
                    case 27:
                        _6.apply(void 0, [_8.sent()]).to.equal("DAI token Bridge LP Token");
                        _7 = chai_1.expect;
                        return [4 /*yield*/, DAI_BSC_Pool.symbol()];
                    case 28:
                        _7.apply(void 0, [_8.sent()]).to.equal("pDAI");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 5: Check requires for addPool function", function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, error_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bridge_ETH.connect(user1).addPool(USDT_ETH.address)];
                    case 1:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        chai_1.expect(error_1.message).to.include("Ownable: caller is not the owner");
                        return [3 /*break*/, 3];
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, Bridge_ETH.connect(owner).addPool(user1.address)];
                    case 4:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        chai_1.expect(error_2.message).to.include("Bridge: Invalid token address");
                        return [3 /*break*/, 6];
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, Bridge_ETH.connect(owner).addPool(USDT_ETH.address)];
                    case 7:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 9];
                    case 8:
                        error_3 = _a.sent();
                        chai_1.expect(error_3.message).to.include("Bridge: The token is already registered");
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 6: Should approve tokens to Liquidity pools", function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, USDT_ETH.connect(user1).approve(USDT_ETH_Pool.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, USDT_BSC.connect(user1).approve(USDT_BSC_Pool.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, DAI_ETH.connect(user1).approve(DAI_ETH_Pool.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, DAI_BSC.connect(user1).approve(DAI_BSC_Pool.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, USDT_ETH.connect(user2).approve(Bridge_ETH.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, USDT_BSC.connect(user2).approve(Bridge_BSC.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, DAI_ETH.connect(user2).approve(Bridge_ETH.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, DAI_BSC.connect(user2).approve(Bridge_BSC.address, hardhat_1.ethers.utils.parseEther("1000.0"))];
                    case 8:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 7: Should add liquidity when the underlying source token has 18 decimal points", function () {
        return __awaiter(this, void 0, void 0, function () {
            var DAI_ETH_LPBalanceBefore, DAI_BSC_LPBalanceBefore, DAI_ETH_BalanceBefore, DAI_BSC_BalanceBefore, DAI_ETH_LPBalanceAfter, DAI_BSC_LPBalanceAfter, DAI_ETH_BalanceAfter, DAI_BSC_BalanceAfter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, DAI_ETH_Pool.balanceOf(user1.address)];
                    case 1:
                        DAI_ETH_LPBalanceBefore = _a.sent();
                        return [4 /*yield*/, DAI_BSC_Pool.balanceOf(user1.address)];
                    case 2:
                        DAI_BSC_LPBalanceBefore = _a.sent();
                        return [4 /*yield*/, DAI_ETH.balanceOf(user1.address)];
                    case 3:
                        DAI_ETH_BalanceBefore = _a.sent();
                        return [4 /*yield*/, DAI_BSC.balanceOf(user1.address)];
                    case 4:
                        DAI_BSC_BalanceBefore = _a.sent();
                        chai_1.expect(DAI_ETH_LPBalanceBefore).to.equal(0);
                        chai_1.expect(DAI_BSC_LPBalanceBefore).to.equal(0);
                        chai_1.expect(DAI_ETH_BalanceBefore).to.equal(hardhat_1.ethers.utils.parseEther("1000.0"));
                        chai_1.expect(DAI_BSC_BalanceBefore).to.equal(hardhat_1.ethers.utils.parseEther("1000.0"));
                        return [4 /*yield*/, DAI_ETH_Pool.connect(user1).addLiquidity(hardhat_1.ethers.utils.parseEther("500.0"))];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, DAI_BSC_Pool.connect(user1).addLiquidity(hardhat_1.ethers.utils.parseEther("500.0"))];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, DAI_ETH_Pool.balanceOf(user1.address)];
                    case 7:
                        DAI_ETH_LPBalanceAfter = _a.sent();
                        return [4 /*yield*/, DAI_BSC_Pool.balanceOf(user1.address)];
                    case 8:
                        DAI_BSC_LPBalanceAfter = _a.sent();
                        return [4 /*yield*/, DAI_ETH.balanceOf(user1.address)];
                    case 9:
                        DAI_ETH_BalanceAfter = _a.sent();
                        return [4 /*yield*/, DAI_BSC.balanceOf(user1.address)];
                    case 10:
                        DAI_BSC_BalanceAfter = _a.sent();
                        chai_1.expect(DAI_ETH_LPBalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        chai_1.expect(DAI_BSC_LPBalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        chai_1.expect(DAI_ETH_BalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        chai_1.expect(DAI_BSC_BalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 8: Should add liquidity when the underlying source token has fewer than 18 decimal points", function () {
        return __awaiter(this, void 0, void 0, function () {
            var USDT_ETH_LPBalanceBefore, USDT_BSC_LPBalanceBefore, USDT_ETH_BalanceBefore, USDT_BSC_BalanceBefore, USDT_ETH_LPBalanceAfter, USDT_BSC_LPBalanceAfter, USDT_ETH_BalanceAfter, USDT_BSC_BalanceAfter, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, USDT_ETH_Pool.balanceOf(user1.address)];
                    case 1:
                        USDT_ETH_LPBalanceBefore = _c.sent();
                        return [4 /*yield*/, USDT_BSC_Pool.balanceOf(user1.address)];
                    case 2:
                        USDT_BSC_LPBalanceBefore = _c.sent();
                        return [4 /*yield*/, USDT_ETH.balanceOf(user1.address)];
                    case 3:
                        USDT_ETH_BalanceBefore = _c.sent();
                        return [4 /*yield*/, USDT_BSC.balanceOf(user1.address)];
                    case 4:
                        USDT_BSC_BalanceBefore = _c.sent();
                        chai_1.expect(USDT_ETH_LPBalanceBefore).to.equal(0);
                        chai_1.expect(USDT_BSC_LPBalanceBefore).to.equal(0);
                        chai_1.expect(USDT_ETH_BalanceBefore).to.equal(1000000000);
                        chai_1.expect(USDT_BSC_BalanceBefore).to.equal(1000000000);
                        return [4 /*yield*/, USDT_ETH_Pool.connect(user1).addLiquidity(500000000)];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, USDT_BSC_Pool.connect(user1).addLiquidity(500000000)];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, USDT_ETH_Pool.balanceOf(user1.address)];
                    case 7:
                        USDT_ETH_LPBalanceAfter = _c.sent();
                        return [4 /*yield*/, USDT_BSC_Pool.balanceOf(user1.address)];
                    case 8:
                        USDT_BSC_LPBalanceAfter = _c.sent();
                        return [4 /*yield*/, USDT_ETH.balanceOf(user1.address)];
                    case 9:
                        USDT_ETH_BalanceAfter = _c.sent();
                        return [4 /*yield*/, USDT_BSC.balanceOf(user1.address)];
                    case 10:
                        USDT_BSC_BalanceAfter = _c.sent();
                        chai_1.expect(USDT_ETH_LPBalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        chai_1.expect(USDT_BSC_LPBalanceAfter).to.equal(hardhat_1.ethers.utils.parseEther("500.0"));
                        chai_1.expect(USDT_ETH_BalanceAfter).to.equal(500000000);
                        chai_1.expect(USDT_BSC_BalanceAfter).to.equal(500000000);
                        _a = chai_1.expect;
                        return [4 /*yield*/, USDT_ETH.balanceOf(USDT_ETH_Pool.address)];
                    case 11:
                        _a.apply(void 0, [_c.sent()]).to.equal(500000000);
                        _b = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC.balanceOf(USDT_BSC_Pool.address)];
                    case 12:
                        _b.apply(void 0, [_c.sent()]).to.equal(500000000);
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 9: Should initiate the swap", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, USDT_ETH_PoolBalanceBefore, USDT_ETH_PoolBalanceAfter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 100000000;
                        chainTo = 2;
                        recipient = user3.address;
                        return [4 /*yield*/, USDT_ETH.balanceOf(USDT_ETH_Pool.address)];
                    case 1:
                        USDT_ETH_PoolBalanceBefore = _a.sent();
                        return [4 /*yield*/, Bridge_ETH.connect(user2).swap(recipient, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, 2)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, USDT_ETH.balanceOf(USDT_ETH_Pool.address)];
                    case 3:
                        USDT_ETH_PoolBalanceAfter = _a.sent();
                        chai_1.expect(USDT_ETH_PoolBalanceAfter).to.equal(Number(USDT_ETH_PoolBalanceBefore) + amount);
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 10: Check requires for swap function", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, USDT_ETH_PoolBalanceBefore, error_4, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 100000000;
                        chainTo = 2;
                        recipient = user3.address;
                        return [4 /*yield*/, USDT_ETH.balanceOf(USDT_ETH_Pool.address)];
                    case 1:
                        USDT_ETH_PoolBalanceBefore = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Bridge_ETH.connect(user2).swap(recipient, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, 2)];
                    case 3:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        chai_1.expect(error_4.message).to.include("Bridge: swap is not empty state or duplicate secret");
                        return [3 /*break*/, 5];
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, Bridge_ETH.connect(user2).swap(recipient, transaction_number, amount, user2.address, USDT_BSC.address, 2)];
                    case 6:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 8];
                    case 7:
                        error_5 = _a.sent();
                        chai_1.expect(error_5.message).to.include("Bridge: liquidity pool is not registered");
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 11: Should redeem the swap on the another blockchain", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, message, signature, _a, v, r, s, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 100000000;
                        chainTo = 2;
                        recipient = user3.address;
                        message = hardhat_1.ethers.utils.arrayify(hardhat_1.ethers.utils.solidityKeccak256([
                            "string",
                            "uint256",
                            "address",
                            "address",
                            "address",
                            "uint256"
                        ], [
                            transaction_number,
                            amount,
                            USDT_ETH.address,
                            USDT_BSC.address,
                            recipient,
                            chainTo
                        ]));
                        return [4 /*yield*/, validator.signMessage(message)];
                    case 1:
                        signature = _d.sent();
                        _a = hardhat_1.ethers.utils.splitSignature(signature), v = _a.v, r = _a.r, s = _a.s;
                        return [4 /*yield*/, Bridge_BSC.connect(user3).redeem(user3.address, user2.address, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, chainTo, v, r, s)];
                    case 2:
                        _d.sent();
                        _b = chai_1.expect;
                        return [4 /*yield*/, USDT_BSC.balanceOf(user3.address)];
                    case 3:
                        _b.apply(void 0, [_d.sent()]).to.equal(amount * 0.98);
                        _c = chai_1.expect;
                        return [4 /*yield*/, Bridge_BSC.swaps(message)];
                    case 4: return [4 /*yield*/, (_d.sent()).state];
                    case 5:
                        _c.apply(void 0, [_d.sent()]).to.equal(2); // 0 - empty, 1 active, 2 - redeemed
                        return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 12: Should revert if swap is already redeemed", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, message, signature, _a, v, r, s, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 100000000;
                        chainTo = 2;
                        recipient = user3.address;
                        message = hardhat_1.ethers.utils.arrayify(hardhat_1.ethers.utils.solidityKeccak256([
                            "string",
                            "uint256",
                            "address",
                            "address",
                            "address",
                            "uint256"
                        ], [
                            transaction_number,
                            amount,
                            USDT_ETH.address,
                            USDT_BSC.address,
                            recipient,
                            chainTo
                        ]));
                        return [4 /*yield*/, validator.signMessage(message)];
                    case 1:
                        signature = _b.sent();
                        _a = hardhat_1.ethers.utils.splitSignature(signature), v = _a.v, r = _a.r, s = _a.s;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Bridge_BSC.connect(user3).redeem(user3.address, user2.address, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, chainTo, v, r, s)];
                    case 3:
                        _b.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 5];
                    case 4:
                        error_6 = _b.sent();
                        chai_1.expect(error_6.message).to.include("Bridge: swap is not empty state or duplicate secret");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 13: Should revert if the provided message was not signed by the validator", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, message, signature, _a, v, r, s, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 200000000;
                        chainTo = 2;
                        recipient = user3.address;
                        message = hardhat_1.ethers.utils.arrayify(hardhat_1.ethers.utils.solidityKeccak256([
                            "string",
                            "uint256",
                            "address",
                            "address",
                            "address",
                            "uint256"
                        ], [
                            transaction_number,
                            amount,
                            USDT_ETH.address,
                            USDT_BSC.address,
                            recipient,
                            chainTo
                        ]));
                        return [4 /*yield*/, user2.signMessage(message)];
                    case 1:
                        signature = _b.sent();
                        _a = hardhat_1.ethers.utils.splitSignature(signature), v = _a.v, r = _a.r, s = _a.s;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Bridge_BSC.connect(user3).redeem(user3.address, user2.address, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, chainTo, v, r, s)];
                    case 3:
                        _b.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 5];
                    case 4:
                        error_7 = _b.sent();
                        chai_1.expect(error_7.message).to.include("Bridge: validator address is invalid");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 14: Should revert if there is no liquidity pool for the given destination tokens", function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction_number, amount, chainTo, recipient, message, signature, _a, v, r, s, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        transaction_number = "27d19c94-553c-4986-a9d3-0250d398584e";
                        amount = 20000000000;
                        chainTo = 2;
                        recipient = user3.address;
                        message = hardhat_1.ethers.utils.arrayify(hardhat_1.ethers.utils.solidityKeccak256([
                            "string",
                            "uint256",
                            "address",
                            "address",
                            "address",
                            "uint256"
                        ], [
                            transaction_number,
                            amount,
                            USDT_ETH.address,
                            USDT_BSC.address,
                            recipient,
                            chainTo
                        ]));
                        return [4 /*yield*/, validator.signMessage(message)];
                    case 1:
                        signature = _b.sent();
                        _a = hardhat_1.ethers.utils.splitSignature(signature), v = _a.v, r = _a.r, s = _a.s;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, Bridge_BSC.connect(user3).redeem(user3.address, user2.address, transaction_number, amount, USDT_ETH.address, USDT_BSC.address, chainTo, v, r, s)];
                    case 3:
                        _b.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 5];
                    case 4:
                        error_8 = _b.sent();
                        chai_1.expect(error_8.message).to.include("Bridge: not enough balance in pool");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 15: Check removeLiquidity requires", function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_9, error_10, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, USDT_ETH_Pool.connect(user3).removeLiquidity(1000)];
                    case 1:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        chai_1.expect(error_9.message).to.include("Pool: sender is not a liquidity provider");
                        return [3 /*break*/, 3];
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, USDT_ETH_Pool.connect(user1).removeLiquidity(1000)];
                    case 4:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 6];
                    case 5:
                        error_10 = _a.sent();
                        chai_1.expect(error_10.message).to.include("Pool: Tokens are not yet available for withdrawal");
                        return [3 /*break*/, 6];
                    case 6:
                        hardhat_1.ethers.provider.send("evm_increaseTime", [100]);
                        hardhat_1.ethers.provider.send("evm_mine", []);
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, USDT_ETH_Pool.connect(user1).removeLiquidity(5000000000)];
                    case 8:
                        _a.sent();
                        console.log("Should not pass!!!!");
                        return [3 /*break*/, 10];
                    case 9:
                        error_11 = _a.sent();
                        chai_1.expect(error_11.message).to.include("Pool: not enough token to remove");
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    });
    it("STEP 16: Should remove given amount of tokens plus accrued fees", function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, USDT_ETH_Pool.connect(user1).removeLiquidity(50000000)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
