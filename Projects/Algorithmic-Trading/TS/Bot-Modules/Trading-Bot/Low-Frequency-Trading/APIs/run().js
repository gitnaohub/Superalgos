run()

function run() {
    let firstRun = tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0].value === 0
    if (firstRun) {tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0] = []}
    let nextRun = tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[2].value

    let minuteInterval = 1
    let logToConsole = true
    let debug = true

    let intervalInMs = minuteInterval * 60000
    let checkBalances = Date.now() > nextRun

    if (checkBalances || debug) {
        let balances
        tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[2].value = Date.now() + intervalInMs

        balances = waitForBalances()

        if (balances !== undefined && balances !== false) {
            let dateTime = getCurrentDateTime()
            let portfolioEquity = balances.info.result.list[0].totalEquity;
            let portfolioMarginBalance = balances.info.result.list[0].totalMarginBalance;
            let portfolioAvailableBalance = balances.info.result.list[0].totalAvailableBalance;
            let portfolio = { dateTime: dateTime, portfolioEquity: portfolioEquity, portfolioMarginBalance: portfolioMarginBalance, portfolioAvailableBalance: portfolioAvailableBalance }
            if (tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0].length !== 3) {
                tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][0] = portfolio
                tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][1] = portfolio
                tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][2] = { dateTime: dateTime, portfolioEquity: 'patience', portfolioMarginBalance: 'my', portfolioAvailableBalance: 'friend' }
            }
            else {
                let initial = tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][0]
                tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][1] = portfolio
                let progressResult = {
                    dateTime: dateTime,
                    portfolioEquity: ((portfolio.portfolioEquity / initial.portfolioEquity)-1)*100 + '%',
                    portfolioMarginBalance: ((portfolio.portfolioMarginBalance / initial.portfolioMarginBalance)-1)*100 + '%',
                    portfolioAvailableBalance: ((portfolio.portfolioAvailableBalance / initial.portfolioAvailableBalance)-1)*100 + '%'
                }
                tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0][2] = progressResult
            }

            let assets = [];
            let coinsLength = balances.info.result.list[0].coin.length
            for (let i = 0; i < coinsLength; i++) {
                let coin = balances.info.result.list[0].coin[i].coin;
                let walletBalance = balances.info.result.list[0].coin[i].walletBalance;
                let usdValue = balances.info.result.list[0].coin[i].usdValue;
                let percentOfPortfolio = Math.round((usdValue / portfolioEquity) * 10000) / 100;

                assets.push({ coin: coin, walletBalance: walletBalance, usdValue: usdValue, percentOfPortfolio: percentOfPortfolio });
            }
            assets.sort((a, b) => b.percentOfPortfolio - a.percentOfPortfolio);

            tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[1] = assets

            if (logToConsole) {
                let p = tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[0]
                let a = tradingEngine.tradingCurrent.tradingEpisode.userDefinedVariables.userDefinedVariable[1]
                console.log(`
->      PORTFOLIO STATISTICS`)
                console.table(p)
                console.log(`
->      CURRENT HOLDINGS`)
                console.table(a)
                console.log()
            }
        }
        return debug ? false : true
    }

    function getCurrentDateTime() {
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');

        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    async function waitForBalances() {
        let exchangeAPIModuleObject = TS.projects.algorithmicTrading.botModules.exchangeAPI.newAlgorithmicTradingBotModulesExchangeAPI(processIndex)
        exchangeAPIModuleObject.initialize()
        try {
            const response = await exchangeAPIModuleObject.fetchAllBalances()
            return response
            }
        catch (error) {
            console.log('Error: ',error)
        }
    }
}