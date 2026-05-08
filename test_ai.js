const { infer } = require('./backend/openclaw_helper');

async function testAI() {
    console.log('--- TESTING OPENCLAW INTEGRATION ---');
    console.log('Sending prompt to AI...');
    try {
        const result = await infer('Say hello as Meridian and give a 1-sentence productivity tip.');
        console.log('\nSUCCESS! AI Response:');
        console.log(result);
    } catch (error) {
        console.error('\nFAILED! Error:', error.message);
    }
    console.log('------------------------------------');
}

testAI();
