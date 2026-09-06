// Serial execution plus the DB row lock prevents overlapping ticks across processes.
module.exports = function startPriceManager(market) {
    let stopped=false,timer;
    async function run() {
        try {await market.tick();} catch(error) {console.error('Market update failed:',error.code||error.name);}
        if(!stopped)timer=setTimeout(run,1000);
    }
    run();
    return ()=>{stopped=true;clearTimeout(timer);};
};
