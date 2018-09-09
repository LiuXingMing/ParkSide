var ticker = 5;                              //D!
var enableOrders = false;                       //D!
runBot("BTC","USDT","MACD",ticker,"poloniex");  //D!
function runBot( baseCurrency, quoteCurrency, strategy, ticker, exchangeName){  //baseCurrency, quoteCurrecy, strategy
        //init setup fake attributes later to come from GUI

    //var symbol = "BTC/USDT";        // "BTC/ETH", "ETH/USDT", ...
    var symbol = mergeSymbol( baseCurrency, quoteCurrency);
    var strategy; // = "smaX";          //"emaX", "MMDiff", "upDown", "smaX", "macD"
    var bougthPrice = 0;    //default:0 low starting price,reset bot with 0 will couse to sellASAP and then buyASAP 
    var portion = 0.51;        //!!! 0.51 || 0.99 !       part of balance to trade 
    var stopLossP = 30;      //sell at loss 1,5,10% from bougthprice, 0% for disable, 100% never sell
    var minProfitP = 0.2;        //holding addition
    var timeTicker = minToMs(ticker); //!!! 4,8 || 1 !       minutes to milliseconds default: 1 *60000ms = 1min
    var timeStart = msToMin(26 * timeTicker);    // default:10080min = 7d, 1440min = 1d
    var msg;
    var exchangeName;// = "poloniex";      
    var x = 0; //counter for starting mail

    var TI = require("technicalindicators");
    //ccxt API
    var keys = require("./keys.json");  //keys file location
    let ccxt = require ('ccxt');
    var exchange;
    switch(exchangeName){
      case "poloniex":
      exchange = new ccxt.poloniex ({
        apiKey: keys.poloniex.apiKey,
        secret: keys.poloniex.secret,
      });
      break;
      case "bittrex":
      exchange = new ccxt.bittrex ({
        apiKey: keys.bittrex.apiKey,
        secret: keys.bittrex.secret,
      });
      break;case "bitfinex":
      exchange = new ccxt.bitfinex ({
        apiKey: keys.bitfinex.apiKey,
        secret: keys.bitfinex.secret,
      });
      break;
    }
    var tradingFeeP = 0.01;
    tradingFeeP = exchange.fees.trading.taker*100;

    //functions CLI
    var a = 0;
    function count(){       //defines next time delay
            var delay = 2000 //miliseconds
            a++;
            return a*delay;}

    function getTime() {
            var timestamp = Date.now();     // Get current time in UNIX EPOC format
            var d = new Date(timestamp),	// Convert the passed timestamp to milliseconds
                        yyyy = d.getFullYear(),
                        mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
                        dd = ('0' + d.getDate()).slice(-2),			// Add leading 0.
                        hh = d.getHours(),
                        h = hh,
                        min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
                        ampm = 'AM',
                        time;  
                /*if (hh > 12) {
                        h = hh - 12;
                        ampm = 'PM';
                } else if (hh === 12) {
                        h = 12;
                        ampm = 'PM';
                } else if (hh == 0) {
                        h = 12;
                }*/
                // ie: 2013-02-18, 8:35 AM	
                //time = yyyy h + ':' + min + ampm + '-' + mm + '-' + dd + '. ' +  ' ' +;
                time = h+ ':' +min+ ' ' +dd+ '.' +mm+ '.' +yyyy;
            return time;
            }

    function sendMail(subject, message, to){
            // email account data
            var nodemailer = require('nodemailer');
            var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                    user: 'mrbitja@gmail.com',
                    pass: 'mrbitne7777777'
            }});

            // mail body
            var subject;
            var message;
            to;     
            var mailOptions = {
                    from: 'bb@gmail.com',   //NOT WORK
                    to: 'markosmid333@gmail.com',//to, 
                    subject: subject, //'You have got mail',
                    text: message
            };

            // response
            transporter.sendMail(mailOptions, function(error, info){
            if (error) {
            console.log(error);
            } else {
            //console.log('Email sent: ' + info.response);
            console.log("Email sent at: "+getTime()+" to: "+mailOptions.to);
            }});}

    function minToMs(timeInMinutes){
        var r = timeInMinutes * 60000;
        return r;}

    function hToMs(timeInHours){
        var r = timeInHours * 3600000;
        return r;}

    function msToMin(timeInMiliseconds){
            var r = ( timeInMiliseconds / 1000 ) / 60;
            return r;}
    function whole(part,percent){//whole is part divided by percentage
        return part / (percent / 100);}
    function percent(part,whole){//percent is part divided by whole
        return ( part / whole ) * 100;}
    function part (percent,whole){//part is percent multiplied by whole
        return (percent/100) * whole;}
            
    function mergeSymbol(baseCurrency,quoteCurrency){
        return symbol = baseCurrency+"/"+quoteCurrency;}
    function splitSymbol( symbol, selectReturn ){   // BTC/USDT   ,   first | second        base | quote
            var char = symbol.search("/");
            base = symbol.slice( 0, char);
            quote = symbol.slice( char+1, symbol.length);
            switch(selectReturn){
                    case "base":
                            return base;
                    break;
                    case "quote":
                            return quote;
                    break;
            }}

    var sale = false;
    var purchase = false;
    function selectCurrency(){        // check currency from pair that has more funds
            var baseBalanceInQuote = baseToQuote(baseBalance);      //convert to base
            if (baseBalanceInQuote >= quoteBalance){
                    sale = true;   
                    purchase = false;
                    return baseCurrency+" base of pair";
            }else{
                    purchase = true;
                    sale = false; 
                    return quoteCurrency+" quote of pair";
            }}

    function profitP(){
            profitAbs = sellPrice - bougthPrice;
            profitP = procent(profitAbs,bougthPrice);
            return ;
    }

    //functions API
    function fetchTicker() {        //loads ticker of a symbol a currency pair
            exchange.fetchTicker(symbol).then((results) => { 
                    var r = results;    //market simbols BTC/USDT
                    var r1 = JSON.stringify(r);
                    change = r.change;
                    console.log("Ticker:"+r1);
                    //console.log("24h change: "+(change*100).toFixed(2)+" %");
                return r;
            }).catch((error) => {
                    console.error(error);
            })
    }
    var change;
    var baseVolume;
    var quoteVolume;
    var ticker = fetchTicker(symbol);

    function fetchCurrencies() {        //loads all available symbols of currency pairs/markets
        exchange.loadMarkets().then((results) => { 
                var r = exchange.currencies;    //market simbols BTC/USDT
                var r1 = JSON.stringify(r);
                //console.log(r1);
                var currencies = Object.keys(r);
                //console.log(JSON.stringify(currencies));
        return r;
        }).catch((error) => {
                console.error(error);
        })}
        var curencies;  //all currencies array 
        //fetchCurrencies();

    function loadMarkets() {        //loads all available symbols of currency pairs/markets
            exchange.loadMarkets().then((results) => { 
                    var r = exchange.symbols;    //market simbols BTC/USDT
                    var r1 = JSON.stringify(r);
                    console.log(r1);
            return r;
            }).catch((error) => {
                    console.error(error);
            })}

    

    function fetchBalances() {    //fetches balance of a currency
            exchange.fetchBalance().then((results) => {
                var r = results;
                baseBalance = r[baseCurrency].total;     //options: free used total
                quoteBalance = r[quoteCurrency].total;     //options: free used total
                return r;
            }).catch((error) => {
                    console.error(error);
            })}
    var quoteBalance = 0;
    var baseBalance = 0;
    fetchBalances();

    var bid;
    var ask;
    var bid2;
    var ask2;          
    function fetchAsksBids(symbol) {        //fetch ticker second order
        exchange.fetchOrderBook(symbol).then((results) => {
                    bid = results.bids[0][0];            //options: bids asks
                    ask = results.asks[0][0];
                    bid2 = results.bids[1][0];            //options: bids asks
                    ask2 = results.asks[1][0];
        }).catch((error) => {
            console.error(error);
            })} 

    var orderId;
    function createLimitSellOrder (symbol, amount, price){        // symbol, amount, ask 
            exchange.createLimitSellOrder ( symbol, amount, price ).then((results) => {     
                    var r = results;                
                    orderId = r.id;
                    orderStatus = r.status;
                    console.log(orderId);
                    console.log("Order: "+JSON.stringify(r));                
                    sendMail("Sold",msg+"\n"+JSON.stringify(r));
                    orderType = "sold";
                    //sellPrice = r.price;
                    setTimeout(function(){cancelOrder(orderId)}, timeTicker*0.9); 
                    return r;
            }).catch((error) => {
                    console.error(error);
            })}
    function createLimitBuyOrder (symbol, amount, price){        // symbol, amount, bid 
            exchange.createLimitBuyOrder ( symbol, amount, price ).then((results) => { 
                    var r = results;                
                    orderId = r.id;
                    orderStatus = r.status;
                    console.log(orderId);
                    console.log("Order: "+JSON.stringify(r));      
                    sendMail("Bougth",msg+"\n"+JSON.stringify(r));
                    orderType = "bougth";
                    bougthPrice = r.price;            //safety
                    setTimeout(function(){bougthPrice = r.price}, timeTicker*0.85); 
                    setTimeout(function(){cancelOrder(orderId)}, timeTicker*0.9);      
                    return r;
            }).catch((error) => {
                    console.error(error);
            })}

    function cancelOrder(id){
            exchange.cancelOrder(id).then((results) => { 
                    var r = results;
                    console.log("CANCELED ORDER: "+id+" "+r);
                    return JSON.stringify(r);
            }).catch((error) => {
                console.error(JSON.stringify(error));
            })}

    //logic funk and math junk
    //var history = new Array();
    function logHistory(value,size){        //log FILO
            var counter;        
            while ( history.length >= size ){
                    history.pop();
            }
            history.unshift(value);
            counter++;
            console.log(history);
    }
    function boolToInitial(bool){	//returns 
            var bool;
            var a = bool.toString();
            var b = a.charAt(0);
            return b;}

    function quoteToBase(amountQuote){
            var amountQuote;
            var amountBase = amountQuote / bid ;
            return amountBase;}

    function baseToQuote(amountBase){
            var amountBase;
            var amountQuote = amountBase * bid ;
            return amountQuote;}
    function getMinOfArray(numArray){		//in: numericArray out: minValue
            return Math.min.apply(null, numArray);}
    function getMaxOfArray(numArray){		//in: numericArray out: maxValue
            return Math.max.apply(null, numArray);}    
    function getAvgOfArray(numArray){		//in: numericArray out: maxValue
            var numArray;
            var n = numArray.length;
            var sum = 0;
            var avg;
            for( i = 0; i < n; i++){
                    sum += numArray[i];
                    avg = sum / n;
            }
            return avg;}

    function getAvgOfArrayJump(numArray,jump){     //in: numericArray out: maxValueOfPart
            var numArray;
            var jump;
            var n = numArray.length/jump;
            var sum = 0;
            var avg;
            for( i = 0; i < numArray.length; i+=jump){
                    sum += numArray[i];
                    avg = sum / n;
            }
            return avg;
        }

    function runStrategy(strategy){
        switch(strategy){
            case "smaX":
            smaX()
            break;
            case "emaX":
            emaX()
            break;          
            case "MACD":    
            MACD();
            break;
            case "MMDiff":      //not used anymore
            MMDiff();
            break;
            case "upDown":
            upDown()
            break;
            }}


    function order(orderType,symbol,amount,price){
        var orderId;
        function cancelOrder(id){
                exchange.cancelOrder(id).then((results) => { 
                        var r = results;
                        console.log("CANCELED ORDER: "+JSON.stringify(r));
                        return JSON.stringify(r);
                }).catch((error) => {
                        if( id == undefined ){
                                console.log("NO ORDERS YET!!!")
                        }else{
                                console.error(JSON.stringify(error));   
                        }
                })}
        function createLimitSellOrder (symbol, amount, price){        // symbol, amount, ask 
                exchange.createLimitSellOrder ( symbol, amount, price ).then((results) => {     
                        var r = results;                
                        orderId = r.id;
                        orderStatus = r.status;
                        console.log(orderId);
                        console.log("Order: "+JSON.stringify(r));                
                        sendMail("Sold",msg+"\n"+JSON.stringify(r));
                        orderType = "sold";
                        //sellPrice = r.price;
                        //sellPrice = price;
                        setTimeout(function(){cancelOrder(orderId)}, timeTicker*0.9); 
                        return r;
                }).catch((error) => {
                        console.error(error);
                })}
        function createLimitBuyOrder (symbol, amount, price){        // symbol, amount, bid 
                exchange.createLimitBuyOrder ( symbol, amount, price ).then((results) => { 
                        var r = results;                
                        orderId = r.id;
                        orderStatus = r.status;
                        console.log(orderId);
                        console.log("Order: "+JSON.stringify(r));      
                        sendMail("Bougth",msg+"\n"+JSON.stringify(r));
                        orderType = "bougth";
                        //bougthPrice = r.price;            //safety
                        bougthPrice = price;
                        //setTimeout(function(){bougthPrice = r.price}, timeTicker*0.85); 
                        setTimeout(function(){cancelOrder(orderId)}, timeTicker*0.9);      
                        return r;
                }).catch((error) => {
                        console.error(error);
                })}
        switch(orderType ){
                case "buy":
                        createLimitBuyOrder(symbol, amount, price);
                        console.log("boughted");
                break;
                case "sell":
                        createLimitSellOrder(symbol, amount, price);
                        console.log("solded");
                break;
                default:
                        console.log("Invalid order type!!!");
                break;
                }
        }

    var logMACD = new Array();      //must be global!
    var logRSI = new Array();      //must be global!
    var price;
    var stor = new Array();     //storage for direction
    function MACD(){
        price = bid2;

        //price loging
        function loger(value,length,array){        //log FILO to array
          var counter;        
          while ( array.length >= length ){  
            array.pop();
          }
          array.unshift(value);
          counter++;
	  return array;}
	loger(price,34,logMACD);
	loger(price,250,logRSI);

        function safetySale(tradingFeeP, bougthPrice){  //no sale with loss
                var tradingFeeAbs;
                tradingFeeP = tradingFeeP * 2;
                tradingFeeAbs = part( tradingFeeP, bougthPrice );  
                minProfitAbs = part( minProfitP, bougthPrice );
                //console.log("Fee: "+tradingFeeP+"% "+tradingFeeAbs+" $");
                sellPrice = bougthPrice + tradingFeeAbs + minProfitAbs;         //minProfit
                //return hold = false;     //uncoment to disable
                if ( sellPrice > price ){      //if bougthPrice is not high enough
                        return hold = true;    	//dont allow sell force holding
                }else{                                                 
                        return hold = false;           //allow sale of holding to parked
                }}       
        var sellPrice;
        var hold = safetySale(tradingFeeP, bougthPrice);        //returns boolean

        function safetyStopLoss(price,stopLossP,sellPrice){      //force sale  price, bougthPrice, lossP
                absStopLoss = part(stopLossP, sellPrice);
                loss = sellPrice - price;     //default: loss = sellPrice - price;
                //return stopLoss = false;        //uncoment to disable
                if( loss > absStopLoss){
                        return stopLoss = true;         //sell ASAP!!!
                }else{
                        return stopLoss = false;
                }}       
        var stopLoss = safetyStopLoss(price,stopLossP,sellPrice);       //returns boolean

        function TI_RSI( values ){
                var RSI = TI.RSI;
                var inputRSI = {
                  values : values,
                  period : 14
                };
                var r = RSI.calculate(inputRSI);
                var n = r.length-1;
                var lastRSI = r[n]; //last JSON
                //console.log("RSI:"+lastRSI);
                if (lastRSI > 70){
                        trendRSI = 1;   //buy coz rising
                }else if(lastRSI < 30){
                        trendRSI = -1;  //sell coz falling
                }else{
                        trendRSI = 0;   //hold or park coz stationary
                };
                //console.log("trend:"+trendRSI+" RSI:"+lastRSI);
                return trendRSI;}
        var trendRSI;
        //TI_RSI(logRSI);

        function TI_MACD( values ){     //should be bigger the better starts working when value = slowPeriod + signalPeriod
                var MACD = TI.MACD;
                var macdInput = {
                  values            : values,   //34,70,140n of inputs - slowPeriod = n of outputs 
                  fastPeriod        : 12,       //12,24,48
                  slowPeriod        : 26,       //26,52,104      when this is full it putout
                  signalPeriod      : 9,        //9,18,36
                  SimpleMAOscillator: false,
                  SimpleMASignal    : false
                };
                var r = MACD.calculate(macdInput);      //array with JSONs
                //console.log("data length: "+values.length);
                var lastMACD = r[r.length-1]; //last JSON
                //console.log("Last: "+JSON.stringify(lastMACD));
                if (lastMACD){
                        macdLine = lastMACD.MACD;
                        signalLine = lastMACD.signal;
                        macdHistogram = lastMACD.histogram; 
                        //console.log("MLine: "+macdLine);
                        //console.log("SLine: "+signalLine);
                        //console.log("MHist: "+macdHistogram);    
                        if(macdHistogram == (undefined || "")){
                                macdHistogram = "loading...";
                        }
                        else if ( !isNaN(macdHistogram) && x == 0){     //isNumber
                                sendMail( "Started", msg );
                                x++;
                        };
                        if (macdHistogram > 1){
                                trendMACD = 1;   //buy coz rising
                        }else if(macdHistogram < -1){
                                trendMACD = -1;  //sell coz falling
                        }else{
                                trendMACD = 0;   //hold or park coz stationary
                        };
                }
                //console.log(r);
        }
        var macdLine;
        var signalLine;
        var macdHistogram;      //>1,<1
        var trendMACD;  //-1,0,1
        TI_MACD(logMACD);
        
        function makeAsk(ask,ask2){     //makerify prices for orders
                var shiftP = 50;       //percentage of makerPrice shift
                var askSubSpread = ask2-ask;    //spread between first and second order of asks
                return buyPrice = ask+part(shiftP,askSubSpread);}
        var buyPrice = makeAsk(ask,ask2);

        function makeBid(bid,bid2){     //makerify prices for orders
                var shiftP = 50;       //percentage of makerPrice shift
                var bidSubSpread = bid-bid2;    //spread between first and second order of bids
                return salePrice = bid-part(shiftP,bidSubSpread);}
        var salePrice = makeBid(bid,bid2);

        function direction (value){     //diference between curent and last value
                if ( stor[1] == undefined ){
                        stor[1] = value;
                        stor[0] = value;
                };
                stor[1] = stor[0];
                stor[0] = value;
                var direction = stor[0] - stor[1];
                return direction;}
        var diference = direction(price);

        var buyAmount = quoteToBase(quoteBalance) * portion;
        var sellAmount = baseBalance; // * portion;
        var trend; //trend of bids
        var trend2; //trend of asks
        makeOrder();
        var orderType;
        function makeOrder(){ //purchase,sale,hold,stopLoss,price,symbol,baseBalance,quoteBalance
                trend = macdHistogram;
                orderType = "none";
                if( purchase && ( trend > 0 )){        
                        enableOrders ? order( "buy", symbol, buyAmount, buyPrice) : console.log('orders disabled');
                        orderType = "bougth";
                        bougthPrice = buyPrice;               //sim
                        enableOrders?"":console.log("boughted");          //sim
                }else if( sale && !hold && !stopLoss && ( trend < 0 )){       
                        enableOrders ? order( "sell", symbol, sellAmount, salePrice) : console.log('orders disabled');
                        orderType = "sold";
                        enableOrders?"":console.log("solded");          //sim
                }else if( sale && hold && stopLoss ){   //stopLoss sell
                        enableOrders ? order( "sell", symbol, sellAmount, salePrice) : console.log('orders disabled');
                        orderType = "lossed";
                        enableOrders?"":console.log("lossed");          //sim
                }else if( sale && hold && !stopLoss ){
                        orderType = "holding";
                }else if( sale && !hold && !stopLoss ){
                        orderType = "holding good";
                }else if( purchase ){           // && noBuy
                        orderType = "parked"; 
                }
                return print();}
        function print(){
                var absProfit = price - sellPrice;
                var relProfit = percent(absProfit, sellPrice);
                var baseBalanceInQuote = baseToQuote(baseBalance);
                var quoteBalanceInBase = quoteToBase(quoteBalance);
                var balance = baseBalanceInQuote+quoteBalance;
                var balanceB = quoteBalanceInBase+baseBalance;
                msg =   //info msg on ticker time
                getTime()+"|"+
                exchangeName+"|"+
                "B2:"+bid2+" "+symbol+"|"+
                "aDiff:"+diference.toFixed(8)+"|"+
                "BP:"+bougthPrice.toFixed(8)+"|"+
                "SP:"+sellPrice.toFixed(8)+"|"+
                "aP:"+absProfit.toFixed(8)+"|"+
                "rP:"+relProfit.toFixed(2)+" %"+"|"+
                boolToInitial(baseCurrency)+"in"+boolToInitial(quoteCurrency)+":"+baseBalanceInQuote.toFixed(8)+"|"+
                quoteCurrency+":"+quoteBalance.toFixed(8)+"|"+
                "T:"+balance.toFixed(8)+"|"+
                //"TB:"+balanceB.toFixed(8)+"|"+
                "O:"+orderType+"|"+
                "P:"+boolToInitial(purchase)+"|"+
                "S:"+boolToInitial(sale)+"|"+
                "H:"+boolToInitial(hold)+"|"+
                "SL:"+boolToInitial(stopLoss)+"|"+
                "MAC"+logMACD.length+":"+trend;
        
                //logToLog(msg);        // store to log
                console.log(msg);}
    }

    var log ="LOG: ";       //prefix
    function logToLog(input){  
            log += input;
            log += "\n";    //new line
            //console.log(log);
    }

    //setup main
    set();
    function set(){
            console.log("Selected exchange: "+exchange.name+" ("+exchange.countries+")");
            console.log("Maker fee: "+exchange.fees.trading.maker*100+" %");
            console.log("Taker fee: "+exchange.fees.trading.taker*100+" %");
        }

    //setup main cascade
    setTimeout(function(){setup()                                          }, count());
    function setup(){
        //setTimeout(function(){fetchCurrencies() },count());
        setTimeout(function(){loadMarkets()     },count());
        setTimeout(function(){fetchAsksBids(symbol)     },count());
        setTimeout(function(){fetchBalances()   },count());
            
            setTimeout(function(){console.log("Wallet:"+"\n"+
            baseBalance+" "+baseCurrency+"\n"+
            quoteBalance+" "+quoteCurrency)           },count());
            setTimeout(function(){console.log("Selected market: "+baseCurrency+" | "+quoteCurrency)},count());
            setTimeout(function(){console.log("24h change: "+(change*100).toFixed(2)+" %")},count());
            setTimeout(function(){console.log("Currency to sell: "+selectCurrency())},count());
            
            //loop fetches
            setTimeout(function(){setInterval(function(){loopFetches()      },timeTicker)},count());
            function loopFetches(){
                    setTimeout(function(){fetchBalances()           },count());
                    setTimeout(function(){fetchAsksBids(symbol)     },count());
                    //loop logic 
                    setTimeout(function(){loopLogic()        },count());
                    function loopLogic(){
                            selectCurrency();
                            runStrategy(strategy);
                        }
                }
        }
}