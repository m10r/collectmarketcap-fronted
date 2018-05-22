
let rp = require('request-promise')


const moment = require('moment');
import IdexTrade from '../db/models/idex_trade';
import BittrexTrade from '../db/models/bittrex_trade';
import IdexOrder from '../db/models/idex_orders';


async function runTradeCronForIdex (){
  while (1) {
    
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    if(global.tradeCron){
      try{
         
        let maxTimestamp = await IdexTrade.query(function(qb) {
          qb.max('timestamp as timestamp');
        }).fetch();

        var options = {
          method: 'POST',
          uri: 'https://api.idex.market/returnTradeHistory ',
          body: {
          },
          json: true // Automatically stringifies the body to JSON
        };

        if(maxTimestamp.get('timestamp')) 
          options.body["start"] = parseInt(maxTimestamp.get('timestamp')) + 1;
        

        let response = await rp(options);
        var promises = [];
        for(let market in response)
          response[market].map(res=>{
            promises.push(new IdexTrade(Object.assign(res, {market: market})).save() );
          })
        await Promise.all(promises);
        console.log('Got IdexTrade Data from ' + parseInt(maxTimestamp.get('timestamp')) + 1);
        
      } catch (err) {
        console.log(err, 'From Get IdexTrade Data');
      }
    } else {
      console.log('Cancelled IdexTrade');
    } 
    await wait(1000 * 60 * 5)
  }
}


async function runTradeCronForIdexOrders (){
  while (1) {
    
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    if(global.tradeCron){
      try{
        let markets = ['ETH_MAN', 'ETH_HOT', 'ETH_EOSDAC', 'ETH_BAX', 'ETH_NPXS']
        let maxTimestamp = await IdexOrder.query(function(qb) {
          qb.max('timestamp as timestamp');
        }).fetch();

        let promises = markets.map(market=>{
          return rp({
            method: 'GET',
            uri: 'https://api-regional.idex.market/returnOpenOrders?market=' + market,
            json: true // Automatically stringifies the body to JSON
          })
        })

        let response = await Promise.all(promises);
        response.map((res)=>{

          // let data = res.filter(item=>item.timestamp > moment().unix())
          let data = res
          let highest_buys = data.filter((item)=>item.type=='buy')
          let highest_buy:any = 0
          if (highest_buys.length > 0)
            highest_buy = highest_buys.reduce((i1,i2)=>i1.price<i2.price?i1:i2).price

          let lowest_sells = data.filter((item)=>item.type=='sell')
          let lowest_sell:any = 0
          if (lowest_sells.length > 0)
            lowest_sell = lowest_sells.reduce((i1,i2)=>i1.price>i2.price?i1:i2).price
          let mid_price:any = 0
          
          if(lowest_sell && highest_buy)
            mid_price = (lowest_sell - highest_buy)/2


          data.filter(item=>{
            if ((item.price > mid_price * 0.7) && (item.price < mid_price * 1.3))
              return true
            else return false
          }).map(item=>{

            IdexOrder.where({orderHash: item.orderHash}).fetch()
            .then(val=>{
              if(!val) {
                new IdexOrder({
                  amount: item.type == 'buy' ? item.params.amountBuy : item.params.amountSell,
                  price: item.price,
                  user: item.params.user,
                  type: item.type,
                  market: item.market,
                  orderHash: item.orderHash,
                  timestamp: item.timestamp,
                  dbtimestamp: moment().unix(),
                }).save()
              }
            })
          })
        })
        
        console.log('Got IdexOrder Data');  
      } catch (err) {
        console.log(err, 'From Get IdexOrder Data');
      }
    } else {
      console.log('Cancelled IdexOrder');
    } 
    await wait(1000 * 60)
  }
}



async function runTradeCronForBittrex (){
  let markets = await rp({
    method: 'GET',
    uri: 'https://bittrex.com/api/v1.1/public/getmarkets',
    json: true // Automatically stringifies the body to JSON
  })
  while (1) {
    
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    if(global.tradeCron){
      try{
        
        let promises = [];
        markets.result.map(market=>{
          promises.push(rp({
            method: 'POST',
            uri: 'https://bittrex.com/api/v1.1/public/getmarkethistory?market='+market.MarketName,
            body: {
            },
            json: true // Automatically stringifies the body to JSON
          }));  
        })
        

        let currentTrades = await BittrexTrade.where({}).fetchAll();
        currentTrades = currentTrades.toJSON().map(trade=>trade['Quantity'])
        
        let responses = await Promise.all(promises);

        let tradesToAdd = [];
        for (var j = 0; j < markets.result.length; j += 10) {
          tradesToAdd = [];
          responses.slice(j, j+10).map((item, index)=>{
            
            if(item.result)
              item.result.map(item=>{
                
                if(currentTrades.indexOf(item['Quantity']) == -1)
                  tradesToAdd.push(new BittrexTrade(Object.assign(item, {market: markets.result[j+index].MarketName})).save() );
              })
          })
          await Promise.all(tradesToAdd);
          console.log('Got Bittrex ' + tradesToAdd.length);
        }
          
        
      } catch (err) {
        console.log(err, 'From Get Trade Data');
      }
    } else {
      console.log('Cancelled');
    } 
    await wait(1000 * 60 * 5)
  }
}

runTradeCronForIdex();
runTradeCronForBittrex();
runTradeCronForIdexOrders();